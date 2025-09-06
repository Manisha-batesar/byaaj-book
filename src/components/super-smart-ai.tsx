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
  mode: 'greeting' | 'loan_creation' | 'general' | 'closed'
  loanData: {
    borrowerName?: string
    amount?: number
    interestRate?: number
    interestMethod?: 'monthly' | 'yearly' | 'sankda'
    years?: number
    borrowerPhone?: string
    notes?: string
  }
  currentStep: 'name' | 'amount' | 'rate' | 'method' | 'duration' | 'confirm' | 'complete'
}

function SuperSmartAIExperience({ 
  className = "",
  onLoanCreated 
}: { 
  className?: string,
  onLoanCreated?: () => void
}) {
  const { language } = useLanguage()
  const router = useRouter()
  
  // Dialog states
  const [showAI, setShowAI] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // AI Chat states
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState>({
    mode: 'greeting',
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

  // Initialize voice support detection and VoiceManager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = VoiceManager.isVoiceSupported()
      setVoiceSupport(support)
      
      try {
        const manager = new VoiceManager(language)
        setVoiceManager(manager)
      } catch (error) {
        console.error('Failed to create VoiceManager:', error)
      }
    }
  }, [language])

  // Smart Conversational AI Functions
  const handleCloseDialog = (message: string) => {
    const lowerMessage = message.toLowerCase().trim()
    if (lowerMessage.match(/(bye|goodbye|exit|close|band kar|khatam|alvida)/i)) {
      setShowAI(false)
      setConversationState({
        mode: 'greeting',
        loanData: {},
        currentStep: 'name'
      })
      return true
    }
    return false
  }

  const detectGreeting = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Specific greeting matches first (exact match)
    const exactGreetings = [
      'hi', 'hii', 'hiiii', 'hello', 'helo', 'helloo', 'hey', 'heyy', 'heyyy',
      'yo', 'yoo', 'sup', 'whatsup', 'namaste', 'namasteee', 'hy', 'hyy', 'hyyy',
      'kese ho', 'kaise ho', 'how are you', 'kya haal hai', 'kya chal raha hai',
      'sab theek', 'all good', 'whats up', 'wassup', 'kaise hain', 'kese hain'
    ]
    
    if (exactGreetings.includes(lowerMessage)) return true
    
    // Check if message starts with greeting + common words (like "hii ai", "hello bot")
    const greetingWithExtras = [
      /^(hi|hii|hiiii|hiii|hello|helo|helloo|hey|heyy|heyyy|yo|yoo|hy|hyy|hyyy)\s+(ai|bot|assistant|there|dear|bro|buddy|friend)$/i,
      /^(hi|hello|hey|namaste)\s+(there|AI)$/i,
      /^(good\s+)?(morning|afternoon|evening|night)\s*(ai|bot|assistant|there|dear)?$/i,
      /^(kese|kaise)\s+(ho|hain)(\s+aap)?$/i,  // "kese ho", "kaise ho", "kaise hain aap"
      /^(how\s+are\s+you|what'?s\s+up|whats\s+up)(\s+(doing|going))?$/i
    ]
    
    if (greetingWithExtras.some(pattern => pattern.test(lowerMessage))) return true
    
    const greetingPatterns = [
      /^h+[iy]+$/i,           // hi, hii, hiiii, hy, hyy, hyyy
      /^h+[ae]+[ly]+[oy]*$/i, // hello, helo, hellooo, hally
      /^h+[eya]+y*$/i,        // hey, heyy, heyyy, hay
      /^namaste+$/i,          // namaste, namasteee
      /^good\s*(morning|afternoon|evening|night)$/i,
      /^sup+$/i, /^yo+$/i, /^what'?s\s*up$/i
    ]
    
    return greetingPatterns.some(pattern => pattern.test(lowerMessage)) ||
           (lowerMessage.length <= 6 && /^[hiy]+$/i.test(lowerMessage))
  }

  const detectLoanIntent = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    const loanKeywords = [
      'loan', 'add loan', 'create loan', 'new loan', 'make loan', 'give loan',
      'lend', 'lending', 'loan create', 'loan add', 'loan dena', 'loan banana',
      'udhar', 'karj', 'udhaar', 'rin', 'paisa dena', 'naya loan', 'loan banao', 
      'loan karna', 'loan jodhna', 'add', 'create', 'new', 'make', 'jodhna'
    ]
    
    const hasDirectKeyword = loanKeywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    )
    
    const loanPatterns = [
      /.*\s+(ko|for|ke liye)\s+(loan|udhar|paisa|money)/,
      /(loan|udhar|paisa|money)\s+.+\s+(ko|for|ke liye)/,
      /(.*)\s+(loan|udhar|paisa)\s+(dena|give|add|create|jodhna)/,
      /^(.*)\s*(loan|udhar)$/,
      /(dena|give|add|make|jodhna)\s+.*\s*(loan|udhar)/,
      // Hindi patterns
      /(mujhe|muje)\s+.*\s*(loan|udhar|paisa)\s+(chahiye|hai|jodhna|banana)/i,
      /(mujhe|muje)\s+(loan|udhar)\s+(chahiye|jodhna|banana)/i,
      /loan\s+(chahiye|jodhna|banana|karna)/i,
    ]
    
    const hasLoanPattern = loanPatterns.some(pattern => pattern.test(lowerMessage))
    
    return hasDirectKeyword || hasLoanPattern
  }

  const detectCasualConversation = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    const casualPhrases = [
      'mujhe ek kaam hai',
      'muje ek kaam hai', 
      'mujhe kaam hai',
      'muje kaam hai',
      'ek kaam hai',
      'kaam hai',
      'i have some work',
      'i need help with something',
      'can you help me',
      'kya aap help kar sakte hain',
      'help kar sakte hain',
      'madad kar sakte hain',
      'ek help chahiye',
      'help chahiye'
    ]
    
    return casualPhrases.some(phrase => lowerMessage.includes(phrase))
  }

  const extractPersonName = (message: string): string | null => {
    const trimmed = message.trim()
    
    // Common patterns where names appear
    const namePatterns = [
      // "name is rahul", "name rahul", "my name is priya"
      /(?:name\s+(?:is\s+)?|naam\s+(?:hai\s+)?|mera\s+naam\s+)([a-zA-Z\s]+)/i,
      
      // "add loan for rahul", "create loan for priya singh"
      /(?:add\s+loan\s+for\s+|create\s+loan\s+for\s+|loan\s+for\s+)([a-zA-Z\s]+)/i,
      
      // "rahul ka loan", "priya singh ka loan"  
      /([a-zA-Z\s]+)\s+(?:ka\s+loan|ke\s+liye\s+loan)/i,
      
      // "loan dena rahul ko", "udhar dena amit ko"
      /(?:loan\s+dena\s+|udhar\s+dena\s+)([a-zA-Z\s]+)\s+ko/i,
      
      // "for rahul", "ke liye priya"
      /(?:for\s+|ke\s+liye\s+)([a-zA-Z\s]+)/i,
      
      // "borrower name rahul", "borrower rahul"
      /(?:borrower\s+(?:name\s+)?|borrower\s+ka\s+naam\s+)([a-zA-Z\s]+)/i,
    ]
    
    // Try to extract name from patterns
    for (const pattern of namePatterns) {
      const match = trimmed.match(pattern)
      if (match && match[1]) {
        let extractedName = match[1].trim()
        
        // Clean up the extracted name
        extractedName = cleanupExtractedName(extractedName)
        
        if (extractedName && extractedName.length > 1) {
          return extractedName
        }
      }
    }
    
    // If no pattern matched, check if the whole message is just a name
    if (detectPersonName(trimmed, { expectingName: true, isInLoanFlow: true })) {
      return cleanupExtractedName(trimmed)
    }
    
    return null
  }

  const cleanupExtractedName = (name: string): string => {
    // Remove common prefixes/suffixes that might get included
    let cleaned = name.trim()
    
    // Remove trailing words that are not part of names
    const trailingWordsToRemove = [
      'name', 'naam', 'hai', 'is', 'ka', 'ke', 'ki', 'ko', 'loan', 'udhar', 
      'for', 'liye', 'dena', 'banana', 'create', 'add', 'make', 'banao'
    ]
    
    const words = cleaned.split(/\s+/)
    let cleanWords = []
    
    for (const word of words) {
      const lowerWord = word.toLowerCase()
      if (!trailingWordsToRemove.includes(lowerWord) && /^[a-zA-Z]+$/.test(word)) {
        cleanWords.push(word)
      }
    }
    
    // Capitalize properly
    const finalName = cleanWords
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    
    return finalName
  }

  const detectPersonName = (message: string, context: { expectingName?: boolean, isInLoanFlow?: boolean } = {}): boolean => {
    const trimmed = message.trim()
    
    // Skip if it's clearly not a name
    if (trimmed.length < 2 || trimmed.length > 50) return false
    
    // First, check if this is actually a greeting to prevent false positives
    if (detectGreeting(trimmed)) return false
    
    // Skip if contains numbers or special characters (except spaces, dots, apostrophes, hyphens)
    if (/[0-9₹%@#$&*()+=\[\]{};:"\\|,.<>?/~`]/.test(trimmed)) return false
    
    // Expanded list of non-names with variations
    const nonNames = [
      'hi', 'hii', 'hiiii', 'hiii', 'hello', 'helo', 'helloo', 'hey', 'heyy', 'yo', 'sup', 'namaste', 
      'ai', 'bot', 'assistant', 'there', 'dear', 'bro', 'buddy', 'friend', // common extras
      'kese', 'ho', 'kaise', 'hain', 'aap', // "kese ho", "kaise ho", "kaise hain aap"
      'how', 'are', 'you', 'doing', 'going', 'up', // "how are you", "whats up"
      'are', 'nhi', 'nahi', 'nahin', 'arre', 'arrey', // casual Hindi expressions
      'kya', 'haal', 'hai', 'chal', 'raha', 'theek', 'sab', 'all', 'good',
      'mujhe', 'muje', 'ek', 'kaam', 'chahiye', 'jodhna', // casual conversation words
      'bye', 'goodbye', 'thanks', 'thank you', 'dhanyawad',
      
      // All negative responses
      'no', 'nope', 'nah', 'nay', 'not', 'nahi', 'nai', 'nahin', 'nahe', 'naa', 'mat', 'mana',
      'cancel', 'stop', 'exit', 'quit', 'abort', 'close', 'end', 'band', 'karo', 'rok', 'chod',
      'refuse', 'reject', 'decline', 'deny', 'never', 'forget', 'skip', 'pass',
      
      // All positive responses  
      'yes', 'yeah', 'yep', 'yup', 'ya', 'aye', 'sure', 'ok', 'okay', 'alright',
      'haan', 'ha', 'han', 'haa', 'ji', 'bilkul', 'theek', 'accha', 'sahi', 'good', 'fine',
      'confirm', 'accept', 'agree', 'approved', 'create', 'make', 'absolutely', 'definitely',
      
      'help', 'madad', 'add', 'new', 'banao', 'banana', 'karna', 'kar', 'do',
      'loan', 'udhar', 'paisa', 'money', 'amount', 'rupee', 'rupees', 'rs',
      'interest', 'rate', 'byaj', 'faida', 'yearly', 'monthly', 'sankda', 'saal', 'mahina',
      'calculate', 'year', 'years', 'month', 'months', 'duration', 'time', 'period', 'samay',
      'what', 'when', 'where', 'how', 'why', 'kya', 'kab', 'kahan', 'kaise', 'kyun',
      'this', 'that', 'these', 'those', 'yeh', 'woh', 'ye', 'wo', 'is', 'are', 'hai', 'hain',
      'the', 'a', 'an', 'and', 'or', 'but', 'aur', 'ya', 'lekin', 'par',
      'clear', 'saaf', 'samjh', 'understand', 'samajh', 'gaya', 'got', 'it'
    ]
    
    const lowerMessage = trimmed.toLowerCase()
    
    // Strict check for exact matches or contains common words
    const isNonName = nonNames.some(word => {
      const lowerWord = word.toLowerCase()
      return lowerMessage === lowerWord || 
             lowerMessage.includes(' ' + lowerWord + ' ') ||
             lowerMessage.startsWith(lowerWord + ' ') ||
             lowerMessage.endsWith(' ' + lowerWord) ||
             (lowerWord.length > 3 && lowerMessage.includes(lowerWord))
    })
    
    if (isNonName) return false
    
    // If we're not expecting a name and not in loan flow, be more strict
    if (!context.expectingName && !context.isInLoanFlow) {
      // Only detect as name if it looks very much like a name
      const words = trimmed.split(/\s+/)
      if (words.length > 3) return false
      
      // Check for common name patterns (capitalized or all lowercase single words)
      const looksLikeName = words.every(word => {
        return /^[a-zA-Z]+$/.test(word) && word.length >= 2 && word.length <= 15
      })
      
      if (!looksLikeName) return false
      
      // Additional check: if it's a single common word that could be a greeting variation
      if (words.length === 1) {
        const singleWord = words[0].toLowerCase()
        const greetingVariations = [
          'helo', 'hii', 'hyy', 'hyyy', 'heyyy', 'heyy', 'sup', 'yo'
        ]
        if (greetingVariations.includes(singleWord)) return false
      }
    }
    
    // Must contain at least one letter and be mostly letters/spaces
    if (!/[a-zA-Z]/.test(trimmed)) return false
    
    // Check if it looks like a name
    const words = trimmed.split(/\s+/)
    if (words.length > 4) return false // Too many words, likely not a name
    
    // All words should be reasonable length for names
    if (words.some(word => word.length < 2 || word.length > 20)) return false
    
    // If expecting name or in loan flow, be more lenient
    if (context.expectingName || context.isInLoanFlow) {
      return /^[a-zA-Z\s]+$/.test(trimmed)
    }
    
    // Otherwise, be more strict - must look like proper name
    return words.every(word => /^[A-Za-z]+$/.test(word)) && words.length <= 3
  }

  const isNegativeResponse = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Comprehensive negative patterns
    const negativePatterns = [
      // Basic No
      'no', 'nope', 'nah', 'nay', 'not',
      
      // Hindi/Indian negatives
      'nahi', 'nai', 'nahin', 'nahe', 'naa', 'mat', 'mana', 'bilkul nahi',
      
      // Rejection words
      'cancel', 'stop', 'exit', 'quit', 'abort', 'close', 'end',
      'band', 'karo', 'band karo', 'rok', 'chod', 'khatam', 'samapti',
      
      // Refusal expressions
      'refuse', 'reject', 'decline', 'deny', 'disagree',
      'manzoor nahi', 'taiyar nahi', 'inkar', 
      
      // Negative phrases
      'i dont want', 'dont want', 'not interested', 'not now',
      'maybe later', 'some other time', 'forget it', 'never mind',
      'nahi chahiye', 'nahi karna', 'abhi nahi', 'baad mein',
      
      // Strong negatives
      'absolutely not', 'definitely not', 'hell no', 'never',
      'kabhi nahi', 'bilkul nahi', 'koi jarurat nahi'
    ]
    
    // Check for exact matches or contains
    const hasNegative = negativePatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase()
      return lowerMessage === lowerPattern || 
             lowerMessage.includes(lowerPattern) ||
             lowerMessage.split(' ').some(word => word === lowerPattern)
    })
    
    // Additional pattern matching for variations
    const negativeRegexPatterns = [
      /^no+$/i,              // no, noo, nooo
      /^nah+$/i,             // nah, nahh, nahhh
      /^nope+$/i,            // nope, nopee
      /^n+o+$/i,             // no variations
      /don'?t\s+want/i,      // don't want, dont want
      /not\s+interested/i,   // not interested
      /maybe\s+later/i,      // maybe later
      /some\s+other\s+time/i,// some other time
      /forget\s+it/i,        // forget it
      /never\s+mind/i,       // never mind
      /^skip$/i,             // skip
      /^pass$/i              // pass
    ]
    
    const hasNegativePattern = negativeRegexPatterns.some(pattern => 
      pattern.test(lowerMessage)
    )
    
    return hasNegative || hasNegativePattern
  }

  const isPositiveResponse = (message: string): boolean => {
    const lowerMessage = message.toLowerCase().trim()
    
    // Comprehensive positive patterns
    const positivePatterns = [
      // Basic Yes
      'yes', 'yeah', 'yep', 'yup', 'ya', 'aye', 'sure', 'ok', 'okay', 'alright',
      
      // Hindi/Indian positives
      'haan', 'ha', 'han', 'haa', 'ji', 'ji haan', 'bilkul', 'theek', 'theek hai',
      'accha', 'sahi', 'good', 'fine', 'perfect', 'correct', 'right',
      
      // Confirmation words
      'confirm', 'accept', 'agree', 'approved', 'go ahead', 'proceed',
      'create', 'make', 'do it', 'kar do', 'banao', 'karo', 'theek',
      
      // Enthusiasm
      'absolutely', 'definitely', 'of course', 'certainly', 'for sure',
      'bilkul theek', 'pura theek', 'ekdum sahi', 'perfect hai',
      
      // Positive phrases
      'sounds good', 'looks good', 'thats fine', 'no problem', 'why not',
      'chalega', 'ho jaaye', 'kar sakte hain', 'theek lagta hai'
    ]
    
    // Check for exact matches or contains
    const hasPositive = positivePatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase()
      return lowerMessage === lowerPattern || 
             lowerMessage.includes(lowerPattern) ||
             lowerMessage.split(' ').some(word => word === lowerPattern)
    })
    
    // Additional pattern matching for variations
    const positiveRegexPatterns = [
      /^y+e+s*$/i,           // yes, yess, yesss, yeees
      /^y+a+h*$/i,           // ya, yah, yahhh
      /^y+e+p+$/i,           // yep, yepp, yeppp
      /^o+k+a*y*$/i,         // ok, okay, okkay
      /^sure+$/i,            // sure, sureee
      /sounds?\s+good/i,     // sounds good, sound good
      /looks?\s+good/i,      // looks good, look good
      /why\s+not/i,          // why not
      /go\s+ahead/i,         // go ahead
      /let'?s\s+do\s+it/i    // let's do it, lets do it
    ]
    
    const hasPositivePattern = positiveRegexPatterns.some(pattern => 
      pattern.test(lowerMessage)
    )
    
    return hasPositive || hasPositivePattern
  }

  const extractAmountFromText = (text: string): number | null => {
    const amountPatterns = [
      // Match amounts like ₹200000, 200000, 2,00,000, etc.
      /₹?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)/g,
      // Match simple numbers like 200000, 50000, etc.
      /(?:^|\s)(\d{2,10})(?:\s|$)/g,
      // Match specific amount keywords
      /(\d+)\s*(?:rs|rupees|rupaiya|₹)/gi,
    ]
    
    let foundAmounts: number[] = []
    
    for (const pattern of amountPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const numberStr = match[1].replace(/[₹,\s]/g, '')
        const amount = parseFloat(numberStr)
        if (!isNaN(amount) && amount > 0 && amount >= 100) { // Minimum loan amount 100
          foundAmounts.push(amount)
        }
      }
    }
    
    // Return the largest valid amount found (most likely to be the loan amount)
    return foundAmounts.length > 0 ? Math.max(...foundAmounts) : null
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

  const generateSmartResponse = (userMessage: string): string => {
    const { mode, loanData, currentStep } = conversationState
    const lowerMessage = userMessage.toLowerCase().trim()
    
    // Handle close dialog requests
    if (handleCloseDialog(userMessage)) {
      return language === 'hi' 
        ? 'Bye bye! 👋 Dobara help chahiye to yaad karna 😊'
        : 'Bye bye! 👋 Feel free to come back anytime 😊'
    }
    
    // Handle based on conversation mode
    switch (mode) {
      case 'greeting':
        if (detectGreeting(userMessage)) {
          setConversationState({
            mode: 'general',
            loanData: {},
            currentStep: 'name'
          })
          return language === 'hi' 
            ? 'Hii there! 😊 Main aapka smart assistant hun. Kya help chahiye?\n\n✅ Loan banane ke liye: "add loan" boliye\n✅ Kuch calculate karne ke liye: "calculate" boliye\n✅ Help ke liye: "help" boliye\n\nKya karna hai? 🤔'
            : 'Hii there! 😊 I\'m your smart assistant. How can I help you?\n\n✅ To create a loan: say "add loan"\n✅ To calculate something: say "calculate"\n✅ For help: say "help"\n\nWhat would you like to do? 🤔'
        }
        
        if (detectLoanIntent(userMessage)) {
          setConversationState({
            mode: 'loan_creation',
            loanData: {},
            currentStep: 'name'
          })
          return language === 'hi' 
            ? '🎯 Perfect! Loan create karte hain. Pehle batao - kis ka naam hai? (borrower name)'
            : '🎯 Perfect! Let\'s create a loan. First tell me - what\'s the borrower\'s name?'
        }
        
        // Handle casual conversation starters
        if (detectCasualConversation(userMessage)) {
          return language === 'hi'
            ? '😊 Haan bilkul! Batao kya kaam hai? Main ye kar sakta hun:\n\n✅ Loan create karna - "add loan" boliye\n✅ Interest calculate karna - "calculate" boliye\n✅ Madad chahiye - "help" boliye\n\nKya karna chahte hain? 🤔'
            : '😊 Sure! What can I help you with? I can:\n\n✅ Create a loan - say "add loan"\n✅ Calculate interest - say "calculate"\n✅ Provide help - say "help"\n\nWhat would you like to do? 🤔'
        }

        // Only detect name if it's very clearly a name (not greeting variations)
        if (detectPersonName(userMessage, { expectingName: false, isInLoanFlow: false })) {
          const borrowerName = userMessage.trim()
          const updatedData = { borrowerName }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'amount'
          })
          
          return language === 'hi'
            ? `🎯 Smart! "${borrowerName}" ka loan banate hain!\n\n✅ Name: ${borrowerName} ✅\n\nAb amount batao? (jaise: 50000 ya ₹1,00,000)`
            : `🎯 Smart! Creating loan for "${borrowerName}"!\n\n✅ Name: ${borrowerName} ✅\n\nNow tell me the amount? (like: 50000 or ₹1,00,000)`
        }

        // Fallback for greeting mode when nothing matches
        return language === 'hi'
          ? '🤔 Samajh nahi aya! Main ye kar sakta hun:\n\n• "add loan" boliye loan banane ke liye\n• "help" boliye madad ke liye\n\nAur kuch try karo! 😊'
          : '🤔 I didn\'t understand that! I can help with:\n\n• Say "add loan" to create a loan\n• Say "help" for assistance\n\nTry something else! 😊'
        
      case 'general':
        // Handle greetings in general mode too
        if (detectGreeting(userMessage)) {
          return language === 'hi' 
            ? 'Hello! 😊 Main aapka smart assistant hun. Kya help chahiye?\n\n✅ Loan banane ke liye: "add loan" boliye\n✅ Kuch calculate karne ke liye: "calculate" boliye\n✅ Help ke liye: "help" boliye\n\nKya karna hai? 🤔'
            : 'Hello! 😊 I\'m your smart assistant. How can I help you?\n\n✅ To create a loan: say "add loan"\n✅ To calculate something: say "calculate"\n✅ For help: say "help"\n\nWhat would you like to do? 🤔'
        }
        
        if (detectLoanIntent(userMessage)) {
          setConversationState({
            mode: 'loan_creation',
            loanData: {},
            currentStep: 'name'
          })
          return language === 'hi' 
            ? '🎯 Chalo loan banate hain! Borrower ka naam batao?'
            : '🎯 Let\'s create a loan! What\'s the borrower\'s name?'
        }
        
        // Handle casual conversation starters in general mode too
        if (detectCasualConversation(userMessage)) {
          return language === 'hi'
            ? '😊 Haan bilkul! Batao kya kaam hai? Main ye kar sakta hun:\n\n✅ Loan create karna - "add loan" boliye\n✅ Interest calculate karna - "calculate" boliye\n✅ Madad chahiye - "help" boliye\n\nKya karna chahte hain? 🤔'
            : '😊 Sure! What can I help you with? I can:\n\n✅ Create a loan - say "add loan"\n✅ Calculate interest - say "calculate"\n✅ Provide help - say "help"\n\nWhat would you like to do? 🤔'
        }

        // Smart name detection - handles phrases like "name rahul", "add loan for priya"
        const extractedName = extractPersonName(userMessage)
        if (extractedName) {
          const updatedData = { borrowerName: extractedName }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'amount'
          })
          
          return language === 'hi'
            ? `🎯 Perfect! "${extractedName}" ka loan create kar rahe hain!\n\n✅ Name: ${extractedName} ✅\n\nAb amount batao?`
            : `🎯 Perfect! Creating loan for "${extractedName}"!\n\n✅ Name: ${extractedName} ✅\n\nNow tell me the amount?`
        }

        // Only detect single name if it looks like a proper name, not a greeting
        if (detectPersonName(userMessage, { expectingName: false, isInLoanFlow: false })) {
          const borrowerName = userMessage.trim()
          const updatedData = { borrowerName }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'amount'
          })
          
          return language === 'hi'
            ? `🎯 Samjh gaya! "${borrowerName}" ka loan create kar rahe hain!\n\n✅ Name: ${borrowerName} ✅\n\nAb amount batao?`
            : `🎯 Got it! Creating loan for "${borrowerName}"!\n\n✅ Name: ${borrowerName} ✅\n\nNow tell me the amount?`
        }

        // Smart amount detection - if user provides amount, start loan creation
        const detectedAmount = extractAmountFromText(userMessage)
        if (detectedAmount) {
          const updatedData = { amount: detectedAmount }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'name'
          })
          
          return language === 'hi'
            ? `🎯 Smart! ₹${detectedAmount.toLocaleString()} ka loan banate hain!\n\n✅ Amount: ₹${detectedAmount.toLocaleString()} ✅\n\nAb borrower ka naam batao?`
            : `🎯 Smart! Creating loan for ₹${detectedAmount.toLocaleString()}!\n\n✅ Amount: ₹${detectedAmount.toLocaleString()} ✅\n\nNow tell me the borrower's name?`
        }
        
        if (lowerMessage.includes('help') || lowerMessage.includes('madad')) {
          return language === 'hi'
            ? 'Main aapki ye help kar sakta hun! 📋\n\n🏦 **Loan Management:**\n• "add loan" - Naya loan banaye\n• "show loans" - Apne loans dekhe\n\n💰 **Calculator:**\n• "calculate interest" - Interest calculate kare\n\n🔍 **Search:**\n• Smart search button use kare\n\n🎤 **Voice:**\n• Mic button se voice me bat kar sakte hain\n\nKya try karna chahte hain? 😊'
            : 'I can help you with these! 📋\n\n🏦 **Loan Management:**\n• "add loan" - Create new loan\n• "show loans" - View your loans\n\n💰 **Calculator:**\n• "calculate interest" - Calculate interest\n\n🔍 **Search:**\n• Use smart search button\n\n🎤 **Voice:**\n• Use mic button for voice chat\n\nWhat would you like to try? 😊'
        }

        // Fallback for general mode when nothing matches
        return language === 'hi'
          ? '🤔 Sorry, samajh nahi aya! Main ye kar sakta hun:\n\n• "add loan" - Loan banane ke liye\n• "help" - Help ke liye\n• "calculate" - Interest calculate karne ke liye\n\nKuch aur try karo! 😊'
          : '🤔 Sorry, I didn\'t understand that! I can help with:\n\n• "add loan" - To create a loan\n• "help" - For assistance\n• "calculate" - To calculate interest\n\nTry something else! 😊'
        
      case 'loan_creation':
        return handleLoanCreationFlow(userMessage, currentStep, loanData)
    }
    
    // Final fallback - should never reach here but just in case
    return language === 'hi'
      ? '🤔 Kuch samajh nahi aya! "help" type karo guidance ke liye 😊'
      : '🤔 I didn\'t understand! Type "help" for guidance 😊'
  }

  const handleLoanCreationFlow = (userMessage: string, currentStep: string, loanData: any): string => {
    const lowerMessage = userMessage.toLowerCase().trim()
    
    // Handle cancellation at any step
    if (lowerMessage.match(/(cancel|stop|exit|nahi|band karo)/i)) {
      setConversationState({
        mode: 'general',
        loanData: {},
        currentStep: 'name'
      })
      return language === 'hi'
        ? '❌ Loan creation cancel kar diya. Koi aur help chahiye? 😊'
        : '❌ Loan creation cancelled. Need any other help? 😊'
    }
    
    switch (currentStep) {
      case 'name':
        // Handle negative responses
        if (isNegativeResponse(userMessage)) {
          setConversationState({
            mode: 'general',
            loanData: {},
            currentStep: 'name'
          })
          return language === 'hi'
            ? '❌ OK, loan creation cancel kar diya. Koi aur help chahiye? 😊'
            : '❌ OK, loan creation cancelled. Need any other help? 😊'
        }

        // Smart name extraction - handles phrases like "name rahul", "my name is priya"
        const extractedName = extractPersonName(userMessage)
        if (extractedName) {
          const updatedData = { ...loanData, borrowerName: extractedName }
          
          // If we already have amount from earlier, go to rate
          if (loanData.amount) {
            setConversationState({
              mode: 'loan_creation',
              loanData: updatedData,
              currentStep: 'rate'
            })
            
            return language === 'hi'
              ? `✅ Perfect combo! "${extractedName}" ka loan for ₹${loanData.amount.toLocaleString()}!\n\n📋 **Details so far:**\n👤 Name: ${extractedName} ✅\n💰 Amount: ₹${loanData.amount.toLocaleString()} ✅\n\nAb interest rate batao:\n• "12% yearly" - Saal me 12%\n• "2% monthly" - Mahine me 2%\n• "sankda" - Traditional method`
              : `✅ Perfect combo! "${extractedName}" loan for ₹${loanData.amount.toLocaleString()}!\n\n📋 **Details so far:**\n👤 Name: ${extractedName} ✅\n💰 Amount: ₹${loanData.amount.toLocaleString()} ✅\n\nNow tell me the interest rate:\n• "12% yearly" - 12% per year\n• "2% monthly" - 2% per month\n• "sankda" - Traditional method`
          } else {
            setConversationState({
              mode: 'loan_creation',
              loanData: updatedData,
              currentStep: 'amount'
            })
            
            return language === 'hi'
              ? `✅ Great! "${extractedName}" ka naam save ho gaya!\n\n📋 **Details so far:**\n👤 Name: ${extractedName} ✅\n\nAb amount kitna dena hai?`
              : `✅ Great! "${extractedName}" name saved!\n\n📋 **Details so far:**\n👤 Name: ${extractedName} ✅\n\nNow, what's the loan amount?`
          }
        }

        // Check if they provided a simple name (context-aware)
        if (detectPersonName(userMessage, { expectingName: true, isInLoanFlow: true })) {
          const borrowerName = userMessage.trim()
          const updatedData = { ...loanData, borrowerName }
          
          // If we already have amount from earlier, go to rate
          if (loanData.amount) {
            setConversationState({
              mode: 'loan_creation',
              loanData: updatedData,
              currentStep: 'rate'
            })
            
            return language === 'hi'
              ? `✅ Perfect combo! "${borrowerName}" ka loan for ₹${loanData.amount.toLocaleString()}!\n\n📋 **Details so far:**\n👤 Name: ${borrowerName} ✅\n💰 Amount: ₹${loanData.amount.toLocaleString()} ✅\n\nAb interest rate batao:\n• "12% yearly" - Saal me 12%\n• "2% monthly" - Mahine me 2%\n• "sankda" - Traditional method`
              : `✅ Perfect combo! "${borrowerName}" loan for ₹${loanData.amount.toLocaleString()}!\n\n📋 **Details so far:**\n👤 Name: ${borrowerName} ✅\n💰 Amount: ₹${loanData.amount.toLocaleString()} ✅\n\nNow tell me the interest rate:\n• "12% yearly" - 12% per year\n• "2% monthly" - 2% per month\n• "sankda" - Traditional method`
          } else {
            // Normal flow - go to amount
            setConversationState({
              mode: 'loan_creation',
              loanData: updatedData,
              currentStep: 'amount'
            })
            
            return language === 'hi'
              ? `✅ Got it! "${borrowerName}" ka naam save kar liya.\n\nAb amount batao? (jaise: 50000 ya ₹1,00,000)`
              : `✅ Got it! Saved "${borrowerName}" as borrower.\n\nNow tell me the amount? (like: 50000 or ₹1,00,000)`
          }
        }

        // Check if they provided amount instead of name
        const amountFromName = extractAmountFromText(userMessage)
        if (amountFromName) {
          const updatedData = { ...loanData, amount: amountFromName }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'name'
          })
          
          return language === 'hi'
            ? `💰 Amount ₹${amountFromName.toLocaleString()} noted! Lekin pehle name chahiye.\n\n✅ Amount: ₹${amountFromName.toLocaleString()} ✅\n\nAb borrower ka naam batao?`
            : `💰 Amount ₹${amountFromName.toLocaleString()} noted! But I need the name first.\n\n✅ Amount: ₹${amountFromName.toLocaleString()} ✅\n\nNow tell me the borrower's name?`
        }

        // If nothing proper detected, ask for name again with clearer guidance
        return language === 'hi'
          ? '🤔 Please borrower ka proper naam batao.\n\nExamples: "Rahul", "Priya Singh", "Amit Kumar"\n\nKis ka naam hai?'
          : '🤔 Please provide the borrower\'s proper name.\n\nExamples: "Rahul", "Priya Singh", "Amit Kumar"\n\nWhat\'s the borrower\'s name?'
        
      case 'amount':
        // Handle negative responses
        if (isNegativeResponse(userMessage)) {
          setConversationState({
            mode: 'general',
            loanData: {},
            currentStep: 'name'
          })
          return language === 'hi'
            ? '❌ OK, loan creation cancel kar diya. Koi aur help chahiye? 😊'
            : '❌ OK, loan creation cancelled. Need any other help? 😊'
        }

        const amount = extractAmountFromText(userMessage)
        if (amount) {
          const updatedData = { ...loanData, amount }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'rate'
          })
          
          return language === 'hi'
            ? `💰 Perfect! ₹${amount.toLocaleString()} amount noted!\n\nAb interest rate batao:\n• "12% yearly" - Saal me 12%\n• "2% monthly" - Mahine me 2%\n• "sankda" - Traditional method (12% yearly)`
            : `💰 Perfect! ₹${amount.toLocaleString()} amount noted!\n\nNow tell me the interest rate:\n• "12% yearly" - 12% per year\n• "2% monthly" - 2% per month\n• "sankda" - Traditional method (12% yearly)`
        }

        // Check if they provided a name instead of amount (maybe they want to change the name)
        if (detectPersonName(userMessage, { expectingName: false, isInLoanFlow: true })) {
          const newBorrowerName = userMessage.trim()
          const updatedData = { ...loanData, borrowerName: newBorrowerName }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'amount'
          })
          
          return language === 'hi'
            ? `✅ Name update kar diya! "${newBorrowerName}" ke liye loan banate hain.\n\nAb amount batao? (jaise: 50000 ya ₹1,00,000)`
            : `✅ Name updated! Creating loan for "${newBorrowerName}".\n\nNow tell me the amount? (like: 50000 or ₹1,00,000)`
        }

        // If amount not detected, show help with clearer guidance
        return language === 'hi'
          ? '🤔 Amount clear nahi hai. Sirf numbers me batao:\n\nExamples:\n• "50000"\n• "₹1,00,000"\n• "25000"\n\nAmount kitna hai?'
          : '🤔 Amount not clear. Please provide just numbers:\n\nExamples:\n• "50000"\n• "₹1,00,000"\n• "25000"\n\nWhat\'s the amount?'
        
      case 'rate':
        const interestInfo = extractInterestRate(userMessage)
        if (interestInfo) {
          const updatedData = { 
            ...loanData, 
            interestRate: interestInfo.rate,
            interestMethod: interestInfo.method 
          }
          setConversationState({
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'duration'
          })
          
          return language === 'hi'
            ? `📈 Excellent! ${interestInfo.rate}% ${interestInfo.method} method set kar diya!\n\nAb loan ki duration batao? (jaise "2 years" ya "1 year")`
            : `📈 Excellent! ${interestInfo.rate}% ${interestInfo.method} method saved!\n\nNow tell me the loan duration? (like "2 years" or "1 year")`
        } else {
          return language === 'hi'
            ? '🤔 Interest rate samajh nahi aaya. Examples:\n• "12% yearly"\n• "2% monthly"\n• "sankda"\n\nFir se try karo?'
            : '🤔 Interest rate not clear. Examples:\n• "12% yearly"\n• "2% monthly"\n• "sankda"\n\nTry again?'
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
            mode: 'loan_creation',
            loanData: updatedData,
            currentStep: 'confirm'
          })
          
          return language === 'hi'
            ? `🎉 **Loan Details Ready!**\n\n📋 **Final Summary:**\n👤 Name: ${updatedData.borrowerName}\n💰 Amount: ₹${(updatedData.amount || 0).toLocaleString()}\n📈 Interest: ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ Duration: ${duration} years\n💵 **Total Payable: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Confirm kar ke create करूं?\n• "yes" - Create karo\n• "no" - Cancel karo`
            : `🎉 **Loan Details Ready!**\n\n📋 **Final Summary:**\n👤 Name: ${updatedData.borrowerName}\n💰 Amount: ₹${(updatedData.amount || 0).toLocaleString()}\n📈 Interest: ${updatedData.interestRate}% ${updatedData.interestMethod}\n⏰ Duration: ${duration} years\n💵 **Total Payable: ₹${Math.round(finalAmount).toLocaleString()}**\n\n✅ Should I create this loan?\n• "yes" - Create it\n• "no" - Cancel`
        } else {
          return language === 'hi'
            ? '🤔 Duration clear nahi hai. Examples:\n• "2 years"\n• "1 year"\n• "6 months"\n\nFir se batao?'
            : '🤔 Duration not clear. Examples:\n• "2 years"\n• "1 year"\n• "6 months"\n\nTry again?'
        }
        
      case 'confirm':
        if (lowerMessage.match(/(yes|haan|ha|ok|confirm|create|बनाओ|ठीक|kar do)/i)) {
          
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
            
            // Trigger dashboard refresh if callback provided
            if (onLoanCreated) {
              console.log('🔄 Triggering dashboard refresh from conversational flow')
              onLoanCreated()
              // Force refresh after small delay to ensure state updates
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('loanCreated', { detail: { loan: newLoan } }))
                }
              }, 100)
            }
            
            // Reset to general mode
            setConversationState({
              mode: 'general',
              loanData: {},
              currentStep: 'name'
            })
            
            return language === 'hi'
              ? `🎉 **LOAN CREATED SUCCESSFULLY!** 🎊\n\n✅ ${newLoan.borrowerName} ka loan active ho gaya!\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest: ${newLoan.interestRate}% ${newLoan.interestMethod}\n⏰ Duration: ${newLoan.years} years\n🆔 Loan ID: ${newLoan.id}\n\n📱 **Active Loans** section me dekh sakte hain!\n\n😊 Koi aur loan banani hai ya kuch aur help chahiye?`
              : `🎉 **LOAN CREATED SUCCESSFULLY!** 🎊\n\n✅ ${newLoan.borrowerName}'s loan is now active!\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest: ${newLoan.interestRate}% ${newLoan.interestMethod}\n⏰ Duration: ${newLoan.years} years\n🆔 Loan ID: ${newLoan.id}\n\n📱 You can view it in **Active Loans** section!\n\n😊 Want to create another loan or need other help?`
              
          } catch (error) {
            setConversationState({
              mode: 'general',
              loanData: {},
              currentStep: 'name'
            })
            
            return language === 'hi'
              ? '❌ Error aaya loan create karne me. Please try again!'
              : '❌ Error creating loan. Please try again!'
          }
        } else if (lowerMessage.match(/(no|nahi|cancel|stop)/i)) {
          setConversationState({
            mode: 'general',
            loanData: {},
            currentStep: 'name'
          })
          
          return language === 'hi'
            ? '❌ Loan creation cancel kar diya.\n\n😊 Koi aur help chahiye?'
            : '❌ Loan creation cancelled.\n\n😊 Need any other help?'
        } else {
          return language === 'hi'
            ? '🤔 Please "yes" ya "no" me jawab do:'
            : '🤔 Please answer with "yes" or "no":'
        }
        
      default:
        return ''
    }
    
    return ''
  }

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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

    setTimeout(scrollToBottom, 100)

    try {
      // First try smart conversational AI
      const smartResponse = generateSmartResponse(message.trim())
      
      let aiResponseText = ''
      
      if (smartResponse) {
        aiResponseText = smartResponse
      } else {
        // Fallback to Gemini AI for complex queries
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

        aiResponseText = response.text
        
        // Check if AI response contains loan creation JSON
        try {
          const jsonMatch = aiResponseText.match(/\{[^}]*"loanData"[^}]*\}/)
          if (jsonMatch) {
            const loanJson = JSON.parse(jsonMatch[0])
            if (loanJson.loanData) {
              // Create loan from AI JSON data
              const loanData = loanJson.loanData
              const newLoan: Loan = {
                id: Date.now().toString(),
                borrowerName: loanData.borrowerName,
                amount: Number(loanData.amount),
                interestRate: Number(loanData.interestRate),
                interestMethod: loanData.interestMethod === 'sankda' ? 'sankda' : 
                             loanData.interestMethod === 'monthly' ? 'monthly' : 'yearly',
                interestType: 'simple',
                years: loanData.years || 1,
                dateCreated: new Date().toISOString(),
                expectedReturnDate: undefined,
                dueDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000 * (loanData.years || 1))).toISOString(),
                totalPaid: 0,
                isActive: true,
                borrowerPhone: loanData.borrowerPhone || '',
                notes: loanData.notes || ''
              }

              const existingLoans = storage.getLoans()
              storage.saveLoans([...existingLoans, newLoan])
              
              // Trigger dashboard refresh
              if (onLoanCreated) {
                console.log('🔄 Triggering dashboard refresh from AI JSON processing')
                onLoanCreated()
                // Force refresh after small delay to ensure state updates
                setTimeout(() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('loanCreated', { detail: { loan: newLoan } }))
                  }
                }, 100)
              }
              
              // Update the response to confirm loan creation
              aiResponseText = loanJson.response || aiResponseText
              aiResponseText += `\n\n🎉 **LOAN CREATED SUCCESSFULLY!**\n\n✅ ${newLoan.borrowerName}'s loan is now active!\n💰 Amount: ₹${newLoan.amount.toLocaleString()}\n📈 Interest: ${newLoan.interestRate}% ${newLoan.interestMethod}\n⏰ Duration: ${newLoan.years} years\n🆔 Loan ID: ${newLoan.id}`
            }
          }
        } catch (jsonError) {
          // If JSON parsing fails, continue with normal response
          console.log('No valid loan JSON found in AI response')
        }
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
      console.error('AI response error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: language === 'hi' 
          ? 'Sorry, kuch technical problem hui. Please dobara try karo 🙂'
          : 'Sorry, there was a technical issue. Please try again 🙂',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      setTimeout(scrollToBottom, 200)
    } finally {
      setIsAIThinking(false)
    }
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
          new Date(loan.dateCreated).toLocaleDateString().toLowerCase(),
          loan.borrowerName.toLowerCase().replace(/\s+/g, ''),
          loan.borrowerName.toLowerCase().split(' ').join(''),
        ]
        
        const matches = searchableFields.some(field => {
          if (!field) return false
          if (field.includes(searchQuery)) return true
          const queryWords = searchQuery.split(' ').filter(word => word.length > 0)
          return queryWords.every(word => field.includes(word))
        })
        
        const startsWithMatch = loan.borrowerName.toLowerCase().split(' ').some(word => 
          word.startsWith(searchQuery)
        )
        
        return matches || startsWithMatch
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

  const navigateToLoan = (loanId: string) => {
    setShowSearch(false)
    router.push(`/loans/${loanId}`)
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
                  <Sparkles size={8} className="absolute -top-1 -right-1 text-orange-500 animate-bounce" />
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
                <X size={20} />
              </Button>
              
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-primary-foreground/20 rounded-full p-2">
                  <Bot size={24} className="text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-lg font-semibold text-primary-foreground">
                    {language === 'hi' ? 'Smart AI Assistant' : 'Smart AI Assistant'}
                    {conversationState.mode === 'loan_creation' && (
                      <span className="ml-2 text-sm bg-primary-foreground/20 px-2 py-1 rounded-full">
                        {language === 'hi' ? '📝 Loan बना रहे हैं' : '📝 Creating Loan'}
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/80 text-sm">
                    {language === 'hi' ? 'Advanced • Context Aware' : 'Advanced • Context Aware'}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Chat Messages Area */}
          <div className="flex-1 bg-gray-50 relative overflow-hidden">
            <div 
              ref={scrollAreaRef}
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
                        ? 'Namaste! 🙏 Main aapka smart AI assistant hun'
                        : 'Namaste! 🙏 I\'m your smart AI assistant'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === 'hi' 
                        ? 'Kuch bhi poochiye! "Hi" kehke start karo 😊'
                        : 'Ask me anything! Say "Hi" to start 😊'
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
                        max-w-[85%] sm:max-w-[75%] 
                        rounded-2xl px-4 py-3 shadow-sm
                        ${message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'ai' && (
                          <div className="bg-primary/10 rounded-full p-1 flex-shrink-0 mt-1">
                            <Bot size={14} className="text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                            {message.content}
                          </p>
                          <p className={`text-xs mt-2 opacity-70`}> 
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isAIThinking && (
                  <div className="flex justify-start w-full">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 rounded-full p-1">
                          <Bot size={14} className="text-primary" />
                        </div>
                        <Loader2 size={16} className="animate-spin text-primary" />
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
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-3 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={language === 'hi' 
                    ? 'Message लिखें या बोलें...'
                    : 'Type or speak a message...'
                  }
                  className="rounded-full border-gray-300 focus:border-primary focus:ring-primary/20 bg-white h-12 text-sm placeholder:text-gray-400 pr-12"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(inputMessage)
                    }
                  }}
                  disabled={isAIThinking}
                />
                
                {/* Voice Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute right-2 top-2 h-8 w-8 rounded-full transition-all duration-200 ${
                    isListening 
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse' 
                      : voiceSupport.recognition 
                        ? 'text-gray-500 hover:bg-gray-100'
                        : 'text-red-400 bg-red-50'
                  }`}
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  disabled={isAIThinking}
                  title={isListening 
                    ? (language === 'hi' ? 'रिकॉर्डिंग बंद करें' : 'Stop recording')
                    : (language === 'hi' ? 'वॉइस से बोलें' : 'Speak with voice')
                  }
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </Button>
              </div>

              {/* Send Button */}
              <Button
                onClick={() => sendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isAIThinking}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-12 w-12 p-0 shadow-sm disabled:opacity-50 transition-all duration-200"
              >
                {isAIThinking ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </Button>
            </div>
            
            {/* Status Text */}
            {isListening && (
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500 animate-pulse">
                  {language === 'hi' ? '🎤 सुन रहा हूं... बोलिए!' : '🎤 Listening... Speak now!'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="w-[100vw] h-[100vh] sm:w-[95vw] sm:h-[70vh] sm:max-w-2xl p-0 rounded-none sm:rounded-2xl">
          <DialogHeader className="p-4 border-b bg-emerald-50">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSearch(false)}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
              <div className="flex items-center gap-2 flex-1">
                <Search size={20} className="text-emerald-600" />
                <DialogTitle className="text-lg font-semibold text-emerald-800">
                  {language === 'hi' ? 'Smart Search' : 'Smart Search'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col">
            {/* Search Input */}
            <div className="p-4 border-b">
              <div className="relative flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    performSearch(e.target.value)
                  }}
                  placeholder={language === 'hi' 
                    ? 'नाम, Amount या Phone search करें...'
                    : 'Search by name, amount, or phone...'
                  }
                  className="flex-1"
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  className={isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'}
                  disabled={!voiceSupport.recognition}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-emerald-600" />
                  <span className="ml-2 text-gray-600">
                    {language === 'hi' ? 'खोज रहे हैं...' : 'Searching...'}
                  </span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 p-4">
                  {searchResults.map((loan) => (
                    <div
                      key={loan.id}
                      onClick={() => navigateToLoan(loan.id)}
                      className="p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {loan.borrowerName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(loan.amount)} • {loan.interestRate}% {loan.interestMethod}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(loan.dateCreated).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={loan.isActive ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {loan.isActive ? 
                            (language === 'hi' ? 'सक्रिय' : 'Active') :
                            (language === 'hi' ? 'पूर्ण' : 'Closed')
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Search size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No results found'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language === 'hi' 
                      ? `"${searchQuery}" के लिए कोई loan नहीं मिला`
                      : `No loans found for "${searchQuery}"`
                    }
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Search size={48} className="text-emerald-200 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {language === 'hi' ? 'Loan खोजें' : 'Search Loans'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language === 'hi' 
                      ? 'नाम, amount या phone number से खोजें'
                      : 'Search by name, amount, or phone number'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SuperSmartAIExperience
