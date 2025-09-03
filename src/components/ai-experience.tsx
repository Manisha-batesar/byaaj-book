"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Bot, 
  Mic, 
  MicOff,
  Search, 
  Send,
  X,
  Loader2,
  Sparkles,
  MessageCircle,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  User,
  Zap,
  Brain,
  Settings
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { GeminiAI, type GeminiRequest } from "@/lib/gemini"
import { VoiceManager, voiceUtils, type VoiceRecognitionResult } from "@/lib/voice"

interface AIExperienceProps {
  className?: string
  currentLoanId?: string
}

export function AIExperience({ className, currentLoanId }: AIExperienceProps) {
  const { language, t } = useLanguage()
  
  // Main dialog states
  const [showAI, setShowAI] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // AI Chat states
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'ai', content: string, timestamp: Date}>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // System states
  const [isOnline, setIsOnline] = useState(true)
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [aiCapabilities, setAICapabilities] = useState({
    chat: true,
    voice: false,
    search: true,
    loanAnalysis: true
  })

  // Voice manager
  const [voiceManager, setVoiceManager] = useState<VoiceManager | null>(null)

  // Initialize everything
  useEffect(() => {
    // Check connectivity
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Setup voice
    const support = voiceUtils.checkSupport()
    setVoiceSupport(support)
    if (support.recognition || support.synthesis) {
      const vm = new VoiceManager(language)
      setVoiceManager(vm)
    }

    // Update AI capabilities
    setAICapabilities(prev => ({
      ...prev,
      voice: support.recognition || support.synthesis
    }))

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
    }
  }, [language])

  // AI Chat Functions
  const sendMessage = async (message: string) => {
    if (!message.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsAIThinking(true)

    try {
      const loans = storage.getLoans()
      const payments = storage.getPayments()
      
      const context = {
        currentLoanId,
        hasLoans: loans.length > 0,
        totalLoans: loans.length,
        activeLoans: loans.filter(l => l.isActive).length,
        language,
        recentActivity: payments.slice(-5)
      }

      const request: GeminiRequest = {
        prompt: message,
        context: {
          loans,
          payments,
          currentLoan: currentLoanId ? loans.find(l => l.id === currentLoanId) : undefined
        },
        language
      }

      const aiResponse = await GeminiAI.generateResponse(request)

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: typeof aiResponse === 'string' ? aiResponse : aiResponse.text,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-speak AI response if voice is enabled
      if (voiceSupport.synthesis && voiceManager) {
        setIsSpeaking(true)
        try {
          const responseText = typeof aiResponse === 'string' ? aiResponse : aiResponse.text
          await voiceManager.speak(responseText)
        } catch (error) {
          console.error('Speech synthesis error:', error)
        } finally {
          setIsSpeaking(false)
        }
      }

    } catch (error) {
      console.error('AI response error:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: language === 'hi' 
          ? 'माफ करें, मुझे कुछ समस्या हो रही है। कृपया फिर से कोशिश करें।'
          : 'Sorry, I encountered an issue. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAIThinking(false)
    }
  }

  // Voice Functions
  const startVoiceRecording = async () => {
    if (!voiceManager || !voiceSupport.recognition) return

    setIsListening(true)
    try {
      await voiceManager.startListening((result: VoiceRecognitionResult) => {
        if (result.transcript) {
          setInputMessage(result.transcript)
        }
      })
    } catch (error) {
      console.error('Voice recognition error:', error)
    } finally {
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceManager) {
      voiceManager.stopListening()
    }
    setIsListening(false)
  }

  const toggleSpeaking = () => {
    if (isSpeaking && voiceManager) {
      voiceManager.stopSpeaking()
      setIsSpeaking(false)
    }
  }

  // Search Functions
  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const loans = storage.getLoans()
      const payments = storage.getPayments()

      // Smart search through loans
      const loanResults = loans.filter(loan => 
        loan.borrowerName.toLowerCase().includes(query.toLowerCase()) ||
        loan.amount.toString().includes(query) ||
        loan.interestMethod.toLowerCase().includes(query.toLowerCase())
      )

      // Search through payments
      const paymentResults = payments.filter(payment => {
        const loan = loans.find(l => l.id === payment.loanId)
        return loan && (
          loan.borrowerName.toLowerCase().includes(query.toLowerCase()) ||
          payment.amount.toString().includes(query)
        )
      })

      setSearchResults([
        ...loanResults.map(loan => ({ type: 'loan', data: loan })),
        ...paymentResults.map(payment => ({ type: 'payment', data: payment }))
      ])

    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input
  useEffect(() => {
    if (searchQuery) {
      const debounceTimer = setTimeout(() => {
        performSearch(searchQuery)
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN').format(date)
  }

  return (
    <>
      {/* Main AI Buttons in Header */}
      <div className={`flex items-center gap-2 ${className}`}>
        {/* AI Chat Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary hover:from-primary/20 hover:to-purple-500/20 transition-all duration-300"
                onClick={() => setShowAI(true)}
              >
                <Bot size={20} />
                {!isOnline && (
                  <WifiOff size={8} className="absolute -top-1 -right-1 text-red-500" />
                )}
                <Sparkles size={10} className="absolute top-0 right-0 text-yellow-500 animate-pulse" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{language === 'hi' ? 'AI सहायक चैट' : 'AI Assistant Chat'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Smart Search Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
                onClick={() => setShowSearch(true)}
              >
                <Search size={20} />
                <Brain size={10} className="absolute -top-1 -right-1 text-blue-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{language === 'hi' ? 'स्मार्ट खोज' : 'Smart Search'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* AI Chat Dialog */}
      <Dialog open={showAI} onOpenChange={setShowAI}>
        <DialogContent className="sm:max-w-4xl h-[80vh] p-0 bg-gradient-to-br from-slate-50 to-blue-50">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bot size={32} />
                  <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {language === 'hi' ? 'AI सहायक' : 'AI Assistant'}
                  </DialogTitle>
                  <DialogDescription className="text-blue-100">
                    {language === 'hi' 
                      ? 'आपका व्यक्तिगत वित्तीय सहायक'
                      : 'Your personal financial assistant'
                    }
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    <Wifi size={12} className="mr-1" />
                    {language === 'hi' ? 'ऑनलाइन' : 'Online'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-500 text-white">
                    <WifiOff size={12} className="mr-1" />
                    {language === 'hi' ? 'ऑफलाइन' : 'Offline'}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-2">
                    {language === 'hi' 
                      ? 'नमस्ते! मैं आपका AI सहायक हूं।'
                      : 'Hello! I\'m your AI assistant.'
                    }
                  </p>
                  <p className="text-sm text-gray-400">
                    {language === 'hi' 
                      ? 'लोन, ब्याज, या अन्य कुछ भी पूछें।'
                      : 'Ask about loans, interest, or anything else.'
                    }
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-white border shadow-sm mr-4'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.type === 'ai' && (
                        <Bot size={16} className="mt-1 text-primary flex-shrink-0" />
                      )}
                      {message.type === 'user' && (
                        <User size={16} className="mt-1 text-primary-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'
                        }`}>
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isAIThinking && (
                <div className="flex justify-start">
                  <div className="bg-white border shadow-sm rounded-lg px-4 py-3 mr-4">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-primary" />
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="text-sm text-gray-500">
                        {language === 'hi' ? 'सोच रहा हूं...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 border-t bg-white">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={language === 'hi' 
                    ? 'अपना सवाल टाइप करें...'
                    : 'Type your question...'
                  }
                  className="pr-12"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(inputMessage)
                    }
                  }}
                />
                
                {/* Voice Button */}
                {voiceSupport.recognition && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-1 h-8 w-8 ${
                      isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'
                    }`}
                    onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </Button>
                )}
              </div>

              <Button
                onClick={() => sendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isAIThinking}
                className="bg-primary hover:bg-primary/90"
              >
                <Send size={16} />
              </Button>

              {/* Speaker Toggle */}
              {voiceSupport.synthesis && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSpeaking}
                  className={isSpeaking ? 'text-orange-500' : 'text-gray-500'}
                >
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-2xl h-[70vh] p-0">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={32} />
                <Brain size={12} className="absolute -top-1 -right-1 text-cyan-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {language === 'hi' ? 'स्मार्ट खोज' : 'Smart Search'}
                </DialogTitle>
                <DialogDescription className="text-blue-100">
                  {language === 'hi' 
                    ? 'अपने लोन और पेमेंट्स में खोजें'
                    : 'Search through your loans and payments'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6">
            {/* Search Input */}
            <div className="relative mb-6">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' 
                  ? 'नाम, राशि, या कुछ भी खोजें...'
                  : 'Search by name, amount, or anything...'
                }
                className="pl-10 text-lg h-12"
              />
              {isSearching && (
                <Loader2 size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-blue-500" />
              )}
            </div>

            {/* Search Results */}
            <ScrollArea className="h-[400px]">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {result.type === 'loan' ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{result.data.borrowerName}</h3>
                            <p className="text-sm text-gray-500">
                              {language === 'hi' ? 'लोन राशि: ' : 'Loan Amount: '}
                              {formatCurrency(result.data.amount)}
                            </p>
                            <Badge variant="outline" className="mt-1">
                              {result.data.interestMethod}
                            </Badge>
                          </div>
                          <Badge variant={result.data.isActive ? "default" : "secondary"}>
                            {result.data.isActive 
                              ? (language === 'hi' ? 'सक्रिय' : 'Active')
                              : (language === 'hi' ? 'पूर्ण' : 'Completed')
                            }
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {language === 'hi' ? 'भुगतान' : 'Payment'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(result.data.amount)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {language === 'hi' ? 'पेमेंट' : 'Payment'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-gray-500">
                  {language === 'hi' 
                    ? 'कोई परिणाम नहीं मिला'
                    : 'No results found'
                  }
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {language === 'hi' 
                    ? 'खोजना शुरू करने के लिए टाइप करें'
                    : 'Start typing to search'
                  }
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
