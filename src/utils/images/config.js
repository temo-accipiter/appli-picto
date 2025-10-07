// src/utils/images/config.js
// Constantes partagées pour la gestion des images (validation + storage)

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  // Note: pas de GIF (trop lourd). Ajouter 'image/gif' si besoin exceptionnel.
]

// Limite "hard" côté upload Storage (réseau/serveur).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 Mo

// Cible de compression côté UI (pré-traitement navigateur)
export const TARGET_MAX_UI_SIZE_KO = 100 // 100 Ko

// Nom du bucket public utilisé pour les images
export const PUBLIC_BUCKET = 'images'
export const DEMO_PUBLIC_BUCKET = 'demo-images' // public (assets de démo)
