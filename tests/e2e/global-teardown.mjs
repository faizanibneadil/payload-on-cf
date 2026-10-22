import { server } from './server.mjs'

export default function globalTeardown() {
  if (!process.env.BASE_URL) server('stop')
}
