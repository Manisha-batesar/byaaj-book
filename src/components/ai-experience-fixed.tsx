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
  isInConversation: boolean  // New flag to track if AI is in conversation mode
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

export default function AIExperience({ className = "" }: { className?: string }) {
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
  
  // Debug: Check if browser supports Web Speech API
  useEffect(() => {
    console.log('Browser Web Speech API support check:')
    console.log('window.SpeechRecognition:', typeof window.SpeechRecognition)
    console.log('window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition)
    console.log('window.speechSynthesis:', typeof window.speechSynthesis)
  }, [])
  
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

  // Helper functions for conversational AI
  const detectLoanIntent = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Direct loan keywords
    const loanKeywords = [
      'loan', 'add loan', 'create loan', 'new loan', 'make loan', 'give loan',
      'lend', 'lending', 'loan create', 'loan add', 'loan dena', 'loan banana',
      'udhar', 'karj', 'udhaar', 'rin', 'paisa dena', 'naya loan', 'loan banao', 
      'loan karna'
    ]
    
    // Check for direct keywords
    const hasDirectKeyword = loanKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    )
    
    // Pattern matching for sentences like "manisha ko loan dena hai" or "give loan to john"
    const loanPatterns = [
      /.*\s+(ko|for|ke liye)\s+(loan|udhar|paisa|money)/,      // "manisha ko loan"
      /(loan|udhar|paisa|money)\s+.+\s+(ko|for|ke liye)/,      // "loan manisha ko"  
      /(.*)\s+(loan|udhar|paisa)\s+(dena|give|add|create)/,    // "manisha loan dena"
      /^(.*)\s*(loan|udhar)$/,                                  // "manisha loan"
      /(dena|give|add|make)\s+.*\s*(loan|udhar)/,              // "dena hai loan"
    ]
    
    const hasLoanPattern = loanPatterns.some(pattern => pattern.test(lowerMessage))
    
    // Simple trigger words but only if they seem intentional
    const simpleTriggers = ['add', 'create', 'new', 'make']
    const hasSimpleTrigger = simpleTriggers.some(trigger => 
      lowerMessage === trigger || lowerMessage.startsWith(trigger + ' ')
    )
    
    return hasDirectKeyword || hasLoanPattern || hasSimpleTrigger
  }

  const extractAmountFromText = (text: string): number | null => {
    // Match various amount formats: ₹50000, 50000, 50,000, fifty thousand, etc.
    const amountPatterns = [
      /₹?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // ₹50,000 or 50,000
      /₹?\s*(\d+)/g, // Simple numbers
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
    
    // Check for sankda first
    if (lowerText.includes('sankda') || lowerText.includes('सांकडा')) {
      return { rate: 12, method: 'sankda' }
    }
    
    // Extract percentage number
    const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%/)
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1])
      
      // Determine method
      const isMonthly = lowerText.includes('month') || lowerText.includes('mahina') || 
                       lowerText.includes('monthly') || lowerText.includes('माहिना')
      const isYearly = lowerText.includes('year') || lowerText.includes('yearly') || 
                      lowerText.includes('sal') || lowerText.includes('साल') ||
                      lowerText.includes('varsh') || lowerText.includes('वर्ष')
      
      if (isMonthly) return { rate, method: 'monthly' }
      if (isYearly) return { rate, method: 'yearly' }
      
      // Default to yearly if no specific method mentioned
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
        // Convert months to years if needed
        if (text.toLowerCase().includes('month') || text.toLowerCase().includes('mahina')) {
          return Math.max(0.1, duration / 12) // Minimum 0.1 years
        }
        return Math.max(0.1, duration) // Minimum 0.1 years
      }
    }
    return null
  }

  const generateConversationalResponse = (userMessage: string): string => {
    const { isCreatingLoan, loanData, currentStep } = conversationState
    const lowerMessage = userMessage.toLowerCase().trim()
    
    if (!isCreatingLoan) {
      // Handle general greetings and responses - MUCH more flexible pattern matching
      const greetingPatterns = [
        /^h+[iy]+$/i,           // hi, hii, hiiii, hy, hyy, hyyy
        /^h+[ae]+[ly]+[oy]*$/i, // hello, helo, hellooo, hally, hey, heyy
        /^h+[eya]+y*$/i,        // hey, heyy, heyyy, hay, hyy
        /^namaste+$/i,          // namaste, namasteee
        /^good\s*(morning|afternoon|evening|night)$/i, // good morning, etc
        /^sup+$/i,              // sup, supp
        /^yo+$/i,               // yo, yoo
        /^what'?s\s*up$/i,      // whats up, what's up
      ]
      
      const isGreeting = greetingPatterns.some(pattern => pattern.test(lowerMessage.trim())) ||
                        lowerMessage.length <= 6 && /^[hiy]+$/i.test(lowerMessage) // catch variations like hyyyy
      
      if (isGreeting) {
        return language === 'hi' 
          ? 'Hii there! 😊 Main aapka AI assistant hun. Kya help chahiye? Loan banane ke liye "add loan" boliye 💰'
          : 'Hii there! 😊 I\'m your AI assistant. How can I help you? Say "add loan" to create a loan 💰'
      }
      
      // Check if user wants to create a loan
      if (detectLoanIntent(userMessage)) {
        setConversationState({
          isCreatingLoan: true,
          isInConversation: true,
          loanData: {},
          currentStep: 'name'
        })
        
        return language === 'hi' 
          ? '🙂 Great! Loan banane ke liye pehle mujhe borrower ka naam batao?'
          : '🙂 Great! To create a loan, first tell me the borrower\'s name?'
      }
      
      // Handle other general queries
      if (lowerMessage.includes('help') || lowerMessage.includes('madad')) {
        return language === 'hi'
          ? 'Main aapki help kar sakta hun! 📋\n\n✅ Loan create karne ke liye: "add loan" boliye\n✅ Calculator use karne ke liye: "calculate interest"\n✅ Loans dekhne ke liye: "show my loans"\n\nKya karna chahte hain? 😊'
          : 'I can help you! 📋\n\n✅ To create a loan: say "add loan"\n✅ To calculate interest: say "calculate interest"\n✅ To view loans: say "show my loans"\n\nWhat would you like to do? 😊'
      }
      
      return '' // Let Gemini AI handle other complex queries
    }
    
    // Handle loan creation flow step by step
    switch (currentStep) {
      case 'name':
        if (lowerMessage.length > 0 && !lowerMessage.match(/(cancel|stop|exit)/i)) {
          const borrowerName = userMessage.trim()
          const updatedData = { ...loanData, borrowerName }
          setConversationState({
            isCreatingLoan: true,
            isInConversation: true,
            loanData: updatedData,
            currentStep: 'amount'
          })
          
          return language === 'hi'
            ? `Perfect! � "${borrowerName}" ka naam save kar liya. Ab loan amount batao (jaise ₹50,000)`
            : `Perfect! � Saved "${borrowerName}" as borrower. Now tell me the loan amount (like ₹50,000)`
        }
        break
        
      case 'amount':
        const amount = extractAmountFromText(userMessage)
        if (amount) {
          const updatedData = { ...loanData, amount }
          setConversationState({
            isCreatingLoan: true,
            isInConversation: true,
            loanData: updatedData,
            currentStep: 'rate'
          })
          
          return language === 'hi'
            ? `Great! ₹${amount.toLocaleString()} amount noted ✅\n\nAb interest rate batao:\n- Monthly ke liye: "2% monthly"\n- Yearly ke liye: "12% yearly"\n- Sankda ke liye: "sankda"`
            : `Great! ₹${amount.toLocaleString()} amount noted ✅\n\nNow tell me the interest rate:\n- For monthly: "2% monthly"\n- For yearly: "12% yearly"\n- For sankda: "sankda"`
        } else {
          return language === 'hi'
            ? 'Amount clear nahi hai 😅 Please number me batao jaise:\n- "50000"\n- "₹1,00,000"\n- "fifty thousand"'
            : 'Amount not clear 😅 Please specify in numbers like:\n- "50000"\n- "₹1,00,000"\n- "fifty thousand"'
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
            isCreatingLoan: true,
            isInConversation: true,
            loanData: updatedData,
            currentStep: 'duration'
          })
          
          return language === 'hi'
            ? `Excellent! ${interestInfo.rate}% ${interestInfo.method} method save kar liya ✅\n\nAb duration batao (jaise "2 years" ya "1 year")`
            : `Excellent! ${interestInfo.rate}% ${interestInfo.method} method saved ✅\n\nNow tell me the duration (like "2 years" or "1 year")`
        } else {
          return language === 'hi'
            ? 'Interest rate samajh nahi aaya 😅 Examples:\n- "12% yearly"\n- "2% monthly"\n- "sankda" (12% yearly fixed)'
            : 'Interest rate not clear 😅 Examples:\n- "12% yearly"\n- "2% monthly"\n- "sankda" (12% yearly fixed)'
        }
        
      case 'duration':
        const duration = extractDuration(userMessage) || parseFloat(lowerMessage)
        if (duration && duration > 0) {
          const updatedData = { ...loanData, years: duration }
          
          // Calculate preview
          const mockLoan = {
            amount: updatedData.amount || 0,
            interestRate: updatedData.interestRate || 0,
            interestMethod: updatedData.interestMethod || 'yearly',
            years: duration
          }
          
          let finalAmount = mockLoan.amount
          if (mockLoan.interestMethod === 'monthly') {
            finalAmount = mockLoan.amount + (mockLoan.amount * mockLoan.interestRate * duration * 12) / 100
          } else if (mockLoan.interestMethod === 'sankda') {
            finalAmount = mockLoan.amount + (mockLoan.amount * 12 * duration) / 100
          } else {
            finalAmount = mockLoan.amount + (mockLoan.amount * mockLoan.interestRate * duration) / 100
          }
          
          setConversationState({
            isCreatingLoan: true,
            isInConversation: true,
            loanData: updatedData,
            currentStep: 'confirm'
          })
          
          return language === 'hi'
            ? `Perfect! 🎉 Loan details ready hai:\n\n📋 **Final Details:**\n👤 Borrower: ${updatedData.borrowerName}\n💰 Amount: ₹${(updatedData.amount || 0).toLocaleString()}\n📈 Interest: ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ Duration: ${duration} years\n💵 **Total Payable: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Confirm करके loan create करूं? (yes/no)`
            : `Perfect! 🎉 Loan details are ready:\n\n📋 **Final Details:**\n👤 Borrower: ${updatedData.borrowerName}\n💰 Amount: ₹${(updatedData.amount || 0).toLocaleString()}\n📈 Interest: ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ Duration: ${duration} years\n💵 **Total Payable: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Should I confirm and create the loan? (yes/no)`
        } else {
          return language === 'hi'
            ? 'Duration clear nahi hai 😅 Examples:\n- "2 years"\n- "1 year"\n- "6 months"'
            : 'Duration not clear 😅 Examples:\n- "2 years"\n- "1 year"\n- "6 months"'
        }
        
      case 'confirm':
        if (lowerMessage.match(/(yes|haan|ha|ok|confirm|create|बनाओ|ठीक)/i)) {
          
          // Create the actual loan
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
            
            // Reset conversation state
            setConversationState({
              isCreatingLoan: false,
              isInConversation: false,
              loanData: {},
              currentStep: 'name'
            })
            
            return language === 'hi'
              ? `🎉 **Loan Successfully Created!**\n\n✅ ${newLoan.borrowerName} ka loan active ho gaya\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest: ${newLoan.interestRate}% ${newLoan.interestMethod}\n⏰ Duration: ${newLoan.years} years\n🆔 Loan ID: ${newLoan.id}\n\n📱 Aap ise "Active Loans" section me dekh sakte hain!\n\nKoi aur loan banani hai? �`
              : `🎉 **Loan Successfully Created!**\n\n✅ ${newLoan.borrowerName}'s loan is now active\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest: ${newLoan.interestRate}% ${newLoan.interestMethod}\n⏰ Duration: ${newLoan.years} years\n🆔 Loan ID: ${newLoan.id}\n\n📱 You can view it in "Active Loans" section!\n\nWant to create another loan? �`
              
          } catch (error) {
            setConversationState({
              isCreatingLoan: false,
              isInConversation: false,
              loanData: {},
              currentStep: 'name'
            })
            
            return language === 'hi'
              ? '❌ Error aaya loan create karne me. Please try again!'
              : '❌ Error creating loan. Please try again!'
          }
        } else if (lowerMessage.match(/(no|nahi|cancel|stop|exit)/i)) {
          setConversationState({
            isCreatingLoan: false,
            isInConversation: false,
            loanData: {},
            currentStep: 'name'
          })
          
          return language === 'hi'
            ? '❌ Loan creation cancel kar diya. Koi aur help chahiye? 😊'
            : '❌ Loan creation cancelled. Need any other help? 😊'
        } else {
          return language === 'hi'
            ? 'Please "yes" ya "no" me jawab do 😊'
            : 'Please answer with "yes" or "no" 😊'
        }
        
      default:
        return ''
    }
    
    return ''
  }

  // Navigation function
  const navigateToLoan = (loanId: string) => {
    setShowSearch(false) // Close search dialog
    router.push(`/loans/${loanId}`)
  }

    // Initialize voice support detection and VoiceManager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('=== VOICE SUPPORT INITIALIZATION ===')
      console.log('Window object available:', typeof window)
      console.log('SpeechRecognition:', typeof window.SpeechRecognition)
      console.log('webkitSpeechRecognition:', typeof window.webkitSpeechRecognition) 
      console.log('speechSynthesis:', typeof window.speechSynthesis)
      
      const support = VoiceManager.isVoiceSupported()
      console.log('VoiceManager.isVoiceSupported() result:', support)
      setVoiceSupport(support)
      
      // Initialize VoiceManager regardless of support for debugging
      try {
        const manager = new VoiceManager(language)
        console.log('VoiceManager instance created:', manager)
        console.log('VoiceManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(manager)))
        setVoiceManager(manager)
      } catch (error) {
        console.error('Failed to create VoiceManager:', error)
      }
    } else {
      console.log('Window is undefined - SSR context')
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
    if (!voiceManager) {
      console.log('VoiceManager not available') // Debug log
      return
    }
    
    console.log('Starting voice recording, showAI:', showAI, 'showSearch:', showSearch) // Debug log
    
    try {
      setIsListening(true)
      const success = voiceManager.startListening(
        (result: VoiceRecognitionResult) => {
          console.log('Voice result:', result) // Debug log
          
          // Handle interim results (while still listening)
          if (result.isListening && result.transcript) {
            console.log('Interim result:', result.transcript) // Debug log
            // Show interim results in input for real-time feedback
            if (showAI) {
              setInputMessage(result.transcript)
            } else if (showSearch) {
              setSearchQuery(result.transcript)
              // Also search immediately on interim results for better UX
              performSearch(result.transcript)
            }
          }
          
          // Handle final result (when recognition ends)
          if (!result.isListening) {
            console.log('Recognition ended, final transcript:', result.transcript) // Debug log
            if (result.transcript) {
              // Voice recognition completed with final transcript
              if (showAI) {
                setInputMessage(result.transcript)
              } else if (showSearch) {
                setSearchQuery(result.transcript)
                console.log('Calling performSearch with final transcript:', result.transcript) // Debug log
                performSearch(result.transcript)
              }
            }
            setIsListening(false)
          }
        },
        (error: string) => {
          console.error('Voice recognition error:', error)
          setIsListening(false)
          // Optionally show error message to user
          // You could add a toast notification here
        }
      )
      
      if (!success) {
        setIsListening(false)
        console.warn('Failed to start voice recognition')
      } else {
        console.log('Voice recognition started successfully') // Debug log
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

    try {
      // First, try conversational AI for loan creation
      const conversationalResponse = generateConversationalResponse(message.trim())
      
      let aiResponseText = ''
      
      if (conversationalResponse) {
        // Use the conversational response
        aiResponseText = conversationalResponse
      } else {
        // Fall back to Gemini AI for complex queries
        
        // Create abort controller for this request
        const controller = new AbortController()
        setAiController(controller)

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
1. Be conversational and friendly, use emojis appropriately
2. If user wants loan calculations, provide exact numbers with proper formatting
3. For search queries, help them find relevant loans
4. Always respond in ${language === 'hi' ? 'Hindi with some English words (Hinglish)' : 'English'} as requested
5. Keep responses concise but informative, like a helpful friend
6. Use casual language and be encouraging

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
          ? 'Sorry, mujhe samajh nahi aaya. Kripya dobara try karo 🙂'
          : 'Sorry, I couldn\'t understand. Please try again 🙂',
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
    console.log('performSearch called with query:', query) // Debug log
    
    if (!query.trim()) {
      console.log('Empty query, clearing results') // Debug log
      setSearchResults([])
      return
    }

    setIsSearching(true)
    
    try {
      const loans = storage.getLoans()
      console.log('Total loans in storage:', loans.length) // Debug log
      console.log('All loans:', loans.map(l => ({ id: l.id, name: l.borrowerName, amount: l.amount }))) // Debug log
      
      const searchQuery = query.toLowerCase().trim()
      console.log('Processed search query:', searchQuery) // Debug log
      
      const results = loans.filter(loan => {
        // Create a comprehensive searchable text including all loan fields
        const searchableFields = [
          loan.borrowerName.toLowerCase(),
          loan.amount.toString(),
          loan.interestRate.toString(),
          loan.interestMethod.toLowerCase(),
          loan.borrowerPhone || '',
          loan.notes || '',
          new Date(loan.dateCreated).toLocaleDateString().toLowerCase(),
          // Add variations for better matching
          loan.borrowerName.toLowerCase().replace(/\s+/g, ''), // Remove spaces
          loan.borrowerName.toLowerCase().split(' ').join(''), // Join without spaces
        ]
        
        console.log(`Checking loan ${loan.borrowerName}, searchable fields:`, searchableFields) // Debug log
        
        // Check if query matches any field using partial matching
        const matches = searchableFields.some(field => {
          if (!field) return false
          // Direct includes check
          if (field.includes(searchQuery)) {
            console.log(`Match found: "${field}" includes "${searchQuery}"`) // Debug log
            return true
          }
          // Check if query words match
          const queryWords = searchQuery.split(' ').filter(word => word.length > 0)
          const wordMatch = queryWords.every(word => field.includes(word))
          if (wordMatch) {
            console.log(`Word match found: "${field}" matches words ${queryWords}`) // Debug log
          }
          return wordMatch
        })
        
        // Also check if any word in borrower name starts with query
        const startsWithMatch = loan.borrowerName.toLowerCase().split(' ').some(word => 
          word.startsWith(searchQuery)
        )
        
        if (startsWithMatch) {
          console.log(`StartsWith match found: borrower name "${loan.borrowerName}" has word starting with "${searchQuery}"`) // Debug log
        }
        
        const finalMatch = matches || startsWithMatch
        console.log(`Final match result for ${loan.borrowerName}:`, finalMatch) // Debug log
        
        return finalMatch
      })

      console.log('Search results found:', results.length) // Debug log
      console.log('Search results:', results.map(r => ({ id: r.id, name: r.borrowerName }))) // Debug log
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
                    {conversationState.isCreatingLoan && (
                      <span className="ml-2 text-sm bg-primary-foreground/20 px-2 py-1 rounded-full">
                        {language === 'hi' ? '📝 Loan बना रहे हैं' : '📝 Creating Loan'}
                      </span>
                    )}
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
                        ? 'Namaste! मैं आपका AI दोस्त हूं 🙂'
                        : 'Hello! I\'m your AI friend 🙂'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'hi' 
                        ? 'Loan banane ke liye बस बोलिए "Manisha को loan देना है" 💰'
                        : 'To create a loan, just say "Add loan for John" 💰'
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
                
                {/* Voice Button - Always show for debugging */}
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
                    console.log('=== AI CHAT VOICE BUTTON CLICKED ===')
                    console.log('Current state - isListening:', isListening)
                    console.log('Voice support detection:', voiceSupport)
                    console.log('VoiceManager instance:', voiceManager)
                    console.log('Window.SpeechRecognition:', typeof window.SpeechRecognition)
                    console.log('Window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition)
                    
                    if (!voiceSupport.recognition) {
                      console.warn('Voice recognition not supported - but attempting anyway')
                      alert('Voice not supported in your browser. Please try Chrome/Edge.')
                      return
                    }
                    
                    if (isListening) {
                      console.log('Stopping voice recording')
                      stopVoiceRecording()
                    } else {
                      console.log('Starting voice recording')
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
                  
                  {/* Debug indicator */}
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
                <p className="text-xs text-gray-500 animate-pulse">
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
                        className={`absolute right-1 top-1 h-10 w-10 rounded-lg transition-all duration-200 ${
                          isListening 
                            ? 'text-red-500 animate-pulse bg-red-50 hover:bg-red-100' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                        title={isListening 
                          ? (language === 'hi' ? 'रिकॉर्डिंग बंद करें' : 'Stop recording')
                          : (language === 'hi' ? 'वॉइस से खोजें' : 'Search with voice')
                        }
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
                          onClick={() => navigateToLoan(loan.id)}
                          className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors">{loan.borrowerName}</h3>
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
                          
                          {/* Click indicator */}
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Named export for compatibility
export { AIExperience }
