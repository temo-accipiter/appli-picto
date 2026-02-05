-- Migration: Phase 7.1 — RLS helpers (is_admin, is_execution_only)
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (search_path + REVOKE/GRANT)
--
-- Objectif:
-- Créer fonctions helper SECURITY DEFINER minimales pour policies RLS
--
-- Fonctions créées:
-- - is_admin() : retourne TRUE si current user a status='admin'
-- - is_execution_only() : détecte mode execution-only (free + excess profiles)
--
-- Décisions appliquées:
-- - D3: execution-only := status='free' AND COUNT(child_profiles)>1
-- - D4: is_admin() minimal (lit uniquement compte courant, pas masse surveillance)
-- - SECURITY: search_path hardening + REVOKE/GRANT explicit
--
-- Smoke test: voir supabase/tests/phase7_smoke_tests.sql

BEGIN;

-- ============================================================
-- Fonction: is_admin() - minimal SECURITY DEFINER
-- ============================================================
-- Retourne TRUE si l'utilisateur courant est admin
-- SECURITY DEFINER: permet aux policies RLS d'accéder à accounts.status
--                   sans exposition directe de la table
-- Minimal: lit UNIQUEMENT le compte de auth.uid() (pas de masse surveillance)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status account_status;
BEGIN
  -- Lire uniquement le statut du compte courant
  SELECT status INTO v_status
  FROM public.accounts
  WHERE id = auth.uid();

  -- NULL si pas authentifié ou compte inexistant
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN v_status = 'admin';
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'RLS helper: returns TRUE if current user (auth.uid()) has status=admin. SECURITY DEFINER minimal (reads only current user account). search_path hardened.';

-- Révoquer exécution par défaut et re-granter explicitement
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon; -- needed for some policies

-- ============================================================
-- Fonction: is_execution_only() - détecte downgrade sans flag
-- ============================================================
-- Retourne TRUE si l'utilisateur courant est en mode "execution-only"
-- execution-only := status='free' AND COUNT(child_profiles) > 1
-- (PRODUCT_MODEL.md D3: détection sans nouveau flag/colonne)
--
-- Usage: interdire modifications structurelles après downgrade
-- Permet: exécution sessions existantes
CREATE OR REPLACE FUNCTION public.is_execution_only()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status account_status;
  v_profile_count INTEGER;
BEGIN
  -- Lire statut + compter profils pour le compte courant
  SELECT a.status, COUNT(cp.id)
  INTO v_status, v_profile_count
  FROM public.accounts a
  LEFT JOIN public.child_profiles cp ON cp.account_id = a.id
  WHERE a.id = auth.uid()
  GROUP BY a.status;

  -- NULL si pas authentifié ou compte inexistant
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- execution-only = free + excess profiles (>1 pour Free)
  RETURN v_status = 'free' AND v_profile_count > 1;
END;
$$;

COMMENT ON FUNCTION public.is_execution_only() IS
  'RLS helper: returns TRUE if current user is in execution-only mode (status=free AND has >1 child_profiles). Used to restrict structural edits after downgrade. search_path hardened.';

-- Révoquer exécution par défaut et re-granter explicitement
REVOKE EXECUTE ON FUNCTION public.is_execution_only() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_execution_only() TO authenticated;

COMMIT;
