"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
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
import { BottomNav } from "@/components/bottom-nav"
import { LanguageSelector } from "@/components/language-selector"
import { SearchClientButton } from "@/components/search-client-button"
import { DueReminders } from "@/components/due-reminders"
import { useLanguage } from "@/components/language-provider"
import { storage } from "@/lib/storage"
import { Plus, Calculator, TrendingUp, FileText, IndianRupee, Edit3, Trash2, ChevronRight } from "lucide-react"

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [totalLent, setTotalLent] = useState(0)
  const [totalPayable, setTotalPayable] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [activeLoans, setActiveLoans] = useState(0)
  const [pendingPayments, setPendingPayments] = useState(0)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [loans, setLoans] = useState<any[]>([])
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    // PIN is optional — load dashboard data without requiring auth
    setIsAuthenticated(true)

    // Calculate summary stats
    const loans = storage.getLoans()
    setLoans(loans) // Store loans in state
    const payments = storage.getPayments()

    const lentAmount = loans.reduce((sum, loan) => sum + loan.amount, 0)
    const totalPayableAmount = loans.reduce((sum, loan) => sum + storage.calculateFinalAmount(loan), 0)
    const receivedAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const activeLoanCount = loans.filter((loan) => loan.isActive).length
    
    // Calculate pending payments (outstanding amount from active loans)
    const activeLoansData = loans.filter((loan) => loan.isActive)
    const pendingAmount = activeLoansData.reduce((sum, loan) => {
      const finalAmount = storage.calculateFinalAmount(loan)
      return sum + (finalAmount - loan.totalPaid)
    }, 0)

    setTotalLent(lentAmount)
    setTotalReceived(receivedAmount)
    setActiveLoans(activeLoanCount)
    // Store total payable in a new state variable
    setTotalPayable(totalPayableAmount)
    setPendingPayments(pendingAmount)
  }, [])

  const handleDeleteLoan = async (loanId: string) => {
    setIsDeleting(loanId)
    try {
      const success = storage.deleteLoan(loanId)
      if (success) {
        // Refresh all data after deletion
        const updatedLoans = storage.getLoans()
        setLoans(updatedLoans)
        
        // Recalculate summary stats
        const payments = storage.getPayments()
        const lentAmount = updatedLoans.reduce((sum, loan) => sum + loan.amount, 0)
        const totalPayableAmount = updatedLoans.reduce((sum, loan) => sum + storage.calculateFinalAmount(loan), 0)
        const receivedAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
        const activeLoanCount = updatedLoans.filter((loan) => loan.isActive).length
        
        const activeLoansData = updatedLoans.filter((loan) => loan.isActive)
        const pendingAmount = activeLoansData.reduce((sum, loan) => {
          const finalAmount = storage.calculateFinalAmount(loan)
          return sum + (finalAmount - loan.totalPaid)
        }, 0)

        setTotalLent(lentAmount)
        setTotalReceived(receivedAmount)
        setActiveLoans(activeLoanCount)
        setTotalPayable(totalPayableAmount)
        setPendingPayments(pendingAmount)
      } else {
        console.error("Failed to delete loan")
      }
    } catch (error) {
      console.error("Error deleting loan:", error)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleLoanClick = (loanId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on a button
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    router.push(`/loans/${loanId}`)
  }

  if (!isAuthenticated) {
    return null
  }

  const actionCards = [
    {
      title: t("addLoan"),
      description: t("addLoanDesc"),
      icon: Plus,
      href: "/loans/add",
      color: "bg-primary text-primary-foreground",
    },
    {
      title: t("trackPayments"),
      description: t("trackPaymentsDesc"),
      icon: TrendingUp,
      href: "/payments",
      color: "bg-secondary text-secondary-foreground",
    },
    {
      title: t("interestCalculator"),
      description: t("interestCalculatorDesc"),
      icon: Calculator,
      href: "/calculator",
      color: "bg-accent text-accent-foreground",
    },
    {
      title: t("reports"),
      description: t("reportsDesc"),
      icon: FileText,
      href: "/reports",
      color: "bg-muted text-muted-foreground",
    },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <img src="/bb-logo.png" alt="ByajBook" className="h-16 w-16 rounded-full" />
            <h1 className="text-2xl font-bold">{t("appName")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <SearchClientButton />
            <LanguageSelector />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          {/* First row - 2 cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <IndianRupee size={16} />
              </div>
              <p className="text-xs opacity-80">{t("totalLent")}</p>
              <p className="font-semibold">₹{totalLent.toLocaleString()}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp size={16} />
              </div>
              <p className="text-xs opacity-80">{t("totalPayable")}</p>
              <p className="font-semibold">₹{totalPayable.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Second row - 3 cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp size={14} />
              </div>
              <p className="text-xs opacity-80">{t("received")}</p>
              <p className="font-semibold text-sm">₹{totalReceived.toLocaleString()}</p>
            </div>
            <div className="bg-red-100/20 border border-red-200/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <IndianRupee size={14} className="text-red-300" />
              </div>
              <p className="text-xs opacity-80">Pending</p>
              <p className="font-semibold text-sm text-red-200">₹{pendingPayments.toLocaleString()}</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <p className="text-xs opacity-80">{t("activeLoans")}</p>
              <p className="font-semibold">{activeLoans}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">{t("quickActions")}</h2>
        <div className="grid grid-cols-2 gap-4">
          {actionCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.title} href={card.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                      <Icon size={24} />
                    </div>
                    <CardTitle className="text-sm font-semibold mb-1">{card.title}</CardTitle>
                    <CardDescription className="text-xs">{card.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Due Reminders Section */}
        <div className="mt-6">
          <DueReminders />
        </div>

        {/* Recent Loans Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("recentLoans")}</h2>
            <Link href="/loans" className="text-primary text-sm font-medium underline flex items-center gap-1">
              {t("viewAll")} <ChevronRight size={16} />
            </Link>
          </div>
          {activeLoans === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">{t("noLoansYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {loans
                .slice(0, 3)
                .map((loan) => {
                  const isOverdue = storage.isLoanOverdue(loan)
                  return (
                    <Card 
                      key={loan.id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue ? 'border-red-300 bg-red-50' : ''
                      }`}
                      onClick={(e) => handleLoanClick(loan.id, e)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {/* User Avatar with First Letter */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                              isOverdue 
                                ? 'bg-red-600 text-white' 
                                : 'bg-primary text-primary-foreground'
                            }`}>
                              {loan.borrowerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className={`font-semibold ${isOverdue ? 'text-red-700' : ''}`}>
                                {loan.borrowerName}
                                {isOverdue && (
                                  <span className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded">
                                    {t("overdue")}
                                  </span>
                                )}
                              </p>
                              <div className="text-sm text-muted-foreground">
                                <p>₹{loan.amount.toLocaleString()} → ₹{storage.calculateFinalAmount(loan).toLocaleString()}</p>
                                <p className="text-xs">{loan.years || 1} {(loan.years || 1) === 1 ? 'year' : 'years'} @ {loan.interestRate}%</p>
                                {loan.dueDate && (
                                  <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                    {t("dueDate")}: {new Date(loan.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <p className="text-sm font-medium">{loan.interestRate}%</p>
                              <p className="text-xs text-muted-foreground">{t(loan.interestMethod)}</p>
                            </div>
                            <Link href={`/loans/edit/${loan.id}`}>
                              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <Edit3 size={16} className="text-muted-foreground hover:text-foreground" />
                              </button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button 
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  disabled={isDeleting === loan.id}
                                >
                                  <Trash2 
                                    size={16} 
                                    className="text-red-400 hover:text-red-600" 
                                  />
                                </button>
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
                                    onClick={() => handleDeleteLoan(loan.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    {isDeleting === loan.id ? t("loading") : t("delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
