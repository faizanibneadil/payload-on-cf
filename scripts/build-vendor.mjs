import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const refDir = '/tmp/vivari-ref'
const targetVendorDir = path.join(root, 'public', 'vendor')

if (!fs.existsSync(targetVendorDir)) {
  fs.mkdirSync(targetVendorDir, { recursive: true })
}

const scripts = [
  'scripts/vendor-npm.mjs',
  'scripts/vendor-yarn.mjs',
  'scripts/vendor-pnpm.mjs',
  'scripts/vendor-corepack.mjs',
  'scripts/vendor-tsgo.mjs'
]

for (const script of scripts) {
  console.log(`Running ${script}...`)
  execSync(`node ${script}`, { cwd: refDir, stdio: 'inherit' })
}

const studioVendorDir = path.join(refDir, 'packages', 'studio', 'public', 'vendor')
if (fs.existsSync(studioVendorDir)) {
  const files = fs.readdirSync(studioVendorDir)
  for (const file of files) {
    fs.copyFileSync(path.join(studioVendorDir, file), path.join(targetVendorDir, file))
    console.log(`Copied ${file} -> public/vendor/`)
  }
}
