import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Playground — HTML, CSS & JS',
  description: 'Write HTML, CSS and JavaScript with a live preview. Save, share and fork projects.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full overflow-hidden bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
