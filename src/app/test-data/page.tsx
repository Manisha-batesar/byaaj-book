"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { storage, type Loan } from "@/lib/storage"
import { useRouter } from "next/navigation"

export default function TestDataPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const router = useRouter()

  useEffect(() => {
    const existingLoans = storage.getLoans()
    setLoans(existingLoans)
  }, [])

  const createSampleLoans = () => {
    const sampleLoans: Omit<Loan, 'id' | 'dateCreated'>[] = [
      {
        borrowerName: "Manu Kumar",
        borrowerPhone: "9876543210",
        notes: "Friend from college",
        amount: 10000,
        interestRate: 12,
        interestMethod: "yearly",
        interestType: "simple",
        years: 1,
        expectedReturnDate: undefined,
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        totalPaid: 0,
        isActive: true,
      },
      {
        borrowerName: "Ram Sharma",
        borrowerPhone: "8765432109",
        notes: "Business loan",
        amount: 25000,
        interestRate: 15,
        interestMethod: "monthly",
        interestType: "simple",
        years: 2,
        expectedReturnDate: undefined,
        dueDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
        totalPaid: 5000,
        isActive: true,
      },
      {
        borrowerName: "Sita Patel",
        borrowerPhone: "7654321098",
        notes: "Emergency loan",
        amount: 5000,
        interestRate: 12,
        interestMethod: "sankda",
        interestType: "simple",
        years: 1,
        expectedReturnDate: undefined,
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        totalPaid: 5600,
        isActive: false,
      }
    ]

    const existingLoans = storage.getLoans()
    const newLoans = sampleLoans.map(loan => ({
      ...loan,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      dateCreated: new Date().toISOString(),
    }))

    storage.saveLoans([...existingLoans, ...newLoans])
    setLoans([...existingLoans, ...newLoans])
    alert(`Added ${newLoans.length} sample loans!`)
  }

  const clearAllLoans = () => {
    if (confirm('Are you sure you want to delete all loans?')) {
      storage.saveLoans([])
      setLoans([])
      alert('All loans deleted!')
    }
  }

  const testSearch = (searchTerm: string) => {
    const results = loans.filter(loan => 
      loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    console.log(`Search for "${searchTerm}" found:`, results)
    alert(`Search for "${searchTerm}" found ${results.length} loans. Check console for details.`)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Data Management</h1>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Back to Dashboard
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Loans ({loans.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loans.length === 0 ? (
            <p className="text-gray-500">No loans found. Create sample loans to test search functionality.</p>
          ) : (
            <div className="space-y-2">
              {loans.map((loan) => (
                <div key={loan.id} className="bg-gray-50 p-3 rounded">
                  <p><strong>{loan.borrowerName}</strong> - ₹{loan.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    Phone: {loan.borrowerPhone} | Status: {loan.isActive ? 'Active' : 'Completed'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={createSampleLoans} className="bg-green-600 hover:bg-green-700">
              Add Sample Loans
            </Button>
            <Button onClick={clearAllLoans} variant="destructive">
              Clear All Loans
            </Button>
            <Button onClick={() => testSearch('manu')} variant="outline">
              Test Search "manu"
            </Button>
            <Button onClick={() => testSearch('ram')} variant="outline">
              Test Search "ram"
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Search Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First, add sample loans using the button above</li>
            <li>Go to Dashboard and open Smart Search (green search button)</li>
            <li>Click the microphone button in the search input</li>
            <li>Say "manu" or "ram" clearly</li>
            <li>Check if the text appears in input and results show up</li>
            <li>Open browser console (F12) to see debug logs</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
