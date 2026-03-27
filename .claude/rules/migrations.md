---
paths:
  - 'supabase/migrations/**/*.sql'
---

# Règles Migrations Supabase — Appli-Picto

## ⚠️ Workflow OBLIGATOIRE

Après TOUTE modification migration :

```bash
pnpm context:update  # db:dump + db:types
```

**Génère automatiquement** :

- `supabase/schema.sql` (dump complet)
- `src/types/supabase.ts` (types TypeScript)

## Conventions nommage

Format : `YYYYMMDDHHMMSS_description.sql`

Exemples :

- `20260326120000_add_sequences_table.sql`
- `20260326130000_create_rls_policies_sessions.sql`

## RLS Policies (CRITIQUE SÉCURITÉ)

⚠️ **TOUJOURS activer RLS sur nouvelles tables** :

```sql
-- 1. Créer la table
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activer RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 3. Créer policies
CREATE POLICY "Users can read own data"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
  ON table_name
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON table_name
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON table_name
  FOR DELETE
  USING (auth.uid() = user_id);
```

## Fichiers protégés (générés automatiquement)

❌ **JAMAIS modifier manuellement** :

- `src/types/supabase.ts` (généré par `pnpm db:types`)
- `supabase/schema.sql` (généré par `pnpm db:dump`)

→ Hook `protect-generated-files.sh` **bloquera** toute tentative de modification manuelle

## Migration des données

Pour migrations avec données existantes :

```sql
-- Ajouter colonne avec valeur par défaut
ALTER TABLE table_name
  ADD COLUMN new_column TEXT DEFAULT 'valeur_defaut';

-- Migrer données existantes
UPDATE table_name
  SET new_column = 'nouvelle_valeur'
  WHERE condition;

-- Retirer valeur par défaut si nécessaire
ALTER TABLE table_name
  ALTER COLUMN new_column DROP DEFAULT;
```

## Rollback

Toujours prévoir un `down.sql` si migration complexe :

```sql
-- Migration up
-- CREATE TABLE...

-- Migration down (rollback)
-- DROP TABLE IF EXISTS...
```

## Tester localement

```bash
# Appliquer migration
pnpm supabase:reset

# Vérifier schema
pnpm db:dump

# Générer types
pnpm db:types
```
