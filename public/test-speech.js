// Test Speech Synthesis directly in browser console
console.log('🧪 DIRECT SPEECH TEST LOADED')

// Add global test function
window.testSpeech = function() {
  console.log('🧪 Testing speech synthesis...')
  
  if (!window.speechSynthesis) {
    console.error('❌ Speech synthesis not supported')
    return
  }
  
  console.log('✅ Speech synthesis is available')
  
  // Cancel any existing speech
  speechSynthesis.cancel()
  
  setTimeout(() => {
    const voices = speechSynthesis.getVoices()
    console.log('🔊 Available voices:', voices.length)
    
    // List some voices
    voices.slice(0, 5).forEach((voice, i) => {
      console.log(`Voice ${i+1}: ${voice.name} (${voice.lang})`)
    })
    
    // Simple test
    console.log('🔊 Creating test message...')
    const msg = new SpeechSynthesisUtterance("Testing speech from ByajBook")
    msg.volume = 1.0
    msg.rate = 1.0
    msg.pitch = 1.0
    msg.lang = 'en-US'
    
    msg.onstart = () => console.log('✅ GLOBAL TEST SPEECH STARTED!')
    msg.onend = () => console.log('✅ GLOBAL TEST SPEECH ENDED!')
    msg.onerror = (e) => {
      console.error('❌ GLOBAL TEST SPEECH ERROR:', e.error)
      console.error('❌ Full error:', e)
    }
    
    console.log('🔊 Speaking test message...')
    speechSynthesis.speak(msg)
  }, 300)
}

// Delayed auto-run test
setTimeout(() => {
  console.log('🧪 Running automatic speech test in 3 seconds...')
  if (window.testSpeech) {
    window.testSpeech()
  }
}, 3000)

console.log('🧪 Type window.testSpeech() in console to test speech manually')
