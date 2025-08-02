// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tklcztqoqvnialaqfcjm.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbGN6dHFvcXZuaWFsYXFmY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTM0NDEsImV4cCI6MjA2ODgyOTQ0MX0.O2H1eyrlUaq1K6d92j5uAGn3xzOaS0xroa4MagPna68'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
