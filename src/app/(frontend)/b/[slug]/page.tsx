import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import { BoardActions, BoardTitle } from '@/components/board/board-header'
import { BoardProvider } from '@/components/board/board-store'
import { CanvasLoader } from '@/components/canvas/canvas-loader'
import { SiteHeader } from '@/components/shell/site-header'
import { getCurrentUser } from '@/lib/session'
import config from '@/payload.config'

type Props = { params: Promise<{ slug: string }> }

/**
 * Board ka read path ek hi jagah — baad me caching (open decision) yahin lagegi.
 * Access control Payload karta hai: private board sirf owner/admin ko milta hai, shared sab ko.
 */
const getBoardBySlug = cache(async (slug: string) => {
  const user = await getCurrentUser()
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'boards',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    select: { title: true, slug: true, owner: true, isShared: true, data: true },
    user,
    overrideAccess: false,
  })
  return { board: docs[0] ?? null, user }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { board } = await getBoardBySlug(slug)
  return { title: board?.title ?? 'Board not found' }
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params
  const { board, user } = await getBoardBySlug(slug)
  if (!board) notFound()

  const ownerId = typeof board.owner === 'object' ? board.owner.id : board.owner
  const canEdit = Boolean(user && (user.role === 'admin' || ownerId === user.id))

  return (
    <BoardProvider
      id={board.id}
      slug={board.slug}
      canEdit={canEdit}
      initialTitle={board.title}
      initialData={board.data ?? null}
      initialShared={Boolean(board.isShared)}
    >
      <SiteHeader title={<BoardTitle />} actions={<BoardActions />} />
      <main
        className="relative min-h-0 flex-1 overflow-hidden bg-muted/30"
        data-testid="board-canvas"
      >
        <CanvasLoader />
      </main>
    </BoardProvider>
  )
}
