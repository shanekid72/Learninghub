import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const brandLogoUrl = "https://www.pearldatadirect.com/assets/images/logo.png";

export const metadata: Metadata = {
  title: 'Learning Hub',
  description: 'Internal learning portal for teams - training modules, role paths, and onboarding',
  generator: 'v0.app',
  icons: {
    icon: [{ url: brandLogoUrl, type: "image/png" }],
    shortcut: [{ url: brandLogoUrl, type: "image/png" }],
    apple: [{ url: brandLogoUrl, type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
