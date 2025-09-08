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
      console.log('🔊 Available voices:', voices.map(v => `${v.name} (${v.lang})`))
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
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        console.log('🔊 Voices changed event fired')
        loadVoices()
      }
    }

    // Force ready state for macOS Safari
    this.isReady = true
    
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

    console.log('🔊 ATTEMPTING TO SPEAK:', text.substring(0, 50) + '...')

    // For immediate user interaction, force ready state
    this.isReady = true

    // Aggressive cleanup for macOS/Safari
    this.synth.cancel()
    
    // Wait for cancel to complete, then speak
    setTimeout(() => {
      this.actuallySpeak(text, isHindi)
    }, 100)
    
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
      
      // Get appropriate voice for the language
      const voices = this.synth.getVoices()
      console.log('🔊 Available voices:', voices.length)
      
      let selectedVoice = null
      if (isHindi) {
        // Find Hindi voice
        selectedVoice = voices.find(voice => 
          voice.lang.includes('hi') || voice.lang.includes('IN')
        ) || voices.find(voice => 
          voice.name.toLowerCase().includes('hindi')
        )
      } else {
        // Find English voice
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en-US') || voice.lang.includes('en')
        ) || voices[0] // Fallback to first available voice
      }
      
      if (selectedVoice) {
        this.currentUtterance.voice = selectedVoice
        console.log('🔊 Selected voice:', selectedVoice.name, selectedVoice.lang)
      } else {
        console.log('🔊 No specific voice found, using default')
      }
      
      // Speech settings with better compatibility
      this.currentUtterance.volume = 1.0
      this.currentUtterance.rate = 0.8  // Slower rate for better clarity
      this.currentUtterance.pitch = 1.0  // Normal pitch
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
        
        // Try with a different approach on error
        if (event.error === 'canceled' || event.error === 'interrupted') {
          console.log('🔄 Retrying speech after error...')
          setTimeout(() => {
            this.simpleFallbackSpeak(cleanText)
          }, 1000)
        }
      }

      this.currentUtterance.onpause = () => {
        console.log('⏸️ SPEECH PAUSED')
      }

      this.currentUtterance.onresume = () => {
        console.log('▶️ SPEECH RESUMED')
      }

      // Check synthesis state
      console.log('🔊 Before speaking - speaking:', this.synth.speaking, 'pending:', this.synth.pending)
      
      // Force stop any existing speech
      if (this.synth.speaking || this.synth.pending) {
        console.log('⚠️ Canceling existing speech...')
        this.synth.cancel()
        
        // Wait for cancellation to complete
        setTimeout(() => {
          this.performSpeak()
        }, 300)
      } else {
        this.performSpeak()
      }
      
    } catch (error) {
      console.error('❌ ERROR in actuallySpeak:', error)
      // Try simple fallback
      this.simpleFallbackSpeak(text)
    }
  }

  private performSpeak() {
    if (!this.synth || !this.currentUtterance) return
    
    try {
      console.log('🔊 CALLING synth.speak()...')
      this.synth.speak(this.currentUtterance)
      
      console.log('🔊 synth.speak() called successfully')
      console.log('🔊 After speak - speaking:', this.synth.speaking, 'pending:', this.synth.pending)
      
      // Safari/macOS fix: Resume if paused
      setTimeout(() => {
        if (this.synth && this.synth.paused) {
          console.log('🔊 Resuming paused speech...')
          this.synth.resume()
        }
      }, 100)
      
    } catch (error) {
      console.error('❌ Error in performSpeak:', error)
      this.simpleFallbackSpeak(this.currentUtterance.text)
    }
  }

  private simpleFallbackSpeak(text: string) {
    console.log('🆘 Using fallback speech method...')
    
    if (!this.synth) return
    
    // Most basic approach possible
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 200)) // Limit text length
    utterance.volume = 1.0
    utterance.rate = 1.0
    utterance.pitch = 1.0
    
    utterance.onstart = () => console.log('🆘 FALLBACK SPEECH STARTED')
    utterance.onend = () => console.log('🆘 FALLBACK SPEECH ENDED')
    utterance.onerror = (e) => console.error('🆘 FALLBACK ERROR:', e.error)
    
    try {
      this.synth.speak(utterance)
    } catch (error) {
      console.error('🆘 Fallback also failed:', error)
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
      msg.rate = 0.9
      msg.pitch = 1.0
      
      // Try to get a working voice
      const voices = this.synth.getVoices()
      if (voices.length > 0) {
        // Prefer English voice for test
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') || voice.lang.includes('US')
        ) || voices[0]
        msg.voice = englishVoice
        console.log('🎯 Using voice:', englishVoice.name)
      }
      
      msg.onstart = () => console.log('🎯 DIRECT SPEECH STARTED!')
      msg.onend = () => console.log('🎯 DIRECT SPEECH ENDED!')
      msg.onerror = (e) => {
        console.error('🎯 DIRECT SPEECH ERROR:', e.error)
        
        // Ultimate fallback - try with system default
        if (e.error !== 'synthesis-unavailable') {
          setTimeout(() => {
            if (!this.synth) return
            const fallback = new SpeechSynthesisUtterance("Test")
            fallback.volume = 1.0
            fallback.rate = 1.0
            fallback.pitch = 1.0
            console.log('🎯 Ultimate fallback attempt...')
            this.synth.speak(fallback)
          }, 500)
        }
      }
      
      console.log('🎯 Speaking directly...')
      this.synth.speak(msg)
      
      // Force resume if needed (Safari fix)
      setTimeout(() => {
        if (this.synth && this.synth.paused) {
          console.log('🎯 Resuming direct speech...')
          this.synth.resume()
        }
      }, 100)
      
    }, 300)
  }

  // Test specific functionality
  public testSystemVoice(): void {
    console.log('🔧 TESTING SYSTEM VOICE CAPABILITIES')
    
    if (!this.synth) {
      console.error('❌ Speech synthesis not supported')
      return
    }
    
    // Check basic support
    console.log('🔧 speechSynthesis object:', !!window.speechSynthesis)
    console.log('🔧 getVoices method:', !!this.synth.getVoices)
    console.log('🔧 speak method:', !!this.synth.speak)
    console.log('🔧 Current speaking:', this.synth.speaking)
    console.log('🔧 Current pending:', this.synth.pending)
    console.log('🔧 Current paused:', this.synth.paused)
    
    const voices = this.synth.getVoices()
    console.log('🔧 Total voices available:', voices.length)
    
    if (voices.length > 0) {
      console.log('🔧 First few voices:')
      voices.slice(0, 5).forEach((voice, i) => {
        console.log(`🔧   ${i}: ${voice.name} (${voice.lang}) - Default: ${voice.default}`)
      })
      
      // Try speaking with first available voice
      const testUtterance = new SpeechSynthesisUtterance("Voice test successful")
      testUtterance.voice = voices[0]
      testUtterance.volume = 1.0
      testUtterance.rate = 1.0
      testUtterance.pitch = 1.0
      
      testUtterance.onstart = () => console.log('🔧 System voice test STARTED')
      testUtterance.onend = () => console.log('🔧 System voice test COMPLETED')
      testUtterance.onerror = (e) => console.error('🔧 System voice test ERROR:', e.error)
      
      console.log('🔧 Starting system voice test...')
      this.synth.speak(testUtterance)
    } else {
      console.warn('🔧 No voices available for testing')
    }
  }
}

// Create singleton instance
export const simpleVoiceManager = new SimpleVoiceManager()
