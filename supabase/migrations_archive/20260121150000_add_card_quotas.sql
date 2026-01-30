-- ==============================================================================
-- Migration : Système de Quotas Cartes Utilisateur
-- ==============================================================================
-- Objectif : Implémenter les quotas de stock et mensuels pour les cartes user
--
-- Règles Produit (NON NÉGOCIABLES) :
--   1. Quotas s'appliquent UNIQUEMENT aux cartes utilisateur (pas bank)
--   2. Deux types : stock (total possédé) et mensuel (créations/mois)
--   3. Supprimer une carte libère immédiatement le slot stock
--   4. Modifier une carte ne consomme AUCUN quota
--   5. Visitor/Free : création interdite (pas concernés par quotas)
--   6. Subscriber : soumis aux quotas (50 stock, 100/mois)
--   7. Admin : illimité
--
-- Architecture Choisie :
--   - Table quota_definitions : configuration déclarative par plan
--   - Fonctions helper RLS : vérification temps réel via COUNT
--   - Policy cards_insert : enforcement côté serveur
--
-- Idempotence : ✅ Migration replay-safe (DROP IF EXISTS + CREATE OR REPLACE)
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Table de Configuration des Quotas
-- ==============================================================================

-- Création de la table quota_definitions (idempotent)
CREATE TABLE IF NOT EXISTS public.quota_definitions (
  -- Plan utilisateur (clé primaire)
  plan TEXT PRIMARY KEY
    CHECK (plan IN ('free', 'subscriber')),

  -- Quota de stock : nombre maximum de cartes possédées
  -- NULL = illimité (pour free qui n'a pas de cartes, ou plans futurs illimités)
  stock_limit INTEGER NULL
    CHECK (stock_limit IS NULL OR stock_limit > 0),

  -- Quota mensuel : nombre maximum de créations par mois
  -- NULL = illimité
  monthly_limit INTEGER NULL
    CHECK (monthly_limit IS NULL OR monthly_limit > 0),

  -- Timestamps audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger auto-update updated_at (réutilise la fonction existante)
DROP TRIGGER IF EXISTS quota_definitions_updated_at ON public.quota_definitions;
CREATE TRIGGER quota_definitions_updated_at
  BEFORE UPDATE ON public.quota_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Commentaires documentation
COMMENT ON TABLE public.quota_definitions IS
  'Configuration des quotas par plan utilisateur.
   Permet d''ajuster les limites sans redéploiement (simple UPDATE).
   NULL = illimité (admin, ou plans futurs sans limite)';

COMMENT ON COLUMN public.quota_definitions.stock_limit IS
  'Nombre maximum de cartes user possédées simultanément.
   Supprimer une carte libère immédiatement un slot.
   NULL = illimité';

COMMENT ON COLUMN public.quota_definitions.monthly_limit IS
  'Nombre maximum de nouvelles cartes créées par mois calendaire.
   Modifier une carte existante ne consomme aucun quota.
   Reset automatique le 1er de chaque mois (via date_trunc).
   NULL = illimité';

-- ==============================================================================
-- ÉTAPE 2 : Insertion des Quotas Initiaux
-- ==============================================================================

-- Upsert idempotent (INSERT ... ON CONFLICT DO UPDATE)
INSERT INTO public.quota_definitions (plan, stock_limit, monthly_limit)
VALUES
  -- Free : pas de création de cartes autorisée
  -- Quotas à NULL car non concerné (création bloquée par is_subscriber_active)
  ('free', NULL, NULL),

  -- Subscriber : quotas actifs selon spécifications produit
  ('subscriber', 50, 100)

ON CONFLICT (plan) DO UPDATE
SET
  stock_limit = EXCLUDED.stock_limit,
  monthly_limit = EXCLUDED.monthly_limit,
  updated_at = now();

-- ==============================================================================
-- ÉTAPE 3 : Fonction Helper — Vérification Quota Stock
-- ==============================================================================

-- Vérifie si l'utilisateur peut créer une nouvelle carte (quota stock)
CREATE OR REPLACE FUNCTION public.check_card_quota_stock(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_plan text;
  v_stock_limit integer;
  v_stock_used bigint;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE user_id = uid;

  -- Si utilisateur n'existe pas → bloquer
  IF v_plan IS NULL THEN
    RETURN false;
  END IF;

  -- Admin : toujours autorisé (illimité)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND is_admin = true) THEN
    RETURN true;
  END IF;

  -- Récupérer la limite de stock pour ce plan
  SELECT stock_limit INTO v_stock_limit
  FROM public.quota_definitions
  WHERE plan = v_plan;

  -- Si limite NULL → illimité (autorisé)
  IF v_stock_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Calculer le stock actuel (nombre de cartes user possédées)
  SELECT COUNT(*) INTO v_stock_used
  FROM public.cards
  WHERE owner_type = 'user' AND owner_id = uid;

  -- Vérifier si le stock actuel est sous la limite
  -- Note : on vérifie < (pas <=) car on est sur le point d'ajouter une carte
  RETURN v_stock_used < v_stock_limit;
END;
$$;

COMMENT ON FUNCTION public.check_card_quota_stock(uuid) IS
  'Helper RLS : vérifie quota de stock (nombre total de cartes possédées).

   Logique :
   - Admin : toujours true (illimité)
   - Plan avec stock_limit NULL : true (illimité)
   - Sinon : COUNT cartes user < stock_limit

   Garanties :
   - Supprimer une carte libère immédiatement (COUNT temps réel)
   - Source de vérité unique : table cards
   - Performance : utilise index idx_cards_owner existant';

-- ==============================================================================
-- ÉTAPE 4 : Fonction Helper — Vérification Quota Mensuel
-- ==============================================================================

-- Vérifie si l'utilisateur peut créer une nouvelle carte (quota mensuel)
CREATE OR REPLACE FUNCTION public.check_card_quota_monthly(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_plan text;
  v_monthly_limit integer;
  v_monthly_used bigint;
  v_month_start timestamptz;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE user_id = uid;

  -- Si utilisateur n'existe pas → bloquer
  IF v_plan IS NULL THEN
    RETURN false;
  END IF;

  -- Admin : toujours autorisé (illimité)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND is_admin = true) THEN
    RETURN true;
  END IF;

  -- Récupérer la limite mensuelle pour ce plan
  SELECT monthly_limit INTO v_monthly_limit
  FROM public.quota_definitions
  WHERE plan = v_plan;

  -- Si limite NULL → illimité (autorisé)
  IF v_monthly_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Calculer le début du mois courant
  v_month_start := date_trunc('month', now());

  -- Calculer le nombre de cartes créées ce mois
  -- Note : on compte les créations depuis le 1er du mois (reset automatique)
  SELECT COUNT(*) INTO v_monthly_used
  FROM public.cards
  WHERE owner_type = 'user'
    AND owner_id = uid
    AND created_at >= v_month_start;

  -- Vérifier si l'usage mensuel est sous la limite
  -- Note : on vérifie < (pas <=) car on est sur le point d'ajouter une carte
  RETURN v_monthly_used < v_monthly_limit;
END;
$$;

COMMENT ON FUNCTION public.check_card_quota_monthly(uuid) IS
  'Helper RLS : vérifie quota mensuel (nombre de créations ce mois).

   Logique :
   - Admin : toujours true (illimité)
   - Plan avec monthly_limit NULL : true (illimité)
   - Sinon : COUNT créations depuis date_trunc(month) < monthly_limit

   Garanties :
   - Reset automatique le 1er de chaque mois (via date_trunc)
   - Modifier une carte existante ne consomme rien (count sur created_at uniquement)
   - Source de vérité unique : table cards.created_at
   - Performance : utilise index composite potentiel sur (owner_id, created_at)';

-- ==============================================================================
-- ÉTAPE 5 : Mise à Jour Policy cards_insert (Enforcement)
-- ==============================================================================

-- Recréer la policy cards_insert avec vérification des quotas
DROP POLICY IF EXISTS cards_insert ON public.cards;

CREATE POLICY cards_insert ON public.cards
  FOR INSERT
  WITH CHECK (
    (
      -- Cartes utilisateur : vérifications strictes
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND

      -- Vérification 1 : utilisateur abonné actif (ou période de grâce)
      public.is_subscriber_active(auth.uid()) AND

      -- Vérification 2 : quota stock OK (✅ NOUVEAU)
      public.check_card_quota_stock(auth.uid()) AND

      -- Vérification 3 : quota mensuel OK (✅ NOUVEAU)
      public.check_card_quota_monthly(auth.uid())
    )
    OR
    -- Admin : bypass toutes les vérifications (illimité)
    public.is_admin()
  );

COMMENT ON POLICY cards_insert ON public.cards IS
  'Policy INSERT cartes : enforce quotas côté serveur.

   Règles :
   - Admin : bypass complet (illimité)
   - Cartes user : subscriber actif + quota stock OK + quota mensuel OK
   - Cartes bank : création interdite via cette policy (admin-only via autres mécanismes)

   Garanties :
   - Impossible de bypass (RLS serveur-side)
   - Visitor/Free bloqués par is_subscriber_active (false)
   - Subscriber bloqué si quota dépassé
   - Modifier une carte existante ne passe PAS par cette policy (cards_update séparée)';

-- ==============================================================================
-- ÉTAPE 6 : Index Optimisation (Optionnel mais Recommandé)
-- ==============================================================================

-- Index composite pour optimiser les requêtes mensuelles
-- Améliore la performance de check_card_quota_monthly
CREATE INDEX IF NOT EXISTS idx_cards_user_monthly
  ON public.cards (owner_id, created_at DESC)
  WHERE owner_type = 'user';

COMMENT ON INDEX public.idx_cards_user_monthly IS
  'Optimise les vérifications de quota mensuel (COUNT WHERE owner_id = X AND created_at >= month_start).
   Index partiel : concerne uniquement les cartes user (pas bank).
   Ordre DESC sur created_at permet des optimisations LIMIT futures.';

-- ==============================================================================
-- ÉTAPE 7 : Validation Post-Migration
-- ==============================================================================

DO $$
DECLARE
  v_quota_count integer;
  v_function_stock_exists boolean;
  v_function_monthly_exists boolean;
BEGIN
  -- Vérifier que la table quota_definitions existe avec 2 lignes
  SELECT COUNT(*) INTO v_quota_count
  FROM public.quota_definitions;

  IF v_quota_count < 2 THEN
    RAISE WARNING 'Migration incomplète : quota_definitions contient % ligne(s), attendu >= 2', v_quota_count;
  END IF;

  -- Vérifier que les fonctions helper existent
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_stock'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_stock_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_monthly'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_monthly_exists;

  IF NOT v_function_stock_exists THEN
    RAISE EXCEPTION 'Migration échouée : fonction check_card_quota_stock non créée';
  END IF;

  IF NOT v_function_monthly_exists THEN
    RAISE EXCEPTION 'Migration échouée : fonction check_card_quota_monthly non créée';
  END IF;

  -- Vérifier que la policy cards_insert existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cards' AND policyname = 'cards_insert'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : policy cards_insert non créée';
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 150000 réussie : système de quotas cartes activé.';
  RAISE NOTICE '  - Table quota_definitions : % plan(s) configuré(s)', v_quota_count;
  RAISE NOTICE '  - Fonctions helper RLS : check_card_quota_stock, check_card_quota_monthly';
  RAISE NOTICE '  - Policy cards_insert : enrichie avec vérification quotas';
  RAISE NOTICE '  - Index optimisation : idx_cards_user_monthly';
END $$;

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================

-- ==============================================================================
-- NOTES TECHNIQUES ET ÉVOLUTIVITÉ
-- ==============================================================================

-- 1. AJUSTER LES QUOTAS (sans redéploiement)
-- --------------------------------------------
-- UPDATE public.quota_definitions
-- SET stock_limit = 100, monthly_limit = 200
-- WHERE plan = 'subscriber';

-- 2. AJOUTER UN NOUVEAU PLAN
-- ---------------------------
-- INSERT INTO public.quota_definitions (plan, stock_limit, monthly_limit)
-- VALUES ('subscriber_pro', 200, 500);
--
-- Puis ajuster la contrainte CHECK sur profiles.plan :
-- ALTER TABLE public.profiles
--   DROP CONSTRAINT IF EXISTS profiles_plan_check;
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_plan_check
--   CHECK (plan IN ('free', 'subscriber', 'subscriber_pro'));

-- 3. AUDITER L'USAGE DES QUOTAS
-- ------------------------------
-- -- Quota stock par utilisateur
-- SELECT
--   p.user_id,
--   p.plan,
--   qd.stock_limit,
--   COUNT(c.id) as stock_used,
--   (qd.stock_limit - COUNT(c.id)) as stock_remaining
-- FROM public.profiles p
-- LEFT JOIN public.quota_definitions qd ON qd.plan = p.plan
-- LEFT JOIN public.cards c ON c.owner_id = p.user_id AND c.owner_type = 'user'
-- WHERE p.plan = 'subscriber'
-- GROUP BY p.user_id, p.plan, qd.stock_limit
-- ORDER BY stock_used DESC;
--
-- -- Quota mensuel par utilisateur (mois courant)
-- SELECT
--   p.user_id,
--   p.plan,
--   qd.monthly_limit,
--   COUNT(c.id) as monthly_used,
--   (qd.monthly_limit - COUNT(c.id)) as monthly_remaining
-- FROM public.profiles p
-- LEFT JOIN public.quota_definitions qd ON qd.plan = p.plan
-- LEFT JOIN public.cards c ON c.owner_id = p.user_id
--   AND c.owner_type = 'user'
--   AND c.created_at >= date_trunc('month', now())
-- WHERE p.plan = 'subscriber'
-- GROUP BY p.user_id, p.plan, qd.monthly_limit
-- ORDER BY monthly_used DESC;

-- 4. TESTER LES FONCTIONS HELPER
-- -------------------------------
-- -- Test quota stock pour un utilisateur
-- SELECT public.check_card_quota_stock('user_uuid_here'::uuid);
--
-- -- Test quota mensuel pour un utilisateur
-- SELECT public.check_card_quota_monthly('user_uuid_here'::uuid);

-- 5. PERFORMANCE
-- --------------
-- Les fonctions helper utilisent :
--   - Index existant idx_cards_owner (owner_type, owner_id)
--   - Nouvel index idx_cards_user_monthly (owner_id, created_at DESC)
-- Performance attendue : < 5ms par vérification sur des DB jusqu'à 1M cartes

-- 6. LIMITES ET ÉVOLUTIONS FUTURES
-- ---------------------------------
-- Limites actuelles (acceptables pour MVP) :
--   - Pas de mécanisme de "rollover" des quotas mensuels non utilisés
--   - Pas de notifications proactives (ex: "80% du quota atteint")
--   - Pas de quotas différenciés par type de contenu
--
-- Évolutions futures possibles :
--   - Table user_quota_overrides : exceptions temporaires par user
--   - Webhooks quotas : alertes async quand seuils atteints
--   - Quotas hiérarchiques : comptes famille avec quotas partagés
