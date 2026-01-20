-- ==============================================================================
-- Migration : Contraintes d'intégrité pour mode='sequence'
-- ==============================================================================
--
-- BUT :
--   Garantir que les timelines en mode='sequence' respectent les règles produit :
--   - Uniquement des slots de type "step" (pas de slot "reward")
--   - Jetons toujours à 0 (pas d'économie de jetons dans les séquences)
--   - Les timelines en mode='planning' ne sont pas affectées
--
-- INVARIANTS GARANTIS :
--   1. Une séquence (mode='sequence') ne peut contenir que des slots type="step"
--   2. Une séquence (mode='sequence') ne peut avoir de jetons (jetons = 0 sur tous les steps)
--   3. Un planning (mode='planning') reste libre : reward + jetons autorisés
--   4. Ces règles sont garanties serveur-side via trigger (pas contournable côté client)
--   5. Si jetons IS NULL dans une séquence, il est forcé à 0 automatiquement
--
-- IMPACT SUR DONNÉES EXISTANTES :
--   - Migration de données AVANT activation du trigger pour nettoyer incohérences
--   - Suppression automatique des slots reward sur séquences existantes (si présents)
--   - Mise à 0 des jetons sur séquences existantes (si non-zéro ou NULL)
--   - Si aucune séquence n'existe encore, cette migration est transparente
--
-- IDEMPOTENCE :
--   - Migration replay-safe : le nettoyage de données ne s'exécute que si nécessaire
--   - Les triggers sont recréés à chaque fois (CREATE OR REPLACE FUNCTION + DROP/CREATE TRIGGER)
--   - Peut être exécutée plusieurs fois sans erreur
--
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Migration de données existantes (nettoyage avant contraintes)
-- ==============================================================================

DO $$
DECLARE
  v_deleted_rewards integer := 0;
  v_updated_jetons integer := 0;
  v_total_sequences integer := 0;
BEGIN
  -- Compter le nombre de séquences existantes
  SELECT COUNT(*) INTO v_total_sequences
  FROM public.timelines
  WHERE mode = 'sequence';

  RAISE NOTICE 'Migration des données : % séquence(s) existante(s) trouvée(s)', v_total_sequences;

  -- Si aucune séquence n'existe, pas de nettoyage nécessaire
  IF v_total_sequences = 0 THEN
    RAISE NOTICE 'Aucune séquence existante : pas de nettoyage de données nécessaire';
  ELSE
    -- Supprimer tous les slots reward sur des séquences
    WITH deleted AS (
      DELETE FROM public.slots
      WHERE slot_type = 'reward'
      AND timeline_id IN (SELECT id FROM public.timelines WHERE mode = 'sequence')
      RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_rewards FROM deleted;

    IF v_deleted_rewards > 0 THEN
      RAISE WARNING 'Migration : % slot(s) reward supprimé(s) de séquences (incohérence corrigée)', v_deleted_rewards;
    ELSE
      RAISE NOTICE 'Aucun slot reward à supprimer dans les séquences';
    END IF;

    -- Mettre jetons à 0 pour tous les steps de séquences (y compris jetons NULL)
    WITH updated AS (
      UPDATE public.slots
      SET jetons = 0
      WHERE (jetons != 0 OR jetons IS NULL)
      AND timeline_id IN (SELECT id FROM public.timelines WHERE mode = 'sequence')
      RETURNING *
    )
    SELECT COUNT(*) INTO v_updated_jetons FROM updated;

    IF v_updated_jetons > 0 THEN
      RAISE WARNING 'Migration : % slot(s) step mis à jetons=0 dans séquences (incohérence corrigée)', v_updated_jetons;
    ELSE
      RAISE NOTICE 'Tous les jetons sont déjà à 0 dans les séquences';
    END IF;

    RAISE NOTICE 'Migration des données terminée : % reward(s) supprimé(s), % jeton(s) corrigé(s)',
      v_deleted_rewards, v_updated_jetons;
  END IF;
END $$;

-- ==============================================================================
-- ÉTAPE 2 : Trigger pour garantir les invariants mode='sequence' (IDEMPOTENT)
-- ==============================================================================

-- Fonction trigger : valider les contraintes sequence avant INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.enforce_sequence_constraints()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timeline_mode text;
BEGIN
  -- Récupérer le mode de la timeline parente
  SELECT mode INTO v_timeline_mode
  FROM public.timelines
  WHERE id = NEW.timeline_id;

  -- Si la timeline n'existe pas, laisser la FK faire son travail (erreur FK)
  IF v_timeline_mode IS NULL THEN
    RAISE EXCEPTION 'Timeline inexistante (id: %)', NEW.timeline_id
      USING HINT = 'La timeline doit exister avant d''y ajouter un slot.';
  END IF;

  -- CAS 1 : Timeline en mode='sequence'
  -- Règles strictes : uniquement steps + jetons=0
  IF v_timeline_mode = 'sequence' THEN

    -- RÈGLE 1 : Interdire les slots reward dans les séquences
    IF NEW.slot_type = 'reward' THEN
      RAISE EXCEPTION 'Impossible d''ajouter un slot reward dans une séquence (timeline_id: %, mode: sequence)',
        NEW.timeline_id
        USING HINT = 'Les séquences ne supportent que des slots de type "step". Utilisez un planning (mode=planning) pour les récompenses.';
    END IF;

    -- RÈGLE 2 : Forcer jetons à 0 si NULL, interdire si non-zéro
    IF NEW.jetons IS NULL THEN
      -- Forcer automatiquement à 0 (robustesse)
      NEW.jetons := 0;
      RAISE NOTICE 'Jetons forcés à 0 dans séquence (slot: %, timeline: %)', NEW.id, NEW.timeline_id;
    ELSIF NEW.jetons != 0 THEN
      -- Interdire explicitement jetons non-zéro
      RAISE EXCEPTION 'Impossible d''attribuer des jetons (%) dans une séquence (timeline_id: %, mode: sequence)',
        NEW.jetons, NEW.timeline_id
        USING HINT = 'Les séquences ne supportent pas l''économie de jetons. Les jetons doivent être à 0. Utilisez un planning (mode=planning) pour l''économie de jetons.';
    END IF;

  END IF;

  -- CAS 2 : Timeline en mode='planning'
  -- Pas de contraintes supplémentaires : reward + jetons autorisés
  -- Les contraintes existantes (slots_jetons_check, etc.) continuent de s'appliquer

  -- Validation OK : laisser passer
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_sequence_constraints() IS
'Trigger function : garantit que les slots dans les séquences (mode=sequence) respectent les règles produit (uniquement steps, jetons=0). Forcer jetons à 0 si NULL.';

-- Créer le trigger sur la table slots (IDEMPOTENT)
DROP TRIGGER IF EXISTS enforce_sequence_constraints_trigger ON public.slots;

CREATE TRIGGER enforce_sequence_constraints_trigger
BEFORE INSERT OR UPDATE ON public.slots
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sequence_constraints();

COMMENT ON TRIGGER enforce_sequence_constraints_trigger ON public.slots IS
'Garantit l''intégrité des contraintes mode=sequence : pas de reward, jetons forcés à 0 si NULL ou refusés si non-zéro.';

-- ==============================================================================
-- ÉTAPE 3 : Validation post-migration
-- ==============================================================================

DO $$
DECLARE
  v_invalid_rewards integer := 0;
  v_invalid_jetons integer := 0;
BEGIN
  -- Vérifier qu'il n'existe plus de slots reward sur des séquences
  SELECT COUNT(*) INTO v_invalid_rewards
  FROM public.slots
  WHERE slot_type = 'reward'
  AND timeline_id IN (SELECT id FROM public.timelines WHERE mode = 'sequence');

  IF v_invalid_rewards > 0 THEN
    RAISE EXCEPTION 'Migration échouée : % slot(s) reward restent sur des séquences (nettoyage incomplet)', v_invalid_rewards;
  END IF;

  -- Vérifier qu'il n'existe plus de jetons non-zéro ou NULL sur des séquences
  SELECT COUNT(*) INTO v_invalid_jetons
  FROM public.slots
  WHERE (jetons != 0 OR jetons IS NULL)
  AND timeline_id IN (SELECT id FROM public.timelines WHERE mode = 'sequence');

  IF v_invalid_jetons > 0 THEN
    RAISE EXCEPTION 'Migration échouée : % slot(s) avec jetons non-zéro ou NULL restent sur des séquences (nettoyage incomplet)', v_invalid_jetons;
  END IF;

  -- Vérifier que le trigger existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'slots'
    AND trigger_name = 'enforce_sequence_constraints_trigger'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : trigger enforce_sequence_constraints_trigger non créé';
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 140000 réussie : contraintes mode=sequence garanties. Trigger actif. Données nettoyées.';
END $$;

-- ==============================================================================
-- ÉTAPE 4 : Commentaires et documentation
-- ==============================================================================

-- Ajouter un commentaire sur la colonne mode pour documenter les règles
COMMENT ON COLUMN public.timelines.mode IS
'Mode de la timeline : "planning" (reward + jetons autorisés) ou "sequence" (uniquement steps, jetons forcés à 0, pas de reward). Contraintes garanties par trigger enforce_sequence_constraints_trigger.';

COMMENT ON COLUMN public.slots.slot_type IS
'Type de slot : "step" (étape) ou "reward" (récompense). Les séquences (mode=sequence) ne peuvent contenir que des steps. Contrainte garantie par trigger enforce_sequence_constraints_trigger.';

COMMENT ON COLUMN public.slots.jetons IS
'Nombre de jetons rapportés par ce slot (0-5 pour steps, toujours 0 pour rewards). Les séquences (mode=sequence) ont jetons forcés à 0 automatiquement. Contrainte garantie par trigger enforce_sequence_constraints_trigger.';

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
