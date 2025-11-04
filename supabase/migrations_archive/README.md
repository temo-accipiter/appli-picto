# Archive des migrations

## Date d'archivage : 2025-11-01

Ces migrations ont été archivées car le projet a été consolidé avec un dump complet de production.

## Contenu

16 fichiers de migration couvrant la période du 15 octobre 2025 au 30 octobre 2025.

## Migrations archivées

1. `20251015070601_initial_schema.sql` - Schéma initial (131 KB)
2. `20251015164829_add_get_usage_fast_no_params.sql` - Fonction usage rapide
3. `20251015192900_add_select_recompense_atomic.sql` - Sélection atomique récompenses
4. `20251015193500_add_check_user_quotas_bulk.sql` - Vérification quotas bulk
5. `20251015194000_add_missing_indexes.sql` - Ajout indexes manquants
6. `20251017000000_add_get_users_with_roles.sql` - Fonction utilisateurs avec rôles
7. `20251022233158_seed_roles_and_quotas.sql` - Seed rôles et quotas
8. `20251024000001_enhance_user_assets.sql` - Amélioration user_assets
9. `20251024000002_add_check_duplicate_image.sql` - Vérification images dupliquées
10. `20251024000003_add_image_metrics.sql` - Métriques images
11. `20251024000004_add_check_image_quota.sql` - Vérification quota images
12. `20251025093045_fix_quota_type_ambiguity.sql` - Fix ambiguïté type quota
13. `20251025100000_fix_quota_ambiguity_final.sql` - Fix final ambiguïté quota
14. `20251029000000_add_demo_cards_label_key.sql` - Ajout label_key demo cards
15. `20251029100000_add_toasts_enabled.sql` - Ajout toasts_enabled
16. `20251030223515_secure_get_users_with_roles.sql` - Sécurisation get_users_with_roles

## État actuel

Le projet utilise maintenant `supabase/schema.sql` comme source unique de vérité, généré depuis le dump de production.

Une nouvelle migration consolidée a été créée pour refléter l'état actuel du schéma.

## Restauration

Si vous avez besoin de consulter ces migrations pour comprendre l'historique des changements, elles sont toutes préservées ici.

**Ne pas** réappliquer ces migrations - elles sont archivées à des fins de référence uniquement.
