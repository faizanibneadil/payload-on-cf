'use client'

import React from 'react'
import Link from 'next/link'

export function AfterLoginComponent() {
  return (
    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
      <p>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: 'var(--theme-elevation-800)', textDecoration: 'underline' }}>
          Create an account
        </Link>
      </p>
    </div>
  )
}

export function BeforeLoginComponent() {
  const [showNotice, setShowNotice] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('registered') === 'true') {
        setShowNotice(true)
      }
    }
  }, [])

  if (!showNotice) return null

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '0.375rem',
        color: '#15803d',
        fontSize: '0.875rem',
        textAlign: 'center',
      }}
    >
      Account created. Please log in.
    </div>
  )
}
