'use client'

import { useSyncExternalStore } from 'react'
import { THEME_COOKIE } from './theme-key'

export type Theme = 'light' | 'dark'

const EVENT = 'boards-themechange'

// Light default hai; <html class="dark"> sirf tab jab user ne dark chuna ho (layout cookie se server par hi lagata hai)
function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  // Cookie taake agla page server par hi sahi theme ke saath render ho (koi flash nahi)
  // biome-ignore lint/suspicious/noDocumentCookie: ek simple preference cookie, Cookie Store API har browser me nahi
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => 'light')
}
