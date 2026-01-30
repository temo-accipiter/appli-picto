-- Migration: Phase 4.4 — Invariant serveur "au moins 1 slot reward"
-- Description: Bloquer suppression du dernier slot reward d'une timeline
-- Date: 2026-01-30

-- Fonction trigger: Empêcher suppression du dernier slot reward
CREATE OR REPLACE FUNCTION slots_enforce_min_reward()
RETURNS TRIGGER AS $$
DECLARE
  reward_count INTEGER;
BEGIN
  -- Si on supprime un slot de type 'reward'
  IF OLD.kind = 'reward' THEN
    -- Compter les slots reward restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO reward_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'reward'
      AND id != OLD.id;

    -- Si c'est le dernier slot reward, bloquer la suppression
    IF reward_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Récompense de la timeline (id: %). Une timeline doit toujours contenir au moins 1 slot Récompense (peut être vide).', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot step ou pas le dernier reward)
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Appliquer invariant BEFORE DELETE
CREATE TRIGGER trigger_slots_enforce_min_reward
  BEFORE DELETE ON slots
  FOR EACH ROW
  EXECUTE FUNCTION slots_enforce_min_reward();

-- Commentaire
COMMENT ON FUNCTION slots_enforce_min_reward() IS 'Invariant contractuel: empêche suppression du dernier slot reward (timeline doit toujours contenir au moins 1 slot Récompense, peut être vide)';

-- ============================================================
-- Ce que cette migration introduit:
-- - Fonction trigger slots_enforce_min_reward()
-- - Invariant serveur: timeline doit toujours contenir au minimum 1 slot kind='reward' (structure minimale)
-- - Bloque DELETE si c'est le dernier slot reward de la timeline (RAISE EXCEPTION)
-- - Autorise suppression des autres slots reward (tant qu'il en reste ≥1)
-- ============================================================

-- Vérifications (manuel):
-- 1. Timeline avec 2 slots reward: suppression d'un reward (OK)
--    DELETE FROM slots WHERE id = '<uuid_slot_reward_1>' AND kind = 'reward';
-- 2. Timeline avec 1 seul slot reward: suppression de ce reward (DOIT échouer EXCEPTION)
--    DELETE FROM slots WHERE id = '<uuid_dernier_reward>' AND kind = 'reward';
-- 3. Suppression d'un slot step (OK, pas concerné par cet invariant, voir trigger min_step)
--    DELETE FROM slots WHERE id = '<uuid_slot_step>' AND kind = 'step';
-- 4. Timeline avec structure minimale (1 step + 1 reward): tentative DELETE reward (DOIT échouer)
--    DELETE FROM slots WHERE kind = 'reward' AND timeline_id = '<uuid_timeline>';
-- 5. Tentative suppression dernier reward affiche message erreur explicite (OK)
--    Vérifier message: "Impossible de supprimer le dernier slot Récompense de la timeline..."
-- 6. Combinaison invariants: timeline doit toujours avoir ≥1 step ET ≥1 reward (OK)
--    Les deux triggers (min_step + min_reward) garantissent la structure minimale contractuelle
