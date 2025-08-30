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
    // No longer require authentication since PIN is optional
    setIsAuthenticated(true)

    // Sync loan completion status first
    storage.syncLoanCompletionStatus()

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
      return sum + storage.getOutstandingAmount(loan)
    }, 0)

    setTotalLent(lentAmount)
    setTotalReceived(receivedAmount)
    setActiveLoans(activeLoanCount)
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
          return sum + storage.getOutstandingAmount(loan)
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

  // Filter overdue loans for highlighting
  const currentDate = new Date()
  const overdueLoans = loans.filter(loan => {
    if (!loan.isActive || !loan.dueDate) return false
    return new Date(loan.dueDate) < currentDate
  })

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Header - Only top part with logo, name, search, language */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/bb-logo.png" alt="ByajBook" className="h-16 w-16 rounded-full" />
            <h1 className="text-2xl font-bold">{t("appName")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <SearchClientButton />
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="p-6">
        {/* Summary Cards */}
        <div className="space-y-4">
          {/* First row - 2 cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-3 text-center min-w-0">
              <div className="flex items-center justify-center mb-1">
                <IndianRupee size={16} className="text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{t("totalLent")}</p>
              <p className="font-semibold truncate">₹{totalLent.toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center min-w-0">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp size={16} className="text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{t("totalPayable")}</p>
              <p className="font-semibold truncate">₹{totalPayable.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Second row - 3 cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border rounded-lg p-3 text-center min-w-0">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp size={14} className="text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">{t("received")}</p>
              <p className="font-semibold text-sm truncate">₹{totalReceived.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center min-w-0">
              <div className="flex items-center justify-center mb-1">
                <IndianRupee size={14} className="text-red-600" />
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-semibold text-sm text-red-600 truncate">₹{pendingPayments.toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center min-w-0">
              <p className="text-xs text-muted-foreground">{t("activeLoans")}</p>
              <p className="font-semibold">{activeLoans}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Due Reminders Section */}
        <DueReminders />

        {/* Action Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{t("quickActions")}</h2>
          <div className="grid grid-cols-2 gap-4">
            {actionCards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.title} href={card.href}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow h-32">
                    <CardContent className="p-4 h-full flex flex-col">
                      <div className={`w-14 h-14 rounded-lg ${card.color} flex items-center justify-center mb-3 p-3`}>
                        <Icon size={24} />
                      </div>
                      <CardTitle className="text-sm font-semibold mb-1 flex-shrink-0">{card.title}</CardTitle>
                      <CardDescription className="text-xs flex-1 line-clamp-2">{card.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Loans Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("recentLoans")}</h2>
            <Link href="/loans" className="text-primary text-sm font-medium underline flex items-center gap-1">
              {t("viewAll")} <ChevronRight size={16} />
            </Link>
          </div>
          {loans.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">{t("noLoansYet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Active Loans */}
              {loans
                .filter(loan => loan.isActive)
                .slice(0, 2)
                .map((loan) => {
                  const isOverdue = overdueLoans.some(overdueLoan => overdueLoan.id === loan.id)
                  const outstanding = storage.calculateOutstandingAmount(loan)
                  return (
                    <Card 
                      key={loan.id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue ? 'border-red-200 bg-red-50' : ''
                      }`}
                      onClick={(e) => handleLoanClick(loan.id, e)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {/* User Avatar with First Letter */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shadow-md flex-shrink-0 ${
                                isOverdue ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'
                              }`}>
                                {loan.borrowerName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className={`font-semibold truncate ${isOverdue ? 'text-red-700' : ''}`}>
                                    {loan.borrowerName}
                                  </p>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex-shrink-0">
                                    Active
                                  </span>
                                  {isOverdue && <span className="text-red-500 text-xs font-medium flex-shrink-0">(OVERDUE)</span>}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <p className="truncate">₹{loan.amount.toLocaleString()} → ₹{storage.calculateFinalAmount(loan).toLocaleString()}</p>
                                  <p className="text-xs truncate">
                                    Outstanding: ₹{outstanding.toLocaleString()}
                                    {loan.dueDate && (
                                      <span className={`ml-2 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                        Due: {new Date(loan.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 flex-shrink-0 ml-2">
                              <div className="text-right">
                                <p className="text-sm font-medium">{loan.interestRate}%</p>
                                <p className="text-xs text-muted-foreground">{t(loan.interestMethod)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mobile: Show interest rate */}
                          <div className="flex justify-between items-center sm:hidden">
                            <div>
                              <p className="text-sm font-medium">{loan.interestRate}% {t(loan.interestMethod)}</p>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex justify-end gap-2 pt-2 border-t border-muted/50">
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
              
              {/* Completed Loans */}
              {loans
                .filter(loan => !loan.isActive)
                .slice(0, 1)
                .map((loan) => (
                  <Card 
                    key={loan.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-green-200 bg-green-50"
                    onClick={(e) => handleLoanClick(loan.id, e)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {/* User Avatar with First Letter */}
                            <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold text-sm shadow-md flex-shrink-0">
                              {loan.borrowerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold text-green-700 truncate">
                                  {loan.borrowerName}
                                </p>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium flex-shrink-0">
                                  Completed
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p className="truncate">₹{loan.amount.toLocaleString()} → ₹{storage.calculateFinalAmount(loan).toLocaleString()}</p>
                                <p className="text-xs text-green-600 font-medium truncate">
                                  Fully Paid • Completed on {new Date(storage.getPaymentsForLoan(loan.id).slice(-1)[0]?.date || loan.dateCreated).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0 ml-2">
                            <div className="text-right">
                              <p className="text-sm font-medium">{loan.interestRate}%</p>
                              <p className="text-xs text-muted-foreground">{t(loan.interestMethod)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile: Show interest rate */}
                        <div className="flex justify-between items-center sm:hidden">
                          <div>
                            <p className="text-sm font-medium">{loan.interestRate}% {t(loan.interestMethod)}</p>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-muted/50">
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
                ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
