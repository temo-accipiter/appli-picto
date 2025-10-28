# 🚀 PLAN COMPLET - REFONTE SYSTÈME D'IMAGES APPLI-PICTO

## 📋 Vue d'ensemble

**Objectif :** Moderniser le traitement des images avec WebP, déduplication, cache optimisé, et support HEIC.

**Architecture :**

- **Images privées (tâches/récompenses utilisateurs)** → Supabase Storage (bucket privé + signed URLs)
- **Images publiques (pictos partagés - rare)** → Cloudinary CDN (à implémenter ultérieurement)

**Stratégie d'implémentation :**

1. **PHASE A** : Système complet pour images privées Supabase Storage (PRIORITÉ)
2. **PHASE B** : Extension Cloudinary pour images publiques (APRÈS Phase A stabilisée)

**Temps total estimé :** 25-30 heures

---

# 📦 PHASE A : IMAGES PRIVÉES SUPABASE STORAGE

**Priorité :** 🔴 **CRITIQUE** - À faire en premier
**Temps estimé :** 18-22 heures
**Objectif :** Système complet fonctionnel pour 99% des cas d'usage (images utilisateurs privées)

---

## ÉTAPE A1 : PRÉPARATION BASE DE DONNÉES (2-3h)

### A1.1 - Migration `user_assets` : Nouveaux champs

**🎯 Objectif :** Enrichir la table pour versioning, déduplication, monitoring

**📝 Action :**

**Créer :** `supabase/migrations/20251023000001_enhance_user_assets.sql`

```sql
-- Migration : Enrichissement table user_assets pour système moderne
-- Date : 2025-10-23
-- Auteur : Claude Code

-- Ajout colonnes modernes
ALTER TABLE public.user_assets
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS sha256_hash TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ;

-- Note : cloudinary_* seront ajoutés en Phase B

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_assets_sha256
  ON public.user_assets(sha256_hash)
  WHERE sha256_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_assets_version
  ON public.user_assets(user_id, asset_type, version);

CREATE INDEX IF NOT EXISTS idx_user_assets_deleted
  ON public.user_assets(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Contrainte unicité hash (déduplication)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_unique_hash
  ON public.user_assets(user_id, sha256_hash)
  WHERE sha256_hash IS NOT NULL AND deleted_at IS NULL;

-- Commentaires documentation
COMMENT ON COLUMN public.user_assets.version IS 'Version de l''image (incrémenté à chaque remplacement)';
COMMENT ON COLUMN public.user_assets.sha256_hash IS 'Hash SHA-256 pour déduplication (évite uploads identiques)';
COMMENT ON COLUMN public.user_assets.width IS 'Largeur image en pixels (extrait après upload)';
COMMENT ON COLUMN public.user_assets.height IS 'Hauteur image en pixels (extrait après upload)';
COMMENT ON COLUMN public.user_assets.deleted_at IS 'Soft delete timestamp (NULL = actif, NOT NULL = supprimé)';
COMMENT ON COLUMN public.user_assets.migrated_at IS 'Date migration vers nouveau système (NULL = ancien système)';
```

**Commandes :**

```bash
# Appliquer migration
npx supabase db push

# Mettre à jour schema.sql
yarn db:dump

# Vérifier
npx supabase db diff
```

**✅ Résultat attendu :**

- Table `user_assets` enrichie avec 6 nouvelles colonnes
- Index créés pour performance
- Contrainte unicité hash active

---

### A1.2 - Fonction RPC `check_duplicate_image()`

**🎯 Objectif :** Déduplication avant upload (éviter uploads identiques)

**📝 Action :**

**Créer :** `supabase/migrations/20251023000002_add_check_duplicate_image.sql`

```sql
-- Fonction : Vérifier si un hash d'image existe déjà
-- Usage : Déduplication avant upload (économie storage)

CREATE OR REPLACE FUNCTION public.check_duplicate_image(
  p_user_id UUID,
  p_sha256_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Vérification permission (self ou admin)
  PERFORM public.assert_self_or_admin(p_user_id);

  -- Chercher hash existant (non supprimé)
  SELECT id, file_path, width, height, version
  INTO v_existing
  FROM public.user_assets
  WHERE user_id = p_user_id
    AND sha256_hash = p_sha256_hash
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- Hash existe déjà → retourner infos asset
    RETURN jsonb_build_object(
      'exists', true,
      'asset_id', v_existing.id,
      'file_path', v_existing.file_path,
      'width', v_existing.width,
      'height', v_existing.height,
      'version', v_existing.version
    );
  ELSE
    -- Hash nouveau → autoriser upload
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.check_duplicate_image(UUID, TEXT) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.check_duplicate_image IS
  'Vérifie si un hash SHA-256 existe déjà pour un utilisateur (déduplication)';
```

**Commandes :**

```bash
npx supabase db push
yarn db:dump
```

**✅ Résultat attendu :**

- Fonction RPC `check_duplicate_image()` disponible
- Accessible depuis client Supabase JS

---

### A1.3 - Table `image_metrics` (monitoring)

**🎯 Objectif :** Tracker uploads, compression ratio, erreurs (analytics)

**📝 Action :**

**Créer :** `supabase/migrations/20251023000003_add_image_metrics.sql`

```sql
-- Table : Métriques uploads images (monitoring & analytics)

CREATE TABLE IF NOT EXISTS public.image_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('task_image', 'reward_image')),

  -- Métriques compression
  original_size BIGINT NOT NULL CHECK (original_size >= 0),
  compressed_size BIGINT NOT NULL CHECK (compressed_size >= 0),
  compression_ratio NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN original_size > 0 THEN
        ROUND((1 - (compressed_size::numeric / original_size::numeric)) * 100, 2)
      ELSE 0
    END
  ) STORED,

  -- Performance (millisecondes)
  conversion_ms INTEGER CHECK (conversion_ms >= 0),
  upload_ms INTEGER CHECK (upload_ms >= 0),

  -- Résultat upload
  result TEXT NOT NULL CHECK (result IN ('success', 'failed', 'fallback_original')),
  error_message TEXT,

  -- Contexte technique
  mime_type_original TEXT,
  mime_type_final TEXT,
  conversion_method TEXT CHECK (
    conversion_method IN ('client_webp', 'heic_to_jpeg_then_webp', 'none', 'svg_unchanged')
  ),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour analytics
CREATE INDEX idx_image_metrics_user ON public.image_metrics(user_id);
CREATE INDEX idx_image_metrics_result ON public.image_metrics(result);
CREATE INDEX idx_image_metrics_date ON public.image_metrics(created_at DESC);
CREATE INDEX idx_image_metrics_asset_type ON public.image_metrics(asset_type);

-- RLS
ALTER TABLE public.image_metrics ENABLE ROW LEVEL SECURITY;

-- Politique : users voient leurs propres metrics
CREATE POLICY "Users can view own metrics"
  ON public.image_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : users peuvent insérer leurs propres metrics
CREATE POLICY "Users can insert own metrics"
  ON public.image_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : admins voient toutes les metrics
CREATE POLICY "Admins can view all metrics"
  ON public.image_metrics
  FOR SELECT
  USING (public.is_admin());

-- Permissions
GRANT SELECT, INSERT ON public.image_metrics TO authenticated;

-- Commentaire
COMMENT ON TABLE public.image_metrics IS
  'Métriques uploads images : compression ratio, performance, erreurs (analytics)';
```

**Fonction RPC analytics (bonus admin) :**

```sql
-- Fonction : Statistiques globales uploads (7 derniers jours)
CREATE OR REPLACE FUNCTION public.get_image_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Admins uniquement
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admins only' USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'period_days', 7,
      'total_uploads', COUNT(*),
      'success_count', COUNT(*) FILTER (WHERE result = 'success'),
      'failed_count', COUNT(*) FILTER (WHERE result = 'failed'),
      'avg_compression_ratio', ROUND(AVG(compression_ratio), 2),
      'avg_conversion_ms', ROUND(AVG(conversion_ms), 0),
      'avg_upload_ms', ROUND(AVG(upload_ms), 0),
      'total_storage_saved_mb', ROUND(SUM(original_size - compressed_size) / 1048576.0, 2)
    )
    FROM public.image_metrics
    WHERE created_at > NOW() - INTERVAL '7 days'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_image_analytics_summary() TO authenticated;

COMMENT ON FUNCTION public.get_image_analytics_summary IS
  'Statistiques uploads 7 derniers jours (admins uniquement)';
```

**Commandes :**

```bash
npx supabase db push
yarn db:dump
```

**✅ Résultat attendu :**

- Table `image_metrics` créée
- Fonction analytics admin disponible
- RLS configurée

---

## ÉTAPE A2 : UTILITAIRES FRONTEND - CONVERSION & VALIDATION (3-4h)

### A2.1 - Configuration globale mise à jour

**🎯 Objectif :** Nouvelles constantes (20 KB, 192px, TTL 24h)

**📝 Action :**

**Modifier :** `src/utils/images/config.js`

```javascript
// src/utils/images/config.js
// Configuration globale images (validation, compression, storage)

// Formats MIME autorisés
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg', // Normalisé en image/jpeg automatiquement
  'image/webp',
  'image/svg+xml',
  'image/heic', // 🆕 Support iPhone (iOS 11+)
  'image/heif', // 🆕 Variante HEIF
]

// Limites taille fichiers
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 Mo (hard limit serveur)
export const TARGET_MAX_UI_SIZE_KB = 20 // 🆕 20 Ko (au lieu de 100 Ko)
export const FALLBACK_MAX_UI_SIZE_KB = 30 // 🆕 Fallback si 20 Ko impossible

// Dimensions cibles (mobile-first TSA)
export const TARGET_DIMENSION = 192 // 🆕 192×192px (au lieu de 256px)

// Buckets Supabase Storage
export const PRIVATE_BUCKET = 'images' // Images privées utilisateurs
export const DEMO_PUBLIC_BUCKET = 'demo-images' // Assets démo (admin only)

// Signed URL TTL (compromise cache CDN vs sécurité)
export const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60 // 🆕 24h (au lieu de 6h)

// Note : Cloudinary config sera ajouté en Phase B
```

**✅ Résultat attendu :**

- Config mise à jour avec nouvelles limites
- Support HEIC ajouté
- TTL 24h pour meilleur cache CDN

---

### A2.2 - Support HEIC (iPhone)

**🎯 Objectif :** Convertir HEIC → JPEG avant WebP (débloquer 70% utilisateurs iOS)

**📝 Action :**

**Installer dépendance :**

```bash
yarn add heic2any
```

**Créer :** `src/utils/images/heicConverter.js`

```javascript
// src/utils/images/heicConverter.js
// Conversion HEIC (iPhone) → JPEG

import heic2any from 'heic2any'

/**
 * Convertit HEIC (iPhone) en JPEG
 * @param {File} file - Fichier HEIC
 * @returns {Promise<File>} - Fichier JPEG converti
 */
export async function convertHEICtoJPEG(file) {
  if (!isHEIC(file)) {
    return file // Pas HEIC → retour tel quel
  }

  try {
    console.log('🔄 Conversion HEIC → JPEG...')

    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95, // Haute qualité (compression WebP après)
    })

    // Gérer cas où heic2any retourne Array de Blobs
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

    const convertedFile = new File(
      [blob],
      file.name.replace(/\.heic$/i, '.jpg'),
      {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }
    )

    console.log(`✅ HEIC converti : ${file.size} → ${convertedFile.size} bytes`)
    return convertedFile
  } catch (error) {
    console.error('❌ Erreur conversion HEIC:', error)
    throw new Error(
      "Impossible de convertir l'image HEIC. Essayez de la convertir en JPEG depuis votre téléphone."
    )
  }
}

/**
 * Détecte si fichier est HEIC
 * @param {File} file
 * @returns {boolean}
 */
export function isHEIC(file) {
  const type = file.type?.toLowerCase()
  const name = file.name?.toLowerCase()

  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}
```

**✅ Résultat attendu :**

- Module de conversion HEIC opérationnel
- Gestion erreurs explicite

---

### A2.3 - Validation unifiée images

**🎯 Objectif :** 1 fonction unique pour validation MIME + magic bytes

**📝 Action :**

**Créer :** `src/utils/images/imageValidator.js`

```javascript
// src/utils/images/imageValidator.js
// Validation complète et unifiée des images

import { ALLOWED_MIME_TYPES } from '@/utils/images/config'

/**
 * Validation complète d'un fichier image (MIME type + magic bytes)
 * @param {File} file - Fichier à valider
 * @returns {Promise<{valid: boolean, error: string|null, normalizedType: string|null}>}
 */
export async function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      error: 'Aucun fichier fourni',
      normalizedType: null,
    }
  }

  // 1️⃣ Validation type MIME
  const rawType = String(file.type || '').toLowerCase()
  const normalizedType = rawType === 'image/jpg' ? 'image/jpeg' : rawType

  if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
    return {
      valid: false,
      error: `Format non supporté.\nFormats acceptés : PNG, JPEG, WebP, SVG, HEIC`,
      normalizedType,
    }
  }

  // 2️⃣ Validation Magic Bytes (sécurité anti-spoofing)
  try {
    const buf = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buf)

    // PNG : 89 50 4E 47 0D 0A 1A 0A
    const isPNG =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a

    // JPEG : FF D8
    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8

    // WebP : "RIFF" .... "WEBP"
    const isWebP =
      bytes[0] === 0x52 && // R
      bytes[1] === 0x49 && // I
      bytes[2] === 0x46 && // F
      bytes[3] === 0x46 && // F
      bytes[8] === 0x57 && // W
      bytes[9] === 0x45 && // E
      bytes[10] === 0x42 && // B
      bytes[11] === 0x50 // P

    // SVG : Type textuel (pas de magic bytes fiables)
    const isSVG = normalizedType === 'image/svg+xml'

    // HEIC : Type-based uniquement (magic bytes complexes)
    const isHEIC =
      normalizedType === 'image/heic' || normalizedType === 'image/heif'

    if (isPNG || isJPEG || isWebP || isSVG || isHEIC) {
      return {
        valid: true,
        error: null,
        normalizedType,
      }
    }

    return {
      valid: false,
      error: 'Fichier corrompu ou type usurpé (magic bytes invalides)',
      normalizedType,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Erreur lors de la lecture du fichier',
      normalizedType,
    }
  }
}
```

**✅ Résultat attendu :**

- Validation unifiée (remplace 3 fonctions disparates)
- Support HEIC inclus
- Messages d'erreur clairs

---

### A2.4 - Conversion WebP moderne

**🎯 Objectif :** Conversion PNG/JPEG → WebP ≤ 20 KB avec stratégies progressives

**📝 Action :**

**Créer :** `src/utils/images/webpConverter.js`

```javascript
// src/utils/images/webpConverter.js
// Conversion WebP moderne avec compression progressive ≤ 20 KB

import {
  TARGET_MAX_UI_SIZE_KB,
  FALLBACK_MAX_UI_SIZE_KB,
  TARGET_DIMENSION,
} from '@/utils/images/config'

/**
 * Convertit une image en WebP avec compression progressive
 * Objectif : ≤ 20 KB, dimensions 192×192px (mobile-first TSA)
 *
 * @param {File} file - Fichier image original
 * @param {Object} options - Options compression
 * @returns {Promise<File|null>} - Fichier WebP compressé ou null si échec
 */
export async function convertToWebP(file, options = {}) {
  const {
    targetSizeKB = TARGET_MAX_UI_SIZE_KB,
    fallbackSizeKB = FALLBACK_MAX_UI_SIZE_KB,
    maxDimension = TARGET_DIMENSION,
  } = options

  // SVG : pas de conversion (vecteur)
  if (file.type === 'image/svg+xml') {
    console.log('ℹ️ SVG détecté → aucune conversion')
    return file
  }

  // Déjà ≤ 20 KB ? → retour tel quel
  if (file.size <= targetSizeKB * 1024) {
    console.log(`ℹ️ Fichier déjà ≤ ${targetSizeKB} KB → aucune compression`)
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      console.log(
        `🔄 Compression WebP : ${file.size} bytes (cible : ${targetSizeKB} KB)`
      )

      // Stratégies de compression progressives
      const strategies = [
        // Tentative 192px @ qualités décroissantes
        { dimension: 192, quality: 0.85 },
        { dimension: 192, quality: 0.75 },
        { dimension: 192, quality: 0.65 },
        { dimension: 192, quality: 0.55 },

        // Réduction dimensions si nécessaire
        { dimension: 160, quality: 0.75 },
        { dimension: 160, quality: 0.6 },
        { dimension: 128, quality: 0.7 },
        { dimension: 128, quality: 0.5 },

        // Dernier recours (ultra-compressé)
        { dimension: 96, quality: 0.6 },
      ]

      let currentTargetKB = targetSizeKB

      const tryCompression = async (strategyIndex = 0) => {
        if (strategyIndex >= strategies.length) {
          // Échec total → essayer avec fallback 30 KB
          if (
            currentTargetKB === targetSizeKB &&
            fallbackSizeKB > targetSizeKB
          ) {
            console.warn(
              `⚠️ Impossible ≤ ${targetSizeKB} KB → fallback ${fallbackSizeKB} KB`
            )
            currentTargetKB = fallbackSizeKB
            tryCompression(0) // Restart avec nouvelle cible
            return
          }

          console.error('❌ Compression échouée (toutes stratégies épuisées)')
          resolve(null)
          return
        }

        const strategy = strategies[strategyIndex]
        const canvas = document.createElement('canvas')

        // Calcul dimensions (respecter ratio)
        let { width, height } = img
        if (width > strategy.dimension || height > strategy.dimension) {
          const ratio = Math.min(
            strategy.dimension / width,
            strategy.dimension / height
          )
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Améliorer qualité rendu
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          blob => {
            if (!blob) {
              tryCompression(strategyIndex + 1)
              return
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.\w+$/, '.webp'),
              {
                type: 'image/webp',
                lastModified: Date.now(),
              }
            )

            if (compressedFile.size <= currentTargetKB * 1024) {
              const compressionRatio = (
                ((file.size - compressedFile.size) / file.size) *
                100
              ).toFixed(1)

              console.log(
                `✅ WebP compressé : ${compressedFile.size} bytes (${width}×${height}, qualité ${strategy.quality}, -${compressionRatio}%)`
              )

              resolve(compressedFile)
            } else {
              // Taille encore trop grande → stratégie suivante
              tryCompression(strategyIndex + 1)
            }
          },
          'image/webp',
          strategy.quality
        )
      }

      tryCompression(0)
    }

    img.onerror = () => {
      console.error('❌ Erreur chargement image pour conversion')
      resolve(null)
    }

    reader.onerror = () => {
      console.error('❌ Erreur lecture fichier')
      resolve(null)
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Calcule le hash SHA-256 d'un fichier (déduplication)
 * @param {File} file - Fichier à hasher
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal (64 caractères)
 */
export async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  console.log(`🔑 Hash SHA-256 calculé : ${hash.slice(0, 16)}...`)
  return hash
}

/**
 * Extrait dimensions d'une image
 * @param {File} file - Fichier image
 * @returns {Promise<{width: number, height: number}>}
 */
export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = e => {
      img.src = e.target.result
    }

    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      reject(new Error('Impossible de lire les dimensions'))
    }

    reader.onerror = () => {
      reject(new Error('Erreur lecture fichier'))
    }

    reader.readAsDataURL(file)
  })
}
```

**✅ Résultat attendu :**

- Conversion WebP avec fallback 30 KB
- Hash SHA-256 pour déduplication
- Extraction dimensions
- Logs détaillés pour debug

---

## ÉTAPE A3 : SERVICE UPLOAD MODERNE (4-5h)

### A3.1 - Retry logic avec backoff

**🎯 Objectif :** Réessais automatiques sur réseau instable (3G/4G)

**📝 Action :**

**Créer :** `src/utils/upload/uploadWithRetry.js`

```javascript
// src/utils/upload/uploadWithRetry.js
// Retry automatique avec backoff exponentiel (réseau instable mobile)

/**
 * Exécute une fonction upload avec retry automatique
 * @param {Function} uploadFn - Fonction async à exécuter
 * @param {Object} options - Options retry
 * @returns {Promise} - Résultat de uploadFn ou erreur finale
 */
export async function uploadWithRetry(uploadFn, options = {}) {
  const {
    maxRetries = 2,
    baseDelay = 1000, // 1s
    maxDelay = 5000, // 5s max
    onRetry = null, // Callback pour UI (toast, progress)
  } = options

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFn()
      return result // Succès
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        // Backoff exponentiel : 1s → 2s → 5s
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)

        console.warn(
          `⚠️ Upload échoué (tentative ${attempt + 1}/${maxRetries + 1}), retry dans ${delay}ms...`,
          error.message
        )

        // Callback UX (afficher toast "Connexion lente, réessai...")
        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries,
            delay,
            error,
          })
        }

        // Attendre avant retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Tous les retries épuisés → erreur finale
  console.error('❌ Upload échoué après', maxRetries + 1, 'tentatives')
  throw lastError
}
```

**✅ Résultat attendu :**

- Fonction réutilisable pour toute opération async
- Backoff intelligent (1s → 2s → 5s)
- Callback UI pour feedback utilisateur

---

### A3.2 - Service upload moderne principal

**🎯 Objectif :** Upload complet avec HEIC, WebP, déduplication, retry, monitoring

**📝 Action :**

**Créer :** `src/utils/storage/modernUploadImage.js`

```javascript
// src/utils/storage/modernUploadImage.js
// Upload moderne images privées Supabase Storage
// Pipeline : HEIC → WebP → Hash → Dédup → Quota → Upload → Metrics

import { supabase } from '@/utils/supabaseClient'
import { validateImageFile } from '@/utils/images/imageValidator'
import { convertHEICtoJPEG, isHEIC } from '@/utils/images/heicConverter'
import {
  convertToWebP,
  calculateFileHash,
  getImageDimensions,
} from '@/utils/images/webpConverter'
import { uploadWithRetry } from '@/utils/upload/uploadWithRetry'
import {
  TARGET_MAX_UI_SIZE_KB,
  PRIVATE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from '@/utils/images/config'
import { buildScopedPath, sanitizeFileName } from '@/utils/storage/uploadImage'

/**
 * Upload moderne d'une image privée (Supabase Storage)
 *
 * Pipeline complet :
 * 1. Validation MIME + magic bytes
 * 2. Conversion HEIC → JPEG (si iPhone)
 * 3. Conversion → WebP ≤ 20 KB (sauf SVG)
 * 4. Calcul hash SHA-256 (déduplication)
 * 5. Vérification quota utilisateur
 * 6. Upload avec retry (réseau instable)
 * 7. Enregistrement user_assets + metrics
 * 8. Génération signed URL (TTL 24h)
 *
 * @param {File} file - Fichier image original
 * @param {Object} options - Options upload
 * @returns {Promise<{path, url, assetId, width, height, isDuplicate, error}>}
 */
export async function modernUploadImage(file, options = {}) {
  const {
    userId,
    assetType = 'task_image', // 'task_image' | 'reward_image'
    prefix = 'misc', // Préfixe chemin : 'taches', 'recompenses', 'misc'
    onProgress = null, // Callback progression (pour UI)
  } = options

  // Métriques (monitoring)
  const metrics = {
    originalSize: file.size,
    compressedSize: file.size,
    conversionMs: null,
    uploadMs: null,
    result: 'success',
    errorMessage: null,
    mimeTypeOriginal: file.type,
    mimeTypeFinal: file.type,
    conversionMethod: 'none',
  }

  const startTime = Date.now()

  try {
    // ─────────────────────────────────────────────────────────────
    // 1️⃣ VALIDATION ENTRÉE
    // ─────────────────────────────────────────────────────────────
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    if (!userId) {
      throw new Error('userId requis')
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 5 })
    }

    // ─────────────────────────────────────────────────────────────
    // 2️⃣ VALIDATION FICHIER (MIME + MAGIC BYTES)
    // ─────────────────────────────────────────────────────────────
    const validation = await validateImageFile(file)

    if (!validation.valid) {
      throw new Error(validation.error)
    }

    if (onProgress) {
      onProgress({ step: 'validation', progress: 10 })
    }

    // ─────────────────────────────────────────────────────────────
    // 3️⃣ CONVERSION HEIC → JPEG (si iPhone)
    // ─────────────────────────────────────────────────────────────
    let processedFile = file
    const conversionStart = Date.now()

    if (isHEIC(file)) {
      console.log('📱 iPhone HEIC détecté → conversion JPEG...')

      processedFile = await convertHEICtoJPEG(file)
      metrics.conversionMethod = 'heic_to_jpeg_then_webp'

      if (onProgress) {
        onProgress({ step: 'heic_conversion', progress: 20 })
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 4️⃣ CONVERSION → WEBP ≤ 20 KB (sauf SVG)
    // ─────────────────────────────────────────────────────────────
    if (processedFile.type !== 'image/svg+xml') {
      const webpFile = await convertToWebP(processedFile, {
        targetSizeKB: TARGET_MAX_UI_SIZE_KB,
      })

      if (!webpFile) {
        // Fallback : accepter original si < 100 KB
        if (processedFile.size <= 100 * 1024) {
          console.warn('⚠️ Compression WebP échouée → upload original')
          metrics.conversionMethod =
            metrics.conversionMethod === 'heic_to_jpeg_then_webp'
              ? 'heic_to_jpeg_only'
              : 'fallback_original'
          metrics.result = 'fallback_original'
        } else {
          throw new Error(
            'Image trop lourde et compression impossible.\nEssayez une image plus simple ou de meilleure qualité.'
          )
        }
      } else {
        processedFile = webpFile
        metrics.mimeTypeFinal = 'image/webp'

        if (metrics.conversionMethod === 'none') {
          metrics.conversionMethod = 'client_webp'
        }
      }
    } else {
      metrics.conversionMethod = 'svg_unchanged'
    }

    metrics.compressedSize = processedFile.size
    metrics.conversionMs = Date.now() - conversionStart

    if (onProgress) {
      onProgress({ step: 'compression', progress: 40 })
    }

    // ─────────────────────────────────────────────────────────────
    // 5️⃣ CALCUL HASH SHA-256 (déduplication)
    // ─────────────────────────────────────────────────────────────
    const fileHash = await calculateFileHash(processedFile)

    if (onProgress) {
      onProgress({ step: 'hash', progress: 50 })
    }

    // ─────────────────────────────────────────────────────────────
    // 6️⃣ VÉRIFICATION DUPLICATION
    // ─────────────────────────────────────────────────────────────
    const { data: duplicateCheck, error: dupError } = await supabase.rpc(
      'check_duplicate_image',
      {
        p_user_id: userId,
        p_sha256_hash: fileHash,
      }
    )

    if (dupError) {
      console.error('Erreur vérification duplication:', dupError)
      // Continue malgré erreur (non bloquant)
    }

    if (duplicateCheck?.exists) {
      console.log('♻️ Image identique trouvée → réutilisation asset existant')

      // Log metric duplication
      await logMetrics(userId, assetType, metrics)

      return {
        path: duplicateCheck.file_path,
        url: null, // Généré plus tard si besoin
        assetId: duplicateCheck.asset_id,
        width: duplicateCheck.width,
        height: duplicateCheck.height,
        isDuplicate: true,
        error: null,
      }
    }

    if (onProgress) {
      onProgress({ step: 'deduplication', progress: 60 })
    }

    // ─────────────────────────────────────────────────────────────
    // 7️⃣ VÉRIFICATION QUOTA UTILISATEUR
    // ─────────────────────────────────────────────────────────────
    const { data: quotaCheck, error: quotaError } = await supabase.rpc(
      'check_image_quota',
      {
        p_user_id: userId,
        p_asset_type: assetType,
        p_file_size: processedFile.size,
      }
    )

    if (quotaError) {
      console.error('Erreur vérification quota:', quotaError)
      throw new Error('Impossible de vérifier les quotas')
    }

    if (!quotaCheck?.can_upload) {
      const reason = quotaCheck?.reason || 'limite atteinte'

      const messages = {
        task_image_limit_reached: 'Quota de tâches atteint',
        reward_image_limit_reached: 'Quota de récompenses atteint',
        total_image_limit_reached: "Quota total d'images atteint",
        image_too_large: 'Image trop volumineuse',
      }

      throw new Error(messages[reason] || `Quota dépassé : ${reason}`)
    }

    if (onProgress) {
      onProgress({ step: 'quota', progress: 70 })
    }

    // ─────────────────────────────────────────────────────────────
    // 8️⃣ EXTRAIRE DIMENSIONS
    // ─────────────────────────────────────────────────────────────
    const { width, height } = await getImageDimensions(processedFile)

    // ─────────────────────────────────────────────────────────────
    // 9️⃣ UPLOAD SUPABASE STORAGE (avec retry)
    // ─────────────────────────────────────────────────────────────
    const fileName = sanitizeFileName(processedFile.name)
    const storagePath = buildScopedPath(userId, fileName, prefix)

    const uploadStart = Date.now()

    const { data: storageData, error: storageError } = await uploadWithRetry(
      () =>
        supabase.storage
          .from(PRIVATE_BUCKET)
          .upload(storagePath, processedFile, {
            cacheControl: `${SIGNED_URL_TTL_SECONDS}`, // 24h
            upsert: false,
            contentType: processedFile.type,
          }),
      {
        maxRetries: 2,
        onRetry: ({ attempt, maxRetries }) => {
          console.log(`🔄 Réessai upload ${attempt}/${maxRetries}...`)

          if (onProgress) {
            onProgress({
              step: 'upload_retry',
              progress: 70 + attempt * 5,
              message: `Connexion lente, réessai ${attempt}...`,
            })
          }
        },
      }
    )

    if (storageError) {
      console.error('❌ Erreur upload Supabase Storage:', storageError)
      throw storageError
    }

    metrics.uploadMs = Date.now() - uploadStart

    if (onProgress) {
      onProgress({ step: 'upload', progress: 85 })
    }

    // ─────────────────────────────────────────────────────────────
    // 🔟 ENREGISTREMENT USER_ASSETS
    // ─────────────────────────────────────────────────────────────
    const { data: asset, error: dbError } = await supabase
      .from('user_assets')
      .insert({
        user_id: userId,
        asset_type: assetType,
        file_path: storageData.path,
        file_size: processedFile.size,
        mime_type: processedFile.type,
        width,
        height,
        sha256_hash: fileHash,
        version: 1,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('❌ Erreur enregistrement BDD:', dbError)

      // Gérer erreur unicité (23505 - race condition déduplication)
      if (dbError.code === '23505') {
        console.warn('⚠️ Hash en conflit → récupération asset existant')

        const { data: existing } = await supabase
          .from('user_assets')
          .select('id, file_path, width, height')
          .eq('user_id', userId)
          .eq('sha256_hash', fileHash)
          .single()

        if (existing) {
          // Cleanup fichier uploadé (duplication détectée après coup)
          await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

          // Log metric
          await logMetrics(userId, assetType, metrics)

          return {
            path: existing.file_path,
            url: null,
            assetId: existing.id,
            width: existing.width,
            height: existing.height,
            isDuplicate: true,
            error: null,
          }
        }
      }

      // Cleanup storage si BDD fail (orphelin)
      await supabase.storage.from(PRIVATE_BUCKET).remove([storageData.path])

      throw dbError
    }

    if (onProgress) {
      onProgress({ step: 'database', progress: 95 })
    }

    // ─────────────────────────────────────────────────────────────
    // 1️⃣1️⃣ GÉNÉRATION SIGNED URL (TTL 24h)
    // ─────────────────────────────────────────────────────────────
    const { data: signedData, error: signError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storageData.path, SIGNED_URL_TTL_SECONDS)

    if (signError) {
      console.error('⚠️ Erreur génération signed URL:', signError)
      // Non bloquant → URL générée plus tard si besoin
    }

    // ─────────────────────────────────────────────────────────────
    // 1️⃣2️⃣ LOG METRICS (analytics)
    // ─────────────────────────────────────────────────────────────
    await logMetrics(userId, assetType, metrics)

    if (onProgress) {
      onProgress({ step: 'complete', progress: 100 })
    }

    console.log('✅ Upload réussi:', storageData.path)

    return {
      path: storageData.path,
      url: signedData?.signedUrl || null,
      assetId: asset.id,
      width,
      height,
      isDuplicate: false,
      error: null,
    }
  } catch (error) {
    console.error('❌ Upload échoué:', error)

    metrics.result = 'failed'
    metrics.errorMessage = error.message

    // Log metric échec
    await logMetrics(userId, assetType, metrics)

    return {
      path: null,
      url: null,
      assetId: null,
      width: null,
      height: null,
      isDuplicate: false,
      error,
    }
  }
}

/**
 * Log metrics upload (analytics)
 * @param {string} userId
 * @param {string} assetType
 * @param {Object} metrics
 */
async function logMetrics(userId, assetType, metrics) {
  try {
    await supabase.from('image_metrics').insert({
      user_id: userId,
      asset_type: assetType,
      original_size: metrics.originalSize,
      compressed_size: metrics.compressedSize,
      conversion_ms: metrics.conversionMs,
      upload_ms: metrics.uploadMs,
      result: metrics.result,
      error_message: metrics.errorMessage,
      mime_type_original: metrics.mimeTypeOriginal,
      mime_type_final: metrics.mimeTypeFinal,
      conversion_method: metrics.conversionMethod,
    })
  } catch (error) {
    console.error('⚠️ Erreur log metrics:', error)
    // Non bloquant
  }
}

/**
 * Remplace une image existante (incrémente version)
 * @param {string} assetId - ID asset à remplacer
 * @param {File} newFile - Nouveau fichier
 * @param {Object} options - Options (userId, onProgress)
 * @returns {Promise<{path, url, version, error}>}
 */
export async function replaceImage(assetId, newFile, options = {}) {
  const { userId, onProgress } = options

  if (!userId) {
    return { path: null, url: null, error: new Error('userId requis') }
  }

  try {
    // Récupérer asset existant
    const { data: existingAsset, error: fetchError } = await supabase
      .from('user_assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingAsset) {
      throw new Error('Asset introuvable')
    }

    // Upload nouvelle version
    const uploadResult = await modernUploadImage(newFile, {
      userId,
      assetType: existingAsset.asset_type,
      prefix:
        existingAsset.asset_type === 'task_image' ? 'taches' : 'recompenses',
      onProgress,
    })

    if (uploadResult.error) {
      return uploadResult
    }

    // Soft delete ancienne version
    await supabase
      .from('user_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', assetId)

    // Incrémenter version nouvel asset
    const newVersion = (existingAsset.version || 1) + 1

    await supabase
      .from('user_assets')
      .update({ version: newVersion })
      .eq('id', uploadResult.assetId)

    console.log(
      `♻️ Image remplacée : v${existingAsset.version} → v${newVersion}`
    )

    // TODO : Invalider cache Service Worker (Phase A4)

    return {
      ...uploadResult,
      version: newVersion,
    }
  } catch (error) {
    console.error('❌ Erreur remplacement image:', error)
    return { path: null, url: null, error }
  }
}
```

**✅ Résultat attendu :**

- Pipeline complet upload images privées
- Support HEIC + WebP + déduplication
- Retry automatique
- Monitoring complet
- Gestion erreurs robuste

---

### A3.3 - Tests unitaires WebP converter

**🎯 Objectif :** Valider logique conversion + hash

**📝 Action :**

**Créer :** `src/utils/images/webpConverter.test.js`

```javascript
// src/utils/images/webpConverter.test.js
import { describe, it, expect } from 'vitest'
import { convertToWebP, calculateFileHash } from './webpConverter'

describe('webpConverter', () => {
  it('ne convertit pas SVG', async () => {
    const mockSvg = new File(['<svg></svg>'], 'test.svg', {
      type: 'image/svg+xml',
    })

    const result = await convertToWebP(mockSvg)

    expect(result).toBe(mockSvg) // Retour tel quel
  })

  it('retourne fichier si déjà ≤ 20 KB', async () => {
    const smallFile = new File([new ArrayBuffer(10 * 1024)], 'small.png', {
      type: 'image/png',
    })

    const result = await convertToWebP(smallFile)

    expect(result).toBe(smallFile) // Aucune conversion
  })

  it('calcule hash SHA-256 (64 hex chars)', async () => {
    const mockFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    })

    const hash = await calculateFileHash(mockFile)

    expect(hash).toHaveLength(64) // SHA-256 = 64 caractères hex
    expect(hash).toMatch(/^[0-9a-f]{64}$/) // Hex uniquement
  })

  it('calcule hash identique pour contenu identique', async () => {
    const file1 = new File(['same content'], 'file1.txt')
    const file2 = new File(['same content'], 'file2.txt')

    const hash1 = await calculateFileHash(file1)
    const hash2 = await calculateFileHash(file2)

    expect(hash1).toBe(hash2) // Déduplication fonctionnelle
  })
})
```

**Commandes :**

```bash
yarn test src/utils/images/webpConverter.test.js
```

**✅ Résultat attendu :**

- Tests de base passent
- Validation déduplication hash

---

## ÉTAPE A4 : SERVICE WORKER - CACHE OFFLINE (3-4h)

### A4.1 - Service Worker avec placeholder TSA-friendly

**🎯 Objectif :** Cache intelligent 1h + placeholder SVG apaisant (pas d'image cassée)

**📝 Action :**

**Créer :** `public/sw.js`

```javascript
// public/sw.js
// Service Worker : Cache offline images avec stratégie TSA-friendly

const CACHE_VERSION = 'appli-picto-v1'
const IMAGE_CACHE = 'appli-picto-images-v1'
const STATIC_CACHE = 'appli-picto-static-v1'

// Assets statiques à pré-cacher
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json']

// Placeholder SVG apaisant (TSA-friendly : pas d'image cassée)
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect fill="#E8F4F8" width="192" height="192"/>
  <circle cx="96" cy="96" r="40" fill="#B8E0F0" opacity="0.5"/>
  <text x="96" y="105" font-family="Arial" font-size="12" fill="#5A9FB8" text-anchor="middle">Chargement...</text>
</svg>`

// ─────────────────────────────────────────────────────────────
// INSTALL : Pré-cache assets statiques
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('📦 Service Worker : Installation...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )

  self.skipWaiting()
})

// ─────────────────────────────────────────────────────────────
// ACTIVATE : Nettoyer vieux caches
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker : Activation...')

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return (
              name !== IMAGE_CACHE &&
              name !== STATIC_CACHE &&
              name !== CACHE_VERSION
            )
          })
          .map(name => {
            console.log('🗑️ Suppression vieux cache:', name)
            return caches.delete(name)
          })
      )
    })
  )

  self.clients.claim()
})

// ─────────────────────────────────────────────────────────────
// FETCH : Stratégie cache pour images
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Stratégie cache modéré pour images (Supabase Storage)
  if (
    request.destination === 'image' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/storage/v1/object/')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Vérifier fraîcheur cache (max 1 heure)
          if (cachedResponse) {
            const cacheDate = new Date(cachedResponse.headers.get('date'))
            const now = new Date()
            const ageMinutes = (now - cacheDate) / 1000 / 60

            // Cache récent (< 1h) → servir
            if (ageMinutes < 60) {
              console.log('✅ Cache hit (frais) :', url.pathname.slice(-30))
              return cachedResponse
            } else {
              console.log('⚠️ Cache périmé (> 1h), fetch réseau...')
            }
          }

          // Cache miss ou périmé → fetch réseau
          return fetch(request)
            .then(networkResponse => {
              // Cache si succès
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone())
              }
              return networkResponse
            })
            .catch(error => {
              console.error('❌ Fetch image échoué:', error.message)

              // Offline → servir cache périmé si existe
              if (cachedResponse) {
                console.log('📴 Mode offline → cache périmé utilisé (fallback)')
                return cachedResponse
              }

              // Pas de cache → placeholder SVG apaisant
              console.log('🖼️ Affichage placeholder (aucun cache)')
              return new Response(PLACEHOLDER_SVG, {
                status: 200,
                headers: {
                  'Content-Type': 'image/svg+xml',
                  'Cache-Control': 'no-cache',
                },
              })
            })
        })
      })
    )
    return
  }

  // Stratégie network-first pour le reste
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request)
    })
  )
})

// ─────────────────────────────────────────────────────────────
// MESSAGE : Invalider cache spécifique
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'INVALIDATE_IMAGE') {
    const { url } = event.data
    console.log('🗑️ Invalidation cache image:', url)

    caches.open(IMAGE_CACHE).then(cache => {
      cache.delete(url)
    })
  }

  if (event.data && event.data.type === 'CLEAR_ALL_CACHE') {
    console.log('🗑️ Vidage total cache')

    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(name => caches.delete(name)))
    })
  }
})
```

**✅ Résultat attendu :**

- Cache intelligent 1h (pas 1 an = trop agressif)
- Placeholder SVG apaisant (TSA-friendly)
- Invalidation cache possible

---

### A4.2 - Utilitaires enregistrement Service Worker

**🎯 Objectif :** Enregistrer SW + helper invalidation cache

**📝 Action :**

**Créer :** `src/utils/serviceWorker/register.js`

```javascript
// src/utils/serviceWorker/register.js
// Enregistrement et gestion Service Worker

/**
 * Enregistre le Service Worker (production uniquement)
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service Worker non supporté par ce navigateur')
    return null
  }

  if (import.meta.env.DEV) {
    console.log('🛠️ Mode dev → Service Worker désactivé')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('✅ Service Worker enregistré:', registration.scope)

    // Vérifier updates périodiquement (1h)
    setInterval(
      () => {
        registration.update()
      },
      60 * 60 * 1000
    )

    return registration
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error)
    return null
  }
}

/**
 * Invalide le cache d'une image spécifique
 * Usage : Après remplacement image
 * @param {string} url - URL image à invalider
 */
export async function invalidateImageCache(url) {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'INVALIDATE_IMAGE',
    url,
  })

  console.log('🗑️ Invalidation cache demandée:', url)
}

/**
 * Vide tout le cache (debug/admin)
 */
export async function clearAllCache() {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Pas de Service Worker actif')
    return
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_ALL_CACHE',
  })

  console.log('🗑️ Vidage total cache demandé')
}
```

**✅ Résultat attendu :**

- Enregistrement SW sécurisé
- Helpers invalidation cache

---

### A4.3 - Activer Service Worker dans main.jsx

**🎯 Objectif :** Charger SW au démarrage app (production uniquement)

**📝 Action :**

**Modifier :** `src/main.jsx`

```javascript
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { registerServiceWorker } from '@/utils/serviceWorker/register'
import './styles/main.scss'

// 🆕 Enregistrer Service Worker (production uniquement)
if (import.meta.env.PROD) {
  registerServiceWorker().then(registration => {
    if (registration) {
      console.log('✅ Service Worker prêt')
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**✅ Résultat attendu :**

- Service Worker actif en production
- Désactivé en dev (évite confusion)

---

## ÉTAPE A5 : INTÉGRATION HOOKS & COMPOSANTS (2-3h)

### A5.1 - Adapter hook `useTachesEdition`

**🎯 Objectif :** Utiliser `modernUploadImage()` au lieu de `uploadImage()`

**📝 Action :**

**Modifier :** `src/hooks/useTachesEdition.js`

```javascript
// src/hooks/useTachesEdition.js
import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { modernUploadImage } from '@/utils/storage/modernUploadImage' // 🆕
// ... autres imports

export function useTachesEdition() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Créer tâche avec upload image moderne
   * @param {File} file - Fichier image
   * @param {Object} fields - Champs tâche (label, etc.)
   */
  const addTacheFromFile = async (file, fields = {}) => {
    setLoading(true)
    setError(null)

    try {
      // 🆕 Upload moderne avec WebP + déduplication
      const uploadResult = await modernUploadImage(file, {
        userId: user.id,
        assetType: 'task_image',
        prefix: 'taches',
      })

      if (uploadResult.error) {
        throw uploadResult.error
      }

      // Créer tâche avec path uploadé
      const newTache = {
        label: fields.label || 'Nouvelle tâche',
        imagepath: uploadResult.path,
        user_id: user.id,
        ...fields,
      }

      const { data, error: dbError } = await supabase
        .from('taches')
        .insert(newTache)
        .select()
        .single()

      if (dbError) throw dbError

      console.log('✅ Tâche créée:', data.id)

      return { data, error: null }
    } catch (err) {
      console.error('❌ Erreur création tâche:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Mettre à jour image tâche existante
   * @param {string} tacheId - ID tâche
   * @param {File} newFile - Nouveau fichier
   */
  const updateTacheImage = async (tacheId, newFile) => {
    setLoading(true)
    setError(null)

    try {
      // Récupérer asset_id actuel
      const { data: tache } = await supabase
        .from('taches')
        .select('imagepath')
        .eq('id', tacheId)
        .single()

      if (!tache?.imagepath) {
        throw new Error('Tâche sans image associée')
      }

      // Trouver asset correspondant
      const { data: asset } = await supabase
        .from('user_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('file_path', tache.imagepath)
        .single()

      if (!asset) {
        throw new Error('Asset introuvable')
      }

      // 🆕 Remplacer image (incrémente version)
      const { replaceImage } = await import('@/utils/storage/modernUploadImage')

      const replaceResult = await replaceImage(asset.id, newFile, {
        userId: user.id,
      })

      if (replaceResult.error) {
        throw replaceResult.error
      }

      // Mettre à jour chemin dans tâche
      await supabase
        .from('taches')
        .update({ imagepath: replaceResult.path })
        .eq('id', tacheId)

      console.log(
        '✅ Image tâche mise à jour (version',
        replaceResult.version,
        ')'
      )

      return { data: replaceResult, error: null }
    } catch (err) {
      console.error('❌ Erreur mise à jour image:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  return {
    addTacheFromFile,
    updateTacheImage,
    loading,
    error,
  }
}
```

**✅ Résultat attendu :**

- Hook adapté au nouveau système
- Support WebP + déduplication
- Versioning images

---

### A5.2 - Composant Progress Indicator TSA-friendly

**🎯 Objectif :** Feedback visuel rassurant pendant upload (enfants TSA)

**📝 Action :**

**Créer :** `src/components/ui/upload-progress/UploadProgress.jsx`

```jsx
// src/components/ui/upload-progress/UploadProgress.jsx
import PropTypes from 'prop-types'
import './UploadProgress.scss'

/**
 * Indicateur progression upload TSA-friendly
 * @param {number} progress - Progression 0-100
 * @param {string} message - Message contextuel
 */
export default function UploadProgress({
  progress = 0,
  message = 'Envoi en cours...',
}) {
  return (
    <div
      className="upload-progress"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="upload-progress__bar" aria-hidden="true">
        <div
          className="upload-progress__fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="upload-progress__message">{message}</p>
      <span className="upload-progress__percent">{Math.round(progress)}%</span>
    </div>
  )
}

UploadProgress.propTypes = {
  progress: PropTypes.number,
  message: PropTypes.string,
}
```

**Créer :** `src/components/ui/upload-progress/UploadProgress.scss`

```scss
// src/components/ui/upload-progress/UploadProgress.scss
.upload-progress {
  padding: 1rem;
  text-align: center;
  background: var(--pastel-blue-lightest);
  border-radius: 8px;

  &__bar {
    width: 100%;
    height: 8px;
    background-color: var(--pastel-blue-light);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pastel-blue), var(--pastel-green));
    transition: width 0.3s ease; // Animation douce (TSA-friendly)
    border-radius: 4px;
  }

  &__message {
    font-size: 0.875rem;
    color: var(--text-dark);
    margin: 0 0 0.25rem 0;
    font-weight: 500;
  }

  &__percent {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
  }
}
```

**Utiliser dans `ItemForm.jsx` :**

```jsx
// src/components/shared/forms/ItemForm.jsx
import { useState } from 'react'
import UploadProgress from '@/components/ui/upload-progress/UploadProgress'
import { modernUploadImage } from '@/utils/storage/modernUploadImage'

export default function ItemForm({ onSubmit, type = 'task' }) {
  const [uploadProgress, setUploadProgress] = useState(null)

  const handleFileSelect = async file => {
    // Afficher progress
    setUploadProgress({ progress: 0, message: "Validation de l'image..." })

    try {
      const result = await modernUploadImage(file, {
        userId: user.id,
        assetType: type === 'task' ? 'task_image' : 'reward_image',
        prefix: type === 'task' ? 'taches' : 'recompenses',
        onProgress: state => {
          const messages = {
            validation: 'Vérification...',
            heic_conversion: 'Conversion iPhone...',
            compression: 'Optimisation...',
            hash: 'Vérification doublons...',
            quota: 'Vérification quota...',
            upload: 'Envoi...',
            upload_retry: state.message || 'Connexion lente, réessai...',
            database: 'Finalisation...',
            complete: 'Terminé !',
          }

          setUploadProgress({
            progress: state.progress,
            message: messages[state.step] || 'Traitement...',
          })
        },
      })

      if (result.error) {
        throw result.error
      }

      // Success → fermer progress
      setUploadProgress(null)
      onSubmit(result)
    } catch (error) {
      setUploadProgress(null)
      // Afficher erreur via toast
    }
  }

  return (
    <div className="item-form">
      {uploadProgress && (
        <UploadProgress
          progress={uploadProgress.progress}
          message={uploadProgress.message}
        />
      )}

      {/* ... reste du form */}
    </div>
  )
}
```

**✅ Résultat attendu :**

- Progress bar TSA-friendly (couleurs pastel, animation douce)
- Messages contextuels clairs
- Accessibilité (role, aria-live)

---

## ÉTAPE A6 : MIGRATION & MONITORING (2-3h)

### A6.1 - Script migration images existantes

**🎯 Objectif :** Migrer anciennes images (ajouter hash, dimensions, migrated_at)

**📝 Action :**

**Créer :** `scripts/migrate-existing-images.js`

```javascript
// scripts/migrate-existing-images.js
// Migration images existantes vers nouveau système (hash SHA-256 + dimensions)

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BATCH_SIZE = 10
const PAUSE_MS = 2000

// Rapport migration
const report = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
}

async function migrateImages(dryRun = true, limit = null) {
  console.log(`\n🚀 Migration images vers nouveau système`)
  console.log(`Mode : ${dryRun ? '🧪 DRY RUN (test)' : '🔴 LIVE (production)'}`)

  // Récupérer assets sans hash (= anciennes images)
  let query = supabase.from('user_assets').select('*').is('sha256_hash', null)

  if (limit) {
    query = query.limit(limit)
    console.log(`Limite : ${limit} images`)
  }

  const { data: assets, error } = await query

  if (error) {
    console.error('❌ Erreur récupération assets:', error)
    return
  }

  report.total = assets.length
  console.log(`📦 ${assets.length} images à migrer\n`)

  // Migration par batch
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(assets.length / BATCH_SIZE)

    console.log(
      `\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)`
    )
    console.log('─'.repeat(60))

    for (const asset of batch) {
      try {
        // Télécharger fichier
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('images')
          .download(asset.file_path)

        if (downloadError || !fileData) {
          throw new Error(`Téléchargement échoué: ${downloadError?.message}`)
        }

        // Calculer hash SHA-256
        const arrayBuffer = await fileData.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hash = hashArray
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Extraire dimensions (si image bitmap)
        let width = null
        let height = null

        if (
          asset.mime_type?.startsWith('image/') &&
          asset.mime_type !== 'image/svg+xml'
        ) {
          try {
            const bitmap = await createImageBitmap(fileData)
            width = bitmap.width
            height = bitmap.height
            bitmap.close()
          } catch (e) {
            console.warn(`  ⚠️ Dimensions non extraites (${asset.mime_type})`)
          }
        }

        if (!dryRun) {
          // Mise à jour BDD
          const { error: updateError } = await supabase
            .from('user_assets')
            .update({
              sha256_hash: hash,
              width,
              height,
              migrated_at: new Date().toISOString(),
            })
            .eq('id', asset.id)

          if (updateError) {
            throw new Error(`Update BDD échoué: ${updateError.message}`)
          }
        }

        const dimensionsStr = width && height ? `${width}×${height}` : 'N/A'

        console.log(
          `  ✅ ${asset.file_path.slice(-40)} (${dimensionsStr}, hash: ${hash.slice(0, 8)}...)`
        )

        report.success++
      } catch (error) {
        console.error(`  ❌ ${asset.file_path.slice(-40)} :`, error.message)

        report.failed++
        report.errors.push({
          assetId: asset.id,
          filePath: asset.file_path,
          error: error.message,
        })
      }
    }

    // Pause entre batches
    if (i + BATCH_SIZE < assets.length) {
      console.log(`\n⏸️  Pause ${PAUSE_MS}ms...`)
      await new Promise(resolve => setTimeout(resolve, PAUSE_MS))
    }
  }

  // Rapport final
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RAPPORT DE MIGRATION')
  console.log('═'.repeat(60))
  console.log(`Total     : ${report.total}`)
  console.log(`✅ Succès : ${report.success}`)
  console.log(`❌ Échecs : ${report.failed}`)

  if (report.errors.length > 0) {
    const errorLog = `migration-errors-${Date.now()}.json`
    fs.writeFileSync(errorLog, JSON.stringify(report.errors, null, 2))
    console.log(`\n⚠️  Erreurs détaillées → ${errorLog}`)
  }

  if (dryRun) {
    console.log('\n🧪 DRY RUN terminé - AUCUNE modification appliquée')
    console.log('💡 Exécutez avec --live pour migration réelle')
  } else {
    console.log('\n🎉 Migration terminée !')
  }
}

// CLI
const args = process.argv.slice(2)
const dryRun = !args.includes('--live')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

migrateImages(dryRun, limit).catch(console.error)
```

**Usage :**

```bash
# 1. Test sur 10 images (DRY RUN)
node scripts/migrate-existing-images.js --limit=10

# 2. Test sur 100 images (DRY RUN)
node scripts/migrate-existing-images.js --limit=100

# 3. Si OK → migration LIVE complète
node scripts/migrate-existing-images.js --live
```

**✅ Résultat attendu :**

- Migration sécurisée (dry-run par défaut)
- Rapport JSON des erreurs
- Batch 10 + pause 2s

---

### A6.2 - Dashboard admin analytics

**🎯 Objectif :** Visualiser stats uploads (compression, erreurs)

**📝 Action :**

**Créer :** `src/components/features/admin/ImageAnalytics.jsx`

```jsx
// src/components/features/admin/ImageAnalytics.jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import './ImageAnalytics.scss'

export default function ImageAnalytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase.rpc('get_image_analytics_summary')

      if (error) {
        console.error('Erreur stats:', error)
      } else {
        setStats(data)
      }

      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return <p>Chargement statistiques...</p>
  }

  if (!stats) {
    return <p>Erreur chargement statistiques</p>
  }

  return (
    <div className="image-analytics">
      <h2>Statistiques images (7 derniers jours)</h2>

      <div className="image-analytics__grid">
        <div className="stat-card">
          <h3>Uploads totaux</h3>
          <p className="stat-card__value">{stats.total_uploads}</p>
        </div>

        <div className="stat-card stat-card--success">
          <h3>Succès</h3>
          <p className="stat-card__value">{stats.success_count}</p>
        </div>

        <div className="stat-card stat-card--error">
          <h3>Échecs</h3>
          <p className="stat-card__value">{stats.failed_count}</p>
        </div>

        <div className="stat-card">
          <h3>Compression moyenne</h3>
          <p className="stat-card__value">{stats.avg_compression_ratio}%</p>
        </div>

        <div className="stat-card">
          <h3>Temps conversion</h3>
          <p className="stat-card__value">{stats.avg_conversion_ms} ms</p>
        </div>

        <div className="stat-card">
          <h3>Temps upload</h3>
          <p className="stat-card__value">{stats.avg_upload_ms} ms</p>
        </div>

        <div className="stat-card stat-card--highlight">
          <h3>Stockage économisé</h3>
          <p className="stat-card__value">{stats.total_storage_saved_mb} MB</p>
        </div>
      </div>
    </div>
  )
}
```

**Créer :** `src/components/features/admin/ImageAnalytics.scss`

```scss
// src/components/features/admin/ImageAnalytics.scss
.image-analytics {
  padding: 2rem;

  h2 {
    margin-bottom: 1.5rem;
    color: var(--text-dark);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
}

.stat-card {
  background: var(--white);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  h3 {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-dark);
    margin: 0;
  }

  &--success {
    border-left: 4px solid var(--pastel-green);
  }

  &--error {
    border-left: 4px solid var(--pastel-red);
  }

  &--highlight {
    background: linear-gradient(
      135deg,
      var(--pastel-blue-light),
      var(--pastel-green-light)
    );
  }
}
```

**✅ Résultat attendu :**

- Dashboard analytics admin fonctionnel
- Stats temps réel (7 derniers jours)

---

## ÉTAPE A7 : TESTS & VALIDATION (2-3h)

### A7.1 - Tests E2E upload workflow

**🎯 Objectif :** Valider workflow complet (upload → affichage → cache)

**📝 Action :**

**Créer :** `tests/e2e/image-upload.spec.js`

```javascript
// tests/e2e/image-upload.spec.js
import { test, expect } from '@playwright/test'

test.describe('Upload image tâche (workflow complet)', () => {
  test.beforeEach(async ({ page }) => {
    // Login utilisateur test
    await page.goto('http://localhost:5173/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/tableau')
  })

  test('Upload PNG → conversion WebP → affichage', async ({ page }) => {
    await page.goto('http://localhost:5173/edition')

    // Ouvrir modal ajout tâche
    await page.click('[data-testid="add-task-button"]')

    // Upload fichier PNG (50 KB)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    // Vérifier progress indicator apparaît
    await expect(page.locator('.upload-progress')).toBeVisible()

    // Attendre fin upload (max 10s)
    await expect(page.locator('.upload-progress')).not.toBeVisible({
      timeout: 10000,
    })

    // Vérifier tâche créée avec image
    const taskCard = page.locator('[data-testid="task-card"]').first()
    await expect(taskCard).toBeVisible()

    const taskImage = taskCard.locator('img')
    await expect(taskImage).toBeVisible()

    const src = await taskImage.getAttribute('src')

    // Vérifier signed URL Supabase
    expect(src).toContain('supabase')
    expect(src).toContain('sign')
  })

  test('Upload SVG → pas de conversion', async ({ page }) => {
    await page.goto('http://localhost:5173/edition')
    await page.click('[data-testid="add-task-button"]')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/icon.svg')

    await page.waitForSelector('[data-testid="task-card"]', { timeout: 10000 })

    const taskImage = page.locator('[data-testid="task-card"] img').first()
    const src = await taskImage.getAttribute('src')

    // Vérifier extension SVG conservée
    expect(src).toContain('.svg')
  })

  test('Upload image identique → déduplication', async ({ page }) => {
    // Upload 1ère fois
    await page.goto('http://localhost:5173/edition')
    await page.click('[data-testid="add-task-button"]')

    let fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    await expect(page.locator('.upload-progress')).not.toBeVisible({
      timeout: 10000,
    })

    const firstTaskPath = await page
      .locator('[data-testid="task-card"]')
      .first()
      .getAttribute('data-image-path')

    // Upload 2ème fois (même fichier)
    await page.click('[data-testid="add-task-button"]')

    fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    await expect(page.locator('.upload-progress')).not.toBeVisible({
      timeout: 10000,
    })

    const secondTaskPath = await page
      .locator('[data-testid="task-card"]')
      .nth(1)
      .getAttribute('data-image-path')

    // Vérifier même path (déduplication)
    expect(firstTaskPath).toBe(secondTaskPath)
  })
})
```

**Créer fixtures :**

```bash
mkdir -p tests/fixtures

# Ajouter :
# - test-image.png (50 KB PNG)
# - icon.svg (2 KB SVG)
# - large-image.jpg (500 KB JPEG pour test quota)
```

**Commandes :**

```bash
yarn test:e2e
```

**✅ Résultat attendu :**

- Tests E2E passent
- Workflow complet validé

---

## ÉTAPE A8 : DOCUMENTATION & DÉPLOIEMENT (1-2h)

### A8.1 - Mise à jour CLAUDE.md

**🎯 Objectif :** Documenter nouveau système

**📝 Action :**

**Ajouter dans `CLAUDE.md` :**

````markdown
## Système d'images moderne (Phase A - Supabase Storage)

### Architecture

- **Images privées** : Supabase Storage (bucket `images`, signed URLs 24h)
- **Format** : WebP ≤ 20 KB (sauf SVG), support HEIC (iPhone)
- **Dimensions** : 192×192px (mobile-first TSA)
- **Cache** : Service Worker (TTL 1h, placeholder SVG si offline)
- **Déduplication** : SHA-256 hash (évite uploads identiques)
- **Versioning** : Incrémenté à chaque remplacement
- **Monitoring** : Table `image_metrics` (analytics compression, erreurs)

### Workflow upload (Phase A)

1. Validation MIME + magic bytes
2. Conversion HEIC → JPEG (si iPhone)
3. Conversion → WebP ≤ 20 KB (sauf SVG)
4. Calcul hash SHA-256 (déduplication)
5. Vérification quota (RPC `check_image_quota`)
6. Upload Supabase Storage (retry automatique)
7. Enregistrement `user_assets` + `image_metrics`
8. Génération signed URL (TTL 24h)
9. Cache Service Worker (affichage offline possible)

### Quotas (Phase A)

- **Free** : 5 tâches + 2 récompenses = 7 images max
- **Abonné** : 40 tâches + 10 récompenses = 50 images max
- **Admin/Staff** : Illimité
- **Stockage global** : 1 GB Supabase free tier

### Fichiers clés (Phase A)

- `src/utils/images/config.js` : Configuration globale
- `src/utils/images/heicConverter.js` : Support iPhone HEIC
- `src/utils/images/webpConverter.js` : Conversion WebP + hash
- `src/utils/images/imageValidator.js` : Validation unifiée
- `src/utils/storage/modernUploadImage.js` : Upload moderne complet
- `src/utils/upload/uploadWithRetry.js` : Retry automatique réseau
- `public/sw.js` : Service Worker cache offline
- `supabase/migrations/*_enhance_user_assets.sql` : Schema v2

### Commandes

```bash
# Migration images existantes (test)
node scripts/migrate-existing-images.js --limit=10

# Migration complète (LIVE)
node scripts/migrate-existing-images.js --live

# Tests E2E upload
yarn test:e2e tests/e2e/image-upload.spec.js
```
````

### Phase B (à venir)

- Images publiques → Cloudinary CDN
- Edge Functions (delete Cloudinary, admin)
- Backup automatique (cron hebdomadaire)

````

**✅ Résultat attendu :**
- Documentation complète à jour
- Guide migration + commandes

---

### A8.2 - Checklist pré-déploiement Phase A

**📝 Vérifications :**

```markdown
## Checklist déploiement Phase A

### Base de données
- [ ] Migration `enhance_user_assets` appliquée
- [ ] Migration `check_duplicate_image` appliquée
- [ ] Migration `image_metrics` appliquée
- [ ] Schema.sql à jour (`yarn db:dump`)
- [ ] RPC functions testées

### Frontend
- [ ] Package `heic2any` installé
- [ ] Tests unitaires passent (`yarn test`)
- [ ] Tests E2E passent (`yarn test:e2e`)
- [ ] Lint + format OK (`yarn check`)
- [ ] Build production OK (`yarn build`)

### Service Worker
- [ ] SW testé en local (`yarn preview`)
- [ ] Cache fonctionne (DevTools → Application → Cache Storage)
- [ ] Placeholder SVG affiché si offline

### Migration
- [ ] Script testé sur 10 images (dry-run)
- [ ] Script testé sur 100 images (dry-run)
- [ ] Rapport erreurs analysé
- [ ] Migration LIVE planifiée

### Monitoring
- [ ] Dashboard admin accessible
- [ ] Metrics `image_metrics` loggées
- [ ] Alertes quotas testées

### Documentation
- [ ] CLAUDE.md mis à jour
- [ ] README.md mis à jour (si nécessaire)
- [ ] Changelog créé
````

**✅ Résultat attendu :**

- Phase A prête au déploiement
- Tous les tests passent
- Documentation complète

---

# 📦 PHASE B : IMAGES PUBLIQUES CLOUDINARY (OPTIONNEL)

**Priorité :** 🟡 **APRÈS Phase A stabilisée**
**Temps estimé :** 7-8 heures
**Objectif :** Extension pour images publiques partagées (cas rare : ~1% des images)

**Note :** Cette phase sera implémentée **APRÈS** la Phase A complète et testée en production.

---

## ÉTAPE B1 : Configuration Cloudinary (1h)

### B1.1 - Création compte + configuration

**📝 Actions :**

1. Créer compte Cloudinary gratuit : https://cloudinary.com/users/register_free
2. Créer upload preset `appli-picto-public` :
   - Mode : `unsigned`
   - Transformations : `f_auto,q_auto:eco,w_192,h_192,c_fill`
   - Strip metadata : `true`

3. Ajouter variables `.env` :

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=appli-picto-public
VITE_CLOUDINARY_API_KEY=your_api_key
```

4. Ajouter variables `supabase/.env` (Edge Functions) :

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## ÉTAPE B2 : Migration BDD Cloudinary (30 min)

### B2.1 - Ajouter colonnes Cloudinary

**Créer :** `supabase/migrations/20251024000001_add_cloudinary_support.sql`

```sql
-- Ajout support Cloudinary dans user_assets

ALTER TABLE public.user_assets
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ADD COLUMN IF NOT EXISTS cloudinary_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_user_assets_cloudinary
  ON public.user_assets(cloudinary_public_id)
  WHERE cloudinary_public_id IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN public.user_assets.cloudinary_public_id IS
  'Public ID Cloudinary (si image publique partagée)';
COMMENT ON COLUMN public.user_assets.cloudinary_url IS
  'URL Cloudinary optimisée (si image publique)';
COMMENT ON COLUMN public.user_assets.is_public IS
  'true = Cloudinary (public), false = Supabase Storage (privé)';
```

---

## ÉTAPE B3 : Service upload Cloudinary (2h)

### B3.1 - Créer service upload Cloudinary

**Créer :** `src/utils/cloudinary/uploadToCloudinary.js`

```javascript
// src/utils/cloudinary/uploadToCloudinary.js
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from '@/utils/images/config'

export async function uploadToCloudinary(file, options = {}) {
  const { folder = 'pictos-public', tags = ['appli-picto'] } = options

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary non configuré')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', folder)
  formData.append('tags', tags.join(','))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error?.message || 'Upload Cloudinary échoué')
  }

  const data = await response.json()

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
    format: data.format,
  }
}
```

---

## ÉTAPE B4 : Edge Function delete Cloudinary (2h)

### B4.1 - Créer fonction sécurisée

**Créer :** `supabase/functions/cloudinary-delete/index.ts`

```typescript
// supabase/functions/cloudinary-delete/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async req => {
  const { publicId, userId } = await req.json()

  // Vérifier ownership
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: asset } = await supabaseClient
    .from('user_assets')
    .select('id')
    .eq('cloudinary_public_id', publicId)
    .eq('user_id', userId)
    .single()

  if (!asset) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
    })
  }

  // Supprimer sur Cloudinary (avec API secret)
  const timestamp = Math.round(Date.now() / 1000)
  const signature = await generateSignature(publicId, timestamp)

  const formData = new FormData()
  formData.append('public_id', publicId)
  formData.append('signature', signature)
  formData.append('api_key', Deno.env.get('CLOUDINARY_API_KEY')!)
  formData.append('timestamp', timestamp.toString())

  await fetch(
    `https://api.cloudinary.com/v1_1/${Deno.env.get('CLOUDINARY_CLOUD_NAME')}/image/destroy`,
    { method: 'POST', body: formData }
  )

  // Soft delete BDD
  await supabaseClient
    .from('user_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('cloudinary_public_id', publicId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function generateSignature(
  publicId: string,
  timestamp: number
): Promise<string> {
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${Deno.env.get('CLOUDINARY_API_SECRET')}`
  const encoder = new TextEncoder()
  const data = encoder.encode(stringToSign)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

**Déployer :**

```bash
supabase functions deploy cloudinary-delete --no-verify-jwt
```

---

## ÉTAPE B5 : Intégration modernUploadImage (1h)

### B5.1 - Étendre pour support Cloudinary

**Modifier :** `src/utils/storage/modernUploadImage.js` (ajouter option `isPublic`)

```javascript
// Dans modernUploadImage()
const {
  userId,
  assetType = 'task_image',
  prefix = 'misc',
  isPublic = false, // 🆕 true → Cloudinary, false → Supabase
  onProgress = null,
} = options

// ... après compression WebP

if (isPublic) {
  // Upload vers Cloudinary
  const uploadResult = await uploadToCloudinary(processedFile, {
    folder: 'pictos-public',
    tags: ['appli-picto', assetType],
  })

  // Enregistrer dans user_assets
  const { data: asset, error: dbError } = await supabase
    .from('user_assets')
    .insert({
      user_id: userId,
      asset_type: assetType,
      file_path: uploadResult.publicId,
      cloudinary_public_id: uploadResult.publicId,
      cloudinary_url: uploadResult.url,
      file_size: uploadResult.bytes,
      mime_type: `image/${uploadResult.format}`,
      width,
      height,
      sha256_hash: fileHash,
      is_public: true,
      version: 1,
    })
    .select('id')
    .single()

  if (dbError) throw dbError

  return {
    path: uploadResult.publicId,
    url: uploadResult.url,
    assetId: asset.id,
    width,
    height,
    error: null,
  }
} else {
  // Upload vers Supabase (code existant Phase A)
  // ...
}
```

---

## ÉTAPE B6 : Tests & documentation (1h)

### B6.1 - Tests Cloudinary

**Créer :** `tests/e2e/cloudinary-upload.spec.js`

```javascript
// tests/e2e/cloudinary-upload.spec.js
import { test, expect } from '@playwright/test'

test.describe('Upload Cloudinary (public)', () => {
  test('Upload image publique → Cloudinary', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/pictos-publics')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/test-image.png')

    await page.waitForSelector('[data-testid="picto-card"]', { timeout: 10000 })

    const pictoImage = page.locator('[data-testid="picto-card"] img').first()
    const src = await pictoImage.getAttribute('src')

    // Vérifier URL Cloudinary
    expect(src).toContain('cloudinary.com')
    expect(src).toContain('res.cloudinary.com')
  })
})
```

### B6.2 - Documentation Phase B

**Ajouter dans `CLAUDE.md` :**

```markdown
## Phase B : Images publiques Cloudinary (optionnel)

### Architecture

- **Images publiques partagées** : Cloudinary CDN (cache 1 an)
- **Use case** : Bibliothèque pictos partagés (rare, ~1% des images)
- **Transformations** : `f_auto,q_auto:eco,w_192,h_192,c_fill`

### Workflow upload public

1-4. Identique Phase A (validation, HEIC, WebP, hash) 5. Vérification quota 6. **Upload Cloudinary** (au lieu de Supabase) 7. Enregistrement `user_assets` (is_public=true) 8. URL Cloudinary retournée directement (pas de signed URL)

### Fichiers clés Phase B

- `src/utils/cloudinary/uploadToCloudinary.js` : Upload public
- `supabase/functions/cloudinary-delete/index.ts` : Delete sécurisé
- `src/utils/storage/modernUploadImage.js` : Support `isPublic` option
```

---

# 📊 RÉSUMÉ EXÉCUTIF

## Temps total par phase

| Phase       | Description                             | Temps estimé |
| ----------- | --------------------------------------- | ------------ |
| **Phase A** | Images privées Supabase (complet)       | **18-22h**   |
| **Phase B** | Images publiques Cloudinary (optionnel) | **7-8h**     |
| **TOTAL**   | Système complet                         | **25-30h**   |

## Ordre d'exécution recommandé

### 🔴 PRIORITÉ 1 : Phase A complète (18-22h)

1. **A1** - BDD (2-3h) : Migrations + RPC + metrics
2. **A2** - Frontend utils (3-4h) : HEIC + WebP + validation
3. **A3** - Upload service (4-5h) : Pipeline complet + retry
4. **A4** - Service Worker (3-4h) : Cache offline + placeholder
5. **A5** - Intégration (2-3h) : Hooks + composants
6. **A6** - Migration (2-3h) : Script + monitoring
7. **A7** - Tests (2-3h) : E2E + validation
8. **A8** - Docs (1-2h) : CLAUDE.md + checklist

### 🟡 PRIORITÉ 2 : Phase B (APRÈS Phase A stabilisée)

9. **B1-B6** - Cloudinary (7-8h) : Extension images publiques

---

## Prochaine étape

**🚀 Commencer par ÉTAPE A1.1 : Migration BDD `enhance_user_assets`**

**Question :** Es-tu prêt à démarrer l'implémentation de l'étape A1.1 ? Je vais te guider pas à pas pour chaque étape. 🎯
