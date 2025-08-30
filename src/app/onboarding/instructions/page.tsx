"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { storage } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"

export default function InstructionsPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const finish = () => {
    storage.setOnboardingSeen(true)
    router.push('/dashboard')
  }

  const pointsEn = [
    'Set a 4-digit PIN from Settings to secure your app',
    'All data stays on your device and is never uploaded',
    'Use the globe icon anytime to change language',
  ]

  const pointsHi = [
    'अपने ऐप को सुरक्षित करने के लिए सेटिंग्स में 4-अंकीय पिन सेट करें',
    'सभी डेटा आपके डिवाइस पर रहता है और कभी अपलोड नहीं होता',
    'भाषा बदलने के लिए कभी भी ग्लोब आइकन का उपयोग करें',
  ]

  return (
    <div className="mt-4">
      <div className="w-full flex items-center">
        <button className="text-sm text-muted-foreground" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <div className="mt-4 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-semibold mt-4">{t('security')}</h2>
      </div>

      <div className="mt-6 bg-card p-4 rounded-lg">
        <ol className="list-decimal list-inside space-y-3 text-sm">
          {pointsEn.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>

        <div className="mt-4 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-3">
            {pointsHi.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      </div>

      <button
        className="mt-8 bg-primary text-white py-3 px-6 rounded w-full"
        onClick={finish}
      >
        Finish
      </button>
    </div>
  )
}
