# Migration Guide 008 : Split Storage Buckets

Guide complet pour migrer de 1 bucket unique `cards` vers 2 buckets séparés `cards-bank` + `cards-user`.

---

## 🎯 Objectifs

1. **Réduire bugs** : Séparer logique PUBLIC vs PRIVATE
2. **Supporter Visitor (anon)** : Bank cards accessibles sans signed URLs
3. **RGPD strict** : Admin voit metadata DB mais PAS images user

---

## 📋 Architecture Cible

### Buckets

| Bucket | Type | Usage | Signed URLs |
|--------|------|-------|-------------|
| `cards-bank` | PUBLIC | Images banque (Visitor) | ❌ Non requis |
| `cards-user` | PRIVATE | Images utilisateurs | ✅ Obligatoires |

### Path Format

```
Bank images:  bank/<card_id>.<ext>        → bucket cards-bank
User images:  user/<owner_id>/<card_id>.<ext> → bucket cards-user
```

**Note** :
- Le préfixe dans `cards.image_path` détermine le bucket (pas de colonne supplémentaire)
- **Path DB = Path Storage** (identique, pas de transformation nécessaire)

---

## 🚀 Timeline Déploiement

### Étape 1 : Backup (CRITIQUE)

```bash
# Backup DB
pnpm db:dump

# Backup images (via Supabase CLI)
supabase storage ls cards --recursive > backup-cards-list.txt
```

---

### Étape 2 : Appliquer Migration 008 (SQL)

```bash
# Local
pnpm supabase:start
pnpm supabase migration up

# Vérifier buckets créés
psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT id, name, public FROM storage.buckets WHERE id LIKE 'cards%';"
```

**Résultat attendu** :
```
    id      |    name     | public
------------+-------------+--------
 cards-bank | cards-bank  | t
 cards-user | cards-user  | f
```

---

### Étape 3 : Copier Images Physiquement

**Option A : Script TypeScript (recommandé)**

```bash
# Installer dépendances si nécessaire
pnpm add -D tsx @supabase/supabase-js

# Configurer env
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# Exécuter migration
pnpm tsx supabase/scripts/migrate-cards-storage.ts
```

**Option B : Supabase CLI + Bash**

```bash
# À adapter selon besoins
supabase storage cp cards/bank/ cards-bank/bank/ --recursive
supabase storage cp cards/user/ cards-user/ --recursive
```

---

### Étape 4 : Mettre à Jour `image_path` dans DB (si nécessaire)

**⚠️ IMPORTANT** : Vérifier format actuel des paths dans DB

```sql
-- Vérifier format actuel
SELECT DISTINCT
  owner_type,
  LEFT(image_path, 20) AS path_sample
FROM cards
WHERE image_path IS NOT NULL
LIMIT 10;
```

**Si paths déjà corrects** (`bank/...` et `user/...`) → Rien à faire ✅

**Si paths différents** → Adapter script SQL :

```sql
-- Exemple : Corriger paths user
UPDATE cards
SET image_path = 'user/' || owner_id::text || '/' || RIGHT(image_path, LENGTH(image_path) - POSITION('/' IN image_path))
WHERE owner_type = 'user' AND image_path NOT LIKE 'user/%';
```

---

### Étape 5 : Vérifier Migration

```bash
# Exécuter vérifications
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/scripts/migrate_cards_storage.sql
```

**Requêtes validation** :

```sql
-- Compter paths invalides (doit être 0)
SELECT COUNT(*) AS invalid_paths_count
FROM cards
WHERE image_path IS NOT NULL
  AND NOT (
    (owner_type = 'bank' AND image_path LIKE 'bank/%') OR
    (owner_type = 'user' AND image_path LIKE 'user/' || owner_id::text || '/%')
  );
-- Résultat attendu : 0

-- Vérifier tous paths
SELECT
  owner_type,
  image_path,
  CASE
    WHEN owner_type = 'bank' AND image_path LIKE 'bank/%' THEN 'OK'
    WHEN owner_type = 'user' AND image_path LIKE 'user/' || owner_id::text || '/%' THEN 'OK'
    ELSE 'INVALID'
  END AS validation
FROM cards
WHERE image_path IS NOT NULL;
-- Résultat attendu : Tous 'OK'
```

---

### Étape 6 : Mettre à Jour Code Applicatif

**Fichiers à modifier** :

#### `src/utils/images/config.ts`

```typescript
// Avant
export const PRIVATE_BUCKET = 'images'

// Après
export const BANK_BUCKET = 'cards-bank'
export const USER_BUCKET = 'cards-user'
```

#### Nouveau helper `src/utils/storage/getBucketName.ts`

```typescript
/**
 * Détermine bucket storage depuis image_path
 */
export function getBucketName(imagePath: string): string {
  if (imagePath.startsWith('bank/')) {
    return 'cards-bank'
  }
  if (imagePath.startsWith('user/')) {
    return 'cards-user'
  }
  throw new Error(`Invalid image_path format: ${imagePath}`)
}

/**
 * Retourne storage path depuis image_path DB
 * NOTE: Dans migration 008, path DB = path Storage (identique, pas de transformation)
 */
export function getStoragePath(imagePath: string): string {
  // Validation
  if (!imagePath.startsWith('bank/') && !imagePath.startsWith('user/')) {
    throw new Error(`Invalid image_path format: ${imagePath}`)
  }

  // Path DB = Path Storage (identique)
  return imagePath
}
```

#### Hook upload `src/hooks/useCardsUpload.ts` (nouveau ou adapter)

```typescript
import { getBucketName } from '@/utils/storage/getBucketName'

export function useCardsUpload() {
  const uploadCard = async (file: File, ownerType: 'bank' | 'user', ownerId: string) => {
    // Déterminer bucket
    const bucket = ownerType === 'bank' ? 'cards-bank' : 'cards-user'

    // Construire path (DB = Storage, identique)
    const cardId = crypto.randomUUID()
    const ext = file.name.split('.').pop()
    const path = ownerType === 'bank'
      ? `bank/${cardId}.${ext}`
      : `user/${ownerId}/${cardId}.${ext}`

    // Upload (path identique DB et Storage)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)

    if (error) throw error

    // Enregistrer DB (même path)
    await supabase.from('cards').insert({
      image_path: path,
      owner_type: ownerType,
      owner_id: ownerId,
    })

    return { path, bucket }
  }

  return { uploadCard }
}
```

#### Hook fetch signed URLs `src/hooks/useSignedUrl.ts` (adapter)

```typescript
import { getBucketName } from '@/utils/storage/getBucketName'

export function useSignedUrl(imagePath: string | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!imagePath) return

    const bucket = getBucketName(imagePath)
    // Path DB = Path Storage (identique)

    // Si bucket PUBLIC (cards-bank), pas de signed URL requis
    if (bucket === 'cards-bank') {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(imagePath)
      setUrl(data.publicUrl)
      return
    }

    // Sinon (cards-user), signed URL
    const fetchSignedUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(imagePath, 24 * 60 * 60) // 24h

      if (error) {
        console.error('Signed URL error:', error)
        return
      }

      setUrl(data.signedUrl)
    }

    fetchSignedUrl()
  }, [imagePath])

  return url
}
```

---

### Étape 7 : Tester

**Tests manuels** :

1. **Visitor (anon)** : Charger page avec bank cards → images visibles ✅
2. **Free user** : Tenter upload user card → bloqué (subscriber requis) ❌
3. **Subscriber** : Upload user card → succès + signed URL générée ✅
4. **Admin** : Voir metadata user cards → visible, fetch images → bloqué RGPD ❌✅

**Tests E2E** :

```typescript
// tests/e2e/cards-storage.spec.ts
test('Visitor can see bank cards', async ({ page }) => {
  await page.goto('/tableau')
  const bankCard = page.locator('[data-testid="bank-card-image"]').first()
  await expect(bankCard).toBeVisible()
  // Vérifier que URL n'est PAS signed (PUBLIC)
  const src = await bankCard.getAttribute('src')
  expect(src).toContain('cards-bank')
  expect(src).not.toContain('token=')
})

test('Admin cannot fetch user images (RGPD)', async ({ page }) => {
  // Login admin
  await page.goto('/admin/cards')
  // Voir metadata
  await expect(page.locator('[data-testid="user-card-name"]')).toBeVisible()
  // Tenter fetch image directement → bloqué storage policy
  const response = await page.request.get('<user-image-path>')
  expect(response.status()).toBe(403) // Storage policy bloque
})
```

---

### Étape 8 : Déploiement Production

```bash
# 1. Push migration
git add supabase/migrations/20260118170000_split_storage_buckets.sql
git commit -m "feat(storage): split buckets cards-bank + cards-user"
git push

# 2. Appliquer migration prod
pnpm supabase migration up --db-url <production-db-url>

# 3. Exécuter script migration data prod
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<prod-service-role-key>"
pnpm tsx supabase/scripts/migrate-cards-storage.ts

# 4. Déployer app
vercel deploy --prod
```

---

### Étape 9 : Nettoyage (après période de grâce)

**Attendre 1 semaine** pour vérifier stabilité, puis :

```sql
-- Supprimer ancien bucket (IRRÉVERSIBLE)
DELETE FROM storage.buckets WHERE id = 'cards';

-- Supprimer anciennes storage policies
DROP POLICY IF EXISTS "cards_storage_read_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_read_user" ON storage.objects;
-- etc.
```

---

## 🔧 Rollback Plan

**Si problème détecté** :

1. **Annuler déploiement app** : Revenir à version précédente
2. **Garder anciens + nouveaux buckets** : Pas de perte données
3. **Restaurer DB** : `pnpm db:restore` depuis backup
4. **Supprimer nouveaux buckets** si nécessaire :

```sql
DELETE FROM storage.buckets WHERE id IN ('cards-bank', 'cards-user');
```

---

## 📊 Checklist Finale

Avant production, vérifier :

- [ ] ✅ Migration 008 appliquée sans erreur
- [ ] ✅ Buckets `cards-bank` + `cards-user` créés
- [ ] ✅ Toutes images copiées (script migration data exécuté)
- [ ] ✅ Paths DB validés (0 invalid paths)
- [ ] ✅ Code app mis à jour (getBucketName, useSignedUrl, etc.)
- [ ] ✅ Tests E2E passent (Visitor, admin RGPD, subscriber upload)
- [ ] ✅ Backup DB + images fait
- [ ] ✅ Rollback plan documenté

---

## 🆘 Troubleshooting

### Problème : Images ne s'affichent pas après migration

**Cause** : Path mismatch entre DB et Storage

**Solution** :
```sql
-- Vérifier paths
SELECT image_path FROM cards WHERE id = '<card-id>';
-- Comparer avec storage
SELECT name FROM storage.objects WHERE bucket_id = 'cards-bank' LIMIT 10;
```

### Problème : Visitor ne voit pas bank cards

**Cause** : Bucket `cards-bank` pas PUBLIC

**Solution** :
```sql
UPDATE storage.buckets SET public = true WHERE id = 'cards-bank';
```

### Problème : Admin peut voir images user (RGPD violation)

**Cause** : Storage policy incorrecte

**Solution** :
```sql
-- Vérifier policy
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'cards_user%';
-- Doit être owner-only (auth.uid() = owner)
```

---

## 📚 Références

- Migration SQL : `supabase/migrations/20260118170000_split_storage_buckets.sql`
- Script data : `supabase/scripts/migrate-cards-storage.ts`
- Validation : `supabase/scripts/migrate_cards_storage.sql`
- Guide : Ce fichier

---

**Auteur** : Migration 008 - Split Storage Buckets
**Date** : 2026-01-18
**Status** : ✅ Prêt pour déploiement
