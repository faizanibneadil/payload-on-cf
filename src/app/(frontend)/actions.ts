'use server'

import { createDefaultNodes } from '@/lib/default-files'
import { deleteLegacyRecord } from '@/lib/legacy-import'
import { createNodes, getPayloadClient } from '@/lib/playground-server'
import { type TreeNode, validateTree } from '@/lib/playground-tree'
import { getCurrentUser } from '@/lib/session'
import { validateTitle } from '@/lib/title-slug'

export async function getUserPlaygrounds() {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'playgrounds',
      where: { owner: { equals: user.id } },
      sort: '-updatedAt',
      limit: 100,
      depth: 0,
      user,
      overrideAccess: false,
    })
    return result.docs.map((pg) => ({
      id: pg.id,
      title: pg.title,
      slug: pg.slug,
      updatedAt: pg.updatedAt,
      forked: Boolean(pg.forkedFrom),
    }))
  } catch {
    return []
  }
}

interface CreateInput {
  title: string
  nodes?: TreeNode[]
  theory?: unknown
  /** purane URL-state playground ka record id (import ke baad delete hoga) */
  legacyRecordId?: string
}

export async function createPlaygroundAction(input: CreateInput) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, error: 'Please sign in first' }

  const titleCheck = validateTitle(input.title)
  if (titleCheck !== true) return { success: false as const, error: titleCheck }

  const nodes = input.nodes?.length ? input.nodes : createDefaultNodes()
  const treeError = validateTree(nodes)
  if (treeError) return { success: false as const, error: treeError }

  const payload = await getPayloadClient()
  let createdId: number | string | undefined
  try {
    const created = await payload.create({
      collection: 'playgrounds',
      data: {
        title: input.title.trim(),
        owner: user.id,
        theory: (input.theory ?? null) as Record<string, unknown> | null,
      } as never,
      depth: 0,
      user,
      overrideAccess: false,
    })
    createdId = created.id
    await createNodes(payload, user, created.id, nodes)

    // Legacy record best-effort delete (fail ho to skip)
    if (input.legacyRecordId) await deleteLegacyRecord(input.legacyRecordId)

    return { success: true as const, slug: created.slug }
  } catch (err) {
    console.error('[createPlaygroundAction] failed', err)
    // Half-created playground na bache
    if (createdId !== undefined) {
      await payload
        .delete({ collection: 'playgrounds', id: createdId, user, overrideAccess: false })
        .catch(() => {})
    }
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to create playground',
    }
  }
}

export async function deletePlaygroundAction(id: number | string) {
  const user = await getCurrentUser()
  if (!user) return { success: false as const, error: 'Please sign in first' }
  try {
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'playgrounds', id, user, overrideAccess: false })
    return { success: true as const }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to delete playground',
    }
  }
}
