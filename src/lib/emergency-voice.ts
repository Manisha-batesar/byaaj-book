class EmergencyVoiceManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isProcessing = false

  autoSpeak(text: string): void {
    // Prevent multiple simultaneous calls
    if (this.isProcessing) {
      console.log('🔊 Already processing speech, skipping...')
      return
    }

    this.isProcessing = true

    try {
      console.log('🔊 Auto speaking:', text.substring(0, 50) + '...')
      
      // Stop any existing speech with proper cleanup
      this.stop()
      
      // Wait a moment for cleanup - critical for all browsers
      setTimeout(() => {
        try {
          // Create new utterance
          this.currentUtterance = new SpeechSynthesisUtterance(text)
          
          // Cross-browser compatible settings
          this.currentUtterance.volume = 1.0
          this.currentUtterance.rate = 0.9  // Slightly slower for clarity
          this.currentUtterance.pitch = 1.0
          
          // Auto-detect language or default to English
          this.currentUtterance.lang = this.detectLanguage(text)
          
          // Event handlers with proper cleanup
          this.currentUtterance.onstart = () => {
            console.log('🔊 Speech started successfully')
          }
          
          this.currentUtterance.onend = () => {
            console.log('🔊 Speech completed')
            this.currentUtterance = null
            this.isProcessing = false
          }
          
          this.currentUtterance.onerror = (event) => {
            console.warn('🔊 Speech interrupted:', event.error)
            // Don't treat "canceled" as a real error - it's normal when stopping
            if (event.error !== 'canceled') {
              console.error('🔊 Actual speech error:', event.error)
            }
            this.currentUtterance = null
            this.isProcessing = false
          }
          
          // Cross-browser speech initialization
          this.initializeSpeech()
          
          // Speak the text
          speechSynthesis.speak(this.currentUtterance)
          console.log('🔊 Speech queued successfully')
          
        } catch (error) {
          console.error('🔊 Speech creation error:', error)
          this.isProcessing = false
        }
      }, 100) // Small delay prevents "canceled" errors across all browsers
      
    } catch (error) {
      console.error('🔊 Auto speak error:', error)
      this.isProcessing = false
    }
  }

  private detectLanguage(text: string): string {
    // Simple language detection - can be enhanced
    const hindiPattern = /[\u0900-\u097F]/
    return hindiPattern.test(text) ? 'hi-IN' : 'en-US'
  }

  private initializeSpeech(): void {
    // Cross-browser speech synthesis initialization
    if (speechSynthesis.paused) {
      speechSynthesis.resume()
    }
    
    // Mobile browser compatibility
    if ('speechSynthesis' in window && speechSynthesis.getVoices().length === 0) {
      // Trigger voice loading on mobile
      speechSynthesis.getVoices()
    }
  }

  // Public method to initialize voices (call this on user interaction for mobile)
  initializeVoices(): Promise<void> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve()
        return
      }

      // Wait for voices to load (required for mobile browsers)
      speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = speechSynthesis.getVoices()
        if (loadedVoices.length > 0) {
          console.log('🔊 Voices loaded:', loadedVoices.length)
          resolve()
        }
      }

      // Fallback timeout
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  }

  stop(): void {
    try {
      // Proper cleanup sequence for all browsers
      if (this.currentUtterance) {
        this.currentUtterance.onend = null
        this.currentUtterance.onerror = null
        this.currentUtterance = null
      }
      
      // Cancel all queued speech
      speechSynthesis.cancel()
      
      // Reset processing flag
      this.isProcessing = false
      
      console.log('🔊 Speech stopped and cleaned up')
    } catch (error) {
      console.error('🔊 Stop error:', error)
      this.isProcessing = false
    }
  }
}

// Export singleton instance
export const emergencyVoiceManager = new EmergencyVoiceManager()
