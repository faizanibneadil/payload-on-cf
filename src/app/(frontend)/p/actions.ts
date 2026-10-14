'use server'

import {
  applyChanges,
  createNodes,
  fetchNodes,
  getPayloadClient,
  isOwnerOf,
} from '@/lib/playground-server'
import { isTempId, type TreeNode } from '@/lib/playground-tree'
import { getCurrentUser } from '@/lib/session'
import { generateForkTitle, validateTitle } from '@/lib/title-slug'

const MAX_THEORY_CHARS = 512 * 1024

export async function getPlaygroundBySlug(slug: string) {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'playgrounds',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    const playground = result.docs[0]
    if (!playground) return null

    const nodes = await fetchNodes(payload, playground.id)
    const ownerId = typeof playground.owner === 'object' ? playground.owner.id : playground.owner

    // Users collection public read nahi hoti — sirf username server par nikalte hain (aur kuch nahi)
    let ownerName: string | null = null
    try {
      const owner = await payload.findByID({
        collection: 'users',
        id: ownerId,
        depth: 0,
        select: { username: true },
        overrideAccess: true,
      })
      ownerName = owner.username ?? null
    } catch {
      ownerName = null
    }

    return {
      playground: {
        id: playground.id,
        title: playground.title,
        slug: playground.slug,
        theory: playground.theory ?? null,
        ownerId,
        ownerName,
        forked: Boolean(playground.forkedFrom),
      },
      nodes,
    }
  } catch {
    return null
  }
}

interface SaveInput {
  playgroundId: number | string
  theory?: unknown
  upserts: TreeNode[]
  deletes: string[]
}

export async function savePlaygroundAction(input: SaveInput) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, error: 'Please sign in first' }

  try {
    const payload = await getPayloadClient()
    const playground = await payload.findByID({
      collection: 'playgrounds',
      id: input.playgroundId,
      depth: 0,
      overrideAccess: false,
    })
    // Friendly message; asal enforcement Payload access control karta hai
    if (!isOwnerOf(playground, user)) {
      return { success: false as const, error: 'Only the owner can edit this playground' }
    }
    if (input.theory !== undefined && JSON.stringify(input.theory).length > MAX_THEORY_CHARS) {
      return { success: false as const, error: 'Theory is too large' }
    }

    await applyChanges(payload, user, input.playgroundId, {
      theory: input.theory,
      upserts: input.upserts.map((n) => ({ ...n, id: String(n.id) })),
      deletes: input.deletes.filter((id) => !isTempId(id)).map(String),
    })

    return { success: true as const, nodes: await fetchNodes(payload, input.playgroundId) }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to save playground',
    }
  }
}

export async function renamePlaygroundAction(id: number | string, title: string) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, error: 'Please sign in first' }
  const check = validateTitle(title)
  if (check !== true) return { success: false as const, error: check }

  try {
    const payload = await getPayloadClient()
    const updated = await payload.update({
      collection: 'playgrounds',
      id,
      data: { title: title.trim() },
      depth: 0,
      user,
      overrideAccess: false,
    })
    return { success: true as const, slug: updated.slug }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to rename playground',
    }
  }
}

export async function forkPlaygroundAction(playgroundId: number | string) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, error: 'Please sign in to fork' }

  const payload = await getPayloadClient()
  let forkId: number | string | undefined
  try {
    const source = await payload.findByID({
      collection: 'playgrounds',
      id: playgroundId,
      depth: 0,
      overrideAccess: false,
    })
    const nodes = await fetchNodes(payload, source.id)

    const fork = await payload.create({
      collection: 'playgrounds',
      data: {
        title: generateForkTitle(source.title),
        owner: user.id,
        theory: source.theory ?? null,
        forkedFrom: source.id,
      } as never,
      depth: 0,
      user,
      overrideAccess: false,
    })
    forkId = fork.id
    await createNodes(payload, user, fork.id, nodes)
    return { success: true as const, slug: fork.slug }
  } catch (err) {
    if (forkId !== undefined) {
      await payload
        .delete({ collection: 'playgrounds', id: forkId, user, overrideAccess: false })
        .catch(() => {})
    }
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to fork playground',
    }
  }
}
