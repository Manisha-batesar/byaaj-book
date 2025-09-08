"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bug } from "lucide-react"
import Link from "next/link"
import { VoiceDebugPanel } from "@/components/voice-debug-panel"

export default function VoiceDebugPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-6">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Bug size={24} />
          <h1 className="text-xl font-bold">Voice System Debug</h1>
        </div>
      </div>

      <VoiceDebugPanel />
    </div>
  )
}
