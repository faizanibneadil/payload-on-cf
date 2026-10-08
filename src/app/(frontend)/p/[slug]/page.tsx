import { getPayload } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import { PlaygroundView } from '@/components/playground-view'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicPlaygroundPage({ params }: PageProps) {
  const { slug } = await params

  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'playgrounds',
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  if (!result.docs || result.docs.length === 0) {
    notFound()
  }

  const playgroundData = JSON.parse(JSON.stringify(result.docs[0]))

  return <PlaygroundView initialPlayground={playgroundData} />
}
