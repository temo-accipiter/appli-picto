import JSZip from 'jszip'
import { saveAs } from 'file-saver'

/**
 * Build and download a GDPR export (ZIP)
 * - Data: profiles, tasks, rewards (filtered by user)
 * - Images: Signed URLs (avatars, task/reward images)
 *
 * @param {object} supabase - Supabase client
 * @param {object} user     - Current user (id, email, user_metadata)
 */
export async function exportUserDataZip(supabase, user) {
  if (!user?.id) throw new Error('User not logged in')

  // 1) Data retrieval
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

  // 2) Signed avatar URL
  let avatarSignedUrl = null
  const avatarPath = user?.user_metadata?.avatar || profile?.avatar_url || null
  if (avatarPath) {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarPath, 3600)
    if (!error) avatarSignedUrl = data?.signedUrl || null
  }

  // 3) Signed URLs for task/reward images
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

  // 4) Prepare JSON payload
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
    // Add other tables here if needed (consents, etc.)
  }

  // 5) Build ZIP
  const zip = new JSZip()
  zip.file('export.json', JSON.stringify(payload, null, 2))
  const readme = [
    'GDPR Export – Picto App',
    `Generated on: ${now}`,
    '',
    '- Private images are NOT physically included in this ZIP.',
    '- They are accessible via signed URLs valid for 1 hour (*_signed_url field).',
    '- The export.json file contains all data.',
  ].join('\n')
  zip.file('README.txt', readme)

  const blob = await zip.generateAsync({ type: 'blob' })
  const fileName = `export-rgpd-${user.id}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.zip`
  saveAs(blob, fileName)
}
