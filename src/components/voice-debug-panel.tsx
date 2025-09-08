"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Volume2, 
  VolumeX, 
  Bug, 
  CheckCircle, 
  XCircle,
  Mic,
  Speaker
} from "lucide-react"
import { simpleVoiceManager } from "@/lib/simple-voice"
import { simpleVoiceRecognition } from "@/lib/simple-voice-recognition"

interface VoiceInfo {
  name: string
  lang: string
  default: boolean
  localService: boolean
  voiceURI: string
}

export function VoiceDebugPanel() {
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const [testText, setTestText] = useState('Hello, this is a test of the speech synthesis system.')
  const [isPlaying, setIsPlaying] = useState(false)
  const [supportInfo, setSupportInfo] = useState({
    speechSynthesis: false,
    speechRecognition: false,
    webkitSpeechRecognition: false
  })
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)
  const [recognitionText, setRecognitionText] = useState('')

  useEffect(() => {
    // Check support
    const support = {
      speechSynthesis: 'speechSynthesis' in window,
      speechRecognition: 'SpeechRecognition' in window,
      webkitSpeechRecognition: 'webkitSpeechRecognition' in window
    }
    setSupportInfo(support)
    addLog(`Browser Support: SpeechSynthesis: ${support.speechSynthesis}, SpeechRecognition: ${support.speechRecognition || support.webkitSpeechRecognition}`)

    if (support.speechSynthesis) {
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  const loadVoices = () => {
    if (!window.speechSynthesis) return

    const availableVoices = window.speechSynthesis.getVoices()
    const voiceInfo: VoiceInfo[] = availableVoices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      default: voice.default,
      localService: voice.localService,
      voiceURI: voice.voiceURI
    }))
    
    setVoices(voiceInfo)
    addLog(`Loaded ${voiceInfo.length} voices`)
    
    // Auto-select default voice
    const defaultVoice = voiceInfo.find(v => v.default) || voiceInfo[0]
    if (defaultVoice) {
      setSelectedVoice(defaultVoice.voiceURI)
      addLog(`Auto-selected voice: ${defaultVoice.name}`)
    }
  }

  const testDirectSpeech = () => {
    addLog('Testing direct speech synthesis...')
    setIsPlaying(true)

    const utterance = new SpeechSynthesisUtterance(testText)
    
    // Set selected voice if available
    if (selectedVoice) {
      const voice = voices.find(v => v.voiceURI === selectedVoice)
      if (voice) {
        const speechVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice)
        if (speechVoice) {
          utterance.voice = speechVoice
          addLog(`Using voice: ${voice.name} (${voice.lang})`)
        }
      }
    }

    utterance.volume = 1.0
    utterance.rate = 0.9
    utterance.pitch = 1.0

    utterance.onstart = () => {
      addLog('✅ Speech started successfully!')
    }

    utterance.onend = () => {
      addLog('✅ Speech completed successfully!')
      setIsPlaying(false)
    }

    utterance.onerror = (event) => {
      addLog(`❌ Speech error: ${event.error}`)
      setIsPlaying(false)
    }

    utterance.onpause = () => {
      addLog('⏸️ Speech paused')
    }

    utterance.onresume = () => {
      addLog('▶️ Speech resumed')
    }

    // Cancel any existing speech first
    window.speechSynthesis.cancel()
    
    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
      addLog('🔊 Speech command issued')
      
      // Safari/macOS fix
      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume()
          addLog('🔄 Resumed paused speech (Safari fix)')
        }
      }, 100)
    }, 100)
  }

  const testSimpleVoiceManager = () => {
    addLog('Testing SimpleVoiceManager...')
    setIsPlaying(true)
    
    const success = simpleVoiceManager.speak(testText, false)
    addLog(`SimpleVoiceManager.speak() returned: ${success}`)
    
    setTimeout(() => {
      setIsPlaying(false)
    }, 5000)
  }

  const testSystemVoice = () => {
    addLog('Testing system voice capabilities...')
    simpleVoiceManager.testSystemVoice()
  }

  const stopSpeech = () => {
    addLog('Stopping all speech...')
    window.speechSynthesis.cancel()
    simpleVoiceManager.stop()
    setIsPlaying(false)
  }

  const startListening = () => {
    addLog('Starting speech recognition...')
    setIsListening(true)
    setRecognitionText('')
    
    simpleVoiceRecognition.setLanguage(false) // English
    
    const success = simpleVoiceRecognition.startListening(
      (text: string, isFinal: boolean) => {
        setRecognitionText(text)
        addLog(`Recognition ${isFinal ? 'final' : 'interim'}: "${text}"`)
        
        if (isFinal) {
          setIsListening(false)
        }
      },
      (error: string) => {
        addLog(`Recognition error: ${error}`)
        setIsListening(false)
      }
    )
    
    addLog(`Recognition start result: ${success}`)
    
    if (success) {
      setTimeout(() => {
        if (isListening) {
          simpleVoiceRecognition.stopListening()
          setIsListening(false)
          addLog('Auto-stopped recognition after 10 seconds')
        }
      }, 10000)
    } else {
      setIsListening(false)
    }
  }

  const stopListening = () => {
    addLog('Stopping speech recognition...')
    simpleVoiceRecognition.stopListening()
    setIsListening(false)
  }

  const clearLogs = () => {
    setDebugLogs([])
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug size={20} />
            Voice System Debug Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Support Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              {supportInfo.speechSynthesis ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <XCircle size={16} className="text-red-600" />
              )}
              <span className="text-sm">Speech Synthesis</span>
            </div>
            <div className="flex items-center gap-2">
              {(supportInfo.speechRecognition || supportInfo.webkitSpeechRecognition) ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <XCircle size={16} className="text-red-600" />
              )}
              <span className="text-sm">Speech Recognition</span>
            </div>
          </div>

          {/* Voice Info */}
          <div>
            <p className="text-sm font-medium mb-2">Available Voices: {voices.length}</p>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {voice.lang}
                      </Badge>
                      {voice.default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Text */}
          <div>
            <p className="text-sm font-medium mb-2">Test Text:</p>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to test speech synthesis..."
              rows={3}
            />
          </div>

          {/* Speech Test Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testDirectSpeech}
              disabled={!supportInfo.speechSynthesis || isPlaying}
              className="flex items-center gap-2"
            >
              <Speaker size={16} />
              Direct Speech Test
            </Button>
            
            <Button
              onClick={testSimpleVoiceManager}
              disabled={!supportInfo.speechSynthesis || isPlaying}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Volume2 size={16} />
              SimpleVoiceManager Test
            </Button>
            
            <Button
              onClick={testSystemVoice}
              disabled={!supportInfo.speechSynthesis}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bug size={16} />
              System Test
            </Button>
            
            {isPlaying && (
              <Button
                onClick={stopSpeech}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <VolumeX size={16} />
                Stop
              </Button>
            )}
          </div>

          {/* Recognition Test */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Speech Recognition Test:</p>
            <div className="flex gap-2 mb-2">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  disabled={!(supportInfo.speechRecognition || supportInfo.webkitSpeechRecognition)}
                  className="flex items-center gap-2"
                >
                  <Mic size={16} />
                  Start Listening
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <VolumeX size={16} />
                  Stop Listening
                </Button>
              )}
            </div>
            {recognitionText && (
              <p className="text-sm bg-muted p-2 rounded">
                Recognized: "{recognitionText}"
              </p>
            )}
          </div>

          {/* Debug Logs */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Debug Logs:</p>
              <Button onClick={clearLogs} variant="outline" size="sm">
                Clear
              </Button>
            </div>
            <div className="bg-muted p-3 rounded max-h-60 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet...</p>
              ) : (
                debugLogs.map((log, index) => (
                  <p key={index} className="text-xs font-mono mb-1">
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
