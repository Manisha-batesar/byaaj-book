import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { LanguageProvider } from "@/components/language-provider"
import "./globals.css"

export const metadataBase = new URL('https://byaaj-book.vercel.app/')

export const metadata: Metadata = {
  title: "ByajBook - Loan Management",
  description: "Simple offline-first app to manage personal money lending and interest tracking",
  generator: "v0.app",
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any', type: 'image/png' }
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "ByajBook - Loan Management",
    description: "Simple offline-first app to manage personal money lending and interest tracking",
    url: '/',
    siteName: 'ByajBook',
    images: [
      {
        url: '/preview.jpg',
        alt: 'ByajBook preview',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ByajBook - Loan Management',
    description: 'Simple offline-first app to manage personal money lending and interest tracking',
    images: ['/preview.jpg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
  <link rel="canonical" href={metadataBase.href} />
        <link rel="icon" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <script src="/test-speech.js" defer></script>
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
