"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  Bot,
  Radio
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { GeminiAI, type GeminiRequest } from "@/lib/gemini"
import { VoiceManager, voiceUtils, type VoiceRecognitionResult } from "@/lib/voice"
import { simpleVoiceManager } from "@/lib/simple-voice"
import { simpleVoiceRecognition } from "@/lib/simple-voice-recognition"
import { emergencyVoiceManager } from "@/lib/emergency-voice"

interface VoiceInputButtonProps {
  className?: string
  currentLoanId?: string
}

export function VoiceInputButton({ className, currentLoanId }: VoiceInputButtonProps) {
  const { language, t } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [isGeminiAvailable, setIsGeminiAvailable] = useState(false)
  const [conversationContext, setConversationContext] = useState<string>('') // Add conversation memory
  
  // Remove complex voice manager, use simple direct approach
  const voicePrompts = voiceUtils.getVoicePrompts(language)

  useEffect(() => {
    // Simple voice support check
    const recognition = simpleVoiceRecognition.isSupported()
    const synthesis = simpleVoiceManager.isSupported()
    
    console.log('🎤 Simple voice support:', { recognition, synthesis })
    setVoiceSupport({ recognition, synthesis })

    // Check Gemini availability
    setIsGeminiAvailable(GeminiAI.isAvailable())
  }, [language])

  const detectLanguage = (text: string): 'en' | 'hi' => {
    // Simple language detection based on character patterns and common words
    const hindiPattern = /[\u0900-\u097F]/
    const hindiWords = /\b(mujhe|iss|loan|ki|puri|jankari|do|hai|ke|liye|rupee|paisa|kitna|kya|aur|or)\b/i
    const englishWords = /\b(give|me|all|details|of|this|loan|how|much|what|is|the|amount|outstanding|pending)\b/i
    
    // If contains Devanagari script, definitely Hindi
    if (hindiPattern.test(text)) return 'hi'
    
    // Check for romanized Hindi words
    if (hindiWords.test(text)) return 'hi'
    
    // Check for English words
    if (englishWords.test(text)) return 'en'
    
    // Default to user's current language preference
    return language as 'en' | 'hi'
  }

  const startVoiceRecording = async () => {
    if (!voiceSupport.recognition) {
      setShowResponse(true)
      setTranscript("Voice not supported")
      setResponse(language === 'hi' 
        ? "वॉइस सुविधा उपलब्ध नहीं है। कृपया अपना सवाल टाइप करें।" 
        : "Voice feature not available. Please type your question.")
      return
    }

    // Initialize voices for mobile/cross-browser compatibility
    await emergencyVoiceManager.initializeVoices()

    console.log('🎤 Starting simple voice recording...')
    setIsListening(true)
    setError('')
    setTranscript('')
    setResponse('')
    setShowResponse(true)
    
    // Set language for recognition
    simpleVoiceRecognition.setLanguage(language === 'hi')
    
    let finalResult = ''
    
    // Start listening with simple voice recognition
    const success = simpleVoiceRecognition.startListening(
      (text: string, isFinal: boolean) => {
        console.log('🎤 Voice result:', text, 'Final:', isFinal)
        
        if (text.trim()) {
          setTranscript(text.trim())
          
          if (isFinal) {
            finalResult = text.trim()
            console.log('🎤 Final result received:', finalResult)
            
            // Stop listening and process the result
            setTimeout(() => {
              setIsListening(false)
              if (finalResult.length > 2) {
                handleVoiceInput(finalResult)
              } else {
                setError(language === 'hi' 
                  ? 'बहुत कम शब्द मिले। कृपया पूरा वाक्य बोलें।' 
                  : 'Too few words detected. Please speak a complete sentence.')
              }
            }, 500)
          }
        }
      },
      (error: string) => {
        console.error('🎤 Voice error:', error)
        setIsListening(false)
        setError(error)
      }
    )

    if (!success) {
      console.error('🎤 Failed to start simple voice recognition')
      setIsListening(false)
      setError(language === 'hi' 
        ? 'वॉइस पहचान शुरू नहीं हो सका।' 
        : 'Could not start voice recognition.')
    } else {
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (simpleVoiceRecognition.getCurrentListeningState()) {
          console.log('🕐 Auto-stopping voice recognition after timeout')
          stopVoiceRecording()
          if (finalResult.trim()) {
            handleVoiceInput(finalResult)
          }
        }
      }, 10000)
    }
  }

  const stopVoiceRecording = () => {
    simpleVoiceRecognition.stopListening()
    setIsListening(false)
  }

  const handleVoiceInput = async (voiceText: string) => {
    if (!voiceText.trim()) {
      setError(language === 'hi' ? 'कोई टेक्स्ट नहीं मिला' : 'No text received')
      return
    }

    console.log('🤖 Processing voice input:', voiceText)
    setIsProcessing(true)

    try {
      // Detect the language of the spoken text
      const detectedLanguage = detectLanguage(voiceText)
      console.log('🌍 Detected language:', detectedLanguage)
      
      // Prepare context for AI
      const loans = storage.getLoans()
      const currentLoan = currentLoanId ? storage.getLoanById(currentLoanId) : undefined
      
      console.log('📊 Context:', { loans: loans.length, currentLoan: !!currentLoan })
      
      // For current loan page, provide natural conversational response
      if (currentLoan) {
        const finalAmount = storage.calculateFinalAmount(currentLoan)
        const outstanding = storage.calculateOutstandingAmount(currentLoan)
        const interestAmount = finalAmount - currentLoan.amount
        
        // Check what user is asking about
        const lowerText = voiceText.toLowerCase()
        let response = ''
        
        // Handle follow-up questions like "yes", "हाँ", etc.
        if ((lowerText.includes('yes') || lowerText.includes('हाँ') || lowerText.includes('han') || 
             lowerText.includes('more') || lowerText.includes('और')) && conversationContext) {
          
          // If they want more info after loan details
          if (conversationContext === 'loan_details_provided') {
            response = detectedLanguage === 'hi'
              ? `ठीक है, मैं आपको और जानकारी देता हूँ।

भुगतान का हिसाब:
- कुल ${finalAmount.toLocaleString()} रुपए में से ${currentLoan.totalPaid.toLocaleString()} रुपए मिल चुके हैं
- बाकी ${outstanding.toLocaleString()} रुपए मिलने बाकी हैं
- ${currentLoan.interestMethod === 'monthly' ? `हर महीने ${((currentLoan.amount * currentLoan.interestRate) / 100).toLocaleString()} रुपए ब्याज` : ''}

${currentLoan.borrowerPhone ? `${currentLoan.borrowerName} का नंबर: ${currentLoan.borrowerPhone}` : ''}
${currentLoan.notes ? `नोट्स: ${currentLoan.notes}` : ''}

क्या आप पेमेंट का रिकॉर्ड देखना चाहते हैं?`

              : `Alright, let me give you more information.

Payment breakdown:
- Out of total ${finalAmount.toLocaleString()} rupees, ${currentLoan.totalPaid.toLocaleString()} rupees received
- Remaining ${outstanding.toLocaleString()} rupees to be collected
- ${currentLoan.interestMethod === 'monthly' ? `Monthly interest: ${((currentLoan.amount * currentLoan.interestRate) / 100).toLocaleString()} rupees` : ''}

${currentLoan.borrowerPhone ? `${currentLoan.borrowerName}'s number: ${currentLoan.borrowerPhone}` : ''}
${currentLoan.notes ? `Notes: ${currentLoan.notes}` : ''}

Would you like to see payment history?`
            
            setConversationContext('additional_info_provided')
          } else {
            // Default yes response
            response = detectedLanguage === 'hi'
              ? 'जी हाँ, बताइए आप क्या जानना चाहते हैं?'
              : 'Yes, please tell me what you would like to know?'
          }
        }
        else if (lowerText.includes('detail') || lowerText.includes('information') || lowerText.includes('all') ||
            lowerText.includes('जानकारी') || lowerText.includes('डिटेल') || lowerText.includes('सब') ||
            lowerText.includes('बताओ') || lowerText.includes('बताएं') || lowerText.includes('puri') ||
            lowerText.includes('jankari') || lowerText.includes('complete')) {
          
          // Calculate loan dates
          const loanDate = new Date(currentLoan.dateCreated).toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'long', 
            year: 'numeric'
          })
          const endDate = new Date(currentLoan.dueDate || currentLoan.dateCreated)
          if (!currentLoan.dueDate) {
            endDate.setFullYear(endDate.getFullYear() + (currentLoan.years || 1))
          }
          const lastDate = endDate.toLocaleDateString('hi-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
          
          // Full loan details with proper Hindi
          response = detectedLanguage === 'hi' 
            ? `जी हाँ, मैं आपको पूरी जानकारी देती हूँ।

यह लोन ${currentLoan.borrowerName} के नाम पर है। इसे ${loanDate} को दिया गया था।

मूल राशि: ${currentLoan.amount.toLocaleString()} रुपए दिए गए थे
ब्याज दर: ${currentLoan.interestRate} प्रतिशत ${currentLoan.interestMethod === 'monthly' ? 'हर महीने' : currentLoan.interestMethod === 'yearly' ? 'सालाना' : 'संकड़ा विधि से'}
लोन की अवधि: ${currentLoan.years || 1} ${(currentLoan.years || 1) === 1 ? 'साल' : 'साल'} के लिए दिया गया
अंतिम तारीख: ${lastDate} तक
कुल मिलने वाले पैसे: ${finalAmount.toLocaleString()} रुपए लेने हैं
अब तक मिले: ${currentLoan.totalPaid.toLocaleString()} रुपए
अभी भी बाकी: ${outstanding.toLocaleString()} रुपए

${currentLoan.interestMethod === 'monthly' ? `हर महीने ${((currentLoan.amount * currentLoan.interestRate) / 100).toLocaleString()} रुपए ब्याज मिलता है।` : ''}

${currentLoan.borrowerPhone ? `${currentLoan.borrowerName} का मोबाइल नंबर: ${currentLoan.borrowerPhone}` : ''}
${currentLoan.notes ? `विशेष नोट्स: ${currentLoan.notes}` : ''}

${outstanding > 0 ? `अभी भी ${outstanding.toLocaleString()} रुपए बाकी हैं। यह एक ${currentLoan.isActive ? 'चालू' : 'बंद'} लोन है।` : 'सारे पैसे मिल गए हैं। लोन पूरा हो गया है।'}

क्या आप कुछ और जानना चाहते हैं?`
            
            : `Yes, let me give you complete information.

This loan is under ${currentLoan.borrowerName}'s name. It was given on ${new Date(currentLoan.dateCreated).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}.

Principal Amount: ${currentLoan.amount.toLocaleString()} rupees was given
Interest Rate: ${currentLoan.interestRate} percent ${currentLoan.interestMethod}
Loan Duration: Given for ${currentLoan.years || 1} ${(currentLoan.years || 1) === 1 ? 'year' : 'years'}
Last Date: Until ${lastDate}
Total Amount to Receive: ${finalAmount.toLocaleString()} rupees
Amount Received So Far: ${currentLoan.totalPaid.toLocaleString()} rupees
Still Pending: ${outstanding.toLocaleString()} rupees

${currentLoan.interestMethod === 'monthly' ? `Monthly interest earning: ${((currentLoan.amount * currentLoan.interestRate) / 100).toLocaleString()} rupees per month.` : ''}

${currentLoan.borrowerPhone ? `${currentLoan.borrowerName}'s mobile number: ${currentLoan.borrowerPhone}` : ''}
${currentLoan.notes ? `Special notes: ${currentLoan.notes}` : ''}

${outstanding > 0 ? `Still ${outstanding.toLocaleString()} rupees are pending. This is an ${currentLoan.isActive ? 'active' : 'closed'} loan.` : 'All money has been received. Loan is completed.'}

Would you like to know anything else?`
        
          // Set conversation context for follow-up questions
          setConversationContext('loan_details_provided')
        
        } else if (lowerText.includes('outstanding') || lowerText.includes('pending') || lowerText.includes('remaining') ||
                   lowerText.includes('बकाया') || lowerText.includes('बचा') || lowerText.includes('शेष')) {
          
          // Outstanding amount
          response = detectedLanguage === 'hi'
            ? `${currentLoan.borrowerName} के लोन की बकाया राशि ${outstanding.toLocaleString()} रुपए है। कुल ${finalAmount.toLocaleString()} रुपए में से ${currentLoan.totalPaid.toLocaleString()} रुपए का भुगतान हो चुका है।`
            : `The outstanding amount for ${currentLoan.borrowerName}'s loan is ₹${outstanding.toLocaleString()}. Out of total ₹${finalAmount.toLocaleString()}, ₹${currentLoan.totalPaid.toLocaleString()} has been paid.`
          
          setConversationContext('outstanding_provided')
        
        } else if (lowerText.includes('interest') || lowerText.includes('ब्याज')) {
          
          // Interest details
          response = detectedLanguage === 'hi'
            ? `इस लोन पर ${currentLoan.interestRate} प्रतिशत ${currentLoan.interestMethod === 'monthly' ? 'मासिक' : 'सालाना'} ब्याज है। कुल ब्याज ${interestAmount.toLocaleString()} रुपए है।`
            : `This loan has ${currentLoan.interestRate}% ${currentLoan.interestMethod} interest. Total interest amount is ₹${interestAmount.toLocaleString()}.`
        
          setConversationContext('interest_provided')
        
        } else {
          
          // General response for unclear queries
          response = detectedLanguage === 'hi'
            ? `यह ${currentLoan.borrowerName} का लोन है। बकाया राशि ${outstanding.toLocaleString()} रुपए है। क्या आप इसकी और जानकारी चाहते हैं?`
            : `This is ${currentLoan.borrowerName}'s loan. Outstanding amount is ₹${outstanding.toLocaleString()}. Would you like more details?`
          
          setConversationContext('general_info_provided')
        }
        
        setResponse(response)
        
        // Automatically speak the response
        if (response.trim()) {
          console.log('🔊 Auto speaking response:', response.substring(0, 100))
          emergencyVoiceManager.autoSpeak(response)
        }
        
      } else {
        // No current loan context - use general AI
        const request: GeminiRequest = {
          prompt: voiceText,
          language: detectedLanguage,
          context: { loans }
        }

        const aiResponse = await GeminiAI.generateResponse(request)
        console.log('🤖 AI Response:', aiResponse)
        
        if (aiResponse.success) {
          setResponse(aiResponse.text)
          
          // Automatically speak the response
          if (aiResponse.text.trim()) {
            console.log('🔊 Auto speaking AI response:', aiResponse.text.substring(0, 100))
            emergencyVoiceManager.autoSpeak(aiResponse.text)
          }
        } else {
          console.error('🤖 AI Response error:', aiResponse.text)
          setError(aiResponse.text)
        }
      }

    } catch (error) {
      console.error('❌ Error processing voice input:', error)
      setError(
        language === 'hi'
          ? 'वॉइस प्रोसेसिंग में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Voice processing error occurred. Please try again.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const closeDialog = () => {
    setShowResponse(false)
    setTranscript('')
    setResponse('')
    setError('')
    setConversationContext('') // Clear conversation memory when closing
    speechSynthesis.cancel() // Stop any ongoing speech
  }

  // Always show the button, with different states based on capabilities
  const isVoiceAvailable = voiceSupport.recognition
  const isButtonEnabled = true // Always enable the button
  
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`relative ${className || ''} ${
                isListening 
                  ? 'bg-red-100 border-red-300 text-red-600 animate-pulse' 
                  : 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
              }`}
              onClick={isListening ? stopVoiceRecording : startVoiceRecording}
              disabled={isProcessing}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isListening ? (
                <div className="flex items-center">
                  <MicOff size={20} />
                  <Radio size={12} className="ml-1 animate-bounce" />
                </div>
              ) : (
                <Mic size={20} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p className="text-sm">
              {isListening 
                ? (language === 'hi' ? 'सुन रहे हैं...' : 'Listening...')
                : !isVoiceAvailable
                ? (language === 'hi' 
                  ? 'वॉइस सुविधा उपलब्ध नहीं है'
                  : 'Voice feature unavailable'
                )
                : language === 'hi' 
                ? 'वॉइस AI - बोलकर सवाल पूछें'
                : 'Voice AI - Ask questions by speaking'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Response Dialog */}
      <Dialog open={showResponse} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot size={24} className="text-primary" />
              {language === 'hi' ? 'वॉइस AI रिस्पॉन्स' : 'Voice AI Response'}
              {voiceSupport.synthesis && (
                <Badge variant="secondary" className="text-xs">
                  {language === 'hi' ? 'आवाज़ सक्षम' : 'Voice Enabled'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {language === 'hi' 
                ? 'आपके वॉइस इनपुट का AI रिस्पॉन्स'
                : 'AI response to your voice input'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What you said */}
            {transcript && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mic size={16} className="text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {language === 'hi' ? 'आपने कहा:' : 'You said:'}
                  </span>
                </div>
                <p className="text-sm">{transcript}</p>
              </div>
            )}

            {/* AI Response */}
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-primary" />
                  <span className="font-medium text-sm">
                    {language === 'hi' ? 'AI का जवाब:' : 'AI Response:'}
                  </span>
                </div>
                
                {/* Simple speech controls */}
                {voiceSupport.synthesis && response && (
                  <div className="flex items-center gap-2">
                    {/* Stop Voice Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('� Stopping voice...')
                        speechSynthesis.cancel()
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <VolumeX size={16} />
                      <span className="ml-1 text-xs">
                        {language === 'hi' ? 'रोकें' : 'Stop'}
                      </span>
                    </Button>
                    
                    {/* Start Voice Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('🔊 Starting voice...')
                        if (response.trim()) {
                          emergencyVoiceManager.autoSpeak(response)
                        }
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Volume2 size={16} />
                      <span className="ml-1 text-xs">
                        {language === 'hi' ? 'शुरू करें' : 'Start'}
                      </span>
                    </Button>
                  </div>
                )}
              </div>

              {isProcessing ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">
                    {language === 'hi' ? 'AI सोच रहा है...' : 'AI is thinking...'}
                  </span>
                </div>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : response ? (
                <p className="text-sm whitespace-pre-wrap">{response}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {language === 'hi' ? 'रिस्पॉन्स का इंतज़ार...' : 'Waiting for response...'}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {language === 'hi' 
                  ? 'फिर से पूछने के लिए वॉइस बटन दबाएं'
                  : 'Press the voice button again to ask another question'
                }
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
