import { getPayload } from 'payload'
import config from '@/payload.config'
import { StudioShell } from '@/components/ide/StudioShell'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const user: any = null

  return <StudioShell currentUser={user} />
}
