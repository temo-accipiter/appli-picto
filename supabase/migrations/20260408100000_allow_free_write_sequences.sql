-- Migration: Autoriser les comptes Free à créer/éditer des séquences
-- Date: 2026-04-08
--
-- Décision produit:
--   Les comptes Free peuvent désormais créer, modifier et supprimer des séquences
--   avec les cartes de la banque publique.
--   Seul le downgrade lock (is_execution_only) reste restrictif.
--
-- Modifié:
--   - can_write_sequences() : Free inclus (free, subscriber, admin)
--   - Commentaires des 6 policies write sur sequences + sequence_steps
--
-- NON modifié:
--   - Structure des policies (prédicats inchangés, seul le helper change)
--   - is_execution_only() (downgrade lock, sémantique distincte)
--   - Policies SELECT (sequences_select_owner, sequence_steps_select_owner)
--
-- Référence: FRONTEND_CONTRACT.md §3.2.5 (mis à jour)

BEGIN;

-- ============================================================
-- Helper: can_write_sequences() — Free désormais autorisé
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_write_sequences()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status account_status;
BEGIN
  SELECT status INTO v_status
  FROM public.accounts
  WHERE id = auth.uid();

  -- NULL si non authentifié ou compte inexistant
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Free, Subscriber et Admin peuvent écrire des séquences.
  -- Visitor n'est pas authentifié (local-only IndexedDB, hors portée RLS).
  RETURN v_status IN ('free', 'subscriber', 'admin');
END;
$$;

COMMENT ON FUNCTION public.can_write_sequences() IS
  'Feature gate séquençage: retourne TRUE si le compte courant peut créer/modifier/supprimer des séquences (free, subscriber ou admin). Visitor = local-only IndexedDB. SECURITY DEFINER minimal, search_path hardened.';

-- ============================================================
-- Mise à jour commentaires policies (prédicats inchangés)
-- ============================================================

COMMENT ON POLICY sequences_insert_owner ON public.sequences IS
  'Owner + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMENT ON POLICY sequences_update_owner ON public.sequences IS
  'Owner + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMENT ON POLICY sequences_delete_owner ON public.sequences IS
  'Owner + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMENT ON POLICY sequence_steps_insert_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMENT ON POLICY sequence_steps_update_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMENT ON POLICY sequence_steps_delete_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (free/subscriber/admin) + not execution-only: Visitor hors portée (local-only)';

COMMIT;
