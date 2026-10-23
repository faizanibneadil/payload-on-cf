import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BoardActions, BoardTitle } from '@/components/board/board-header'
import { BoardProvider } from '@/components/board/board-store'
import { EditorLoader } from '@/components/editor/editor-loader'
import { DocumentView } from '@/components/read-view/document-view'
import { SiteHeader } from '@/components/shell/site-header'
import { getBoardBySlug } from '@/lib/board-reads'
import { hasContent, readDocument } from '@/lib/document'
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
  const doc = readDocument(board.data)

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
      <main className="min-h-0 flex-1 overflow-y-auto" data-testid="board-page">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
          {canEdit ? (
            // Owner: pehle server ka read view, editor ka chunk aate hi editor
            <EditorLoader>
              <DocumentView doc={doc} />
            </EditorLoader>
          ) : hasContent(doc) ? (
            <DocumentView doc={doc} />
          ) : (
            <p className="text-muted-foreground" data-testid="empty-board">
              This board is empty.
            </p>
          )}
        </div>
      </main>
    </BoardProvider>
  )
}
