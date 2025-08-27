"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PinInput } from "@/components/pin-input"
import { storage } from "@/lib/storage"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [confirmPin, setConfirmPin] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check if user is already authenticated
    if (storage.isAuthenticated()) {
      router.push("/dashboard")
      return
    }

    // Check if PIN exists
    const existingPin = storage.getPin()
    setHasPin(!!existingPin)
    setIsLoading(false)
  }, [router])

  const handlePinEnter = (pin: string) => {
    if (!hasPin) {
      // Setting up new PIN
      if (!isSettingPin) {
        setConfirmPin(pin)
        setIsSettingPin(true)
      } else {
        // Confirming PIN
        if (pin === confirmPin) {
          storage.setPin(pin)
          storage.setAuthenticated(true)
          router.push("/dashboard")
        } else {
          // Reset if PINs don't match
          setIsSettingPin(false)
          setConfirmPin("")
        }
      }
    } else {
      // Verifying existing PIN
      const storedPin = storage.getPin()
      if (pin === storedPin) {
        storage.setAuthenticated(true)
        router.push("/dashboard")
      } else {
        // Handle wrong PIN (could add error state here)
        console.log("Wrong PIN")
      }
    }
  }

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

  if (!hasPin) {
    return (
      <PinInput
        onPinEnter={handlePinEnter}
        title={isSettingPin ? "Confirm PIN" : "Set PIN"}
        description={isSettingPin ? "Please confirm your 4-digit PIN" : "Create a 4-digit PIN to secure your app"}
        isConfirm={isSettingPin}
      />
    )
  }

  return (
    <PinInput onPinEnter={handlePinEnter} title="Enter PIN" description="Enter your 4-digit PIN to access ByajBook" />
  )
}
