// src/hooks/_net.ts

export function isAbortLike(err: unknown): boolean {
  if (!err) return false
  if ((err as Error).name === 'AbortError') return true
  const msg = String((err as Error).message || '').toLowerCase()
  return (
    msg.includes('networkerror') ||
    msg.includes('the operation was aborted') ||
    msg.includes('request was aborted') ||
    msg.includes('load failed') ||
    msg.includes('due to access control checks')
  )
}

interface PlainError {
  message: string
  details?: string | null
  hint?: string | null
  code?: string | null
  name?: string | null
}

// 🆕 Make a plain, serializable error snapshot (avoids Safari inspector issues)
export function toPlainError(e: unknown): PlainError {
  try {
    const err = e as {
      message?: string
      details?: string
      hint?: string
      code?: string
      name?: string
    }
    return {
      message: String(err?.message ?? e),
      details: err?.details ?? null,
      hint: err?.hint ?? null,
      code: err?.code ?? null,
      name: err?.name ?? null,
    }
  } catch {
    return { message: String(e) }
  }
}

interface AbortSafeOptions {
  onAbort?: (error: unknown) => void
}

interface AbortSafeResult<T> {
  data: T | null
  error: PlainError | null
  aborted: boolean
}

export async function withAbortSafe<T>(
  promise:
    | Promise<{ data: T | null; error: unknown }>
    | Promise<T>
    | PromiseLike<{ data: T | null; error: unknown }>
    | PromiseLike<T>,
  { onAbort }: AbortSafeOptions = {}
): Promise<AbortSafeResult<T>> {
  try {
    const out = await promise
    if (out && typeof out === 'object' && 'data' in out && 'error' in out) {
      const result = out as { data: T | null; error: unknown }
      if (result.error && isAbortLike(result.error)) {
        onAbort?.(result.error)
        return { data: null, error: null, aborted: true }
      }
      // 🆕 always return a plain error object (never the raw PostgrestError/DOMException)
      const plainErr = result.error ? toPlainError(result.error) : null
      return { data: result.data, error: plainErr, aborted: false }
    }
    return { data: out as T, error: null, aborted: false }
  } catch (e) {
    if (isAbortLike(e)) {
      onAbort?.(e)
      return { data: null, error: null, aborted: true }
    }
    return { data: null, error: toPlainError(e), aborted: false }
  }
}
