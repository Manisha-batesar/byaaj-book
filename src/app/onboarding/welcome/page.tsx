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
            <h3 className="font-semibold text-primary">AI-Powered Features</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span>🎤</span>
              <span>Voice Commands in Hindi & English</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>💬</span>
              <span>Smart AI Assistant for Loan Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🔍</span>
              <span>Voice-Enabled Search & Navigation</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📊</span>
              <span>Automated Portfolio Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🏠</span>
              <span>Works Completely Offline</span>
            </div>
          </div>
          <div className="mt-3 p-2 bg-primary/10 rounded text-xs text-muted-foreground">
            <strong>Try saying:</strong> "Add new loan", "Show my portfolio", "नया लोन जोड़ें"
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
