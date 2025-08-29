// Local storage utilities for offline-first functionality
export interface Loan {
  id: string
  borrowerName: string
  borrowerPhone: string
  notes: string
  amount: number
  interestRate: number
  interestMethod: "monthly" | "yearly" | "sankda"
  interestType: "simple" | "compound"
  years?: number // Optional for backward compatibility
  dateCreated: string
  expectedReturnDate?: string // Expected date to get money back
  totalPaid: number
  isActive: boolean
}

export interface Payment {
  id: string
  loanId: string
  amount: number
  date: string
  type: "partial" | "full"
}

export const STORAGE_KEYS = {
  LOANS: "byajbook_loans",
  PAYMENTS: "byajbook_payments",
  PIN: "byajbook_pin",
  IS_AUTHENTICATED: "byajbook_auth",
  LANGUAGE: "byajbook_language",
} as const

export const storage = {
  getLoans: (): Loan[] => {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.LOANS)
    return data ? JSON.parse(data) : []
  },

  getLoanById: (id: string): Loan | null => {
    if (typeof window === "undefined") return null
    const loans = storage.getLoans()
    return loans.find((loan) => loan.id === id) || null
  },

  updateLoan: (id: string, updatedLoan: Partial<Loan>): boolean => {
    if (typeof window === "undefined") return false
    const loans = storage.getLoans()
    const loanIndex = loans.findIndex((loan) => loan.id === id)
    
    if (loanIndex === -1) return false
    
    loans[loanIndex] = { ...loans[loanIndex], ...updatedLoan }
    storage.saveLoans(loans)
    return true
  },

  deleteLoan: (id: string): boolean => {
    if (typeof window === "undefined") return false
    const loans = storage.getLoans()
    const payments = storage.getPayments()
    
    // Find loan index
    const loanIndex = loans.findIndex((loan) => loan.id === id)
    if (loanIndex === -1) return false
    
    // Remove loan
    loans.splice(loanIndex, 1)
    
    // Remove all payments for this loan
    const filteredPayments = payments.filter((payment) => payment.loanId !== id)
    
    // Save updates
    storage.saveLoans(loans)
    storage.savePayments(filteredPayments)
    
    return true
  },

  saveLoans: (loans: Loan[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans))
  },

  // Calculate final payable amount for a loan
  calculateFinalAmount: (loan: Loan): number => {
    const { amount, interestRate, interestType, years = 1, interestMethod } = loan
    const rate = interestMethod === "sankda" ? 12 : interestRate

    if (interestType === "simple") {
      // Simple Interest: A = P + (P * r * t) / 100
      const interest = (amount * rate * years) / 100
      return amount + interest
    } else {
      // Compound Interest: A = P * (1 + r/100)^t
      return amount * Math.pow(1 + rate / 100, years)
    }
  },

  // Calculate interest amount for a loan
  calculateInterestAmount: (loan: Loan): number => {
    return storage.calculateFinalAmount(loan) - loan.amount
  },

  getPayments: (): Payment[] => {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS)
    return data ? JSON.parse(data) : []
  },

  savePayments: (payments: Payment[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments))
  },

  recordPayment: (loanId: string, amount: number, type: "partial" | "full") => {
    if (typeof window === "undefined") return false

    const loans = storage.getLoans()
    const payments = storage.getPayments()

    const loanIndex = loans.findIndex((loan) => loan.id === loanId)
    if (loanIndex === -1) return false

    const loan = loans[loanIndex]
    const finalAmount = storage.calculateFinalAmount(loan)
    const outstanding = finalAmount - loan.totalPaid

    // Validate payment amount
    if (amount <= 0 || amount > outstanding) return false

    // Create new payment record
    const newPayment: Payment = {
      id: Date.now().toString(),
      loanId,
      amount,
      date: new Date().toISOString(),
      type,
    }

    // Update loan
    loans[loanIndex] = {
      ...loan,
      totalPaid: loan.totalPaid + amount,
      isActive: type === "full" || loan.totalPaid + amount < finalAmount,
    }

    // Save updates
    storage.saveLoans(loans)
    storage.savePayments([...payments, newPayment])

    return true
  },

  getPaymentsForLoan: (loanId: string): Payment[] => {
    return storage.getPayments().filter((payment) => payment.loanId === loanId)
  },

  getPin: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEYS.PIN)
  },

  setPin: (pin: string) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.PIN, pin)
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === "true"
  },

  setAuthenticated: (status: boolean) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, status.toString())
  },

  validateBackupData: (data: any): boolean => {
    return data && Array.isArray(data.loans) && Array.isArray(data.payments) && data.version && data.exportDate
  },

  getDataSize: (): string => {
    if (typeof window === "undefined") return "0 KB"

    const loans = localStorage.getItem(STORAGE_KEYS.LOANS) || ""
    const payments = localStorage.getItem(STORAGE_KEYS.PAYMENTS) || ""
    const totalSize = loans.length + payments.length

    if (totalSize < 1024) return `${totalSize} B`
    if (totalSize < 1024 * 1024) return `${Math.round(totalSize / 1024)} KB`
    return `${Math.round(totalSize / (1024 * 1024))} MB`
  },

  getLanguage: (): "en" | "hi" => {
    if (typeof window === "undefined") return "en"
    const language = localStorage.getItem(STORAGE_KEYS.LANGUAGE)
    return language === "hi" ? "hi" : "en"
  },

  setLanguage: (language: "en" | "hi") => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language)
  },
}
