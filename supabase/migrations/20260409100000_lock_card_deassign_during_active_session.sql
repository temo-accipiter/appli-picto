-- ============================================================================
-- Migration : Bloquer la désassignation de carte pendant session active_started
-- ============================================================================
--
-- PROBLÈME :
-- Le trigger précédent (20260408120000) bloquait INSERT et DELETE pendant
-- active_started, et UPDATE sur les slots VALIDÉS.
-- Mais UPDATE sur slots NON VALIDÉS était entièrement libre, y compris
-- l'opération card_id → NULL (désassignation de carte).
--
-- CONSÉQUENCE :
-- L'adulte pouvait décocher une carte dans la bibliothèque (banque/perso),
-- ce qui retirait la carte d'un slot en cours de session.
-- L'enfant se retrouvait face à un slot vide pendant la session → meltdown TSA.
--
-- DÉCISION PRODUIT :
-- Pendant active_started, les cartes assignées aux étapes ne peuvent pas être
-- retirées (card_id → NULL). La désassignation nécessite d'annuler la session.
--
-- CE QUI EST AUTORISÉ (UPDATE sur slots non validés) :
--   ✅ Assignation : NULL → card_id (remplir un slot vide)
--   ✅ Réassignation : card_id A → card_id B (changer la carte assignée)
--   ❌ Désassignation : card_id → NULL (retirer une carte d'un slot)
--
-- CE QUI NE CHANGE PAS :
--   - INSERT : toujours bloqué pendant active_started
--   - DELETE : toujours bloqué pendant active_started
--   - UPDATE slot validé : toujours bloqué (comportement inchangé)
--   - active_preview : aucun changement (tout libre avant 1ère validation)
--   - Slots récompense (kind='reward') : non concernés par ce trigger
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. Renforcement de la fonction GUARD (BEFORE)
-- ============================================================
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
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Action interdite : impossible de supprimer un slot pendant une session démarrée (slot_id=%). Annulez la session pour modifier la composition.',
      OLD.id;
  END IF;

  -- ── GUARD INSERT : Bloquer TOUT ajout pendant session démarrée ─────────────
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION
      'Action interdite : impossible d''ajouter un slot pendant une session démarrée. Annulez la session pour modifier la composition.';
  END IF;

  -- ── GUARD UPDATE ────────────────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN

    -- 1. Slot déjà validé → bloquer toute modification structurelle
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
    ELSE
      -- 2. Slot non validé → bloquer uniquement la DÉSassignation de carte
      --
      -- Assignation (NULL → card_id) et réassignation (A → B) : autorisées
      -- car elles n'impactent pas steps_total_snapshot ni la progression.
      --
      -- Désassignation (card_id → NULL) : INTERDITE car laisse l'enfant face
      -- à un slot vide pendant la session (expérience TSA désastreuse).
      IF NEW.card_id IS NULL AND OLD.card_id IS NOT NULL THEN
        RAISE EXCEPTION
          'Action interdite : impossible de retirer la carte d''une étape pendant une session démarrée (slot_id=%). Annulez la session pour modifier les cartes.',
          OLD.id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION slots_guard_validated_on_structural_change() IS
  'BEFORE trigger GUARD : Bloque INSERT et DELETE pendant active_started (composition verrouillée). Bloque UPDATE sur slots validés. Bloque la DÉSassignation (card_id → NULL) sur slots non validés pendant active_started. Autorise assignation (NULL → card) et réassignation (A → B).';

-- ============================================================
-- 2. Smoke test — Vérification de l''existence post-migration
-- ============================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'slots_guard_validated_on_structural_change'
  ), 'SMOKE TEST ÉCHOUÉ : La fonction slots_guard_validated_on_structural_change est introuvable.';

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

  RAISE NOTICE 'SMOKE TEST RÉUSSI : Guard désassignation carte (card_id → NULL) renforcé pendant active_started.';
END;
$$;

COMMIT;

-- ============================================================================
-- Ce que cette migration corrige :
-- - ✅ Désassignation carte (card_id → NULL) via bibliothèque → BLOQUÉE côté DB
-- - ✅ Slots validés : comportement inchangé (tout bloqué)
-- - ✅ Assignation (NULL → card) et réassignation (A → B) : toujours autorisées
-- - ✅ INSERT / DELETE : comportement inchangé (toujours bloqués)
-- ============================================================================
