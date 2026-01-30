-- Migration: Phase 4.3 — Invariant serveur "au moins 1 slot step"
-- Description: Bloquer suppression du dernier slot step d'une timeline
-- Date: 2026-01-30

-- Fonction trigger: Empêcher suppression du dernier slot step
CREATE OR REPLACE FUNCTION slots_enforce_min_step()
RETURNS TRIGGER AS $$
DECLARE
  step_count INTEGER;
BEGIN
  -- Si on supprime un slot de type 'step'
  IF OLD.kind = 'step' THEN
    -- Compter les slots step restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO step_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'step'
      AND id != OLD.id;

    -- Si c'est le dernier slot step, bloquer la suppression
    IF step_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Étape de la timeline (id: %). Une timeline doit contenir au minimum 1 slot Étape.', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot reward ou pas le dernier step)
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Appliquer invariant BEFORE DELETE
CREATE TRIGGER trigger_slots_enforce_min_step
  BEFORE DELETE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_enforce_min_step();

-- Commentaire
COMMENT ON FUNCTION slots_enforce_min_step() IS 'Invariant contractuel: empêche suppression du dernier slot step (timeline doit contenir au minimum 1 slot Étape)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Fonction trigger slots_enforce_min_step()
-- - Invariant serveur: timeline doit toujours contenir au minimum 1 slot kind='step'
-- - Bloque DELETE si c'est le dernier slot step de la timeline (RAISE EXCEPTION)
-- - Autorise suppression des autres slots step (tant qu'il en reste ≥1)
-- ============================================================

-- Vérifications (manuel):
-- 1. Timeline avec 2 slots step: suppression d'un step (OK)
--    DELETE FROM slots WHERE id = '<uuid_slot_step_1>' AND kind = 'step';
-- 2. Timeline avec 1 seul slot step: suppression de ce step (DOIT échouer EXCEPTION)
--    DELETE FROM slots WHERE id = '<uuid_dernier_step>' AND kind = 'step';
-- 3. Suppression d'un slot reward (toujours OK, pas concerné par invariant)
--    DELETE FROM slots WHERE id = '<uuid_slot_reward>' AND kind = 'reward';
-- 4. Timeline avec 3 steps: suppression de 2 steps successifs (OK tant qu'il en reste 1)
--    DELETE FROM slots WHERE id IN ('<uuid_step_1>', '<uuid_step_2>');
-- 5. Tentative suppression dernier step affiche message erreur explicite (OK)
--    Vérifier message: "Impossible de supprimer le dernier slot Étape de la timeline..."
