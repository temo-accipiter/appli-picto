-- Migration: Phase 7.6 — RLS policies: Planning (timelines, slots)
-- Date: 2026-02-03
--
-- Objectif:
-- Créer policies RLS pour planning visuel (timelines + slots)
--
-- Tables affectées: timelines, slots
--
-- Invariants enforced:
-- - timelines: owner via child_profile, pas INSERT/DELETE user (triggers auto)
-- - slots: owner via timeline, locked profile => read-only
-- - execution-only mode: pas de modifications structurelles
-- - session active démarrée: slot validé verrouillé (pas modif/delete)
--
-- Décisions appliquées:
-- - D3: execution-only détecté via is_execution_only()
-- - D4: triggers gardent contexte normal (policies compatibles)
--
-- Smoke test: voir supabase/tests/phase7_6_smoke_test.sql

BEGIN;

-- ============================================================
-- TABLE: timelines
-- ============================================================
-- Owner via child_profile (FK chain)
-- INSERT/DELETE interdits user (création auto via trigger child_profile)
-- UPDATE autorisé (metadata future si nécessaire)

-- SELECT: lire timelines de ses propres child_profiles
CREATE POLICY timelines_select_owner
  ON public.timelines
  FOR SELECT
  TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM public.child_profiles WHERE account_id = auth.uid()
    )
  );

-- INSERT: interdit (création auto via trigger)
-- Pas de policy INSERT => bloqué par défaut

-- UPDATE: modifier timeline (si nécessaire, ex: metadata future)
-- Restrictions:
-- - owner via child_profile
-- - profil actif uniquement (locked => read-only)
-- - pas en execution-only mode
CREATE POLICY timelines_update_owner
  ON public.timelines
  FOR UPDATE
  TO authenticated
  USING (
    child_profile_id IN (
      SELECT id FROM public.child_profiles
      WHERE account_id = auth.uid()
      AND status = 'active'
    )
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    child_profile_id IN (
      SELECT id FROM public.child_profiles
      WHERE account_id = auth.uid()
      AND status = 'active'
    )
    AND NOT public.is_execution_only()
  );

-- DELETE: interdit usage standard
-- (suppression uniquement via cascade child_profile)
-- Pas de policy DELETE => bloqué par défaut

-- ============================================================
-- TABLE: slots
-- ============================================================
-- Owner via timeline->child_profile (FK chain)
-- Restrictions:
-- - locked profile => read-only
-- - execution-only => pas modifications structurelles
-- - session active démarrée => slot validé verrouillé

-- SELECT: lire slots des timelines de ses propres child_profiles
CREATE POLICY slots_select_owner
  ON public.slots
  FOR SELECT
  TO authenticated
  USING (
    timeline_id IN (
      SELECT t.id
      FROM public.timelines t
      JOIN public.child_profiles cp ON cp.id = t.child_profile_id
      WHERE cp.account_id = auth.uid()
    )
  );

-- INSERT: créer slot (Édition)
-- Restrictions:
-- - owner via timeline
-- - profil actif uniquement (locked => read-only)
-- - pas en execution-only mode
-- - vérif session active (via trigger si nécessaire)
CREATE POLICY slots_insert_owner
  ON public.slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    timeline_id IN (
      SELECT t.id
      FROM public.timelines t
      JOIN public.child_profiles cp ON cp.id = t.child_profile_id
      WHERE cp.account_id = auth.uid()
      AND cp.status = 'active'
    )
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier slot (DnD, assign card, change tokens)
-- Restrictions:
-- - owner via timeline
-- - profil actif uniquement (locked => read-only)
-- - pas en execution-only mode
-- - pas de modification si slot validé en session active (vérif trigger)
CREATE POLICY slots_update_owner
  ON public.slots
  FOR UPDATE
  TO authenticated
  USING (
    timeline_id IN (
      SELECT t.id
      FROM public.timelines t
      JOIN public.child_profiles cp ON cp.id = t.child_profile_id
      WHERE cp.account_id = auth.uid()
      AND cp.status = 'active'
    )
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    timeline_id IN (
      SELECT t.id
      FROM public.timelines t
      JOIN public.child_profiles cp ON cp.id = t.child_profile_id
      WHERE cp.account_id = auth.uid()
      AND cp.status = 'active'
    )
    AND NOT public.is_execution_only()
  );

-- DELETE: supprimer slot
-- Restrictions:
-- - owner via timeline
-- - profil actif uniquement (locked => read-only)
-- - pas en execution-only mode
-- - pas dernier step (trigger min_step)
-- - pas dernier reward (trigger min_reward)
-- - pas si slot validé en session active (vérif trigger)
CREATE POLICY slots_delete_owner
  ON public.slots
  FOR DELETE
  TO authenticated
  USING (
    timeline_id IN (
      SELECT t.id
      FROM public.timelines t
      JOIN public.child_profiles cp ON cp.id = t.child_profile_id
      WHERE cp.account_id = auth.uid()
      AND cp.status = 'active'
    )
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON POLICY timelines_select_owner ON public.timelines IS
  'Owner via child_profile: user can read timelines of their own profiles';

COMMENT ON POLICY timelines_update_owner ON public.timelines IS
  'Owner via child_profile: user can update timeline (active profile only, not execution-only)';

COMMENT ON POLICY slots_select_owner ON public.slots IS
  'Owner via timeline->child_profile: user can read slots of their own timelines';

COMMENT ON POLICY slots_insert_owner ON public.slots IS
  'Owner via timeline: user can create slot (active profile, not execution-only, session checks by trigger)';

COMMENT ON POLICY slots_update_owner ON public.slots IS
  'Owner via timeline: user can update slot (active profile, not execution-only, validated slots locked by trigger)';

COMMENT ON POLICY slots_delete_owner ON public.slots IS
  'Owner via timeline: user can delete slot (active profile, not execution-only, min step/reward + validated checks by trigger)';

COMMIT;
