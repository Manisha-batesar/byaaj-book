"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Bot, 
  Key, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Info,
  Settings,
  Mic,
  Volume2,
  Shield
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { GeminiAI } from "@/lib/gemini"
import { voiceUtils } from "@/lib/voice"

export default function AISetupPage() {
  const { language, t } = useLanguage()
  const [apiKey, setApiKey] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [voiceSupport, setVoiceSupport] = useState({ recognition: false, synthesis: false })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check current API key from environment
    setApiKey(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
    
    // Check Gemini availability
    const isAvailable = GeminiAI.isAvailable()
    if (isAvailable) {
      setConnectionStatus('success')
      setConnectionMessage(language === 'hi' ? 'Gemini AI कॉन्फ़िगर और तैयार है!' : 'Gemini AI is configured and ready!')
    } else {
      setConnectionStatus('error')
      setConnectionMessage(language === 'hi' ? 'API key कॉन्फ़िगर नहीं है' : 'API key not configured')
    }

    // Check voice support
    const support = voiceUtils.checkSupport()
    setVoiceSupport(support)
  }, [language])

  const testConnection = async () => {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setConnectionStatus('error')
      setConnectionMessage(language === 'hi' ? 'कृपया वैध API key दर्ज करें' : 'Please enter a valid API key')
      return
    }

    setIsTestingConnection(true)
    try {
      // Test with a simple prompt
      const testPrompt = language === 'hi' ? 'नमस्ते! आप कैसे हैं?' : 'Hello! How are you?'
      
      const response = await GeminiAI.generateResponse({
        prompt: testPrompt,
        language
      })

      if (response.success) {
        setConnectionStatus('success')
        setConnectionMessage(language === 'hi' ? 'कनेक्शन सफल! Gemini AI तैयार है।' : 'Connection successful! Gemini AI is ready.')
      } else {
        setConnectionStatus('error')
        setConnectionMessage(response.error || (language === 'hi' ? 'कनेक्शन विफल हुआ' : 'Connection failed'))
      }

    } catch (error) {
      setConnectionStatus('error')
      setConnectionMessage(language === 'hi' ? 'कनेक्शन टेस्ट में त्रुटि हुई' : 'Error occurred during connection test')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const getSetupInstructions = () => {
    const instructions = {
      en: {
        title: "How to Set Up Gemini AI",
        steps: [
          {
            step: 1,
            title: "Get Google AI Studio API Key",
            description: "Visit Google AI Studio to get your free API key for Gemini AI.",
            action: "Visit AI Studio",
            link: "https://aistudio.google.com/app/apikey"
          },
          {
            step: 2,
            title: "Configure Environment",
            description: "Add your API key to the .env.local file in your project root:",
            code: "NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here"
          },
          {
            step: 3,
            title: "Restart Application",
            description: "Restart your development server or redeploy to apply the changes."
          },
          {
            step: 4,
            title: "Test Connection",
            description: "Use the test button to verify that your API key is working correctly."
          }
        ]
      },
      hi: {
        title: "Gemini AI सेटअप कैसे करें",
        steps: [
          {
            step: 1,
            title: "Google AI Studio API Key प्राप्त करें",
            description: "Gemini AI के लिए अपनी मुफ्त API key प्राप्त करने के लिए Google AI Studio पर जाएं।",
            action: "AI Studio पर जाएं",
            link: "https://aistudio.google.com/app/apikey"
          },
          {
            step: 2,
            title: "Environment कॉन्फ़िगर करें",
            description: "अपनी API key को प्रोजेक्ट रूट में .env.local फ़ाइल में जोड़ें:",
            code: "NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here"
          },
          {
            step: 3,
            title: "एप्लिकेशन रीस्टार्ट करें",
            description: "परिवर्तनों को लागू करने के लिए अपना डेवलपमेंट सर्वर रीस्टार्ट करें या दोबारा डिप्लॉय करें।"
          },
          {
            step: 4,
            title: "कनेक्शन टेस्ट करें",
            description: "यह सत्यापित करने के लिए कि आपकी API key सही तरीके से काम कर रही है, टेस्ट बटन का उपयोग करें।"
          }
        ]
      }
    }

    return instructions[language]
  }

  const instructions = getSetupInstructions()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-primary">
          <Bot size={16} />
          {t("aiSetup")}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bot size={24} className="text-primary" />
              {t("aiSetup")}
            </DialogTitle>
            <LanguageSelector />
          </div>
          <DialogDescription className="text-base">
            {language === 'hi' 
              ? 'अपने ब्याजबुक ऐप में Gemini AI और वॉइस फीचर्स को कॉन्फ़िगर करें।'
              : 'Configure Gemini AI and voice features for your ByajBook app.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot size={20} />
                {language === 'hi' ? 'वर्तमान स्थिति' : 'Current Status'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gemini AI Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key size={20} />
                  <div>
                    <p className="font-medium">Gemini AI</p>
                    <p className="text-sm text-muted-foreground">{connectionMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'success' && <CheckCircle size={20} className="text-green-600" />}
                  {connectionStatus === 'error' && <XCircle size={20} className="text-red-600" />}
                  {connectionStatus === 'unknown' && <Info size={20} className="text-gray-400" />}
                  <Badge variant={connectionStatus === 'success' ? 'default' : 'destructive'}>
                    {connectionStatus === 'success' 
                      ? (language === 'hi' ? 'कनेक्टेड' : 'Connected')
                      : (language === 'hi' ? 'डिस्कनेक्टेड' : 'Disconnected')
                    }
                  </Badge>
                </div>
              </div>

              {/* Voice Features Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mic size={20} />
                    <div>
                      <p className="font-medium">{language === 'hi' ? 'वॉइस रिकॉग्निशन' : 'Voice Recognition'}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'hi' ? 'आवाज़ को टेक्स्ट में बदलना' : 'Speech to text conversion'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {voiceSupport.recognition ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <XCircle size={20} className="text-red-600" />
                    )}
                    <Badge variant={voiceSupport.recognition ? 'default' : 'destructive'}>
                      {voiceSupport.recognition 
                        ? (language === 'hi' ? 'समर्थित' : 'Supported')
                        : (language === 'hi' ? 'असमर्थित' : 'Not Supported')
                      }
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Volume2 size={20} />
                    <div>
                      <p className="font-medium">{language === 'hi' ? 'टेक्स्ट टू स्पीच' : 'Text to Speech'}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'hi' ? 'टेक्स्ट को आवाज़ में बदलना' : 'Text to voice conversion'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {voiceSupport.synthesis ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <XCircle size={20} className="text-red-600" />
                    )}
                    <Badge variant={voiceSupport.synthesis ? 'default' : 'destructive'}>
                      {voiceSupport.synthesis 
                        ? (language === 'hi' ? 'समर्थित' : 'Supported')
                        : (language === 'hi' ? 'असमर्थित' : 'Not Supported')
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Test */}
          {connectionStatus !== 'success' && (
            <Card>
              <CardHeader>
                <CardTitle>{language === 'hi' ? 'कनेक्शन टेस्ट' : 'Connection Test'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    {language === 'hi' ? 'API Key (वैकल्पिक टेस्ट)' : 'API Key (Optional Test)'}
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={language === 'hi' ? 'अपनी Gemini API key यहाँ पेस्ट करें' : 'Paste your Gemini API key here'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'hi' 
                      ? 'यह केवल टेस्ट के लिए है। वास्तविक कॉन्फ़िगरेशन .env.local फ़ाइल में होनी चाहिए।'
                      : 'This is for testing only. Actual configuration should be in .env.local file.'
                    }
                  </p>
                </div>
                
                <Button 
                  onClick={testConnection} 
                  disabled={isTestingConnection || !apiKey}
                  className="w-full"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {language === 'hi' ? 'टेस्ट कर रहे हैं...' : 'Testing...'}
                    </>
                  ) : (
                    language === 'hi' ? 'कनेक्शन टेस्ट करें' : 'Test Connection'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>{instructions.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {instructions.steps.map((step, index) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      
                      {step.code && (
                        <div className="bg-muted p-3 rounded-lg font-mono text-sm overflow-x-auto">
                          {step.code}
                        </div>
                      )}
                      
                      {step.link && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                            {step.action}
                            <ExternalLink size={14} />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Note */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>{language === 'hi' ? 'प्राइवेसी नोट' : 'Privacy Note'}</AlertTitle>
            <AlertDescription>
              {language === 'hi' 
                ? 'आपकी API key और डेटा आपके डिवाइस पर स्थानीय रूप से संग्रहीत है। कोई भी जानकारी तीसरे पक्ष के सर्वर पर नहीं भेजी जाती।'
                : 'Your API key and data are stored locally on your device. No information is sent to third-party servers.'
              }
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
