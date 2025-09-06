"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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

interface ConversationState {
  isCreatingLoan: boolean
  isInConversation: boolean
  loanData: {
    borrowerName?: string
    amount?: number
    interestRate?: number
    interestMethod?: 'monthly' | 'yearly' | 'sankda'
    years?: number
    borrowerPhone?: string
    notes?: string
  }
  currentStep: 'name' | 'amount' | 'rate' | 'method' | 'duration' | 'phone' | 'notes' | 'confirm' | 'complete'
}

export default function AIExperienceSmart({ className = "" }: { className?: string }) {
  const { language } = useLanguage()
  const router = useRouter()
  
  // Dialog states
  const [showAI, setShowAI] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // AI Chat states
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [aiController, setAiController] = useState<AbortController | null>(null)
  const [conversationState, setConversationState] = useState<ConversationState>({
    isCreatingLoan: false,
    isInConversation: false,
    loanData: {},
    currentStep: 'name'
  })
  
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

  // Helper functions for smart conversational AI
  const detectLoanIntent = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    const loanKeywords = [
      'loan', 'add loan', 'create loan', 'new loan', 'make loan', 'give loan',
      'lend', 'lending', 'loan create', 'loan add', 'loan dena', 'loan banana',
      'udhar', 'karj', 'udhaar', 'rin', 'paisa dena', 'naya loan', 'loan banao', 
      'loan karna'
    ]
    
    const hasDirectKeyword = loanKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    )
    
    const loanPatterns = [
      /.*\s+(ko|for|ke liye)\s+(loan|udhar|paisa|money)/,
      /(loan|udhar|paisa|money)\s+.+\s+(ko|for|ke liye)/,
      /(.*)\s+(loan|udhar|paisa)\s+(dena|give|add|create)/,
      /^(.*)\s*(loan|udhar)$/,
      /(dena|give|add|make)\s+.*\s*(loan|udhar)/,
    ]
    
    const hasLoanPattern = loanPatterns.some(pattern => pattern.test(lowerMessage))
    
    const simpleTriggers = ['add', 'create', 'new', 'make']
    const hasSimpleTrigger = simpleTriggers.some(trigger => 
      lowerMessage === trigger || lowerMessage.startsWith(trigger + ' ')
    )
    
    return hasDirectKeyword || hasLoanPattern || hasSimpleTrigger
  }

  const extractAmountFromText = (text: string): number | null => {
    const amountPatterns = [
      /₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /₹?\s*(\d+)/g,
    ]
    
    for (const pattern of amountPatterns) {
      const matches = text.match(pattern)
      if (matches) {
        const numberStr = matches[0].replace(/[₹,\s]/g, '')
        const amount = parseFloat(numberStr)
        if (!isNaN(amount) && amount > 0) {
          return amount
        }
      }
    }
    return null
  }

  const extractInterestRate = (text: string): { rate: number, method: 'monthly' | 'yearly' | 'sankda' } | null => {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('sankda') || lowerText.includes('सांकडा')) {
      return { rate: 12, method: 'sankda' }
    }
    
    const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%/)
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1])
      
      const isMonthly = lowerText.includes('month') || lowerText.includes('mahina') || 
                       lowerText.includes('monthly') || lowerText.includes('माहिना')
      const isYearly = lowerText.includes('year') || lowerText.includes('yearly') || 
                      lowerText.includes('sal') || lowerText.includes('साल') ||
                      lowerText.includes('varsh') || lowerText.includes('वर्ष')
      
      if (isMonthly) return { rate, method: 'monthly' }
      if (isYearly) return { rate, method: 'yearly' }
      
      return { rate, method: 'yearly' }
    }
    
    return null
  }

  const extractDuration = (text: string): number | null => {
    const durationPatterns = [
      /(\d+)\s*(?:year|years|sal|साल|varsh|वर्ष)/i,
      /(\d+)\s*(?:month|months|mahina|माहिना)/i
    ]
    
    for (const pattern of durationPatterns) {
      const match = text.match(pattern)
      if (match) {
        const duration = parseFloat(match[1])
        if (text.toLowerCase().includes('month') || text.toLowerCase().includes('mahina')) {
          return Math.max(0.1, duration / 12)
        }
        return Math.max(0.1, duration)
      }
    }
    return null
  }

  // SMART CONVERSATIONAL AI LOGIC
  const generateSmartResponse = (userMessage: string): string => {
    const { isCreatingLoan, isInConversation, loanData, currentStep } = conversationState
    const lowerMessage = userMessage.toLowerCase().trim()
    
    // Handle exit/bye commands first - AUTO CLOSE CHAT
    if (lowerMessage.match(/(bye|exit|close|quit|band|khatam|gaya)/i)) {
      setConversationState({
        isCreatingLoan: false,
        isInConversation: false,
        loanData: {},
        currentStep: 'name'
      })
      
      setTimeout(() => {
        setShowAI(false) // Close the AI dialog automatically
      }, 1500)
      
      return language === 'hi' 
        ? 'Bye bye! 👋 AI chat band kar raha hun. Have a great day! 😊'
        : 'Bye bye! 👋 Closing AI chat. Have a great day! 😊'
    }
    
    // If not in any conversation mode
    if (!isCreatingLoan && !isInConversation) {
      // Handle greetings - START CONVERSATION MODE
      const greetingPatterns = [
        /^h+[iy]+$/i,           // hi, hii, hiiii, hy, hyy, hyyy  
        /^h+[ae]+[ly]+[oy]*$/i, // hello, helo, hellooo, hey, heyy
        /^h+[eya]+y*$/i,        // hey, heyy, heyyy, hay, hyy
        /^namaste+$/i,          // namaste, namasteee
        /^good\s*(morning|afternoon|evening|night)$/i,
        /^sup+$/i, /^yo+$/i, /^what'?s\s*up$/i,
      ]
      
      const isGreeting = greetingPatterns.some(pattern => pattern.test(lowerMessage)) ||
                        (lowerMessage.length <= 6 && /^[hiy]+$/i.test(lowerMessage))
      
      if (isGreeting) {
        setConversationState({
          isCreatingLoan: false,
          isInConversation: true, // Enter conversation mode
          loanData: {},
          currentStep: 'name'
        })
        
        return language === 'hi' 
          ? 'Hii there! 😊 Main aapka smart AI assistant hun. Kya help chahiye?\n\n✅ Loan banane ke liye "add loan" ya naam boliye\n✅ Help ke liye "help" boliye\n✅ Exit ke liye "bye" boliye 💰'
          : 'Hii there! 😊 I\'m your smart AI assistant. How can I help you?\n\n✅ Say "add loan" or a name to create loan\n✅ Say "help" for help\n✅ Say "bye" to exit 💰'
      }
      
      // Direct loan intent without greeting
      if (detectLoanIntent(userMessage)) {
        setConversationState({
          isCreatingLoan: true,
          isInConversation: true,
          loanData: {},
          currentStep: 'name'
        })
        
        return language === 'hi' 
          ? '🙂 Great! Loan banane ke liye pehle borrower ka naam batao?'
          : '🙂 Great! To create a loan, first tell me the borrower\'s name?'
      }
      
      return '' // Let Gemini handle complex queries if not in conversation
    }
    
    // IN CONVERSATION MODE but not creating loan
    if (!isCreatingLoan && isInConversation) {
      
      // If user says a name after greeting, treat as loan intent
      if (lowerMessage.length > 1 && lowerMessage.length < 30 && 
          !lowerMessage.includes(' ') && /^[a-zA-Z\s]+$/.test(lowerMessage)) {
        
        setConversationState({
          isCreatingLoan: true,
          isInConversation: true,
          loanData: { borrowerName: userMessage.trim() },
          currentStep: 'amount'
        })
        
        return language === 'hi'
          ? `Perfect! 😊 "${userMessage.trim()}" ka naam save kar liya. Ab loan amount batao (jaise ₹50,000)`
          : `Perfect! 😊 Saved "${userMessage.trim()}" as borrower. Now tell me the loan amount (like ₹50,000)`
      }
      
      // Check for loan intent
      if (detectLoanIntent(userMessage)) {
        setConversationState({
          isCreatingLoan: true,
          isInConversation: true,
          loanData: {},
          currentStep: 'name'
        })
        
        return language === 'hi' 
          ? '🙂 Great! Loan banane ke liye borrower ka naam batao?'
          : '🙂 Great! Tell me the borrower\'s name?'
      }
      
      // Handle help
      if (lowerMessage.includes('help') || lowerMessage.includes('madad')) {
        return language === 'hi'
          ? 'Main ye kar sakta hun! 📋\n\n✅ Loan create: naam boliye ya "add loan"\n✅ Calculator: "calculate" boliye\n✅ Exit: "bye" boliye\n\nKya karna hai? 😊'
          : 'I can do this! 📋\n\n✅ Create loan: say name or "add loan"\n✅ Calculator: say "calculate"\n✅ Exit: say "bye"\n\nWhat do you want to do? 😊'
      }
      
      // Context-aware response
      return language === 'hi'
        ? 'Main samajh nahi paya 🤔 Loan banane ke liye naam boliye, "add loan" type karo, ya "help" boliye.'
        : 'I didn\'t understand 🤔 To create loan, say a name, type "add loan", or say "help".'
    }
    
    // LOAN CREATION FLOW
    if (isCreatingLoan) {
      switch (currentStep) {
        case 'name':
          if (lowerMessage.length > 0 && !lowerMessage.match(/(cancel|stop|exit)/i)) {
            const borrowerName = userMessage.trim()
            const updatedData = { ...loanData, borrowerName }
            setConversationState({
              ...conversationState,
              loanData: updatedData,
              currentStep: 'amount'
            })
            
            return language === 'hi'
              ? `Perfect! 😊 "${borrowerName}" ka naam save ho gaya. Ab loan amount batao (jaise ₹50,000)`
              : `Perfect! 😊 Saved "${borrowerName}". Now tell me the loan amount (like ₹50,000)`
          }
          break
          
        case 'amount':
          const amount = extractAmountFromText(userMessage)
          if (amount) {
            const updatedData = { ...loanData, amount }
            setConversationState({
              ...conversationState,
              loanData: updatedData,
              currentStep: 'rate'
            })
            
            return language === 'hi'
              ? `Great! ₹${amount.toLocaleString()} amount noted ✅\n\nAb interest rate batao:\n- "2% monthly" ya "12% yearly"\n- "sankda" (12% yearly)`
              : `Great! ₹${amount.toLocaleString()} noted ✅\n\nNow interest rate:\n- "2% monthly" or "12% yearly"\n- "sankda" (12% yearly)`
          } else {
            return language === 'hi'
              ? 'Amount clear nahi hai 😅 Numbers me batao jaise:\n- "50000" ya "₹1,00,000"'
              : 'Amount not clear 😅 Tell me in numbers like:\n- "50000" or "₹1,00,000"'
          }
          
        case 'rate':
          const interestInfo = extractInterestRate(userMessage)
          if (interestInfo) {
            const updatedData = { 
              ...loanData, 
              interestRate: interestInfo.rate,
              interestMethod: interestInfo.method 
            }
            setConversationState({
              ...conversationState,
              loanData: updatedData,
              currentStep: 'duration'
            })
            
            return language === 'hi'
              ? `Excellent! ${interestInfo.rate}% ${interestInfo.method} save kar liya ✅\n\nAb duration batao (jaise "2 years")`
              : `Excellent! ${interestInfo.rate}% ${interestInfo.method} saved ✅\n\nNow duration (like "2 years")`
          } else {
            return language === 'hi'
              ? 'Interest rate samajh nahi aaya 😅\n- "12% yearly"\n- "2% monthly"\n- "sankda"'
              : 'Interest rate not clear 😅\n- "12% yearly"\n- "2% monthly"\n- "sankda"'
          }
          
        case 'duration':
          const duration = extractDuration(userMessage) || parseFloat(lowerMessage)
          if (duration && duration > 0) {
            const updatedData = { ...loanData, years: duration }
            
            // Calculate total amount
            let finalAmount = updatedData.amount || 0
            if (updatedData.interestMethod === 'monthly') {
              finalAmount += ((updatedData.amount || 0) * (updatedData.interestRate || 0) * duration * 12) / 100
            } else if (updatedData.interestMethod === 'sankda') {
              finalAmount += ((updatedData.amount || 0) * 12 * duration) / 100
            } else {
              finalAmount += ((updatedData.amount || 0) * (updatedData.interestRate || 0) * duration) / 100
            }
            
            setConversationState({
              ...conversationState,
              loanData: updatedData,
              currentStep: 'confirm'
            })
            
            return language === 'hi'
              ? `Perfect! 🎉 Loan details:\n\n📋 ${updatedData.borrowerName}\n💰 ₹${(updatedData.amount || 0).toLocaleString()}\n📈 ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ ${duration} years\n💵 **Total: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Create करूं? (yes/no)`
              : `Perfect! 🎉 Loan details:\n\n📋 ${updatedData.borrowerName}\n💰 ₹${(updatedData.amount || 0).toLocaleString()}\n📈 ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ ${duration} years\n💵 **Total: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Should I create? (yes/no)`
          } else {
            return language === 'hi'
              ? 'Duration clear nahi hai 😅 Jaise:\n- "2 years" ya "1 year"'
              : 'Duration not clear 😅 Like:\n- "2 years" or "1 year"'
          }
          
        case 'confirm':
          if (lowerMessage.match(/(yes|haan|ha|ok|confirm|create|ठीक)/i)) {
            
            try {
              const newLoan: Loan = {
                id: Date.now().toString(),
                borrowerName: loanData.borrowerName || '',
                borrowerPhone: '',
                notes: '',
                amount: loanData.amount || 0,
                interestRate: loanData.interestMethod === 'sankda' ? 12 : (loanData.interestRate || 0),
                interestMethod: loanData.interestMethod || 'yearly',
                interestType: 'simple',
                years: loanData.years || 1,
                dateCreated: new Date().toISOString(),
                expectedReturnDate: undefined,
                dueDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000 * (loanData.years || 1))).toISOString(),
                totalPaid: 0,
                isActive: true,
              }

              const existingLoans = storage.getLoans()
              storage.saveLoans([...existingLoans, newLoan])
              
              // Reset to conversation mode (stay active)
              setConversationState({
                isCreatingLoan: false,
                isInConversation: true, // Keep conversation active
                loanData: {},
                currentStep: 'name'
              })
              
              return language === 'hi'
                ? `🎉 **Loan Created Successfully!**\n\n✅ ${newLoan.borrowerName} ka loan active\n💰 ₹${newLoan.amount.toLocaleString()}\n📱 Active Loans me check karo!\n\nAur koi loan? Ya "bye" bolkar exit? 😊`
                : `🎉 **Loan Created Successfully!**\n\n✅ ${newLoan.borrowerName}'s loan is active\n💰 ₹${newLoan.amount.toLocaleString()}\n📱 Check in Active Loans!\n\nAnother loan? Or say "bye" to exit? 😊`
                
            } catch (error) {
              setConversationState({
                isCreatingLoan: false,
                isInConversation: true,
                loanData: {},
                currentStep: 'name'
              })
              
              return language === 'hi'
                ? '❌ Error aaya! Try again please.'
                : '❌ Error occurred! Please try again.'
            }
          } else if (lowerMessage.match(/(no|nahi|cancel)/i)) {
            setConversationState({
              isCreatingLoan: false,
              isInConversation: true,
              loanData: {},
              currentStep: 'name'
            })
            
            return language === 'hi'
              ? '❌ Loan cancel kar diya. Koi aur help? 😊'
              : '❌ Loan cancelled. Any other help? 😊'
          } else {
            return language === 'hi'
              ? 'Please "yes" ya "no" me answer do 😊'
              : 'Please answer with "yes" or "no" 😊'
          }
          
        default:
          return ''
      }
    }
    
    return ''
  }

  // Initialize voice support detection and VoiceManager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = VoiceManager.isVoiceSupported()
      setVoiceSupport(support)
      
      const manager = new VoiceManager(language)
      setVoiceManager(manager)
    }
  }, [language])

  // Voice Recognition Handlers
  const startVoiceRecording = async () => {
    if (!voiceManager) return
    
    try {
      setIsListening(true)
      const success = voiceManager.startListening(
        (result: VoiceRecognitionResult) => {
          if (result.isListening && result.transcript) {
            if (showAI) {
              setInputMessage(result.transcript)
            } else if (showSearch) {
              setSearchQuery(result.transcript)
              performSearch(result.transcript)
            }
          }
          
          if (!result.isListening) {
            if (result.transcript) {
              if (showAI) {
                setInputMessage(result.transcript)
              } else if (showSearch) {
                setSearchQuery(result.transcript)
                performSearch(result.transcript)
              }
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

  // Navigation function
  const navigateToLoan = (loanId: string) => {
    setShowSearch(false)
    router.push(`/loans/${loanId}`)
  }

  // Auto-scroll functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
    setShowScrollButton(!isNearBottom && messages.length > 0)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAIThinking])

  useEffect(() => {
    GeminiAI.initialize()
  }, [])

  // MAIN SEND MESSAGE FUNCTION
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

    setTimeout(scrollToBottom, 100)

    try {
      // Try smart conversational AI first
      const smartResponse = generateSmartResponse(message.trim())
      
      let aiResponseText = ''
      
      if (smartResponse) {
        // Use smart conversational response
        aiResponseText = smartResponse
      } else {
        // Fallback to Gemini AI for complex queries
        const controller = new AbortController()
        setAiController(controller)

        const loans = storage.getLoans()
        const enhancedPrompt = `${message.trim()}

Be conversational and friendly like a helpful assistant. Respond in ${language === 'hi' ? 'Hindi with some English (Hinglish)' : 'English'}.`

        const response = await GeminiAI.generateResponse({
          prompt: enhancedPrompt,
          language,
          context: { loans }
        })

        if (controller.signal.aborted) return

        aiResponseText = response.text
        setAiController(null)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponseText,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      setTimeout(scrollToBottom, 200)

    } catch (error: any) {
      if (error.name === 'AbortError') return

      console.error('AI response error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: language === 'hi' 
          ? 'Sorry, samajh nahi aaya. Please try again 🙂'
          : 'Sorry, I couldn\'t understand. Please try again 🙂',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
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
      const searchQuery = query.toLowerCase().trim()
      
      const results = loans.filter(loan => {
        const searchableFields = [
          loan.borrowerName.toLowerCase(),
          loan.amount.toString(),
          loan.interestRate.toString(),
          loan.interestMethod.toLowerCase(),
          loan.borrowerPhone || '',
          loan.notes || '',
        ]
        
        return searchableFields.some(field => {
          if (!field) return false
          return field.includes(searchQuery)
        }) || loan.borrowerName.toLowerCase().split(' ').some(word => 
          word.startsWith(searchQuery)
        )
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
              <p>{language === 'hi' ? 'Smart AI सहायक' : 'Smart AI Assistant'}</p>
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
          {/* Header */}
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
                    {language === 'hi' ? 'Smart AI Assistant' : 'Smart AI Assistant'}
                    {conversationState.isCreatingLoan && (
                      <span className="ml-2 text-sm bg-primary-foreground/20 px-2 py-1 rounded-full">
                        {language === 'hi' ? '📝 Loan बना रहे हैं' : '📝 Creating Loan'}
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/80 text-sm">
                    {conversationState.isInConversation ? 
                      (language === 'hi' ? 'बातचीत में • Smart Mode' : 'In conversation • Smart Mode') :
                      (language === 'hi' ? 'ऑनलाइन • Ready' : 'Online • Ready')
                    }
                  </DialogDescription>
                </div>
              </div>

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

          {/* Chat Messages Area */}
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
                        ? 'Namaste! मैं आपका Smart AI दोस्त हूं 🙂'
                        : 'Hello! I\'m your Smart AI friend 🙂'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'hi' 
                        ? 'Just "hi" bolo और फिर naam boliye loan के लिए 💰'
                        : 'Just say "hi" then tell me a name for loan 💰'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={language === 'hi' 
                    ? 'Message लिखें...'
                    : 'Type a message...'
                  }
                  className="rounded-full border-gray-300 focus:border-primary focus:ring-primary/20 bg-white h-10 text-sm placeholder:text-gray-400 pr-12"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(inputMessage)
                    }
                  }}
                  disabled={isAIThinking}
                />
                
                {/* Voice Button - Always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-1 top-1 h-8 w-8 rounded-full transition-all duration-200 ${
                    isListening 
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse' 
                      : voiceSupport.recognition 
                        ? 'text-gray-500 hover:bg-gray-100'
                        : 'text-red-400 bg-red-50 hover:bg-red-100'
                  }`}
                  onClick={() => {
                    if (!voiceSupport.recognition) {
                      alert('Voice not supported in your browser. Please try Chrome/Edge.')
                      return
                    }
                    
                    if (isListening) {
                      stopVoiceRecording()
                    } else {
                      startVoiceRecording()
                    }
                  }}
                  disabled={isAIThinking}
                  title={
                    !voiceSupport.recognition 
                      ? 'Voice not supported'
                      : isListening 
                        ? (language === 'hi' ? 'रिकॉर्डिंग बंद करें' : 'Stop recording')
                        : (language === 'hi' ? 'वॉइस से बोलें' : 'Speak with voice')
                  }
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  
                  {!voiceSupport.recognition && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center">
                      !
                    </div>
                  )}
                </Button>
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
            </div>
            
            {/* Status Text */}
            {(isListening) && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500 animate-pulse">
                  {isListening && (language === 'hi' ? '🎤 सुन रहा हूं...' : '🎤 Listening...')}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog - Simplified */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="w-[95vw] h-[70vh] max-w-2xl p-0 rounded-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search size={24} />
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {language === 'hi' ? 'स्मार्ट खोज' : 'Smart Search'}
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-sm">
                    {language === 'hi' ? 'वॉइस या टेक्स्ट से खोजें' : 'Search by voice or text'}
                  </DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSearch(false)} className="text-white hover:bg-white/20 rounded-full">
                <X size={20} />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-emerald-50/30 min-h-0">
            <div className="flex-shrink-0 p-6 border-b bg-white/80">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      performSearch(e.target.value)
                    }}
                    placeholder={language === 'hi' ? 'नाम से खोजें...' : 'Search by name...'}
                    className="pr-12 rounded-xl border-2 border-emerald-200 focus:border-emerald-400 bg-white h-12"
                  />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-1 h-10 w-10 rounded-lg transition-all duration-200 ${
                      isListening ? 'text-red-500 animate-pulse bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <ScrollArea className="h-full">
                {searchResults.length === 0 && searchQuery.trim() === '' && (
                  <div className="text-center py-8">
                    <Search size={48} className="mx-auto mb-4 text-emerald-400" />
                    <p className="text-gray-600 mb-2">
                      {language === 'hi' ? 'अपना ऋण खोजना शुरू करें' : 'Start searching for your loans'}
                    </p>
                  </div>
                )}

                {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
                  <div className="text-center py-8">
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                      <MessageCircle size={48} className="mx-auto mb-4 text-yellow-500" />
                      <p className="text-gray-600 mb-2">
                        {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No results found'}
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
                        onClick={() => navigateToLoan(loan.id)}
                        className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">{loan.borrowerName}</h3>
                          <Badge variant={loan.isActive ? "default" : "secondary"} className={loan.isActive ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"}>
                            {loan.isActive ? (language === 'hi' ? 'सक्रिय' : 'Active') : (language === 'hi' ? 'पूर्ण' : 'Completed')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">{language === 'hi' ? 'राशि: ' : 'Amount: '}</span>
                            <span className="font-medium">{formatCurrency(loan.amount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{language === 'hi' ? 'ब्याज: ' : 'Interest: '}</span>
                            <span className="font-medium">{loan.interestRate}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{language === 'hi' ? 'कुल देय: ' : 'Total Due: '}</span>
                            <span className="font-medium">{formatCurrency(finalAmount)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{language === 'hi' ? 'बकाया: ' : 'Outstanding: '}</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(outstanding)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-2 border-t border-emerald-100 text-center">
                          <p className="text-xs text-gray-400 group-hover:text-emerald-500 transition-colors">
                            {language === 'hi' ? 'विवरण देखने के लिए क्लिक करें' : 'Click to view details'}
                          </p>
                        </div>
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

export { AIExperienceSmart }
