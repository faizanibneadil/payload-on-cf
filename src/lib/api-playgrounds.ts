import { generateForkTitle, generateFallbackTitle, normalizeTitle } from './title-slug'

export interface PlaygroundData {
  id?: number | string
  title: string
  slug: string
  owner?: any
  theory?: any
  files?: any
  forkedFrom?: any
  createdAt?: string
  updatedAt?: string
}

export async function fetchPlaygroundBySlug(slug: string): Promise<PlaygroundData | null> {
  try {
    const res = await fetch(`/api/playgrounds?where[slug][equals]=${encodeURIComponent(slug)}`)
    if (!res.ok) return null
    const data = (await res.json()) as any
    if (data.docs && data.docs.length > 0) {
      return data.docs[0]
    }
    return null
  } catch {
    return null
  }
}

export async function fetchUserPlaygrounds(): Promise<PlaygroundData[]> {
  try {
    const res = await fetch(`/api/playgrounds?limit=100&sort=-createdAt`)
    if (!res.ok) return []
    const data = (await res.json()) as any
    return data.docs || []
  } catch {
    return []
  }
}

export async function isSlugTaken(slug: string, excludeId?: number | string): Promise<boolean> {
  try {
    const res = await fetch(`/api/playgrounds?where[slug][equals]=${encodeURIComponent(slug)}`)
    if (!res.ok) return false
    const data = (await res.json()) as any
    if (!data.docs || data.docs.length === 0) return false
    if (excludeId && String(data.docs[0].id) === String(excludeId)) return false
    return true
  } catch {
    return false
  }
}

export async function savePlayground(
  id: number | string | undefined,
  title: string,
  theory: any,
  files: any
): Promise<{ success: boolean; data?: PlaygroundData; error?: string }> {
  let normalizedTitle = normalizeTitle(title)
  if (!normalizedTitle) {
    normalizedTitle = generateFallbackTitle()
  }

  const slug = normalizedTitle

  if (id) {
    const taken = await isSlugTaken(slug, id)
    if (taken) {
      return { success: false, error: `Title / slug "${slug}" is already taken.` }
    }

    try {
      const res = await fetch(`/api/playgrounds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: normalizedTitle,
          slug,
          theory,
          files,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as any
        return { success: false, error: err.errors?.[0]?.message || 'Failed to update playground' }
      }
      const data = (await res.json()) as any
      return { success: true, data: data.doc || data }
    } catch (e: any) {
      return { success: false, error: e.message || 'Error updating playground' }
    }
  } else {
    let finalTitle = normalizedTitle
    let finalSlug = slug
    let taken = await isSlugTaken(finalSlug)
    let suffix = 1
    while (taken) {
      finalTitle = generateForkTitle(normalizedTitle, suffix)
      finalSlug = finalTitle
      taken = await isSlugTaken(finalSlug)
      suffix++
    }

    try {
      const res = await fetch('/api/playgrounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          slug: finalSlug,
          theory,
          files,
        }),
      })
      if (!res.ok) {
        const err = (await res.json()) as any
        return { success: false, error: err.errors?.[0]?.message || 'Failed to create playground' }
      }
      const data = (await res.json()) as any
      return { success: true, data: data.doc || data }
    } catch (e: any) {
      return { success: false, error: e.message || 'Error creating playground' }
    }
  }
}

export async function forkPlayground(
  originalPlayground: PlaygroundData | null,
  currentTitle: string,
  theory: any,
  files: any
): Promise<{ success: boolean; data?: PlaygroundData; error?: string }> {
  const baseTitle = currentTitle || originalPlayground?.title || 'untitled'
  let suffix = 0
  let forkTitle = generateForkTitle(baseTitle, suffix)
  let forkSlug = forkTitle

  let taken = await isSlugTaken(forkSlug)
  while (taken) {
    suffix++
    forkTitle = generateForkTitle(baseTitle, suffix)
    forkSlug = forkTitle
    taken = await isSlugTaken(forkSlug)
  }

  try {
    const res = await fetch('/api/playgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: forkTitle,
        slug: forkSlug,
        theory,
        files,
        forkedFrom: originalPlayground?.id || undefined,
      }),
    })
    if (!res.ok) {
      const err = (await res.json()) as any
      return { success: false, error: err.errors?.[0]?.message || 'Failed to fork playground' }
    }
    const data = (await res.json()) as any
    return { success: true, data: data.doc || data }
  } catch (e: any) {
    return { success: false, error: e.message || 'Error forking playground' }
  }
}
