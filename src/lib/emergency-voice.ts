class EmergencyVoiceManager {
  private currentUtterance: SpeechSynthesisUtterance | null = null

  autoSpeak(text: string): void {
    try {
      // Cancel any ongoing speech
      speechSynthesis.cancel()
      
      console.log('🔊 Auto speaking:', text.substring(0, 50) + '...')
      
      // Create new utterance
      this.currentUtterance = new SpeechSynthesisUtterance(text)
      
      // Basic settings
      this.currentUtterance.volume = 0.9
      this.currentUtterance.rate = 1.0
      this.currentUtterance.pitch = 1.0
      this.currentUtterance.lang = 'en-US'
      
      // Event handlers
      this.currentUtterance.onstart = () => {
        console.log('🔊 Speech started')
      }
      
      this.currentUtterance.onend = () => {
        console.log('🔊 Speech ended')
        this.currentUtterance = null
      }
      
      this.currentUtterance.onerror = (event) => {
        console.error('🔊 Speech error:', event.error)
        this.currentUtterance = null
      }
      
      // Safari specific: Resume synthesis
      if (speechSynthesis.paused) {
        speechSynthesis.resume()
      }
      
      // Speak
      speechSynthesis.speak(this.currentUtterance)
      
      console.log('🔊 Speech synthesis started')
      
    } catch (error) {
      console.error('🔊 Auto speak error:', error)
    }
  }

  stop(): void {
    try {
      speechSynthesis.cancel()
      this.currentUtterance = null
      console.log('🔊 Speech stopped')
    } catch (error) {
      console.error('🔊 Stop error:', error)
    }
  }
}

// Export singleton instance
export const emergencyVoiceManager = new EmergencyVoiceManager()
