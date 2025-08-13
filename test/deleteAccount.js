// src/api/deleteAccount.js
import { supabase } from '@/utils'

export async function callDeleteAccount(turnstileToken) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ turnstile: turnstileToken }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || 'Suppression impossible')
  }
  return json
}
