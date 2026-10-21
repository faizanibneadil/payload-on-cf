'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/components/shell/theme'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return (
    <>
      <TooltipProvider delay={300}>{children}</TooltipProvider>
      <Toaster position="bottom-right" theme={theme} />
    </>
  )
}
