import { Eye } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'
import { SiteHeader } from '@/components/shell/site-header'
import { Badge } from '@/components/ui/badge'
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
    <>
      <SiteHeader
        title={
          <span className="font-medium" data-testid="board-title">
            {board.title}
          </span>
        }
        actions={
          canEdit ? null : (
            <Badge variant="outline" data-testid="view-only">
              <Eye />
              View only
            </Badge>
          )
        }
      />
      <main
        className="relative min-h-0 flex-1 overflow-hidden bg-muted/30 bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:20px_20px]"
        data-testid="board-canvas"
      >
        <p className="absolute inset-x-0 bottom-4 text-center text-sm text-muted-foreground">
          The canvas is coming in the next iteration.
        </p>
      </main>
    </>
  )
}
