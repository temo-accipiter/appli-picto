// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ⚠️ Point d’entrée unique du client Supabase pour TOUT le frontend.
// Importez désormais toujours depuis: `@/utils/supabaseClient`
const url =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://tklcztqoqvnialaqfcjm.supabase.co'

const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGN6dHFvcXZuaWFsYXFmY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0NDEsImV4cCI6MjA2ODgyOTQ0MX0.O2H1eyrlUaq1K6d92j5uAGn3xzOaS0xroa4M'

// Instance unique
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Exposer pour debug
if (typeof window !== 'undefined') {
  window.supabase = supabase
}

export default supabase
