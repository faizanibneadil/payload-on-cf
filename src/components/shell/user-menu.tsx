'use client'

import { LayoutGrid, LogOut, Plus, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { logoutAction } from '@/app/(frontend)/actions/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { confirmLeave } from './leave-guard'
import { openNewBoardDialog } from './new-board-dialog'

export function UserMenu({ username, role }: { username: string; role: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // logoutAction server par hi `/` par redirect karta hai
  const onLogout = () => {
    if (confirmLeave()) startTransition(() => logoutAction())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            aria-label={`Account menu (${username})`}
            data-testid="user-menu-trigger"
          />
        }
      >
        <UserRound />
        <span className="hidden max-w-32 truncate sm:inline">{username}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">{username}</span>
            <span className="text-xs capitalize">{role}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => confirmLeave() && router.push('/')}>
          <LayoutGrid />
          My boards
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => confirmLeave() && openNewBoardDialog()}>
          <Plus />
          New board
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} disabled={pending} data-testid="logout">
          <LogOut />
          {pending ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
