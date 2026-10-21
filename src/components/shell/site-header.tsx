import { LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getCurrentUser } from '@/lib/session'
import { AuthButton, AuthDialog } from './auth-dialog'
import { NewBoardDialog } from './new-board-dialog'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

/**
 * App ka header: left = product name (+ board ka title), right = page ke actions, theme toggle aur
 * user menu / Sign in. Server component hai — sirf buttons aur menus client hain.
 */
export async function SiteHeader({ title, actions }: { title?: ReactNode; actions?: ReactNode }) {
  const user = await getCurrentUser()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutGrid className="size-3.5" />
        </span>
        <span className={title ? 'hidden sm:inline' : undefined}>Boards</span>
      </Link>
      {title ? (
        <>
          <span className="hidden text-muted-foreground sm:inline">/</span>
          <div className="min-w-0 flex-1 truncate">{title}</div>
        </>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <ThemeToggle />
        {user ? (
          <>
            <UserMenu username={user.username ?? ''} role={user.role} />
            <NewBoardDialog />
          </>
        ) : (
          <>
            <AuthButton tab="signin" size="sm" data-testid="header-signin">
              Sign in
            </AuthButton>
            <AuthDialog />
          </>
        )}
      </div>
    </header>
  )
}
