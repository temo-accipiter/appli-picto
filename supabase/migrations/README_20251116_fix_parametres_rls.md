# Migration: Corriger les politiques RLS de parametres

## Problème

L'erreur suivante se produit lors de la mise à jour des paramètres :

```
new row violates row-level security policy for table "parametres"
```

## Cause

Les politiques RLS actuelles de la table `parametres` nécessitent les droits admin pour insérer et modifier, alors que le code attend que tous les utilisateurs authentifiés puissent le faire.

## Solution

Appliquer la migration `20251116_fix_parametres_rls.sql` qui met à jour les politiques RLS.

### Option 1: Via le Dashboard Supabase (recommandé)

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans "SQL Editor"
4. Copier-coller le contenu de `supabase/migrations/20251116_fix_parametres_rls.sql`
5. Exécuter le SQL
6. Vérifier que les politiques ont été créées dans "Authentication" > "Policies" > "parametres"

### Option 2: Via psql (si vous avez accès direct)

```bash
# Depuis la racine du projet
export PGPASSWORD="votre_db_password"
psql -h votre_db_host -p 5432 -U postgres -d postgres \
  -f supabase/migrations/20251116_fix_parametres_rls.sql
```

### Option 3: Via Supabase CLI (à venir)

```bash
# Lier le projet (une seule fois)
pnpm db:link

# Pousser la migration
supabase db push
```

## Vérification

Après l'application de la migration, vérifier que :

1. Les anciennes politiques `parametres_insert_all_users` et `parametres_update_all_users` sont supprimées
2. Les nouvelles politiques `parametres_insert_authenticated` et `parametres_update_authenticated` existent
3. Les utilisateurs authentifiés (non-admin) peuvent modifier les paramètres sans erreur RLS

## Politique finale attendue

- **SELECT**: Tous les utilisateurs authentifiés peuvent lire
- **INSERT**: Tous les utilisateurs authentifiés peuvent insérer (avec id=1)
- **UPDATE**: Tous les utilisateurs authentifiés peuvent modifier
- **DELETE**: Seulement les admins peuvent supprimer
