"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { storage } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"

export default function WelcomePage() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center text-center mt-6">
  {/* back button removed for the welcome (first) onboarding page */}

      <div className="flex-1 flex flex-col items-center">
      <div className="text-6xl">🙏</div>
      <h1 className="text-2xl font-semibold mt-6">{t('appName')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">ByajBook</p>

      <div className="mt-6 w-full">
        <p className="text-base font-medium">Welcome to {t('appName')}</p>
        <p className="text-sm text-muted-foreground mt-2">ब्याजबुक में आपका स्वागत है</p>
        
        {/* AI Features Highlight */}
        <div className="mt-4 bg-card p-4 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xl">🤖</span>
            <div className="text-left">
              <h3 className="font-semibold text-primary">AI-Powered Features</h3>
              <p className="text-xs text-muted-foreground">AI से भरपूर सुविधाएं</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-left">
            <div className="flex items-start space-x-2">
              <span>🎤</span>
              <div>
                <p className="font-medium">Voice Commands in Hindi & English</p>
                <p className="text-xs text-muted-foreground">हिंदी और अंग्रेजी में आवाज़ कमांड</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <span>💬</span>
              <div>
                <p className="font-medium">Smart AI Assistant</p>
                <p className="text-xs text-muted-foreground">स्मार्ट AI सहायक लोन मैनेजमेंट के लिए</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <span>🔍</span>
              <div>
                <p className="font-medium">Voice Search & Navigation</p>
                <p className="text-xs text-muted-foreground">आवाज़ से खोजें और नेविगेट करें</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <span>📊</span>
              <div>
                <p className="font-medium">Portfolio Analysis</p>
                <p className="text-xs text-muted-foreground">अपने पोर्टफोलियो का विश्लेषण</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <span>🏠</span>
              <div>
                <p className="font-medium">Works Completely Offline</p>
                <p className="text-xs text-muted-foreground">बिना इंटरनेट के भी पूरी तरह काम करता है</p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-primary/10 rounded">
            <div className="text-xs font-semibold text-primary mb-1">
              Try saying / कहकर देखें:
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              <div>💬 "Add new loan" / "नया लोन जोड़ें"</div>
              <div>📊 "Show my portfolio" / "पोर्टफोलियो दिखाओ"</div>
              <div>🔍 "Find Raj's loan" / "राज के लोन खोजें"</div>
            </div>
          </div>
        </div>
      </div>

      <button
        className="mt-8 bg-primary text-white py-3 px-6 rounded w-full"
        onClick={() => router.push('/onboarding/about')}
      >
        Next
      </button>
      </div>
    </div>
  )
}
