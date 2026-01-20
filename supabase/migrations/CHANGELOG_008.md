# Changelog Migration 008 : split_storage_buckets

## Version 2 (2026-01-18 - FINALE)

### 🐛 Bug Fixes Critiques

#### 1. **Policies cards-user : Préfixe 'user/' manquant**

**Problème** :

```sql
-- ❌ AVANT (FAUX)
name LIKE auth.uid()::text || '/%'
```

Les policies utilisaient `auth.uid()::text || '/%'` alors que le path format est `user/<owner_id>/<card_id>.<ext>`.

**Résultat** : Policies ne matchaient JAMAIS les paths user → accès bloqué totalement.

**Correction** :

```sql
-- ✅ APRÈS (CORRECT)
name LIKE 'user/' || auth.uid()::text || '/%'
```

**Fichiers impactés** :

- `cards_user_storage_select` (ligne 131)
- `cards_user_storage_insert` (ligne 144)
- `cards_user_storage_update` (lignes 158, 164)
- `cards_user_storage_delete` (ligne 178)

---

#### 2. **Policies cards-bank WRITE : Manque enforcement préfixe 'bank/'**

**Problème** :

```sql
-- ❌ AVANT (FAIBLE SÉCURITÉ)
WITH CHECK (
  bucket_id = 'cards-bank' AND
  public.is_admin()
)
```

Admin pouvait uploader fichiers avec n'importe quel path (ex: `malicious/script.js`).

**Correction** :

```sql
-- ✅ APRÈS (SÉCURISÉ)
WITH CHECK (
  bucket_id = 'cards-bank' AND
  name LIKE 'bank/%' AND
  public.is_admin()
)
```

**Fichiers impactés** :

- `cards_bank_storage_insert` (ligne 83)
- `cards_bank_storage_update` (lignes 95, 100)
- `cards_bank_storage_delete` (ligne 113)

---

### 🔒 Sécurité Renforcée

#### 3. **Nettoyage anciennes policies migration 007**

**Problème** :

- Migration 007 créait policies sur bucket `cards` (ancien bucket unique)
- Ces policies continuent à s'appliquer même après migration 008
- Risque de conflit ou bypass accidentel

**Correction** :
Ajout section nettoyage en début de migration 008 (lignes 13-25) :

```sql
-- Anciennes policies sur bucket 'cards' (migration 007)
DROP POLICY IF EXISTS "cards_storage_read_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_read_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_user" ON storage.objects;
```

---

### 🧹 Nettoyage Code

#### 4. **Suppression redondance constraints/triggers**

**Problème** :

- Migration 008 v1 redéfinissait constraints/triggers déjà présents dans migration 007 :
  - `cards_bank_no_category`
  - `categories_user_only`
  - `validate_card_category()`

**Correction** :

- Suppression de la redéfinition (lignes 219-229)
- Ajout note explicite : "Déjà définis dans migration 007"

**Bénéfices** :

- Migration 008 plus courte et lisible
- Pas de risque de conflit si migration 007 déjà appliquée
- Documentation claire des dépendances

---

### 📝 Clarifications Architecture

#### 5. **Path DB = Path Storage (identique)**

**Clarification importante** :

Migration 008 v1 suggérait transformation paths :

```
User : DB = 'user/<uid>/x.jpg' → Storage = '<uid>/x.jpg' (retirer 'user/')
```

**Migration 008 v2 (finale)** : Pas de transformation

```
User : DB = 'user/<uid>/x.jpg' → Storage = 'user/<uid>/x.jpg' (identique)
Bank : DB = 'bank/abc.jpg'      → Storage = 'bank/abc.jpg' (identique)
```

**Avantages** :

- ✅ Simplicité : 1 path unique pour DB + Storage
- ✅ Moins de bugs : pas de conversion path → moins d'erreurs
- ✅ Debug facile : path affiché = path réel

**Documentation mise à jour** :

- Migration SQL (lignes 268-272)
- Guide déploiement (`MIGRATION_GUIDE_008.md`)
- Script TypeScript (`migrate-cards-storage.ts`)

---

## Impact Changements

### Avant Corrections (Version 1)

| Scénario                            | Résultat                             |
| ----------------------------------- | ------------------------------------ |
| Subscriber upload user card         | ❌ **BLOQUÉ** (policy ne matche pas) |
| Admin upload bank card sans préfixe | ✅ **AUTORISÉ** (faille sécurité)    |
| Anciennes policies migration 007    | ⚠️ **ACTIVES** (risque conflit)      |

### Après Corrections (Version 2)

| Scénario                            | Résultat                          |
| ----------------------------------- | --------------------------------- |
| Subscriber upload user card         | ✅ **AUTORISÉ** (policy correcte) |
| Admin upload bank card sans préfixe | ❌ **BLOQUÉ** (enforce 'bank/')   |
| Anciennes policies migration 007    | ✅ **SUPPRIMÉES** (propre)        |

---

## Tests Requis Après Corrections

### Test 1 : Subscriber Upload User Card

```sql
-- En tant que subscriber
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "<subscriber-uid>"}';

-- Simuler upload
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('cards-user', 'user/<subscriber-uid>/test.jpg', '<subscriber-uid>');
-- Doit réussir ✅
```

### Test 2 : Admin Enforce Prefix Bank

```sql
-- En tant qu'admin
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "<admin-uid>", "role": "admin"}';

-- Tenter upload sans préfixe 'bank/'
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('cards-bank', 'malicious.jpg', '<admin-uid>');
-- Doit échouer ❌ (policy bloque)

-- Upload avec préfixe correct
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('cards-bank', 'bank/card123.jpg', '<admin-uid>');
-- Doit réussir ✅
```

### Test 3 : Anciennes Policies Supprimées

```sql
-- Vérifier qu'aucune policy 'cards_storage_*' n'existe
SELECT policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE 'cards_storage_%';
-- Doit retourner 0 lignes ✅
```

---

## Fichiers Modifiés

| Fichier                                    | Changements                            |
| ------------------------------------------ | -------------------------------------- |
| `20260118170000_split_storage_buckets.sql` | Corrections bugs + nettoyage + docs    |
| `MIGRATION_GUIDE_008.md`                   | Clarification path DB = Storage        |
| `migrate-cards-storage.ts`                 | Suppression transformation path user   |
| `CHANGELOG_008.md`                         | Ce fichier (documentation corrections) |

---

## Checklist Validation Version 2

- [x] Bug critique préfixe 'user/' corrigé
- [x] Enforcement préfixe 'bank/' ajouté
- [x] Anciennes policies migration 007 supprimées
- [x] Redondance constraints/triggers retirée
- [x] Documentation path DB = Storage clarifiée
- [x] Script migration data mis à jour
- [x] Guide déploiement synchronisé
- [x] Tests validation documentés

---

## Migration Safe

✅ **Migration 008 v2 est SAFE pour production**

**Garanties** :

- Idempotente (DROP IF EXISTS partout)
- Rétrocompatible (si migration 007 déjà appliquée)
- Nettoyage complet (suppression anciennes policies)
- Documentation exhaustive (inline + guide externe)

**Prérequis** :

- Migration 007 doit être appliquée AVANT migration 008
- Fonctions `is_admin()` et `is_subscriber_active()` doivent exister

---

**Version** : 2 (finale)
**Date** : 2026-01-18
**Status** : ✅ Prêt pour déploiement
**Auteur** : Migration 008 - Split Storage Buckets
