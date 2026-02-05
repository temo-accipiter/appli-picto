-- Migration: Phase 7.3 — RLS policies: Identity (accounts, devices, child_profiles)
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (execution-only enforcement for child_profiles INSERT)
--
-- Objectif:
-- Créer policies RLS pour tables identity (ownership racine)
--
-- Tables affectées: accounts, devices, child_profiles
--
-- Invariants enforced:
-- - accounts: owner-only (id = auth.uid()), pas d'INSERT user (trigger auth), status immutable
-- - devices: owner-only, pas de DELETE (révocation via UPDATE revoked_at)
-- - child_profiles: owner-only, locked => read-only (pas UPDATE/DELETE), status immutable
-- - execution-only mode: bloque child_profiles INSERT (structural)
--
-- Smoke test: voir supabase/tests/phase7_smoke_tests.sql

BEGIN;

-- ============================================================
-- TABLE: accounts
-- ============================================================
-- Owner-only: user peut uniquement accéder à son propre compte
-- INSERT interdit (compte créé automatiquement via trigger auth)
-- DELETE autorisé (suppression compte RGPD)

-- SELECT: lire son propre compte uniquement
CREATE POLICY accounts_select_owner
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- INSERT: interdit (créé via trigger auth.users)
-- Pas de policy INSERT => bloqué par défaut (REVOKE ALL)

-- UPDATE: modifier son propre compte uniquement (timezone, etc.)
-- IMPORTANT: accounts.status ne doit PAS être modifiable par user
-- (géré via Stripe webhook, voir WITH CHECK)
CREATE POLICY accounts_update_owner
  ON public.accounts
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- status immutable par user (pas de self-promotion admin)
    AND status = (SELECT status FROM public.accounts WHERE id = auth.uid())
  );

-- DELETE: supprimer son propre compte (RGPD)
CREATE POLICY accounts_delete_owner
  ON public.accounts
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- TABLE: devices
-- ============================================================
-- Owner-only: user peut uniquement gérer ses propres devices
-- DELETE interdit (révocation non-destructive via UPDATE revoked_at)

-- SELECT: lire ses propres devices
CREATE POLICY devices_select_owner
  ON public.devices
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- INSERT: ajouter un device (contrôle quota via trigger/fonction)
CREATE POLICY devices_insert_owner
  ON public.devices
  FOR INSERT
  TO authenticated
  WITH CHECK (account_id = auth.uid());

-- UPDATE: révoquer un device (revoked_at) uniquement
CREATE POLICY devices_update_owner
  ON public.devices
  FOR UPDATE
  TO authenticated
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- DELETE: interdit (révocation non-destructive)
-- Pas de policy DELETE => bloqué par défaut

-- ============================================================
-- TABLE: child_profiles
-- ============================================================
-- Owner-only: user peut uniquement gérer ses propres profils enfants
-- Locked profiles: read-only (pas UPDATE/DELETE si status='locked')
-- DELETE standard interdit (suppression uniquement via cascade compte RGPD)
-- execution-only mode: bloque INSERT (structural, BLOCKER 4)

-- SELECT: lire ses propres profils enfants
CREATE POLICY child_profiles_select_owner
  ON public.child_profiles
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- INSERT: créer un profil enfant (contrôle quota via trigger/fonction)
-- BLOCKER 4: bloquer si execution-only mode (downgrade free + excess profiles)
CREATE POLICY child_profiles_insert_owner
  ON public.child_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = auth.uid()
    -- status='active' par défaut (pas de création locked)
    AND status = 'active'
    -- BLOCKER 4: bloquer INSERT en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier profil enfant si actif uniquement
-- Locked profiles = read-only (downgrade)
-- IMPORTANT: child_profiles.status ne doit PAS être modifiable par user
-- (géré via downgrade logic, voir WITH CHECK)
CREATE POLICY child_profiles_update_owner
  ON public.child_profiles
  FOR UPDATE
  TO authenticated
  USING (
    account_id = auth.uid()
    -- Peut modifier uniquement si profil actif
    AND status = 'active'
  )
  WITH CHECK (
    account_id = auth.uid()
    -- status immutable par user (pas de unlock manuel)
    AND status = (SELECT status FROM public.child_profiles WHERE id = child_profiles.id)
  );

-- DELETE: interdit en usage standard
-- Suppression autorisée uniquement via:
-- - cascade compte (RGPD)
-- - maintenance technique (bypass RLS)
-- Pas de policy DELETE => bloqué par défaut pour users

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON POLICY accounts_select_owner ON public.accounts IS
  'Owner-only: user can only read their own account (id = auth.uid())';

COMMENT ON POLICY accounts_update_owner ON public.accounts IS
  'Owner-only: user can update their own account (timezone, etc.) but NOT status (Stripe-managed, WITH CHECK enforced)';

COMMENT ON POLICY accounts_delete_owner ON public.accounts IS
  'Owner-only: user can delete their own account (RGPD)';

COMMENT ON POLICY devices_select_owner ON public.devices IS
  'Owner-only: user can only read their own devices';

COMMENT ON POLICY devices_insert_owner ON public.devices IS
  'Owner-only: user can add device (quota enforced by trigger)';

COMMENT ON POLICY devices_update_owner ON public.devices IS
  'Owner-only: user can revoke device (UPDATE revoked_at), DELETE forbidden';

COMMENT ON POLICY child_profiles_select_owner ON public.child_profiles IS
  'Owner-only: user can only read their own child profiles';

COMMENT ON POLICY child_profiles_insert_owner ON public.child_profiles IS
  'Owner-only: user can create child profile (quota enforced by trigger, active only, blocked in execution-only mode)';

COMMENT ON POLICY child_profiles_update_owner ON public.child_profiles IS
  'Owner-only: user can update active child profiles (locked = read-only, status immutable via WITH CHECK)';

COMMIT;
