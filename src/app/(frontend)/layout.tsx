import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Boards',
  description: 'Interactive lecture boards for instructors.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full overflow-hidden bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
