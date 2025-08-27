"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { storage } from "@/lib/storage"
import { Plus, Calculator, TrendingUp, FileText, IndianRupee } from "lucide-react"

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [totalLent, setTotalLent] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [activeLoans, setActiveLoans] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (!storage.isAuthenticated()) {
      router.push("/")
      return
    }

    setIsAuthenticated(true)

    // Calculate summary stats
    const loans = storage.getLoans()
    const payments = storage.getPayments()

    const lentAmount = loans.reduce((sum, loan) => sum + loan.amount, 0)
    const receivedAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const activeLoanCount = loans.filter((loan) => loan.isActive).length

    setTotalLent(lentAmount)
    setTotalReceived(receivedAmount)
    setActiveLoans(activeLoanCount)
  }, [router])

  if (!isAuthenticated) {
    return null
  }

  const actionCards = [
    {
      title: "Add Loan",
      description: "Create a new loan entry",
      icon: Plus,
      href: "/loans/add",
      color: "bg-primary text-primary-foreground",
    },
    {
      title: "Track Payments",
      description: "Record loan payments",
      icon: TrendingUp,
      href: "/payments",
      color: "bg-secondary text-secondary-foreground",
    },
    {
      title: "Interest Calculator",
      description: "Calculate interest amounts",
      icon: Calculator,
      href: "/calculator",
      color: "bg-accent text-accent-foreground",
    },
    {
      title: "Reports",
      description: "View summaries and history",
      icon: FileText,
      href: "/reports",
      color: "bg-muted text-muted-foreground",
    },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="flex items-center space-x-3 mb-6">
          <img src="/bb-logo.png" alt="ByajBook" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold">ByajBook</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <IndianRupee size={16} />
            </div>
            <p className="text-xs opacity-80">Total Lent</p>
            <p className="font-semibold">₹{totalLent.toLocaleString()}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp size={16} />
            </div>
            <p className="text-xs opacity-80">Received</p>
            <p className="font-semibold">₹{totalReceived.toLocaleString()}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
            <p className="text-xs opacity-80">Active Loans</p>
            <p className="font-semibold text-lg">{activeLoans}</p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
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

        {/* Recent Loans Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Loans</h2>
            <Link href="/loans" className="text-primary text-sm font-medium">
              View All
            </Link>
          </div>
          {activeLoans === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No loans yet. Add your first loan to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {storage
                .getLoans()
                .slice(0, 3)
                .map((loan) => (
                  <Card key={loan.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{loan.borrowerName}</p>
                          <p className="text-sm text-muted-foreground">₹{loan.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{loan.interestRate}%</p>
                          <p className="text-xs text-muted-foreground">{loan.interestMethod}</p>
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
