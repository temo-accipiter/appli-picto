// Edge Function Deno (Supabase) — journaliser un consentement avec IP réelle
// Déploie avec: supabase functions deploy log-consent
// Variables requises (dashboard > functions > log-consent > secrets):
//  - SUPABASE_URL
//  - SUPABASE_SERVICE_ROLE_KEY

// @deno-types="npm:@types/uuid"
import { v4 as uuidv4 } from 'npm:uuid'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type ConsentPayload = {
  v: number
  mode: 'accept_all' | 'refuse_all' | 'custom'
  choices: Record<string, unknown> // ex: { necessary:true, analytics:false, marketing:false }
  action: string // redondance lecture rapide (accept_all/refuse_all/custom)
  user_id?: string | null // peut être null si anonyme
  ua?: string | null
  locale?: string | null
  app_version?: string | null
  extra?: Record<string, unknown> | null
}

function getIpFromHeaders(req: Request): string | null {
  const h = req.headers
  // Hébergeurs courants: Vercel/Netlify/Cloudflare/Nginx
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    null
  )
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject()
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing env', { status: 500 })
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // CORS preflight handled by framework; add a minimal CORS here if needed
    const ip = getIpFromHeaders(req)

    const payload = (await req.json()) as ConsentPayload
    // HARDEN: clamp values
    const record = {
      id: uuidv4(),
      user_id: payload.user_id ?? null,
      ts: new Date().toISOString(),
      v: Number(payload.v ?? 1),
      mode: (['accept_all', 'refuse_all', 'custom'].includes(payload.mode)
        ? payload.mode
        : 'custom') as ConsentPayload['mode'],
      choices: payload.choices ?? {},
      action: payload.action ?? payload.mode ?? 'custom',
      ua: payload.ua ?? null,
      ip,
      locale: payload.locale ?? null,
      app_version: payload.app_version ?? null,
      extra: payload.extra ?? null,
    }

    const { error } = await supabase.from('consentements').insert(record as any)
    if (error) {
      console.error('Insert error', error)
      return new Response('Insert failed', { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, id: record.id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response('Bad Request', { status: 400 })
  }
})
