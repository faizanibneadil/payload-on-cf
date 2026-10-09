'use client'

import dynamic from 'next/dynamic'

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
    <AppShell
      playground={playground}
      currentUser={currentUser}
      theoryContent={theoryContent}
    />
  )
}
