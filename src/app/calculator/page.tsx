"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calculator, IndianRupee } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

interface CalculationResult {
  principal: number
  interestAmount: number
  totalAmount: number
  monthlyInterest?: number
  effectiveRate: number
}

export default function CalculatorPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    principal: "",
    interestRate: "",
    timePeriod: "",
    timeUnit: "months" as "months" | "years",
    calculationMethod: "monthly" as "monthly" | "yearly" | "sankda",
    interestType: "simple" as "simple" | "compound",
  })
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.principal || Number.parseFloat(formData.principal) <= 0) {
      newErrors.principal = t("validPrincipalRequired")
    }

    if (formData.calculationMethod !== "sankda") {
      if (!formData.interestRate || Number.parseFloat(formData.interestRate) <= 0) {
        newErrors.interestRate = t("validInterestRequired")
      }
    }

    if (!formData.timePeriod || Number.parseFloat(formData.timePeriod) <= 0) {
      newErrors.timePeriod = t("validTimeRequired")
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const calculateInterest = () => {
    if (!validateForm()) return

    const principal = Number.parseFloat(formData.principal)
    const timePeriod = Number.parseFloat(formData.timePeriod)
    const interestRate = formData.calculationMethod === "sankda" ? 12 : Number.parseFloat(formData.interestRate)

    let interestAmount = 0
    let monthlyInterest = 0
    let effectiveRate = interestRate
    let totalAmount = 0

    // Convert time period to appropriate units for calculation
    const timeInMonths = formData.timeUnit === "years" ? timePeriod * 12 : timePeriod
    const timeInYears = formData.timeUnit === "years" ? timePeriod : timePeriod / 12

    if (formData.interestType === "simple") {
      // Simple Interest Calculations
      switch (formData.calculationMethod) {
        case "monthly":
          // Monthly simple interest calculation
          monthlyInterest = (principal * interestRate) / 100
          interestAmount = monthlyInterest * timeInMonths
          break

        case "yearly":
          // Yearly simple interest calculation: A = P + (P * r * t) / 100
          interestAmount = (principal * interestRate * timeInYears) / 100
          monthlyInterest = interestAmount / timeInMonths
          break

        case "sankda":
          // Sankda method (12% yearly, but calculated monthly)
          const yearlyInterest = (principal * 12) / 100
          monthlyInterest = yearlyInterest / 12
          interestAmount = monthlyInterest * timeInMonths
          effectiveRate = 12
          break
      }
      totalAmount = principal + interestAmount
    } else {
      // Compound Interest Calculations: A = P * (1 + r/100)^t
      switch (formData.calculationMethod) {
        case "monthly":
          // Monthly compound interest: A = P * (1 + r/100)^t
          totalAmount = principal * Math.pow(1 + interestRate / 100, timeInMonths)
          interestAmount = totalAmount - principal
          monthlyInterest = interestAmount / timeInMonths // Average monthly interest
          break

        case "yearly":
          // Yearly compound interest: A = P * (1 + r/100)^t
          totalAmount = principal * Math.pow(1 + interestRate / 100, timeInYears)
          interestAmount = totalAmount - principal
          monthlyInterest = interestAmount / timeInMonths // Average monthly interest
          break

        case "sankda":
          // Sankda method with compound interest (12% yearly compounded)
          totalAmount = principal * Math.pow(1 + 12 / 100, timeInYears)
          interestAmount = totalAmount - principal
          monthlyInterest = interestAmount / timeInMonths // Average monthly interest
          effectiveRate = 12
          break
      }
    }

    setResult({
      principal,
      interestAmount,
      totalAmount,
      monthlyInterest,
      effectiveRate,
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    // Clear result when inputs change
    if (result) {
      setResult(null)
    }
  }

  const resetCalculator = () => {
    setFormData({
      principal: "",
      interestRate: "",
      timePeriod: "",
      timeUnit: "months",
      calculationMethod: "monthly",
      interestType: "simple",
    })
    setResult(null)
    setErrors({})
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
            <Calculator size={24} />
            <h1 className="text-xl font-bold">{t("interestCalculator")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("calculateInterest")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="principal">{t("principalAmount")} (₹) {t("required")}</Label>
              <Input
                id="principal"
                type="number"
                value={formData.principal}
                onChange={(e) => handleInputChange("principal", e.target.value)}
                placeholder={t("enterPrincipalAmount")}
                className={errors.principal ? "border-destructive" : ""}
              />
              {errors.principal && <p className="text-destructive text-sm mt-1">{errors.principal}</p>}
            </div>

            <div>
              <Label htmlFor="calculationMethod">{t("calculationMethod")} {t("required")}</Label>
              <Select
                value={formData.calculationMethod}
                onValueChange={(value: "monthly" | "yearly" | "sankda") =>
                  handleInputChange("calculationMethod", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("monthlyInterest")}</SelectItem>
                  <SelectItem value="yearly">{t("yearlyInterest")}</SelectItem>
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

            {formData.calculationMethod !== "sankda" && (
              <div>
                <Label htmlFor="interestRate">{t("interestRate")} (%) {t("required")}</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  placeholder={t("enterInterestRate")}
                  className={errors.interestRate ? "border-destructive" : ""}
                />
                {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate}</p>}
              </div>
            )}

            {formData.calculationMethod === "sankda" && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">{t("sankdaMethodInfo")}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timePeriod">{t("timePeriod")} {t("required")}</Label>
                <Input
                  id="timePeriod"
                  type="number"
                  value={formData.timePeriod}
                  onChange={(e) => handleInputChange("timePeriod", e.target.value)}
                  placeholder={t("enterTime")}
                  className={errors.timePeriod ? "border-destructive" : ""}
                />
                {errors.timePeriod && <p className="text-destructive text-sm mt-1">{errors.timePeriod}</p>}
              </div>
              <div>
                <Label htmlFor="timeUnit">{t("unit")}</Label>
                <Select
                  value={formData.timeUnit}
                  onValueChange={(value: "months" | "years") => handleInputChange("timeUnit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">{t("months")}</SelectItem>
                    <SelectItem value="years">{t("years")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={calculateInterest} className="flex-1">
                {t("calculate")}
              </Button>
              <Button variant="outline" onClick={resetCalculator} className="bg-transparent">
                {t("reset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <IndianRupee size={20} />
                <span>{t("calculationResults")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("principalAmount")}</p>
                  <p className="text-2xl font-bold">₹{result.principal.toLocaleString()}</p>
                </div>

                <div className="bg-accent p-4 rounded-lg">
                  <p className="text-sm text-accent-foreground/80">{t("totalInterest")}</p>
                  <p className="text-2xl font-bold text-accent-foreground">₹{result.interestAmount.toLocaleString()}</p>
                </div>

                <div className="bg-primary p-4 rounded-lg text-primary-foreground">
                  <p className="text-sm opacity-80">{t("totalAmount")}</p>
                  <p className="text-3xl font-bold">₹{result.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("effectiveRate")}:</span>
                  <span className="font-semibold">
                    {result.effectiveRate}% {t(formData.calculationMethod)}
                  </span>
                </div>

                {result.monthlyInterest && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("monthlyInterestLabel")}:</span>
                    <span className="font-semibold">₹{result.monthlyInterest.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("timePeriod")}:</span>
                  <span className="font-semibold">
                    {formData.timePeriod} {t(formData.timeUnit)}
                  </span>
                </div>
              </div>

              {/* Method Explanation */}
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">{t("methodExplanation")}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>{t("interestType")}:</strong> {t(formData.interestType === "simple" ? "simpleInterest" : "compoundInterest")}</p>
                  <p><strong>{t("calculationMethod")}:</strong> {t(formData.calculationMethod === "monthly" ? "monthlyInterest" : formData.calculationMethod === "yearly" ? "yearlyInterest" : "sankdaFixed")}</p>
                  
                  {formData.interestType === "simple" && (
                    <div className="mt-2">
                      <p><strong>{t("simpleInterest")}:</strong></p>
                      {formData.calculationMethod === "monthly" && <p>{t("monthlyExplanation")}</p>}
                      {formData.calculationMethod === "yearly" && <p>{t("yearlyExplanation")}</p>}
                      {formData.calculationMethod === "sankda" && <p>{t("sankdaExplanation")}</p>}
                    </div>
                  )}
                  
                  {formData.interestType === "compound" && (
                    <div className="mt-2">
                      <p><strong>{t("compoundInterest")}:</strong></p>
                      <p>Interest is calculated on the principal amount plus previously earned interest. Formula: A = P × (1 + r/100)^t</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Examples */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quickExamples")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹10,000 @ 2% {t("monthly")} for 6 {t("months")}</span>
                <span className="font-semibold">₹1,200 {t("interest")}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹50,000 @ 12% {t("yearly")} for 1 {t("years")}</span>
                <span className="font-semibold">₹6,000 {t("interest")}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹25,000 {t("sankda")} for 8 {t("months")}</span>
                <span className="font-semibold">₹2,000 {t("interest")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
