'use client'

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const COPIED_RESET_MS = 1500

// NodeViewContent ka `as` type sirf "div" hai, runtime par koi bhi tag chalta hai
const CODE_TAG = 'code' as unknown as 'div'

function CodeBlockView({ node }: NodeViewProps) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(node.textContent)
      setCopied(true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    } catch {
      // Clipboard permission na ho to kuch nahi karna
    }
  }

  const language = node.attrs.language as string | null

  return (
    <NodeViewWrapper className="group relative">
      <button
        type="button"
        contentEditable={false}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void handleCopy()}
        title={copied ? 'Copied' : 'Copy code'}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <pre>
        <NodeViewContent as={CODE_TAG} className={language ? `language-${language}` : undefined} />
      </pre>
    </NodeViewWrapper>
  )
}

/** CodeBlockLowlight + hover par copy button */
export const CodeBlockWithCopy = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
})
