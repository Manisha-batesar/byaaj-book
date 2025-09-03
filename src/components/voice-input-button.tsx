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

interface VoiceInputButtonProps {
  className?: string
  currentLoanId?: string
}

export function VoiceInputButton({ className, currentLoanId }: VoiceInputButtonProps) {
  const { language, t } = useLanguage()
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [isGeminiAvailable, setIsGeminiAvailable] = useState(false)
  
  const voiceManagerRef = useRef<VoiceManager | null>(null)
  const voicePrompts = voiceUtils.getVoicePrompts(language)

  useEffect(() => {
    // Initialize voice support check
    const support = voiceUtils.checkSupport()
    console.log('Voice support check:', support) // Debug log
    setVoiceSupport(support)
    
    if (support.recognition || support.synthesis) {
      voiceManagerRef.current = new VoiceManager(language)
    }

    // Check Gemini availability
    setIsGeminiAvailable(GeminiAI.isAvailable()) // This will now always be true
  }, [language])

  useEffect(() => {
    // Update voice manager language when language changes
    if (voiceManagerRef.current) {
      voiceManagerRef.current.updateLanguage(language)
    }
  }, [language])

  const detectLanguage = (text: string): 'en' | 'hi' => {
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/
    return hindiPattern.test(text) ? 'hi' : 'en'
  }

  const startVoiceRecording = async () => {
    if (!voiceSupport.recognition || !voiceManagerRef.current) {
      // Instead of showing error, provide a text input fallback
      setShowResponse(true)
      setTranscript("")
      setResponse("Voice recognition not available. Please type your question in the dialog that will appear.")
      return
    }

    setIsListening(true)
    setError('')
    setTranscript('')
    setResponse('')
    
    const success = voiceManagerRef.current.startListening(
      (result: VoiceRecognitionResult) => {
        if (!result.isListening && result.transcript) {
          // Voice input completed
          setIsListening(false)
          setTranscript(result.transcript)
          handleVoiceInput(result.transcript)
        }
      },
      (error: string) => {
        setIsListening(false)
        setError(error || voicePrompts.tryAgain)
        console.error('Voice recognition error:', error)
      }
    )

    if (!success) {
      setIsListening(false)
      setError(voicePrompts.voiceNotSupported)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopListening()
    }
    setIsListening(false)
  }

  const handleVoiceInput = async (voiceText: string) => {
    if (!voiceText.trim()) return

    setIsProcessing(true)
    setShowResponse(true)

    try {
      // Detect the language of the spoken text
      const detectedLanguage = detectLanguage(voiceText)
      
      // Prepare context for AI
      const loans = storage.getLoans()
      const currentLoan = currentLoanId ? storage.getLoanById(currentLoanId) : undefined
      
      const request: GeminiRequest = {
        prompt: voiceText,
        language: detectedLanguage, // Use detected language for AI response
        context: {
          loans,
          currentLoan: currentLoan || undefined
        }
      }

      // Get AI response
      const aiResponse = await GeminiAI.generateResponse(request)
      
      if (aiResponse.success) {
        setResponse(aiResponse.text)
        
        // Speak the response if synthesis is supported
        if (voiceSupport.synthesis && voiceManagerRef.current) {
          setIsSpeaking(true)
          voiceManagerRef.current.speak(aiResponse.text)
          // Stop speaking indicator after estimated time
          const estimatedTime = Math.max(3000, aiResponse.text.length * 50) // ~50ms per character
          setTimeout(() => setIsSpeaking(false), estimatedTime)
        }
      } else {
        setError(aiResponse.text)
      }

    } catch (error) {
      console.error('Error processing voice input:', error)
      setError(
        language === 'hi'
          ? 'वॉइस प्रोसेसिंग में त्रुटि हुई।'
          : 'Voice processing error occurred.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const stopSpeaking = () => {
    if (voiceManagerRef.current) {
      voiceManagerRef.current.stopSpeaking()
    }
    setIsSpeaking(false)
  }

  const closeDialog = () => {
    setShowResponse(false)
    setTranscript('')
    setResponse('')
    setError('')
    if (isSpeaking) {
      stopSpeaking()
    }
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
              className={`${className} ${
                isListening 
                  ? 'bg-red-100 border-red-300 text-red-600 animate-pulse' 
                  : 'border-green-300 bg-green-50 text-green-600 hover:bg-green-100'
              }`}
              onClick={isListening ? stopVoiceRecording : startVoiceRecording}
              disabled={isProcessing}
            >
              {isListening ? (
                <div className="flex items-center">
                  <MicOff size={20} />
                  <Radio size={12} className="ml-1 animate-bounce" />
                </div>
              ) : (
                <Mic size={20} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isListening 
                ? t("listening")
                : !isVoiceAvailable
                ? (language === 'hi' 
                  ? 'वॉइस सुविधा उपलब्ध नहीं है - HTTPS या अधुनिक ब्राउज़र की आवश्यकता'
                  : 'Voice feature unavailable - requires HTTPS or modern browser'
                )
                : language === 'hi' 
                ? 'वॉइस AI - बोलकर सवाल पूछें' + (GeminiAI.isOnlineMode() ? '' : ' (ऑफलाइन)')
                : 'Voice AI - Ask questions by speaking' + (GeminiAI.isOnlineMode() ? '' : ' (Offline)')
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
                
                {/* Speaking controls */}
                {voiceSupport.synthesis && response && (
                  <div className="flex items-center gap-2">
                    {isSpeaking ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={stopSpeaking}
                        className="text-red-600 hover:text-red-700"
                      >
                        <VolumeX size={16} />
                        <span className="ml-1 text-xs">
                          {language === 'hi' ? 'रोकें' : 'Stop'}
                        </span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600">
                        <Volume2 size={16} />
                        <span className="text-xs">
                          {language === 'hi' ? 'बोल रहा है' : 'Speaking'}
                        </span>
                      </div>
                    )}
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
