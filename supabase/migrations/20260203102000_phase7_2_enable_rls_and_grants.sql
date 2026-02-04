-- Migration: Phase 7.2 — Enable RLS + REVOKE/GRANT strict
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (explicit system column protection via policy checks)
--
-- Objectif:
-- Activer Row Level Security sur toutes les tables Phases 0-6
-- Restreindre accès par défaut (REVOKE ALL)
-- Les policies spécifiques seront créées dans migrations 7.3-7.8
--
-- Tables affectées:
-- - Identity: accounts, devices, child_profiles
-- - Library: cards, categories, user_card_categories
-- - Planning: timelines, slots
-- - Sessions: sessions, session_validations
-- - Sequences: sequences, sequence_steps
--
-- Colonnes système protégées (UPDATE restreint via policy WITH CHECK):
-- - accounts.status (géré via Stripe webhook, pas UPDATE user)
-- - child_profiles.status (géré via downgrade logic, pas UPDATE user)
-- - sessions.epoch (géré via trigger reset, monotone enforced by trigger)
--
-- NOTE: Column-level privileges not implemented (complex with RLS).
-- Protection via policy WITH CHECK clauses in migrations 7.3-7.7.
--
-- Smoke test: voir supabase/tests/phase7_smoke_tests.sql

BEGIN;

-- ============================================================
-- ENABLE RLS sur toutes tables Phases 0-6
-- ============================================================

-- Identity
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- Library
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_categories ENABLE ROW LEVEL SECURITY;

-- Planning
ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- Sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_validations ENABLE ROW LEVEL SECURITY;

-- Sequences
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- REVOKE ALL par défaut (sécurité stricte)
-- ============================================================
-- Après REVOKE, seules les policies RLS explicites autoriseront l'accès

-- Identity
REVOKE ALL ON public.accounts FROM anon, authenticated;
REVOKE ALL ON public.devices FROM anon, authenticated;
REVOKE ALL ON public.child_profiles FROM anon, authenticated;

-- Library
REVOKE ALL ON public.cards FROM anon, authenticated;
REVOKE ALL ON public.categories FROM anon, authenticated;
REVOKE ALL ON public.user_card_categories FROM anon, authenticated;

-- Planning
REVOKE ALL ON public.timelines FROM anon, authenticated;
REVOKE ALL ON public.slots FROM anon, authenticated;

-- Sessions
REVOKE ALL ON public.sessions FROM anon, authenticated;
REVOKE ALL ON public.session_validations FROM anon, authenticated;

-- Sequences
REVOKE ALL ON public.sequences FROM anon, authenticated;
REVOKE ALL ON public.sequence_steps FROM anon, authenticated;

-- ============================================================
-- GRANT minimal pour permettre policies RLS
-- ============================================================
-- Les policies RLS nécessitent que la table soit accessible
-- GRANT SELECT permet aux policies de filtrer les lignes
-- Les opérations INSERT/UPDATE/DELETE seront contrôlées par policies WITH CHECK

-- Identity
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.devices TO authenticated; -- pas DELETE (révocation only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;

-- Library
GRANT SELECT ON public.cards TO anon; -- lecture banque publique
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_card_categories TO authenticated;

-- Planning
GRANT SELECT, UPDATE ON public.timelines TO authenticated; -- pas INSERT/DELETE (triggers auto)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slots TO authenticated;

-- Sessions
GRANT SELECT, INSERT, UPDATE ON public.sessions TO authenticated; -- DELETE restreint
GRANT SELECT, INSERT, DELETE ON public.session_validations TO authenticated; -- pas UPDATE (immutable)

-- Sequences
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_steps TO authenticated;

-- ============================================================
-- Protection colonnes système (via policy WITH CHECK)
-- ============================================================
-- Les policies UPDATE (migrations 7.3-7.7) incluront WITH CHECK clauses:
--
-- accounts.status:
--   WITH CHECK (status = (SELECT status FROM accounts WHERE id = auth.uid()))
--   Empêche user de modifier son propre status (Stripe-managed)
--
-- child_profiles.status:
--   WITH CHECK (status = (SELECT status FROM child_profiles WHERE id = child_profiles.id))
--   Empêche user de modifier status profil (downgrade-managed)
--
-- sessions.epoch:
--   Déjà protégé par trigger phase5_6 (monotone enforcement)
--   Pas de policy WITH CHECK nécessaire (trigger bloque décroissance)

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON TABLE public.accounts IS 'RLS enabled: owner-only access (id = auth.uid()), status immutable via policy WITH CHECK';
COMMENT ON TABLE public.devices IS 'RLS enabled: owner-only access (account_id = auth.uid()), no DELETE';
COMMENT ON TABLE public.child_profiles IS 'RLS enabled: owner-only access (account_id = auth.uid()), status immutable via policy WITH CHECK';
COMMENT ON TABLE public.cards IS 'RLS enabled: bank published (anon) + owner-only personal (authenticated)';
COMMENT ON TABLE public.categories IS 'RLS enabled: owner-only (account_id = auth.uid())';
COMMENT ON TABLE public.user_card_categories IS 'RLS enabled: owner-only (user_id = auth.uid())';
COMMENT ON TABLE public.timelines IS 'RLS enabled: owner via child_profile';
COMMENT ON TABLE public.slots IS 'RLS enabled: owner via timeline';
COMMENT ON TABLE public.sessions IS 'RLS enabled: owner via child_profile, epoch protected by trigger';
COMMENT ON TABLE public.session_validations IS 'RLS enabled: owner via session';
COMMENT ON TABLE public.sequences IS 'RLS enabled: owner-only (account_id = auth.uid())';
COMMENT ON TABLE public.sequence_steps IS 'RLS enabled: owner via sequence';

COMMIT;
