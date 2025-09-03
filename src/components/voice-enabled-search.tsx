"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Mic, MicOff, X, Loader2, Bot } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { storage, type Loan } from "@/lib/storage"
import { VoiceManager, voiceUtils, type VoiceRecognitionResult } from "@/lib/voice"
import { GeminiAI, type GeminiRequest } from "@/lib/gemini"
import { useLanguage } from "@/components/language-provider"

interface SearchResult extends Loan {
  searchScore: number
  matchedFields: string[]
}

interface VoiceEnabledSearchProps {
  className?: string
}

export function VoiceEnabledSearch({ className }: VoiceEnabledSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [isGeminiAvailable, setIsGeminiAvailable] = useState(false)
  const [aiSearchResults, setAiSearchResults] = useState<{ query: string, results: SearchResult[] } | null>(null)
  
  const router = useRouter()
  const { language, t } = useLanguage()
  const voiceManagerRef = useRef<VoiceManager | null>(null)
  const voicePrompts = voiceUtils.getVoicePrompts(language)

  useEffect(() => {
    // Initialize voice support check
    const support = voiceUtils.checkSupport()
    setVoiceSupport(support)
    
    if (support.recognition || support.synthesis) {
      voiceManagerRef.current = new VoiceManager(language)
    }

    // Check Gemini availability
    setIsGeminiAvailable(GeminiAI.isAvailable()) // Now always true with offline mode
  }, [language])

  useEffect(() => {
    // Update voice manager language when language changes
    if (voiceManagerRef.current) {
      voiceManagerRef.current.updateLanguage(language)
    }
  }, [language])

  // Enhanced search function with multiple criteria
  const searchLoans = (searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return []
    
    const loans = storage.getLoans()
    const searchTerm = searchQuery.toLowerCase().trim()
    
    const searchResults: SearchResult[] = []
    
    loans.forEach(loan => {
      let score = 0
      const matchedFields: string[] = []
      
      // Search by borrower name (highest priority)
      if (loan.borrowerName.toLowerCase().includes(searchTerm)) {
        score += 10
        matchedFields.push('name')
      }
      
      // Search by phone number
      if (loan.borrowerPhone && loan.borrowerPhone.includes(searchTerm)) {
        score += 8
        matchedFields.push('phone')
      }
      
      // Search by amount (exact match)
      if (loan.amount.toString().includes(searchTerm)) {
        score += 6
        matchedFields.push('amount')
      }
      
      // Search by interest rate
      if (loan.interestRate.toString().includes(searchTerm)) {
        score += 4
        matchedFields.push('interest')
      }
      
      // Search by date (month/year)
      const loanDate = new Date(loan.dateCreated)
      const dateString = loanDate.toLocaleDateString()
      const monthYear = `${loanDate.getMonth() + 1}/${loanDate.getFullYear()}`
      if (dateString.includes(searchTerm) || monthYear.includes(searchTerm)) {
        score += 5
        matchedFields.push('date')
      }
      
      // Search by status
      if ((loan.isActive && ('active'.includes(searchTerm) || 'pending'.includes(searchTerm))) ||
          (!loan.isActive && ('completed'.includes(searchTerm) || 'finished'.includes(searchTerm)))) {
        score += 3
        matchedFields.push('status')
      }
      
      // Search by notes
      if (loan.notes && loan.notes.toLowerCase().includes(searchTerm)) {
        score += 2
        matchedFields.push('notes')
      }
      
      // Fuzzy search for names (partial matches)
      if (score === 0) {
        const nameParts = loan.borrowerName.toLowerCase().split(' ')
        const searchParts = searchTerm.split(' ')
        
        for (const searchPart of searchParts) {
          for (const namePart of nameParts) {
            if (namePart.startsWith(searchPart) && searchPart.length >= 2) {
              score += 1
              matchedFields.push('name')
              break
            }
          }
        }
      }
      
      if (score > 0) {
        searchResults.push({
          ...loan,
          searchScore: score,
          matchedFields
        })
      }
    })
    
    // Sort by score (highest first)
    return searchResults.sort((a, b) => b.searchScore - a.searchScore)
  }

  // AI-powered search using Gemini (now works in offline mode too)
  const performAISearch = async (voiceQuery: string) => {
    setIsProcessingVoice(true)
    
    try {
      const loans = storage.getLoans()
      
      // Use Gemini AI (will fallback to offline mode automatically)
      const searchPrompt = `Search for loans based on this query: "${voiceQuery}". Return relevant loan information.`

      const request: GeminiRequest = {
        prompt: searchPrompt,
        language,
        context: { loans }
      }

      const response = await GeminiAI.generateResponse(request)
      
      if (response.success) {
        // Try to find loans mentioned in the response
        const mentionedLoans = loans.filter(loan => 
          response.text.toLowerCase().includes(loan.borrowerName.toLowerCase()) ||
          response.text.includes(loan.amount.toString())
        )
        
        if (mentionedLoans.length > 0) {
          return mentionedLoans.map((loan, index) => ({
            ...loan,
            searchScore: 10 - index,
            matchedFields: ['ai-match']
          }))
        }
      }
    } catch (error) {
      console.error('AI search error:', error)
    } finally {
      setIsProcessingVoice(false)
    }
    
    return null
  }

  // Auto-search as user types
  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true)
      const searchResults = searchLoans(query)
      setResults(searchResults)
      setIsSearching(false)
      
      // Clear AI results when doing manual search
      setAiSearchResults(null)
    } else {
      setResults([])
      setAiSearchResults(null)
    }
  }, [query])

  const startVoiceSearch = () => {
    if (!voiceSupport.recognition || !voiceManagerRef.current) return

    setIsListening(true)
    setQuery('')
    setResults([])
    setAiSearchResults(null)
    
    const success = voiceManagerRef.current.startListening(
      async (result: VoiceRecognitionResult) => {
        if (!result.isListening && result.transcript) {
          setIsListening(false)
          const transcript = result.transcript.trim()
          
          // Set the query for visual feedback
          setQuery(transcript)
          
          // Perform AI-powered search (works in offline mode too)
          const aiResults = await performAISearch(transcript)
          if (aiResults && aiResults.length > 0) {
            setAiSearchResults({ query: transcript, results: aiResults })
            setResults(aiResults)
          } else {
            // Fall back to regular search
            const regularResults = searchLoans(transcript)
            setResults(regularResults)
          }
        }
      },
      (error: string) => {
        setIsListening(false)
        console.error('Voice recognition error:', error)
      }
    )

    if (!success) {
      setIsListening(false)
    }
  }

  const stopVoiceSearch = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopListening()
    }
    setIsListening(false)
  }

  const handleLoanClick = (loanId: string) => {
    setOpen(false)
    setQuery("")
    setResults([])
    setAiSearchResults(null)
    router.push(`/loans/${loanId}`)
  }

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setAiSearchResults(null)
  }

  const getMatchedFieldsText = (matchedFields: string[]) => {
    const fieldNames = {
      name: language === 'hi' ? 'नाम' : 'Name',
      phone: language === 'hi' ? 'फोन' : 'Phone',
      amount: language === 'hi' ? 'राशि' : 'Amount',
      interest: language === 'hi' ? 'ब्याज' : 'Interest',
      date: language === 'hi' ? 'तारीख' : 'Date',
      status: language === 'hi' ? 'स्थिति' : 'Status',
      notes: language === 'hi' ? 'नोट्स' : 'Notes',
      'ai-match': language === 'hi' ? 'AI खोज' : 'AI Match'
    }
    
    return matchedFields.map(field => fieldNames[field as keyof typeof fieldNames] || field).join(', ')
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${className} h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10`}
              onClick={() => setOpen(true)}
              aria-label="Search loans"
            >
              <Search size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {language === 'hi' 
                ? 'ऋण खोजें (वॉइस सपोर्ट)' 
                : 'Search Loans (Voice Enabled)'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search size={20} />
              {language === 'hi' ? 'ऋण खोजें' : 'Search Loans'}
              {voiceSupport.recognition && (
                <Badge variant="secondary" className="text-xs">
                  {language === 'hi' ? 'वॉइस सक्षम' : 'Voice Enabled'}
                </Badge>
              )}
              {isGeminiAvailable && (
                <Badge variant="outline" className="text-xs">
                  <Bot size={12} className="mr-1" />
                  {GeminiAI.isOnlineMode() ? 'AI' : 'AI (Offline)'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 min-h-0">
            {/* Search Input with Voice */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    isListening 
                      ? (language === 'hi' ? 'सुन रहे हैं...' : 'Listening...')
                      : (language === 'hi' ? 'नाम, राशि, या तारीख खोजें...' : 'Search by name, amount, or date...')
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`pl-10 ${isListening ? 'bg-red-50 border-red-200' : ''}`}
                  disabled={isListening}
                />
                {query && !isListening && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={clearSearch}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              
              {/* Voice Input Button */}
              {voiceSupport.recognition && (
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                  disabled={isProcessingVoice}
                  className="flex-shrink-0"
                >
                  {isProcessingVoice ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isListening ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
                </Button>
              )}
            </div>

            {/* Voice Instructions */}
            {voiceSupport.recognition && (
              <p className="text-xs text-muted-foreground text-center">
                {language === 'hi' 
                  ? 'वॉइस सर्च के लिए माइक बटन दबाएं' 
                  : 'Press mic button for voice search'
                }
              </p>
            )}

            {/* AI Search Indicator */}
            {aiSearchResults && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Bot size={16} />
                  <span className="text-sm font-medium">
                    {language === 'hi' 
                      ? `AI ने "${aiSearchResults.query}" के लिए ${aiSearchResults.results.length} परिणाम मिले`
                      : `AI found ${aiSearchResults.results.length} results for "${aiSearchResults.query}"`
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {language === 'hi' ? 'खोज रहे हैं...' : 'Searching...'}
                  </span>
                </div>
              ) : query && results.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground text-sm">
                      {language === 'hi' ? 'कोई ऋण नहीं मिला' : 'No loans found'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                results.map((loan) => (
                  <Card 
                    key={loan.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleLoanClick(loan.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                            loan.isActive ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'
                          }`}>
                            {loan.borrowerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{loan.borrowerName}</h3>
                            {loan.borrowerPhone && (
                              <p className="text-xs text-muted-foreground truncate">{loan.borrowerPhone}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={loan.isActive ? "default" : "secondary"} className="flex-shrink-0">
                          {loan.isActive ? (language === 'hi' ? 'सक्रिय' : 'Active') : (language === 'hi' ? 'पूर्ण' : 'Completed')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'hi' ? 'राशि:' : 'Amount:'}
                          </span>
                          <span className="ml-1 font-medium">₹{loan.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {language === 'hi' ? 'ब्याज:' : 'Interest:'}
                          </span>
                          <span className="ml-1 font-medium">{loan.interestRate}%</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {language === 'hi' ? 'तारीख:' : 'Date:'} {new Date(loan.dateCreated).toLocaleDateString()}
                      </div>
                      
                      {/* Show what matched */}
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {language === 'hi' ? 'मिलान:' : 'Matched:'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getMatchedFieldsText(loan.matchedFields)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
