"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/components/language-provider"
import { storage, DueReminder } from "@/lib/storage"
import { Bell, Clock, AlertTriangle, Calendar } from "lucide-react"

export function DueReminders() {
  const [reminders, setReminders] = useState<DueReminder[]>([])
  const { t } = useLanguage()

  useEffect(() => {
    const loadReminders = () => {
      const dueReminders = storage.getDueReminders()
      setReminders(dueReminders)
    }

    loadReminders()
    
    // Refresh reminders every minute
    const interval = setInterval(loadReminders, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (reminders.length === 0) {
    return null
  }

  const overdueReminders = reminders.filter(r => r.isOverdue)
  const upcomingReminders = reminders.filter(r => !r.isOverdue)

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Bell size={18} className="text-orange-500" />
        <h3 className="font-semibold text-lg">{t("dueReminders")}</h3>
      </div>

      {/* Overdue Loans */}
      {overdueReminders.length > 0 && (
        <div className="space-y-2">
          {overdueReminders.map((reminder) => (
            <Alert key={reminder.id} className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-red-800">
                      {t("reminderFor")} {reminder.borrowerName}
                    </p>
                    <p className="text-sm text-red-600">
                      ₹{reminder.amount.toLocaleString()} - {t("overdueBy")} {Math.abs(reminder.daysUntilDue)} {Math.abs(reminder.daysUntilDue) === 1 ? t("day") : t("days")}
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-2">
                    {t("overdue")}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Upcoming Due Loans */}
      {upcomingReminders.length > 0 && (
        <div className="space-y-2">
          {upcomingReminders.map((reminder) => (
            <Alert key={reminder.id} className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-orange-800">
                      {t("reminderFor")} {reminder.borrowerName}
                    </p>
                    <p className="text-sm text-orange-600">
                      ₹{reminder.amount.toLocaleString()} - {
                        reminder.daysUntilDue === 0 
                          ? t("dueToday")
                          : `${t("dueIn")} ${reminder.daysUntilDue} ${reminder.daysUntilDue === 1 ? t("day") : t("days")}`
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 border-orange-300 text-orange-700">
                    {reminder.daysUntilDue === 0 ? t("dueToday") : `${reminder.daysUntilDue} ${reminder.daysUntilDue === 1 ? t("day") : t("days")}`}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  )
}
