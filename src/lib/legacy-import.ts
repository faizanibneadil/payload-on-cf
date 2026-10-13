import { getPayload } from 'payload'
import config from '@/payload.config'

export interface LegacyImportParams {
  playgroundId?: string | number
  shortUrlId?: string
}

export async function importLegacyShortUrl({ playgroundId, shortUrlId }: LegacyImportParams) {
  if (!playgroundId || !shortUrlId) return null

  const serviceUrl = process.env.SHORT_URL_SERVICE_BASE || 'https://p.vv.dev/api/v1'

  try {
    const fetchRes = await fetch(`${serviceUrl}/short-url/${shortUrlId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!fetchRes.ok) return null

    const data = (await fetchRes.json()) as {
      files?: Array<{ path: string; content?: string }>
    } | null
    if (!data?.files) return null

    const payload = await getPayload({ config })

    for (const file of data.files) {
      const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path
      const size = new TextEncoder().encode(file.content || '').length

      const existing = await payload.find({
        collection: 'playground-files',
        where: {
          and: [{ playground: { equals: playgroundId } }, { path: { equals: cleanPath } }],
        },
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'playground-files',
          id: existing.docs[0].id,
          data: { content: file.content, size },
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'playground-files',
          data: { playground: Number(playgroundId), path: cleanPath, content: file.content, size },
          overrideAccess: true,
        })
      }
    }

    return true
  } catch (err) {
    console.warn('Legacy import error (skipped silently):', err)
    return null
  }
}

export async function deleteLegacyShortUrl(shortUrlId: string) {
  if (!shortUrlId) return

  const serviceUrl = process.env.SHORT_URL_SERVICE_BASE || 'https://p.vv.dev/api/v1'

  try {
    await fetch(`${serviceUrl}/short-url/${shortUrlId}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.warn('Legacy delete error (skipped silently):', err)
  }
}
