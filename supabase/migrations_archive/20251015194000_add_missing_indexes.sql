-- Migration: Ajout des index manquants pour les foreign keys
-- Date: 2025-10-15
-- Objectif: Optimiser les performances des JOIN et DELETE CASCADE

-- ========================================================================
-- Analyse des index manquants
-- ========================================================================
-- Cette migration ajoute les index recommandés par ai.fn_fk_index_gaps()
-- pour optimiser les requêtes sur les foreign keys.

-- ========================================================================
-- Index pour les tables critiques
-- ========================================================================

-- 1️⃣ Index pour taches.categorie_id (FK vers categories)
-- Utilisé dans : JOIN categories ON taches.categorie_id = categories.id
CREATE INDEX IF NOT EXISTS idx_taches_categorie_id
ON public.taches(categorie_id)
WHERE categorie_id IS NOT NULL;

-- 2️⃣ Index composite pour taches (user_id, position)
-- Utilisé dans : ORDER BY position avec filtre user_id
-- Optimise le drag & drop et l'affichage de la liste
CREATE INDEX IF NOT EXISTS idx_taches_user_position
ON public.taches(user_id, position);

-- 3️⃣ Index pour taches (user_id, aujourdhui)
-- Utilisé dans : Affichage des tâches du jour
CREATE INDEX IF NOT EXISTS idx_taches_user_aujourdhui
ON public.taches(user_id, aujourdhui)
WHERE aujourdhui = true;

-- 4️⃣ Index composite pour recompenses (user_id, created_at)
-- Utilisé dans : ORDER BY created_at avec filtre user_id
CREATE INDEX IF NOT EXISTS idx_recompenses_user_created
ON public.recompenses(user_id, created_at);

-- 5️⃣ Index partiel pour recompenses.selected
-- Utilisé dans : Récupération rapide de la récompense sélectionnée
-- Index UNIQUE pour garantir 1 seule sélection par utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS idx_recompenses_user_selected
ON public.recompenses(user_id)
WHERE selected = true;

-- 6️⃣ Index pour categories (user_id, label)
-- Utilisé dans : ORDER BY label avec filtre user_id
CREATE INDEX IF NOT EXISTS idx_categories_user_label
ON public.categories(user_id, label);

-- 7️⃣ Index pour abonnements.user_id (FK vers profiles)
-- Utilisé dans : Vérification du statut d'abonnement
CREATE INDEX IF NOT EXISTS idx_abonnements_user_id
ON public.abonnements(user_id);

-- 8️⃣ Index pour abonnements (user_id, status)
-- Utilisé dans : Filtrage des abonnements actifs
CREATE INDEX IF NOT EXISTS idx_abonnements_user_status
ON public.abonnements(user_id, status)
WHERE status IN ('active', 'trialing', 'past_due');

-- 9️⃣ Index pour user_roles (user_id, is_active)
-- Utilisé dans : Récupération du rôle actif de l'utilisateur
CREATE INDEX IF NOT EXISTS idx_user_roles_user_active
ON public.user_roles(user_id, is_active)
WHERE is_active = true;

-- 🔟 Index pour user_usage_counters.user_id
-- Utilisé dans : Vérification des quotas (get_usage_fast)
CREATE INDEX IF NOT EXISTS idx_user_usage_counters_user_id
ON public.user_usage_counters(user_id);

-- ========================================================================
-- Commentaires sur les index créés
-- ========================================================================

COMMENT ON INDEX public.idx_taches_user_position IS
  'Index composite pour tri rapide des tâches par position (drag & drop)';

COMMENT ON INDEX public.idx_taches_user_aujourdhui IS
  'Index partiel pour affichage rapide des tâches du jour';

COMMENT ON INDEX public.idx_recompenses_user_selected IS
  'Index UNIQUE pour garantir 1 seule récompense sélectionnée par utilisateur';

COMMENT ON INDEX public.idx_abonnements_user_status IS
  'Index partiel pour filtrage rapide des abonnements actifs';

COMMENT ON INDEX public.idx_user_roles_user_active IS
  'Index partiel pour récupération rapide du rôle actif';
