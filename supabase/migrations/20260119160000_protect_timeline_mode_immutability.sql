-- ==============================================================================
-- Migration : Protection de l'immuabilité du champ timelines.mode
-- ==============================================================================
--
-- BUT :
--   Empêcher la modification du champ `mode` après création d'une timeline.
--   Raison : changer planning↔sequence après coup violerait les invariants
--   (slots existants pourraient devenir incohérents).
--
-- INVARIANTS GARANTIS :
--   1. Une fois une timeline créée en mode='planning', elle reste planning
--   2. Une fois une timeline créée en mode='sequence', elle reste séquence
--   3. Le mode ne peut JAMAIS être modifié après INSERT (immutable)
--
-- IMPACT SUR DONNÉES EXISTANTES :
--   - Aucun impact : cette migration ajoute uniquement une protection pour le futur
--   - Les timelines existantes conservent leur mode actuel
--   - Aucune modification de données
--
-- IDEMPOTENCE :
--   - Migration replay-safe : CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER
--   - Peut être exécutée plusieurs fois sans erreur
--
-- RATIONNEL TECHNIQUE :
--   Si on autorisait planning→sequence :
--     - Les slots reward existants deviendraient invalides
--     - Les jetons non-zéro violeraient les contraintes
--   Si on autorisait sequence→planning :
--     - Moins grave, mais perte de cohérence conceptuelle
--   Solution MVP : mode immuable, supprimer/recréer si vraiment nécessaire
--
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Trigger pour empêcher modification du champ mode (IDEMPOTENT)
-- ==============================================================================

-- Fonction trigger : empêcher UPDATE de timelines.mode
CREATE OR REPLACE FUNCTION public.prevent_timeline_mode_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si le mode a changé
  IF NEW.mode != OLD.mode THEN
    RAISE EXCEPTION 'Impossible de modifier le mode d''une timeline après sa création (id: %, ancien mode: %, nouveau mode: %)',
      OLD.id, OLD.mode, NEW.mode
      USING HINT = 'Le mode d''une timeline est immuable. Pour changer de mode, supprimez la timeline et recréez-en une nouvelle avec le mode souhaité.';
  END IF;

  -- Le mode n'a pas changé, autoriser l'UPDATE
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_timeline_mode_change() IS
'Trigger function : empêche la modification du champ mode d''une timeline après création (immuabilité). Garantit la cohérence des contraintes sur les slots.';

-- Créer le trigger sur la table timelines (IDEMPOTENT)
DROP TRIGGER IF EXISTS prevent_timeline_mode_change_trigger ON public.timelines;

CREATE TRIGGER prevent_timeline_mode_change_trigger
BEFORE UPDATE OF mode ON public.timelines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_timeline_mode_change();

COMMENT ON TRIGGER prevent_timeline_mode_change_trigger ON public.timelines IS
'Empêche la modification du champ mode après création (immuabilité). Protège contre les violations d''invariants (reward/jetons dans séquences).';

-- ==============================================================================
-- ÉTAPE 2 : Validation post-migration
-- ==============================================================================

DO $$
BEGIN
  -- Vérifier que le trigger existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'timelines'
    AND trigger_name = 'prevent_timeline_mode_change_trigger'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : trigger prevent_timeline_mode_change_trigger non créé';
  END IF;

  -- Vérifier que la fonction existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'prevent_timeline_mode_change'
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Migration échouée : fonction prevent_timeline_mode_change non créée';
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 160000 réussie : champ timelines.mode protégé (immuable). Trigger actif.';
END $$;

-- ==============================================================================
-- ÉTAPE 3 : Documentation
-- ==============================================================================

-- Mettre à jour le commentaire sur la colonne mode pour documenter l'immuabilité
COMMENT ON COLUMN public.timelines.mode IS
'Mode de la timeline : "planning" (reward + jetons autorisés) ou "sequence" (uniquement steps, jetons=0, pas de reward). IMMUABLE après création (trigger prevent_timeline_mode_change_trigger). Contraintes garanties par trigger enforce_sequence_constraints_trigger.';

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
