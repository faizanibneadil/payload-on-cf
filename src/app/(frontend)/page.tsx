import { LayoutGrid, Share2 } from 'lucide-react'
import Link from 'next/link'
import { getPayload } from 'payload'
import { AuthButton } from '@/components/shell/auth-dialog'
import { NewBoardButton } from '@/components/shell/new-board-dialog'
import { SiteHeader } from '@/components/shell/site-header'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser } from '@/lib/session'
import config from '@/payload.config'

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <>
      <SiteHeader />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {user ? <MyBoards userId={user.id} /> : <Intro />}
      </main>
    </>
  )
}

function Intro() {
  return (
    <section className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <LayoutGrid className="size-6" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">Lecture boards for instructors</h1>
      <p className="text-muted-foreground">
        Prepare your lecture on an infinite canvas and share it with your students through a link.
      </p>
      <div className="flex gap-2">
        <AuthButton tab="register" data-testid="intro-register">
          Create an account
        </AuthButton>
        <AuthButton tab="signin" variant="outline" data-testid="intro-signin">
          Sign in
        </AuthButton>
      </div>
    </section>
  )
}

async function MyBoards({ userId }: { userId: number }) {
  const payload = await getPayload({ config })
  // Sirf apne boards (owner + createdAt index), canvas data list me nahi chahiye
  const { docs } = await payload.find({
    collection: 'boards',
    where: { owner: { equals: userId } },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
    select: { title: true, slug: true, isShared: true, updatedAt: true },
    overrideAccess: true,
  })

  return (
    <section className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">My boards</h1>
        <NewBoardButton />
      </div>
      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No boards yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first lecture board to get started.
          </p>
          <NewBoardButton variant="outline" />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="board-list">
          {docs.map((board) => (
            <li key={board.id}>
              <Link
                href={`/b/${board.slug}`}
                className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <span className="truncate font-medium">{board.title}</span>
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Updated {formatDate(board.updatedAt)}</span>
                  {board.isShared ? (
                    <Badge variant="secondary">
                      <Share2 />
                      Shared
                    </Badge>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
