"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import { ArrowLeft, Plus, Phone, Calendar, IndianRupee, Edit3, Trash2, Search } from "lucide-react"
import { storage, type Loan } from "@/lib/storage"
import { useLanguage } from "@/components/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { VoiceEnabledSearch } from "@/components/voice-enabled-search"
import Link from "next/link"

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    // Sync loan completion status first
    storage.syncLoanCompletionStatus()
    
    setLoans(storage.getLoans())
    
    // Add sample data if no loans exist (for testing purposes)
    const existingLoans = storage.getLoans()
    if (existingLoans.length === 0) {
      const sampleLoan: Loan = {
        id: Date.now().toString(),
        borrowerName: "John Doe",
        borrowerPhone: "9876543210",
        notes: "Sample loan for testing",
        amount: 10000,
        interestRate: 12,
        interestMethod: "yearly",
        interestType: "simple",
        years: 1,
        dateCreated: new Date().toISOString(),
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Due in 1 year
        totalPaid: 0,
        isActive: true,
      }
      storage.saveLoans([sampleLoan])
      setLoans([sampleLoan])
    }
  }, [])

  // Enhanced filtering with search
  const filteredLoans = loans.filter((loan) => {
    // Apply status filter
    if (filter === "active" && !loan.isActive) return false
    if (filter === "completed" && loan.isActive) return false
    
    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        loan.borrowerName.toLowerCase().includes(query) ||
        loan.borrowerPhone?.includes(query) ||
        loan.amount.toString().includes(query) ||
        loan.interestRate.toString().includes(query) ||
        new Date(loan.dateCreated).toLocaleDateString().includes(query) ||
        (loan.notes && loan.notes.toLowerCase().includes(query))
      )
    }
    
    return true
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const calculateOutstanding = (loan: Loan) => {
    return storage.calculateOutstandingAmount(loan)
  }

  const handleDeleteLoan = async (loanId: string) => {
    console.log("Delete button clicked for loan:", loanId)
    setIsDeleting(loanId)
    try {
      const success = storage.deleteLoan(loanId)
      console.log("Delete operation result:", success)
      if (success) {
        // Refresh the loans list
        setLoans(storage.getLoans())
        console.log("Loan deleted successfully")
      } else {
        // Handle error - could show a toast notification
        console.error("Failed to delete loan")
      }
    } catch (error) {
      console.error("Error deleting loan:", error)
    } finally {
      setIsDeleting(null)
    }
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
            <h1 className="text-xl font-bold">{t("allLoans")}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <LanguageSelector />
            <VoiceEnabledSearch />
            <Link href="/loans/add?autofocus=borrowerName">
                <Button variant="secondary" size="sm">
                  <Plus size={16} className="mr-1" />
                  {t("add")}
                </Button>
              </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search */}
      <div className="p-6 pb-0 space-y-4">
        <div className="flex space-x-2">
          {[
            { key: "all", label: t("all") },
            { key: "active", label: t("active") },
            { key: "completed", label: t("completed") },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`transition-all duration-200 ${
                filter === tab.key 
                  ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                  : 'bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        
        {/* Quick Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search loans by name, amount, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loans List */}
      <div className="p-6 space-y-4">
        {filteredLoans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {filter === "all" ? t("noLoansFound") : 
                 filter === "active" ? t("noActiveLoansFound") : 
                 t("noCompletedLoansFound")}
              </p>
              <Link href="/loans/add?autofocus=borrowerName">
                <Button>{t("addFirstLoan")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredLoans.map((loan) => {
            const outstanding = calculateOutstanding(loan)
            const isCompleted = !loan.isActive
            
            return (
              <Card 
                key={loan.id} 
                className={`hover:shadow-md transition-shadow ${
                  isCompleted ? 'border-green-200 bg-green-50' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {/* User Avatar with First Letter */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        {loan.borrowerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-lg truncate ${
                          isCompleted ? 'text-green-700' : ''
                        }`}>
                          {loan.borrowerName}
                        </h3>
                        {loan.borrowerPhone && (
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Phone size={14} className="mr-1 flex-shrink-0" />
                            <span className="truncate">{loan.borrowerPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={loan.isActive ? "default" : "secondary"}
                      className={`${
                        isCompleted 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : ''
                      }`}
                    >
                      {loan.isActive ? t("active") : t("completed")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("loanAmount")}</p>
                      <p className="font-semibold flex items-center truncate">
                        <IndianRupee size={14} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{loan.amount.toLocaleString()}</span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("finalPayableAmount")}</p>
                      <p className="font-semibold flex items-center text-primary truncate">
                        <IndianRupee size={14} className="mr-1 flex-shrink-0" />
                        <span className="truncate">{storage.calculateFinalAmount(loan).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {isCompleted ? "Total Paid" : t("outstanding")}
                      </p>
                      <p className={`font-semibold flex items-center truncate ${
                        isCompleted 
                          ? 'text-green-600' 
                          : outstanding > 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                      }`}>
                        <IndianRupee size={14} className="mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {isCompleted 
                            ? loan.totalPaid.toLocaleString()
                            : outstanding.toLocaleString()
                          }
                        </span>
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-green-600 font-medium">Fully Paid</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("loanPeriod")}</p>
                      <p className="font-medium truncate">
                        {loan.years || 1} {(loan.years || 1) === 1 ? t("years").slice(0, -1) : t("years")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{t("interestRate")}</p>
                        <p className="font-medium truncate">
                          {loan.interestRate}% {t(loan.interestMethod)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">{t("dateCreated")}</p>
                        <p className="font-medium flex items-center truncate">
                          <Calendar size={14} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(loan.dateCreated)}</span>
                        </p>
                      </div>
                    </div>
                    
                    {loan.expectedReturnDate && (
                      <div className="bg-accent/50 p-2 rounded-lg">
                        <p className="text-sm text-muted-foreground">Expected Return Date</p>
                        <p className="font-medium flex items-center truncate">
                          <Calendar size={14} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(loan.expectedReturnDate)}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {loan.totalPaid > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{t("paymentProgress")}</span>
                        <span className="font-medium flex items-center flex-shrink-0">
                          <span className="truncate">₹{loan.totalPaid.toLocaleString()} {t("paid")}</span>
                          {isCompleted && <span className="text-green-600 ml-1">✓</span>}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-green-500' : 'bg-primary'
                          }`}
                          style={{ 
                            width: `${Math.min((loan.totalPaid / storage.calculateFinalAmount(loan)) * 100, 100)}%`,
                            maxWidth: '100%'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {loan.notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm break-words">{loan.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Link href={`/loans/edit/${loan.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Edit3 size={14} className="mr-1" />
                        {t("edit")}
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-transparent border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={isDeleting === loan.id}
                        >
                          <Trash2 size={14} className="mr-1" />
                          {isDeleting === loan.id ? t("loading") : t("delete")}
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
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {loan.isActive && outstanding > 0 && (
                      <Link href="/payments" className="flex-1">
                        <Button size="sm" className="w-full">
                          {t("recordPayment")}
                        </Button>
                      </Link>
                    )}
                    {isCompleted && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        disabled
                      >
                        ✓ Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
