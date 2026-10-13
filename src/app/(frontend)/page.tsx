import DashboardView from '@/components/playground/DashboardView'
import { getCurrentUser, getUserPlaygrounds } from './actions'

export default async function HomePage() {
  const user = await getCurrentUser()
  const playgrounds = user ? await getUserPlaygrounds() : []

  return <DashboardView user={user} playgrounds={playgrounds} />
}
