'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/auth-context'
import { DashboardView } from '@/components/dashboard-view'
import { PlaygroundView } from '@/components/playground-view'

export default function HomePage() {
  const { user, loading } = useAuth()
  const [showSandbox, setShowSandbox] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (user && !showSandbox) {
    return <DashboardView onOpenDefaultPlayground={() => setShowSandbox(true)} />
  }

  return <PlaygroundView />
}
