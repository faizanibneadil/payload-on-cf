import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUserPlaygrounds } from '@/app/(frontend)/actions'
import PlaygroundIDE from '@/components/playground/PlaygroundIDE'
import { getCurrentUser } from '@/lib/session'
import { getPlaygroundBySlug } from '../actions'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: `${slug} — Playground` }
}

export default async function PlaygroundPage({ params }: Props) {
  const { slug } = await params
  const [user, data, playgrounds] = await Promise.all([
    getCurrentUser(),
    getPlaygroundBySlug(slug),
    getUserPlaygrounds(),
  ])

  if (!data) notFound()

  const { playground, nodes } = data

  return (
    <PlaygroundIDE
      key={playground.id}
      user={user ? { id: user.id, username: user.username ?? '', role: user.role } : null}
      playground={{
        id: playground.id,
        title: playground.title,
        slug: playground.slug,
        ownerId: playground.ownerId,
        ownerName: playground.ownerName,
      }}
      initial={{ nodes, title: playground.title, theory: playground.theory }}
      playgrounds={playgrounds}
    />
  )
}
