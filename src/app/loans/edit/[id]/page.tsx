"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft } from "lucide-react"
import { storage, type Loan } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

export default function EditLoanPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useLanguage()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [formData, setFormData] = useState({
    borrowerName: "",
    borrowerPhone: "",
    notes: "",
    amount: "",
    interestRate: "",
    interestMethod: "monthly" as "monthly" | "yearly" | "sankda",
    interestType: "simple" as "simple" | "compound",
    years: "",
    dateCreated: new Date() as Date,
    expectedReturnDate: null as Date | null,
    dueDate: null as Date | null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!storage.isAuthenticated()) {
      router.push("/")
      return
    }

    const loanId = params.id as string
    const loanData = storage.getLoanById(loanId)
    
    if (!loanData) {
      router.push("/dashboard")
      return
    }

    setLoan(loanData)
    setFormData({
      borrowerName: loanData.borrowerName,
      borrowerPhone: loanData.borrowerPhone,
      notes: loanData.notes,
      amount: loanData.amount.toString(),
      interestRate: loanData.interestMethod === "sankda" ? "12" : loanData.interestRate.toString(),
      interestMethod: loanData.interestMethod,
      interestType: loanData.interestType || "simple", // Default to simple for existing loans
      years: (loanData.years || 1).toString(), // Default to 1 year for existing loans without years
      dateCreated: new Date(loanData.dateCreated),
      expectedReturnDate: loanData.expectedReturnDate ? new Date(loanData.expectedReturnDate) : null,
      dueDate: loanData.dueDate ? new Date(loanData.dueDate) : null,
    })
    setIsLoading(false)
  }, [params.id, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.borrowerName.trim()) {
      newErrors.borrowerName = t("borrowerNameRequired")
    }

    if (!formData.amount || Number.parseFloat(formData.amount) <= 0) {
      newErrors.amount = t("validAmountRequired")
    }

    if (!formData.interestRate || Number.parseFloat(formData.interestRate) < 0) {
      newErrors.interestRate = t("validInterestRequired")
    }

    if (!formData.years || Number.parseFloat(formData.years) <= 0) {
      newErrors.years = t("validYearsRequired")
    }

    if (!formData.dueDate) {
      newErrors.dueDate = t("dueDateRequired") || "Due date is required"
    }

    if (formData.borrowerPhone && !/^\d{10}$/.test(formData.borrowerPhone.replace(/\D/g, ""))) {
      newErrors.borrowerPhone = t("validPhoneRequired")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !loan) return

    setIsSubmitting(true)

    try {
      const updatedLoan: Partial<Loan> = {
        borrowerName: formData.borrowerName.trim(),
        borrowerPhone: formData.borrowerPhone.trim(),
        notes: formData.notes.trim(),
        amount: Number.parseFloat(formData.amount),
        interestRate: formData.interestMethod === "sankda" ? 12 : Number.parseFloat(formData.interestRate),
        interestMethod: formData.interestMethod,
        interestType: formData.interestType,
        years: Number.parseFloat(formData.years),
        dateCreated: formData.dateCreated.toISOString(),
        expectedReturnDate: formData.expectedReturnDate ? formData.expectedReturnDate.toISOString() : undefined,
        dueDate: formData.dueDate!.toISOString(),
      }

      const success = storage.updateLoan(loan.id, updatedLoan)
      
      if (success) {
        router.push("/dashboard")
      } else {
        setErrors({ general: t("failedToUpdateLoan") })
      }
    } catch (error) {
      console.error("Error updating loan:", error)
      setErrors({ general: t("errorUpdatingLoan") })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | Date | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("loanNotFound")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{t("editLoan")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("borrowerInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="borrowerName">{t("borrowerName")} {t("required")}</Label>
                <Input
                  id="borrowerName"
                  value={formData.borrowerName}
                  onChange={(e) => handleInputChange("borrowerName", e.target.value)}
                  placeholder={t("borrowerNamePlaceholder")}
                  className={errors.borrowerName ? "border-destructive" : ""}
                />
                {errors.borrowerName && <p className="text-destructive text-sm mt-1">{errors.borrowerName}</p>}
              </div>

              <div>
                <Label htmlFor="borrowerPhone">{t("phoneNumber")}</Label>
                <Input
                  id="borrowerPhone"
                  value={formData.borrowerPhone}
                  onChange={(e) => handleInputChange("borrowerPhone", e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className={errors.borrowerPhone ? "border-destructive" : ""}
                />
                {errors.borrowerPhone && <p className="text-destructive text-sm mt-1">{errors.borrowerPhone}</p>}
              </div>

              <div>
                <Label htmlFor="notes">{t("notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("loanDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount">{t("loanAmount")} (₹) {t("required")}</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className={errors.amount ? "border-destructive" : ""}
                />
                {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label htmlFor="interestMethod">{t("interestMethod")} {t("required")}</Label>
                <Select
                  value={formData.interestMethod}
                  onValueChange={(value: "monthly" | "yearly" | "sankda") => handleInputChange("interestMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("monthly")}</SelectItem>
                    <SelectItem value="yearly">{t("yearly")}</SelectItem>
                    <SelectItem value="sankda">{t("sankdaFixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interestType">{t("interestType")} {t("required")}</Label>
                <Select
                  value={formData.interestType}
                  onValueChange={(value: "simple" | "compound") => handleInputChange("interestType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">
                      <div className="flex flex-col">
                        <span>{t("simpleInterest")}</span>
                        <span className="text-xs text-muted-foreground">{t("simpleInterestDesc")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="compound">
                      <div className="flex flex-col">
                        <span>{t("compoundInterest")}</span>
                        <span className="text-xs text-muted-foreground">{t("compoundInterestDesc")}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.interestMethod !== "sankda" && (
                <div>
                  <Label htmlFor="interestRate">{t("interestRate")} (%) {t("required")}</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={formData.interestRate}
                    onChange={(e) => handleInputChange("interestRate", e.target.value)}
                    placeholder={t("interestPlaceholder")}
                    className={errors.interestRate ? "border-destructive" : ""}
                  />
                  {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="years">{t("loanPeriod")} ({t("years")}) {t("required")}</Label>
                <Input
                  id="years"
                  type="number"
                  step="0.5"
                  value={formData.years}
                  onChange={(e) => handleInputChange("years", e.target.value)}
                  placeholder={t("yearsPlaceholder")}
                  className={errors.years ? "border-destructive" : ""}
                />
                {errors.years && <p className="text-destructive text-sm mt-1">{errors.years}</p>}
              </div>

              {formData.interestMethod === "sankda" && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t("sankdaDescription")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dateCreated">Loan Date {t("required")}</Label>
                <DatePicker
                  value={formData.dateCreated}
                  onChange={(date) => handleInputChange("dateCreated", date || new Date())}
                  placeholder="Select loan date"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The date when the loan was given to the borrower
                </p>
              </div>

              <div>
                <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                <DatePicker
                  value={formData.expectedReturnDate || undefined}
                  onChange={(date) => handleInputChange("expectedReturnDate", date || null)}
                  placeholder="Select expected return date"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The expected date to receive the money back (optional)
                </p>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date {t("required")}</Label>
                <DatePicker
                  value={formData.dueDate || undefined}
                  onChange={(date) => handleInputChange("dueDate", date || null)}
                  placeholder="Select due date"
                  className={errors.dueDate ? "border-destructive" : ""}
                />
                {errors.dueDate && <p className="text-destructive text-sm mt-1">{errors.dueDate}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  The date when the loan payment is due (required for reminders)
                </p>
              </div>
            </CardContent>
          </Card>

          {errors.general && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
              <p className="text-destructive text-sm">{errors.general}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => router.back()}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? t("updating") : t("updateLoan")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
