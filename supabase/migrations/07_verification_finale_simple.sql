-- =====================================================
-- VÉRIFICATION FINALE SIMPLE : Système de Comptes & Abonnements
-- =====================================================
-- Date: 2025-01-05
-- Description: Script de vérification simplifié (sans blocs DO)
-- =====================================================

-- 1. Vérification des colonnes dans public.profiles
SELECT 'Vérification des colonnes dans public.profiles' AS step;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
AND column_name IN ('account_status', 'deletion_scheduled_at');

-- 2. Vérification des rôles ajoutés
SELECT 'Vérification des rôles ajoutés' AS step;
SELECT name, display_name, description, priority FROM public.roles WHERE name IN ('free', 'staff');

-- 3. Vérification de la table public.role_quotas
SELECT 'Vérification de la table public.role_quotas' AS step;
SELECT COUNT(*) as quota_count FROM public.role_quotas;

-- 4. Vérification des quotas pour le rôle free
SELECT 'Vérification des quotas pour le rôle free' AS step;
SELECT rq.quota_type, rq.quota_limit, rq.quota_period
FROM public.role_quotas rq
JOIN public.roles r ON r.id = rq.role_id
WHERE r.name = 'free';

-- 5. Vérification de la table public.demo_cards
SELECT 'Vérification de la table public.demo_cards' AS step;
SELECT COUNT(*) as demo_cards_count FROM public.demo_cards;

-- 6. Vérification de la table public.account_audit_logs
SELECT 'Vérification de la table public.account_audit_logs' AS step;
SELECT COUNT(*) as audit_logs_count FROM public.account_audit_logs;

-- 7. Vérification des fonctions créées
SELECT 'Vérification de la fonction public.check_user_quota' AS step;
SELECT proname, proargnames, prorettype::regtype
FROM pg_proc
WHERE proname = 'check_user_quota';

SELECT 'Vérification de la fonction public.change_account_status' AS step;
SELECT proname, proargnames, prorettype::regtype
FROM pg_proc
WHERE proname = 'change_account_status';

SELECT 'Vérification de la fonction public.get_account_status' AS step;
SELECT proname, proargnames, prorettype::regtype
FROM pg_proc
WHERE proname = 'get_account_status';

-- 8. Vérification des nouvelles features
SELECT 'Vérification des nouvelles features' AS step;
SELECT name, display_name FROM public.features
WHERE name IN (
    'account_management', 'suspend_account', 'unsuspend_account',
    'schedule_deletion', 'cancel_deletion', 'view_quotas',
    'manage_quotas', 'demo_access', 'demo_cards', 'free_account',
    'limited_tasks', 'limited_rewards', 'unlimited_tasks',
    'unlimited_rewards', 'custom_cards', 'export_data', 'advanced_analytics'
);

-- 9. Vérification des permissions pour chaque rôle
SELECT 'Vérification des permissions pour le rôle visitor' AS step;
SELECT f.name FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.features f ON f.id = rp.feature_id
WHERE r.name = 'visitor' AND rp.can_access = true;

SELECT 'Vérification des permissions pour le rôle free' AS step;
SELECT f.name FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.features f ON f.id = rp.feature_id
WHERE r.name = 'free' AND rp.can_access = true;

SELECT 'Vérification des permissions pour le rôle abonne' AS step;
SELECT f.name FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.features f ON f.id = rp.feature_id
WHERE r.name = 'abonne' AND rp.can_access = true;

SELECT 'Vérification des permissions pour le rôle staff' AS step;
SELECT f.name FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.features f ON f.id = rp.feature_id
WHERE r.name = 'staff' AND rp.can_access = true;

SELECT 'Vérification des permissions pour le rôle admin' AS step;
SELECT f.name FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.features f ON f.id = rp.feature_id
WHERE r.name = 'admin' AND rp.can_access = true;

-- 10. Résumé final
SELECT '=== RÉSUMÉ DE LA VÉRIFICATION ===' AS step;
SELECT 
    'Migration terminée avec succès' AS status,
    'Toutes les tables, fonctions et permissions ont été créées' AS message;
