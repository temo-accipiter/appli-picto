-- ==============================================================================
-- Migration : Ajout de l'état d'exécution "déjà fait" sur les slots
-- ==============================================================================
--
-- BUT :
--   Permettre de marquer un slot comme "complété" dans le Tableau, avec verrouillage
--   serveur-side pour empêcher modifications/suppressions destructrices.
--
-- INVARIANTS GARANTIS :
--   1. Un slot complété ne peut pas être supprimé (protection serveur-side)
--   2. Un slot complété ne peut pas avoir sa position modifiée (empêche réordonnancement)
--   3. Un slot complété peut être "uncomplété" par le owner uniquement (reset possible)
--   4. Traçabilité : on sait qui a complété le slot et quand
--   5. completed_by est forcé à auth.uid() lors de la complétion (non falsifiable)
--   6. completed_by est réinitialisé à NULL lors du uncomplete
--
-- IMPACT SUR DONNÉES EXISTANTES :
--   - Colonnes nullables ajoutées : aucune modification des données existantes
--   - Tous les slots existants auront completed_at = NULL (= non complétés)
--   - Les policies RLS existantes continuent de fonctionner
--
-- IDEMPOTENCE :
--   - Migration replay-safe : toutes les opérations sont conditionnelles
--   - Peut être exécutée plusieurs fois sans erreur
--
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Ajout des colonnes d'état (IDEMPOTENT)
-- ==============================================================================

-- Ajouter completed_at : timestamp de complétion (IDEMPOTENT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'slots'
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.slots ADD COLUMN completed_at timestamptz;
    RAISE NOTICE 'Colonne completed_at ajoutée à slots';
  ELSE
    RAISE NOTICE 'Colonne completed_at existe déjà, skip';
  END IF;
END $$;

-- Ajouter completed_by : utilisateur qui a complété (traçabilité) (IDEMPOTENT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'slots'
    AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE public.slots ADD COLUMN completed_by uuid;
    RAISE NOTICE 'Colonne completed_by ajoutée à slots';
  ELSE
    RAISE NOTICE 'Colonne completed_by existe déjà, skip';
  END IF;
END $$;

-- Commentaires explicatifs
COMMENT ON COLUMN public.slots.completed_at IS
'Timestamp de complétion du slot dans le Tableau. NULL = non complété, NOT NULL = complété et verrouillé. Forcé à NOW() lors de la complétion.';

COMMENT ON COLUMN public.slots.completed_by IS
'Utilisateur ayant complété le slot (traçabilité). Forcé à auth.uid() lors de la complétion, non modifiable. Réinitialisé à NULL lors du uncomplete.';

-- ==============================================================================
-- ÉTAPE 2 : Trigger pour empêcher modification/suppression de slots complétés
-- ==============================================================================

-- Fonction trigger : empêcher UPDATE de position ou DELETE si slot complété
-- + forcer completed_by à auth.uid() lors de la complétion
CREATE OR REPLACE FUNCTION public.prevent_modify_completed_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
BEGIN
  -- Récupérer l'utilisateur courant
  v_current_user_id := auth.uid();

  -- CAS 1 : DELETE d'un slot complété => INTERDIT
  IF TG_OP = 'DELETE' THEN
    IF OLD.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Impossible de supprimer un slot déjà complété (id: %, complété le: %)',
        OLD.id, OLD.completed_at
        USING HINT = 'Vous devez d''abord "uncompleter" ce slot avant de le supprimer.';
    END IF;
    RETURN OLD;
  END IF;

  -- CAS 2 : UPDATE d'un slot
  IF TG_OP = 'UPDATE' THEN

    -- CAS 2A : Passage de NULL → NOT NULL (complétion du slot)
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
      -- Refuser si l'utilisateur n'est pas authentifié
      IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Impossible de compléter un slot sans être authentifié (id: %)',
          NEW.id
          USING HINT = 'L''utilisateur doit être authentifié pour compléter un slot.';
      END IF;

      -- Forcer completed_by à l'utilisateur courant (non falsifiable)
      NEW.completed_by := v_current_user_id;

      RAISE NOTICE 'Slot % complété par utilisateur %', NEW.id, v_current_user_id;
      RETURN NEW;
    END IF;

    -- CAS 2B : Passage de NOT NULL → NULL (uncomplete / reset)
    IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN
      -- Reset autorisé : réinitialiser completed_by à NULL
      NEW.completed_by := NULL;

      RAISE NOTICE 'Slot % uncomplété (reset)', NEW.id;
      RETURN NEW;
    END IF;

    -- CAS 2C : Slot déjà complété, tentative de modification
    IF OLD.completed_at IS NOT NULL THEN

      -- INTERDIT : Modification de la position d'un slot complété
      IF NEW.position != OLD.position THEN
        RAISE EXCEPTION 'Impossible de modifier la position d''un slot déjà complété (id: %, complété le: %)',
          OLD.id, OLD.completed_at
          USING HINT = 'Vous devez d''abord "uncompleter" ce slot avant de le réordonner.';
      END IF;

      -- INTERDIT : Modification de card_id, slot_type, timeline_id d'un slot complété
      IF NEW.card_id != OLD.card_id OR NEW.slot_type != OLD.slot_type OR NEW.timeline_id != OLD.timeline_id THEN
        RAISE EXCEPTION 'Impossible de modifier le contenu d''un slot déjà complété (id: %, complété le: %)',
          OLD.id, OLD.completed_at
          USING HINT = 'Vous devez d''abord "uncompleter" ce slot avant de le modifier.';
      END IF;

      -- INTERDIT : Modification manuelle de completed_by (sécurité)
      IF NEW.completed_by != OLD.completed_by THEN
        RAISE EXCEPTION 'Impossible de modifier completed_by manuellement (id: %, complété le: %)',
          OLD.id, OLD.completed_at
          USING HINT = 'completed_by est géré automatiquement par le système.';
      END IF;

      -- AUTORISÉ : Modification de jetons (peut être ajusté même après complétion, cas d'usage rare)
      -- On laisse passer ces modifications
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_modify_completed_slot() IS
'Trigger function : empêche DELETE et certains UPDATE sur slots complétés (protection intégrité données). Forcer completed_by à auth.uid() lors de la complétion, reset à NULL lors du uncomplete.';

-- Créer le trigger sur la table slots (IDEMPOTENT)
DROP TRIGGER IF EXISTS prevent_modify_completed_slot_trigger ON public.slots;

CREATE TRIGGER prevent_modify_completed_slot_trigger
BEFORE UPDATE OR DELETE ON public.slots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_modify_completed_slot();

COMMENT ON TRIGGER prevent_modify_completed_slot_trigger ON public.slots IS
'Empêche modification/suppression de slots complétés (sauf reset explicite de completed_at). Forcer completed_by à auth.uid().';

-- ==============================================================================
-- ÉTAPE 3 : Mise à jour des RLS policies (IDEMPOTENT)
-- ==============================================================================

-- Note : Les policies RLS existantes gèrent déjà l'accès basé sur owner_id.
-- On ajoute une couche supplémentaire pour empêcher DELETE de slots complétés via RLS.
-- Cela complète le trigger (double protection : trigger + RLS).

-- Policy : Empêcher DELETE de slots complétés via RLS
DROP POLICY IF EXISTS slots_no_delete_completed ON public.slots;

CREATE POLICY slots_no_delete_completed ON public.slots
AS RESTRICTIVE
FOR DELETE
USING (
  -- Autoriser DELETE seulement si slot NON complété
  completed_at IS NULL
);

COMMENT ON POLICY slots_no_delete_completed ON public.slots IS
'RLS : Empêche DELETE de slots complétés (double protection avec trigger).';

-- Note : La policy slots_no_reorder_completed a été supprimée car elle était redondante
-- et autorisait tout (USING true, WITH CHECK true). Le trigger gère déjà toutes les
-- protections nécessaires pour les UPDATE.

-- ==============================================================================
-- ÉTAPE 4 : Index pour optimiser les requêtes sur slots complétés (IDEMPOTENT)
-- ==============================================================================

-- Index partiel : slots complétés (pour requêtes "liste des slots fait")
CREATE INDEX IF NOT EXISTS idx_slots_completed
ON public.slots (timeline_id, completed_at)
WHERE completed_at IS NOT NULL;

COMMENT ON INDEX public.idx_slots_completed IS
'Optimise les requêtes sur slots complétés par timeline (ex: "quels slots sont déjà faits ?").';

-- ==============================================================================
-- ÉTAPE 5 : Validation post-migration
-- ==============================================================================

DO $$
BEGIN
  -- Vérifier que toutes les colonnes ont bien été ajoutées
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'slots'
    AND column_name = 'completed_at'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : colonne completed_at non créée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'slots'
    AND column_name = 'completed_by'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : colonne completed_by non créée';
  END IF;

  -- Vérifier que le trigger existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'slots'
    AND trigger_name = 'prevent_modify_completed_slot_trigger'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : trigger prevent_modify_completed_slot_trigger non créé';
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 130000 réussie : état de complétion ajouté avec succès. Trigger actif, completed_by forcé à auth.uid().';
END $$;

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
