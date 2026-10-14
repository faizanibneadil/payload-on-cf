/**
 * LEGACY MODULE — purane URL-state playgrounds ka one-time import.
 *
 * Yeh poora module future me delete kiya ja sakta hai: iske sirf do call-sites hain
 * (`app/(frontend)/page.tsx` aur `createPlaygroundAction` me best-effort delete).
 * Koi bhi fetch/delete fail ho to chup-chaap skip hota hai — app kabhi crash nahi hoti.
 */
import { createDefaultNodes } from './default-files'
import { newTempId, type TreeNode } from './playground-tree'

const API_BASE = process.env.URL_SERVICE_URL ?? 'https://url.devslix.com/api'
const TIMEOUT_MS = 4000
// sirf safe id characters allow karo (URL injection se bachne ke liye)
const SAFE_ID = /^[\w-]+$/

export interface LegacyPlayground {
  /** React key — har import alag draft state ke saath mount ho */
  key: string
  /**
   * Short-URL service ka record id (import ke baad delete ke liye). Sirf owner-style link
   * (`playgroundId` + `shortURL`) par set hota hai; share link (sirf `shortURL`) par undefined,
   * taake kisi doosre ka record delete na ho.
   */
  recordId?: string
  projectName: string
  theory: unknown
  nodes: TreeNode[]
}

interface LegacyRecord {
  id: string | number
  shortURL?: string
  urlState?: {
    type?: string
    data?: { projectName?: string; html?: string; css?: string; js?: string; theory?: unknown }
  } | null
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) return null
  return res.json()
}

/**
 * Purane link se data fetch karke naye structure me convert karta hai:
 * - `?playgroundId=<record id>&shortURL=<short id>` (owner ka link) — id se fetch
 * - `?shortURL=<short id>&a=r` (purana share link) — shortURL se lookup, delete nahi hota
 */
export async function importLegacyPlayground(params: {
  playgroundId?: string
  shortURL?: string
}): Promise<LegacyPlayground | null> {
  const { playgroundId, shortURL } = params
  if (!shortURL || !SAFE_ID.test(shortURL)) return null
  if (playgroundId && !SAFE_ID.test(playgroundId)) return null

  try {
    let body: LegacyRecord | null
    if (playgroundId) {
      body = (await fetchJson(`${API_BASE}/urls/${playgroundId}`)) as LegacyRecord | null
    } else {
      const list = (await fetchJson(
        `${API_BASE}/urls?where[shortURL][equals]=${encodeURIComponent(shortURL)}&limit=1`,
      )) as { docs?: LegacyRecord[] } | null
      body = list?.docs?.[0] ?? null
    }
    if (!body || body.shortURL !== shortURL) return null

    const data = body.urlState?.type === 'playground' ? body.urlState.data : undefined
    if (!data) return null

    const [indexHtml, styles, script] = createDefaultNodes()
    const nodes: TreeNode[] = [
      { ...indexHtml, id: newTempId(), content: data.html ?? '' },
      { ...styles, id: newTempId(), content: data.css ?? '' },
      { ...script, id: newTempId(), content: data.js ?? '' },
    ]
    return {
      key: String(body.id),
      recordId: playgroundId ? String(body.id) : undefined,
      projectName: data.projectName || 'imported-playground',
      theory: data.theory ?? null,
      nodes,
    }
  } catch {
    return null
  }
}

/** Import ke baad purana record service se hata do (best-effort, error par skip) */
export async function deleteLegacyRecord(recordId: string | undefined): Promise<void> {
  if (!recordId || !SAFE_ID.test(recordId)) return
  try {
    await fetch(`${API_BASE}/urls/${recordId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    // silently skip
  }
}
