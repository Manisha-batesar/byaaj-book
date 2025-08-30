"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, IndianRupee, Calendar, User, Edit3, Phone, ChevronRight } from "lucide-react"
import { storage, type Loan, type Payment } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { BottomNav } from "@/components/bottom-nav"
import Link from "next/link"
import { useRouter } from "next/navigation"

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function PaymentsPage() {
  const [allLoans, setAllLoans] = useState<Loan[]>([])
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    // No longer require authentication since PIN is optional
    // Sync loan completion status first
    storage.syncLoanCompletionStatus()
    
    const loans = storage.getLoans()
    setAllLoans(loans)
  }, [])

  const calculateOutstanding = (loan: Loan) => {
    return storage.getOutstandingAmount(loan)
  }
  const getLastPaymentDate = (loanId: string) => {
    const payments = storage.getPaymentsForLoan(loanId)
    if (payments.length === 0) return null
    const lastPayment = payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    return lastPayment.date
  }

  // Get client's first name initial
  const getClientInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase()
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
              <IndianRupee size={24} />
            </div>
            <h1 className="text-xl font-bold">{t("paymentTracking")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 pb-20 space-y-4">
        {/* Clients List - Contact App Style */}
        {allLoans.length === 0 ? (
          <div className="text-center py-16">
            <User size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{t("noLoansFound")}</p>
            <Link href="/loans/add">
              <Button>{t("addFirstLoan")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {allLoans.map((loan) => {
              const outstanding = calculateOutstanding(loan)
              const lastPaymentDate = getLastPaymentDate(loan.id)
              const finalAmount = storage.calculateFinalAmount(loan)
              const isCompleted = !loan.isActive

              return (
                <Card 
                  key={loan.id} 
                  className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
                    isCompleted ? 'border-green-200 bg-green-50' : ''
                  }`}
                  onClick={() => router.push(`/loans/${loan.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {/* Client Name with Avatar - Big and Bold */}
                        <div className="flex items-center space-x-3 mb-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            {getClientInitial(loan.borrowerName)}
                          </div>
                          <h2 className={`text-xl font-bold ${
                            isCompleted ? 'text-green-700' : 'text-foreground'
                          }`}>
                            {loan.borrowerName}
                          </h2>
                        </div>
                        
                        {/* Contact Number - Small text */}
                        {loan.borrowerPhone && (
                          <div className="flex items-center space-x-1 mb-3 ml-15">
                            <Phone size={14} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {loan.borrowerPhone}
                            </span>
                          </div>
                        )}

                        {/* Loan Details */}
                        <div className="space-y-2 ml-15">
                          {/* Total Loan Amount */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("totalLoanAmount")}:</span>
                            <span className="text-sm font-semibold">₹{loan.amount.toLocaleString()}</span>
                          </div>

                          {/* Pending/Due Amount */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {loan.isActive ? t("pendingAmount") : t("finalAmount")}:
                            </span>
                            <span className={`text-sm font-semibold ${
                              loan.isActive 
                                ? outstanding > 0 
                                  ? "text-red-600" 
                                  : "text-green-600"
                                : "text-green-600"
                            }`}>
                              {loan.isActive 
                                ? `₹${outstanding.toLocaleString()}`
                                : `₹${finalAmount.toLocaleString()}`
                              }
                            </span>
                          </div>

                          {/* Last Payment Date */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t("lastPayment")}:</span>
                            <span className="text-sm">
                              {lastPaymentDate 
                                ? formatDate(lastPaymentDate)
                                : t("noPaymentsYet")
                              }
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3 flex items-center justify-between ml-15">
                          <Badge 
                            variant={loan.isActive ? "default" : "secondary"}
                            className={`${
                              isCompleted 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : ''
                            }`}
                          >
                            {loan.isActive ? "Active" : "Completed"}
                          </Badge>
                          
                          {/* Quick Actions for Active Loans */}
                          {loan.isActive && outstanding > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-transparent text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoan(loan)
                              }}
                            >
                              {t("recordPayment")}
                            </Button>
                          )}
                          
                          {/* Completed Status for Completed Loans */}
                          {isCompleted && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Fully Paid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron Right Arrow */}
                      <div className="ml-4">
                        <ChevronRight size={20} className="text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Payment Modal */}
      {selectedLoan && (
        <PaymentModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
          onPaymentRecorded={() => {
            // Refresh data
            const loans = storage.getLoans()
            setAllLoans(loans)
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

  const outstanding = storage.calculateFinalAmount(loan) - loan.totalPaid

  useEffect(() => {
    // Auto-set to full payment if amount matches outstanding
    if (paymentAmount && Number.parseFloat(paymentAmount) >= outstanding) {
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
      const amount = Number.parseFloat(paymentAmount)
      const isFullPayment = amount >= outstanding
      
      const success = storage.recordPayment(loan.id, amount, isFullPayment ? "full" : "partial")
      if (success) {
        // Show different success message for completed loans
        if (isFullPayment) {
          console.log(`Loan for ${loan.borrowerName} has been completed!`)
        }
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {loan.borrowerName} • {t("outstanding")}: ₹{outstanding.toLocaleString()}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Loan Date: {formatDate(loan.dateCreated)}</span>
                {loan.expectedReturnDate && (
                  <span>Expected Return: {formatDate(loan.expectedReturnDate)}</span>
                )}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Principal:</span>
                  <span>₹{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest:</span>
                  <span>₹{storage.calculateInterestAmount(loan).toLocaleString()}</span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Total Payable:</span>
                  <span>₹{storage.calculateFinalAmount(loan).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>₹{loan.totalPaid.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
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
                {Number.parseFloat(paymentAmount || "0") >= outstanding && (
                  <p className="text-sm text-green-600 font-medium mt-2">
                    ✓ This payment will complete the loan!
                  </p>
                )}
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
