import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { StudioShell } from '@/components/ide/StudioShell'

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const playgrounds = await payload.find({
    collection: 'playgrounds',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
  })

  if (!playgrounds.docs.length) {
    notFound()
  }

  const playground = playgrounds.docs[0]

  const files = await payload.find({
    collection: 'playground-files',
    where: {
      playground: { equals: playground.id },
    },
    limit: 300,
  })

  const fileMap = files.docs.map((f) => ({
    path: f.path,
    content: f.content || '',
  }))

  return (
    <StudioShell
      playground={{
        id: String(playground.id),
        title: playground.title,
        slug: playground.slug,
        owner: playground.owner,
      }}
      initialFiles={fileMap}
      theoryContent={playground.theory}
    />
  )
}
