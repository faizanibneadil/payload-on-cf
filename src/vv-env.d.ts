/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module '*?worker' {
  const workerConstructor: {
    new (options?: WorkerOptions): Worker
  }
  export default workerConstructor
}

interface ImportMeta {
  env: {
    VITE_PREVIEW_ORIGIN?: string
    VITE_PREVIEW_POPOUT?: string
    VITE_PREVIEW_WILDCARD_DOMAIN?: string
    [key: string]: any
  }
}
