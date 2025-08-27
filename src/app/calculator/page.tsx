"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calculator, IndianRupee } from "lucide-react"
import Link from "next/link"

interface CalculationResult {
  principal: number
  interestAmount: number
  totalAmount: number
  monthlyInterest?: number
  effectiveRate: number
}

export default function CalculatorPage() {
  const [formData, setFormData] = useState({
    principal: "",
    interestRate: "",
    timePeriod: "",
    timeUnit: "months" as "months" | "years",
    calculationMethod: "monthly" as "monthly" | "yearly" | "sankda",
  })
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.principal || Number.parseFloat(formData.principal) <= 0) {
      newErrors.principal = "Valid principal amount is required"
    }

    if (formData.calculationMethod !== "sankda") {
      if (!formData.interestRate || Number.parseFloat(formData.interestRate) <= 0) {
        newErrors.interestRate = "Valid interest rate is required"
      }
    }

    if (!formData.timePeriod || Number.parseFloat(formData.timePeriod) <= 0) {
      newErrors.timePeriod = "Valid time period is required"
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

    // Convert time period to months for calculation
    const timeInMonths = formData.timeUnit === "years" ? timePeriod * 12 : timePeriod

    switch (formData.calculationMethod) {
      case "monthly":
        // Monthly interest calculation
        monthlyInterest = (principal * interestRate) / 100
        interestAmount = monthlyInterest * timeInMonths
        break

      case "yearly":
        // Yearly interest calculation (simple interest)
        const timeInYears = timeInMonths / 12
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

    const totalAmount = principal + interestAmount

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
    })
    setResult(null)
    setErrors({})
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Calculator size={24} />
          <h1 className="text-xl font-bold">Interest Calculator</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Calculate Interest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="principal">Principal Amount (₹) *</Label>
              <Input
                id="principal"
                type="number"
                value={formData.principal}
                onChange={(e) => handleInputChange("principal", e.target.value)}
                placeholder="Enter principal amount"
                className={errors.principal ? "border-destructive" : ""}
              />
              {errors.principal && <p className="text-destructive text-sm mt-1">{errors.principal}</p>}
            </div>

            <div>
              <Label htmlFor="calculationMethod">Calculation Method *</Label>
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
                  <SelectItem value="monthly">Monthly Interest</SelectItem>
                  <SelectItem value="yearly">Yearly Interest (Simple)</SelectItem>
                  <SelectItem value="sankda">Sankda (12% yearly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.calculationMethod !== "sankda" && (
              <div>
                <Label htmlFor="interestRate">Interest Rate (%) *</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  placeholder="Enter interest rate"
                  className={errors.interestRate ? "border-destructive" : ""}
                />
                {errors.interestRate && <p className="text-destructive text-sm mt-1">{errors.interestRate}</p>}
              </div>
            )}

            {formData.calculationMethod === "sankda" && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Sankda method uses a fixed 12% yearly interest rate</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timePeriod">Time Period *</Label>
                <Input
                  id="timePeriod"
                  type="number"
                  value={formData.timePeriod}
                  onChange={(e) => handleInputChange("timePeriod", e.target.value)}
                  placeholder="Enter time"
                  className={errors.timePeriod ? "border-destructive" : ""}
                />
                {errors.timePeriod && <p className="text-destructive text-sm mt-1">{errors.timePeriod}</p>}
              </div>
              <div>
                <Label htmlFor="timeUnit">Unit</Label>
                <Select
                  value={formData.timeUnit}
                  onValueChange={(value: "months" | "years") => handleInputChange("timeUnit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={calculateInterest} className="flex-1">
                Calculate
              </Button>
              <Button variant="outline" onClick={resetCalculator} className="bg-transparent">
                Reset
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
                <span>Calculation Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Principal Amount</p>
                  <p className="text-2xl font-bold">₹{result.principal.toLocaleString()}</p>
                </div>

                <div className="bg-accent p-4 rounded-lg">
                  <p className="text-sm text-accent-foreground/80">Total Interest</p>
                  <p className="text-2xl font-bold text-accent-foreground">₹{result.interestAmount.toLocaleString()}</p>
                </div>

                <div className="bg-primary p-4 rounded-lg text-primary-foreground">
                  <p className="text-sm opacity-80">Total Amount</p>
                  <p className="text-3xl font-bold">₹{result.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Rate:</span>
                  <span className="font-semibold">
                    {result.effectiveRate}% {formData.calculationMethod}
                  </span>
                </div>

                {result.monthlyInterest && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Interest:</span>
                    <span className="font-semibold">₹{result.monthlyInterest.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Period:</span>
                  <span className="font-semibold">
                    {formData.timePeriod} {formData.timeUnit}
                  </span>
                </div>
              </div>

              {/* Method Explanation */}
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Calculation Method:</p>
                <p className="text-sm text-muted-foreground">
                  {formData.calculationMethod === "monthly" &&
                    "Monthly interest is calculated as a fixed percentage of the principal amount each month."}
                  {formData.calculationMethod === "yearly" &&
                    "Yearly interest uses simple interest formula: (Principal × Rate × Time) / 100"}
                  {formData.calculationMethod === "sankda" &&
                    "Sankda method applies 12% yearly interest, typically calculated monthly for traditional lending."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹10,000 @ 2% monthly for 6 months</span>
                <span className="font-semibold">₹1,200 interest</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹50,000 @ 12% yearly for 1 year</span>
                <span className="font-semibold">₹6,000 interest</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>₹25,000 Sankda for 8 months</span>
                <span className="font-semibold">₹2,000 interest</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
