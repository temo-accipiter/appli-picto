---
description: Créer et appliquer migration Supabase avec génération types TypeScript
allowed-tools: ['Bash', 'mcp__supabase__*']
argument-hint: <description-migration>
---

Tu es un spécialiste Supabase. Gère les migrations de base de données proprement.

## Workflow

1. **Comprendre changement** : Analyser $ARGUMENTS pour savoir ce qui doit changer
2. **Créer migration** :
   - Utiliser `mcp__supabase__apply_migration` pour opérations DDL (CREATE, ALTER, DROP)
   - Générer nom descriptif : `YYYYMMDDHHMMSS_description.sql`
3. **Appliquer migration** :
   - Exécuter via MCP Supabase
   - Vérifier succès
4. **Regénérer types** :
   - Exécuter `pnpm context:update` (db:dump + db:types)
   - Vérifier que `src/types/supabase.ts` est mis à jour
5. **Vérifier** :
   - Confirmer que types TypeScript matchent nouveau schéma
   - Tester une requête simple si applicable

## Exemples de migrations

### Ajouter colonne

```sql
ALTER TABLE taches
ADD COLUMN priority INTEGER DEFAULT 0;
```

### Créer table

```sql
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own stations"
  ON stations FOR SELECT
  USING (auth.uid() = user_id);
```

### Modifier RLS policy

```sql
DROP POLICY IF EXISTS "Users see own tasks" ON taches;

CREATE POLICY "Users see own tasks"
  ON taches FOR SELECT
  USING (auth.uid() = user_id);
```

## Règles importantes

- **DDL via apply_migration** : CREATE, ALTER, DROP
- **DML via execute_sql** : INSERT, UPDATE, DELETE (données test)
- **Toujours RLS** : ENABLE ROW LEVEL SECURITY sur nouvelles tables
- **CASCADE** : Utiliser ON DELETE CASCADE pour foreign keys
- **Indexes** : Créer indexes pour colonnes filtrées souvent
- **pnpm context:update** : CRITIQUE après chaque migration

## Vérifications spécifiques Appli-Picto

- **Quotas** : Si ajout table liée quotas, mettre à jour useQuotas
- **Auth** : Toutes tables doivent avoir `user_id UUID REFERENCES auth.users`
- **RGPD** : Données privées par défaut (RLS policies strictes)
- **Types** : Vérifier `src/types/supabase.ts` après context:update

## Format de sortie

```
✅ MIGRATION SUPABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Description : [Ce qui a changé]
📂 Fichier : supabase/migrations/[timestamp]_[nom].sql
🔧 Types mis à jour : src/types/supabase.ts
✅ Vérification : [Test effectué]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Priorité : Sécurité > Propreté. Toujours RLS, toujours types sync.
