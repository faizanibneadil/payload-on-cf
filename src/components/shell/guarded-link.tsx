'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { confirmLeave } from './leave-guard'

/** Next Link jo unsaved changes hon to pehle confirm karta hai */
export function GuardedLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (!confirmLeave()) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
    />
  )
}
