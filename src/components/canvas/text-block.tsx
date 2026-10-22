'use client'

import { ArrowDownToLine, ArrowUpToLine, Trash2 } from 'lucide-react'
import { memo, useMemo, useRef } from 'react'
import { MAX_BLOCK_WIDTH, MIN_BLOCK_WIDTH, parseMarkdown, type TextObject } from '@/lib/scene'
import { cn } from '@/lib/utils'
import { TextEditor } from './text-editor'

/** Saved markdown ka read view — React text nodes, koi raw HTML nahi */
export const MarkdownView = memo(function MarkdownView({ markdown }: { markdown: string }) {
  const lines = useMemo(() => parseMarkdown(markdown), [markdown])
  return (
    <div className="md-lines">
      {lines.map((line, i) => (
        // Lines ki apni id nahi; index yahan theek hai (poora block ek saath render hota hai)
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        <div key={i} data-type={line.type}>
          {line.text || <br />}
        </div>
      ))}
    </div>
  )
})

export interface BlockHandlers {
  select: (id: string) => void
  startEdit: (id: string) => void
  move: (id: string, x: number, y: number) => void
  resize: (id: string, width: number) => void
  change: (id: string, markdown: string) => void
  exitEdit: (id: string, height: number) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  remove: (id: string) => void
}

const DRAG_THRESHOLD = 3

export const TextBlock = memo(function TextBlock({
  obj,
  zoom,
  canEdit,
  selected,
  editing,
  handlers,
  getZoom,
}: {
  obj: TextObject
  zoom: number
  canEdit: boolean
  selected: boolean
  editing: boolean
  handlers: BlockHandlers
  getZoom: () => number
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Drag: sirf DOM transform badlo (koi re-render nahi), chhorne par ek commit
  const onPointerDown = (event: React.PointerEvent) => {
    if (!canEdit || editing || event.button !== 0) return
    event.stopPropagation()
    handlers.select(obj.id)
    const el = ref.current
    if (!el) return
    const start = { x: event.clientX, y: event.clientY }
    let dx = 0
    let dy = 0
    let moved = false
    el.setPointerCapture(event.pointerId)
    const onMove = (e: PointerEvent) => {
      const zoomNow = getZoom()
      dx = (e.clientX - start.x) / zoomNow
      dy = (e.clientY - start.y) / zoomNow
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return
      moved = true
      el.style.translate = `${dx}px ${dy}px`
    }
    const onUp = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.style.translate = ''
      if (moved) handlers.move(obj.id, Math.round(obj.x + dx), Math.round(obj.y + dy))
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  // Right edge handle se width
  const onResizeDown = (event: React.PointerEvent) => {
    event.stopPropagation()
    const el = ref.current
    const handle = event.currentTarget as HTMLElement
    if (!el) return
    const startX = event.clientX
    let width = obj.width
    handle.setPointerCapture(event.pointerId)
    const onMove = (e: PointerEvent) => {
      width = Math.round(
        Math.min(
          MAX_BLOCK_WIDTH,
          Math.max(MIN_BLOCK_WIDTH, obj.width + (e.clientX - startX) / getZoom()),
        ),
      )
      el.style.width = `${width}px`
    }
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      if (width !== obj.width) handlers.resize(obj.id, width)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Text block"
      data-testid="text-block"
      data-block-id={obj.id}
      className={cn(
        'absolute rounded-md px-3 py-2 text-foreground',
        canEdit && !editing && 'cursor-move',
        (selected || editing) && 'ring-2 ring-primary/60',
        canEdit && !selected && !editing && 'hover:ring-1 hover:ring-primary/30',
      )}
      style={{ left: obj.x, top: obj.y, width: obj.width, zIndex: obj.zIndex }}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        if (!canEdit) return
        event.stopPropagation()
        handlers.startEdit(obj.id)
      }}
    >
      {editing ? (
        <TextEditor
          initialMarkdown={obj.markdown}
          onChange={(markdown) => handlers.change(obj.id, markdown)}
          onExit={() => handlers.exitEdit(obj.id, ref.current?.offsetHeight ?? obj.height)}
        />
      ) : (
        <MarkdownView markdown={obj.markdown} />
      )}

      {canEdit && selected && !editing ? (
        <>
          <span
            role="presentation"
            data-testid="resize-handle"
            className="absolute top-1/2 -right-1.5 h-8 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm border bg-background shadow-sm"
            onPointerDown={onResizeDown}
          />
          {/* Mini toolbar zoom ke saath chhota/bada na ho */}
          <div
            className="absolute bottom-full left-0 mb-2 flex origin-bottom-left gap-0.5 rounded-md border bg-popover p-0.5 shadow-md"
            style={{ scale: `${1 / zoom}` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MiniButton label="Bring to front" onClick={() => handlers.bringToFront(obj.id)}>
              <ArrowUpToLine />
            </MiniButton>
            <MiniButton label="Send to back" onClick={() => handlers.sendToBack(obj.id)}>
              <ArrowDownToLine />
            </MiniButton>
            <MiniButton label="Delete block" onClick={() => handlers.remove(obj.id)}>
              <Trash2 />
            </MiniButton>
          </div>
        </>
      ) : null}
    </div>
  )
})

function MiniButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-4"
    >
      {children}
    </button>
  )
}
