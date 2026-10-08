'use client'

import React, { useState, useEffect, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from 'next-themes'
import { useVivari, VivariPreview } from '@vivari/react'
import {
  DEFAULT_PLAYGROUND_FILES,
  FileSystemTree,
  flattenTree,
  unflattenTree,
  MAX_FILE_COUNT,
} from './vivari-fs-utils'
import { FileCode, Plus, Trash2, Edit3, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PracticalEditorProps {
  initialFiles?: Record<string, string> | FileSystemTree | null
  onChange?: (files: Record<string, string>) => void
  readOnly?: boolean
}

export default function PracticalEditor({
  initialFiles,
  onChange,
  readOnly = false,
}: PracticalEditorProps) {
  const { theme } = useTheme()

  const [filesMap, setFilesMap] = useState<Record<string, string>>(() => {
    if (!initialFiles) {
      return flattenTree(DEFAULT_PLAYGROUND_FILES)
    }
    if ('index.html' in initialFiles && typeof initialFiles['index.html'] === 'object') {
      return flattenTree(initialFiles as FileSystemTree)
    }
    return initialFiles as Record<string, string>
  })

  const [activeFile, setActiveFile] = useState<string>(() => {
    const keys = Object.keys(filesMap)
    return keys.includes('index.html') ? 'index.html' : keys[0] || 'index.html'
  })

  const [newFileName, setNewFileName] = useState('')
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const vivariTree = useMemo(() => {
    return unflattenTree(filesMap)
  }, [filesMap])

  const { vivari, status } = useVivari()

  useEffect(() => {
    if (vivari) {
      try {
        vivari.mount(vivariTree).catch(() => {})
      } catch {}
    }
  }, [vivari, vivariTree])

  useEffect(() => {
    if (vivari && vivari.fs) {
      for (const [path, contents] of Object.entries(filesMap)) {
        vivari.fs.writeFile(path, contents).catch(() => {})
      }
    }
  }, [vivari, filesMap])

  const handleFileChange = (path: string, newContent: string) => {
    const updated = { ...filesMap, [path]: newContent }
    setFilesMap(updated)
    if (onChange) {
      onChange(updated)
    }
  }

  const handleCreateFile = () => {
    if (!newFileName.trim()) return
    const name = newFileName.trim().replace(/^\/+/, '')
    if (Object.keys(filesMap).length >= MAX_FILE_COUNT) {
      alert(`Maximum limit of ${MAX_FILE_COUNT} files reached.`)
      return
    }
    if (filesMap[name] !== undefined) {
      alert(`File "${name}" already exists.`)
      return
    }
    const updated = { ...filesMap, [name]: '' }
    setFilesMap(updated)
    setActiveFile(name)
    setNewFileName('')
    setIsCreatingFile(false)
    if (onChange) onChange(updated)
  }

  const handleDeleteFile = (path: string) => {
    const fileKeys = Object.keys(filesMap)
    if (fileKeys.length <= 1) {
      alert('Cannot delete the only file in the playground.')
      return
    }
    if (!confirm(`Delete "${path}"?`)) return
    const updated = { ...filesMap }
    delete updated[path]
    setFilesMap(updated)
    const remainingKeys = Object.keys(updated)
    if (activeFile === path) {
      setActiveFile(remainingKeys.includes('index.html') ? 'index.html' : remainingKeys[0])
    }
    if (onChange) onChange(updated)
  }

  const handleRenameFile = (oldPath: string) => {
    if (!renameValue.trim() || renameValue === oldPath) {
      setRenamingFile(null)
      return
    }
    const newPath = renameValue.trim().replace(/^\/+/, '')
    if (filesMap[newPath] !== undefined) {
      alert(`File "${newPath}" already exists.`)
      return
    }
    const updated: Record<string, string> = {}
    for (const [k, v] of Object.entries(filesMap)) {
      if (k === oldPath) {
        updated[newPath] = v
      } else {
        updated[k] = v
      }
    }
    setFilesMap(updated)
    if (activeFile === oldPath) setActiveFile(newPath)
    setRenamingFile(null)
    if (onChange) onChange(updated)
  }

  const getLanguageExtension = (filename: string) => {
    if (filename.endsWith('.html') || filename.endsWith('.htm')) return [html()]
    if (filename.endsWith('.css')) return [css()]
    if (
      filename.endsWith('.js') ||
      filename.endsWith('.jsx') ||
      filename.endsWith('.ts') ||
      filename.endsWith('.tsx') ||
      filename.endsWith('.json')
    ) {
      return [javascript({ jsx: true, typescript: true })]
    }
    return []
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col md:flex-row overflow-hidden bg-background">
      {/* File Explorer Panel */}
      <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border bg-muted/20 flex flex-col shrink-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Files
          </span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsCreatingFile(!isCreatingFile)}
              title="New file"
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>

        {isCreatingFile && (
          <div className="p-2 border-b border-border bg-background">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile()
                if (e.key === 'Escape') setIsCreatingFile(false)
              }}
              placeholder="filename.js"
              autoFocus
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {Object.keys(filesMap).map((path) => {
            const isActive = activeFile === path
            const isEditing = renamingFile === path

            return (
              <div
                key={path}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setActiveFile(path)}
              >
                <div className="flex items-center gap-1.5 truncate flex-1">
                  <FileCode className="size-3.5 shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameFile(path)
                        if (e.key === 'Escape') setRenamingFile(null)
                      }}
                      onBlur={() => handleRenameFile(path)}
                      autoFocus
                      className="w-full rounded border border-input bg-background px-1 text-xs outline-none"
                    />
                  ) : (
                    <span className="truncate">{path}</span>
                  )}
                </div>

                {!readOnly && !isEditing && (
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenamingFile(path)
                        setRenameValue(path)
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                      title="Rename"
                    >
                      <Edit3 className="size-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFile(path)
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Code Editor Panel */}
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-border min-h-[300px]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/10 text-xs">
          <span className="font-mono text-muted-foreground">{activeFile}</span>
          {readOnly && <span className="text-amber-500 font-medium">Read-only mode</span>}
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeMirror
            value={filesMap[activeFile] || ''}
            height="100%"
            theme={theme === 'dark' ? oneDark : undefined}
            extensions={getLanguageExtension(activeFile)}
            onChange={(value) => handleFileChange(activeFile, value)}
            readOnly={readOnly}
            className="h-full text-xs md:text-sm font-mono"
          />
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-full md:w-1/2 flex flex-col min-h-[300px] bg-background">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/10 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Eye className="size-3.5" />
            <span>Live Preview</span>
          </div>
          {status !== 'ready' && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Status: {status}...
            </span>
          )}
        </div>
        <div className="flex-1 relative bg-white dark:bg-zinc-950">
          {vivari ? (
            <VivariPreview vivari={vivari} className="w-full h-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
              Initializing live preview...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
