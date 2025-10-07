// src/services/quotasBounds.js
import { supabase } from '@/utils/supabaseClient'

/**
 * Récupère (start_utc, end_utc) du mois courant pour l'utilisateur,
 * calculés côté DB selon son fuseau (user_prefs.timezone).
 * Retourne { start: stringISO, end: stringISO }
 */
export async function getMonthBoundsUtcForUser(userId) {
  if (!userId) return null

  const { data, error } = await supabase.rpc('get_user_month_bounds_utc', {
    p_user_id: userId,
  })

  if (error) {
    console.warn('getMonthBoundsUtcForUser RPC error:', error.message)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.start_utc || !row?.end_utc) return null

  return { start: row.start_utc, end: row.end_utc }
}
