import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { act, cleanup, render, screen } from '@testing-library/react'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  type LexicalEditor,
} from 'lexical'
import { Bold, Italic, Link } from 'lucide-react'
import { createElement } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { toolbarGroups } from '@/components/editor/features'
import { InlineToolbarPlugin } from '@/components/editor/inline-toolbar/inline-toolbar-plugin'
import {
  buildToolbarGroups,
  TOOLBAR_EDGE,
  TOOLBAR_GAP,
  TOOLBAR_GROUPS,
  type ToolbarGroup,
  toolbarPosition,
} from '@/components/editor/inline-toolbar/toolbar-items'

const item = (key: string, icon = Bold) => ({ key, label: key, icon, onSelect: () => {} })

describe('inline toolbar groups', () => {
  it('keep Payload order: text type, format, link, alignment, indent, colour', () => {
    expect(TOOLBAR_GROUPS.map((g) => g.key)).toEqual([
      'textType',
      'format',
      'link',
      'align',
      'indent',
      'textState',
    ])
  })

  it('put feature buttons into their group in that order and drop empty groups', () => {
    const groups = buildToolbarGroups([
      { group: 'link', items: [item('link', Link)] },
      { group: 'format', items: [item('bold')] },
      { group: 'format', items: [item('italic', Italic)] },
    ])
    expect(groups.map((g) => [g.key, g.items.map((i) => i.key)])).toEqual([
      ['format', ['bold', 'italic']],
      ['link', ['link']],
    ])
    expect(buildToolbarGroups([])).toEqual([])
  })

  it('has no buttons yet in C1 (Bold comes in C2), so no toolbar shows', () => {
    expect(toolbarGroups).toEqual([])
  })
})

describe('inline toolbar position', () => {
  const viewport = { width: 1280, height: 800 }
  const toolbar = { width: 200, height: 40 }

  it('sits above the selection, centred on it', () => {
    const pos = toolbarPosition(
      { top: 300, bottom: 320, left: 500, width: 100 },
      toolbar,
      viewport,
      48,
    )
    expect(pos).toEqual({ top: 300 - TOOLBAR_GAP - 40, left: 450, placement: 'top' })
  })

  it('goes below the selection when there is no room above (under the header)', () => {
    const pos = toolbarPosition(
      { top: 80, bottom: 100, left: 500, width: 100 },
      toolbar,
      viewport,
      48,
    )
    expect(pos).toEqual({ top: 100 + TOOLBAR_GAP, left: 450, placement: 'bottom' })
  })

  it('stays inside the screen on the left and right', () => {
    const left = toolbarPosition({ top: 300, bottom: 320, left: 0, width: 20 }, toolbar, viewport)
    expect(left.left).toBe(TOOLBAR_EDGE)
    const right = toolbarPosition(
      { top: 300, bottom: 320, left: 1270, width: 10 },
      toolbar,
      viewport,
    )
    expect(right.left).toBe(1280 - 200 - TOOLBAR_EDGE)
  })
})

describe('inline toolbar component', () => {
  beforeAll(() => {
    // jsdom me layout nahi: Range ka naap khud
    Range.prototype.getBoundingClientRect = () => new DOMRect(400, 300, 120, 20)
  })
  afterEach(cleanup)

  let editor: LexicalEditor
  const onBold = vi.fn()
  const groups: ToolbarGroup<LexicalEditor>[] = [
    {
      key: 'format',
      label: 'Format',
      items: [
        { key: 'bold', label: 'Bold', shortcut: 'Ctrl+B', icon: Bold, onSelect: onBold },
        { key: 'italic', label: 'Italic', icon: Italic, isActive: () => true, onSelect: () => {} },
      ],
    },
    { key: 'link', label: 'Link', items: [item('link', Link)] },
  ]

  function mount(withGroups = groups) {
    render(
      createElement(
        LexicalComposer,
        {
          initialConfig: {
            namespace: 'test',
            onError: (e: Error) => {
              throw e
            },
          },
        },
        createElement(RichTextPlugin, {
          contentEditable: createElement(ContentEditable, { 'data-testid': 'editor' }),
          ErrorBoundary: LexicalErrorBoundary,
        }),
        createElement(InlineToolbarPlugin, { groups: withGroups }),
        createElement(EditorRef),
      ),
    )
  }
  // Test ke liye editor ka hawala
  function EditorRef(): null {
    ;[editor] = useLexicalComposerContext()
    return null
  }

  const write = async (text: string) => {
    await act(async () => {
      screen.getByTestId('editor').focus()
      editor.update(
        () => {
          const p = $createParagraphNode()
          p.append($createTextNode(text))
          $getRoot().clear().append(p)
          p.select(0, 0)
        },
        { discrete: true },
      )
    })
  }
  const select = async (from: number, to: number) => {
    await act(async () => {
      editor.update(
        () => {
          const text = $getRoot().getFirstDescendant()
          if (text && 'select' in text)
            (text as { select: (a: number, b: number) => void }).select(from, to)
        },
        { discrete: true },
      )
    })
  }
  const toolbar = () => screen.queryByTestId('inline-toolbar')

  it('shows above a text selection with the buttons in groups, and hides when it collapses', async () => {
    mount()
    await write('Hello world')
    expect(toolbar()).toBeNull()
    await select(0, 5)
    const bar = toolbar()
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('role')).toBe('toolbar')
    expect(
      [...(bar?.querySelectorAll('[role="group"]') ?? [])].map((g) => g.getAttribute('aria-label')),
    ).toEqual(['Format', 'Link'])
    expect(screen.getByTestId('toolbar-bold').getAttribute('aria-label')).toBe('Bold')
    // Laga hua format dabaa hua dikhe
    expect(screen.getByTestId('toolbar-italic').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('toolbar-bold').getAttribute('aria-pressed')).toBe('false')
    await select(3, 3)
    expect(toolbar()).toBeNull()
  })

  it('does not show for a selection of only spaces', async () => {
    mount()
    await write('a   b')
    await select(1, 4)
    expect(toolbar()).toBeNull()
  })

  it('runs a button and keeps the selection (mouse down does not take the focus)', async () => {
    mount()
    await write('Hello world')
    await select(0, 5)
    const button = screen.getByTestId('toolbar-bold')
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    button.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    await act(async () => button.click())
    expect(onBold).toHaveBeenCalledWith(editor)
    const kept = editor.getEditorState().read(() => {
      const s = $getSelection()
      return $isRangeSelection(s) ? s.getTextContent() : null
    })
    expect(kept).toBe('Hello')
  })

  it('hides when the editor loses focus', async () => {
    mount()
    await write('Hello world')
    await select(0, 5)
    expect(toolbar()).not.toBeNull()
    await act(async () => {
      editor.dispatchCommand(BLUR_COMMAND, new FocusEvent('blur'))
    })
    expect(toolbar()).toBeNull()
  })

  it('shows nothing when no feature has a button', async () => {
    mount([])
    await write('Hello world')
    await select(0, 5)
    expect(toolbar()).toBeNull()
  })
})
