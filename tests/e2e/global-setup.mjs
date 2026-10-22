import { server } from './server.mjs'

// Production Worker build (BUILD=1 par hamesha, warna sirf jab build maujood na ho)
export default function globalSetup() {
  if (!process.env.BASE_URL) server('build')
}
