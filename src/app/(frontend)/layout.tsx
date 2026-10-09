import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vivari Playground',
  description: 'In-browser IDE powered by Vivari',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full overflow-hidden font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
