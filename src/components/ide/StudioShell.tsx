'use client'

import dynamic from 'next/dynamic'
import { IdeProvider } from './IdeProvider'

const AppShell = dynamic(
  () => import('@/components/ide/AppShell').then((mod) => mod.AppShell),
  { ssr: false }
)

export interface StudioShellProps {
  playground?: {
    id: string
    title: string
    slug: string
    owner: any
  } | null
  initialFiles?: Array<{ path: string; content: string }>
  theoryContent?: any
  currentUser?: any
}

export function StudioShell({
  playground,
  initialFiles,
  theoryContent,
  currentUser,
}: StudioShellProps) {
  return (
    <IdeProvider>
      <AppShell
        playground={playground}
        initialFiles={initialFiles}
        currentUser={currentUser}
        theoryContent={theoryContent}
      />
    </IdeProvider>
  )
}
