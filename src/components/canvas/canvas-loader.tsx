'use client'

import dynamic from 'next/dynamic'

// Canvas ka JS sirf board page par aur sirf browser me load ho (server bundle chhota rahe)
const BoardCanvas = dynamic(() => import('./board-canvas').then((m) => m.BoardCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Loading canvas...
    </div>
  ),
})

export function CanvasLoader() {
  return <BoardCanvas />
}
