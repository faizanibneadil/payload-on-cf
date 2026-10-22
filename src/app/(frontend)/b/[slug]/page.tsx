import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoardActions, BoardTitle } from '@/components/board/board-header'
import { BoardProvider } from '@/components/board/board-store'
import { CanvasLoader } from '@/components/canvas/canvas-loader'
import { SiteHeader } from '@/components/shell/site-header'
import { getBoardBySlug } from '@/lib/board-reads'
import { getCurrentUser } from '@/lib/session'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const board = await getBoardBySlug(slug, await getCurrentUser())
  return { title: board?.title ?? 'Board not found' }
}

export default async function BoardPage({ params }: Props) {
  const { slug } = await params
  // Payload load kiye baghair: JWT + session check aur ek D1 query (free plan ka CPU)
  const user = await getCurrentUser()
  const board = await getBoardBySlug(slug, user)
  if (!board) notFound()

  const canEdit = Boolean(user && (user.role === 'admin' || board.owner === user.id))

  return (
    <BoardProvider
      id={board.id}
      slug={board.slug}
      canEdit={canEdit}
      initialTitle={board.title}
      initialData={board.data ?? null}
      initialShared={board.isShared}
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
