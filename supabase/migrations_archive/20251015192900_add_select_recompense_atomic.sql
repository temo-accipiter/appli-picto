-- Migration: Fonction RPC atomique pour sélection unique de récompense
-- Date: 2025-10-15
-- Objectif: Optimiser la sélection de récompense (1 requête au lieu de 2)

-- ========================================================================
-- Fonction: select_recompense_atomic
-- ========================================================================
-- Permet de sélectionner une récompense de manière atomique (1 seul appel)
-- tout en désélectionnant automatiquement les autres récompenses de l'utilisateur.
--
-- Avantages:
-- - ✅ 1 seul round-trip réseau au lieu de 2
-- - ✅ Atomicité garantie (transaction implicite)
-- - ✅ Pas de race condition
--
-- Params:
--   p_reward_id: UUID de la récompense à sélectionner
--
-- Returns:
--   La récompense sélectionnée (avec tous ses champs)
--
-- Sécurité:
--   - SECURITY DEFINER: Élévation de privilèges nécessaire pour UPDATE
--   - Vérifie que l'utilisateur possède bien la récompense
--   - Utilise auth.uid() pour isolation utilisateur
-- ========================================================================

CREATE OR REPLACE FUNCTION public.select_recompense_atomic(
  p_reward_id uuid
)
RETURNS SETOF public.recompenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Récupérer l'utilisateur courant
  v_user_id := auth.uid();

  -- Vérifier que l'utilisateur est connecté
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non connecté' USING ERRCODE = '42501';
  END IF;

  -- Vérifier que la récompense existe et appartient à l'utilisateur
  PERFORM 1
  FROM public.recompenses
  WHERE id = p_reward_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Récompense introuvable ou non autorisée' USING ERRCODE = '42501';
  END IF;

  -- 1️⃣ Désélectionner TOUTES les récompenses de l'utilisateur
  UPDATE public.recompenses
  SET selected = false,
      updated_at = now()
  WHERE user_id = v_user_id
    AND selected = true;

  -- 2️⃣ Sélectionner la récompense demandée
  UPDATE public.recompenses
  SET selected = true,
      updated_at = now()
  WHERE id = p_reward_id
    AND user_id = v_user_id;

  -- 3️⃣ Retourner la récompense sélectionnée
  RETURN QUERY
  SELECT r.*
  FROM public.recompenses r
  WHERE r.id = p_reward_id;
END;
$$;

