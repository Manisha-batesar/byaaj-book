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
import { ArrowLeft, Phone, Calendar, IndianRupee, Edit3, Trash2, User, Clock, FileText } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Loan Details</h1>
          </div>
          <LanguageSelector />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User size={20} />
              <span>Client Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold text-lg">{loan.borrowerName}</p>
            </div>
            {loan.borrowerPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <div className="flex items-center space-x-2">
                  <Phone size={16} />
                  <p className="font-medium">{loan.borrowerPhone}</p>
                </div>
              </div>
            )}
            {loan.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm bg-muted p-2 rounded">{loan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <IndianRupee size={20} />
              <span>Loan Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Principal Amount</p>
                <p className="font-semibold text-lg">₹{loan.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Final Amount</p>
                <p className="font-semibold text-lg text-green-600">₹{finalAmount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
                <p className="font-medium">{loan.interestRate}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Interest Method</p>
                <Badge variant="outline">{t(loan.interestMethod)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Loan Period</p>
                <p className="font-medium">{loan.years || 1} {(loan.years || 1) === 1 ? 'year' : 'years'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Created</p>
                <div className="flex items-center space-x-2">
                  <Calendar size={16} />
                  <p className="font-medium">{new Date(loan.dateCreated).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={loan.isActive ? "default" : "secondary"}>
                {loan.isActive ? "Active" : "Completed"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock size={20} />
              <span>Payment Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-semibold text-lg text-blue-600">₹{loan.totalPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="font-semibold text-lg text-red-600">₹{outstandingAmount.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Payment Progress</span>
                <span>{Math.round((loan.totalPaid / finalAmount) * 100)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((loan.totalPaid / finalAmount) * 100, 100)}%` }}
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
                <span>Payment History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-muted/40 rounded-lg">
                      <div>
                        <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {payment.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Link href={`/loans/edit/${loan.id}`} className="flex-1">
            <Button className="w-full" variant="outline">
              <Edit3 size={16} className="mr-2" />
              Edit Loan
            </Button>
          </Link>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1">
                <Trash2 size={16} className="mr-2" />
                Delete Loan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this loan? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteLoan}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
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
              Record Payment
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
