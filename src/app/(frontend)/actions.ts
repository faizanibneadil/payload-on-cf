'use server'

import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null

    const payload = await getPayload({ config })
    const { user } = await payload.auth({
      headers: new Headers({
        cookie: `payload-token=${token}`,
      }),
    })

    return user || null
  } catch {
    return null
  }
}

export async function getUserPlaygrounds() {
  const user = await getCurrentUser()
  if (!user) return []

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'playgrounds',
      where: {
        owner: { equals: user.id },
      },
      sort: '-updatedAt',
      limit: 100,
      overrideAccess: true,
    })

    return result.docs
  } catch {
    return []
  }
}

export async function createNewPlaygroundAction(title: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'playgrounds',
      data: {
        title,
        owner: user.id,
      },
      overrideAccess: true,
    })

    // Create default files
    const defaultFiles = [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Playground</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello World</h1>
    <script src="script.js"></script>
  </body>
</html>`,
      },
      {
        path: 'styles.css',
        content: `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  background: #18181b;
  color: #fff;
}`,
      },
      {
        path: 'script.js',
        content: `console.log('Hello from my playground!');`,
      },
    ]

    for (const file of defaultFiles) {
      await payload.create({
        collection: 'playground-files',
        data: {
          playground: created.id,
          path: file.path,
          content: file.content,
          size: new TextEncoder().encode(file.content).length,
        },
        overrideAccess: true,
      })
    }

    return { success: true, id: created.id, slug: created.slug }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create playground' }
  }
}
