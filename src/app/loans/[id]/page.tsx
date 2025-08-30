"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Phone, Calendar, IndianRupee, Edit3, Trash2, Clock, FileText } from "lucide-react"
import { storage, type Loan, type Payment } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import Link from "next/link"

export default function LoanDetailsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loan, setLoan] = useState<Loan | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { t } = useLanguage()
  const loanId = params.id as string

  useEffect(() => {
    if (!storage.isAuthenticated()) {
      router.push("/")
      return
    }

    setIsAuthenticated(true)

    // Get loan details
    const loanData = storage.getLoanById(loanId)
    if (!loanData) {
      router.push("/loans")
      return
    }

    setLoan(loanData)

    // Get payments for this loan
    const allPayments = storage.getPayments()
    const loanPayments = allPayments.filter(payment => payment.loanId === loanId)
    setPayments(loanPayments)
  }, [loanId, router])

  const handleDeleteLoan = async () => {
    setIsDeleting(true)
    try {
      const success = storage.deleteLoan(loanId)
      if (success) {
        router.push("/loans")
      } else {
        console.error("Failed to delete loan")
      }
    } catch (error) {
      console.error("Error deleting loan:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated || !loan) {
    return null
  }

  const finalAmount = storage.calculateFinalAmount(loan)
  const outstandingAmount = finalAmount - loan.totalPaid

  // Get client's first name initial
  const getClientInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">{t("viewDetails")}</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                {getClientInitial(loan.borrowerName)}
              </div>
              <span>{t("borrowerInformation")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("borrowerName")}</p>
              <p className="font-semibold text-lg truncate">{loan.borrowerName}</p>
            </div>
            {loan.borrowerPhone && (
              <div>
                <p className="text-sm text-muted-foreground">{t("phoneNumber")}</p>
                <div className="flex items-center space-x-2 min-w-0">
                  <Phone size={16} className="flex-shrink-0" />
                  <p className="font-medium truncate">{loan.borrowerPhone}</p>
                </div>
              </div>
            )}
            {loan.notes && (
              <div>
                <p className="text-sm text-muted-foreground">{t("notes")}</p>
                <p className="text-sm bg-muted p-2 rounded break-words">{loan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IndianRupee size={20} />
              <span>{t("loanDetails")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("principalAmount")}</p>
                <p className="font-semibold text-lg truncate">₹{loan.amount.toLocaleString()}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("finalPayableAmount")}</p>
                <p className="font-semibold text-lg text-green-600 truncate">₹{finalAmount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("interestRate")}</p>
                <p className="font-medium truncate">{loan.interestRate}%</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("interestMethod")}</p>
                <Badge variant="outline" className="truncate max-w-full">{t(loan.interestMethod)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("loanPeriod")}</p>
                <p className="font-medium truncate">{loan.years || 1} {(loan.years || 1) === 1 ? 'year' : 'years'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("dateCreated")}</p>
                <div className="flex items-center space-x-2 min-w-0">
                  <Calendar size={16} className="flex-shrink-0" />
                  <p className="font-medium truncate">{new Date(loan.dateCreated).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={loan.isActive ? "default" : "secondary"}>
                {loan.isActive ? t("active") : t("completed")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock size={20} />
              <span>{t("paymentSummary")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("paid")}</p>
                <p className="font-semibold text-lg text-blue-600 truncate">₹{loan.totalPaid.toLocaleString()}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{t("outstanding")}</p>
                <p className="font-semibold text-lg text-red-600 truncate">₹{outstandingAmount.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>{t("paymentProgress")}</span>
                <span>{Math.round((loan.totalPaid / finalAmount) * 100)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((loan.totalPaid / finalAmount) * 100, 100)}%`,
                    maxWidth: '100%'
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText size={20} />
                <span>{t("recentPayments")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-lg min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {payment.type === "full" ? t("fullPayment") : t("partialPayment")}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/loans/edit/${loan.id}`} className="flex-1">
            <Button className="w-full" variant="outline">
              <Edit3 size={16} className="mr-2" />
              {t("editLoan")}
            </Button>
          </Link>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1">
                <Trash2 size={16} className="mr-2" />
                {t("deleteLoan")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteLoan")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteLoanConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteLoan}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? t("loading") : t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Record Payment Button */}
        {loan.isActive && (
          <Link href={`/payments?loanId=${loan.id}`}>
            <Button className="w-full" size="lg">
              <IndianRupee size={16} className="mr-2" />
              {t("recordPayment")}
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
