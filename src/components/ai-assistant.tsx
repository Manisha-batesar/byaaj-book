"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  MessageSquare,
  Lightbulb,
  Settings,
  Trash2,
  ExternalLink
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { GeminiAI, type GeminiRequest, geminiUtils } from "@/lib/gemini"
import { VoiceManager, voiceUtils, type VoiceRecognitionResult } from "@/lib/voice"
import { AIQuickSetup } from "@/components/ai-quick-setup"

// Helper interfaces for loan creation
interface LoanCreationData {
  borrowerName?: string
  borrowerPhone?: string
  amount?: number
  interestRate?: number
  interestMethod?: "monthly" | "yearly" | "sankda"
  years?: number
  notes?: string
}

// Helper functions for AI-powered loan creation
const detectLoanCreationIntent = (message: string): boolean => {
  const loanKeywords = [
    'add loan', 'create loan', 'new loan', 'लोन जोड़ें', 'नया लोन', 'ऋण जोड़ें',
    'लेंड', 'उधार दें', 'पैसे दें', 'बनाओ लोन', 'loan banao'
  ]
  
  const lowerMessage = message.toLowerCase()
  return loanKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
}

const createLoanCreationPrompt = (message: string, language: string): string => {
  const basePrompt = language === 'hi' ? `
आप एक ऋण प्रबंधन असिस्टेंट हैं। उपयोगकर्ता ने ऋण बनाने का अनुरोध किया है।

उपयोगकर्ता का संदेश: "${message}"

कृपया निम्नलिखित जानकारी एकत्र करें और JSON फॉर्मेट में जवाब दें:
- borrowerName: उधारकर्ता का नाम
- borrowerPhone: फोन नंबर (वैकल्पिक)
- amount: ऋण की राशि (संख्या में)
- interestRate: ब्याज दर (प्रतिशत में)
- interestMethod: "monthly" (मासिक), "yearly" (वार्षिक), या "sankda" (संकड़ा - 12% वार्षिक)
- years: ऋण की अवधि (वर्षों में, डिफ़ॉल्ट 1)
- notes: कोई अतिरिक्त टिप्पणी

अगर कोई जानकारी गुम है, तो उसे पूछें। 
JSON फॉर्मेट: {"loanData": {...}, "response": "आपका जवाब"}
` : `
You are a loan management assistant. The user has requested to create a loan.

User message: "${message}"

Please collect the following information and respond in JSON format:
- borrowerName: Borrower's name
- borrowerPhone: Phone number (optional)
- amount: Loan amount (as number)
- interestRate: Interest rate (as percentage)
- interestMethod: "monthly", "yearly", or "sankda" (sankda = 12% yearly fixed)
- years: Loan duration in years (default 1)
- notes: Any additional notes

If any information is missing, ask for it.
JSON format: {"loanData": {...}, "response": "Your response"}
`

  return basePrompt
}

const extractLoanDataFromResponse = (response: string): LoanCreationData | null => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      // Check if it contains loan data
      if (parsed.loanData && typeof parsed.loanData === 'object') {
        const data = parsed.loanData
        
        // Validate required fields
        if (data.borrowerName && data.amount && data.interestRate) {
          return {
            borrowerName: data.borrowerName,
            borrowerPhone: data.borrowerPhone || '',
            amount: Number(data.amount),
            interestRate: Number(data.interestRate),
            interestMethod: data.interestMethod || 'yearly',
            years: Number(data.years) || 1,
            notes: data.notes || ''
          }
        }
      }
    }
    
    // Enhanced offline loan creation from natural language
    const lowerResponse = response.toLowerCase()
    if (lowerResponse.includes('loan') || lowerResponse.includes('लोन')) {
      return extractLoanFromNaturalLanguage(response)
    }
    
  } catch (error) {
    console.error('Error parsing loan data:', error)
  }
  
  return null
}

// Enhanced function to extract loan data from natural language
const extractLoanFromNaturalLanguage = (text: string): LoanCreationData | null => {
  const lowerText = text.toLowerCase()
  
  // Extract name patterns
  const namePatterns = [
    /(?:for|to)\s+([a-zA-Z\s]+?)(?:,|\s+(?:\d|rupee|रुपए))/i,
    /([a-zA-Z\s]+?)(?:'s|का)\s+loan/i,
    /loan\s+(?:for|to)\s+([a-zA-Z\s]+)/i,
    /([a-zA-Z\s]+)\s+(?:को|के\s+लिए)\s+(?:लोन|loan)/i
  ]
  
  // Extract amount patterns
  const amountPatterns = [
    /(\d+(?:,\d+)*)\s*(?:rupee|रुपए|rs|₹)/i,
    /₹\s*(\d+(?:,\d+)*)/i,
    /(\d+(?:,\d+)*)\s*(?:thousand|हजार)/i,
    /(\d+(?:,\d+)*)\s*k/i
  ]
  
  // Extract interest rate patterns
  const interestPatterns = [
    /(\d+(?:\.\d+)?)\s*%?\s*(?:percent|प्रतिशत|yearly|monthly|सालाना|मासिक)/i,
    /(\d+(?:\.\d+)?)\s*%/i,
    /interest\s+(?:rate\s+)?(\d+(?:\.\d+)?)/i
  ]
  
  // Extract method patterns
  const monthlyPatterns = /monthly|मासिक|per\s+month|महीने/i
  const sankdaPatterns = /sankda|संकड़ा/i
  
  let borrowerName = ''
  let amount = 0
  let interestRate = 0
  let interestMethod: "monthly" | "yearly" | "sankda" = 'yearly'
  
  // Extract borrower name
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      borrowerName = match[1].trim()
      break
    }
  }
  
  // Extract amount
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let amountStr = match[1].replace(/,/g, '')
      amount = parseInt(amountStr)
      
      // Handle thousands
      if (text.toLowerCase().includes('thousand') || text.includes('हजार') || text.includes('k')) {
        amount *= 1000
      }
      break
    }
  }
  
  // Extract interest rate
  for (const pattern of interestPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      interestRate = parseFloat(match[1])
      break
    }
  }
  
  // Determine interest method
  if (sankdaPatterns.test(text)) {
    interestMethod = 'sankda'
    if (interestRate === 0) interestRate = 12 // Default sankda rate
  } else if (monthlyPatterns.test(text)) {
    interestMethod = 'monthly'
  }
  
  // Return loan data if we have minimum required fields
  if (borrowerName && (amount > 0 || interestRate > 0)) {
    return {
      borrowerName,
      amount: amount || 10000, // Default amount if not specified
      interestRate: interestRate || 12, // Default rate if not specified
      interestMethod,
      years: 1,
      borrowerPhone: '',
      notes: 'Created via AI Assistant'
    }
  }
  
  return null
}

const createLoanFromAI = async (loanData: LoanCreationData): Promise<boolean> => {
  try {
    if (!loanData.borrowerName || !loanData.amount || !loanData.interestRate) {
      return false
    }
    
    const newLoan = {
      id: Date.now().toString(),
      borrowerName: loanData.borrowerName,
      borrowerPhone: loanData.borrowerPhone || '',
      notes: loanData.notes || '',
      amount: loanData.amount,
      interestRate: loanData.interestRate,
      interestMethod: loanData.interestMethod || 'yearly',
      interestType: 'simple' as const,
      years: loanData.years || 1,
      dateCreated: new Date().toISOString(),
      dueDate: new Date(Date.now() + (loanData.years || 1) * 365 * 24 * 60 * 60 * 1000).toISOString(),
      totalPaid: 0,
      isActive: true,
    }
    
    const loans = storage.getLoans()
    loans.push(newLoan)
    storage.saveLoans(loans)
    
    return true
  } catch (error) {
    console.error('Error creating loan from AI:', error)
    return false
  }
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isVoice?: boolean
}

interface AIAssistantProps {
  currentLoanId?: string
  className?: string
}

export function AIAssistant({ currentLoanId, className }: AIAssistantProps) {
  const { language, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [isGeminiAvailable, setIsGeminiAvailable] = useState(false)
  
  const voiceManagerRef = useRef<VoiceManager | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const voicePrompts = voiceUtils.getVoicePrompts(language)

  useEffect(() => {
    // Initialize voice support check
    const support = voiceUtils.checkSupport()
    setVoiceSupport(support)
    
    if (support.recognition || support.synthesis) {
      voiceManagerRef.current = new VoiceManager(language)
    }

    // Check Gemini availability
    setIsGeminiAvailable(GeminiAI.isAvailable())

    // Load saved messages from localStorage
    loadSavedMessages()
  }, [language])

  useEffect(() => {
    // Update voice manager language when language changes
    if (voiceManagerRef.current) {
      voiceManagerRef.current.updateLanguage(language)
    }
  }, [language])

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSavedMessages = () => {
    const saved = localStorage.getItem('ai_assistant_messages')
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(parsedMessages)
      } catch (error) {
        console.error('Error loading saved messages:', error)
      }
    }
  }

  const saveMessages = (newMessages: ChatMessage[]) => {
    localStorage.setItem('ai_assistant_messages', JSON.stringify(newMessages))
  }

  const addMessage = (content: string, type: 'user' | 'assistant', isVoice = false) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      isVoice
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    saveMessages(updatedMessages)
    return newMessage
  }

  const clearMessages = () => {
    setMessages([])
    localStorage.removeItem('ai_assistant_messages')
  }

  // Helper function to detect thank you messages (without bye)
  const detectThankYouIntent = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Thank you patterns that don't include bye
    const thankYouPatterns = [
      /^(thank you|thanks|thanku|dhanyawad|shukriya)$/i,
      /^(thank you so much|thanks a lot|bahut dhanyawad)$/i,
      /^(great|awesome|perfect|wonderful|badhiya|mast|zabardast)$/i
    ]
    
    return thankYouPatterns.some(pattern => pattern.test(lowerMessage)) &&
           !detectGoodbyeIntent(message) // Make sure it's not a goodbye
  }

  // Helper function to detect goodbye/exit commands
  const detectGoodbyeIntent = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Comprehensive goodbye patterns
    const goodbyePatterns = [
      // Basic goodbyes
      /^(bye|goodbye|alvida)$/i,
      // Thank you + bye combinations
      /^(thank you|thanks|thanku|dhanyawad|shukriya)\s+(bye|goodbye)$/i,
      /^(bye|goodbye)\s+(thanks|thank you|thanku|dhanyawad)$/i,
      // OK + bye combinations
      /^(ok|okay|oky|okhy|thik|theek)\s+(bye|goodbye)$/i,
      /^(bye|goodbye)\s+(ok|okay|oky|thik|theek)$/i,
      // Common variations
      /^(ok bye|okay bye|oky bye|okhy bye)$/i,
      /^(thank you bye|thanks bye|thanku bye)$/i,
      /^(bye thank you|bye thanks|bye thanku)$/i,
      // Hindi variations
      /^(dhanyawad bye|shukriya bye|theek bye|thik bye)$/i,
      /^(bye dhanyawad|bye shukriya|bye theek)$/i,
      // Single word variations that sound like bye
      /^(byr|bai|bhy|byee|byeee)$/i,
      // Exit commands
      /^(exit|close|quit|band|khatam|gaya|done|finish|over)$/i,
      // Polite closures
      /^(that'?s all|bas|enough|khatam|ho gaya|done hai)$/i
    ]
    
    return goodbyePatterns.some(pattern => pattern.test(lowerMessage))
  }

  const handleSendMessage = async (message: string, isVoice = false) => {
    if (!message.trim() || isLoading) return

    // Check for goodbye intent first
    if (detectGoodbyeIntent(message)) {
      const goodbyeResponse = language === 'hi'
        ? '👋 Bye bye! Dobara help chahiye to yaad karna. Have a great day! 😊'
        : '👋 Goodbye! Feel free to come back anytime you need help. Have a great day! 😊'
      
      addMessage(message, 'user', isVoice)
      addMessage(goodbyeResponse, 'assistant')
      
      // Close the dialog after a short delay
      setTimeout(() => {
        setIsOpen(false)
      }, 2000)
      
      return
    }

    // Check for thank you messages (without goodbye)
    if (detectThankYouIntent(message)) {
      const thankYouResponse = language === 'hi'
        ? '😊 Welcome hai! Khushi mili help karne mein. Aur kuch chahiye? 🤗'
        : '😊 You\'re welcome! Happy to help. Anything else you need? 🤗'
      
      addMessage(message, 'user', isVoice)
      addMessage(thankYouResponse, 'assistant')
      return
    }

    // Add user message
    addMessage(message, 'user', isVoice)
    setInputValue('')
    setIsLoading(true)

    try {
      // Check if this is a loan creation request
      const isLoanCreationRequest = detectLoanCreationIntent(message)
      
      // Prepare context
      const loans = storage.getLoans()
      const currentLoan = currentLoanId ? storage.getLoanById(currentLoanId) : undefined
      
      let prompt = message
      
      // Enhanced prompt for loan creation
      if (isLoanCreationRequest) {
        prompt = createLoanCreationPrompt(message, language)
      }
      
      const request: GeminiRequest = {
        prompt,
        language,
        context: {
          loans,
          currentLoan: currentLoan || undefined
        }
      }

      // Get AI response
      const response = await GeminiAI.generateResponse(request)
      
      if (response.success) {
        let responseText = response.text
        
        // Check if AI response contains loan creation data
        const loanData = extractLoanDataFromResponse(response.text)
        if (loanData) {
          const success = await createLoanFromAI(loanData)
          if (success) {
            responseText += `\n\n${language === 'hi' ? '✅ ऋण सफलतापूर्वक बनाया गया!' : '✅ Loan created successfully!'}`
          }
        }
        
        addMessage(responseText, 'assistant')
        
        // Speak the response if voice is enabled and speaking is supported
        if (isVoice && voiceSupport.synthesis && voiceManagerRef.current) {
          setIsSpeaking(true)
          voiceManagerRef.current.speak(responseText)
          // Note: We can't easily detect when speaking ends with current Web Speech API
          setTimeout(() => setIsSpeaking(false), 5000)
        }
      } else {
        addMessage(response.text, 'assistant')
      }

    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMessage = language === 'hi'
        ? 'क्षमा करें, मैं अभी उत्तर नहीं दे सकता। कृपया बाद में पुनः प्रयास करें।'
        : 'Sorry, I cannot respond right now. Please try again later.'
      
      addMessage(errorMessage, 'assistant')
    } finally {
      setIsLoading(false)
    }
  }

  const startVoiceRecording = () => {
    if (!voiceSupport.recognition || !voiceManagerRef.current) return

    setIsListening(true)
    
    const success = voiceManagerRef.current.startListening(
      (result: VoiceRecognitionResult) => {
        if (!result.isListening) {
          setIsListening(false)
          if (result.transcript) {
            handleSendMessage(result.transcript, true)
          }
        }
      },
      (error: string) => {
        setIsListening(false)
        console.error('Voice recognition error:', error)
        // Show error message briefly
        const errorMessage = error || voicePrompts.tryAgain
        addMessage(errorMessage, 'assistant')
      }
    )

    if (!success) {
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopListening()
    }
    setIsListening(false)
  }

  const toggleSpeaking = () => {
    if (!voiceManagerRef.current) return

    if (isSpeaking) {
      voiceManagerRef.current.stopSpeaking()
      setIsSpeaking(false)
    }
  }

  const getSuggestedPrompts = () => {
    const loans = storage.getLoans()
    const context = {
      hasLoans: loans.length > 0,
      hasActiveLoans: loans.some(loan => loan.isActive)
    }
    return GeminiAI.getSuggestedPrompts(language, context)
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Always show the button, but with different states
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={`${className} border-primary/20 bg-primary/10 text-primary hover:bg-primary/20`}
              >
                <Bot size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {GeminiAI.isOnlineMode() 
                  ? t("aiAssistant") + " (Online)" 
                  : t("aiAssistant") + " (Offline Mode)"
                }
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        {/* Always show normal AI Assistant interface */}
        <>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center space-x-2">
              <Bot size={24} className="text-primary" />
              <span>{t("aiAssistant")}</span>
              {voiceSupport.recognition && (
                <Badge variant="secondary" className="text-xs">
                  {t("voiceEnabled")}
                </Badge>
              )}
              {!GeminiAI.isOnlineMode() && (
                <Badge variant="outline" className="text-xs">
                  Offline Mode
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {GeminiAI.isOnlineMode() 
                ? t("aiInstructions")
                : (language === 'hi' 
                  ? 'AI असिस्टेंट ऑफलाइन मोड में काम कर रहा है। बुनियादी सुविधाएं उपलब्ध हैं।'
                  : 'AI Assistant is working in offline mode. Basic features are available.'
                )
              }
            </DialogDescription>
          </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 p-6 pt-0">
          {/* Chat Messages */}
          <Card className="flex-1 flex flex-col min-h-0 mb-4">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MessageSquare size={18} />
                  <span>{t("chat")}</span>
                </CardTitle>
                <div className="flex space-x-2">
                  {isSpeaking && voiceSupport.synthesis && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={toggleSpeaking}
                      className="text-red-600 hover:text-red-700"
                    >
                      <VolumeX size={16} />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearMessages}
                    disabled={messages.length === 0}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 p-4">
              <ScrollArea className="h-full pr-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot size={48} className="mx-auto mb-4 opacity-50" />
                    <p>{t("aiWelcomeMessage")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            {message.type === 'assistant' && (
                              <Bot size={16} className="mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs opacity-70">
                                  {formatTimestamp(message.timestamp)}
                                </span>
                                {message.isVoice && (
                                  <Mic size={12} className="opacity-70" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                          <div className="flex items-center space-x-2">
                            <Bot size={16} />
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">
                              {t("thinking")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Suggested Prompts */}
          {messages.length === 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Lightbulb size={16} />
                  <span>{t("suggestedQuestions")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {getSuggestedPrompts().slice(0, 4).map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left h-auto p-2 justify-start text-wrap"
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isListening 
                    ? t("listening")
                    : t("typeQuestion")
                }
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(inputValue)
                  }
                }}
                disabled={isLoading || isListening}
                className={isListening ? 'bg-red-50 border-red-200' : ''}
              />
            </div>
            
            {/* Voice Input Button */}
            {voiceSupport.recognition && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                disabled={isLoading}
                className="flex-shrink-0"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
            )}

            {/* Send Button */}
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading || isListening}
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
          
          {/* Voice Instructions */}
          {voiceSupport.recognition && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {voicePrompts.startListening}
            </p>
          )}
            </div>
          </>
      </DialogContent>
    </Dialog>
  )
}
