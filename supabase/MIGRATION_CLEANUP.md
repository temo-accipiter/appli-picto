# Nettoyage des migrations - 2025-11-01

## Contexte

Le projet a été nettoyé pour simplifier la gestion des migrations. Toutes les anciennes migrations ont été archivées car le projet utilise maintenant un dump complet de production comme source de vérité.

## Actions effectuées

### 1. Archivage des anciennes migrations

- **16 fichiers** déplacés vers `supabase/migrations_archive/`
- Période couverte : 15 octobre 2025 → 30 octobre 2025
- Documentation créée : `migrations_archive/README.md`

### 2. Migration consolidée

- Nouvelle migration créée : `20251101000040_initial_schema_consolidated.sql`
- Cette migration sert de marqueur pour le nouveau système
- Le schéma complet est dans `supabase/schema.sql`

## Structure actuelle

```
supabase/
├── schema.sql                          # Source de vérité (dump production)
├── migrations/
│   └── 20251101000040_initial_schema_consolidated.sql
├── migrations_archive/                 # Archive (référence uniquement)
│   ├── README.md
│   ├── 20251015070601_initial_schema.sql
│   ├── 20251015164829_add_get_usage_fast_no_params.sql
│   └── ... (14 autres fichiers)
└── MIGRATION_CLEANUP.md               # Ce fichier
```

## Workflow futur

### Pour les nouvelles migrations

```bash
# Créer une nouvelle migration
supabase migration new nom_de_la_migration

# Appliquer en local
supabase db reset

# Mettre à jour le dump
yarn db:dump

# Mettre à jour les types
yarn db:types
```

### Pour synchroniser avec production

```bash
# 1. Dumper le schéma de production
supabase db dump > supabase/schema.sql

# 2. Réinitialiser la base locale avec le nouveau schéma
supabase db reset

# 3. Mettre à jour les types
yarn db:types
```

## Buckets Storage

Les buckets suivants ont été créés manuellement en local :

- `images` (privé, 2MB max, 7 MIME types)
- `avatars` (privé, 1MB max, 5 MIME types)

Avec 16 policies RLS complètes (8 par bucket).

## Notes importantes

1. **Ne jamais** réappliquer les migrations archivées
2. Les migrations archivées sont **en lecture seule** (référence historique)
3. Le fichier `schema.sql` est la source unique de vérité
4. Toujours utiliser `yarn db:dump` après modifications en production

## État de la base locale

Au moment du nettoyage :

- ✅ 1 utilisateur admin : `admin@local.com`
- ✅ 2 buckets storage configurés avec RLS
- ✅ Toutes les tables et fonctions de production
- ✅ Rôles et quotas seed
