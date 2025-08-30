"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, TrendingUp, Users, IndianRupee, Calendar, PieChart, BarChart3 } from "lucide-react"
import { storage, type Loan, type Payment } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

interface BorrowerSummary {
  borrowerName: string
  totalLent: number
  totalReceived: number
  outstanding: number
  activeLoans: number
  completedLoans: number
}

interface MonthlyData {
  month: string
  lent: number
  received: number
}

export default function ReportsPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [borrowerSummaries, setBorrowerSummaries] = useState<BorrowerSummary[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"all" | "6months" | "1year">("all")
  const { t } = useLanguage()

  useEffect(() => {
    const allLoans = storage.getLoans()
    const allPayments = storage.getPayments()
    setLoans(allLoans)
    setPayments(allPayments)

    // Calculate borrower summaries
    const borrowerMap = new Map<string, BorrowerSummary>()

    allLoans.forEach((loan) => {
      const existing = borrowerMap.get(loan.borrowerName) || {
        borrowerName: loan.borrowerName,
        totalLent: 0,
        totalReceived: 0,
        outstanding: 0,
        activeLoans: 0,
        completedLoans: 0,
      }

      existing.totalLent += loan.amount
      existing.totalReceived += loan.totalPaid
      existing.outstanding += loan.amount - loan.totalPaid
      if (loan.isActive) {
        existing.activeLoans += 1
      } else {
        existing.completedLoans += 1
      }

      borrowerMap.set(loan.borrowerName, existing)
    })

    setBorrowerSummaries(Array.from(borrowerMap.values()).sort((a, b) => b.totalLent - a.totalLent))

    // Calculate monthly data for the last 12 months
    const monthlyMap = new Map<string, MonthlyData>()
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
      const monthLabel = date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      monthlyMap.set(monthKey, { month: monthLabel, lent: 0, received: 0 })
    }

    // Add loan data
    allLoans.forEach((loan) => {
      const loanMonth = loan.dateCreated.slice(0, 7)
      if (monthlyMap.has(loanMonth)) {
        monthlyMap.get(loanMonth)!.lent += loan.amount
      }
    })

    // Add payment data
    allPayments.forEach((payment) => {
      const paymentMonth = payment.date.slice(0, 7)
      if (monthlyMap.has(paymentMonth)) {
        monthlyMap.get(paymentMonth)!.received += payment.amount
      }
    })

    setMonthlyData(Array.from(monthlyMap.values()))
  }, [])

  const calculateTotals = () => {
    const totalLent = loans.reduce((sum, loan) => sum + loan.amount, 0)
    const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalOutstanding = loans.reduce((sum, loan) => sum + (loan.amount - loan.totalPaid), 0)
    const activeLoans = loans.filter((loan) => loan.isActive).length
    const completedLoans = loans.filter((loan) => !loan.isActive).length

    return { totalLent, totalReceived, totalOutstanding, activeLoans, completedLoans }
  }

  const calculateInterestEarnings = () => {
    let totalInterestEarned = 0
    let potentialInterest = 0

    loans.forEach((loan) => {
      const monthsElapsed = Math.floor(
        (new Date().getTime() - new Date(loan.dateCreated).getTime()) / (1000 * 60 * 60 * 24 * 30),
      )

      let monthlyInterestRate = 0
      switch (loan.interestMethod) {
        case "monthly":
          monthlyInterestRate = loan.interestRate / 100
          break
        case "yearly":
          monthlyInterestRate = loan.interestRate / 100 / 12
          break
        case "sankda":
          monthlyInterestRate = 12 / 100 / 12
          break
      }

      const calculatedInterest = loan.amount * monthlyInterestRate * monthsElapsed
      potentialInterest += calculatedInterest

      // Estimate earned interest based on payments received
      const paymentRatio = loan.totalPaid / loan.amount
      totalInterestEarned += calculatedInterest * paymentRatio
    })

    return { totalInterestEarned, potentialInterest }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const totals = calculateTotals()
  const interestData = calculateInterestEarnings()

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
            <BarChart3 size={24} />
            <h1 className="text-xl font-bold">{t("reportsAnalytics")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="h-24">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <IndianRupee size={16} className="text-primary" />
                <p className="text-sm text-muted-foreground">{t("totalLent")}</p>
              </div>
              <p className="text-2xl font-bold">₹{totals.totalLent.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="h-24">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp size={16} className="text-green-600" />
                <p className="text-sm text-muted-foreground">{t("totalReceived")}</p>
              </div>
              <p className="text-2xl font-bold text-green-600">₹{totals.totalReceived.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="h-24">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <PieChart size={16} className="text-orange-600" />
                <p className="text-sm text-muted-foreground">{t("outstanding")}</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">₹{totals.totalOutstanding.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="h-24">
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-2">
                <Users size={16} className="text-blue-600" />
                <p className="text-sm text-muted-foreground">{t("activeLoans")}</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{totals.activeLoans}</p>
            </CardContent>
          </Card>
        </div>

        {/* Interest Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp size={20} />
              <span>{t("interestAnalysis")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{t("estimatedInterestEarned")}</p>
                <p className="text-xl font-bold">₹{Math.round(interestData.totalInterestEarned).toLocaleString()}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{t("potentialInterest")}</p>
                <p className="text-xl font-bold">₹{Math.round(interestData.potentialInterest).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-accent p-3 rounded-lg">
              <p className="text-sm text-accent-foreground">
                <strong>{t("collectionRate")}:</strong>{" "}
                {interestData.potentialInterest > 0
                  ? Math.round((interestData.totalInterestEarned / interestData.potentialInterest) * 100)
                  : 0}
                % {t("potentialInterestCollected")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar size={20} />
              <span>{t("monthlyTrends")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.slice(-6).map((data, index) => {
                const maxValue = Math.max(...monthlyData.map((d) => Math.max(d.lent, d.received)))
                const lentWidth = maxValue > 0 ? (data.lent / maxValue) * 100 : 0
                const receivedWidth = maxValue > 0 ? (data.received / maxValue) * 100 : 0

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{data.month}</span>
                      <div className="flex space-x-4">
                        <span className="text-primary">{t("lent")}: ₹{data.lent.toLocaleString()}</span>
                        <span className="text-green-600">{t("received")}: ₹{data.received.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${lentWidth}%` }}
                        />
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${receivedWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Borrower-wise Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users size={20} />
              <span>{t("borrowerWiseSummary")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {borrowerSummaries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("noBorrowerData")}</p>
            ) : (
              <div className="space-y-4">
                {borrowerSummaries.slice(0, 10).map((borrower, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {/* User Avatar with First Letter */}
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shadow-md">
                          {borrower.borrowerName.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="font-semibold">{borrower.borrowerName}</h3>
                      </div>
                      <div className="flex space-x-2">
                        {borrower.activeLoans > 0 && <Badge variant="default">{borrower.activeLoans} {t("active")}</Badge>}
                        {borrower.completedLoans > 0 && (
                          <Badge variant="secondary">{borrower.completedLoans} {t("completed")}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("totalLent")}</p>
                        <p className="font-semibold">₹{borrower.totalLent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("received")}</p>
                        <p className="font-semibold text-green-600">₹{borrower.totalReceived.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("outstanding")}</p>
                        <p className="font-semibold text-orange-600">₹{borrower.outstanding.toLocaleString()}</p>
                      </div>
                    </div>

                    {borrower.totalLent > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{t("recoveryRate")}</span>
                          <span>{Math.round((borrower.totalReceived / borrower.totalLent) * 100)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${(borrower.totalReceived / borrower.totalLent) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar size={20} />
              <span>{t("recentActivity")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Recent Loans */}
              {loans
                .slice(-5)
                .reverse()
                .map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      {/* User Avatar with First Letter */}
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs shadow-md">
                        {loan.borrowerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{loan.borrowerName}</p>
                        <p className="text-sm text-muted-foreground">{t("loanCreated")} • {formatDate(loan.dateCreated)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{loan.amount.toLocaleString()}</p>
                      <Badge variant={loan.isActive ? "default" : "secondary"}>
                        {loan.isActive ? t("active") : t("completed")}
                      </Badge>
                    </div>
                  </div>
                ))}

              {/* Recent Payments */}
              {payments
                .slice(-3)
                .reverse()
                .map((payment) => {
                  const loan = loans.find((l) => l.id === payment.loanId)
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {/* User Avatar with First Letter */}
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold text-xs shadow-md">
                          {loan?.borrowerName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium">{loan?.borrowerName || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{t("paymentReceived")} • {formatDate(payment.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">₹{payment.amount.toLocaleString()}</p>
                        <Badge variant={payment.type === "full" ? "default" : "secondary"}>{payment.type}</Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
