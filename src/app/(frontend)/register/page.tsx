'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerUserAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registerUserAction, null)

  React.useEffect(() => {
    if (state?.success) {
      router.push('/admin/login?redirect=/&registered=true')
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your details to create a Playground account
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div style={{ display: 'none' }}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="johndoe"
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

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
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
            {isPending ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/admin/login?redirect=/" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
