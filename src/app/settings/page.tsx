"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { LanguageSelector } from "@/components/language-selector"
import { PinInput } from "@/components/pin-input"
import { ReminderSettingsCard } from "@/components/reminder-settings"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { Lock, LogOut, Trash2, Download, Upload, Info, Shield, Bell, Bot, Sparkles } from "lucide-react"

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPinChange, setShowPinChange] = useState(false)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [pinChangeStep, setPinChangeStep] = useState<"current" | "new" | "confirm">("current")
  const [pinSetupStep, setPinSetupStep] = useState<"new" | "confirm">("new")
  const [tempPin, setTempPin] = useState("")
  const [showDataExport, setShowDataExport] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const router = useRouter()
  const { t, language } = useLanguage()

  useEffect(() => {
    // No longer redirect based on authentication since PIN is optional
    setIsAuthenticated(true)
    
    // Check if PIN exists
    const existingPin = storage.getPin()
    setHasPin(!!existingPin)
  }, [])

  const handleLogout = () => {
    storage.setAuthenticated(false)
    router.push("/")
  }

  const handleClearData = () => {
    if (confirm(t("clearDataConfirm"))) {
      localStorage.clear()
      router.push("/")
    }
  }

  const handlePinChange = (pin: string) => {
    switch (pinChangeStep) {
      case "current":
        if (pin === storage.getPin()) {
          setPinChangeStep("new")
        } else {
          alert(t("incorrectPIN"))
          setShowPinChange(false)
          setPinChangeStep("current")
        }
        break
      case "new":
        setTempPin(pin)
        setPinChangeStep("confirm")
        break
      case "confirm":
        if (pin === tempPin) {
          storage.setPin(pin)
          alert(t("pinChangedSuccess"))
          setShowPinChange(false)
          setPinChangeStep("current")
          setTempPin("")
        } else {
          alert(t("pinsDoNotMatch"))
          setPinChangeStep("new")
          setTempPin("")
        }
        break
    }
  }

  const handlePinSetup = (pin: string) => {
    switch (pinSetupStep) {
      case "new":
        setTempPin(pin)
        setPinSetupStep("confirm")
        break
      case "confirm":
        if (pin === tempPin) {
          storage.setPin(pin)
          alert(t("pinChangedSuccess"))
          setShowPinSetup(false)
          setPinSetupStep("new")
          setTempPin("")
          setHasPin(true)
        } else {
          alert(t("pinsDoNotMatch"))
          setPinSetupStep("new")
          setTempPin("")
        }
        break
    }
  }

  const handleDeletePin = () => {
    if (confirm(t("deletePINConfirm"))) {
      storage.deletePin()
      alert(t("pinDeletedSuccess"))
      setHasPin(false)
    }
  }

  const exportData = () => {
    const data = {
      loans: storage.getLoans(),
      payments: storage.getPayments(),
      exportDate: new Date().toISOString(),
      version: "1.0",
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `byajbook-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        if (data.loans && data.payments) {
          if (confirm(t("replaceDataConfirm"))) {
            storage.saveLoans(data.loans)
            storage.savePayments(data.payments)
            alert(t("dataImportedSuccess"))
            window.location.reload()
          }
        } else {
          alert(t("invalidBackupFile"))
        }
      } catch (error) {
        alert(t("errorReadingBackup"))
      }
    }
    reader.readAsText(file)
  }

  if (!isAuthenticated) {
    return null
  }

  if (showPinChange) {
    const titles = {
      current: t("enterCurrentPIN"),
      new: t("enterNewPIN"),
      confirm: t("confirmNewPIN"),
    }
    const descriptions = {
      current: t("enterCurrentPINDesc"),
      new: t("createNewPINDesc"),
      confirm: t("confirmNewPINDesc"),
    }

    return (
      <PinInput
        key={`pin-change-${pinChangeStep}`}
        onPinEnter={handlePinChange}
        title={titles[pinChangeStep]}
        description={descriptions[pinChangeStep]}
      />
    )
  }

  if (showPinSetup) {
    const titles = {
      new: t("enterNewPIN"),
      confirm: t("confirmNewPIN"),
    }
    const descriptions = {
      new: t("setPINDesc"),
      confirm: t("confirmNewPINDesc"),
    }

    return (
      <PinInput
        key={`pin-setup-${pinSetupStep}`}
        onPinEnter={handlePinSetup}
        title={titles[pinSetupStep]}
        description={descriptions[pinSetupStep]}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("settings")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Settings Options */}
      <div className="p-6 space-y-4">
        {/* AI Features Info */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot size={20} className="text-primary" />
              <span>{language === 'hi' ? 'AI सुविधाएं' : 'AI Features'}</span>
              <Sparkles size={16} className="text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'hi' 
                  ? 'AI सुविधाएं डैशबोर्ड से उपलब्ध हैं - कोई सेटअप की आवश्यकता नहीं!'
                  : 'AI features are available from the dashboard - no setup required!'
                }
              </p>
              <div className="bg-white/80 p-3 rounded-lg border border-primary/20">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-primary" />
                    <span>{language === 'hi' ? '🤖 AI असिस्टेंट चैट' : '🤖 AI Assistant Chat'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-blue-500 rounded-full"></span>
                    <span>{language === 'hi' ? '🔍 स्मार्ट खोज' : '🔍 Smart Search'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 bg-green-500 rounded-full"></span>
                    <span>{language === 'hi' ? '🎤 वॉइस कमांड' : '🎤 Voice Commands'}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'hi' 
                  ? 'डैशबोर्ड के हेडर में AI बटन देखें'
                  : 'Look for the AI buttons in the dashboard header'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield size={20} />
              <span>{t("security")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasPin ? (
              // Show "Set PIN" option when no PIN exists
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => setShowPinSetup(true)}
              >
                <Lock size={16} className="mr-2" />
                {t("setPIN")}
              </Button>
            ) : (
              // Show "Change PIN" and "Delete PIN" options when PIN exists
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => setShowPinChange(true)}
                >
                  <Lock size={16} className="mr-2" />
                  {t("changePIN")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleDeletePin}
                >
                  <Trash2 size={16} className="mr-2" />
                  {t("deletePIN")}
                </Button>
              </>
            )}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {hasPin ? t("pinProtection") : t("setPINDesc")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell size={20} />
              <span>{t("reminderSettings")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReminderSettingsCard />
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download size={20} />
              <span>{t("dataManagement")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent" onClick={exportData}>
              <Download size={16} className="mr-2" />
              {t("exportData")}
            </Button>

            <div>
              <input type="file" accept=".json" onChange={importData} className="hidden" id="import-file" />
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => document.getElementById("import-file")?.click()}
              >
                <Upload size={16} className="mr-2" />
                {t("importData")}
              </Button>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t("dataBackupInfo")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info size={20} />
              <span>{t("appInformation")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t("version")}</p>
                <p className="font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("storage")}</p>
                <p className="font-semibold">{t("localDevice")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("totalLoans")}</p>
                <p className="font-semibold">{storage.getLoans().length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("totalPayments")}</p>
                <p className="font-semibold">{storage.getPayments().length}</p>
              </div>
            </div>

            <div className="bg-accent p-3 rounded-lg">
              <p className="text-sm text-accent-foreground">
                <strong>{t("appName")}</strong> - {t("appDescription")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock size={20} />
              <span>{t("privacyData")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <p className="text-sm font-medium">{t("dataPrivacyInfo")}</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("dataPrivacyPoint1")}</li>
                <li>• {t("dataPrivacyPoint2")}</li>
                <li>• {t("dataPrivacyPoint3")}</li>
                <li>• {t("dataPrivacyPoint4")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trash2 size={20} />
              <span>{t("dangerZone")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" className="w-full justify-start" onClick={handleClearData}>
              <Trash2 size={16} className="mr-2" />
              {t("clearAllData")}
            </Button>
            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-sm text-destructive">
                {t("dangerZoneInfo")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" />
              {t("logout")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
