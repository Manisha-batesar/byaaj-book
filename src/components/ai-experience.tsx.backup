"use client"

import { useState, useEffect, useRef } from "react"
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
  Settings,
  Square
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storage, type Loan } from "@/lib/storage"
import VoiceManager, { VoiceRecognitionResult } from "@/lib/voice"
import { GeminiAI } from "@/lib/gemini"

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AIExperience({ className = "" }: { className?: string }) {
  const { language } = useLanguage()
  
  // Dialog states
  const [showAI, setShowAI] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // AI Chat states
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [aiController, setAiController] = useState<AbortController | null>(null)
  
  // Voice states
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceManager, setVoiceManager] = useState<VoiceManager | null>(null)
  const [voiceSupport, setVoiceSupport] = useState({
    recognition: false,
    synthesis: false
  })
  
  // Refs for chat scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Connection state
  const [isOnline, setIsOnline] = useState(true)

    // Initialize voice support detection and VoiceManager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = VoiceManager.isVoiceSupported()
      setVoiceSupport(support)
      
      // Initialize VoiceManager
      const manager = new VoiceManager(language)
      setVoiceManager(manager)
    }
  }, [language])

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Handle scroll detection
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    
    // Show scroll button if user scrolled up more than 200px from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
    setShowScrollButton(!isNearBottom && messages.length > 0)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAIThinking])

  // Initialize AI
  useEffect(() => {
    GeminiAI.initialize()
  }, [])

  // Voice Recognition Handlers
  const startVoiceRecording = async () => {
    if (!voiceManager) return
    
    try {
      setIsListening(true)
      const success = voiceManager.startListening(
        (result: VoiceRecognitionResult) => {
          if (result.transcript && !result.isListening) {
            // Voice recognition completed
            if (showAI) {
              setInputMessage(result.transcript)
            } else if (showSearch) {
              setSearchQuery(result.transcript)
              performSearch(result.transcript)
            }
            setIsListening(false)
          }
        },
        (error: string) => {
          console.error('Voice recognition error:', error)
          setIsListening(false)
        }
      )
      
      if (!success) {
        setIsListening(false)
      }
    } catch (error) {
      console.error('Voice recording error:', error)
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceManager) {
      voiceManager.stopListening()
    }
    setIsListening(false)
  }

  // Speech Synthesis Handlers
  const toggleSpeaking = () => {
    if (!voiceManager) return
    
    if (isSpeaking) {
      voiceManager.stopSpeaking()
      setIsSpeaking(false)
    } else {
      // Speak the last AI message
      const lastAIMessage = messages.slice().reverse().find(m => m.type === 'ai')
      if (lastAIMessage) {
        const success = voiceManager.speak(lastAIMessage.content)
        if (success) {
          setIsSpeaking(true)
          // Reset speaking state when done
          setTimeout(() => setIsSpeaking(false), 5000) // Approximate speaking time
        }
      }
    }
  }

  // AI Chat Functions
  const sendMessage = async (message: string) => {
    if (!message.trim() || isAIThinking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsAIThinking(true)

    // Scroll to bottom after adding user message
    setTimeout(scrollToBottom, 100)

    // Create abort controller for this request
    const controller = new AbortController()
    setAiController(controller)

    try {
      // Get comprehensive context for AI
      const loans = storage.getLoans()
      const payments = storage.getPayments()
      const totalLent = loans.reduce((sum, loan) => sum + loan.amount, 0)
      const activeLoans = loans.filter(loan => loan.isActive)
      const completedLoans = loans.filter(loan => !loan.isActive)
      const totalReceived = loans.reduce((sum, loan) => sum + loan.totalPaid, 0)
      const totalOutstanding = loans.reduce((sum, loan) => sum + storage.calculateOutstandingAmount(loan), 0)

      const enhancedPrompt = `${message.trim()}

CONTEXT: User has ${loans.length} total loans (${activeLoans.length} active, ${completedLoans.length} completed). Total lent: ₹${totalLent.toLocaleString()}, Total received: ₹${totalReceived.toLocaleString()}, Outstanding: ₹${totalOutstanding.toLocaleString()}.

INSTRUCTIONS: 
1. If user wants to create a loan (mentions "add loan", "new loan", "create loan", etc.), help them step by step and when you have all required info, format response as JSON with loanData object.
2. For calculations, provide exact numbers with proper formatting.
3. For search queries, help them find relevant loans based on their request.
4. Be concise but informative, like a professional financial assistant.
5. Always respond in ${language === 'hi' ? 'Hindi' : 'English'} as requested.
6. If you detect a loan creation request, gather: borrowerName, amount (number), interestRate (number), interestMethod (monthly/yearly/sankda), years (optional, default 1), borrowerPhone (optional), notes (optional).

User Query: ${message.trim()}`

      const context = {
        loans,
        payments,
        hasLoans: loans.length > 0,
        hasActiveLoans: activeLoans.length > 0,
        totalLent,
        totalReceived,
        totalOutstanding,
        activeCount: activeLoans.length,
        completedCount: completedLoans.length
      }

      const response = await GeminiAI.generateResponse({
        prompt: enhancedPrompt,
        language,
        context
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      let aiResponseText = response.text

      // Check if response contains loan creation data
      try {
        const loanDataMatch = response.text.match(/\{[\s\S]*"loanData"[\s\S]*\}/)
        if (loanDataMatch) {
          const jsonData = JSON.parse(loanDataMatch[0])
          if (jsonData.loanData && jsonData.response) {
            // Process loan creation
            const loanData = jsonData.loanData
            
            // Validate required fields
            if (loanData.borrowerName && loanData.amount && loanData.interestRate && loanData.interestMethod) {
              try {
                // Create the loan
                const newLoan: Loan = {
                  id: Date.now().toString(),
                  borrowerName: loanData.borrowerName.trim(),
                  borrowerPhone: loanData.borrowerPhone?.trim() || '',
                  notes: loanData.notes?.trim() || '',
                  amount: Number(loanData.amount),
                  interestRate: loanData.interestMethod === "sankda" ? 12 : Number(loanData.interestRate),
                  interestMethod: loanData.interestMethod,
                  interestType: 'simple', // Default to simple interest
                  years: Number(loanData.years) || 1,
                  dateCreated: new Date().toISOString(),
                  expectedReturnDate: undefined,
                  dueDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000 * (Number(loanData.years) || 1))).toISOString(), // Due in 1 year by default
                  totalPaid: 0,
                  isActive: true,
                }

                const existingLoans = storage.getLoans()
                storage.saveLoans([...existingLoans, newLoan])
                
                const finalAmount = storage.calculateFinalAmount(newLoan)
                
                aiResponseText = language === 'hi' 
                  ? `✅ लोन सफलतापूर्वक बनाया गया!\n\n📋 **लोन विवरण:**\n👤 उधारकर्ता: ${newLoan.borrowerName}\n💰 राशि: ₹${newLoan.amount.toLocaleString()}\n📈 ब्याज दर: ${newLoan.interestRate}% (${newLoan.interestMethod})\n⏰ अवधि: ${newLoan.years} वर्ष\n💵 कुल देय राशि: ₹${finalAmount.toLocaleString()}\n📅 देय तिथि: ${new Date(newLoan.dueDate).toLocaleDateString('hi-IN')}\n\nलोन ID: ${newLoan.id}`
                  : `✅ Loan created successfully!\n\n📋 **Loan Details:**\n👤 Borrower: ${newLoan.borrowerName}\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest Rate: ${newLoan.interestRate}% (${newLoan.interestMethod})\n⏰ Duration: ${newLoan.years} year(s)\n💵 Total Payable: ₹${finalAmount.toLocaleString()}\n📅 Due Date: ${new Date(newLoan.dueDate).toLocaleDateString()}\n\nLoan ID: ${newLoan.id}`
                
              } catch (error) {
                aiResponseText = language === 'hi'
                  ? `❌ लोन बनाने में त्रुटि हुई: ${error instanceof Error ? error.message : 'अज्ञात त्रुटि'}`
                  : `❌ Error creating loan: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            } else {
              aiResponseText = jsonData.response || response.text
            }
          }
        }
      } catch (jsonError) {
        // If JSON parsing fails, use the original response
        aiResponseText = response.text
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseText,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-speak AI response if enabled
      if (isSpeaking && voiceSupport.synthesis && voiceManager) {
        voiceManager.speak(aiResponseText)
      }

      // Scroll to bottom after AI response
      setTimeout(scrollToBottom, 200)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't show error
        return
      }

      console.error('AI response error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: language === 'hi' 
          ? 'माफ करें, मुझे आपके प्रश्न का उत्तर देने में समस्या हुई है। कृपया दोबारा कोशिश करें।'
          : 'Sorry, I encountered an issue answering your question. Please try again.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      // Scroll to bottom after error message
      setTimeout(scrollToBottom, 200)
    } finally {
      setIsAIThinking(false)
      setAiController(null)
    }
  }

  // Stop AI function
  const stopAI = () => {
    if (aiController) {
      aiController.abort()
      setAiController(null)
    }
    setIsAIThinking(false)
  }

  // Search Functions
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const loans = storage.getLoans()
      const searchTerms = query.toLowerCase().split(' ')
      
      const results = loans.filter(loan => {
        const searchableText = [
          loan.borrowerName.toLowerCase(),
          loan.amount.toString(),
          loan.interestRate.toString(),
          loan.interestMethod.toLowerCase(),
          loan.borrowerPhone || '',
          loan.notes || '',
          new Date(loan.dateCreated).toLocaleDateString().toLowerCase()
        ].join(' ')
        
        return searchTerms.some(term => searchableText.includes(term))
      })

      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    }).format(date)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <>
      {/* Main AI Buttons */}
      <div className={`flex items-center gap-2 ${className}`}>
        {/* AI Assistant Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAI(true)}
                className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border-2 border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="relative">
                  <Bot size={18} className="text-purple-600" />
                  <Sparkles size={8} className="absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{language === 'hi' ? 'AI सहायक' : 'AI Assistant'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Smart Search Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(true)}
                className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-2 border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="relative">
                  <Search size={18} className="text-emerald-600" />
                  <Zap size={8} className="absolute -top-1 -right-1 text-orange-500 animate-bounce" />
                </div>
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
        <DialogContent className="w-[calc(100vw-16px)] h-[calc(100dvh-32px)] mx-2 my-4 sm:w-[90vw] sm:h-[85vh] sm:max-w-4xl sm:mx-auto sm:my-auto p-0 bg-white border-0 sm:border-2 sm:border-gray-200 shadow-lg sm:shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
          {/* Header - Fixed at top */}
          <DialogHeader className="flex-shrink-0 px-4 py-3 bg-primary text-primary-foreground border-b-0 rounded-none">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAI(false)}
                className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full h-10 w-10 p-0"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </Button>
              
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-primary-foreground/20 rounded-full p-2">
                  <Bot size={24} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-lg font-semibold text-primary-foreground">
                    {language === 'hi' ? 'AI सहायक' : 'AI Assistant'}
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/80 text-sm">
                    {isOnline ? (
                      language === 'hi' ? 'ऑनलाइन • उन्नत AI' : 'Online • Advanced AI'
                    ) : (
                      language === 'hi' ? 'ऑफ़लाइन • बुनियादी AI' : 'Offline • Basic AI'
                    )}
                  </DialogDescription>
                </div>
              </div>

              {/* Stop Button when AI is thinking */}
              {isAIThinking && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={stopAI}
                  className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-full h-8 px-3"
                >
                  <Square size={12} className="mr-1" />
                  <span className="text-xs">{language === 'hi' ? 'रोकें' : 'Stop'}</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Chat Messages Area - Scrollable middle section */}
          <div className="flex-1 bg-gray-100 relative overflow-hidden">
            <div 
              ref={scrollAreaRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto px-4 py-4"
              style={{ 
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {messages.length === 0 && (
                <div className="flex items-center justify-center min-h-full py-8">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mx-auto max-w-xs text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot size={32} className="text-primary" />
                    </div>
                    <p className="text-gray-700 font-medium text-sm mb-2">
                      {language === 'hi' 
                        ? 'नमस्ते! मैं आपका AI सहायक हूं।'
                        : 'Hello! Im your AI assistant.'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'hi' 
                        ? 'लोन, ब्याज, या अन्य कुछ भी पूछें।'
                        : 'Ask about loans, interest, or anything else.'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Messages Container */}
              <div className="space-y-3 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[80%] sm:max-w-[70%] 
                        rounded-2xl px-3 py-2 shadow-sm
                        ${message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'ai' && (
                          <div className="bg-primary/10 rounded-full p-1 flex-shrink-0 mt-0.5">
                            <Bot size={12} className="text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                            {message.content}
                          </p>
                          <p className={`text-xs mt-1 opacity-70`}> 
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isAIThinking && (
                  <div className="flex justify-start w-full">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-md px-3 py-2 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 rounded-full p-1">
                          <Bot size={12} className="text-primary" />
                        </div>
                        <Loader2 size={14} className="animate-spin text-primary" />
                        <span className="text-sm text-gray-600">
                          {language === 'hi' ? 'सोच रहा हूं...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-scroll target */}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollButton && (
              <div className="absolute bottom-6 right-4 z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToBottom}
                  className="rounded-full h-12 w-12 shadow-lg bg-white hover:bg-gray-50 border border-gray-200 hover:shadow-xl transition-all duration-200"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={language === 'hi' 
                    ? 'संदेश लिखें...'
                    : 'Type a message...'
                  }
                  className="rounded-full border-gray-300 focus:border-primary focus:ring-primary/20 bg-white h-10 text-sm placeholder:text-gray-400 pr-12 resize-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(inputMessage)
                    }
                  }}
                  disabled={isAIThinking}
                />
                
                {/* Voice Button */}
                {voiceSupport.recognition && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-1 h-8 w-8 rounded-full transition-colors ${
                      isListening 
                        ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                    onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                    disabled={isAIThinking}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </Button>
                )}
              </div>

              {/* Send Button */}
              <Button
                onClick={() => sendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isAIThinking}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 w-10 p-0 shadow-sm disabled:opacity-50 transition-all duration-200"
              >
                {isAIThinking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </Button>

              {/* Speaker Toggle */}
              {voiceSupport.synthesis && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSpeaking}
                  className={`rounded-full h-10 w-10 border transition-all duration-200 ${
                    isSpeaking 
                      ? 'text-orange-500 border-orange-300 bg-orange-50 hover:bg-orange-100' 
                      : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={isAIThinking}
                >
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              )}
            </div>
            
            {/* Status Text */}
            {(isListening || isSpeaking) && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                  {isListening && (language === 'hi' ? '🎤 सुन रहा हूं...' : '🎤 Listening...')}
                  {isSpeaking && (language === 'hi' ? '🔊 बोल रहा हूं...' : '🔊 Speaking...')}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="w-[100vw] h-[100vh] sm:w-[95vw] sm:h-[70vh] sm:max-w-2xl p-0 rounded-none sm:rounded-2xl border-0 sm:border-2 sm:border-emerald-500/20 shadow-none sm:shadow-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-none sm:rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={24} className="sm:w-8 sm:h-8" />
                    <Zap size={10} className="sm:w-3 sm:h-3 absolute -top-1 -right-1 text-yellow-300 animate-bounce" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-bold">
                      {language === 'hi' ? 'स्मार्ट खोज' : 'Smart Search'}
                    </DialogTitle>
                    <DialogDescription className="text-emerald-100 text-sm">
                      {language === 'hi' 
                        ? 'वॉइस या टेक्स्ट से खोजें'
                        : 'Search by voice or text'
                      }
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(false)}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X size={20} />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-emerald-50/30 min-h-0">
              {/* Search Input */}
              <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-white/80">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        performSearch(e.target.value)
                      }}
                      placeholder={language === 'hi' 
                        ? 'नाम, राशि, या फोन नंबर से खोजें...'
                        : 'Search by name, amount, or phone...'
                      }
                      className="pr-12 rounded-xl border-2 border-emerald-200 focus:border-emerald-400 bg-white h-12"
                    />
                    
                    {voiceSupport.recognition && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute right-1 top-1 h-10 w-10 rounded-lg ${
                          isListening 
                            ? 'text-red-500 animate-pulse bg-red-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                      >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={() => performSearch(searchQuery)}
                    disabled={isSearching}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-6 flex-shrink-0"
                  >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                <ScrollArea className="h-full">
                  {searchResults.length === 0 && searchQuery.trim() === '' && (
                    <div className="text-center py-8">
                      <Search size={48} className="mx-auto mb-4 text-emerald-400" />
                      <p className="text-gray-600 mb-2">
                        {language === 'hi' 
                          ? 'अपना ऋण खोजना शुरू करें'
                          : 'Start searching for your loans'
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {language === 'hi' 
                          ? 'नाम, राशि, या फोन नंबर टाइप करें'
                          : 'Type a name, amount, or phone number'
                        }
                      </p>
                    </div>
                  )}

                  {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
                    <div className="text-center py-8">
                      <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                        <MessageCircle size={48} className="mx-auto mb-4 text-yellow-500" />
                        <p className="text-gray-600 mb-2">
                          {language === 'hi' 
                            ? 'कोई परिणाम नहीं मिला'
                            : 'No results found'
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          {language === 'hi' 
                            ? 'अलग शब्दों से खोजने की कोशिश करें'
                            : 'Try searching with different terms'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {searchResults.map((loan) => {
                      const finalAmount = storage.calculateFinalAmount(loan)
                      const outstanding = storage.calculateOutstandingAmount(loan)
                      
                      return (
                        <div
                          key={loan.id}
                          className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-800">{loan.borrowerName}</h3>
                            <Badge 
                              variant={loan.isActive ? "default" : "secondary"}
                              className={loan.isActive 
                                ? "bg-emerald-500 text-white" 
                                : "bg-gray-500 text-white"
                              }
                            >
                              {loan.isActive 
                                ? (language === 'hi' ? 'सक्रिय' : 'Active')
                                : (language === 'hi' ? 'पूर्ण' : 'Completed')
                              }
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">
                                {language === 'hi' ? 'राशि: ' : 'Amount: '}
                              </span>
                              <span className="font-medium">{formatCurrency(loan.amount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                {language === 'hi' ? 'ब्याज: ' : 'Interest: '}
                              </span>
                              <span className="font-medium">{loan.interestRate}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                {language === 'hi' ? 'कुल देय: ' : 'Total Due: '}
                              </span>
                              <span className="font-medium">{formatCurrency(finalAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">
                                {language === 'hi' ? 'बकाया: ' : 'Outstanding: '}
                              </span>
                              <span className="font-medium text-emerald-600">{formatCurrency(outstanding)}</span>
                            </div>
                          </div>
                          
                          {loan.borrowerPhone && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">
                                {language === 'hi' ? 'फोन: ' : 'Phone: '}
                              </span>
                              <span className="font-medium">{loan.borrowerPhone}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Named export for compatibility
export { AIExperience }
