// src/utils/storage/pathBuilders.ts
// Builders de chemins Storage — source unique de vérité

/** Sanitize basique du nom de fichier (ASCII + tirets) */
export function sanitizeFileName(name: string = ''): string {
  const base = String(name).split('/').pop()?.split('\\').pop() || ''
  const lastDotIndex = base.lastIndexOf('.')
  const [raw, ext = ''] =
    lastDotIndex >= 0
      ? [base.slice(0, lastDotIndex), base.slice(lastDotIndex + 1)]
      : [base, '']

  const safeBase = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

/** Génère un UUID v4 (format: 8-4-4-4-12 caractères hexadécimaux) */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Construit le path strict contractuel pour une carte personnelle
 * Format: {accountId}/cards/{cardId}.jpg
 */
export function buildCardImagePath(accountId: string, cardId: string): string {
  return `${accountId}/cards/${cardId}.jpg`
}

/**
 * Construit le path strict contractuel pour une carte de banque
 * Format: {cardId}.jpg (flat, pas de sous-dossiers)
 * Storage policies : name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$' (UUID.ext)
 */
export function buildBankCardImagePath(cardId: string): string {
  return `${cardId}.jpg`
}

/**
 * Construit un chemin conforme à la RLS policy Storage.
 * Format: {userId}/{subfolder}/{UUID}.jpg
 * Compatible avec la policy: foldername[1]=userId, foldername[2]=subfolder, split_part(3)=UUID.jpg
 *
 * @param userId - auth.uid() de l'utilisateur connecté
 * @param fileName - nom du fichier original (pour extraire l'extension)
 * @param subfolder - sous-dossier dans le bucket ('cards' | 'avatars')
 */
export function buildRLSPath(
  userId: string,
  fileName: string,
  subfolder: 'cards' | 'avatars' = 'cards'
): string {
  const uuid = generateUUID()
  // La RLS impose .jpg strictement (regex: ^[0-9a-f-]{36}\.jpg$)
  // Toutes les images sont normalisées vers .jpg — le contentType reste l'original
  return `${userId}/${subfolder}/${uuid}.jpg`
}

/** Construit un chemin scoping par user, avec préfixe (ex: taches, recompenses) */
export function buildScopedPath(
  userId: string,
  fileName: string,
  prefix: string = 'misc'
): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const rnd = Math.random().toString(36).slice(2, 8)
  const safe = sanitizeFileName(fileName)
  return `${userId}/${prefix}/${y}/${m}/${day}/${Date.now()}-${rnd}-${safe}`
}
