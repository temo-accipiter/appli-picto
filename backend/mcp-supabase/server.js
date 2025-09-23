import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  ALLOW_SCHEMAS = 'public,ai,storage',
  PORT = 8787,
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE')
  process.exit(1)
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const allowedSchemas = new Set(ALLOW_SCHEMAS.split(',').map(s => s.trim()))

/* ---------- NEW: health + discovery ---------- */
app.get('/mcp/health', (_req, res) => res.json({ ok: true }))
app.get('/mcp', (_req, res) =>
  res.json({
    ok: true,
    name: 'Supabase MCP',
    endpoints: [
      '/schema',
      '/indexes',
      '/policies',
      '/triggers',
      '/diagnose/rls',
      '/diagnose/fk-indexes',
      '/explain',
    ],
  })
)
/* --------------------------------------------- */

app.get('/mcp/schema', async (_req, res) => {
  const { data, error } = await supaAdmin
    .from('v_tables')
    .select('*')
    .schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, schema: data })
})

app.get('/mcp/indexes', async (_req, res) => {
  const { data, error } = await supaAdmin
    .from('v_indexes')
    .select('*')
    .schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, indexes: data })
})

app.get('/mcp/policies', async (_req, res) => {
  const { data, error } = await supaAdmin
    .from('v_policies')
    .select('*')
    .schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, policies: data })
})

app.get('/mcp/triggers', async (_req, res) => {
  const { data, error } = await supaAdmin
    .from('v_triggers')
    .select('*')
    .schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, triggers: data })
})

app.post('/mcp/explain', async (req, res) => {
  const { sql } = req.body || {}
  if (typeof sql !== 'string' || sql.length < 7)
    return res.status(400).json({ error: 'sql missing' })

  const lower = sql.toLowerCase()
  const touchesAllowed =
    [...allowedSchemas].some(s => lower.includes(`${s}.`)) ||
    !lower.includes('.')
  if (!touchesAllowed)
    return res.status(403).json({ error: 'Forbidden schema' })

  const { data, error } = await supaAdmin
    .rpc('fn_explain', { p_sql: sql })
    .schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, plan: data })
})

app.get('/mcp/diagnose/rls', async (_req, res) => {
  const { data, error } = await supaAdmin.rpc('fn_rls_audit').schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, rls: data })
})

app.get('/mcp/diagnose/fk-indexes', async (_req, res) => {
  const { data, error } = await supaAdmin.rpc('fn_fk_index_gaps').schema('ai')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, gaps: data })
})

app.listen(PORT, () => {
  console.log(`MCP Supabase Bridge ready: http://localhost:${PORT}`)
})
