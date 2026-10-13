'use server'

import { getPayload } from 'payload'
import { getCurrentUser } from '@/app/(frontend)/actions'
import config from '@/payload.config'

export async function getPlaygroundBySlug(slug: string) {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'playgrounds',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (result.docs.length === 0) return null

    const playground = result.docs[0]

    const filesResult = await payload.find({
      collection: 'playground-files',
      where: { playground: { equals: playground.id } },
      limit: 300,
      overrideAccess: true,
    })

    return {
      playground,
      files: filesResult.docs,
    }
  } catch {
    return null
  }
}

export async function savePlaygroundAction(
  playgroundId: number | string,
  theoryContent: any,
  files: Array<{ path: string; content: string }>,
) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const payload = await getPayload({ config })

    const pg = await payload.findByID({
      collection: 'playgrounds',
      id: playgroundId,
      overrideAccess: true,
    })

    if (!pg) return { success: false, error: 'Playground not found' }

    const isOwner =
      user.role === 'admin' ||
      (typeof pg.owner === 'object' ? pg.owner.id === user.id : pg.owner === user.id)

    if (!isOwner) {
      return { success: false, error: 'Forbidden: You do not own this playground' }
    }

    if (theoryContent !== undefined) {
      await payload.update({
        collection: 'playgrounds',
        id: playgroundId,
        data: { theory: theoryContent },
        overrideAccess: true,
      })
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const cleanPath = file.path.startsWith('/') ? file.path.slice(1) : file.path
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
            data: {
              content: file.content,
              size: new TextEncoder().encode(file.content).length,
            },
            overrideAccess: true,
          })
        } else {
          await payload.create({
            collection: 'playground-files',
            data: {
              playground: Number(playgroundId),
              path: cleanPath,
              content: file.content,
              size: new TextEncoder().encode(file.content).length,
            },
            overrideAccess: true,
          })
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save playground' }
  }
}

export async function forkPlaygroundAction(playgroundId: number | string) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const payload = await getPayload({ config })

    const source = await payload.findByID({
      collection: 'playgrounds',
      id: playgroundId,
      overrideAccess: true,
    })

    if (!source) return { success: false, error: 'Source playground not found' }

    const baseTitle = `${source.title}-fork`
    let forkTitle = baseTitle.slice(0, 50)
    let slug = forkTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    let counter = 1
    while (true) {
      const existing = await payload.find({
        collection: 'playgrounds',
        where: { slug: { equals: slug } },
        overrideAccess: true,
      })
      if (existing.docs.length === 0) break
      forkTitle = `${baseTitle}-${counter}`.slice(0, 50)
      slug = forkTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      counter++
    }

    const newPg = await payload.create({
      collection: 'playgrounds',
      data: {
        title: forkTitle,
        slug,
        owner: user.id,
        theory: source.theory,
        forkedFrom: source.id,
      },
      draft: false,
      overrideAccess: true,
    })

    const sourceFiles = await payload.find({
      collection: 'playground-files',
      where: { playground: { equals: source.id } },
      limit: 300,
      overrideAccess: true,
    })

    for (const file of sourceFiles.docs) {
      await payload.create({
        collection: 'playground-files',
        data: {
          playground: newPg.id,
          path: file.path,
          content: file.content,
          size: file.size,
        },
        overrideAccess: true,
      })
    }

    return { success: true, id: newPg.id, slug: newPg.slug }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fork playground' }
  }
}
