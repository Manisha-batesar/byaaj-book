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
          <div className="text-2xl">�</div>
          <div>
            <div className="font-semibold">Why Byaj Manager?</div>
            <ul className="mt-2 list-disc pl-5 space-y-2 text-sm">
              <li>Manage given & taken money with interest</li>
              <li>Works completely offline – no internet needed</li>
              <li>Secure with your personal PIN</li>
              <li>Your data stays only on your phone – no one else can see it</li>
              <li>Track your client details with smart reminders</li>
              <li>Simple and easy to use</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold">ब्याज मैनेजर क्यों?</div>
            <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>दिए और लिए गए पैसों का ब्याज आसानी से संभालें</li>
              <li>बिना इंटरनेट के भी पूरी तरह काम करता है</li>
              <li>आपके निजी PIN से सुरक्षित</li>
              <li>आपका डेटा सिर्फ आपके फोन में रहेगा – कोई और नहीं देख पाएगा</li>
              <li>अपने क्लाइंट की डिटेल्स रिमाइंडर से भी ट्रैक कर सकते हैं</li>
              <li>सरल और आसान उपयोग</li>
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
