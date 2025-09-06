"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import VoiceManager, { VoiceRecognitionResult } from "@/lib/voice"
import { useLanguage } from "@/components/language-provider"

export default function VoiceTestPage() {
  const { language } = useLanguage()
  const [voiceManager, setVoiceManager] = useState<VoiceManager | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceSupport, setVoiceSupport] = useState({
    recognition: false,
    synthesis: false
  })
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const support = VoiceManager.isVoiceSupported()
      setVoiceSupport(support)
      
      const manager = new VoiceManager(language)
      setVoiceManager(manager)
      
      addTestResult(`Voice Support - Recognition: ${support.recognition}, Synthesis: ${support.synthesis}`)
    }
  }, [language])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const startVoiceRecording = async () => {
    if (!voiceManager) {
      addTestResult("VoiceManager not initialized")
      return
    }
    
    try {
      setIsListening(true)
      addTestResult("Starting voice recognition...")
      
      const success = voiceManager.startListening(
        (result: VoiceRecognitionResult) => {
          addTestResult(`Voice result - Transcript: "${result.transcript}", Listening: ${result.isListening}, Confidence: ${result.confidence}`)
          
          if (result.isListening && result.transcript) {
            // Show interim results
            setTranscript(result.transcript)
          }
          
          if (!result.isListening) {
            if (result.transcript) {
              setTranscript(result.transcript)
              addTestResult(`Final transcript: "${result.transcript}"`)
            }
            setIsListening(false)
            addTestResult("Voice recognition ended")
          }
        },
        (error: string) => {
          addTestResult(`Voice error: ${error}`)
          setIsListening(false)
        }
      )
      
      if (!success) {
        setIsListening(false)
        addTestResult("Failed to start voice recognition")
      } else {
        addTestResult("Voice recognition started successfully")
      }
    } catch (error) {
      addTestResult(`Exception: ${error}`)
      setIsListening(false)
    }
  }

  const stopVoiceRecording = () => {
    if (voiceManager) {
      voiceManager.stopListening()
      addTestResult("Voice recording stopped manually")
    }
    setIsListening(false)
  }

  const speakText = () => {
    if (!voiceManager || !transcript.trim()) {
      addTestResult("No text to speak or VoiceManager not available")
      return
    }
    
    setIsSpeaking(true)
    addTestResult(`Speaking: "${transcript}"`)
    
    const success = voiceManager.speak(transcript)
    if (success) {
      addTestResult("Speech started successfully")
      // Reset speaking state after estimated time
      setTimeout(() => {
        setIsSpeaking(false)
        addTestResult("Speech completed")
      }, transcript.length * 100) // Rough estimate
    } else {
      setIsSpeaking(false)
      addTestResult("Failed to start speech")
    }
  }

  const stopSpeaking = () => {
    if (voiceManager) {
      voiceManager.stopSpeaking()
      addTestResult("Speech stopped manually")
    }
    setIsSpeaking(false)
  }

  const clearResults = () => {
    setTestResults([])
    setTranscript('')
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Voice Recognition Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Voice Support Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Speech Recognition: <span className={voiceSupport.recognition ? "text-green-600" : "text-red-600"}>
              {voiceSupport.recognition ? "✅ Supported" : "❌ Not Supported"}
            </span></p>
            <p>Speech Synthesis: <span className={voiceSupport.synthesis ? "text-green-600" : "text-red-600"}>
              {voiceSupport.synthesis ? "✅ Supported" : "❌ Not Supported"}
            </span></p>
            <p>Current Language: <strong>{language === 'hi' ? 'Hindi' : 'English'}</strong></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Input Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript will appear here..."
              className="flex-1"
            />
            <Button
              variant={isListening ? "destructive" : "default"}
              onClick={isListening ? stopVoiceRecording : startVoiceRecording}
              disabled={!voiceSupport.recognition}
              className="flex items-center gap-2"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? "Stop" : "Start"} Recording
            </Button>
          </div>
          
          {isListening && (
            <p className="text-sm text-blue-600 animate-pulse">🎤 Listening...</p>
          )}
          
          <div className="flex gap-2">
            <Button
              variant={isSpeaking ? "destructive" : "outline"}
              onClick={isSpeaking ? stopSpeaking : speakText}
              disabled={!voiceSupport.synthesis || !transcript.trim()}
              className="flex items-center gap-2"
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isSpeaking ? "Stop" : "Speak"} Text
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
          
          {isSpeaking && (
            <p className="text-sm text-orange-600 animate-pulse">🔊 Speaking...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Try using the voice features above.</p>
            ) : (
              <div className="space-y-1 font-mono text-sm">
                {testResults.map((result, index) => (
                  <div key={index} className="text-gray-800">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
