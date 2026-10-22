'use client'

// Board editor batata hai ke unsaved changes hain; header ke links/menu isse pooch kar hi page chhorte hain
let unsaved = false

export function setUnsavedChanges(value: boolean) {
  unsaved = value
}

/** true = aage badho. Unsaved changes hon to user se confirm karo. */
export function confirmLeave(): boolean {
  if (!unsaved) return true
  const ok = window.confirm('You have unsaved changes. Leave without saving?')
  if (ok) unsaved = false
  return ok
}
