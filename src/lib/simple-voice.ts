// Simple voice manager - no complex logic, just basic speech
"use client"

export class SimpleVoiceManager {
  private synth: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isReady = false

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis
      console.log('🔊 Simple Voice Manager initialized')
      
      // Fix for macOS/Safari - wait for voices to load
      this.initializeVoices()
    }
  }

  private initializeVoices() {
    if (!this.synth) return

    const loadVoices = () => {
      const voices = this.synth!.getVoices()
      if (voices.length > 0) {
        console.log('🔊 Voices loaded:', voices.length)
        this.isReady = true
      } else {
        console.log('🔊 No voices yet, waiting...')
      }
    }

    // Load voices immediately if available
    loadVoices()

    // Also listen for voices changed event (important for Safari)
    this.synth.onvoiceschanged = () => {
      console.log('🔊 Voices changed event fired')
      loadVoices()
    }

    // Give it a moment to initialize
    setTimeout(() => {
      if (!this.isReady) {
        console.log('🔊 Force ready after timeout')
        this.isReady = true
      }
    }, 1000)
  }

  // Simple speak function - just speak the text
  public speak(text: string, isHindi: boolean = false): boolean {
    if (!this.synth || !text.trim()) {
      console.log('🔊 No speech synthesis or empty text')
      return false
    }

    if (!this.isReady) {
      console.log('🔊 Voices not ready yet, waiting...')
      setTimeout(() => this.speak(text, isHindi), 500)
      return true
    }

    console.log('🔊 ATTEMPTING TO SPEAK:', text.substring(0, 50) + '...')

    // Aggressive cleanup for macOS/Safari
    this.synth.cancel()
    
    // Wait for cancel to complete
    setTimeout(() => {
      this.actuallySpeak(text, isHindi)
    }, 200)
    
    return true
  }

  private actuallySpeak(text: string, isHindi: boolean) {
    if (!this.synth) return

    try {
      // Very basic text cleaning 
      const cleanText = text
        .replace(/₹/g, 'rupees ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      console.log('🔊 CLEAN TEXT:', cleanText.substring(0, 50) + '...')

      this.currentUtterance = new SpeechSynthesisUtterance(cleanText)
      
      // Very basic settings - no complex voice selection
      this.currentUtterance.volume = 1.0
      this.currentUtterance.rate = 0.9
      this.currentUtterance.pitch = 1.2
      this.currentUtterance.lang = isHindi ? 'hi-IN' : 'en-US'

      // Event handlers for debugging
      this.currentUtterance.onstart = () => {
        console.log('✅ SPEECH STARTED SUCCESSFULLY!')
      }

      this.currentUtterance.onend = () => {
        console.log('✅ SPEECH ENDED SUCCESSFULLY!')
      }

      this.currentUtterance.onerror = (event) => {
        console.error('❌ SPEECH ERROR:', event.error)
        console.error('❌ Full error event:', event)
        
        // If canceled error, try again after a delay
        if (event.error === 'canceled') {
          console.log('🔄 Retrying speech after canceled error...')
          setTimeout(() => {
            if (this.synth && !this.synth.speaking) {
              console.log('🔄 Retry attempt...')
              this.synth.speak(this.currentUtterance!)
            }
          }, 500)
        }
      }

      this.currentUtterance.onpause = () => {
        console.log('⏸️ SPEECH PAUSED')
      }

      this.currentUtterance.onresume = () => {
        console.log('▶️ SPEECH RESUMED')
      }

      // Check if already speaking
      if (this.synth.speaking || this.synth.pending) {
        console.warn('⚠️ Speech synthesis is busy, canceling first...')
        this.synth.cancel()
        setTimeout(() => {
          this.synth!.speak(this.currentUtterance!)
        }, 200)
      } else {
        // Try to speak immediately
        console.log('🔊 CALLING synth.speak()...')
        this.synth.speak(this.currentUtterance)
        
        console.log('🔊 synth.speak() called successfully')
        console.log('🔊 Speech synthesis speaking?', this.synth.speaking)
        console.log('🔊 Speech synthesis pending?', this.synth.pending)
      }
    } catch (error) {
      console.error('❌ ERROR in actuallySpeak:', error)
    }
  }

  // Stop current speech
  public stop(): void {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  // Check if synthesis is supported
  public isSupported(): boolean {
    return this.synth !== null
  }

  // Test function to check if speech works
  public testSpeak(): void {
    console.log('🧪 TESTING SPEECH SYNTHESIS...')
    
    if (!this.synth) {
      console.error('❌ Speech synthesis not available')
      return
    }

    console.log('🧪 Available voices:', this.synth.getVoices().length)
    
    // Complete cancel and restart
    this.synth.cancel()
    
    setTimeout(() => {
      if (!this.synth) return
      
      // Very simple test without any complex logic
      const testText = "Testing speech synthesis"
      console.log('🧪 Test text:', testText)
      
      const utterance = new SpeechSynthesisUtterance(testText)
      utterance.volume = 1.0
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      
      utterance.onstart = () => console.log('🧪 TEST SPEECH STARTED!')
      utterance.onend = () => console.log('🧪 TEST SPEECH ENDED!')
      utterance.onerror = (e) => {
        console.error('🧪 TEST SPEECH ERROR:', e.error)
        console.error('🧪 Full test error:', e)
      }
      
      console.log('🧪 Calling speak for test...')
      this.synth.speak(utterance)
      console.log('🧪 Test speak command issued')
    }, 200)
  }

  // Direct simple speak - bypasses all complex logic
  public directSpeak(text: string = "Hello from ByajBook"): void {
    console.log('🎯 DIRECT SPEAK - NO COMPLEX LOGIC')
    
    if (!this.synth) {
      console.error('❌ No speech synthesis')
      return
    }

    // Complete stop
    this.synth.cancel()
    
    // Wait and then speak
    setTimeout(() => {
      if (!this.synth) return
      
      console.log('🎯 Creating simple utterance...')
      const msg = new SpeechSynthesisUtterance(text)
      msg.volume = 1.0
      msg.rate = 1.0
      msg.pitch = 1.0
      
      msg.onstart = () => console.log('🎯 DIRECT SPEECH STARTED!')
      msg.onend = () => console.log('🎯 DIRECT SPEECH ENDED!')
      msg.onerror = (e) => console.error('🎯 DIRECT SPEECH ERROR:', e.error)
      
      console.log('🎯 Speaking directly...')
      this.synth.speak(msg)
    }, 300)
  }
}

// Create singleton instance
export const simpleVoiceManager = new SimpleVoiceManager()
