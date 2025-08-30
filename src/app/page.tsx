"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { storage } from "@/lib/storage"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // If user hasn't seen onboarding, route them there first
    if (!storage.getOnboardingSeen()) {
      router.push('/onboarding/welcome')
      return
    }

    // Otherwise go to dashboard (auth handled in settings)
    router.push('/dashboard')
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src="/bb-logo.png" alt="ByajBook" className="h-20 w-auto mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
