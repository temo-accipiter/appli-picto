import JSZip from 'jszip'
import { saveAs } from 'file-saver'

/**
 * Construit et télécharge un export RGPD (ZIP)
 * - Données: profiles, taches, recompenses (filtrées par user)
 * - Images: URLs signées (avatars, images de tâches/récompenses)
 *
 * @param {object} supabase - client supabase
 * @param {object} user     - user courant (id, email, user_metadata)
 */
export async function exportUserDataZip(supabase, user) {
  if (!user?.id) throw new Error('Utilisateur non connecté')

  // 1) Récupération des données
  const [{ data: profile }, { data: taches }, { data: recompenses }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => ({ data })),
      supabase
        .from('taches')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true })
        .then(({ data }) => ({ data: data || [] })),
      supabase
        .from('recompenses')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true })
        .then(({ data }) => ({ data: data || [] })),
    ])

  // 2) URL signée avatar
  let avatarSignedUrl = null
  const avatarPath = user?.user_metadata?.avatar || profile?.avatar_url || null
  if (avatarPath) {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarPath, 3600)
    if (!error) avatarSignedUrl = data?.signedUrl || null
  }

  // 3) URLs signées pour les images des tâches/récompenses
  async function signIfNeeded(filePath) {
    if (!filePath) return null
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUrl(filePath, 3600)
    return error ? null : data?.signedUrl || null
  }

  const tachesWithUrls = await Promise.all(
    (taches || []).map(async t => ({
      ...t,
      image_signed_url: await signIfNeeded(t.imagepath),
    }))
  )

  const recompensesWithUrls = await Promise.all(
    (recompenses || []).map(async r => ({
      ...r,
      image_signed_url: await signIfNeeded(r.image),
    }))
  )

  // 4) Préparation payload JSON
  const now = new Date().toISOString()
  const payload = {
    export_version: 1,
    generated_at: now,
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile || null,
    avatar_signed_url: avatarSignedUrl,
    taches: tachesWithUrls,
    recompenses: recompensesWithUrls,
    // ajoute ici d'autres tables si besoin (consentements, etc.)
  }

  // 5) Construction ZIP
  const zip = new JSZip()
  zip.file('export.json', JSON.stringify(payload, null, 2))
  const readme = [
    'Export RGPD – {{NomSite}}',
    `Généré le : ${now}`,
    '',
    '- Les images privées NE sont pas incluses physiquement dans ce ZIP.',
    '- Elles sont accessibles via des URLs signées valables 1 heure (champ *_signed_url).',
    '- Le fichier export.json contient toutes les données.',
  ].join('\n')
  zip.file('README.txt', readme)

  const blob = await zip.generateAsync({ type: 'blob' })
  const fileName = `export-rgpd-${user.id}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.zip`
  saveAs(blob, fileName)
}
