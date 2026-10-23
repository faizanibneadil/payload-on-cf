import type { GlobalConfig, Payload } from 'payload'

// D1 ki row limit 2 MB hai — admin isse upar limit set na kar sake
export const MAX_CONTENT_BYTES_CEILING = 1_900_000

export interface LimitSettings {
  windowHours: number
  maxBoardsPerWindow: number
  maxSavesPerBoardPerWindow: number
  maxContentBytes: number
}

export const DEFAULT_SETTINGS: LimitSettings = {
  windowHours: 24,
  maxBoardsPerWindow: 10,
  maxSavesPerBoardPerWindow: 10,
  maxContentBytes: 1_800_000,
}

// Worker memory cache — har Save par D1 read na ho. Global update par afterChange isse saaf karta hai.
const CACHE_MS = 10_000
let cached: { value: LimitSettings; at: number } | null = null

export async function getLimitSettings(payload: Payload): Promise<LimitSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value
  const doc = await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })
  const value: LimitSettings = {
    windowHours: doc.windowHours ?? DEFAULT_SETTINGS.windowHours,
    maxBoardsPerWindow: doc.maxBoardsPerWindow ?? DEFAULT_SETTINGS.maxBoardsPerWindow,
    maxSavesPerBoardPerWindow:
      doc.maxSavesPerBoardPerWindow ?? DEFAULT_SETTINGS.maxSavesPerBoardPerWindow,
    maxContentBytes: Math.min(
      doc.maxContentBytes ?? DEFAULT_SETTINGS.maxContentBytes,
      MAX_CONTENT_BYTES_CEILING,
    ),
  }
  cached = { value, at: Date.now() }
  return value
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  admin: {
    description: 'Limits for instructors. Admins are never limited.',
  },
  access: {
    // Sirf admin panel aur server code (overrideAccess) — public API se limits nazar na aayen
    read: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    afterChange: [
      () => {
        cached = null
      },
    ],
  },
  fields: [
    {
      name: 'windowHours',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: DEFAULT_SETTINGS.windowHours,
      admin: { description: 'Length of the limit window in hours.' },
    },
    {
      name: 'maxBoardsPerWindow',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: DEFAULT_SETTINGS.maxBoardsPerWindow,
      admin: { description: 'New boards an instructor may create per window.' },
    },
    {
      name: 'maxSavesPerBoardPerWindow',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: DEFAULT_SETTINGS.maxSavesPerBoardPerWindow,
      admin: { description: 'Saves per board per window.' },
    },
    {
      name: 'maxContentBytes',
      type: 'number',
      required: true,
      min: 10_000,
      max: MAX_CONTENT_BYTES_CEILING,
      defaultValue: DEFAULT_SETTINGS.maxContentBytes,
      admin: { description: 'Maximum size of one board (document JSON) in bytes.' },
    },
  ],
}
