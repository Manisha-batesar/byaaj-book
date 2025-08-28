"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { storage } from "@/lib/storage"
import { Language, getTranslation } from "@/lib/language"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof import("@/lib/language").translations.en) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = storage.getLanguage()
    setLanguageState(savedLanguage)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    storage.setLanguage(lang)
  }

  const t = (key: keyof typeof import("@/lib/language").translations.en) => {
    return getTranslation(language, key)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
