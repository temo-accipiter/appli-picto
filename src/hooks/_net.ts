// src/hooks/_net.ts

interface PlainError {
  message: string
  details?: unknown
  hint?: unknown
  code?: string | null
  name?: string | null
}

interface WithAbortSafeOptions {
  onAbort?: (error: unknown) => void
}

interface WithAbortSafeResult<T> {
  data: T | null
  error: PlainError | null
  aborted: boolean
}

interface SupabaseResponse<T> {
  data: T | null
  error: unknown
}

export function isAbortLike(err: unknown): boolean {
  if (!err) return false
  const error = err as { name?: string; message?: string }
  if (error.name === 'AbortError') return true
  const msg = String(error.message || '').toLowerCase()
  return (
    msg.includes('networkerror') ||
    msg.includes('the operation was aborted') ||
    msg.includes('request was aborted') ||
    msg.includes('load failed') ||
    msg.includes('due to access control checks')
  )
}

// 🆕 Make a plain, serializable error snapshot (avoids Safari inspector issues)
export function toPlainError(e: unknown): PlainError {
  try {
    const error = e as {
      message?: string
      details?: unknown
      hint?: unknown
      code?: string | null
      name?: string | null
    }
    return {
      message: String(error?.message ?? e),
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      code: error?.code ?? null,
      name: error?.name ?? null,
    }
  } catch {
    return { message: String(e) }
  }
}

export async function withAbortSafe<T>(
  promise: Promise<T | SupabaseResponse<T>>,
  { onAbort }: WithAbortSafeOptions = {}
): Promise<WithAbortSafeResult<T>> {
  try {
    const out = await promise
    if (out && typeof out === 'object' && 'data' in out && 'error' in out) {
      const response = out as SupabaseResponse<T>
      if (response.error && isAbortLike(response.error)) {
        onAbort?.(response.error)
        return { data: null, error: null, aborted: true }
      }
      // 🆕 always return a plain error object (never the raw PostgrestError/DOMException)
      const plainErr = response.error ? toPlainError(response.error) : null
      return { data: response.data, error: plainErr, aborted: false }
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
