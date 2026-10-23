'use client'

import { ArrowDownToLine, ArrowUpToLine, Trash2 } from 'lucide-react'
import { lazy, memo, Suspense, useEffect, useRef } from 'react'
import {
  MAX_BLOCK_HEIGHT,
  MAX_BLOCK_WIDTH,
  MAX_TEXT_SCALE,
  MIN_BLOCK_WIDTH,
  MIN_TEXT_SCALE,
  type TextObject,
} from '@/lib/scene'
import { cn } from '@/lib/utils'
import { ReadView } from './lexical/read-view'

// Lexical editor sirf edit karte waqt chahiye: alag chunk, owner ke liye pehle se load (preloadEditor)
const loadEditor = () => import('./lexical/block-editor')
const BlockEditor = lazy(() => loadEditor().then((m) => ({ default: m.BlockEditor })))
export const preloadEditor = (): void => {
  void loadEditor()
}

export interface BlockRect {
  x: number
  y: number
  width: number
  height: number
  scale?: number
  autoWidth?: boolean
}

export interface BlockHandlers {
  select: (id: string) => void
  startEdit: (id: string) => void
  move: (id: string, x: number, y: number) => void
  resize: (id: string, rect: BlockRect) => void
  change: (id: string, markdown: string) => void
  exitEdit: (id: string) => void
  /** Editor khulne se pehle type hue harf (click karke likhna shuru kiya ho) */
  takePendingText: () => string
  /** Asal (rendered) size — culling aur Fit ke liye (auto width blocks ki width bhi) */
  measure: (id: string, width: number, height: number) => void
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

  // Asal size canvas ko batao (content min-height se bara ho sakta hai, auto width text se badalti hai)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() =>
      handlers.measure(obj.id, el.offsetWidth, el.offsetHeight),
    )
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
  // Side border kheenchne se auto width khatam: ab block isi width me wrap karta hai (tldraw jaisa).
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
      width: obj.autoWidth ? el.offsetWidth : obj.width,
      height: el.offsetHeight,
      scale: startScale,
    }
    let rect = { ...startRect }
    const east = edge.includes('e')
    const west = edge.includes('w')
    const north = edge.startsWith('n')
    const south = edge.startsWith('s')
    const corner = edge.length === 2
    // Auto width sirf side (baayein/daayein) border kheenchne par khatam hoti hai
    const autoWidth = obj.autoWidth && (corner || !(east || west)) ? true : undefined
    let changed = false
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
      // Pehle width (aur text size) lagao, phir naye size par content ki oonchai naapo.
      // Auto width block ki width text khud tay karta hai.
      if (!autoWidth) el.style.width = `${width}px`
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
      changed =
        rect.x !== obj.x ||
        rect.y !== obj.y ||
        rect.width !== startRect.width ||
        rect.height !== startRect.height ||
        rect.scale !== startScale
    }
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onUp)
      if (!changed) {
        // Kuch nahi badla: DOM wapas React wali values par
        for (const prop of ['width', 'left', 'top', 'minHeight'] as const) el.style[prop] = ''
        el.style.removeProperty('--text-scale')
        return
      }
      // Text size 1 ho to field save hi na karo (purane boards jaisa)
      handlers.resize(obj.id, {
        ...rect,
        scale: rect.scale === 1 ? undefined : rect.scale,
        autoWidth,
      })
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
          // Auto width: block text ke saath barhta hai, nayi line sirf Enter par (had 2000px)
          width: obj.autoWidth ? 'max-content' : obj.width,
          maxWidth: obj.autoWidth ? MAX_BLOCK_WIDTH : undefined,
          minWidth: obj.autoWidth ? 48 : undefined,
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
          <Suspense fallback={<ReadView markdown={obj.markdown} />}>
            <BlockEditor
              initialMarkdown={obj.markdown}
              onChange={(markdown) => handlers.change(obj.id, markdown)}
              onExit={() => handlers.exitEdit(obj.id)}
              takePendingText={handlers.takePendingText}
            />
          </Suspense>
        ) : (
          <ReadView markdown={obj.markdown} />
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
