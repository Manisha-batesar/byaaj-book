# ByajBook - AI Coding Instructions

## Project Overview
ByajBook is an **offline-first mobile-responsive Next.js app** for personal money lending and interest tracking. The app uses local storage only (no backend/database) and implements PIN-based security for data protection.

## Core Architecture Patterns

### 1. Offline-First Data Management
- All data stored in `localStorage` via `src/lib/storage.ts`
- Key entities: `Loan` and `Payment` interfaces with specific interest calculation methods
- Three interest methods: `monthly`, `yearly`, `sankda` (12% yearly fixed rate)
- Authentication state managed through localStorage with PIN verification

### 2. Mobile-First UI Structure
- **Header + Content + BottomNav** layout pattern used across all authenticated pages
- Consistent header: `bg-primary text-primary-foreground p-6` with back navigation
- Fixed bottom navigation: `<BottomNav />` component (fixed bottom-0)
- Content area: `pb-20` to account for bottom nav height

### 3. Authentication Flow
- App starts at root `/` with PIN verification via `<PinInput />` component
- First-time users set PIN, returning users verify PIN
- All authenticated pages check `storage.isAuthenticated()` and redirect if false
- PIN change flow uses multi-step state machine pattern in settings

## Development Conventions

### Component Patterns
- Use `"use client"` for all interactive components (this is a client-side app)
- Form validation: inline validation with error state clearing on input change
- Loading states: `isSubmitting` boolean for async operations
- Navigation: Always include back button in headers using `<ArrowLeft />` + `router.back()`

### Styling System
- **Shadcn/ui** components with custom ByajBook color scheme (teal/cream theme)
- No dark mode - light theme only with warm color palette
- Card-based layouts: `<Card><CardHeader><CardContent>` structure
- Button variants: `outline` buttons use `bg-transparent` for consistent styling

### Data Flow Patterns
- Direct localStorage operations via `storage` utility (no state management library)
- Form submissions: validate → save to localStorage → navigate
- Real-time calculations in calculator without persisting intermediate state
- Summary stats calculated on-demand from localStorage data

## Key Business Logic

### Interest Calculations
- **Monthly**: `(principal * rate) / 100` per month
- **Yearly**: Simple interest `(principal * rate * time) / 100`
- **Sankda**: Fixed 12% yearly, calculated monthly (`yearlyInterest / 12`)

### Payment Recording
- Payments update loan's `totalPaid` and `isActive` status
- Validation: payment amount must be > 0 and ≤ outstanding amount
- Payment history maintained separately from loan records

## File Organization
- `/src/app/` - Next.js app router pages (each page.tsx is a full screen)
- `/src/components/ui/` - Shadcn/ui components (don't modify these)
- `/src/components/` - Custom components (PinInput, BottomNav)
- `/src/lib/storage.ts` - All data persistence logic
- Custom color scheme defined in `/src/app/globals.css`

## Development Commands
```bash
npm run dev        # Development server
npm run build      # Production build  
npm run lint       # ESLint check
```

## Critical Implementation Notes
- Always wrap amount displays with `.toLocaleString()` for proper formatting
- Use `typeof window === "undefined"` checks in storage.ts for SSR safety
- Form validation should clear errors on input change for better UX
- Maintain consistent header structure across pages for navigation predictability
- All monetary calculations should handle floating point precision appropriately
