"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Mic, MicOff } from "lucide-react"
import VoiceManager, { VoiceRecognitionResult } from "@/lib/voice"
import { useLanguage } from "@/components/language-provider"
import { useRouter } from "next/navigation"

export default function VoiceDebugPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [voiceManager, setVoiceManager] = useState<VoiceManager | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [browserSupport, setBrowserSupport] = useState({
    speechRecognition: false,
    webkitSpeechRecognition: false,
    speechSynthesis: false
  })

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
    console.log(message)
  }

  useEffect(() => {
    // Check browser support
    const support = {
      speechRecognition: typeof window !== 'undefined' && !!window.SpeechRecognition,
      webkitSpeechRecognition: typeof window !== 'undefined' && !!window.webkitSpeechRecognition,
      speechSynthesis: typeof window !== 'undefined' && !!window.speechSynthesis
    }
    setBrowserSupport(support)
    addLog(`Browser support: ${JSON.stringify(support)}`)

    // Initialize VoiceManager
    if (typeof window !== 'undefined') {
      const manager = new VoiceManager(language)
      setVoiceManager(manager)
      addLog('VoiceManager created')

      const voiceSupport = VoiceManager.isVoiceSupported()
      addLog(`VoiceManager support: ${JSON.stringify(voiceSupport)}`)
    }
  }, [language])

  const testVoiceRecognition = async () => {
    if (!voiceManager) {
      addLog('ERROR: VoiceManager not initialized')
      return
    }

    setIsListening(true)
    addLog('Starting voice recognition test...')

    const success = voiceManager.startListening(
      (result: VoiceRecognitionResult) => {
        addLog(`Voice result: ${JSON.stringify(result)}`)
        
        if (result.transcript) {
          setTranscript(result.transcript)
          addLog(`Transcript updated: "${result.transcript}"`)
        }
        
        if (!result.isListening) {
          setIsListening(false)
          addLog('Voice recognition ended')
        }
      },
      (error: string) => {
        addLog(`Voice ERROR: ${error}`)
        setIsListening(false)
      }
    )

    if (success) {
      addLog('Voice recognition started successfully')
    } else {
      addLog('FAILED to start voice recognition')
      setIsListening(false)
    }
  }

  const stopVoiceRecognition = () => {
    if (voiceManager) {
      voiceManager.stopListening()
      addLog('Voice recognition stopped manually')
    }
    setIsListening(false)
  }

  const clearLogs = () => {
    setLogs([])
    setTranscript('')
  }

  const testMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      addLog('✅ Microphone permission granted')
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      addLog(`❌ Microphone permission error: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Assistant Voice Debug</h1>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      {/* Browser Support */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Support Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>SpeechRecognition: <span className={browserSupport.speechRecognition ? 'text-green-600' : 'text-red-600'}>
              {browserSupport.speechRecognition ? '✅ Supported' : '❌ Not Supported'}
            </span></p>
            <p>webkitSpeechRecognition: <span className={browserSupport.webkitSpeechRecognition ? 'text-green-600' : 'text-red-600'}>
              {browserSupport.webkitSpeechRecognition ? '✅ Supported' : '❌ Not Supported'}
            </span></p>
            <p>SpeechSynthesis: <span className={browserSupport.speechSynthesis ? 'text-green-600' : 'text-red-600'}>
              {browserSupport.speechSynthesis ? '✅ Supported' : '❌ Not Supported'}
            </span></p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Test */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Recognition Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transcript will appear here..."
            className="w-full"
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={isListening ? stopVoiceRecognition : testVoiceRecognition}
              variant={isListening ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </Button>
            
            <Button onClick={testMicrophonePermission} variant="outline">
              Test Mic Permission
            </Button>
            
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>

          {isListening && (
            <p className="text-blue-600 animate-pulse">🎤 Listening... Speak now!</p>
          )}
        </CardContent>
      </Card>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-400">No logs yet. Click "Start Listening" to test voice recognition.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First check that browser support shows ✅ for at least one speech recognition API</li>
            <li>Click "Test Mic Permission" to ensure microphone access is granted</li>
            <li>Click "Start Listening" and speak clearly</li>
            <li>Check debug logs for detailed information about what's happening</li>
            <li>If voice recognition works here, the issue is in the AI chat implementation</li>
            <li>If it doesn't work here, the issue is with browser support or permissions</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
