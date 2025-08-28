"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { storage, type Loan } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

export default function AddLoanPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    borrowerName: "",
    borrowerPhone: "",
    notes: "",
    amount: "",
    interestRate: "",
    interestMethod: "monthly" as "monthly" | "yearly" | "sankda",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        dateCreated: new Date().toISOString(),
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{t("addNewLoan")}</h1>
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

              {formData.interestMethod === "sankda" && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t("sankdaDescription")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex space-x-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => router.back()}>
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
