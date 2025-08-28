"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { LanguageSelector } from "@/components/language-selector"
import { PinInput } from "@/components/pin-input"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { Lock, LogOut, Trash2, Download, Upload, Info, Shield } from "lucide-react"

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPinChange, setShowPinChange] = useState(false)
  const [pinChangeStep, setPinChangeStep] = useState<"current" | "new" | "confirm">("current")
  const [tempPin, setTempPin] = useState("")
  const [showDataExport, setShowDataExport] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    if (!storage.isAuthenticated()) {
      router.push("/")
      return
    }
    setIsAuthenticated(true)
  }, [router])

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
      <PinInput onPinEnter={handlePinChange} title={titles[pinChangeStep]} description={descriptions[pinChangeStep]} />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("settings")}</h1>
          <LanguageSelector />
        </div>
      </div>

      {/* Settings Options */}
      <div className="p-6 space-y-4">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield size={20} />
              <span>{t("security")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => setShowPinChange(true)}
            >
              <Lock size={16} className="mr-2" />
              {t("changePIN")}
            </Button>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t("pinProtection")}
              </p>
            </div>
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
