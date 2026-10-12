'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginUserAction } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginUserAction, null)

  React.useEffect(() => {
    if (state?.success) {
      router.push('/')
      router.refresh()
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Playground</h1>
          <p className="text-sm text-muted-foreground">
            Enter your username and password to continue
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="username"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              disabled={isPending}
            />
          </div>

          {state?.error && (
            <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              {state.error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
