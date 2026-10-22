'use client'

import { ArrowDownToLine, ArrowUpToLine, Trash2 } from 'lucide-react'
import { memo, useEffect, useMemo, useRef } from 'react'
import {
  MAX_BLOCK_HEIGHT,
  MAX_BLOCK_WIDTH,
  MAX_TEXT_SCALE,
  MIN_BLOCK_WIDTH,
  MIN_TEXT_SCALE,
  parseMarkdown,
  type TextObject,
} from '@/lib/scene'
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

export interface BlockRect {
  x: number
  y: number
  width: number
  height: number
  scale?: number
}

export interface BlockHandlers {
  select: (id: string) => void
  startEdit: (id: string) => void
  move: (id: string, x: number, y: number) => void
  resize: (id: string, rect: BlockRect) => void
  change: (id: string, markdown: string) => void
  exitEdit: (id: string) => void
  /** Asal (rendered) oonchai — culling aur Fit ke liye; scene me save nahi hoti */
  measure: (id: string, height: number) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  remove: (id: string) => void
}

const DRAG_THRESHOLD = 3
// Block ki padding (py-2) — content ki asal oonchai me jodni hai
const PADDING_Y = 16

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
// Koi nazar aane wala handle nahi: block ki border lines (aur kone) hi pakar kar resize hota hai.
// Har patti border ke beech me hai, aadhi andar aadhi bahar.
const EDGES: { edge: Edge; className: string }[] = [
  { edge: 'n', className: 'inset-x-0 top-0 -translate-y-1/2 cursor-ns-resize' },
  { edge: 's', className: 'inset-x-0 bottom-0 translate-y-1/2 cursor-ns-resize' },
  { edge: 'e', className: 'inset-y-0 right-0 translate-x-1/2 cursor-ew-resize' },
  { edge: 'w', className: 'inset-y-0 left-0 -translate-x-1/2 cursor-ew-resize' },
  { edge: 'nw', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
  { edge: 'ne', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
  { edge: 'se', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
  { edge: 'sw', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
]
// Screen pixels me: border line ke gird pakarne ki jagah, aur kone ka hissa
const EDGE_HIT = 8
const CORNER_HIT = 14

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
  const contentRef = useRef<HTMLDivElement>(null)

  // Asal oonchai canvas ko batao (content min-height se bara ho sakta hai)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() => handlers.measure(obj.id, el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [handlers, obj.id])

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

  // Kinare (border lines): sirf width/height badalti hai, text wahi size rehta hai aur dobara wrap hota hai.
  // Kone: poora block text samet ek hi nisbat se chhota/bara hota hai (text ka size bhi).
  // Upar/baayein se kheenchne par x/y bhi badalte hain. Height content se kam nahi hoti (text na kate).
  const onResizeDown = (edge: Edge) => (event: React.PointerEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    handlers.select(obj.id)
    const el = ref.current
    const content = contentRef.current
    const handle = event.currentTarget as HTMLElement
    if (!el || !content) return
    const start = { x: event.clientX, y: event.clientY }
    const startScale = obj.scale ?? 1
    const startRect: BlockRect = {
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: el.offsetHeight,
      scale: startScale,
    }
    let rect = { ...startRect }
    const east = edge.includes('e')
    const west = edge.includes('w')
    const north = edge.startsWith('n')
    const south = edge.startsWith('s')
    const corner = edge.length === 2
    handle.setPointerCapture(event.pointerId)

    const onMove = (e: PointerEvent) => {
      const zoomNow = getZoom()
      const dx = (e.clientX - start.x) / zoomNow
      const dy = (e.clientY - start.y) / zoomNow
      let { x, y, width, height, scale } = startRect
      if (corner) {
        // Mouse ki harkat ko block ke diagonal par project karo: ek hi nisbat k
        const w0 = startRect.width
        const h0 = startRect.height
        const pw = w0 + (east ? dx : -dx)
        const ph = h0 + (south ? dy : -dy)
        let k = (pw * w0 + ph * h0) / (w0 * w0 + h0 * h0)
        const kMin = Math.max(MIN_TEXT_SCALE / startScale, MIN_BLOCK_WIDTH / w0)
        const kMax = Math.min(
          MAX_TEXT_SCALE / startScale,
          MAX_BLOCK_WIDTH / w0,
          MAX_BLOCK_HEIGHT / h0,
        )
        k = kMin > kMax ? 1 : Math.min(kMax, Math.max(kMin, k))
        width = w0 * k
        height = h0 * k
        scale = Math.round(startScale * k * 1000) / 1000
        el.style.setProperty('--text-scale', String(scale))
      } else {
        const clampW = (w: number) => Math.min(MAX_BLOCK_WIDTH, Math.max(MIN_BLOCK_WIDTH, w))
        if (east) width = clampW(startRect.width + dx)
        if (west) width = clampW(startRect.width - dx)
        if (south) height = startRect.height + dy
        if (north) height = startRect.height - dy
      }
      // Pehle width (aur text size) lagao, phir naye size par content ki oonchai naapo
      el.style.width = `${width}px`
      const minHeight = content.offsetHeight + PADDING_Y
      height = Math.min(MAX_BLOCK_HEIGHT, Math.max(minHeight, height))
      if (west) x = startRect.x + startRect.width - width
      if (north) y = startRect.y + startRect.height - height
      rect = {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        scale,
      }
      el.style.left = `${rect.x}px`
      el.style.top = `${rect.y}px`
      el.style.minHeight = `${rect.height}px`
    }
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      const changed =
        rect.x !== obj.x ||
        rect.y !== obj.y ||
        rect.width !== obj.width ||
        rect.height !== startRect.height ||
        rect.scale !== startScale
      if (!changed) return
      // Text size 1 ho to field save hi na karo (purane boards jaisa)
      const { scale, ...box } = rect
      handlers.resize(obj.id, scale === 1 ? { ...box, scale: undefined } : rect)
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
        // Select/edit par wohi patli border jo hover par aati hai
        (selected || editing) && 'ring-1 ring-primary/30',
        canEdit && 'hover:ring-1 hover:ring-primary/30',
      )}
      // height = kam se kam oonchai; content zyada ho to block khud bara hota hai
      style={
        {
          left: obj.x,
          top: obj.y,
          width: obj.width,
          minHeight: obj.height,
          zIndex: obj.zIndex,
          '--text-scale': obj.scale ?? 1,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        if (!canEdit) return
        event.stopPropagation()
        handlers.startEdit(obj.id)
      }}
    >
      {/* flow-root: heading ki margin bahar collapse na ho, taake content ki oonchai sahi naape */}
      <div ref={contentRef} className="flow-root">
        {editing ? (
          <TextEditor
            initialMarkdown={obj.markdown}
            onChange={(markdown) => handlers.change(obj.id, markdown)}
            onExit={() => handlers.exitEdit(obj.id)}
          />
        ) : (
          <MarkdownView markdown={obj.markdown} />
        )}
      </div>

      {canEdit && !editing
        ? EDGES.map(({ edge, className }) => {
            const corner = edge.length === 2
            // Pakarne ki jagah screen par hamesha ek hi size ki (zoom se chhoti/bari na ho)
            const size = (corner ? CORNER_HIT : EDGE_HIT) / zoom
            return (
              <span
                key={edge}
                role="presentation"
                data-testid={`resize-${edge}`}
                className={cn('absolute', corner ? 'z-20' : 'z-10', className)}
                style={
                  corner
                    ? { width: size, height: size }
                    : edge === 'n' || edge === 's'
                      ? { height: size }
                      : { width: size }
                }
                onPointerDown={onResizeDown(edge)}
              />
            )
          })
        : null}

      {canEdit && selected && !editing ? (
        <>
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
