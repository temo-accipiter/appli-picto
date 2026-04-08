-- ============================================================================
-- Migration : Verrouillage composition timeline pendant session active_started
-- ============================================================================
--
-- DÉCISION PRODUIT :
-- Une session démarrée (active_started) rend la composition de la timeline
-- en lecture seule. L'adulte ne peut plus ajouter ni supprimer de slots.
-- S'il veut modifier, il doit d'abord annuler la session.
--
-- POURQUOI :
-- Le steps_total_snapshot est figé à la 1ère validation (transition active_preview
-- → active_started). Toute modification structurelle (INSERT/DELETE) après ce point
-- désynchronise le snapshot → deadlocks (Ghost Step) ou completions prématurées
-- (Meltdown TSA).
--
-- CE QUE CETTE MIGRATION CHANGE :
-- Renforce slots_guard_validated_on_structural_change() :
--   AVANT : DELETE bloqué uniquement pour slots déjà validés
--           INSERT toujours autorisé
--   APRÈS : DELETE bloqué pour TOUS les slots pendant active_started
--           INSERT bloqué pendant active_started
--           UPDATE (slots validés) : comportement inchangé
--
-- CE QUI NE CHANGE PAS :
-- - La table, les index, les autres triggers : aucune modification
-- - UPDATE sur slots non validés (changement de carte assignée) : toujours autorisé
-- - Modifications pendant active_preview : toujours autorisées (snapshot non encore pris)
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. Renforcement de la fonction GUARD (BEFORE)
-- ============================================================
-- On remplace (CREATE OR REPLACE) la fonction existante.
-- Les triggers BEFORE sont déjà attachés — ils continuent de l'appeler.
CREATE OR REPLACE FUNCTION slots_guard_validated_on_structural_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_session_id UUID;
  v_is_validated BOOLEAN;
BEGIN
  -- On ne s'intéresse qu'aux slots Étape
  IF (TG_OP = 'DELETE' AND OLD.kind <> 'step')
     OR (TG_OP IN ('UPDATE','INSERT') AND NEW.kind <> 'step') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Session active_started existante pour cette timeline ?
  SELECT s.id INTO v_active_session_id
  FROM sessions s
  WHERE s.timeline_id = COALESCE(NEW.timeline_id, OLD.timeline_id)
    AND s.state = 'active_started'
  LIMIT 1;

  IF v_active_session_id IS NULL THEN
    -- Pas de session active_started → autorisé (active_preview, completed, ou pas de session)
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ── GUARD DELETE : Bloquer TOUTE suppression pendant session démarrée ──────
  -- Avant : bloquait uniquement les slots validés (laissait passer les non-validés → Bug #4a)
  -- Après : bloque tous les slots step sans exception
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Action interdite : impossible de supprimer un slot pendant une session démarrée (slot_id=%). Annulez la session pour modifier la composition.',
      OLD.id;
  END IF;

  -- ── GUARD INSERT : Bloquer TOUT ajout pendant session démarrée ─────────────
  -- Avant : toujours autorisé (laissait passer les ajouts → Bug #4b)
  -- Après : bloque tous les INSERT de slots step
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION
      'Action interdite : impossible d''ajouter un slot pendant une session démarrée. Annulez la session pour modifier la composition.';
  END IF;

  -- ── GUARD UPDATE : Comportement inchangé ────────────────────────────────────
  -- Seuls les slots déjà validés sont bloqués en modification structurelle.
  -- Les slots non validés restent modifiables (changement de carte, etc.).
  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    IF v_is_validated THEN
      IF NEW.position IS DISTINCT FROM OLD.position
         OR NEW.card_id IS DISTINCT FROM OLD.card_id
         OR NEW.tokens IS DISTINCT FROM OLD.tokens
         OR NEW.kind IS DISTINCT FROM OLD.kind THEN
        RAISE EXCEPTION
          'Action interdite : modification d''un slot étape déjà validé (slot_id=%) pendant une session démarrée.',
          OLD.id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION slots_guard_validated_on_structural_change() IS
  'BEFORE trigger GUARD : Bloque INSERT et DELETE pendant active_started (composition verrouillée). Bloque UPDATE sur slots validés. Autorise UPDATE sur slots non validés (changement de carte).';

-- ============================================================
-- 2. Smoke test — Vérification de l''existence post-migration
-- ============================================================
DO $$
BEGIN
  -- Vérifier que la fonction existe et a été mise à jour
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'slots_guard_validated_on_structural_change'
  ), 'SMOKE TEST ÉCHOUÉ : La fonction slots_guard_validated_on_structural_change est introuvable.';

  -- Vérifier que les 3 triggers BEFORE sont toujours en place
  ASSERT (
    SELECT COUNT(*) FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'slots'
      AND t.tgname IN (
        'trigger_slots_before_delete_guard',
        'trigger_slots_before_update_guard',
        'trigger_slots_before_insert_guard'
      )
  ) = 3,
  'SMOKE TEST ÉCHOUÉ : Les 3 triggers BEFORE sur slots sont absents.';

  RAISE NOTICE 'SMOKE TEST RÉUSSI : Guard INSERT/DELETE renforcé sur slots pendant active_started.';
END;
$$;

COMMIT;

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Bug #4a (Ghost Step)    : DELETE slot non validé → BLOQUÉ
-- - ✅ Bug #4b (Meltdown TSA)  : INSERT nouveau slot    → BLOQUÉ
-- - ✅ Contrat produit : steps_total_snapshot immuable après active_started
-- - ✅ UX TSA : barre de progression stable, aucune surprise mid-session
-- - ✅ Comportement UPDATE : inchangé (carte assignable sur slot non validé)
-- - ✅ active_preview : inchangé (modifications toujours autorisées avant 1ère validation)
-- ============================================================================
