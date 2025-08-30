"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"

export default function ChooseLanguagePage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()

  const choose = (lang: 'en' | 'hi') => {
    setLanguage(lang)
    // persist language
    storage.setLanguage(lang)
    router.push('/onboarding/instructions')
  }

  return (
    <div className="mt-4">
      <div className="w-full flex items-center">
        <button className="text-sm text-muted-foreground" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-4">Choose Language / भाषा चुनें</h2>
      <p className="text-sm text-muted-foreground mt-2">{t('appDescription')}</p>

      <div className="mt-6 space-y-3">
        <button
          className={`w-full py-3 rounded border ${language === 'en' ? 'border-primary' : 'border-muted-foreground'}`}
          onClick={() => choose('en')}
        >
          English
        </button>

        <button
          className={`w-full py-3 rounded border ${language === 'hi' ? 'border-primary' : 'border-muted-foreground'}`}
          onClick={() => choose('hi')}
        >
          हिन्दी
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">You can change language later using the globe icon</p>
    </div>
  )
}
