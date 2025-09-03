"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  Key, 
  ExternalLink,
  Copy,
  CheckCircle
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface AIQuickSetupProps {
  onClose?: () => void
}

export function AIQuickSetup({ onClose }: AIQuickSetupProps) {
  const { language } = useLanguage()
  const [copied, setCopied] = useState(false)

  const envContent = `NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Bot size={48} className="mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">
          {language === 'hi' ? 'AI सहायक सेटअप' : 'AI Assistant Setup'}
        </h2>
        <p className="text-muted-foreground">
          {language === 'hi' 
            ? 'अपने ऐप में AI सुविधाओं को सक्रिय करने के लिए 3 आसान कदम'
            : '3 easy steps to activate AI features in your app'
          }
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              {language === 'hi' ? 'API Key प्राप्त करें' : 'Get API Key'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {language === 'hi' 
                ? 'Google AI Studio से मुफ्त API key प्राप्त करें। यह बिल्कुल मुफ्त है!'
                : 'Get a free API key from Google AI Studio. It\'s completely free!'
              }
            </p>
            <Button asChild className="w-full">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Key size={16} />
                {language === 'hi' ? 'मुफ्त API Key प्राप्त करें' : 'Get Free API Key'}
                <ExternalLink size={16} />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              {language === 'hi' ? 'API Key कॉन्फ़िगर करें' : 'Configure API Key'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {language === 'hi' 
                ? 'अपने प्रोजेक्ट में .env.local फ़ाइल बनाएं और निम्नलिखित लाइन जोड़ें:'
                : 'Create a .env.local file in your project and add the following line:'
              }
            </p>
            
            <div className="relative">
              <div className="bg-muted p-3 rounded-lg font-mono text-sm overflow-x-auto">
                {envContent}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {language === 'hi' 
                ? 'your_api_key_here को अपनी वास्तविक API key से बदलें'
                : 'Replace your_api_key_here with your actual API key'
              }
            </p>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              {language === 'hi' ? 'ऐप रीस्टार्ट करें' : 'Restart App'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {language === 'hi' 
                ? 'अपना डेवलपमेंट सर्वर रीस्टार्ट करें और AI सुविधाओं का आनंद लें!'
                : 'Restart your development server and enjoy AI features!'
              }
            </p>
            
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              npm run dev
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Close button */}
      {onClose && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onClose}>
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </Button>
        </div>
      )}
    </div>
  )
}
