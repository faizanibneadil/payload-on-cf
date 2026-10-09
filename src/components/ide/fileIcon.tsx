import React from 'react'
import {
  FileCode,
  FileText,
  FileJson,
  FileImage,
  File,
  Folder,
  FolderOpen,
  Terminal,
  Settings,
  GitBranch,
  Box,
  Database,
  Code2,
} from 'lucide-react'

export function getIconForFile(filename: string, isDirectory?: boolean, isOpen?: boolean) {
  if (isDirectory) {
    return isOpen ? (
      <FolderOpen className="size-4 shrink-0 text-amber-400" />
    ) : (
      <Folder className="size-4 shrink-0 text-amber-400" />
    )
  }

  const ext = filename.split('.').pop()?.toLowerCase()
  const lower = filename.toLowerCase()

  if (lower === 'package.json' || lower === 'package-lock.json' || lower === 'pnpm-lock.yaml') {
    return <Box className="size-4 shrink-0 text-red-400" />
  }
  if (lower === 'tsconfig.json' || lower === 'jsconfig.json') {
    return <FileCode className="size-4 shrink-0 text-blue-400" />
  }
  if (lower.startsWith('.env') || lower.endsWith('.config.js') || lower.endsWith('.config.ts')) {
    return <Settings className="size-4 shrink-0 text-slate-400" />
  }
  if (lower === '.gitignore' || lower.startsWith('.git')) {
    return <GitBranch className="size-4 shrink-0 text-orange-400" />
  }

  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="size-4 shrink-0 text-blue-400" />
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <Code2 className="size-4 shrink-0 text-yellow-400" />
    case 'json':
      return <FileJson className="size-4 shrink-0 text-yellow-500" />
    case 'css':
    case 'scss':
    case 'less':
      return <FileCode className="size-4 shrink-0 text-sky-400" />
    case 'html':
      return <FileCode className="size-4 shrink-0 text-orange-500" />
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText className="size-4 shrink-0 text-slate-300" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className="size-4 shrink-0 text-purple-400" />
    case 'sh':
    case 'bash':
    case 'zsh':
      return <Terminal className="size-4 shrink-0 text-emerald-400" />
    case 'py':
      return <FileCode className="size-4 shrink-0 text-blue-500" />
    case 'sqlite':
    case 'db':
      return <Database className="size-4 shrink-0 text-emerald-500" />
    default:
      return <File className="size-4 shrink-0 text-slate-400" />
  }
}

export function FileIcon({
  name,
  filename,
  isDirectory,
  isOpen,
  className,
}: {
  name?: string
  filename?: string
  isDirectory?: boolean
  isOpen?: boolean
  className?: string
}) {
  const target = filename || name || ''
  const icon = getIconForFile(target, isDirectory, isOpen)
  if (className && React.isValidElement(icon)) {
    return React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
      className: `${(icon.props as { className?: string }).className || ''} ${className}`,
    })
  }
  return icon
}

export function FolderIcon({
  isOpen,
  className,
}: {
  isOpen?: boolean
  className?: string
}) {
  const icon = isOpen ? (
    <FolderOpen className="size-4 shrink-0 text-amber-400" />
  ) : (
    <Folder className="size-4 shrink-0 text-amber-400" />
  )
  if (className) {
    return React.cloneElement(icon, {
      className: `${icon.props.className || ''} ${className}`,
    })
  }
  return icon
}
