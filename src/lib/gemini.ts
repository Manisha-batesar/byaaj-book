import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { storage, type Loan, type Payment } from './storage'
import { Language } from './language'

// Configuration
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const MODEL_NAME = 'gemini-1.5-flash'

// Types for Gemini AI integration
export interface GeminiRequest {
  prompt: string
  language: Language
  context?: {
    loans?: Loan[]
    payments?: Payment[]
    currentLoan?: Loan
  }
}

export interface GeminiResponse {
  text: string
  success: boolean
  error?: string
}

export interface VoiceRequest {
  audioBlob: Blob
  language: Language
}

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null
let model: GenerativeModel | null = null
let isOnlineMode = false

const initializeGemini = (): boolean => {
  if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
    console.warn('Gemini API key not configured - using offline mode')
    isOnlineMode = false
    return true // Return true to enable offline features
  }

  try {
    genAI = new GoogleGenerativeAI(API_KEY)
    model = genAI.getGenerativeModel({ model: MODEL_NAME })
    isOnlineMode = true
    return true
  } catch (error) {
    console.error('Failed to initialize Gemini AI, falling back to offline mode:', error)
    isOnlineMode = false
    return true // Still return true for offline features
  }
}

// Offline AI responses for common queries
const getOfflineResponse = (prompt: string, language: Language, context?: any): GeminiResponse => {
  const lowerPrompt = prompt.toLowerCase()
  
  // Loan creation detection
  if (lowerPrompt.includes('add loan') || lowerPrompt.includes('create loan') || lowerPrompt.includes('new loan') ||
      lowerPrompt.includes('लोन जोड़') || lowerPrompt.includes('नया लोन')) {
    
    return {
      text: language === 'hi' 
        ? 'मैं आपका ऋण बनाने में मदद कर सकता हूं। कृपया निम्नलिखित जानकारी प्रदान करें:\n\n1. उधारकर्ता का नाम\n2. ऋण राशि (रुपयों में)\n3. ब्याज दर (प्रतिशत में)\n4. ब्याज विधि (मासिक/वार्षिक/संकड़ा)\n5. ऋण अवधि (वर्षों में)\n\nउदाहरण: "राज के लिए 50000 रुपए, 15% वार्षिक, 2 साल"'
        : 'I can help you create a loan. Please provide the following information:\n\n1. Borrower name\n2. Loan amount (in rupees)\n3. Interest rate (percentage)\n4. Interest method (monthly/yearly/sankda)\n5. Loan duration (in years)\n\nExample: "For Raj, 50000 rupees, 15% yearly, 2 years"',
      success: true
    }
  }
  
  // Portfolio analysis
  if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('analyze') || lowerPrompt.includes('summary') ||
      lowerPrompt.includes('पोर्टफोलियो') || lowerPrompt.includes('विश्लेषण')) {
    
    const loans = context?.loans || []
    const totalLent = loans.reduce((sum: number, loan: any) => sum + loan.amount, 0)
    const activeLoans = loans.filter((loan: any) => loan.isActive).length
    const completedLoans = loans.filter((loan: any) => !loan.isActive).length
    
    return {
      text: language === 'hi'
        ? `आपके ऋण पोर्टफोलियो का सारांश:\n\n📊 कुल ऋण: ${loans.length}\n🔄 सक्रिय ऋण: ${activeLoans}\n✅ पूर्ण ऋण: ${completedLoans}\n💰 कुल राशि: ₹${totalLent.toLocaleString()}\n\n${activeLoans > 0 ? '⚠️ सक्रिय ऋणों पर नज़र रखें और समय पर भुगतान का पालन करें।' : '🎉 सभी ऋण पूर्ण हैं!'}`
        : `Your loan portfolio summary:\n\n📊 Total Loans: ${loans.length}\n🔄 Active Loans: ${activeLoans}\n✅ Completed Loans: ${completedLoans}\n💰 Total Amount: ₹${totalLent.toLocaleString()}\n\n${activeLoans > 0 ? '⚠️ Keep track of active loans and follow up on payments.' : '🎉 All loans are completed!'}`,
      success: true
    }
  }
  
  // Interest calculation explanations
  if (lowerPrompt.includes('interest') || lowerPrompt.includes('calculation') || lowerPrompt.includes('sankda') ||
      lowerPrompt.includes('ब्याज') || lowerPrompt.includes('गणना') || lowerPrompt.includes('संकड़ा')) {
    
    return {
      text: language === 'hi'
        ? `ब्याज गणना विधियां:\n\n🔢 **मासिक ब्याज**: मूल राशि × ब्याज दर ÷ 100 (हर महीने)\n📅 **वार्षिक ब्याज**: मूल राशि × ब्याज दर × समय ÷ 100\n⭐ **संकड़ा विधि**: 12% वार्षिक निश्चित दर (1 रुपए पर 1 पैसा प्रति महीने)\n\nउदाहरण: ₹10,000 पर 12% वार्षिक = ₹1,200 ब्याज\nसंकड़ा: ₹10,000 पर = ₹100 प्रति महीने`
        : `Interest Calculation Methods:\n\n🔢 **Monthly Interest**: Principal × Rate ÷ 100 (every month)\n📅 **Yearly Interest**: Principal × Rate × Time ÷ 100\n⭐ **Sankda Method**: 12% yearly fixed rate (1 paisa per rupee per month)\n\nExample: ₹10,000 at 12% yearly = ₹1,200 interest\nSankda: ₹10,000 = ₹100 per month`,
      success: true
    }
  }
  
  // Payment and collection advice
  if (lowerPrompt.includes('payment') || lowerPrompt.includes('collection') || lowerPrompt.includes('follow up') ||
      lowerPrompt.includes('भुगतान') || lowerPrompt.includes('वसूली')) {
    
    return {
      text: language === 'hi'
        ? `भुगतान और वसूली की सलाह:\n\n📞 **नियमित संपर्क**: मासिक रिमाइंडर भेजें\n💬 **विनम्र दृष्टिकोण**: सम्मानजनक भाषा का उपयोग करें\n📝 **रिकॉर्ड रखें**: सभी भुगतान और संपर्क का रिकॉर्ड रखें\n🔄 **आंशिक भुगतान**: छोटी किस्तों को स्वीकार करें\n⚖️ **कानूनी सुरक्षा**: लिखित समझौते करें`
        : `Payment and Collection Advice:\n\n📞 **Regular Contact**: Send monthly reminders\n💬 **Polite Approach**: Use respectful language\n📝 **Keep Records**: Maintain payment and contact records\n🔄 **Partial Payments**: Accept smaller installments\n⚖️ **Legal Protection**: Use written agreements`,
      success: true
    }
  }
  
  // Search help
  if (lowerPrompt.includes('search') || lowerPrompt.includes('find') || lowerPrompt.includes('loan') ||
      lowerPrompt.includes('खोज') || lowerPrompt.includes('ढूंढ')) {
    
    return {
      text: language === 'hi'
        ? `ऋण खोजने के तरीके:\n\n🔍 **नाम से खोजें**: उधारकर्ता का नाम टाइप करें\n💰 **राशि से खोजें**: ऋण राशि डालें (जैसे: 50000)\n📞 **फोन से खोजें**: मोबाइल नंबर का हिस्सा डालें\n📅 **तारीख से खोजें**: महीना/साल डालें\n🎤 **वॉइस खोज**: माइक बटन दबाकर बोलें\n\nउदाहरण: "राज के लोन खोजें" या "50000 के लोन दिखाएं"`
        : `Ways to Search Loans:\n\n🔍 **Search by Name**: Type borrower's name\n💰 **Search by Amount**: Enter loan amount (e.g., 50000)\n📞 **Search by Phone**: Enter part of mobile number\n📅 **Search by Date**: Enter month/year\n🎤 **Voice Search**: Press mic button and speak\n\nExample: "Find John's loans" or "Show 50000 loans"`,
      success: true
    }
  }
  
  // General help
  return {
    text: language === 'hi'
      ? `मैं आपकी ऋण प्रबंधन में मदद कर सकता हूं:\n\n✨ **मुख्य सुविधाएं**:\n• नया ऋण जोड़ना\n• ऋण खोजना और ट्रैक करना\n• ब्याज गणना की जानकारी\n• भुगतान सलाह\n• पोर्टफोलियो विश्लेषण\n\n🎤 वॉइस कमांड का उपयोग करें या सवाल टाइप करें!\n\nकुछ उदाहरण:\n"नया लोन जोड़ें"\n"मेरे लोन दिखाएं"\n"ब्याज कैसे गिनते हैं?"`
      : `I can help you with loan management:\n\n✨ **Key Features**:\n• Add new loans\n• Search and track loans\n• Interest calculation guidance\n• Payment advice\n• Portfolio analysis\n\n🎤 Use voice commands or type your questions!\n\nSome examples:\n"Add new loan"\n"Show my loans"\n"How to calculate interest?"`,
    success: true
  }
}

// System prompts for different languages
const getSystemPrompt = (language: Language): string => {
  const prompts = {
    en: `You are an AI assistant for ByajBook, a loan management app that helps users manage personal money lending and interest calculations. 

Your role is to:
1. Help users understand loan calculations (simple interest, compound interest, monthly interest methods)
2. Provide financial advice about lending money safely
3. Explain interest calculation methods in simple terms
4. Help with loan management decisions
5. Answer questions about borrower management and payment tracking
6. ASSIST WITH CREATING NEW LOANS when users request it
7. HELP WITH SEARCHING AND FINDING LOANS based on voice or text queries

Key features of the app:
- Supports multiple interest calculation methods: Monthly, Yearly (Simple), Sankda (12% yearly)
- Tracks loan payments and borrower information
- Calculates final payable amounts automatically
- Provides payment progress tracking
- Supports both English and Hindi languages
- Voice-enabled search and loan creation

LOAN CREATION INSTRUCTIONS:
When a user wants to create a loan (says "add loan", "create loan", "new loan", etc.), follow this process:
1. Ask for all required information step by step:
   - Borrower name (required)
   - Loan amount (required, in rupees)
   - Interest rate (required, as percentage)
   - Interest method (monthly/yearly/sankda - explain if needed)
   - Loan duration (optional, default 1 year)
   - Borrower phone (optional)
   - Notes (optional)

2. When you have all required info, respond with this EXACT JSON format:
{
  "loanData": {
    "borrowerName": "Name",
    "amount": 10000,
    "interestRate": 12,
    "interestMethod": "yearly",
    "years": 1,
    "borrowerPhone": "1234567890",
    "notes": "Additional notes"
  },
  "response": "I've collected all the information. Creating your loan now..."
}

SEARCH ASSISTANCE:
When users search for loans, help them find relevant matches based on:
- Borrower names (partial matches okay)
- Loan amounts (approximate amounts okay)
- Creation dates (flexible date formats)
- Interest rates or methods
- Loan status (active/completed)

Always respond in a helpful, professional tone. Keep responses concise but informative.`,

    hi: `आप ब्याजबुक के लिए एक AI सहायक हैं, जो एक ऋण प्रबंधन ऐप है जो उपयोगकर्ताओं को व्यक्तिगत पैसे उधार देने और ब्याज गणना का प्रबंधन करने में मदद करता है।

आपकी भूमिका है:
1. उपयोगकर्ताओं को ऋण गणना समझने में मदद करना (साधारण ब्याज, चक्रवृद्धि ब्याज, मासिक ब्याज विधियां)
2. पैसे सुरक्षित रूप से उधार देने के बारे में वित्तीय सलाह प्रदान करना
3. ब्याज गणना विधियों को सरल शब्दों में समझाना
4. ऋण प्रबंधन निर्णयों में सहायता करना
5. उधारकर्ता प्रबंधन और भुगतान ट्रैकिंग के बारे में प्रश्नों का उत्तर देना
6. जब उपयोगकर्ता चाहें तो नए ऋण बनाने में सहायता करना
7. वॉइस या टेक्स्ट के आधार पर ऋण खोजने और ढूंढने में मदद करना

ऐप की मुख्य विशेषताएं:
- कई ब्याज गणना विधियों का समर्थन: मासिक, वार्षिक (साधारण), संकड़ा (12% वार्षिक)
- ऋण भुगतान और उधारकर्ता जानकारी का ट्रैकिंग
- अंतिम देय राशि की स्वचालित गणना
- भुगतान प्रगति ट्रैकिंग प्रदान करता है
- अंग्रेजी और हिंदी दोनों भाषाओं का समर्थन
- वॉइस-सक्षम खोज और ऋण निर्माण

ऋण निर्माण निर्देश:
जब उपयोगकर्ता ऋण बनाना चाहता है ("लोन जोड़ें", "नया लोन", "ऋण बनाएं" आदि कहता है), तो इस प्रक्रिया का पालन करें:
1. चरणबद्ध तरीके से सभी आवश्यक जानकारी पूछें:
   - उधारकर्ता का नाम (आवश्यक)
   - ऋण राशि (आवश्यक, रुपयों में)
   - ब्याज दर (आवश्यक, प्रतिशत में)
   - ब्याज विधि (मासिक/वार्षिक/संकड़ा - जरूरत पड़ने पर समझाएं)
   - ऋण अवधि (वैकल्पिक, डिफ़ॉल्ट 1 वर्ष)
   - उधारकर्ता का फोन (वैकल्पिक)
   - नोट्स (वैकल्पिक)

2. जब आपके पास सभी आवश्यक जानकारी हो, तो इस सटीक JSON फॉर्मेट में जवाब दें:
{
  "loanData": {
    "borrowerName": "नाम",
    "amount": 10000,
    "interestRate": 12,
    "interestMethod": "yearly",
    "years": 1,
    "borrowerPhone": "1234567890",
    "notes": "अतिरिक्त नोट्स"
  },
  "response": "मैंने सभी जानकारी एकत्र कर ली है। अब आपका ऋण बना रहा हूं..."
}

खोज सहायता:
जब उपयोगकर्ता ऋण खोजते हैं, तो उन्हें प्रासंगिक मिलान खोजने में मदद करें:
- उधारकर्ता के नाम (आंशिक मिलान ठीक है)
- ऋण राशि (अनुमानित राशि ठीक है)
- निर्माण तिथियां (लचीले दिनांक प्रारूप)
- ब्याज दरें या विधियां
- ऋण स्थिति (सक्रिय/पूर्ण)

हमेशा सहायक, पेशेवर स्वर में उत्तर दें। उत्तर संक्षिप्त लेकिन जानकारीपूर्ण रखें।`
  }

  return prompts[language]
}

// Create context-aware prompt
const createContextPrompt = (request: GeminiRequest): string => {
  const systemPrompt = getSystemPrompt(request.language)
  let contextInfo = ''

  if (request.context) {
    const { loans, payments, currentLoan } = request.context

    if (currentLoan) {
      const finalAmount = storage.calculateFinalAmount(currentLoan)
      const outstanding = storage.calculateOutstandingAmount(currentLoan)
      
      contextInfo += `\nCurrent loan context:
- Borrower: ${currentLoan.borrowerName}
- Principal Amount: ₹${currentLoan.amount.toLocaleString()}
- Interest Rate: ${currentLoan.interestRate}% (${currentLoan.interestMethod})
- Final Amount: ₹${finalAmount.toLocaleString()}
- Amount Paid: ₹${currentLoan.totalPaid.toLocaleString()}
- Outstanding: ₹${outstanding.toLocaleString()}
- Status: ${currentLoan.isActive ? 'Active' : 'Completed'}`
    }

    if (loans && loans.length > 0) {
      const totalLent = loans.reduce((sum, loan) => sum + loan.amount, 0)
      const totalReceived = loans.reduce((sum, loan) => sum + loan.totalPaid, 0)
      const activeLoans = loans.filter(loan => loan.isActive).length

      contextInfo += `\nPortfolio overview:
- Total loans: ${loans.length}
- Active loans: ${activeLoans}
- Total amount lent: ₹${totalLent.toLocaleString()}
- Total amount received: ₹${totalReceived.toLocaleString()}`
    }
  }

  return `${systemPrompt}${contextInfo}\n\nUser question: ${request.prompt}`
}

// Main Gemini AI utility class
export class GeminiAI {
  private static initialized = false

  static async initialize(): Promise<boolean> {
    if (this.initialized) return true
    
    this.initialized = initializeGemini()
    return this.initialized
  }

  static async generateResponse(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      // Initialize if needed
      if (!this.initialized) {
        const initSuccess = await this.initialize()
        if (!initSuccess) {
          return getOfflineResponse(request.prompt, request.language, request.context)
        }
      }

      // If we're in offline mode, use offline responses
      if (!isOnlineMode) {
        return getOfflineResponse(request.prompt, request.language, request.context)
      }

      if (!model) {
        return getOfflineResponse(request.prompt, request.language, request.context)
      }

      // Create context-aware prompt for online mode
      const fullPrompt = createContextPrompt(request)

      // Generate response using Gemini API
      const result = await model.generateContent(fullPrompt)
      const response = await result.response
      const text = response.text()

      return {
        text: text.trim(),
        success: true
      }

    } catch (error) {
      console.error('Gemini AI error, falling back to offline mode:', error)
      
      // Fallback to offline mode on error
      return getOfflineResponse(request.prompt, request.language, request.context)
    }
  }

  static async processVoiceInput(request: VoiceRequest): Promise<GeminiResponse> {
    try {
      // For voice input, we would need to:
      // 1. Convert audio to text using Web Speech API or similar
      // 2. Process the text with Gemini
      // This is a placeholder for voice functionality
      
      return {
        text: request.language === 'hi'
          ? 'वॉइस सुविधा अभी विकसित की जा रही है।'
          : 'Voice feature is currently under development.',
        success: false,
        error: 'Voice processing not implemented yet'
      }

    } catch (error) {
      console.error('Voice processing error:', error)
      
      return {
        text: request.language === 'hi'
          ? 'वॉइस प्रोसेसिंग में त्रुटि हुई।'
          : 'Voice processing error occurred.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper method to check if Gemini is available (now always true with offline fallback)
  static isAvailable(): boolean {
    return true // Always available with offline features
  }

  // Check if online AI features are available
  static isOnlineMode(): boolean {
    return isOnlineMode && !!API_KEY && API_KEY !== 'your_gemini_api_key_here'
  }

  // Helper method to get suggested prompts based on context
  static getSuggestedPrompts(language: Language, context?: { hasLoans: boolean, hasActiveLoans: boolean }): string[] {
    const suggestions = {
      en: {
        general: [
          "Add a new loan",
          "How do I calculate simple interest?",
          "What's the difference between monthly and yearly interest?",
          "Explain the Sankda interest method",
          "How should I set interest rates for lending?",
          "What are best practices for lending money?"
        ],
        withLoans: [
          "Create a new loan for John",
          "Search for loans by amount",
          "Analyze my loan portfolio",
          "Which loans should I prioritize for collection?",
          "How can I improve my recovery rate?",
          "Should I offer payment plans to borrowers?"
        ],
        withActiveLoans: [
          "Add loan for Raj, 50000 rupees, 15% yearly",
          "Find loans due this month",
          "When should I follow up on overdue payments?",
          "How to handle partial payments?",
          "Should I charge penalty on late payments?",
          "Search for completed loans"
        ]
      },
      hi: {
        general: [
          "नया लोन जोड़ें",
          "साधारण ब्याज की गणना कैसे करें?",
          "मासिक और वार्षिक ब्याज में क्या अंतर है?",
          "संकड़ा ब्याज विधि समझाएं",
          "उधार देने के लिए ब्याज दर कैसे निर्धारित करें?",
          "पैसे उधार देने की सर्वोत्तम प्रथाएं क्या हैं?"
        ],
        withLoans: [
          "जॉन के लिए नया लोन बनाएं",
          "राशि के आधार पर लोन खोजें",
          "मेरे लोन पोर्टफोलियो का विश्लेषण करें",
          "वसूली के लिए कौन से लोन को प्राथमिकता देनी चाहिए?",
          "मैं अपनी वसूली दर कैसे सुधार सकूं?",
          "क्या मुझे उधारकर्ताओं को भुगतान योजना की पेशकश करनी चाहिए?"
        ],
        withActiveLoans: [
          "राज के लिए लोन जोड़ें, 50000 रुपए, 15% सालाना",
          "इस महीने देय लोन खोजें",
          "बकाया भुगतान के लिए कब फॉलो अप करना चाहिए?",
          "आंशिक भुगतान कैसे संभालें?",
          "क्या देरी से भुगतान पर जुर्माना लगाना चाहिए?",
          "पूर्ण हुए लोन खोजें"
        ]
      }
    }

    const langSuggestions = suggestions[language]
    
    if (context?.hasActiveLoans) {
      return langSuggestions.withActiveLoans
    } else if (context?.hasLoans) {
      return langSuggestions.withLoans
    } else {
      return langSuggestions.general
    }
  }
}

// Export utility functions
export const geminiUtils = {
  // Calculate interest explanation in natural language
  explainInterestCalculation: (loan: Loan, language: Language): string => {
    const finalAmount = storage.calculateFinalAmount(loan)
    const interestAmount = finalAmount - loan.amount
    const years = loan.years || 1

    if (language === 'hi') {
      const methodName = loan.interestMethod === 'monthly' ? 'मासिक' 
        : loan.interestMethod === 'yearly' ? 'वार्षिक' : 'संकड़ा'
      
      return `इस ऋण में ${methodName} ब्याज विधि का उपयोग किया गया है। मूल राशि ₹${loan.amount.toLocaleString()} पर ${loan.interestRate}% ब्याज दर से ${years} वर्ष के लिए कुल ब्याज ₹${interestAmount.toLocaleString()} होगा। अंतिम देय राशि ₹${finalAmount.toLocaleString()} है।`
    } else {
      const methodName = loan.interestMethod === 'monthly' ? 'Monthly' 
        : loan.interestMethod === 'yearly' ? 'Yearly' : 'Sankda'
      
      return `This loan uses ${methodName} interest method. Principal amount of ₹${loan.amount.toLocaleString()} at ${loan.interestRate}% interest rate for ${years} year(s) will generate total interest of ₹${interestAmount.toLocaleString()}. Final payable amount is ₹${finalAmount.toLocaleString()}.`
    }
  },

  // Generate financial advice based on portfolio
  generatePortfolioAdvice: async (language: Language): Promise<string> => {
    const loans = storage.getLoans()
    if (loans.length === 0) {
      return language === 'hi' 
        ? 'आपका कोई ऋण रिकॉर्ड नहीं है। पहले कुछ ऋण जोड़ें ताकि मैं आपको सलाह दे सकूं।'
        : 'You have no loan records. Add some loans first so I can provide advice.'
    }

    const prompt = language === 'hi'
      ? 'मेरे ऋण पोर्टफोलियो का विश्लेषण करें और सुधार के लिए सुझाव दें।'
      : 'Analyze my loan portfolio and suggest improvements.'

    const response = await GeminiAI.generateResponse({
      prompt,
      language,
      context: { loans }
    })

    return response.text
  }
}

export default GeminiAI
