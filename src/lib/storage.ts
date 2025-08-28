// Local storage utilities for offline-first functionality
export interface Loan {
  id: string
  borrowerName: string
  borrowerPhone: string
  notes: string
  amount: number
  interestRate: number
  interestMethod: "monthly" | "yearly" | "sankda"
  dateCreated: string
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

  saveLoans: (loans: Loan[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans))
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
    const outstanding = loan.amount - loan.totalPaid

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
      isActive: type === "full" || loan.totalPaid + amount < loan.amount,
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
