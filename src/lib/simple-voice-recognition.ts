// Simple Voice Recognition - Direct Web Speech API usage
"use client"

export class SimpleVoiceRecognition {
  private recognition: any = null
  private isListening = false

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.setupRecognition()
        console.log('🎤 Simple Voice Recognition initialized')
      } else {
        console.log('🎤 Speech Recognition not supported')
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    // Basic settings
    this.recognition.continuous = false
    this.recognition.interimResults = true
    this.recognition.lang = 'hi-IN' // Default to Hindi, can be changed
    this.recognition.maxAlternatives = 1

    console.log('🎤 Recognition configured:', {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang
    })
  }

  public isSupported(): boolean {
    return this.recognition !== null
  }

  public startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): boolean {
    if (!this.recognition || this.isListening) {
      console.log('🎤 Cannot start - no recognition or already listening')
      return false
    }

    console.log('🎤 Starting voice recognition...')
    this.isListening = true

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('🎤 Recognition started')
    }

    this.recognition.onresult = (event: any) => {
      console.log('🎤 Got recognition result:', event.results)
      
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalTranscript += transcript
          console.log('🎤 Final result:', finalTranscript)
          onResult(finalTranscript.trim(), true)
        } else {
          interimTranscript += transcript
          console.log('🎤 Interim result:', interimTranscript)
          onResult(interimTranscript.trim(), false)
        }
      }
    }

    this.recognition.onend = () => {
      console.log('🎤 Recognition ended')
      this.isListening = false
    }

    this.recognition.onerror = (event: any) => {
      console.error('🎤 Recognition error:', event.error)
      this.isListening = false
      onError(this.getErrorMessage(event.error))
    }

    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('🎤 Failed to start recognition:', error)
      this.isListening = false
      return false
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      console.log('🎤 Stopping recognition...')
      this.recognition.stop()
      this.isListening = false
    }
  }

  public setLanguage(isHindi: boolean) {
    if (this.recognition) {
      this.recognition.lang = isHindi ? 'hi-IN' : 'en-US'
      console.log('🎤 Language set to:', this.recognition.lang)
    }
  }

  private getErrorMessage(error: string): string {
    const messages: { [key: string]: string } = {
      'no-speech': 'कोई आवाज़ नहीं सुनाई दी। कृपया दोबारा कोशिश करें।',
      'audio-capture': 'माइक्रोफ़ोन की समस्या। कृपया माइक्रोफ़ोन जांचें।',
      'not-allowed': 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया अनुमति दें।',
      'network': 'नेटवर्क की समस्या।',
      'service-not-allowed': 'वॉइस सेवा उपलब्ध नहीं है।'
    }
    return messages[error] || 'वॉइस की समस्या हुई है।'
  }

  public getCurrentListeningState(): boolean {
    return this.isListening
  }
}

// Create singleton
export const simpleVoiceRecognition = new SimpleVoiceRecognition()
