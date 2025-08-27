"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Phone, Calendar, IndianRupee } from "lucide-react"
import { storage, type Loan } from "@/lib/storage"
import Link from "next/link"

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  useEffect(() => {
    setLoans(storage.getLoans())
  }, [])

  const filteredLoans = loans.filter((loan) => {
    if (filter === "active") return loan.isActive
    if (filter === "completed") return !loan.isActive
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
    return loan.amount - loan.totalPaid
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
            <h1 className="text-xl font-bold">All Loans</h1>
          </div>
          <Link href="/loans/add">
            <Button variant="secondary" size="sm">
              <Plus size={16} className="mr-1" />
              Add
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-6 pb-0">
        <div className="flex space-x-2">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as typeof filter)}
              className="bg-transparent"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loans List */}
      <div className="p-6 space-y-4">
        {filteredLoans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {filter === "all" ? "No loans found" : `No ${filter} loans found`}
              </p>
              <Link href="/loans/add">
                <Button>Add Your First Loan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredLoans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{loan.borrowerName}</h3>
                    {loan.borrowerPhone && (
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Phone size={14} className="mr-1" />
                        {loan.borrowerPhone}
                      </div>
                    )}
                  </div>
                  <Badge variant={loan.isActive ? "default" : "secondary"}>
                    {loan.isActive ? "Active" : "Completed"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Loan Amount</p>
                    <p className="font-semibold flex items-center">
                      <IndianRupee size={14} className="mr-1" />
                      {loan.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="font-semibold flex items-center">
                      <IndianRupee size={14} className="mr-1" />
                      {calculateOutstanding(loan).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">
                      {loan.interestRate}% {loan.interestMethod}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date Created</p>
                    <p className="font-medium flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(loan.dateCreated)}
                    </p>
                  </div>
                </div>

                {loan.totalPaid > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">₹{loan.totalPaid.toLocaleString()} paid</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(loan.totalPaid / loan.amount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {loan.notes && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{loan.notes}</p>
                  </div>
                )}

                <div className="flex space-x-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    View Details
                  </Button>
                  {loan.isActive && (
                    <Link href="/payments" className="flex-1">
                      <Button size="sm" className="w-full">
                        Record Payment
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
