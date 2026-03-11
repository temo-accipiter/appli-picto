-- Migration: Phase 7.9 — Fix RLS séquençage : feature gate Free
-- Date: 2026-03-11
--
-- Problème corrigé:
-- Les policies write de sequences/sequence_steps utilisaient uniquement
-- is_execution_only() comme gardien restrictif.
-- is_execution_only() = downgrade lock (free + >1 profil).
-- Un Free normal (1 profil) passait sans blocage.
--
-- Contrat produit (FRONTEND_CONTRACT.md §3.2.5):
--   Créer/éditer une séquence : Free = ❌ / Subscriber = ✅ / Admin = ✅
--   Afficher mini-timeline Tableau : tous statuts = ✅ (non concerné ici)
--
-- Solution:
--   1) Créer can_write_sequences() — feature gate par plan
--   2) MODIFY les 6 policies write (sequences + sequence_steps)
--      Ajouter can_write_sequences() EN CUMULATIF avec is_execution_only()
--      Les deux gardiens restent : feature gate + downgrade lock
--
-- NON modifié:
--   - policies SELECT (sequences_select_owner, sequence_steps_select_owner)
--   - is_execution_only() (downgrade lock, sémantique distincte)
--   - is_admin() (helper admin)
--   - triggers Phase 6 (invariants séquençage)
--
-- Tables affectées: sequences, sequence_steps
-- Helpers affectés: can_write_sequences() (nouveau)

BEGIN;

-- ============================================================
-- Helper: can_write_sequences()
-- ============================================================
-- Feature gate séquençage : subscriber et admin peuvent écrire.
-- Free est en lecture seule sur les séquences.
-- Visitor n'est pas authentifié — hors portée RLS (local-only IndexedDB).
--
-- SECURITY DEFINER: permet aux policies RLS d'accéder à accounts.status
--                   sans exposition directe de la table.
-- STABLE: résultat stable dans la transaction (performance).
-- search_path hardened: cohérent avec is_admin() et is_execution_only().

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

  -- Subscriber et Admin peuvent écrire des séquences.
  -- Free = lecture seule (contrat FRONTEND_CONTRACT.md §3.2.5).
  RETURN v_status IN ('subscriber', 'admin');
END;
$$;

COMMENT ON FUNCTION public.can_write_sequences() IS
  'Feature gate séquençage: retourne TRUE si le compte courant peut créer/modifier/supprimer des séquences (subscriber ou admin). Free = lecture seule. SECURITY DEFINER minimal, search_path hardened.';

REVOKE EXECUTE ON FUNCTION public.can_write_sequences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_sequences() TO authenticated;

-- ============================================================
-- TABLE: sequences — policies write (MODIFY)
-- ============================================================
-- Seules les 3 policies write sont recréées.
-- sequences_select_owner est conservée intacte (Free peut lire).

-- INSERT: Subscriber/Admin uniquement + pas en execution-only
DROP POLICY IF EXISTS sequences_insert_owner ON public.sequences;
CREATE POLICY sequences_insert_owner
  ON public.sequences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = auth.uid()
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- UPDATE: Subscriber/Admin uniquement + pas en execution-only
DROP POLICY IF EXISTS sequences_update_owner ON public.sequences;
CREATE POLICY sequences_update_owner
  ON public.sequences
  FOR UPDATE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    account_id = auth.uid()
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- DELETE: Subscriber/Admin uniquement + pas en execution-only
DROP POLICY IF EXISTS sequences_delete_owner ON public.sequences;
CREATE POLICY sequences_delete_owner
  ON public.sequences
  FOR DELETE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- TABLE: sequence_steps — policies write (MODIFY)
-- ============================================================
-- Seules les 3 policies write sont recréées.
-- sequence_steps_select_owner est conservée intacte (Free peut lire).

-- INSERT: Subscriber/Admin uniquement + owner via séquence + pas en execution-only
DROP POLICY IF EXISTS sequence_steps_insert_owner ON public.sequence_steps;
CREATE POLICY sequence_steps_insert_owner
  ON public.sequence_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- UPDATE: Subscriber/Admin uniquement + owner via séquence + pas en execution-only
DROP POLICY IF EXISTS sequence_steps_update_owner ON public.sequence_steps;
CREATE POLICY sequence_steps_update_owner
  ON public.sequence_steps
  FOR UPDATE
  TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  )
  WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- DELETE: Subscriber/Admin uniquement + owner via séquence + pas en execution-only
DROP POLICY IF EXISTS sequence_steps_delete_owner ON public.sequence_steps;
CREATE POLICY sequence_steps_delete_owner
  ON public.sequence_steps
  FOR DELETE
  TO authenticated
  USING (
    sequence_id IN (
      SELECT id FROM public.sequences WHERE account_id = auth.uid()
    )
    AND public.can_write_sequences()
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- Commentaires policies
-- ============================================================
COMMENT ON POLICY sequences_insert_owner ON public.sequences IS
  'Owner + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en création séquence';

COMMENT ON POLICY sequences_update_owner ON public.sequences IS
  'Owner + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en modification séquence';

COMMENT ON POLICY sequences_delete_owner ON public.sequences IS
  'Owner + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en suppression séquence';

COMMENT ON POLICY sequence_steps_insert_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en création étape';

COMMENT ON POLICY sequence_steps_update_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en modification étape';

COMMENT ON POLICY sequence_steps_delete_owner ON public.sequence_steps IS
  'Owner via sequence + can_write_sequences() (subscriber/admin) + not execution-only: Free bloqué en suppression étape';

COMMIT;
