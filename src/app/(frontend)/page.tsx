import PlaygroundIDE from '@/components/playground/PlaygroundIDE'
import { createDefaultNodes } from '@/lib/default-files'
import { importLegacyPlayground } from '@/lib/legacy-import'
import { getCurrentUser } from '@/lib/session'
import { generateFallbackTitle } from '@/lib/title-slug'
import { getUserPlaygrounds } from './actions'

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const [user, playgrounds] = await Promise.all([getCurrentUser(), getUserPlaygrounds()])

  // Purane URL-state link (?playgroundId=…&shortURL=…) ka one-time import — fail ho to normal scratch
  const legacy = await importLegacyPlayground({
    playgroundId: first(params.playgroundId),
    shortURL: first(params.shortURL),
  })

  return (
    <PlaygroundIDE
      key={legacy?.key ?? 'draft'}
      user={user ? { id: user.id, username: user.username ?? '', role: user.role } : null}
      playground={null}
      initial={{
        nodes: legacy?.nodes ?? createDefaultNodes(),
        title: legacy?.projectName ?? generateFallbackTitle(),
        theory: legacy?.theory ?? null,
      }}
      legacyRecordId={legacy?.recordId}
      fromLegacy={Boolean(legacy)}
      playgrounds={playgrounds}
    />
  )
}
