import type { Monaco } from '@monaco-editor/react'

/** CSS variable (oklch etc.) ko Monaco-safe #rrggbb me badalta hai — canvas pixel read se. */
function resolveCssVar(name: string): string {
  if (typeof document === 'undefined') return '#1e1e1e'

  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  document.body.appendChild(probe)
  const raw = getComputedStyle(probe).color
  document.body.removeChild(probe)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return raw

    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = raw
    ctx.fillRect(0, 0, 1, 1)

    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    const hex = (n: number) => n.toString(16).padStart(2, '0')
    return a === 255
      ? `#${hex(r)}${hex(g)}${hex(b)}`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  } catch {
    return raw
  }
}

/** App ke theme variables se "app" Monaco theme define karke apply karta hai */
export function applyMonacoTheme(monaco: Monaco) {
  monaco.editor.defineTheme('app', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': resolveCssVar('--color-editor'),
      'editorGutter.background': resolveCssVar('--color-editor-gutter'),
      'editorLineNumber.foreground': resolveCssVar('--color-muted-foreground'),
      'editorLineNumber.activeForeground': resolveCssVar('--color-foreground'),
      'editorSuggestWidget.background': resolveCssVar('--color-popover'),
      'editorSuggestWidget.border': resolveCssVar('--color-border'),
      'editorSuggestWidget.selectedBackground': resolveCssVar('--color-accent'),
      'editorSuggestWidget.selectedForeground': resolveCssVar('--color-accent-foreground'),
    },
  })
  monaco.editor.setTheme('app')
}
