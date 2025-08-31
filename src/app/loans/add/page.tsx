"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft, Plus } from "lucide-react"
import { storage, type Loan } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

export default function AddLoanPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const borrowerNameRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
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

  // Auto-focus the first input when component mounts. If navigation included
  // ?autofocus=borrowerName then focus and attempt a re-focus shortly after
  // to trigger the on-screen keyboard on mobile devices.
  useEffect(() => {
    const autofocusTarget = searchParams?.get("autofocus")
    // If the query explicitly requests the borrowerName OR there's no
    // autofocus param at all, we attempt to autofocus the input.
    const shouldAutofocus = autofocusTarget === "borrowerName" || !searchParams?.get("autofocus")

    if (!shouldAutofocus) return
    const el = borrowerNameRef.current
    if (!el) return

    // Helper to focus and move cursor to end
    const focusAndMoveCursor = () => {
      try {
        el.focus()
        const len = el.value?.length || 0
        el.setSelectionRange(len, len)
      } catch (err) {
        // ignore focus errors
      }
    }

    // Multiple attempts increase reliability on mobile browsers which may
    // require focus inside a user gesture or after rendering settles.
    focusAndMoveCursor() // immediate

    const rafId = window.requestAnimationFrame(() => focusAndMoveCursor())
    const t1 = window.setTimeout(() => focusAndMoveCursor(), 120)
    const t2 = window.setTimeout(() => focusAndMoveCursor(), 350)

    // As a fallback, listen for the first touchstart (user gesture) and
    // re-focus once. This listener is removed after it's invoked.
    const onFirstTouch = () => {
      focusAndMoveCursor()
      window.removeEventListener("touchstart", onFirstTouch)
    }
    window.addEventListener("touchstart", onFirstTouch, { once: true })

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener("touchstart", onFirstTouch)
    }
  }, [searchParams])

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
      newErrors.years = t("validYearsRequired") || "Valid loan period is required"
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

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const newLoan: Loan = {
        id: Date.now().toString(),
        borrowerName: formData.borrowerName.trim(),
        borrowerPhone: formData.borrowerPhone.trim(),
        notes: formData.notes.trim(),
        amount: Number.parseFloat(formData.amount),
        interestRate: formData.interestMethod === "sankda" ? 12 : Number.parseFloat(formData.interestRate),
        interestMethod: formData.interestMethod,
        interestType: formData.interestType,
        years: formData.years ? Number.parseFloat(formData.years) : 1, // Default to 1 year if not provided
        dateCreated: formData.dateCreated.toISOString(),
        expectedReturnDate: formData.expectedReturnDate ? formData.expectedReturnDate.toISOString() : undefined,
        dueDate: formData.dueDate!.toISOString(),
        totalPaid: 0,
        isActive: true,
      }

      const existingLoans = storage.getLoans()
      storage.saveLoans([...existingLoans, newLoan])

      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving loan:", error)
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
            <div className="p-1">
              <Plus size={24} />
            </div>
            <h1 className="text-xl font-bold">{t("addNewLoan")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
  <form onSubmit={handleSubmit} className="space-y-6 theme-golden">
          <Card>
            <CardHeader>
              <CardTitle>{t("borrowerInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="borrowerName" className="mb-2 block">{t("borrowerName")} {t("required")}</Label>
                <Input
                  ref={borrowerNameRef}
                  id="borrowerName"
                  value={formData.borrowerName}
                  onChange={(e) => handleInputChange("borrowerName", e.target.value)}
                  placeholder={t("borrowerNamePlaceholder")}
                  className={errors.borrowerName ? "border-destructive" : ""}
                />
                {errors.borrowerName && <p className="text-destructive text-sm mt-1">{errors.borrowerName}</p>}
              </div>

              <div>
                <Label htmlFor="borrowerPhone" className="mb-2 block">{t("phoneNumber")}</Label>
                <Input
                  id="borrowerPhone"
                  type="tel"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={10}
                  value={formData.borrowerPhone}
                  onChange={(e) => {
                    // Keep only digits and limit to 10 characters
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                    handleInputChange("borrowerPhone", digits)
                  }}
                  onKeyDown={(e) => {
                    // Allow control keys and digits only
                    const allowedKeys = [
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                    ]
                    if (allowedKeys.includes(e.key)) return
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 10)
                    // Prevent the default paste and set sanitized value instead
                    e.preventDefault()
                    handleInputChange("borrowerPhone", pasted)
                  }}
                  placeholder={t("phonePlaceholder")}
                  className={errors.borrowerPhone ? "border-destructive" : "border-border"}
                />
                {errors.borrowerPhone && <p className="text-destructive text-sm mt-1">{errors.borrowerPhone}</p>}
              </div>

              <div>
                <Label htmlFor="notes" className="mb-2 block">{t("notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                  className="border-border"
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
                <Label htmlFor="amount" className="mb-2 block">{t("loanAmount")} (₹) {t("required")}</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder={t("amountPlaceholder")}
                  className={errors.amount ? "border-destructive" : "border-border"}
                />
                {errors.amount && <p className="text-destructive text-sm mt-1">{errors.amount}</p>}
              </div>

              <div>
                <Label htmlFor="interestMethod" className="mb-2 block">{t("interestMethod")} {t("required")}</Label>
                <Select
                  value={formData.interestMethod}
                  onValueChange={(value: "monthly" | "yearly" | "sankda") => handleInputChange("interestMethod", value)}
                >
                  <SelectTrigger className="border-border">
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
                <Label htmlFor="interestType" className="mb-2 block">{t("interestType")} {t("required")}</Label>
                <Select
                  value={formData.interestType}
                  onValueChange={(value: "simple" | "compound") => handleInputChange("interestType", value)}
                >
                  <SelectTrigger className="border-border">
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
                  <Label htmlFor="interestRate" className="mb-2 block">{t("interestRate")} (%) {t("required")}</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    value={formData.interestRate}
                    onChange={(e) => handleInputChange("interestRate", e.target.value)}
                    placeholder={t("interestPlaceholder")}
                    className={errors.interestRate ? "border-destructive" : "border-border"}
                  />
                  {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate}</p>}
                </div>
              )}

              <div>
                <Label htmlFor="years" className="mb-2 block">{t("loanPeriod")} ({t("years")}) {t("required")}</Label>
                <Input
                  id="years"
                  type="number"
                  step="0.5"
                  value={formData.years}
                  onChange={(e) => handleInputChange("years", e.target.value)}
                  placeholder={t("yearsPlaceholder")}
                  className={errors.years ? "border-destructive" : "border-border"}
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
                <Label htmlFor="dateCreated" className="mb-2 block">Loan Date {t("required")}</Label>
                <DatePicker
                  value={formData.dateCreated}
                  onChange={(date) => handleInputChange("dateCreated", date || new Date())}
                  placeholder="Select loan date"
                  className="border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The date when the loan was given to the borrower
                </p>
              </div>

              <div>
                <Label htmlFor="expectedReturnDate" className="mb-2 block">Expected Return Date</Label>
                <DatePicker
                  value={formData.expectedReturnDate || undefined}
                  onChange={(date) => handleInputChange("expectedReturnDate", date || null)}
                  placeholder="Select expected return date"
                  className="border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The expected date to receive the money back (optional)
                </p>
              </div>

              <div>
                <Label htmlFor="dueDate" className="mb-2 block">Due Date {t("required")}</Label>
                <DatePicker
                  value={formData.dueDate || undefined}
                  onChange={(date) => handleInputChange("dueDate", date || null)}
                  placeholder="Select due date"
                  className={errors.dueDate ? "border-destructive" : "border-border"}
                />
                {errors.dueDate && <p className="text-destructive text-sm mt-1">{errors.dueDate}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  The date when the loan payment is due (required for reminders)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Preview */}
          {formData.amount && formData.years && (formData.interestRate || formData.interestMethod === "sankda") && (
            <Card>
              <CardHeader>
                <CardTitle>{t("calculationPreview")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const amount = Number.parseFloat(formData.amount)
                  const years = Number.parseFloat(formData.years)
                  const rate = formData.interestMethod === "sankda" ? 12 : Number.parseFloat(formData.interestRate)
                  
                  if (amount > 0 && years > 0 && rate >= 0) {
                    let finalAmount = 0
                    let interestAmount = 0

                    if (formData.interestType === "simple") {
                      // Simple Interest: A = P + (P * r * t) / 100
                      interestAmount = (amount * rate * years) / 100
                      finalAmount = amount + interestAmount
                    } else {
                      // Compound Interest: A = P * (1 + r/100)^t
                      finalAmount = amount * Math.pow(1 + rate / 100, years)
                      interestAmount = finalAmount - amount
                    }

                    return (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between p-3 bg-muted rounded-lg">
                          <span className="text-muted-foreground">{t("loanAmount")}:</span>
                          <span className="font-semibold">₹{amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-accent rounded-lg">
                          <span className="text-accent-foreground/80">{t("interestAmount")}:</span>
                          <span className="font-semibold text-accent-foreground">₹{interestAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-primary rounded-lg text-primary-foreground">
                          <span className="opacity-80">{t("finalPayableAmount")}:</span>
                          <span className="font-bold text-lg">₹{finalAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          {t("interestType")}: {t(formData.interestType === "simple" ? "simpleInterest" : "compoundInterest")} | 
                          {t("interestMethod")}: {t(formData.interestMethod === "monthly" ? "monthlyInterest" : formData.interestMethod === "yearly" ? "yearlyInterest" : "sankdaFixed")} | 
                          {t("loanPeriod")}: {years} {t("years")}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent border border-border text-foreground" onClick={() => router.back()}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? t("adding") : t("addLoan")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
