// Board canvas ka scene model — server (validation) aur client (canvas) dono yahi use karte hain

export const SCENE_VERSION = 1
export const MAX_OBJECTS = 500
export const MAX_MARKDOWN_CHARS = 20_000
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4
export const MIN_BLOCK_WIDTH = 120
export const MAX_BLOCK_WIDTH = 2000
export const MAX_BLOCK_HEIGHT = 10000
// Text ka size (1 = 15px). Kone se resize karne par text bhi isi hisaab se chhota/bara hota hai
export const MIN_TEXT_SCALE = 0.25
export const MAX_TEXT_SCALE = 8
const MAX_COORD = 1_000_000

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface TextObject {
  id: string
  type: 'text'
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  markdown: string
  /** Text ka size; na ho to 1 (purane boards) */
  scale?: number
  /** true: width text ke saath barhti hai (nayi line sirf Enter par). Side border kheenchne par false */
  autoWidth?: boolean
}

export type SceneObject = TextObject

export interface Scene {
  version: number
  viewport: Viewport
  objects: SceneObject[]
}

export const emptyScene = (): Scene => ({
  version: SCENE_VERSION,
  viewport: { x: 0, y: 0, zoom: 1 },
  objects: [],
})

/** Purana / khali data bhi hamesha ek sahi scene banta hai (canvas kabhi crash na ho) */
export function readScene(data: unknown): Scene {
  const canvas = (data as { canvas?: Partial<Scene> } | null)?.canvas
  if (!canvas || typeof canvas !== 'object') return emptyScene()
  const vp = canvas.viewport
  return {
    version: SCENE_VERSION,
    viewport: {
      x: Number.isFinite(vp?.x) ? (vp as Viewport).x : 0,
      y: Number.isFinite(vp?.y) ? (vp as Viewport).y : 0,
      zoom: clampZoom(Number.isFinite(vp?.zoom) ? (vp as Viewport).zoom : 1),
    },
    objects: Array.isArray(canvas.objects) ? (canvas.objects as SceneObject[]) : [],
  }
}

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

const isNum = (v: unknown, limit = MAX_COORD) =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit

/** Server par scene ki shape check — galat data D1 me na jaye. `true` ya error message. */
export function validateScene(data: unknown): true | string {
  if (data === null || data === undefined) return true
  if (typeof data !== 'object') return 'Board data must be an object'
  const canvas = (data as { canvas?: unknown }).canvas
  if (canvas === undefined) return true
  if (!canvas || typeof canvas !== 'object') return 'Canvas must be an object'
  const { viewport, objects } = canvas as { viewport?: unknown; objects?: unknown }
  if (viewport !== undefined) {
    const vp = viewport as Partial<Viewport>
    if (!isNum(vp.x) || !isNum(vp.y) || !isNum(vp.zoom, MAX_ZOOM) || (vp.zoom as number) <= 0) {
      return 'Invalid canvas viewport'
    }
  }
  if (objects === undefined) return true
  if (!Array.isArray(objects)) return 'Canvas objects must be a list'
  if (objects.length > MAX_OBJECTS) return `A board can have at most ${MAX_OBJECTS} blocks`
  const ids = new Set<string>()
  for (const obj of objects as Partial<TextObject>[]) {
    if (!obj || typeof obj !== 'object') return 'Invalid canvas block'
    if (obj.type !== 'text') return 'Unknown canvas block type'
    if (typeof obj.id !== 'string' || !obj.id || obj.id.length > 64) return 'Invalid block id'
    if (ids.has(obj.id)) return 'Duplicate block id'
    ids.add(obj.id)
    if (![obj.x, obj.y, obj.height, obj.zIndex].every((v) => isNum(v))) {
      return 'Invalid block position'
    }
    if (!isNum(obj.width, MAX_BLOCK_WIDTH) || (obj.width as number) < 1)
      return 'Invalid block width'
    if (!isNum(obj.height, MAX_BLOCK_HEIGHT) || (obj.height as number) < 1) {
      return 'Invalid block height'
    }
    if (
      obj.scale !== undefined &&
      (!isNum(obj.scale, MAX_TEXT_SCALE) || (obj.scale as number) < MIN_TEXT_SCALE)
    ) {
      return 'Invalid text size'
    }
    if (obj.autoWidth !== undefined && typeof obj.autoWidth !== 'boolean') {
      return 'Invalid block width mode'
    }
    if (typeof obj.markdown !== 'string') return 'Invalid block text'
    if (obj.markdown.length > MAX_MARKDOWN_CHARS) {
      return `A text block can have at most ${MAX_MARKDOWN_CHARS} characters`
    }
  }
  return true
}
