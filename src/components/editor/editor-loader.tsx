'use client'

import { type ComponentType, type ReactNode, useEffect, useState } from 'react'

/**
 * Editor ka JS alag chunk me, sirf owner ke browser me. Jab tak load ho, server ka read view
 * (`children`) dikhta hai — wahi classes, is liye editor aane par kuch nahi hilta.
 */
export function EditorLoader({ children }: { children: ReactNode }) {
  const [Editor, setEditor] = useState<ComponentType | null>(null)
  useEffect(() => {
    let alive = true
    void import('./board-editor').then((m) => {
      if (alive) setEditor(() => m.BoardEditor)
    })
    return () => {
      alive = false
    }
  }, [])
  return Editor ? <Editor /> : children
}
