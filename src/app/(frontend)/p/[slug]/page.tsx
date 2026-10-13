import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/app/(frontend)/actions'
import { getPlaygroundBySlug } from '../actions'
import SharedPlaygroundView from './SharedPlaygroundView'

export default async function PlaygroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getCurrentUser()
  const data = await getPlaygroundBySlug(slug)

  if (!data) {
    notFound()
  }

  return <SharedPlaygroundView user={user} playground={data.playground} initialFiles={data.files} />
}
