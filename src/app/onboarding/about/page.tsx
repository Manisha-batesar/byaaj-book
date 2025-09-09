"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"

export default function AboutPage() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <div className="mt-4">
      <div className="w-full flex items-center">
        <button className="text-sm text-muted-foreground" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <div className="mt-4 bg-card p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold">Why Byaj Manager?</div>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              <li><strong>AI-Powered:</strong> Voice commands in Hindi & English</li>
              <li><strong>Smart Assistant:</strong> AI helps with loan management</li>
              <li>Works completely offline – no internet needed</li>
              <li>Secure with your personal PIN</li>
              <li>Your data stays only on your phone</li>
              <li>Simple and easy to use with AI assistance</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-start space-x-3">
          <div className="text-2xl">🤖</div>
          <div>
            <div className="font-semibold">ब्याज मैनेजर क्यों?</div>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li><strong>AI सुविधा:</strong> हिंदी और अंग्रेजी में आवाज़ कमांड</li>
              <li><strong>स्मार्ट सहायक:</strong> AI लोन मैनेजमेंट में मदद करता है</li>
              <li>बिना इंटरनेट के भी पूरी तरह काम करता है</li>
              <li>आपके निजी PIN से सुरक्षित</li>
              <li>आपका डेटा सिर्फ आपके फोन में रहेगा</li>
              <li>AI सहायता के साथ सरल और आसान उपयोग</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        className="mt-8 bg-primary text-white py-3 px-6 rounded w-full"
        onClick={() => router.push('/onboarding/choose-language')}
      >
        Next
      </button>
    </div>
  )
}
