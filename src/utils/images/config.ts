// src/utils/images/config.ts
// Configuration globale système d'images (validation, compression, storage)

// ═══════════════════════════════════════════════════════════════════════════
// FORMATS AUTORISÉS
// ═══════════════════════════════════════════════════════════════════════════

export const ALLOWED_MIME_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'image/jpg', // Normalisé automatiquement en image/jpeg
  'image/webp',
  'image/svg+xml',
  'image/heic', // 🆕 Support iPhone (iOS 11+)
  'image/heif', // 🆕 Variante HEIF
]

// ═══════════════════════════════════════════════════════════════════════════
// LIMITES TAILLE FICHIERS
// ═══════════════════════════════════════════════════════════════════════════

// Limite "hard" côté upload Storage (réseau/serveur)
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 Mo

// Cible de compression côté UI (pré-traitement navigateur)
export const TARGET_MAX_UI_SIZE_KB = 20 // 🆕 20 Ko (au lieu de 100 Ko)
export const FALLBACK_MAX_UI_SIZE_KB = 30 // 🆕 Fallback si 20 Ko impossible

// ⚠️ DEPRECATED : Utiliser TARGET_MAX_UI_SIZE_KB à la place
export const TARGET_MAX_UI_SIZE_KO = TARGET_MAX_UI_SIZE_KB

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSIONS CIBLES
// ═══════════════════════════════════════════════════════════════════════════

// Dimension cible pour images (mobile-first TSA)
export const TARGET_DIMENSION = 192 // 🆕 192×192px (au lieu de 256px)

// ═══════════════════════════════════════════════════════════════════════════
// BUCKETS SUPABASE STORAGE
// ═══════════════════════════════════════════════════════════════════════════

// Bucket images privées utilisateurs (cartes personnelles)
// Path attendu : {account_id}/{card_id}.ext (owner-only, signed URL)
// Contrat S3 §5.3 + Migration phase8_1
export const PRIVATE_BUCKET = 'personal-images'

// ⚠️ DEPRECATED : Utiliser PRIVATE_BUCKET à la place
export const PUBLIC_BUCKET = PRIVATE_BUCKET

// Bucket banque de cartes (images publiques, lecture par tous)
// Path attendu : {uuid}.ext (flat, pas de sous-dossiers)
// Contrat S3 §5.3 + Migration phase8_1
export const BANK_IMAGES_BUCKET = 'bank-images'

// ═══════════════════════════════════════════════════════════════════════════
// SIGNED URL TTL
// ═══════════════════════════════════════════════════════════════════════════

// Durée validité signed URLs (compromis cache CDN vs sécurité)
export const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60 // 🆕 24h (au lieu de 6h)
