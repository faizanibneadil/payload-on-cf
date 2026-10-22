'use client'

import { Hand, Maximize, Minus, MousePointer2, Plus, Redo2, Type, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBoard } from '@/components/board/board-store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { clampZoom, MAX_OBJECTS, type TextObject, type Viewport } from '@/lib/scene'
import { cn } from '@/lib/utils'
import { type BlockHandlers, TextBlock } from './text-block'

type Tool = 'select' | 'hand' | 'text'

const GRID = 24
const CULL_MARGIN = 400 // screen px — itna bahar tak blocks pehle se mount rehte hain
const HISTORY_LIMIT = 100
const NEW_BLOCK_WIDTH = 320
const NEW_BLOCK_HEIGHT = 40

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14)

/**
 * Infinite canvas. Pan/zoom sirf ek CSS transform badalta hai (ref + requestAnimationFrame, koi
 * React re-render nahi); sirf screen ke andar (aur thora bahar) wale blocks mount hote hain; ek
 * waqt me sirf ek block edit mode me hota hai.
 */
export function BoardCanvas() {
  const { canEdit, objects, setObjects, initialViewport, setViewportSource } = useBoard()

  const containerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const viewport = useRef<Viewport>({ ...initialViewport })
  const size = useRef({ width: 0, height: 0 })
  const frame = useRef(0)
  const visibleKey = useRef('')

  const [, setRenderTick] = useState(0)
  const [zoom, setZoom] = useState(initialViewport.zoom)
  const [tool, setTool] = useState<Tool>(canEdit ? 'select' : 'hand')
  const [spaceDown, setSpaceDown] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)

  // Callbacks me hamesha taaza objects (stale closure se bachne ke liye)
  const objectsRef = useRef(objects)
  objectsRef.current = objects
  const history = useRef<{ past: TextObject[][]; future: TextObject[][] }>({ past: [], future: [] })
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 })
  // Edit ke dauraan markdown sirf ref me — har key par poora scene update nahi
  const draft = useRef<{ id: string; markdown: string } | null>(null)

  useEffect(() => {
    setViewportSource(() => ({ ...viewport.current }))
  }, [setViewportSource])

  // ---------- Viewport ----------
  const visibleIds = useCallback(() => {
    const { x, y, zoom: z } = viewport.current
    const { width, height } = size.current
    const left = (-x - CULL_MARGIN) / z
    const top = (-y - CULL_MARGIN) / z
    const right = (width - x + CULL_MARGIN) / z
    const bottom = (height - y + CULL_MARGIN) / z
    const ids: string[] = []
    for (const o of objectsRef.current) {
      if (
        o.x < right &&
        o.x + o.width > left &&
        o.y < bottom &&
        o.y + Math.max(o.height, 24) > top
      ) {
        ids.push(o.id)
      }
    }
    return ids
  }, [])

  const applyViewport = useCallback(() => {
    frame.current = 0
    const { x, y, zoom: z } = viewport.current
    if (worldRef.current) worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${z})`
    const container = containerRef.current
    if (container) {
      // Zoom out par dots ghane na hon (shor aur paint dono kam): faasla 4 guna karte jao
      let step = GRID * z
      while (step < 12) step *= 4
      container.style.backgroundSize = `${step}px ${step}px`
      container.style.backgroundPosition = `${x}px ${y}px`
    }
    // Sirf tab re-render jab dikhne wale blocks ka set badle
    const key = visibleIds().join(',')
    if (key !== visibleKey.current) {
      visibleKey.current = key
      setRenderTick((t) => t + 1)
    }
  }, [visibleIds])

  const scheduleViewport = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(applyViewport)
  }, [applyViewport])

  const zoomAt = useCallback(
    (nextZoom: number, screenX: number, screenY: number) => {
      const vp = viewport.current
      const z = clampZoom(nextZoom)
      const worldX = (screenX - vp.x) / vp.zoom
      const worldY = (screenY - vp.y) / vp.zoom
      viewport.current = { x: screenX - worldX * z, y: screenY - worldY * z, zoom: z }
      setZoom(z)
      scheduleViewport()
    },
    [scheduleViewport],
  )

  const zoomBy = (factor: number) =>
    zoomAt(viewport.current.zoom * factor, size.current.width / 2, size.current.height / 2)

  const fitToContent = useCallback(() => {
    const list = objectsRef.current
    const { width, height } = size.current
    if (!list.length || !width) {
      viewport.current = { x: width / 2, y: height / 3, zoom: 1 }
    } else {
      const minX = Math.min(...list.map((o) => o.x))
      const minY = Math.min(...list.map((o) => o.y))
      const maxX = Math.max(...list.map((o) => o.x + o.width))
      const maxY = Math.max(...list.map((o) => o.y + o.height))
      const pad = 80
      const z = clampZoom(
        Math.min(width / (maxX - minX + pad * 2), height / (maxY - minY + pad * 2), 1),
      )
      viewport.current = {
        x: (width - (maxX - minX) * z) / 2 - minX * z,
        y: (height - (maxY - minY) * z) / 2 - minY * z,
        zoom: z,
      }
    }
    setZoom(viewport.current.zoom)
    scheduleViewport()
  }, [scheduleViewport])

  // Container ka size + pehla paint (pehla view sirf mount par tay hota hai)
  // biome-ignore lint/correctness/useExhaustiveDependencies: canEdit/fit sirf mount par chahiye
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      size.current = { width: container.clientWidth, height: container.clientHeight }
      scheduleViewport()
    }
    measure()
    // Visitor ko poora lecture dikhe (screen ka size owner se alag ho sakta hai); owner ko uska
    // saved view — lekin agar usme koi block nazar na aaye to bhi fit
    if (objectsRef.current.length && (!canEdit || visibleIds().length === 0)) fitToContent()
    applyViewport()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => {
      observer.disconnect()
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [applyViewport, scheduleViewport])

  // Objects badlen (naya block, undo) to culling dobara
  // biome-ignore lint/correctness/useExhaustiveDependencies: objects badalne par hi chalna hai
  useEffect(() => {
    scheduleViewport()
  }, [objects, scheduleViewport])

  // ---------- Scene changes (history ke saath) ----------
  const commit = useCallback(
    (next: TextObject[]) => {
      const h = history.current
      h.past.push(objectsRef.current)
      if (h.past.length > HISTORY_LIMIT) h.past.shift()
      h.future = []
      setHistorySize({ past: h.past.length, future: 0 })
      objectsRef.current = next
      setObjects(next)
    },
    [setObjects],
  )

  const update = useCallback(
    (id: string, patch: Partial<TextObject>) =>
      commit(objectsRef.current.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    [commit],
  )

  const finishEditing = useCallback(
    (id: string, height?: number) => {
      const current = objectsRef.current.find((o) => o.id === id)
      const markdown = draft.current?.id === id ? draft.current.markdown : current?.markdown
      draft.current = null
      setEditingId(null)
      if (!current) return
      const measured =
        height ??
        containerRef.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`)?.offsetHeight ??
        current.height
      if (!markdown?.trim()) {
        // Khali block chhoro to hata do
        commit(objectsRef.current.filter((o) => o.id !== id))
        setSelectedId(null)
        return
      }
      if (markdown !== current.markdown || measured !== current.height) {
        update(id, { markdown, height: measured })
      }
    },
    [commit, update],
  )

  const exitAnyEditing = useCallback(() => {
    if (editingId) finishEditing(editingId)
  }, [editingId, finishEditing])

  const createBlockAt = useCallback(
    (screenX: number, screenY: number) => {
      if (objectsRef.current.length >= MAX_OBJECTS) return
      const vp = viewport.current
      const block: TextObject = {
        id: newId(),
        type: 'text',
        x: Math.round((screenX - vp.x) / vp.zoom),
        y: Math.round((screenY - vp.y) / vp.zoom - NEW_BLOCK_HEIGHT / 2),
        width: NEW_BLOCK_WIDTH,
        height: NEW_BLOCK_HEIGHT,
        zIndex: Math.max(0, ...objectsRef.current.map((o) => o.zIndex)) + 1,
        markdown: '',
      }
      commit([...objectsRef.current, block])
      setSelectedId(block.id)
      setEditingId(block.id)
      setTool('select')
    },
    [commit],
  )

  const undo = useCallback(() => {
    const h = history.current
    const prev = h.past.pop()
    if (!prev) return
    h.future.push(objectsRef.current)
    setHistorySize({ past: h.past.length, future: h.future.length })
    objectsRef.current = prev
    setObjects(prev)
    setEditingId(null)
  }, [setObjects])

  const redo = useCallback(() => {
    const h = history.current
    const next = h.future.pop()
    if (!next) return
    h.past.push(objectsRef.current)
    setHistorySize({ past: h.past.length, future: h.future.length })
    objectsRef.current = next
    setObjects(next)
    setEditingId(null)
  }, [setObjects])

  const handlers = useMemo<BlockHandlers>(
    () => ({
      select: (id) => {
        if (editingId && editingId !== id) finishEditing(editingId)
        setSelectedId(id)
      },
      startEdit: (id) => {
        if (editingId && editingId !== id) finishEditing(editingId)
        setSelectedId(id)
        setEditingId(id)
      },
      move: (id, x, y) => update(id, { x, y }),
      resize: (id, width) => update(id, { width }),
      change: (id, markdown) => {
        draft.current = { id, markdown }
      },
      exitEdit: (id, height) => finishEditing(id, height),
      bringToFront: (id) =>
        update(id, { zIndex: Math.max(0, ...objectsRef.current.map((o) => o.zIndex)) + 1 }),
      sendToBack: (id) =>
        update(id, { zIndex: Math.min(0, ...objectsRef.current.map((o) => o.zIndex)) - 1 }),
      remove: (id) => {
        commit(objectsRef.current.filter((o) => o.id !== id))
        setSelectedId(null)
        setEditingId(null)
      },
    }),
    [editingId, finishEditing, update, commit],
  )

  const getZoom = useCallback(() => viewport.current.zoom, [])

  // ---------- Pointer: pan, pinch, naya block ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    container.setPointerCapture(event.pointerId)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: viewport.current.zoom }
      return
    }

    const isPrimary = event.button === 0
    if (canEdit && tool === 'text' && isPrimary && !spaceDown) {
      // Browser ka mousedown focus naye editor se na chheene
      event.preventDefault()
      exitAnyEditing()
      const p = localPoint(event)
      createBlockAt(p.x, p.y)
      pointers.current.delete(event.pointerId)
      return
    }
    // Khali jagah: selection/edit khatam aur canvas pan
    exitAnyEditing()
    setSelectedId(null)
    setPanning(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(event.pointerId)
    if (!prev) return
    const next = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, next)

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
      // Do ungliyon ke beech wala point jagah par rahe; saath me pan bhi
      viewport.current.x += (next.x - prev.x) / 2
      viewport.current.y += (next.y - prev.y) / 2
      zoomAt(pinch.current.zoom * (distance / pinch.current.distance), mid.x, mid.y)
      return
    }
    viewport.current.x += next.x - prev.x
    viewport.current.y += next.y - prev.y
    scheduleViewport()
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) setPanning(false)
  }

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit) return
    const p = localPoint(event)
    createBlockAt(p.x, p.y)
  }

  // Wheel: Ctrl/pinch = zoom (cursor ke gird), warna pan — passive nahi taake page scroll na ho
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = container.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        // Mouse wheel ke bade notch aur trackpad pinch ke chhote deltas dono par narm zoom
        const delta = Math.max(-60, Math.min(60, event.deltaY))
        const factor = Math.exp(-delta * 0.005)
        zoomAt(viewport.current.zoom * factor, event.clientX - rect.left, event.clientY - rect.top)
      } else {
        const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX
        const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY
        viewport.current.x -= dx
        viewport.current.y -= dy
        scheduleViewport()
      }
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [zoomAt, scheduleViewport])

  // ---------- Keyboard ----------
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null
      return Boolean(
        el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)),
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping()) return
      const mod = event.ctrlKey || event.metaKey
      if (event.code === 'Space') {
        event.preventDefault()
        setSpaceDown(true)
        return
      }
      if (!canEdit) return
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (mod) return
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault()
        handlers.remove(selectedId)
      } else if (event.key === 'Enter' && selectedId) {
        event.preventDefault()
        handlers.startEdit(selectedId)
      } else if (event.key === 'Escape') {
        setSelectedId(null)
      } else if (event.key === 'v') setTool('select')
      else if (event.key === 'h') setTool('hand')
      else if (event.key === 't') setTool('text')
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [canEdit, selectedId, handlers, undo, redo])

  // ---------- Render ----------
  const visible = new Set(visibleIds())
  if (selectedId) visible.add(selectedId)
  if (editingId) visible.add(editingId)
  const rendered = objects.filter((o) => visible.has(o.id))

  const cursor = panning
    ? 'cursor-grabbing'
    : spaceDown || tool === 'hand'
      ? 'cursor-grab'
      : tool === 'text'
        ? 'cursor-text'
        : 'cursor-default'

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={containerRef}
        role="application"
        aria-label="Board canvas"
        data-testid="canvas-surface"
        data-zoom={zoom.toFixed(3)}
        className={cn(
          'absolute inset-0 touch-none bg-[radial-gradient(circle,var(--canvas-dot)_1px,transparent_1.2px)] select-none',
          cursor,
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <div ref={worldRef} className="absolute top-0 left-0 origin-top-left will-change-transform">
          {rendered.map((obj) => (
            <TextBlock
              key={obj.id}
              obj={obj}
              zoom={zoom}
              canEdit={canEdit && tool !== 'hand' && !spaceDown}
              selected={selectedId === obj.id}
              editing={editingId === obj.id}
              handlers={handlers}
              getZoom={getZoom}
            />
          ))}
        </div>
      </div>

      {objects.length === 0 ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-muted-foreground">
          {canEdit
            ? 'Double-click anywhere (or pick the Text tool) to add a text block. Type # for a heading, - for a list.'
            : 'This board is empty.'}
        </p>
      ) : null}

      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-md backdrop-blur"
        data-testid="canvas-toolbar"
      >
        {canEdit ? (
          <>
            <ToolButton
              label="Select (V)"
              active={tool === 'select'}
              onClick={() => setTool('select')}
              testId="tool-select"
            >
              <MousePointer2 />
            </ToolButton>
            <ToolButton
              label="Hand (H)"
              active={tool === 'hand'}
              onClick={() => setTool('hand')}
              testId="tool-hand"
            >
              <Hand />
            </ToolButton>
            <ToolButton
              label="Text (T)"
              active={tool === 'text'}
              onClick={() => setTool('text')}
              testId="tool-text"
            >
              <Type />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolButton
              label="Undo (Ctrl+Z)"
              disabled={!historySize.past}
              onClick={undo}
              testId="undo"
            >
              <Undo2 />
            </ToolButton>
            <ToolButton
              label="Redo (Ctrl+Shift+Z)"
              disabled={!historySize.future}
              onClick={redo}
              testId="redo"
            >
              <Redo2 />
            </ToolButton>
            <span className="mx-1 h-5 w-px bg-border" />
          </>
        ) : null}
        <ToolButton label="Zoom out" onClick={() => zoomBy(1 / 1.2)} testId="zoom-out">
          <Minus />
        </ToolButton>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => zoomAt(1, size.current.width / 2, size.current.height / 2)}
                className="h-8 min-w-14 rounded-md px-1 text-xs tabular-nums hover:bg-muted"
                data-testid="zoom-level"
              />
            }
          >
            {Math.round(zoom * 100)}%
          </TooltipTrigger>
          <TooltipContent>Reset to 100%</TooltipContent>
        </Tooltip>
        <ToolButton label="Zoom in" onClick={() => zoomBy(1.2)} testId="zoom-in">
          <Plus />
        </ToolButton>
        <ToolButton label="Fit to content" onClick={fitToContent} testId="zoom-fit">
          <Maximize />
        </ToolButton>
      </div>
    </div>
  )
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  testId,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  testId: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            data-testid={testId}
            className={cn(
              'flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
              active &&
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
