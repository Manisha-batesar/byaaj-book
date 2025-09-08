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
      // Configure recognition for better speech detection
      this.recognition.continuous = false // Set to false for better single phrase detection
      this.recognition.interimResults = true // Keep true for real-time feedback
      this.recognition.lang = this.getLanguageCode(this.config.language)
      this.recognition.maxAlternatives = 1 // Only get the best result

      // Set up event handlers
      this.setupEventHandlers()
    }
  }

  private getLanguageCode(language: Language): string {
    return language === 'hi' ? 'hi-IN' : 'en-US'
  }

  private setupEventHandlers() {
    if (!this.recognition) return

    let lastTranscript = ''
    let speechTimeout: any = null

    this.recognition.onresult = (event: any) => {
      console.log('🎤 Recognition result event:', event.results)
      let finalTranscript = ''
      let interimTranscript = ''
      let confidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalTranscript += transcript
          confidence = result[0].confidence
          console.log('🎤 Final transcript:', finalTranscript, 'Confidence:', confidence)
        } else {
          interimTranscript += transcript
          console.log('🎤 Interim transcript:', interimTranscript)
        }
      }

      // Clear any existing timeout
      if (speechTimeout) {
        clearTimeout(speechTimeout)
        speechTimeout = null
      }

      // Send interim results for UI feedback
      if (interimTranscript.trim() && this.onResult) {
        lastTranscript = interimTranscript.trim()
        this.onResult({
          transcript: lastTranscript,
          confidence: 0,
          isListening: true
        })

        // Set timeout to finalize interim result if no more speech comes
        speechTimeout = setTimeout(() => {
          if (lastTranscript && this.onResult) {
            console.log('🎤 Finalizing interim result due to silence:', lastTranscript)
            this.onResult({
              transcript: lastTranscript,
              confidence: 0.8,
              isListening: false
            })
          }
        }, 2000) // Wait 2 seconds of silence
      }

      // Send final result immediately
      if (finalTranscript.trim() && this.onResult) {
        console.log('🎤 Sending final result:', finalTranscript.trim())
        if (speechTimeout) {
          clearTimeout(speechTimeout)
          speechTimeout = null
        }
        this.onResult({
          transcript: finalTranscript.trim(),
          confidence,
          isListening: false
        })
      }
    }

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Recognition error:', event.error)
      if (speechTimeout) {
        clearTimeout(speechTimeout)
        speechTimeout = null
      }
      const errorMessage = this.getErrorMessage(event.error, this.config.language)
      if (this.onError) {
        this.onError(errorMessage)
      }
    }

    this.recognition.onend = () => {
      console.log('🎤 Recognition ended')
      if (speechTimeout) {
        clearTimeout(speechTimeout)
        speechTimeout = null
      }
      // If we have some transcript but recognition ended, send it
      if (lastTranscript && this.onResult) {
        console.log('🎤 Sending last transcript on end:', lastTranscript)
        this.onResult({
          transcript: lastTranscript,
          confidence: 0.7,
          isListening: false
        })
        lastTranscript = ''
      } else if (this.onResult) {
        this.onResult({
          transcript: '',
          confidence: 0,
          isListening: false
        })
      }
    }

    this.recognition.onstart = () => {
      console.log('🎤 Recognition started')
      lastTranscript = ''
      if (speechTimeout) {
        clearTimeout(speechTimeout)
        speechTimeout = null
      }
      if (this.onResult) {
        this.onResult({
          transcript: '',
          confidence: 0,
          isListening: true
        })
      }
    }

    this.recognition.onspeechstart = () => {
      console.log('🎤 Speech detected - user started speaking')
    }

    this.recognition.onspeechend = () => {
      console.log('🎤 Speech ended - user stopped speaking')
    }

    this.recognition.onsoundstart = () => {
      console.log('🎤 Sound detected')
    }

    this.recognition.onsoundend = () => {
      console.log('🎤 Sound ended')
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
        console.log('🎤 Available voices loaded:', this.voices.length)
        console.log('🎤 Available Hindi voices:', this.voices.filter(v => v.lang.startsWith('hi')).map(v => `${v.name} (${v.lang})`))
        console.log('🎤 Available English voices:', this.voices.filter(v => v.lang.startsWith('en')).map(v => `${v.name} (${v.lang})`))
      }
    } else {
      console.log('🎤 Available voices loaded immediately:', this.voices.length)
      console.log('🎤 Available Hindi voices:', this.voices.filter(v => v.lang.startsWith('hi')).map(v => `${v.name} (${v.lang})`))
      console.log('🎤 Available English voices:', this.voices.filter(v => v.lang.startsWith('en')).map(v => `${v.name} (${v.lang})`))
    }
  }

  private getBestVoice(language: Language): SpeechSynthesisVoice | null {
    if (!this.synth) return null

    const voices = this.synth.getVoices()
    console.log('🎤 Looking for voice for language:', language)
    console.log('🎤 Available voices count:', voices.length)

    // Print all voice names for debugging
    voices.forEach(v => console.log(`🎤 Voice: ${v.name} (${v.lang})`))

    // For Hindi, prefer any Hindi voice
    if (language === 'hi') {
      const hindiVoices = voices.filter(v => 
        v.lang.includes('hi') || 
        v.lang.includes('HI') ||
        v.name.toLowerCase().includes('hindi')
      )
      console.log('🎤 Hindi voices found:', hindiVoices.length)
      
      if (hindiVoices.length > 0) {
        const selectedVoice = hindiVoices[0]
        console.log('🎤 Selected Hindi voice:', selectedVoice.name)
        return selectedVoice
      }
    }

    // For English, prefer female-sounding voices by name
    const femaleNames = [
      'samantha', 'susan', 'karen', 'zira', 'kavya', 'sara', 'alice', 
      'emma', 'anna', 'sarah', 'lisa', 'maria', 'female'
    ]
    
    const femaleVoices = voices.filter(v => 
      femaleNames.some(name => v.name.toLowerCase().includes(name)) &&
      (v.lang.includes('en') || v.lang.includes('EN'))
    )

    if (femaleVoices.length > 0) {
      console.log('🎤 Selected female voice:', femaleVoices[0].name)
      return femaleVoices[0]
    }

    // Fallback: any English voice that doesn't contain 'male'
    const englishVoices = voices.filter(v => 
      (v.lang.includes('en') || v.lang.includes('EN')) &&
      !v.name.toLowerCase().includes('male')
    )

    if (englishVoices.length > 0) {
      console.log('🎤 Selected English voice:', englishVoices[0].name)
      return englishVoices[0]
    }

    // Last resort: first available voice
    console.log('🎤 Using first available voice:', voices[0]?.name || 'none')
    return voices.length > 0 ? voices[0] : null
  }

  public speak(text: string, language?: Language): boolean {
    if (!this.isSupported || !this.synth || !text.trim()) {
      console.log('🔊 Speech not supported or empty text')
      return false
    }

    // Stop any ongoing speech first
    this.synth.cancel()

    try {
      const targetLanguage = language || this.config.language
      console.log('🔊 Target language:', targetLanguage)
      
      // Simple text cleaning - don't over-process
      let cleanText = text
        .replace(/₹/g, 'rupees ')
        .replace(/\n/g, '. ')
        .replace(/\*/g, '')
        .trim()

      console.log('🔊 Clean text preview:', cleanText.substring(0, 100))

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanText)
      
      // Force female voice settings
      if (targetLanguage === 'hi') {
        utterance.lang = 'hi-IN'
        utterance.rate = 0.8
        utterance.pitch = 1.4  // Higher pitch for female voice
        utterance.volume = 1.0
      } else {
        utterance.lang = 'en-US'
        utterance.rate = 0.85
        utterance.pitch = 1.35 // Higher pitch for female voice
        utterance.volume = 1.0
      }

      // Get all available voices and log them
      const voices = this.synth.getVoices()
      console.log('🎤 All system voices:', voices.map(v => `${v.name} (${v.lang})`))
      
      // Simple female voice selection - try different approaches
      let selectedVoice = null
      
      // Method 1: Look for explicit female voices
      const femaleVoices = voices.filter(v => 
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('woman') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('susan') ||
        v.name.toLowerCase().includes('karen') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('kavya')
      )
      
      if (femaleVoices.length > 0) {
        selectedVoice = femaleVoices[0]
        console.log('🎤 Method 1 - Selected explicit female voice:', selectedVoice.name)
      } else {
        // Method 2: Get first voice that doesn't contain 'male' for target language
        const langVoices = voices.filter(v => v.lang.startsWith(targetLanguage === 'hi' ? 'hi' : 'en'))
        const nonMaleVoices = langVoices.filter(v => !v.name.toLowerCase().includes('male'))
        
        if (nonMaleVoices.length > 0) {
          selectedVoice = nonMaleVoices[0]
          console.log('🎤 Method 2 - Selected non-male voice:', selectedVoice.name)
        } else if (langVoices.length > 0) {
          selectedVoice = langVoices[0]
          console.log('🎤 Method 3 - Selected any language voice:', selectedVoice.name)
        } else {
          // Method 3: Just use first available voice
          selectedVoice = voices[0]
          console.log('🎤 Method 4 - Using first available voice:', selectedVoice?.name || 'none')
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
        console.log('🎤 Final selected voice:', selectedVoice.name, selectedVoice.lang)
      }

      // Add event listeners for debugging
      utterance.onstart = () => {
        console.log('🔊 Speech started with:', utterance.voice?.name || 'default voice')
        console.log('🔊 Language:', utterance.lang)
        console.log('🔊 Rate:', utterance.rate, 'Pitch:', utterance.pitch)
      }

      utterance.onend = () => {
        console.log('🔊 Speech completed')
      }

      utterance.onerror = (event) => {
        console.error('🔊 Speech error:', event.error)
      }

      // Speak immediately
      console.log('🔊 Starting speech synthesis...')
      this.synth.speak(utterance)
      
      return true

    } catch (error) {
      console.error('❌ Speech synthesis failed:', error)
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
      continuous: false, // Single command recognition for better reliability
      interimResults: true // Keep true for real-time feedback
    })

    this.synthesis = new TextToSpeech({
      language,
      rate: 0.9, // Slightly slower for better clarity
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
