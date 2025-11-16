import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async _req => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 🔐 service role
  )

  const { data, error } = await supabase.auth.admin.listUsers()
  const users = data?.users ?? []

  if (error) {
    console.error('❌ Erreur récupération utilisateurs :', error)
    return new Response('Erreur listUsers', { status: 500 })
  }

  const now = new Date()
  const toDelete = users.filter(u => {
    const createdAt = new Date(u.created_at)
    const confirmed = u.email_confirmed_at
    const ageInDays =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    return !confirmed && ageInDays >= 7 // 📅 seuil = 7 jours
  })

  const deleted: string[] = []

  for (const user of toDelete) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
    if (delErr) {
      console.error(`⚠️ Erreur suppression ${user.email} :`, delErr)
    } else {
      deleted.push(user.email ?? 'unknown')
    }
  }

  return new Response(`✅ Utilisateurs supprimés : ${deleted.length}`, {
    status: 200,
  })
})
