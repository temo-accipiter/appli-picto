// src/hooks/_net.js
export function isAbortLike(err) {
  if (!err) return false
  if (err.name === 'AbortError') return true
  const msg = String(err.message || '').toLowerCase()
  return (
    msg.includes('networkerror') ||
    msg.includes('the operation was aborted') ||
    msg.includes('request was aborted') ||
    msg.includes('load failed') ||
    msg.includes('due to access control checks') 
  )
}

// 🆕 Make a plain, serializable error snapshot (avoids Safari inspector issues)
export function toPlainError(e) {
  try {
    return {
      message: String(e?.message ?? e),
      details: e?.details ?? null,
      hint: e?.hint ?? null,
      code: e?.code ?? null,
      name: e?.name ?? null,
    }
  } catch {
    return { message: String(e) }
  }
}

export async function withAbortSafe(promise, { onAbort } = {}) {
  try {
    const out = await promise
    if (out && typeof out === 'object' && 'data' in out && 'error' in out) {
      if (out.error && isAbortLike(out.error)) {
        onAbort?.(out.error)
        return { data: null, error: null, aborted: true }
      }
      // 🆕 always return a plain error object (never the raw PostgrestError/DOMException)
      const plainErr = out.error ? toPlainError(out.error) : null
      return { data: out.data, error: plainErr, aborted: false }
    }
    return { data: out, error: null, aborted: false }
  } catch (e) {
    if (isAbortLike(e)) {
      onAbort?.(e)
      return { data: null, error: null, aborted: true }
    }
    return { data: null, error: toPlainError(e), aborted: false }
  }
}
