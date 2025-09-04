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
  Settings,
  Square
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { startVoiceRecognition, stopVoiceRecognition, speak, stopSpeaking } from "@/lib/voice"
import { GeminiAI } from "@/lib/gemini"

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function AIExperience() {
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
  const [voiceSupport, setVoiceSupport] = useState({
    recognition: false,
    synthesis: false
  })
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Connection state
  const [isOnline, setIsOnline] = useState(true)

  // Initialize voice support detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVoiceSupport({
        recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
        synthesis: 'speechSynthesis' in window
      })
      
      // Network status
      setIsOnline(navigator.onLine)
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // Initialize AI
  useEffect(() => {
    GeminiAI.initialize()
  }, [])

  // Voice Recognition Handlers
  const startVoiceRecording = async () => {
    try {
      setIsListening(true)
      const result = await startVoiceRecognition(language)
      
      if (result.success && result.transcript) {
        if (showAI) {
          setInputMessage(result.transcript)
        } else if (showSearch) {
          setSearchQuery(result.transcript)
          performSearch(result.transcript)
        }
      }
    } catch (error) {
      console.error('Voice recording error:', error)
    } finally {
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    stopVoiceRecognition()
    setIsListening(false)
  }

  // Speech Synthesis Handlers
  const toggleSpeaking = () => {
    if (isSpeaking) {
      stopSpeaking()
      setIsSpeaking(false)
    } else {
      // Speak the last AI message
      const lastAIMessage = messages.slice().reverse().find(m => m.type === 'ai')
      if (lastAIMessage) {
        speak(lastAIMessage.content, language)
        setIsSpeaking(true)
        
        // Reset speaking state when done
        setTimeout(() => setIsSpeaking(false), 5000) // Approximate speaking time
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

    // Create abort controller for this request
    const controller = new AbortController()
    setAiController(controller)

    try {
      // Get context for AI
      const loans = storage.getLoans()
      const context = {
        loans,
        hasLoans: loans.length > 0,
        hasActiveLoans: loans.some(loan => loan.isActive)
      }

      const response = await GeminiAI.generateResponse({
        prompt: message.trim(),
        language,
        context
      })

      // Check if request was aborted
      if (controller.signal.aborted) {
        return
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.text,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      // Auto-speak AI response if enabled
      if (isSpeaking && voiceSupport.synthesis) {
        speak(response.text, language)
      }

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
          loan.createdAt.toLocaleDateString().toLowerCase()
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
      <div className="flex items-center gap-2">
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
        <DialogContent className="w-[100vw] sm:w-[95vw] h-[100vh] sm:h-[90vh] max-w-none sm:max-w-5xl p-0 bg-gradient-to-br from-white via-blue-50/30 to-teal-50/40 border-0 sm:border-2 sm:border-primary/20 shadow-none sm:shadow-2xl rounded-none sm:rounded-3xl overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-r from-primary/95 to-primary text-primary-foreground rounded-none sm:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                    <Bot size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg sm:text-xl font-bold">
                      {language === 'hi' ? 'AI सहायक' : 'AI Assistant'}
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 text-xs sm:text-sm">
                      {language === 'hi' ? 'आपका स्मार्ट वित्तीय सहायक' : 'Your smart financial assistant'}
                    </DialogDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Stop Button when AI is thinking */}
                  {isAIThinking && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={stopAI}
                      className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-full h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:p-2"
                    >
                      <Square size={12} className="sm:mr-1" />
                      <span className="hidden sm:inline text-xs">{language === 'hi' ? 'रोकें' : 'Stop'}</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAI(false)}
                    className="text-primary-foreground/80 hover:bg-white/20 rounded-xl h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <X size={16} className="sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Chat Messages Container - Fixed Height */}
            <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-white/50 to-slate-50/50">
              <ScrollArea className="flex-1 h-full">
                <div className="p-3 sm:p-6 pb-4 space-y-3 sm:space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg border border-primary/10 mx-auto max-w-md">
                        <Bot size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-primary" />
                        <p className="text-gray-700 mb-2 font-medium text-sm sm:text-base">
                          {language === 'hi' 
                            ? 'नमस्ते! मैं आपका AI सहायक हूं।'
                            : 'Hello! I\'m your AI assistant.'
                          }
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {language === 'hi' 
                            ? 'लोन, ब्याज, या अन्य कुछ भी पूछें।'
                            : 'Ask about loans, interest, or anything else.'
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} w-full`}
                    >
                      <div
                        className={`
                          max-w-[85%] sm:max-w-[75%] md:max-w-[70%]
                          rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-md
                          ${message.type === 'user'
                            ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground ml-2 sm:ml-4 rounded-br-md'
                            : 'bg-white/95 backdrop-blur-sm border border-gray-100 mr-2 sm:mr-4 rounded-bl-md shadow-lg'
                          }
                        `}
                        style={{ 
                          wordWrap: 'break-word', 
                          overflowWrap: 'anywhere',
                          hyphens: 'auto'
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {message.type === 'ai' && (
                            <div className="bg-primary/10 rounded-full p-1 flex-shrink-0 mt-0.5">
                              <Bot size={12} className="sm:w-4 sm:h-4 text-primary" />
                            </div>
                          )}
                          {message.type === 'user' && (
                            <div className="bg-white/20 rounded-full p-1 flex-shrink-0 mt-0.5">
                              <User size={12} className="sm:w-4 sm:h-4 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p 
                              className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed"
                              style={{ 
                                wordWrap: 'break-word', 
                                overflowWrap: 'anywhere',
                                hyphens: 'auto'
                              }}
                            >
                              {message.content}
                            </p>
                            <p className={`text-xs mt-1 sm:mt-2 ${
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
                    <div className="flex justify-start w-full">
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-lg rounded-2xl rounded-bl-md px-3 sm:px-4 py-2 sm:py-3 mr-2 sm:mr-4 max-w-[85%] sm:max-w-[75%]">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 rounded-full p-1">
                            <Bot size={12} className="sm:w-4 sm:h-4 text-primary" />
                          </div>
                          <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin text-primary" />
                          <span className="text-xs sm:text-sm text-gray-600 flex-1">
                            {language === 'hi' ? 'सोच रहा हूं...' : 'Thinking...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="flex-shrink-0 p-3 sm:p-6 border-t bg-white/90 backdrop-blur-sm rounded-none sm:rounded-b-3xl">
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={language === 'hi' 
                      ? 'अपना सवाल टाइप करें...'
                      : 'Type your question...'
                    }
                    className="pr-10 sm:pr-12 rounded-xl border-2 border-gray-200 focus:border-primary/50 bg-white/80 h-10 sm:h-12 text-sm sm:text-base placeholder:text-gray-400 resize-none"
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
                      className={`absolute right-1 top-1 h-8 w-8 sm:h-10 sm:w-10 rounded-lg ${
                        isListening 
                          ? 'text-red-500 animate-pulse bg-red-50 hover:bg-red-100' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                      onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                      disabled={isAIThinking}
                    >
                      {isListening ? <MicOff size={14} className="sm:w-5 sm:h-5" /> : <Mic size={14} className="sm:w-5 sm:h-5" />}
                    </Button>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || isAIThinking}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white rounded-xl h-10 sm:h-12 px-4 sm:px-6 shadow-lg disabled:opacity-50 flex-shrink-0"
                >
                  {isAIThinking ? (
                    <Loader2 size={16} className="sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Send size={16} className="sm:w-5 sm:h-5" />
                  )}
                </Button>

                {/* Speaker Toggle */}
                {voiceSupport.synthesis && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleSpeaking}
                    className={`rounded-xl h-10 w-10 sm:h-12 sm:w-12 border-2 flex-shrink-0 ${
                      isSpeaking 
                        ? 'text-orange-500 border-orange-200 bg-orange-50 hover:bg-orange-100' 
                        : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                    disabled={isAIThinking}
                  >
                    {isSpeaking ? <VolumeX size={16} className="sm:w-5 sm:h-5" /> : <Volume2 size={16} className="sm:w-5 sm:h-5" />}
                  </Button>
                )}
              </div>
              
              {/* Status Text */}
              {(isAIThinking || isListening || isSpeaking) && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500">
                    {isAIThinking && (language === 'hi' ? 'AI सोच रहा है...' : 'AI is thinking...')}
                    {isListening && (language === 'hi' ? 'सुन रहा हूं...' : 'Listening...')}
                    {isSpeaking && (language === 'hi' ? 'बोल रहा हूं...' : 'Speaking...')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="w-[95vw] sm:max-w-2xl h-[70vh] p-0 rounded-2xl border-2 border-emerald-500/20 shadow-2xl">
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-2xl">
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

            <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-emerald-50/30">
              {/* Search Input */}
              <div className="p-4 sm:p-6 border-b bg-white/80">
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
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 px-6"
                  >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              <ScrollArea className="flex-1 p-4 sm:p-6">
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
        </DialogContent>
      </Dialog>
    </>
  )
}
