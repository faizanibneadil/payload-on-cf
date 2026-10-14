// Monaco ko CDN (jsdelivr) se load karne ke bajaye package se bundle karte hain:
// version installed package se match rehta hai, aur campus network CDN block kare tab bhi editor chalta hai.
// Yeh module sirf client par (CodeEditor ke dynamic import ke zariye) load hota hai.
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new Worker(new URL('monaco-editor/language/json/json.worker.js', import.meta.url))
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(new URL('monaco-editor/language/css/css.worker.js', import.meta.url))
      case 'html':
      case 'handlebars':
      case 'razor':
        return new Worker(new URL('monaco-editor/language/html/html.worker.js', import.meta.url))
      case 'typescript':
      case 'javascript':
        return new Worker(
          new URL('monaco-editor/language/typescript/ts.worker.js', import.meta.url),
        )
      default:
        return new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url))
    }
  },
}

loader.config({ monaco })
