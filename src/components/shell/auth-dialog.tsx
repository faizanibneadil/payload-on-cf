'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useId, useState, useTransition } from 'react'
import { type AuthResult, loginAction, registerAction } from '@/app/(frontend)/actions/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  validatePassword,
  validateUsername,
} from '@/lib/username'

export type AuthTab = 'signin' | 'register'

// Ek hi dialog poori app me — header aur home page ke buttons isi event se use kholte hain
const OPEN_EVENT = 'boards-open-auth'

export function openAuthDialog(tab: AuthTab) {
  window.dispatchEvent(new CustomEvent<AuthTab>(OPEN_EVENT, { detail: tab }))
}

export function AuthButton({
  tab,
  children,
  ...props
}: { tab: AuthTab } & Omit<React.ComponentProps<typeof Button>, 'onClick'>) {
  return (
    <Button {...props} onClick={() => openAuthDialog(tab)}>
      {children}
    </Button>
  )
}

export function AuthDialog() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<AuthTab>('signin')

  useEffect(() => {
    const onOpen = (event: Event) => {
      setTab((event as CustomEvent<AuthTab>).detail)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm" data-testid="auth-dialog">
        <DialogHeader>
          <DialogTitle>{tab === 'signin' ? 'Sign in' : 'Create an account'}</DialogTitle>
          <DialogDescription>
            {tab === 'signin'
              ? 'Sign in with your username and password.'
              : 'Create an instructor account to prepare lecture boards.'}
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as AuthTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="pt-3">
            <SignInForm onDone={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="register" className="pt-3">
            <RegisterForm onDone={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

type Errors = Partial<Record<'username' | 'password' | 'confirmPassword' | 'form', string>>

function useAuthSubmit(onDone: () => void) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Errors>({})

  const submit = (action: () => Promise<AuthResult>) => {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        setErrors({})
        onDone()
        // Server components (header, home) naye user ke saath dobara render hon
        router.refresh()
        return
      }
      setErrors(result.field ? { [result.field]: result.error } : { form: result.error })
    })
  }

  return { pending, errors, setErrors, submit }
}

function SignInForm({ onDone }: { onDone: () => void }) {
  const { pending, errors, setErrors, submit } = useAuthSubmit(onDone)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') ?? '')
    const password = String(form.get('password') ?? '')
    const next: Errors = {}
    if (!username.trim()) next.username = 'Username is required'
    if (!password) next.password = 'Password is required'
    if (Object.keys(next).length) return setErrors(next)
    submit(() => loginAction({ username, password }))
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit} noValidate data-testid="signin-form">
      <Field name="username" label="Username" autoComplete="username" error={errors.username} />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
      />
      <FormError message={errors.form} />
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { pending, errors, setErrors, submit } = useAuthSubmit(onDone)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      username: String(form.get('username') ?? ''),
      password: String(form.get('password') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
      website: String(form.get('website') ?? ''),
    }
    // Client par wahi rules jo server par hain (server phir bhi dobara check karta hai)
    const next: Errors = {}
    const usernameCheck = validateUsername(input.username)
    if (usernameCheck !== true) next.username = usernameCheck
    const passwordCheck = validatePassword(input.password)
    if (passwordCheck !== true) next.password = passwordCheck
    else if (input.password !== input.confirmPassword) {
      next.confirmPassword = 'Passwords do not match'
    }
    if (Object.keys(next).length) return setErrors(next)
    submit(() => registerAction(input))
  }

  return (
    <form className="grid gap-3" onSubmit={onSubmit} noValidate data-testid="register-form">
      <Field
        name="username"
        label="Username"
        autoComplete="username"
        hint={`${USERNAME_MIN}-${USERNAME_MAX} characters: a-z, 0-9 and _`}
        error={errors.username}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters`}
        error={errors.password}
      />
      <Field
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      {/* Honeypot: bots bhar dete hain, insaan ko nazar nahi aata */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <FormError message={errors.form} />
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}

function Field({
  name,
  label,
  hint,
  error,
  type = 'text',
  autoComplete,
}: {
  name: string
  label: string
  hint?: string
  error?: string
  type?: string
  autoComplete?: string
}) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoCapitalize="none"
        spellCheck={false}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}
