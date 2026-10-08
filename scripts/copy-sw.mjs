import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const src = path.join(root, 'node_modules', '@vivari', 'core', 'dist', 'assets', 'sw.js')
const destDir = path.join(root, 'public')
const dest = path.join(destDir, 'sw.js')

if (fs.existsSync(src)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  fs.copyFileSync(src, dest)
  console.log('Successfully copied sw.js from @vivari/core to public/sw.js')
} else {
  console.warn('Warning: @vivari/core assets sw.js not found at', src)
}
