import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function copyFile(src, dest) {
  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  fs.copyFileSync(src, dest)
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFile(srcPath, destPath)
    }
  }
}

// 1. sw.js from @vivari/core
const swSrc = path.join(root, 'node_modules', '@vivari', 'core', 'dist', 'assets', 'sw.js')
const swDest = path.join(root, 'public', 'sw.js')
if (fs.existsSync(swSrc)) {
  copyFile(swSrc, swDest)
  console.log('Copied sw.js -> public/sw.js')
} else {
  console.warn('Warning: @vivari/core sw.js not found at', swSrc)
}

// 2. chobitsu.js from chobitsu
const chobitsuSrc = path.join(root, 'node_modules', 'chobitsu', 'chobitsu.js')
const chobitsuDest = path.join(root, 'public', 'vv-devtools', 'chobitsu.js')
if (fs.existsSync(chobitsuSrc)) {
  copyFile(chobitsuSrc, chobitsuDest)
  console.log('Copied chobitsu.js -> public/vv-devtools/chobitsu.js')
} else {
  console.warn('Warning: chobitsu.js not found at', chobitsuSrc)
}

// 3. chii public files from chii
const chiiPublicSrc = path.join(root, 'node_modules', 'chii', 'public')
const chiiDest = path.join(root, 'public', 'devtools')
if (fs.existsSync(chiiPublicSrc)) {
  copyDir(chiiPublicSrc, chiiDest)
  console.log('Copied chii public files -> public/devtools/')
} else {
  console.warn('Warning: chii/public not found at', chiiPublicSrc)
}
