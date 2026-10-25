'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_LOW,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toolbarGroups } from '../features'
import { type ToolbarGroup, toolbarPosition } from './toolbar-items'

// Shortcut "Mod+B": Mac par ⌘B, baqi par Ctrl+B
const shortcutLabel = (shortcut: string) =>
  shortcut.replace('Mod+', /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+')

// Header (h-12) ke neeche hi rahe; header na mile to screen ka sira
const headerBottom = () => document.querySelector('header')?.getBoundingClientRect().bottom ?? 0

/**
 * Inline toolbar (owner, C1, Payload jaisa): text select hote hi selection ke oopar (jagah na ho to
 * neeche); select hata, likhna shuru kiya, Escape ya editor se bahar click = chhup jata he. Mouse se
 * select karte waqt nahi, chhodne ke baad. Buttons features laate hain (`features/*` ka `toolbar`); koi
 * button na ho to toolbar nahi. Sirf owner ke editor me (visitor ke paas editor hi nahi).
 */
export function InlineToolbarPlugin({
  groups = toolbarGroups,
}: {
  groups?: ToolbarGroup<LexicalEditor>[]
}) {
  const [editor] = useLexicalComposerContext()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [position, setPosition] = useState<ReturnType<typeof toolbarPosition> | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const pointerDown = useRef(false)

  const update = useCallback(() => {
    const root = editor.getRootElement()
    const domSelection = window.getSelection()
    const state = editor.getEditorState().read(() => {
      const selection = $getSelection()
      const show =
        $isRangeSelection(selection) &&
        !selection.isCollapsed() &&
        selection.getTextContent().trim() !== ''
      if (!show) return null
      const pressed: Record<string, boolean> = {}
      for (const group of groups) {
        for (const item of group.items) pressed[item.key] = item.isActive?.(editor) ?? false
      }
      return pressed
    })
    if (
      !state ||
      groups.length === 0 ||
      pointerDown.current ||
      !root ||
      !editor.isEditable() ||
      !root.contains(document.activeElement) ||
      !domSelection ||
      domSelection.rangeCount === 0 ||
      !root.contains(domSelection.anchorNode)
    ) {
      setRect(null)
      return
    }
    setActive(state)
    setRect(domSelection.getRangeAt(0).getBoundingClientRect())
  }, [editor, groups])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      // Toolbar par click selection nahi badalta
      if (ref.current?.contains(event.target as Node)) return
      pointerDown.current = true
      setRect(null)
    }
    const onPointerUp = () => {
      if (!pointerDown.current) return
      pointerDown.current = false
      // Browser selection pakki kar le, phir
      setTimeout(update)
    }
    const onMove = () => update()
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    // Andar wala container scroll hota he (body nahi), is liye capture
    document.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return mergeRegister(
      editor.registerUpdateListener(() => update()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          update()
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          setRect(null)
          return false
        },
        COMMAND_PRIORITY_LOW,
      ),
      () => {
        document.removeEventListener('pointerdown', onPointerDown, true)
        document.removeEventListener('pointerup', onPointerUp, true)
        document.removeEventListener('scroll', onMove, true)
        window.removeEventListener('resize', onMove)
      },
    )
  }, [editor, update])

  // Toolbar ka naap le kar jagah (pehle chhupa render, phir sahi jagah)
  useLayoutEffect(() => {
    if (!rect || !ref.current) {
      setPosition(null)
      return
    }
    setPosition(
      toolbarPosition(
        rect,
        { width: ref.current.offsetWidth, height: ref.current.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        headerBottom(),
      ),
    )
  }, [rect])

  if (!rect || groups.length === 0) return null
  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Text formatting"
      data-testid="inline-toolbar"
      data-placement={position?.placement}
      className={cn(
        'fixed z-50 flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md',
        !position && 'invisible',
      )}
      style={{ top: position?.top ?? 0, left: position?.left ?? 0 }}
      // Button par click se editor ka focus/selection na jaye
      onMouseDown={(event) => event.preventDefault()}
    >
      {groups.map((group, g) => (
        <Fragment key={group.key}>
          {g > 0 && <div aria-hidden className="mx-0.5 h-5 w-px bg-border" />}
          <div role="group" aria-label={group.label} className="flex items-center gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={item.label}
                        aria-pressed={active[item.key] ?? false}
                        data-testid={`toolbar-${item.key}`}
                        className={cn(
                          'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
                          active[item.key] && 'bg-accent text-accent-foreground',
                        )}
                        onClick={() => {
                          item.onSelect(editor)
                          update()
                        }}
                      />
                    }
                  >
                    <Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {item.label}
                    {item.shortcut && (
                      <span className="opacity-60">{shortcutLabel(item.shortcut)}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </Fragment>
      ))}
    </div>,
    document.body,
  )
}
