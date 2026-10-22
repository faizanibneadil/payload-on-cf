/**
 * Payload errors ko user ke liye saaf message me badlo. `instanceof` production bundle me
 * bharosemand nahi (class names minify + do copies) — isliye shape aur status dekhte hain.
 */
export function toUserMessage(err: unknown, fallback: string, context: string) {
  const e = (err ?? {}) as {
    status?: number
    message?: string
    data?: { errors?: { message?: string }[] }
  }
  const fieldError = e.data?.errors?.[0]?.message
  if (fieldError) return fieldError
  if (e.status === 429 && e.message) return e.message
  if (e.status === 403 || e.status === 404) return 'You are not allowed to change this board.'
  console.error(`[${context}] failed`, err)
  return fallback
}

/** HTTP status jo client ko bhejna hai (validation 400, limit 429, access 403/404, warna 500) */
export function toStatus(err: unknown) {
  const e = (err ?? {}) as { status?: number; data?: { errors?: unknown[] } }
  if (e.data?.errors?.length) return 400
  if (e.status && e.status >= 400 && e.status < 600) return e.status
  return 500
}
