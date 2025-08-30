"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/components/language-provider"
import { storage, ReminderSettings } from "@/lib/storage"
import { Bell } from "lucide-react"

export function ReminderSettingsCard() {
  const [settings, setSettings] = useState<ReminderSettings>({ daysBeforeDue: 2, isEnabled: true })
  const { t } = useLanguage()

  useEffect(() => {
    const currentSettings = storage.getReminderSettings()
    setSettings(currentSettings)
  }, [])

  const handleToggleReminders = (enabled: boolean) => {
    const newSettings = { ...settings, isEnabled: enabled }
    setSettings(newSettings)
    storage.setReminderSettings(newSettings)
  }

  const handleDaysChange = (days: string) => {
    const newSettings = { ...settings, daysBeforeDue: parseInt(days) as 1 | 2 | 3 }
    setSettings(newSettings)
    storage.setReminderSettings(newSettings)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell size={20} />
          <span>{t("reminderSettings")}</span>
        </CardTitle>
        <CardDescription>
          {t("showRemindersBefore")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enable-reminders" className="text-sm font-medium">
            {t("enableReminders")}
          </Label>
          <Switch
            id="enable-reminders"
            checked={settings.isEnabled}
            onCheckedChange={handleToggleReminders}
          />
        </div>

        {settings.isEnabled && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("reminderDays")}</Label>
            <Select
              value={settings.daysBeforeDue.toString()}
              onValueChange={handleDaysChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 {t("day")}</SelectItem>
                <SelectItem value="2">2 {t("days")}</SelectItem>
                <SelectItem value="3">3 {t("days")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
