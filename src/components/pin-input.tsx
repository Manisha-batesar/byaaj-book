"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PinInputProps {
  onPinEnter: (pin: string) => void
  title: string
  description: string
  isConfirm?: boolean
}

export function PinInput({ onPinEnter, title, description, isConfirm = false }: PinInputProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num
      setPin(newPin)
      setError("")

      if (newPin.length === 4) {
        setTimeout(() => onPinEnter(newPin), 100)
      }
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
    setError("")
  }

  const handleClear = () => {
    setPin("")
    setError("")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/bb-logo.png" alt="ByajBook" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center space-x-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"
              >
                {pin.length > index && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
            ))}
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                className="h-14 text-lg font-semibold bg-transparent"
                onClick={() => handleNumberClick(num.toString())}
              >
                {num}
              </Button>
            ))}
            <Button variant="outline" size="lg" className="h-14 bg-transparent" onClick={handleClear}>
              Clear
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 text-lg font-semibold bg-transparent"
              onClick={() => handleNumberClick("0")}
            >
              0
            </Button>
            <Button variant="outline" size="lg" className="h-14 bg-transparent" onClick={handleDelete}>
              ⌫
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
