import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*', // ← ici autorise toutes les origines (localhost inclus)
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return new Response('Unauthorized', { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const userId = user.id

    // 💥 Supprime fichiers dans Storage/images/...
    const cleanup = async (folder: string) => {
      const { data } = await supabaseAdmin.storage
        .from('images')
        .list(`${userId}/${folder}`, { limit: 100 })
      if (data && data.length > 0) {
        const paths = data.map(f => `${userId}/${folder}/${f.name}`)
        await supabaseAdmin.storage.from('images').remove(paths)
      }
    }

    await cleanup('taches')
    await cleanup('recompenses')

    // 💥 Supprime avatar (si utilisé)
    // 🔥 Supprimer les fichiers avatars du dossier [userId]/
    try {
      const { data: avatars } = await supabaseAdmin.storage
        .from('avatars')
        .list(`${user.id}/`)

      if (avatars && avatars.length > 0) {
        const paths = avatars.map(file => `${user.id}/${file.name}`)
        const { error: avatarError } = await supabaseAdmin.storage
          .from('avatars')
          .remove(paths)

        if (avatarError) {
          console.error('⚠️ Erreur suppression avatars :', avatarError)
        } else {
          console.log('🗑️ Avatar(s) supprimé(s)')
        }
      }
    } catch (e) {
      console.warn('⚠️ Problème suppression avatar :', e)
    }

    // 🗑️ Supprime toutes les lignes liées
    await supabaseAdmin.from('taches').delete().eq('user_id', userId)
    await supabaseAdmin.from('categories').delete().eq('user_id', userId)
    await supabaseAdmin.from('parametres').delete().eq('user_id', userId)
    await supabaseAdmin.from('recompenses').delete().eq('user_id', userId)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 💥 Supprime l'utilisateur auth
    await supabaseAdmin.auth.admin.deleteUser(userId)

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // ✅ important pour éviter CORS
      },
      status: 200,
    })
  } catch (error) {
    console.error('❌ Erreur delete-account :', error)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // ✅ pour CORS aussi en cas d’erreur
      },
      status: 500,
    })
  }
})
