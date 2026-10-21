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
import { openNewBoardDialog } from './new-board-dialog'

export function UserMenu({ username, role }: { username: string; role: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const onLogout = () =>
    startTransition(async () => {
      await logoutAction()
      router.push('/')
      router.refresh()
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5" data-testid="user-menu-trigger" />
        }
      >
        <UserRound />
        <span className="max-w-32 truncate">{username}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-medium text-foreground">{username}</span>
            <span className="text-xs capitalize">{role}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/')}>
          <LayoutGrid />
          My boards
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openNewBoardDialog}>
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
