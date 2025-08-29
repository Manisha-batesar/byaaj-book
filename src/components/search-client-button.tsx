"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { storage } from "@/lib/storage"

export function SearchClientButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const router = useRouter()

  // Auto-search as user types
  useEffect(() => {
    if (query.trim()) {
      const loans = storage.getLoans()
      const filtered = loans.filter(
        (loan: any) => loan.borrowerName.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
    } else {
      setResults([])
    }
  }, [query])

  const handleClientClick = (loanId: string) => {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(`/loans/${loanId}`)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10 mr-2"
        onClick={() => setOpen(true)}
        aria-label="Search client"
      >
        <Search size={18} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Search Client</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Enter client name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {query && results.length === 0 && (
              <p className="text-muted-foreground text-sm">No clients found.</p>
            )}
            {results.map(loan => (
              <div 
                key={loan.id} 
                className="p-3 rounded bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => handleClientClick(loan.id)}
              >
                <div className="font-semibold">{loan.borrowerName}</div>
                <div className="text-xs text-muted-foreground">Amount: ₹{loan.amount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Interest: {loan.interestRate}% ({loan.interestMethod})</div>
                <div className="text-xs text-muted-foreground">
                  Status: {loan.isActive ? "Active" : "Completed"}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
