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
      <div className="w-full flex items-center">
        <button className="text-sm text-muted-foreground" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center">
      <div className="text-6xl">🙏</div>
      <h1 className="text-2xl font-semibold mt-6">{t('appName')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">ByajBook</p>

      <div className="mt-6 w-full">
        <p className="text-base font-medium">Welcome to {t('appName')}</p>
        <p className="text-sm text-muted-foreground mt-2">ब्याजबुक में आपका स्वागत है</p>
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
