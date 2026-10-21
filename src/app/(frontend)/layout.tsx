import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Providers } from '@/components/providers'
import { THEME_COOKIE } from '@/components/shell/theme-key'
import '../globals.css'

export const metadata: Metadata = {
  title: { default: 'Boards', template: '%s · Boards' },
  description: 'Interactive lecture boards for instructors.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme cookie se server par hi — pehle paint me sahi theme, koi script ya flash nahi
  const dark = (await cookies()).get(THEME_COOKIE)?.value === 'dark'
  return (
    <html lang="en" className={dark ? 'dark h-full' : 'h-full'}>
      <body className="flex h-full flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
