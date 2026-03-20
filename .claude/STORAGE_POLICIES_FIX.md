# 🔐 Fix Storage RLS Policies (Local Development)

## 🎯 Problème

En environnement local (Docker Supabase), les policies RLS sur `storage.objects` ne sont pas appliquées correctement après `supabase db reset`.

### Symptôme

```
❌ [uploadBankCardImage] Erreur Storage:
   • Message: new row violates row-level security policy
   • Status: 403
```

### Cause racine

**Deux problèmes distincts** :

#### 1. Problème de privilèges (local uniquement)

- `storage.objects` appartient à `supabase_storage_admin`
- Les migrations s'exécutent avec `postgres` (non-propriétaire)
- → Erreur `insufficient_privilege` lors de `CREATE POLICY` sur `storage.objects`
- → La migration skip gracieusement (pas d'erreur visible)
- → **Les policies ne sont pas créées**

#### 2. Bug Supabase Storage v1.33.0 (is_admin)

- Les policies bank-images utilisaient `is_admin()` (fonction `SECURITY DEFINER`)
- **Bug** : Supabase Storage ne propage pas correctement le contexte JWT aux fonctions `DEFINER`
- → `auth.uid()` retourne `NULL` dans le contexte d'évaluation de la policy
- → `is_admin()` retourne `FALSE` (car `auth.uid() = NULL`)
- → **Upload refusé même avec compte admin**

---

## ✅ Solution

### Pattern qui fonctionne

❌ **NE PAS FAIRE** : Utiliser fonction `SECURITY DEFINER` dans policy
```sql
-- ❌ ÉCHOUE avec Supabase Storage v1.33.0
CREATE POLICY bank_images_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-images'
  AND is_admin()  -- ❌ is_admin() retourne FALSE (auth.uid() = NULL)
);
```

✅ **FAIRE** : Utiliser `EXISTS` inline avec `auth.uid()` directement
```sql
-- ✅ FONCTIONNE
CREATE POLICY bank_images_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-images'
  AND EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = auth.uid()  -- ✅ auth.uid() fonctionne inline
      AND accounts.status = 'admin'::public.account_status
  )
);
```

### Migrations correctives

Deux migrations corrigent ce problème :

1. **`20260226071400_fix_personal_images_policies_for_cards.sql`**
   - Corrige policies `personal-images` (owner-only)
   - Utilise `DO $$ ... END $$;` pour gérer gracieusement l'erreur de privilèges
   - Application manuelle : `pnpm supabase:apply-storage-policies`

2. **`20260320100000_fix_bank_images_policies_storage.sql`**
   - Corrige policies `bank-images` (admin-only)
   - Remplace `is_admin()` par `EXISTS` inline
   - Application manuelle : `pnpm supabase:apply-bank-storage-policies`

---

## 🚀 Commandes disponibles

### Appliquer policies manuellement

```bash
# Personal-images uniquement
pnpm supabase:apply-storage-policies

# Bank-images uniquement
pnpm supabase:apply-bank-storage-policies

# Toutes les policies Storage (personal + bank)
pnpm supabase:apply-all-storage-policies
```

### Reset DB avec policies

```bash
# Reset DB + application automatique des policies Storage
pnpm db:reset

# Ou utiliser le script détaillé
./scripts/db-reset-with-storage.sh
```

---

## 🧪 Vérification

### Vérifier que les policies existent

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN policyname LIKE '%insert%' THEN 'INSERT'
    WHEN policyname LIKE '%update%' THEN 'UPDATE'
    WHEN policyname LIKE '%delete%' THEN 'DELETE'
    WHEN policyname LIKE '%select%' THEN 'SELECT'
  END AS operation
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%personal%' OR policyname LIKE '%bank%')
ORDER BY policyname;
"
```

**Résultat attendu** :

```
 schemaname | tablename |          policyname           | operation
------------+-----------+-------------------------------+-----------
 storage    | objects   | bank_images_delete_admin      | DELETE
 storage    | objects   | bank_images_insert_admin      | INSERT
 storage    | objects   | bank_images_select_public     | SELECT
 storage    | objects   | bank_images_update_admin      | UPDATE
 storage    | objects   | personal_images_delete_owner  | DELETE
 storage    | objects   | personal_images_insert_owner  | INSERT
 storage    | objects   | personal_images_select_owner  | SELECT
(7 rows)
```

### Tester upload

**Personal-images** (compte free/subscriber/admin) :
1. Se connecter avec n'importe quel compte
2. Aller sur `/edition/cards`
3. Créer une carte personnelle avec image
4. ✅ Upload doit réussir

**Bank-images** (compte admin uniquement) :
1. Se connecter avec `admin@local.dev` / `Admin1234x`
2. Aller sur `/admin/bank-cards`
3. Créer une carte de banque avec image
4. ✅ Upload doit réussir

---

## 📚 Références

- **Migration personal-images** : `supabase/migrations/20260226071400_fix_personal_images_policies_for_cards.sql`
- **Migration bank-images** : `supabase/migrations/20260320100000_fix_bank_images_policies_storage.sql`
- **Script reset** : `scripts/db-reset-with-storage.sh`
- **Package.json** : Ligne 55-58 (scripts Storage)

---

## ⚠️ IMPORTANT

**En production (Supabase Cloud)** :
- ✅ Les migrations s'appliquent correctement (pas de problème de privilèges)
- ✅ Pas besoin d'application manuelle
- ✅ Les policies sont créées automatiquement

**En local (Docker Supabase)** :
- ⚠️ Application manuelle OBLIGATOIRE après `supabase db reset`
- ⚠️ Automatisé via `pnpm db:reset` (appelle le script `db-reset-with-storage.sh`)
- ⚠️ Si oubli → uploads échouent avec HTTP 403

---

**Dernière mise à jour** : 2026-03-20
