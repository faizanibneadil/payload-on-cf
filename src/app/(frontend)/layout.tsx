import React from 'react'
import '@/app/globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-context'

export const metadata = {
  description: 'Multi-User Code Playground built with Next.js, Payload CMS, Cloudflare D1, and Vivari WebContainer',
  title: 'Code Playground',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
