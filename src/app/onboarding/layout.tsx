"use client"

import React from "react"
import { LanguageProvider } from "@/components/language-provider"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-screen bg-background">
        <LanguageProvider>
          <div className="max-w-md mx-auto p-6">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}
