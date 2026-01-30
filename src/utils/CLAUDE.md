# CLAUDE.md - Utilitaires

Guide patterns utilitaires pour **Appli-Picto** - Application Next.js 16 pour enfants autistes et professionnels TSA.

## 🎯 Vue d'Ensemble

Ce dossier contient **23 fichiers utilitaires** organisés en **6 sous-dossiers thématiques** :
- **Racine** (9 fichiers) : Supabase client, validation, RGPD, permissions
- **images/** (7 fichiers) : Validation, compression, conversion formats
- **storage/** (5 fichiers) : Upload Supabase Storage, signed URLs, cache
- **auth/** : Helpers authentification
- **logs/** : Logging et monitoring
- **serviceWorker/** : Service worker PWA

**Principe fondamental** : Utilitaires **purs et réutilisables** sans logique métier.

---

## 🚨 RÈGLE ABSOLUE - Instance Unique Supabase

**CRITIQUE** : ❌ **JAMAIS** créer nouvelle instance Supabase client

**Fichier** : `src/utils/supabaseClient.ts` (238 lignes)

### Pattern Obligatoire

```typescript
// ✅ CORRECT - Import instance unique
import { supabase } from '@/utils/supabaseClient'

async function fetchTaches() {
  const { data, error } = await supabase
    .from('taches')
    .select('*')

  return data
}
```

```typescript
// ❌ INTERDIT - Créer nouvelle instance
import { createClient } from '@supabase/supabase-js'

const mySupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// NE JAMAIS FAIRE ça !
```

### Pourquoi CRITIQUE

- ✅ **Session unique** : Gère session auth globalement (pas de désynchronisation)
- ✅ **Performance** : Une seule connexion réutilisée (pool connections optimisé)
- ✅ **Sécurité** : Configuration centralisée (timeout, retry, SSR-safe)
- ✅ **Maintenance** : Modifier config = un seul fichier

### Fonctionnalités supabaseClient.ts

**recreateSupabaseClient()**

```typescript
import { recreateSupabaseClient } from '@/utils/supabaseClient'

// Restaurer session depuis localStorage après navigation
useEffect(() => {
  recreateSupabaseClient() // Restore session si existe
}, [])
```

**Configuration** :
- **Timeout** : 15s dev, 5s production
- **Storage key** : `sb-${projectRef}-auth-token`
- **SSR-safe** : Vérifie `typeof window !== 'undefined'`
- **Retry** : Gestion automatique retries réseau

---

## 📸 Images - Validation, Compression, Upload

**Dossier** : `src/utils/images/` (7 fichiers)

### Configuration (config.ts)

**Constantes CRITIQUES** :

```typescript
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  TARGET_MAX_UI_SIZE_KB,
  TARGET_DIMENSION,
  PRIVATE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from '@/utils/images/config'

// Formats autorisés
ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',      // Normalisé automatiquement → image/jpeg
  'image/webp',
  'image/svg+xml',
  'image/heic',     // iPhone iOS 11+
  'image/heif',     // Variante HEIF
]

// Limites taille
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  // 10 Mo (upload Storage)
TARGET_MAX_UI_SIZE_KB = 20           // 20 Ko (cible compression UI)
FALLBACK_MAX_UI_SIZE_KB = 30         // 30 Ko (fallback si 20 Ko impossible)

// Dimensions
TARGET_DIMENSION = 192               // 192×192px (mobile-first TSA)

// Buckets
PRIVATE_BUCKET = 'images'            // Bucket images privées utilisateurs
DEMO_PUBLIC_BUCKET = 'demo-images'  // Bucket démo admin

// Signed URLs TTL
SIGNED_URL_TTL_SECONDS = 24 * 60 * 60  // 24h
```

**Règles** :
- ✅ **TOUJOURS** utiliser constantes config (jamais hardcode)
- ✅ **TOUJOURS** compresser images avant upload (`compressImageIfNeeded`)
- ✅ Valider MIME type ET magic bytes (sécurité)
- ❌ **JAMAIS** upload > 10 Mo (rejeté Storage)

---

### Validation Images (validationRules.ts)

**Fonctions validation** :

```typescript
import {
  validateImagePresence,
  validateImageType,
  validateImageHeader,
  compressImageIfNeeded,
} from '@/utils/validationRules'

// 1. Vérifier présence
const errorPresence = validateImagePresence(file)
if (errorPresence) {
  console.error(errorPresence) // "Choisis une image (PNG, JPEG/JPG, SVG, WEBP ≤ 100 Ko)"
  return
}

// 2. Vérifier MIME type
const errorType = validateImageType(file)
if (errorType) {
  console.error(errorType) // "Format non supporté..."
  return
}

// 3. Vérifier magic bytes (sécurité - détecte faux MIME types)
const errorHeader = await validateImageHeader(file)
if (errorHeader) {
  console.error(errorHeader) // "Fichier image corrompu ou invalide."
  return
}

// 4. Compression automatique
const compressed = await compressImageIfNeeded(file, TARGET_MAX_UI_SIZE_KB)
if (!compressed) {
  console.error('Impossible de compresser cette image sous 20 Ko.')
  return
}

// ✅ OK - Prêt pour upload
```

**Magic Bytes vérifiés** :
- **PNG** : `89 50 4E 47 0D 0A 1A 0A`
- **JPEG** : `FF D8`
- **WEBP** : `RIFF .... WEBP`
- **SVG** : Type-based uniquement (textuel)
- **HEIC/HEIF** : Type-based (magic bytes complexes)

---

### Compression Progressive (compressImageIfNeeded)

**Pattern compression** : 7 stratégies progressives jusqu'à atteindre cible

```typescript
import { compressImageIfNeeded } from '@/utils/validationRules'

const file = /* File from input */
const compressed = await compressImageIfNeeded(file, 20) // Cible 20 Ko

if (!compressed) {
  // Échec compression (image trop complexe)
  showToast('Impossible de compresser sous 20 Ko. Essayez une image plus simple.', 'error')
  return
}

// ✅ compressed : File compressée ≤ 20 Ko
```

**Stratégies compression** :
1. **256×256 qualité 0.9 JPEG** (haute qualité)
2. **256×256 qualité 0.7 JPEG** (qualité moyenne)
3. **256×256 qualité 0.5 JPEG** (qualité basse)
4. **192×192 qualité 0.7 JPEG** (dimensions réduites)
5. **192×192 qualité 0.5 JPEG**
6. **128×128 qualité 0.4 JPEG** (très petites dimensions)
7. **128×128 PNG** (dernier recours, sans perte)

**Optimisations** :
- ✅ **SVG** : Retourné tel quel (déjà optimisé)
- ✅ **Si ≤ cible** : Retourné tel quel (pas de recompression)
- ✅ **Canvas** : Dessin optimisé (clearRect avant drawImage)
- ✅ **Nom fichier** : Extension adaptée (.jpg ou .png)

**Règles** :
- ✅ **TOUJOURS** compresser avant upload Storage
- ✅ Gérer échec compression (null retourné)
- ❌ **JAMAIS** upload image non compressée (gaspillage stockage)

---

### Conversion Formats

**HEIC → JPEG** (`heicConverter.ts`)

```typescript
import { convertHeicToJpeg } from '@/utils/images/heicConverter'

// Convertir HEIC iPhone en JPEG
const jpegBlob = await convertHeicToJpeg(heicFile)
const jpegFile = new File([jpegBlob], 'converted.jpg', { type: 'image/jpeg' })

// ✅ jpegFile : Prêt pour compression + upload
```

**WEBP → JPEG/PNG** (`webpConverter.ts`)

```typescript
import { convertWebpToJpeg, convertWebpToPng } from '@/utils/images/webpConverter'

// Convertir WEBP en JPEG (qualité 0.9)
const jpegBlob = await convertWebpToJpeg(webpFile, 0.9)

// Ou PNG (sans perte)
const pngBlob = await convertWebpToPng(webpFile)
```

**Règles** :
- ✅ Utiliser pour compatibilité navigateurs anciens
- ✅ Toujours compresser après conversion
- ❌ Éviter conversions multiples (perte qualité)

---

## 📦 Supabase Storage - Upload, Signed URLs, Cache

**Dossier** : `src/utils/storage/` (5 fichiers)

### Upload Images (uploadImage.ts)

**Pattern upload complet** :

```typescript
import { uploadImage } from '@/utils/storage/uploadImage'
import type { UploadOptions, UploadResult } from '@/utils/storage/uploadImage'

async function handleUpload(file: File, userId: string) {
  // 1. Validation + compression (voir section Images)
  const compressed = await compressImageIfNeeded(file, TARGET_MAX_UI_SIZE_KB)
  if (!compressed) {
    showToast('Compression impossible', 'error')
    return
  }

  // 2. Upload vers Storage
  const result: UploadResult = await uploadImage(compressed, {
    userId,                     // Requis (scoping par user)
    bucket: 'images',           // Défaut 'images'
    prefix: 'taches',           // Préfixe (taches, recompenses, misc)
    upsert: false,              // false = erreur si existe déjà
    sign: true,                 // true = retourne signed URL immédiatement
    expiresIn: 3600,            // TTL signed URL (1h)
  })

  if (result.error) {
    console.error('Erreur upload:', result.error)
    showToast('Échec upload', 'error')
    return
  }

  // ✅ Upload réussi
  console.log('Path Storage:', result.path)    // "user123/taches/2026/01/27/1738012345-abc123-image.jpg"
  console.log('Signed URL:', result.url)       // "https://xxx.supabase.co/storage/v1/object/sign/..."

  return { path: result.path, url: result.url }
}
```

**Fonctions utilitaires** :

```typescript
import { sanitizeFileName, buildScopedPath } from '@/utils/storage/uploadImage'

// Sanitize nom fichier (ASCII + tirets uniquement)
const safe = sanitizeFileName('Mon Image 2024 (v2).jpg')
// → "mon-image-2024-v2.jpg"

// Construire chemin scoped avec timestamp + random
const path = buildScopedPath('user-abc123', 'image.jpg', 'taches')
// → "user-abc123/taches/2026/01/27/1738012345-x3k9z2-image.jpg"
```

**Structure chemin Storage** :
```
{userId}/{prefix}/{YYYY}/{MM}/{DD}/{timestamp}-{random}-{sanitizedFileName}

Exemple:
user-abc123/taches/2026/01/27/1738012345-x3k9z2-mon-image.jpg
```

**Règles** :
- ✅ **TOUJOURS** compresser avant `uploadImage()`
- ✅ **TOUJOURS** scoping par userId (sécurité RLS)
- ✅ Vérifier `result.error` avant utiliser `result.path/url`
- ❌ **JAMAIS** upload sans userId (rejeté)

---

### Signed URLs avec Cache (getSignedUrl.ts)

**Pattern signed URLs** :

```typescript
import { getSignedImageUrl, invalidateSignedImageUrl } from '@/utils/storage/getSignedUrl'
import type { SignedUrlResult } from '@/utils/storage/getSignedUrl'

async function loadImage(path: string) {
  const result: SignedUrlResult = await getSignedImageUrl(path, {
    bucket: 'images',        // Défaut 'images'
    expiresIn: 3600,         // TTL 1h (défaut 3600s)
    forceRefresh: false,     // false = utilise cache si valide
  })

  if (result.error) {
    console.error('Erreur signed URL:', result.error)
    return null
  }

  return result.url // URL signée valide
}
```

**Cache automatique** :
- **Clé** : `${bucket}/${path}` (ex: `images/user123/taches/2026/01/27/...`)
- **TTL** : `expiresIn - 30s` (marge sécurité)
- **Stockage** : Map en mémoire (vidée au refresh page)
- **Hit cache** : Si non expiré et pas `forceRefresh`

**Invalidation cache** :

```typescript
import { invalidateSignedImageUrl } from '@/utils/storage/getSignedUrl'

// Après remplacement image, invalider cache
await replaceImageIfAny(oldPath, newFile, userId, prefix)
invalidateSignedImageUrl(oldPath, 'images') // Purge cache
```

**WORKAROUND Bucket Avatars** :
- Bucket `avatars` : Utilise `download()` au lieu `createSignedUrl()` (bug SDK)
- Crée Object URL locale via `URL.createObjectURL(blob)`
- Cache 24h (pas d'expiration réelle Object URLs)

**Timeout Protection** :
- Timeout 5s pour `createSignedUrl()` (évite hanging)
- `Promise.race([signedUrlPromise, timeoutPromise])`

**Règles** :
- ✅ **TOUJOURS** utiliser `getSignedImageUrl()` pour images privées
- ✅ Invalider cache après `replaceImageIfAny()` ou `deleteImageIfAny()`
- ✅ Gérer `result.error` (timeout, 404, permissions)
- ❌ **JAMAIS** URL publique pour bucket privé (signed URLs requis)

---

### Autres Helpers Storage

**deleteImageIfAny()**

```typescript
import { deleteImageIfAny } from '@/utils/storage/deleteImageIfAny'

// Supprimer image si path fourni (safe si null)
const deleted = await deleteImageIfAny('user123/taches/2026/01/27/image.jpg', 'images')
if (deleted) {
  console.log('Image supprimée')
}
```

**replaceImageIfAny()**

```typescript
import { replaceImageIfAny } from '@/utils/storage/replaceImageIfAny'

// Remplacer image existante par nouvelle
const result = await replaceImageIfAny(
  oldPath,         // Path existant (supprimé si fourni)
  newFile,         // Nouveau fichier (uploadé)
  userId,
  'taches'
)

if (result.error) {
  console.error('Erreur remplacement:', result.error)
  return
}

console.log('Nouveau path:', result.path)
console.log('Signed URL:', result.url)
```

**modernUploadImage()**

```typescript
import { modernUploadImage } from '@/utils/storage/modernUploadImage'

// Upload moderne avec options avancées (retry, progress)
const result = await modernUploadImage(file, {
  userId,
  bucket: 'images',
  prefix: 'taches',
  onProgress: (percent) => {
    console.log(`Upload ${percent}%`)
  },
})
```

---

## ✅ Validation Rules - Tous Patterns

**Fichier** : `src/utils/validationRules.ts` (530 lignes)

### Texte Générique

```typescript
import {
  validateNotEmpty,
  noEdgeSpaces,
  noDoubleSpaces,
  normalizeSpaces,
  validatePseudo,
} from '@/utils/validationRules'

// Validation nom/label
const error1 = validateNotEmpty(nom)       // "Le nom est requis"
const error2 = noEdgeSpaces(nom)           // "Pas d'espace en début/fin"
const error3 = noDoubleSpaces(nom)         // "Pas de doubles espaces"

// Normalisation avant enregistrement
const clean = normalizeSpaces(nom)         // Supprime espaces doublons et bords

// Validation pseudo utilisateur
const errorPseudo = validatePseudo(pseudo) // Max 30 chars
```

**Version i18n** :

```typescript
import { makeValidateNotEmpty, makeNoEdgeSpaces } from '@/utils/validationRules'
import { useI18n } from '@/hooks'

function Form() {
  const { t } = useI18n()

  const validateNotEmpty = makeValidateNotEmpty(t)
  const noEdgeSpaces = makeNoEdgeSpaces(t)

  const error = validateNotEmpty(value) // Message traduit
}
```

---

### Email

```typescript
import { validateEmail, normalizeEmail } from '@/utils/validationRules'

// Validation email
const error = validateEmail(email)
// Retourne: "L'e-mail est requis." | "L'e-mail ne doit pas contenir d'espace." | "Format d'e-mail invalide." | ""

// Normalisation (trim + lowercase)
const clean = normalizeEmail('  User@Example.COM  ')
// → "user@example.com"
```

**Regex utilisé** : `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`

---

### Mot de Passe

```typescript
import {
  validatePasswordStrength,
  validatePasswordNotEmpty,
  PASSWORD_MIN,
  makeMatchRule,
} from '@/utils/validationRules'

// Validation force (signup)
const error = validatePasswordStrength(password)
// Vérifie:
// - Min 10 caractères (PASSWORD_MIN)
// - Au moins 1 minuscule
// - Au moins 1 majuscule
// - Au moins 1 chiffre
// - Au moins 1 symbole
// - Pas d'espace

// Validation simple (login - pas de complexité)
const errorLogin = validatePasswordNotEmpty(password)

// Vérifier correspondance (confirmer mot de passe)
const matchPassword = makeMatchRule(
  () => password,
  'Les mots de passe ne correspondent pas.'
)
const errorMatch = matchPassword(confirmPassword)
```

**Règles Supabase** :
- ✅ Min 10 caractères (aligné config Supabase Auth)
- ✅ 1 minuscule + 1 majuscule + 1 chiffre + 1 symbole
- ❌ Pas d'espace

---

### Rôles (Admin)

```typescript
import {
  validateRoleName,
  validateRoleDisplayName,
  validateRoleDescription,
  validateRoleNameUniqueness,
  createRoleValidationRules,
} from '@/utils/validationRules'

// Validation nom technique (slug)
const error1 = validateRoleName('admin-premium')
// OK: "admin-premium" (a-z, 0-9, tirets, underscores)
// Erreur: "Admin Premium" (majuscules interdites)

// Validation nom affichage
const error2 = validateRoleDisplayName('Admin Premium')
// OK: "Admin Premium" (min 3, max 50 chars)

// Vérifier unicité
const error3 = validateRoleNameUniqueness('admin', existingRoles, currentRoleId)
// "Ce nom de rôle existe déjà."

// Règles combinées création
const nameErrors = createRoleValidationRules.name('admin', existingRoles)
// Retourne tableau: [error1, error2, ...] filtrés
```

---

### Features (Admin)

```typescript
import {
  validateFeatureName,
  validateFeatureDisplayName,
  validateFeatureDescription,
  validateFeatureNameUniqueness,
  createFeatureValidationRules,
} from '@/utils/validationRules'

// Validation nom technique
const error1 = validateFeatureName('create-tasks')
// OK: "create-tasks" (a-z, 0-9, tirets, underscores)

// Validation nom affichage
const error2 = validateFeatureDisplayName('Créer des tâches')
// OK: "Créer des tâches" (min 3, max 100 chars)

// Description (optionnelle, max 500 chars)
const error3 = validateFeatureDescription(description)

// Vérifier unicité
const error4 = validateFeatureNameUniqueness('create-tasks', existingFeatures, currentId)
```

---

## 🍪 RGPD / Consent Management

**Fichier** : `src/utils/consent.ts` (272 lignes)

### Configuration

```typescript
CONSENT_KEY = 'cookie_consent_v2'
CONSENT_VERSION = '1.0.0'
EXPIRY_DAYS = 180 // 6 mois
```

**Types** :

```typescript
type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

interface ConsentChoices {
  necessary: boolean   // Toujours true (requis)
  analytics: boolean
  marketing: boolean
}

interface ConsentRecord {
  version: string      // "1.0.0"
  ts: string           // ISO timestamp
  mode: string         // "accept-all" | "reject-all" | "custom"
  choices: ConsentChoices
}
```

---

### Fonctions Principales

**Lire consentement** :

```typescript
import { getConsent, hasConsent, getConsentStatus } from '@/utils/consent'

// Récupérer record complet
const consent = getConsent() // ConsentRecord | null
if (!consent) {
  // Pas de consentement enregistré
}

// Vérifier catégorie spécifique
const canTrack = hasConsent('analytics') // boolean
if (canTrack) {
  // Initialiser Google Analytics
}

// Statut détaillé
const status = getConsentStatus()
console.log(status)
// {
//   hasConsent: true,
//   isExpired: false,
//   daysUntilExpiry: 152,
//   choices: { necessary: true, analytics: true, marketing: false },
//   mode: "custom",
//   timestamp: "2025-08-15T10:30:00.000Z"
// }
```

---

**Enregistrer consentement** :

```typescript
import { saveConsent, tryLogServerConsent } from '@/utils/consent'

// Sauvegarder choix utilisateur
const record = saveConsent(
  {
    analytics: true,
    marketing: false,
  },
  'custom', // Mode: "accept-all" | "reject-all" | "custom"
  {}        // Extra metadata (optionnel)
)

// ✅ Sauvegardé dans localStorage
// ✅ Event 'consent:changed' dispatché

// Log server-side (Supabase Edge Function)
await tryLogServerConsent(record)
// ✅ Enregistré dans table consents (proof CNIL)
```

**Modes prédéfinis** :

```typescript
// Accepter tout
saveConsent({ analytics: true, marketing: true }, 'accept-all')

// Rejeter tout (sauf necessary)
saveConsent({ analytics: false, marketing: false }, 'reject-all')

// Custom (utilisateur choisit)
saveConsent({ analytics: true, marketing: false }, 'custom')
```

---

**Écouter changements consentement** :

```typescript
import { onConsent } from '@/utils/consent'

// Callback si consentement analytics accordé
const unsubscribe = onConsent('analytics', () => {
  console.log('✅ Analytics autorisé, initialiser tracker')
  initGoogleAnalytics()
})

// Cleanup (optionnel)
unsubscribe()
```

**Pattern** :
- Si consentement déjà accordé → Exécute callback immédiatement
- Sinon → Écoute event `consent:changed`, exécute quand accordé

---

**Révoquer consentement** :

```typescript
import { revokeConsent } from '@/utils/consent'

const success = revokeConsent()
if (success) {
  console.log('✅ Consentement révoqué')
  // - localStorage supprimé
  // - Event 'consent:revoked' dispatché
  // - Event 'consent:changed' dispatché (choix par défaut)
  // - Log server-side avec action: 'revoke'
}
```

---

**Vérifier expiration** :

```typescript
import { isConsentExpired } from '@/utils/consent'

if (isConsentExpired()) {
  // Consentement expiré (> 180 jours)
  // → Afficher banner RGPD à nouveau
}
```

---

### Events Custom

**Écouter events** :

```typescript
// Consentement changé
window.addEventListener('consent:changed', (e: CustomEvent) => {
  console.log('Nouveau consentement:', e.detail.choices)
  // { necessary: true, analytics: true, marketing: false }
})

// Consentement révoqué
window.addEventListener('consent:revoked', () => {
  console.log('Consentement révoqué')
})

// Ouvrir préférences cookies (backward compatibility)
window.addEventListener('open-cookie-preferences', () => {
  // Ouvrir modal préférences
})
```

---

### Logging Server-Side

**Edge Function** : `supabase/functions/log-consent/`

```typescript
import { tryLogServerConsent } from '@/utils/consent'

// Enregistrer consentement côté serveur (proof CNIL)
await tryLogServerConsent({
  version: '1.0.0',
  ts: new Date().toISOString(),
  mode: 'accept-all',
  choices: { necessary: true, analytics: true, marketing: true },
  userId: user?.id,          // Optionnel (lié user si auth)
  userAgent: navigator.userAgent,
  ip: 'xxx.xxx.xxx.xxx',     // Récupéré server-side
})
```

**Gestion erreurs** :
- ✅ Silent fail (ne bloque pas utilisateur)
- ✅ Dev warning si Edge Function 503 (normal en dev local)
- ✅ Console warn si erreur réseau

**Table Supabase** : `consents`
- Colonnes : `id`, `user_id`, `version`, `ts`, `mode`, `choices`, `metadata`, `created_at`
- RLS : Admin only (utilisateurs peuvent pas lire/modifier)

---

## 🧩 Autres Utilitaires

### getDisplayPseudo.ts

```typescript
import { getDisplayPseudo } from '@/utils/getDisplayPseudo'

// Récupérer pseudo affiché (pseudo DB ou email si absent)
const displayName = getDisplayPseudo(user)
// Retourne: user.pseudo || user.email?.split('@')[0] || 'Utilisateur'
```

---

### rgpdExport.ts

```typescript
import { exportUserData } from '@/utils/rgpdExport'

// Exporter toutes données utilisateur (RGPD Article 20)
const data = await exportUserData(userId)
// {
//   profile: { ... },
//   taches: [ ... ],
//   recompenses: [ ... ],
//   categories: [ ... ],
//   parametres: { ... },
//   subscriptions: [ ... ],
//   consents: [ ... ],
// }

// Télécharger JSON
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'mes-donnees-appli-picto.json'
a.click()
```

---

### roleUtils.ts

```typescript
import { isAdmin, isFree, isSubscriber } from '@/utils/roleUtils'

// Vérifier rôle utilisateur (helpers simples)
if (isAdmin(user)) {
  // Admin actions
}

if (isFree(user)) {
  // Limites free tier
}

if (isSubscriber(user)) {
  // Features premium
}
```

---

### permissions-api.ts

```typescript
import { fetchPermissions } from '@/utils/permissions-api'

// Récupérer permissions utilisateur depuis API
const permissions = await fetchPermissions(userId)
// {
//   canCreateTask: true,
//   canCreateReward: true,
//   canManageUsers: false,
//   ...
// }
```

---

### supabaseVisibilityHandler.ts

```typescript
import { setupVisibilityHandler } from '@/utils/supabaseVisibilityHandler'

// Gérer reconnexion Supabase quand onglet redevient visible
useEffect(() => {
  const cleanup = setupVisibilityHandler()
  return cleanup
}, [])

// Pattern:
// - Page hidden → Déconnexion partielle (économie ressources)
// - Page visible → Reconnexion automatique (restauration session)
```

---

## 📦 Barrel Exports

**Fichier** : `src/utils/index.ts`

```typescript
// Export centralisé utilitaires
export * from './consent'
export * from './getDisplayPseudo'
export * from './rgpdExport'
export * from './supabaseClient'
export * from './validationRules'
```

**Usage** :

```typescript
// ✅ CORRECT - Import groupé depuis barrel
import {
  supabase,
  validateEmail,
  compressImageIfNeeded,
  saveConsent,
  hasConsent,
} from '@/utils'

// ❌ ÉVITER - Imports multiples
import { supabase } from '@/utils/supabaseClient'
import { validateEmail } from '@/utils/validationRules'
import { compressImageIfNeeded } from '@/utils/validationRules'
```

**Note** : Sous-dossiers (images/, storage/) n'ont pas barrel exports
→ Importer directement depuis fichiers

---

## 🧪 Testing Utilitaires

### Tests Validation (Vitest)

```typescript
// validationRules.test.ts
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePasswordStrength, normalizeEmail } from '@/utils/validationRules'

describe('validateEmail', () => {
  it('doit valider email correct', () => {
    expect(validateEmail('user@example.com')).toBe('')
  })

  it('doit rejeter email sans @', () => {
    expect(validateEmail('userexample.com')).toBe("Format d'e-mail invalide.")
  })

  it('doit rejeter email avec espaces', () => {
    expect(validateEmail('user @example.com')).toBe("L'e-mail ne doit pas contenir d'espace.")
  })
})

describe('normalizeEmail', () => {
  it('doit trim et lowercase', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })
})

describe('validatePasswordStrength', () => {
  it('doit rejeter mot de passe court', () => {
    expect(validatePasswordStrength('Pass1!')).toContain('au moins 10 caractères')
  })

  it('doit rejeter sans minuscule', () => {
    expect(validatePasswordStrength('PASSWORD123!')).toContain('minuscule')
  })

  it('doit accepter mot de passe fort', () => {
    expect(validatePasswordStrength('MyP@ssw0rd123')).toBe('')
  })
})
```

---

### Tests Images (Vitest + Mock Canvas)

```typescript
// compressImageIfNeeded.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compressImageIfNeeded } from '@/utils/validationRules'

// Mock canvas toBlob
beforeEach(() => {
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
    const blob = new Blob(['fake'], { type: 'image/jpeg' })
    callback(blob)
  })
})

describe('compressImageIfNeeded', () => {
  it('doit retourner file si déjà < cible', async () => {
    const file = new File(['small'], 'image.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 10 * 1024 }) // 10 Ko

    const result = await compressImageIfNeeded(file, 20) // Cible 20 Ko
    expect(result).toBe(file) // Même instance
  })

  it('doit retourner SVG tel quel', async () => {
    const file = new File(['svg'], 'icon.svg', { type: 'image/svg+xml' })
    const result = await compressImageIfNeeded(file, 20)
    expect(result).toBe(file)
  })

  it('doit compresser image > cible', async () => {
    const file = new File(['large'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 200 * 1024 }) // 200 Ko

    const result = await compressImageIfNeeded(file, 20)
    expect(result).not.toBe(null) // Compression réussie
    expect(result?.type).toBe('image/jpeg')
  })
})
```

---

### Tests Consent (Vitest + localStorage Mock)

```typescript
// consent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveConsent, getConsent, hasConsent, revokeConsent } from '@/utils/consent'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('consent utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('doit sauvegarder consentement', () => {
    const record = saveConsent({ analytics: true, marketing: false }, 'custom')

    expect(record.choices.necessary).toBe(true)
    expect(record.choices.analytics).toBe(true)
    expect(record.choices.marketing).toBe(false)
    expect(record.mode).toBe('custom')
  })

  it('doit récupérer consentement sauvegardé', () => {
    saveConsent({ analytics: true, marketing: true }, 'accept-all')

    const consent = getConsent()
    expect(consent).not.toBe(null)
    expect(consent?.mode).toBe('accept-all')
  })

  it('doit vérifier catégorie consentement', () => {
    saveConsent({ analytics: true, marketing: false }, 'custom')

    expect(hasConsent('necessary')).toBe(true)  // Toujours true
    expect(hasConsent('analytics')).toBe(true)
    expect(hasConsent('marketing')).toBe(false)
  })

  it('doit révoquer consentement', () => {
    saveConsent({ analytics: true, marketing: true }, 'accept-all')

    const success = revokeConsent()
    expect(success).toBe(true)
    expect(getConsent()).toBe(null)
  })
})
```

---

## ⚠️ Antipatterns à Éviter

### ❌ Créer Nouvelle Instance Supabase

```typescript
// ❌ INTERDIT
import { createClient } from '@supabase/supabase-js'

const mySupabase = createClient(url, key)
mySupabase.from('taches').select() // NE JAMAIS FAIRE

// ✅ CORRECT
import { supabase } from '@/utils/supabaseClient'
supabase.from('taches').select()
```

---

### ❌ Upload Image Non Compressée

```typescript
// ❌ INTERDIT - Upload direct sans compression
const { error } = await supabase.storage
  .from('images')
  .upload(path, file) // File peut être 5 Mo

// ✅ CORRECT - Compression avant upload
const compressed = await compressImageIfNeeded(file, TARGET_MAX_UI_SIZE_KB)
if (!compressed) {
  showToast('Compression impossible', 'error')
  return
}

const result = await uploadImage(compressed, { userId, prefix: 'taches' })
```

---

### ❌ Validation Incomplete Images

```typescript
// ❌ INTERDIT - Valider MIME type uniquement (risque sécurité)
if (file.type === 'image/jpeg') {
  await uploadImage(file, { userId })
}

// ✅ CORRECT - Valider MIME + magic bytes
const errorType = validateImageType(file)
const errorHeader = await validateImageHeader(file)

if (errorType || errorHeader) {
  showToast('Image invalide', 'error')
  return
}

const compressed = await compressImageIfNeeded(file)
await uploadImage(compressed, { userId })
```

**Pourquoi CRITIQUE** : Vérifier magic bytes détecte fichiers malveillants renommés (ex: `malware.exe` renommé `image.jpg`)

---

### ❌ Hardcode Constantes Config

```typescript
// ❌ INTERDIT - Hardcode valeurs
const MAX_SIZE = 20 * 1024        // Hardcode
const DIMENSION = 192              // Hardcode
const BUCKET = 'images'            // Hardcode

// ✅ CORRECT - Utiliser constantes config
import {
  TARGET_MAX_UI_SIZE_KB,
  TARGET_DIMENSION,
  PRIVATE_BUCKET,
} from '@/utils/images/config'

const maxSize = TARGET_MAX_UI_SIZE_KB * 1024
```

---

### ❌ Oublier Invalider Cache Signed URLs

```typescript
// ❌ INTERDIT - Remplacer image sans invalider cache
await replaceImageIfAny(oldPath, newFile, userId, prefix)
// Ancienne URL signée reste en cache → affiche ancienne image

// ✅ CORRECT - Invalider cache après remplacement
await replaceImageIfAny(oldPath, newFile, userId, prefix)
invalidateSignedImageUrl(oldPath, 'images')
```

---

### ❌ Ignorer Erreurs Upload

```typescript
// ❌ INTERDIT - Pas de vérification error
const result = await uploadImage(file, { userId })
const path = result.path // Peut crasher si error

// ✅ CORRECT - Vérifier error
const result = await uploadImage(file, { userId })
if (result.error) {
  console.error('Erreur upload:', result.error)
  showToast('Échec upload', 'error')
  return
}

const path = result.path // Safe - path garanti non-null
```

---

### ❌ Pas de Normalisation Avant Enregistrement

```typescript
// ❌ INTERDIT - Sauvegarder input brut
const email = emailInput.value           // "  User@Example.COM  "
await supabase.from('profiles').insert({ email })

// ✅ CORRECT - Normaliser avant enregistrement
const email = normalizeEmail(emailInput.value) // "user@example.com"
await supabase.from('profiles').insert({ email })
```

---

## 📋 Checklist Utilisation Utilitaires

Avant d'utiliser utilitaires :

**Supabase Client** :
- [ ] Import depuis `@/utils/supabaseClient` (instance unique)
- [ ] JAMAIS créer nouvelle instance `createClient()`

**Images** :
- [ ] **TOUJOURS** compresser avec `compressImageIfNeeded()`
- [ ] Valider MIME type ET magic bytes (`validateImageType` + `validateImageHeader`)
- [ ] Utiliser constantes config (`TARGET_MAX_UI_SIZE_KB`, `ALLOWED_MIME_TYPES`)
- [ ] Gérer échec compression (null retourné)

**Upload Storage** :
- [ ] Compresser AVANT `uploadImage()`
- [ ] Fournir `userId` obligatoire (scoping)
- [ ] Vérifier `result.error` avant utiliser `result.path/url`
- [ ] Invalider cache après `replaceImageIfAny()` ou `deleteImageIfAny()`

**Signed URLs** :
- [ ] Utiliser `getSignedImageUrl()` pour images privées
- [ ] Gérer `result.error` (timeout, 404, permissions)
- [ ] Invalider cache après modification image

**Validation** :
- [ ] Utiliser fonctions validation appropriées (email, password, texte)
- [ ] Normaliser avant enregistrement (`normalizeEmail`, `normalizeSpaces`)
- [ ] Vérifier retour validation (`""` = OK, sinon message erreur)

**RGPD/Consent** :
- [ ] Vérifier `hasConsent(category)` avant trackers
- [ ] Sauvegarder avec `saveConsent()` + log server (`tryLogServerConsent()`)
- [ ] Écouter events `consent:changed` pour init conditionnelle
- [ ] Vérifier expiration (`isConsentExpired()`) au chargement app

---

## 🎯 Commandes Utiles

```bash
# Tests utilitaires
pnpm test src/utils/                  # Tests tous utilitaires
pnpm test validationRules.test.ts     # Tests validation
pnpm test consent.test.ts             # Tests RGPD

# Type-check
pnpm type-check                       # Vérifier erreurs TypeScript

# Build
pnpm build                            # Build production (inclut Next.js)
```

---

## 📚 Références

### Documentation Interne

- **CLAUDE.md global** : Section "Patterns CRITIQUES" (règles hooks, Supabase client)
- **src/hooks/CLAUDE.md** : Hooks custom utilisant ces utilitaires
- **src/components/CLAUDE.md** : Composants utilisant validation, images, consent

### Fichiers Clés

**Instance Supabase** :
- `src/utils/supabaseClient.ts` - Instance unique (TOUJOURS importer depuis)

**Images** :
- `src/utils/images/config.ts` - Constantes configuration
- `src/utils/validationRules.ts` - Validation + compression

**Storage** :
- `src/utils/storage/uploadImage.ts` - Upload avec scoping
- `src/utils/storage/getSignedUrl.ts` - Cache signed URLs

**RGPD** :
- `src/utils/consent.ts` - Gestion consentements CNIL
- `supabase/functions/log-consent/` - Edge Function logging server-side

**Validation** :
- `src/utils/validationRules.ts` - Toutes règles validation

### Exemples Référence

**Upload complet** :
```typescript
// 1. Validation
const errorType = validateImageType(file)
const errorHeader = await validateImageHeader(file)
if (errorType || errorHeader) return

// 2. Compression
const compressed = await compressImageIfNeeded(file, TARGET_MAX_UI_SIZE_KB)
if (!compressed) return

// 3. Upload
const result = await uploadImage(compressed, { userId, prefix: 'taches' })
if (result.error) return

// 4. Utiliser path/url
console.log(result.path, result.url)
```

**Consent RGPD complet** :
```typescript
// Vérifier consentement existant
const status = getConsentStatus()
if (status.isExpired) {
  // Afficher banner RGPD
}

// Sauvegarder choix utilisateur
const record = saveConsent({ analytics: true, marketing: false }, 'custom')
await tryLogServerConsent(record)

// Initialiser trackers conditionnellement
if (hasConsent('analytics')) {
  initGoogleAnalytics()
}

// Écouter changements
onConsent('marketing', () => {
  initFacebookPixel()
})
```

---

**Dernière mise à jour** : Janvier 2026
**Version Appli-Picto** : Next.js 16, React 19, Supabase v2
