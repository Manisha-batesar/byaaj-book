// Voice utilities for speech recognition and text-to-speech
import { Language } from './language'

// Declare global interfaces for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  serviceURI: string
  grammars: any
  start(): void
  stop(): void
  abort(): void
  onresult: ((this: SpeechRecognition, ev: any) => any) | null
  onerror: ((this: SpeechRecognition, ev: any) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onnomatch: ((this: SpeechRecognition, ev: any) => any) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
}

export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isListening: boolean
  error?: string
}

export interface VoiceConfig {
  language: Language
  continuous: boolean
  interimResults: boolean
}

export interface SpeechSynthesisConfig {
  language: Language
  rate: number
  pitch: number
  volume: number
}

// Voice recognition class using Web Speech API
export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null
  private isSupported = false
  private config: VoiceConfig
  private onResult?: (result: VoiceRecognitionResult) => void
  private onError?: (error: string) => void

  constructor(config: VoiceConfig) {
    this.config = config
    this.initializeRecognition()
  }

  private initializeRecognition() {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser')
      return
    }

    this.isSupported = true
    this.recognition = new SpeechRecognition()
    
    if (this.recognition) {
      // Configure recognition
      this.recognition.continuous = this.config.continuous
      this.recognition.interimResults = this.config.interimResults
      this.recognition.lang = this.getLanguageCode(this.config.language)

      // Set up event handlers
      this.setupEventHandlers()
    }
  }

  private getLanguageCode(language: Language): string {
    return language === 'hi' ? 'hi-IN' : 'en-US'
  }

  private setupEventHandlers() {
    if (!this.recognition) return

    this.recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      let confidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalTranscript += transcript
          confidence = result[0].confidence
        } else {
          interimTranscript += transcript
        }
      }

      // Send interim results while listening
      if (interimTranscript.trim() && this.onResult) {
        this.onResult({
          transcript: interimTranscript.trim(),
          confidence: 0,
          isListening: true
        })
      }

      // Send final result
      if (finalTranscript.trim() && this.onResult) {
        this.onResult({
          transcript: finalTranscript.trim(),
          confidence,
          isListening: true // Still listening at this point
        })
      }
    }

    this.recognition.onerror = (event: any) => {
      const errorMessage = this.getErrorMessage(event.error, this.config.language)
      if (this.onError) {
        this.onError(errorMessage)
      }
    }

    this.recognition.onend = () => {
      // Recognition session ended
      if (this.onResult) {
        this.onResult({
          transcript: '',
          confidence: 0,
          isListening: false
        })
      }
    }

    this.recognition.onstart = () => {
      // Recognition started - notify that we're listening
      if (this.onResult) {
        this.onResult({
          transcript: '',
          confidence: 0,
          isListening: true
        })
      }
    }
  }

  private getErrorMessage(error: string, language: Language): string {
    const errorMessages = {
      en: {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Audio capture failed. Check your microphone.',
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'network': 'Network error occurred.',
        'service-not-allowed': 'Speech service not allowed.',
        'bad-grammar': 'Speech recognition error.',
        'language-not-supported': 'Language not supported.',
        'aborted': 'Speech recognition aborted.'
      },
      hi: {
        'no-speech': 'कोई आवाज़ नहीं सुनाई दी। कृपया पुनः प्रयास करें।',
        'audio-capture': 'ऑडियो कैप्चर विफल। अपना माइक्रोफ़ोन जांचें।',
        'not-allowed': 'माइक्रोफ़ोन पहुंच से इनकार। कृपया माइक्रोफ़ोन की अनुमति दें।',
        'network': 'नेटवर्क त्रुटि हुई।',
        'service-not-allowed': 'स्पीच सेवा की अनुमति नहीं है।',
        'bad-grammar': 'स्पीच पहचान त्रुटि।',
        'language-not-supported': 'भाषा समर्थित नहीं है।',
        'aborted': 'स्पीच पहचान रद्द की गई।'
      }
    }

    return errorMessages[language][error as keyof typeof errorMessages.en] || 
           errorMessages[language]['bad-grammar']
  }

  public setResultHandler(handler: (result: VoiceRecognitionResult) => void) {
    this.onResult = handler
  }

  public setErrorHandler(handler: (error: string) => void) {
    this.onError = handler
  }

  public start(): boolean {
    if (!this.isSupported || !this.recognition) {
      return false
    }

    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      return false
    }
  }

  public stop() {
    if (this.recognition) {
      this.recognition.stop()
    }
  }

  public isListening(): boolean {
    return this.isSupported && this.recognition !== null
  }

  public static isSupported(): boolean {
    if (typeof window === 'undefined') {
      console.log('VoiceRecognition.isSupported: window is undefined (SSR)')
      return false
    }
    
    const hasRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    console.log('VoiceRecognition.isSupported check:')
    console.log('- window.SpeechRecognition:', typeof window.SpeechRecognition)
    console.log('- window.webkitSpeechRecognition:', typeof window.webkitSpeechRecognition)
    console.log('- final result:', hasRecognition)
    return hasRecognition
  }

  public updateLanguage(language: Language) {
    this.config.language = language
    if (this.recognition) {
      this.recognition.lang = this.getLanguageCode(language)
    }
  }
}

// Text-to-Speech class using Web Speech API
export class TextToSpeech {
  private synth: SpeechSynthesis | null = null
  private isSupported = false
  private config: SpeechSynthesisConfig
  private voices: SpeechSynthesisVoice[] = []

  constructor(config: SpeechSynthesisConfig) {
    this.config = config
    this.initializeSpeech()
  }

  private initializeSpeech() {
    if (!window.speechSynthesis) {
      console.warn('Speech Synthesis not supported in this browser')
      return
    }

    this.isSupported = true
    this.synth = window.speechSynthesis
    this.loadVoices()
  }

  private loadVoices() {
    if (!this.synth) return

    this.voices = this.synth.getVoices()
    
    // If voices are not loaded yet, wait for the event
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth!.getVoices()
      }
    }
  }

  private getBestVoice(language: Language): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) return null

    const langCode = language === 'hi' ? 'hi' : 'en'
    
    // Try to find a voice that matches the language
    const matchingVoices = this.voices.filter(voice => 
      voice.lang.toLowerCase().startsWith(langCode)
    )

    if (matchingVoices.length > 0) {
      // Prefer local voices over remote ones
      const localVoice = matchingVoices.find(voice => voice.localService)
      return localVoice || matchingVoices[0]
    }

    // Fallback to default voice
    return this.voices[0] || null
  }

  public speak(text: string, language?: Language): boolean {
    if (!this.isSupported || !this.synth || !text.trim()) {
      return false
    }

    // Stop any ongoing speech
    this.stop()

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      const targetLanguage = language || this.config.language
      
      // Configure utterance
      utterance.rate = this.config.rate
      utterance.pitch = this.config.pitch
      utterance.volume = this.config.volume
      
      const voice = this.getBestVoice(targetLanguage)
      if (voice) {
        utterance.voice = voice
      }

      // Set language
      utterance.lang = targetLanguage === 'hi' ? 'hi-IN' : 'en-US'

      // Error handling
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error)
      }

      this.synth.speak(utterance)
      return true

    } catch (error) {
      console.error('Failed to speak text:', error)
      return false
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause()
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume()
    }
  }

  public isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false
  }

  public isPaused(): boolean {
    return this.synth ? this.synth.paused : false
  }

  public static isSupported(): boolean {
    if (typeof window === 'undefined') {
      console.log('TextToSpeech.isSupported: window is undefined (SSR)')
      return false
    }
    
    const hasSynthesis = !!window.speechSynthesis
    console.log('TextToSpeech.isSupported check:')
    console.log('- window.speechSynthesis:', typeof window.speechSynthesis)
    console.log('- final result:', hasSynthesis)
    return hasSynthesis
  }

  public updateConfig(config: Partial<SpeechSynthesisConfig>) {
    this.config = { ...this.config, ...config }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }
}

// Voice Manager - combines recognition and synthesis
export class VoiceManager {
  private recognition: VoiceRecognition
  private synthesis: TextToSpeech
  private language: Language

  constructor(language: Language = 'en') {
    this.language = language
    
    this.recognition = new VoiceRecognition({
      language,
      continuous: false, // Changed to false for better single-command recognition
      interimResults: true // Keep true for real-time feedback
    })

    this.synthesis = new TextToSpeech({
      language,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    })
  }

  public startListening(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): boolean {
    this.recognition.setResultHandler(onResult)
    if (onError) {
      this.recognition.setErrorHandler(onError)
    }
    return this.recognition.start()
  }

  public stopListening() {
    this.recognition.stop()
  }

  public speak(text: string): boolean {
    return this.synthesis.speak(text, this.language)
  }

  public stopSpeaking() {
    this.synthesis.stop()
  }

  public updateLanguage(language: Language) {
    this.language = language
    this.recognition.updateLanguage(language)
    this.synthesis.updateConfig({ language })
  }

  public static isVoiceSupported(): { recognition: boolean; synthesis: boolean } {
    return {
      recognition: VoiceRecognition.isSupported(),
      synthesis: TextToSpeech.isSupported()
    }
  }
}

// Export utility functions
export const voiceUtils = {
  // Check browser support
  checkSupport: () => VoiceManager.isVoiceSupported(),
  
  // Get appropriate voice prompts based on language
  getVoicePrompts: (language: Language) => {
    return {
      en: {
        startListening: "Tap and hold to speak",
        listening: "Listening...",
        processingVoice: "Processing your voice...",
        speakNow: "Speak now",
        tryAgain: "Try again",
        voiceNotSupported: "Voice feature not supported in this browser",
        microphoneBlocked: "Microphone access is blocked. Please enable it in browser settings."
      },
      hi: {
        startListening: "बोलने के लिए दबाकर रखें",
        listening: "सुन रहे हैं...",
        processingVoice: "आपकी आवाज़ को प्रोसेस कर रहे हैं...",
        speakNow: "अब बोलें",
        tryAgain: "पुनः प्रयास करें",
        voiceNotSupported: "इस ब्राउज़र में वॉइस सुविधा समर्थित नहीं है",
        microphoneBlocked: "माइक्रोफ़ोन की पहुंच अवरुद्ध है। कृपया इसे ब्राउज़र सेटिंग्स में सक्षम करें।"
      }
    }[language]
  },

  // Format voice input for better recognition
  formatVoiceInput: (transcript: string): string => {
    return transcript
      .toLowerCase()
      .trim()
      .replace(/[।.!?]+$/, '') // Remove trailing punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
  }
}

export default VoiceManager
