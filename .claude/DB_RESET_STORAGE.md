# 🔄 DB Reset avec Storage Policies (Automatique)

Ce fichier documente le problème des Storage Policies et sa solution automatique.

---

## 🐛 Problème Initial

### Symptôme

Après chaque `pnpm db:reset`, l'upload d'images et la création de cartes personnelles **échouent**.

### Cause Racine

La migration `20260226071400_fix_personal_images_policies_for_cards.sql` nécessite des **privilèges spéciaux** pour modifier les RLS policies sur `storage.objects`.

**En environnement local Docker** :

- `storage.objects` appartient à `supabase_storage_admin`
- Les migrations s'exécutent avec `postgres` (non propriétaire)
- ❌ **Erreur de privilèges** → La migration skip gracieusement (RAISE NOTICE)

**Résultat** : Les policies RLS ne sont pas appliquées → Upload images bloqué.

---

## ✅ Solution Automatique

### Script Robuste

Un script bash robuste a été créé : `scripts/db-reset-with-storage.sh`

**Ce qu'il fait** :

1. ✅ Exécute `supabase db reset` (migrations + seed)
2. ✅ Gère l'erreur 502 de restart containers (non-critique)
3. ✅ Applique les storage policies avec `supabase_admin`
4. ✅ Vérifie que les 3 policies sont bien actives
5. ✅ Affiche un résumé clair

### Commande

```bash
pnpm db:reset
```

**Cette commande exécute maintenant automatiquement** :

- Reset DB (migrations + seed)
- Application storage policies
- Vérification policies actives

---

## 🔐 Storage Policies Appliquées

### 3 Policies RLS

Après `pnpm db:reset`, les policies suivantes sont **automatiquement** créées :

1. **`personal_images_select_owner`** (SELECT)
   - Lecture uniquement de ses propres images
   - Chemin : `{uid}/cards/{uuid}.jpg`

2. **`personal_images_insert_owner`** (INSERT)
   - Upload uniquement vers son propre chemin
   - **Filtre DB-first** : Free ❌ / Subscriber ✅ / Admin ✅
   - Chemin : `{uid}/cards/{uuid}.jpg`

3. **`personal_images_delete_owner`** (DELETE)
   - Suppression uniquement de ses propres images
   - Chemin : `{uid}/cards/{uuid}.jpg`

---

## 🧪 Vérification Manuelle

### Vérifier que les policies sont actives

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%';
"
```

**Résultat attendu** :

```
          policyname          | cmd
------------------------------+--------
 personal_images_delete_owner | DELETE
 personal_images_insert_owner | INSERT
 personal_images_select_owner | SELECT
(3 rows)
```

✅ **Si 3 policies** → Upload images OK
❌ **Si 0 policies** → Relancer `pnpm supabase:apply-storage-policies`

---

## 🛠️ Commandes Disponibles

### Reset Complet (Recommandé)

```bash
pnpm db:reset
```

**Exécute automatiquement** :

- `supabase db reset` (migrations + seed)
- `pnpm supabase:apply-storage-policies` (storage RLS)

---

### Application Manuelle Storage Policies

Si tu as besoin d'appliquer **uniquement** les storage policies (sans reset) :

```bash
pnpm supabase:apply-storage-policies
```

**Exécute** :

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -U supabase_admin -d postgres \
  -f supabase/migrations/20260226071400_fix_personal_images_policies_for_cards.sql
```

---

## 🎯 Workflow Développement

### Cas d'usage typique

1. **Modifier migrations** : Éditer `supabase/migrations/*.sql`
2. **Reset DB** : `pnpm db:reset`
3. **✅ Storage policies appliquées automatiquement**
4. **Tester upload images** : Créer carte personnelle → Upload image OK

---

## 📂 Fichiers Concernés

- ✅ **Script principal** : `scripts/db-reset-with-storage.sh`
- ✅ **Migration Storage** : `supabase/migrations/20260226071400_fix_personal_images_policies_for_cards.sql`
- ✅ **Package.json** : `"db:reset": "./scripts/db-reset-with-storage.sh"`
- ✅ **Package.json** : `"supabase:apply-storage-policies": "..."`

---

## 🐛 Dépannage

### Upload image échoue après `pnpm db:reset`

**Diagnostic** :

```bash
# Vérifier policies actives
pnpm supabase:apply-storage-policies

# Vérifier manuellement
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'personal_images_%';
"
```

**Si count = 0** :

```bash
pnpm supabase:apply-storage-policies
```

**Si count = 3** :

- Vérifier que l'utilisateur a le statut `subscriber` ou `admin` (pas `free`)
- Les comptes seed (`admin@local.dev`, `test-free@local.dev`) sont déjà créés

---

### Erreur 502 lors du reset

**C'est normal** : Erreur de restart containers (non-critique).

Le script robuste **gère cette erreur automatiquement** :

- ✅ Migrations appliquées
- ✅ Seed exécuté
- ✅ Storage policies appliquées
- ⚠️ Restart containers échoué (peut être ignoré)

**Message du script** :

```
⚠️  Erreur 502/500 détectée lors du restart containers (non-critique)
✅ Migrations et seed appliqués avec succès
⏭️  Continuation du script...
```

---

## 🎉 Résumé

**Avant** :

```bash
pnpm db:reset
# ❌ Upload images échoue
pnpm supabase:apply-storage-policies  # ⚠️ Oublié → bug
# ✅ Upload images OK maintenant
```

**Maintenant** :

```bash
pnpm db:reset
# ✅ Storage policies appliquées automatiquement
# ✅ Upload images OK immédiatement
```

---

**Dernière mise à jour** : 2026-03-20
