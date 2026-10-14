'use client'

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  File as FileIcon,
  FileJson,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { childrenOf, descendantsOf, type TreeNode } from '@/lib/playground-tree'
import { cn } from '@/lib/utils'

type Editing =
  | { kind: 'create'; type: 'file' | 'folder'; parentId: string | null }
  | { kind: 'rename'; id: string }

interface FileExplorerProps {
  nodes: TreeNode[]
  activeId: string | null
  readOnly: boolean
  onOpen: (id: string) => void
  /** Error message (string) return karo agar name invalid ho, warna null */
  onCreate: (parentId: string | null, name: string, type: 'file' | 'folder') => string | null
  onRename: (id: string, name: string) => string | null
  onDelete: (id: string) => void
}

function iconFor(node: TreeNode, open: boolean) {
  if (node.type === 'folder') return open ? FolderOpen : Folder
  const ext = node.name.split('.').pop()?.toLowerCase()
  if (ext === 'json') return FileJson
  if (['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'mjs'].includes(ext ?? '')) return FileCode2
  return FileIcon
}

function NameInput({
  initial,
  depth,
  onSubmit,
  onCancel,
}: {
  initial: string
  depth: number
  onSubmit: (name: string) => string | null
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    const input = ref.current
    if (!input) return
    input.focus()
    const dot = initial.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : initial.length)
  }, [initial])

  const commit = () => {
    if (done.current) return
    const name = value.trim()
    if (!name || name === initial) {
      done.current = true
      onCancel()
      return
    }
    const message = onSubmit(name)
    if (message) {
      setError(message)
      ref.current?.focus()
    } else {
      done.current = true
    }
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      done.current = true
      onCancel()
    }
  }

  return (
    <div style={{ paddingLeft: 8 + depth * 14 }} className="pr-2 py-0.5">
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        onKeyDown={handleKey}
        onBlur={commit}
        aria-label="File or folder name"
        aria-invalid={Boolean(error)}
        className={cn(
          'h-6 w-full rounded-sm border bg-background px-1.5 text-xs outline-none focus:border-ring',
          error && 'border-destructive',
        )}
      />
      {error && <p className="mt-0.5 text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

export default function FileExplorer({
  nodes,
  activeId,
  readOnly,
  onOpen,
  onCreate,
  onRename,
  onDelete,
}: FileExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Editing | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TreeNode | null>(null)

  const expand = (id: string) => setExpanded((prev) => new Set(prev).add(id))
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const startCreate = (type: 'file' | 'folder', parentId: string | null) => {
    if (parentId) expand(parentId)
    setEditing({ kind: 'create', type, parentId })
  }

  // Selected folder me create karne ke liye: active file ka parent, warna root
  const activeParent = nodes.find((n) => n.id === activeId)?.parentId ?? null

  const renderLevel = (parentId: string | null, depth: number): ReactElement[] => {
    const rows = childrenOf(nodes, parentId).flatMap((node) => {
      const isOpen = expanded.has(node.id)
      const isActive = node.id === activeId
      const Icon = iconFor(node, isOpen)

      if (editing?.kind === 'rename' && editing.id === node.id) {
        return [
          <NameInput
            key={node.id}
            initial={node.name}
            depth={depth}
            onSubmit={(name) => {
              const message = onRename(node.id, name)
              if (!message) setEditing(null)
              return message
            }}
            onCancel={() => setEditing(null)}
          />,
        ]
      }

      const row = (
        <div
          key={node.id}
          className={cn(
            'group flex items-center gap-1 pr-1 text-[13px]',
            isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
          )}
          style={{ paddingLeft: 4 + depth * 14 }}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
            onClick={() => (node.type === 'folder' ? toggle(node.id) : onOpen(node.id))}
            onDoubleClick={() => !readOnly && setEditing({ kind: 'rename', id: node.id })}
            onKeyDown={(e) => {
              if (e.key === 'F2' && !readOnly) setEditing({ kind: 'rename', id: node.id })
            }}
            title={node.name}
          >
            {node.type === 'folder' ? (
              isOpen ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="size-3.5 shrink-0" />
            )}
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </button>

          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Actions for ${node.name}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {node.type === 'folder' && (
                  <>
                    <DropdownMenuItem onClick={() => startCreate('file', node.id)}>
                      <FilePlus /> New file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startCreate('folder', node.id)}>
                      <FolderPlus /> New folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setEditing({ kind: 'rename', id: node.id })}>
                  <Pencil /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(node)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )

      if (node.type === 'folder' && isOpen) return [row, ...renderLevel(node.id, depth + 1)]
      return [row]
    })

    if (editing?.kind === 'create' && editing.parentId === parentId) {
      rows.unshift(
        <NameInput
          key="__create"
          initial=""
          depth={depth}
          onSubmit={(name) => {
            const message = onCreate(parentId, name, editing.type)
            if (!message) setEditing(null)
            return message
          }}
          onCancel={() => setEditing(null)}
        />,
      )
    }
    return rows
  }

  const pendingCount = pendingDelete ? descendantsOf(nodes, pendingDelete.id).length : 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Files
        </span>
        {!readOnly && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              title="New file"
              aria-label="New file"
              onClick={() => startCreate('file', activeParent)}
            >
              <FilePlus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              title="New folder"
              aria-label="New folder"
              onClick={() => startCreate('folder', activeParent)}
            >
              <FolderPlus />
            </Button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1" role="tree" aria-label="Project files">
        {renderLevel(null, 0)}
        {nodes.length === 0 && editing === null && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            {readOnly ? 'No files.' : 'No files yet. Use the buttons above to create one.'}
          </p>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}”{pendingCount > 0 ? ` and its ${pendingCount} item(s)` : ''}{' '}
              will be removed when you save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
