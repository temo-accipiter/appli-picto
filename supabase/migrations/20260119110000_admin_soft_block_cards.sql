-- ============================================================================
-- Migration 010 : admin_soft_block_cards
-- ============================================================================
-- Objectif : Permettre à l'admin de désactiver/réactiver une carte utilisateur
--            SANS accès aux images (respect RGPD strict)
--
-- Mécanisme :
--   - Colonnes soft-block sur public.cards
--   - Fonction SECURITY DEFINER pour admin uniquement
--   - RLS cards UPDATE inchangée (owner-only pour updates normaux)
--
-- Prérequis : Migrations 007, 008, 009 appliquées
-- ============================================================================

-- ============================================================================
-- 1. COLONNES SOFT-BLOCK SUR public.cards
-- ============================================================================

-- is_disabled : état de blocage (défaut false = carte active)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;

-- disabled_at : timestamp du blocage (null si active)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz NULL;

-- disabled_by : UUID de l'admin qui a bloqué (null si active)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS disabled_by uuid NULL;

-- disabled_reason : raison du blocage pour audit/support (null si active)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS disabled_reason text NULL;

-- ----------------------------------------------------------------------------
-- Commentaires colonnes
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.cards.is_disabled IS
  'Soft-block : true = carte désactivée par admin, invisible pour owner';

COMMENT ON COLUMN public.cards.disabled_at IS
  'Timestamp du blocage par admin (null si carte active)';

COMMENT ON COLUMN public.cards.disabled_by IS
  'UUID de l''admin ayant bloqué la carte (null si carte active)';

COMMENT ON COLUMN public.cards.disabled_reason IS
  'Raison du blocage pour audit/support (ex: "Contenu inapproprié")';

-- ============================================================================
-- 2. FONCTION ADMIN : admin_set_card_disabled
-- ============================================================================
-- Cette fonction permet à l'admin de (dés)activer une carte utilisateur
-- SANS modifier les RLS update globales (qui restent owner-only)
--
-- SECURITY DEFINER = s'exécute avec les droits du créateur (bypass RLS)
-- La vérification is_admin() garantit que seul l'admin peut appeler

CREATE OR REPLACE FUNCTION public.admin_set_card_disabled(
  p_card_id uuid,
  p_disabled boolean,
  p_reason text DEFAULT NULL
)
RETURNS public.cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_card public.cards;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Vérifier que la carte existe et est de type 'user'
  -- (on ne bloque pas les cartes banque, elles sont gérées autrement)
  SELECT * INTO v_card
  FROM public.cards
  WHERE id = p_card_id AND owner_type = 'user';

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card not found or not a user card: %', p_card_id;
  END IF;

  -- Appliquer le blocage ou déblocage
  IF p_disabled THEN
    -- BLOCAGE : marquer la carte comme désactivée
    UPDATE public.cards
    SET
      is_disabled = true,
      disabled_at = now(),
      disabled_by = auth.uid(),
      disabled_reason = p_reason
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  ELSE
    -- DÉBLOCAGE : réactiver la carte
    -- On conserve disabled_by pour l'historique (qui a débloqué)
    -- On efface disabled_at et disabled_reason
    UPDATE public.cards
    SET
      is_disabled = false,
      disabled_at = NULL,
      disabled_by = auth.uid(),  -- Trace qui a débloqué
      disabled_reason = NULL
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  END IF;

  RETURN v_card;
END;
$$;

-- ----------------------------------------------------------------------------
-- Commentaire fonction
-- ----------------------------------------------------------------------------

COMMENT ON FUNCTION public.admin_set_card_disabled(uuid, boolean, text) IS
  'Permet à l''admin de bloquer/débloquer une carte utilisateur.

RÈGLE RGPD RESPECTÉE :
  - Admin peut désactiver une carte signalée SANS voir l''image
  - La fonction agit sur les métadonnées DB uniquement
  - Aucun accès storage n''est impliqué (policies storage inchangées)

PARAMÈTRES :
  - p_card_id : UUID de la carte à (dés)activer
  - p_disabled : true = bloquer, false = débloquer
  - p_reason : raison du blocage (optionnel, pour audit)

RETOUR :
  - La row cards mise à jour

SÉCURITÉ :
  - SECURITY DEFINER : bypass RLS pour permettre update admin
  - Vérification is_admin() : seul l''admin peut appeler
  - Ne fonctionne que sur owner_type = ''user'' (pas les cartes banque)

EXEMPLE :
  -- Bloquer une carte
  SELECT * FROM public.admin_set_card_disabled(
    ''123e4567-e89b-12d3-a456-426614174000'',
    true,
    ''Contenu signalé comme inapproprié''
  );

  -- Débloquer une carte
  SELECT * FROM public.admin_set_card_disabled(
    ''123e4567-e89b-12d3-a456-426614174000'',
    false
  );';

-- ============================================================================
-- 3. INDEX POUR REQUÊTES ADMIN
-- ============================================================================
-- Index partiel pour lister rapidement les cartes bloquées (dashboard admin)

CREATE INDEX IF NOT EXISTS idx_cards_disabled
  ON public.cards (disabled_at DESC)
  WHERE is_disabled = true;

COMMENT ON INDEX public.idx_cards_disabled IS
  'Index partiel pour dashboard admin : liste des cartes bloquées';

-- ============================================================================
-- 4. MISE À JOUR RLS SELECT : Filtrer cartes désactivées pour owner
-- ============================================================================
-- L'owner ne doit pas voir ses propres cartes désactivées
-- L'admin doit voir toutes les cartes (y compris désactivées) pour gérer

DROP POLICY IF EXISTS cards_select ON public.cards;
CREATE POLICY cards_select ON public.cards
  FOR SELECT
  USING (
    -- Bank cards : visibles par tous (anon/authenticated/admin)
    owner_type = 'bank' OR
    -- User cards pour owner : visibles seulement si NON désactivées
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      is_disabled = false
    ) OR
    -- User cards pour admin : toutes visibles (pour gestion)
    (owner_type = 'user' AND public.is_admin())
  );

-- ============================================================================
-- 5. CORRECTION DOCUMENTATION MIGRATION 009
-- ============================================================================
-- La migration 009 indiquait :
--   "✅ Admin peut supprimer/bloquer carte via DB (RLS DB cards_delete/update)"
--
-- C'était INEXACT : les RLS cards_update/delete sont owner-only.
-- L'admin ne pouvait PAS modifier/supprimer les cartes utilisateurs.
--
-- CORRECTION :
--   - Blocage admin désormais assuré par admin_set_card_disabled()
--   - Suppression admin : à implémenter si besoin (fonction similaire)
--   - RLS UPDATE/DELETE restent owner-only (comportement normal)
--
-- Cette migration 010 corrige cette dette en ajoutant le mécanisme soft-block.

-- ============================================================================
-- 6. NOTES ARCHITECTURE
-- ============================================================================
--
-- Flux blocage carte utilisateur :
-- ----------------------------------------------------------------------------
-- 1. Admin voit métadonnées carte (RLS cards_select autorise is_admin())
-- 2. Admin constate problème (via signalement, nom suspect, etc.)
-- 3. Admin appelle admin_set_card_disabled(card_id, true, 'raison')
-- 4. Fonction bypass RLS via SECURITY DEFINER
-- 5. Carte marquée is_disabled = true
-- 6. Owner ne voit plus sa carte (RLS SELECT filtre is_disabled)
-- 7. Admin peut toujours voir/gérer la carte
--
-- L'admin n'a JAMAIS vu l'image :
-- ----------------------------------------------------------------------------
-- - Métadonnées DB : nom, catégorie, dates (visible)
-- - Image storage : bucket cards-user, policies owner-only (bloqué)
-- - La fonction admin_set_card_disabled n'accède qu'aux colonnes DB
--
-- Cas d'usage :
-- ----------------------------------------------------------------------------
-- - Carte signalée par autre utilisateur (système signalement à implémenter)
-- - Nom de carte inapproprié visible dans métadonnées
-- - Demande RGPD de l'utilisateur (bloquer en attendant suppression)
-- - Investigation support (bloquer temporairement)
--
-- Réactivation :
-- ----------------------------------------------------------------------------
-- - Admin peut débloquer si signalement non justifié
-- - disabled_by conservé pour traçabilité (qui a débloqué)
-- - disabled_reason effacé au déblocage
