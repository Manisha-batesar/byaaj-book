"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { storage } from "@/lib/storage"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    if (storage.isAuthenticated()) {
      router.push("/dashboard")
      return
    }

    // Always redirect to dashboard - no automatic PIN entry
    // Users will access PIN functionality through settings
    router.push("/dashboard")
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
