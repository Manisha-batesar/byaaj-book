"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, IndianRupee, Calendar, User, Edit3 } from "lucide-react"
import { storage, type Loan, type Payment } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

export default function PaymentsPage() {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    const loans = storage.getLoans().filter((loan) => loan.isActive)
    const payments = storage.getPayments().slice(-10).reverse() // Last 10 payments
    setActiveLoans(loans)
    setRecentPayments(payments)
  }, [])

  const calculateOutstanding = (loan: Loan) => {
    return loan.amount - loan.totalPaid
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getLoanById = (loanId: string) => {
    return storage.getLoans().find((loan) => loan.id === loanId)
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
            <h1 className="text-xl font-bold">{t("paymentTracking")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Loans for Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus size={20} />
              <span>{t("recordingPayment")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeLoans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">{t("noActiveLoansPayment")}</p>
                <Link href="/loans/add">
                  <Button>{t("addFirstLoan")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{loan.borrowerName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("outstanding")}: ₹{calculateOutstanding(loan).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-semibold">₹{loan.amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {loan.interestRate}% {t(loan.interestMethod)}
                          </p>
                        </div>
                        <Link href={`/loans/edit/${loan.id}`}>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <Edit3 size={16} className="text-muted-foreground hover:text-foreground" />
                          </button>
                        </Link>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-transparent"
                        onClick={() => setSelectedLoan(loan)}
                      >
                        {t("recordPayment")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar size={20} />
              <span>{t("recentPayments")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t("noPaymentsRecorded")}</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => {
                  const loan = getLoanById(payment.loanId)
                  return (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User size={16} />
                          <span className="font-semibold">{loan?.borrowerName || t("unknown")}</span>
                        </div>
                        <Badge variant={payment.type === "full" ? "default" : "secondary"}>
                          {payment.type === "full" ? t("fullPayment") : t("partialPayment")}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <IndianRupee size={16} />
                          <span className="font-semibold text-lg">₹{payment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Calendar size={14} />
                          <span className="text-sm">{formatDate(payment.date)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t("totalReceived")}</p>
                <p className="text-2xl font-bold">
                  ₹{recentPayments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t("activeLoans")}</p>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      {selectedLoan && (
        <PaymentModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onPaymentRecorded={() => {
            // Refresh data
            const loans = storage.getLoans().filter((loan) => loan.isActive)
            const payments = storage.getPayments().slice(-10).reverse()
            setActiveLoans(loans)
            setRecentPayments(payments)
            setSelectedLoan(null)
          }}
        />
      )}
    </div>
  )
}

interface PaymentModalProps {
  loan: Loan
  onClose: () => void
  onPaymentRecorded: () => void
}

function PaymentModal({ loan, onClose, onPaymentRecorded }: PaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentType, setPaymentType] = useState<"partial" | "full">("partial")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const outstanding = loan.amount - loan.totalPaid

  useEffect(() => {
    // Auto-set to full payment if amount matches outstanding
    if (paymentAmount && Number.parseFloat(paymentAmount) === outstanding) {
      setPaymentType("full")
    } else if (paymentAmount && Number.parseFloat(paymentAmount) < outstanding) {
      setPaymentType("partial")
    }
  }, [paymentAmount, outstanding])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const amount = Number.parseFloat(paymentAmount)

    if (!amount || amount <= 0) {
      setError(t("validPaymentRequired"))
      return
    }

    if (amount > outstanding) {
      setError(t("paymentExceedsBalance"))
      return
    }

    setIsSubmitting(true)

    try {
      const success = storage.recordPayment(loan.id, amount, paymentType)
      if (success) {
        onPaymentRecorded()
      } else {
        setError(t("failedToRecord"))
      }
    } catch (error) {
      setError(t("errorRecordingPayment"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("recordingPayment")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {loan.borrowerName} • {t("outstanding")}: ₹{outstanding.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium mb-2">
                {t("paymentAmount")} (₹) {t("required")}
              </label>
              <input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={t("amountPlaceholder")}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                max={outstanding}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(outstanding.toString())}
                className="bg-transparent"
              >
                {t("fullPayment")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount((outstanding / 2).toString())}
                className="bg-transparent"
              >
                {t("halfPayment")}
              </Button>
            </div>

            {paymentAmount && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  <strong>{t("paymentType")}:</strong> {paymentType === "full" ? t("fullPayment") : t("partialPayment")}
                </p>
                <p className="text-sm">
                  <strong>{t("remainingBalance")}:</strong> ₹
                  {(outstanding - Number.parseFloat(paymentAmount || "0")).toLocaleString()}
                </p>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? t("recording") : t("recordPayment")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
