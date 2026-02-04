-- Migration: Phase 7.5 — Admin support channel (targeted metadata access)
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (remove admin_list_accounts_summary, search_path + REVOKE/GRANT)
--
-- Objectif:
-- Créer canal support admin pour accès métadonnées ciblées
-- SANS image_url des cartes personnelles (D2)
-- SANS mass-surveillance (accès par account_id spécifique uniquement)
--
-- Fonction créée:
-- - admin_get_account_support_info(target_account_id UUID)
--   Retourne métadonnées support pour un compte spécifique
--   Accessible uniquement si is_admin()
--
-- BLOCKER 1: admin_list_accounts_summary SUPPRIMÉE (violait owner-only strict + mass surveillance)
--
-- Décisions appliquées:
-- - D2: Admin ne voit JAMAIS image_url personal
-- - Accès ciblé (requiert account_id explicite, pas de liste globale)
-- - SECURITY: search_path hardening + REVOKE/GRANT explicit
--
-- Smoke test: voir supabase/tests/phase7_smoke_tests.sql

BEGIN;

-- ============================================================
-- Fonction: admin_get_account_support_info
-- ============================================================
-- Retourne métadonnées support pour un compte spécifique
-- Usage: support technique ciblé (pas de mass-surveillance)
--
-- Informations retournées:
-- - Account: status, timezone, created_at (PAS d'infos sensibles)
-- - Devices count (actifs vs révoqués)
-- - Child profiles count (actifs vs locked)
-- - Cards count (personal, PAS image_url)
-- - Sessions count (actives vs completed)
--
-- Restrictions:
-- - Accessible uniquement si current user is_admin()
-- - Nécessite account_id spécifique (pas de liste globale)
-- - JAMAIS d'image_url pour personal cards (D2)

CREATE OR REPLACE FUNCTION public.admin_get_account_support_info(
  target_account_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSON;
  v_account_info JSON;
  v_devices_info JSON;
  v_profiles_info JSON;
  v_cards_info JSON;
  v_sessions_info JSON;
BEGIN
  -- Vérifier que current user est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin_get_account_support_info requires admin status'
      USING HINT = 'Only admin users can access support information';
  END IF;

  -- Account info (métadonnées non-sensibles)
  SELECT json_build_object(
    'account_id', id,
    'status', status,
    'timezone', timezone,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO v_account_info
  FROM public.accounts
  WHERE id = target_account_id;

  IF v_account_info IS NULL THEN
    RAISE EXCEPTION 'Account not found: %', target_account_id;
  END IF;

  -- Devices info (compteurs)
  SELECT json_build_object(
    'total_devices', COUNT(*),
    'active_devices', COUNT(*) FILTER (WHERE revoked_at IS NULL),
    'revoked_devices', COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)
  )
  INTO v_devices_info
  FROM public.devices
  WHERE account_id = target_account_id;

  -- Child profiles info (compteurs + list non-sensitive)
  SELECT json_build_object(
    'total_profiles', COUNT(*),
    'active_profiles', COUNT(*) FILTER (WHERE status = 'active'),
    'locked_profiles', COUNT(*) FILTER (WHERE status = 'locked'),
    'profiles', json_agg(json_build_object(
      'profile_id', id,
      'name', name,
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at ASC)
  )
  INTO v_profiles_info
  FROM public.child_profiles
  WHERE account_id = target_account_id;

  -- Cards info (compteurs, PAS image_url pour personal)
  SELECT json_build_object(
    'personal_cards_count', COUNT(*) FILTER (WHERE type = 'personal'),
    'personal_cards_current_month', COUNT(*) FILTER (
      WHERE type = 'personal'
      AND created_at >= date_trunc('month', NOW())
    )
    -- Pas de liste cards personal pour éviter exposition métadonnées
    -- Si nécessaire pour support, créer fonction séparée plus restreinte
  )
  INTO v_cards_info
  FROM public.cards
  WHERE account_id = target_account_id;

  -- Sessions info (compteurs par profil)
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'active_sessions', COUNT(*) FILTER (WHERE state IN ('active_preview', 'active_started')),
    'completed_sessions', COUNT(*) FILTER (WHERE state = 'completed')
  )
  INTO v_sessions_info
  FROM public.sessions
  WHERE child_profile_id IN (
    SELECT id FROM public.child_profiles WHERE account_id = target_account_id
  );

  -- Construire résultat final
  v_result := json_build_object(
    'account', v_account_info,
    'devices', v_devices_info,
    'profiles', v_profiles_info,
    'cards', v_cards_info,
    'sessions', v_sessions_info
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_get_account_support_info(UUID) IS
  'Admin support: get targeted account metadata (NO personal card image_url, D2). Requires admin status + specific account_id (no mass-surveillance). search_path hardened.';

-- Révoquer exécution par défaut et re-granter explicitement
-- Note: pas de GRANT car admin-only (is_admin() check inside function)
REVOKE EXECUTE ON FUNCTION public.admin_get_account_support_info(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_account_support_info(UUID) TO authenticated;

-- ============================================================
-- BLOCKER 1: admin_list_accounts_summary SUPPRIMÉE
-- ============================================================
-- Raison: Violait "accounts owner-only strict" + permettait mass surveillance
-- + utilisait auth.users.email (cross-schema dependency non sécurisé)
--
-- Pour recherche compte admin, utiliser outils externes ou
-- requêtes SQL directes avec permissions appropriées (pas via RLS/functions)

COMMIT;
