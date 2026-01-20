-- ==============================================================================
-- Migration : Ajout du lien parent_card_id pour le séquençage
-- ==============================================================================
--
-- BUT :
--   Permettre d'attacher une séquence (timeline mode='sequence') à une carte parent.
--   Une carte peut avoir 0 ou 1 séquence associée (invariant 1-1 PAR PROPRIÉTAIRE).
--
-- INVARIANTS GARANTIS :
--   1. Une carte + un owner = au maximum 1 séquence (UNIQUE partiel sur owner_id + parent_card_id)
--   2. Une séquence (mode='sequence') DOIT avoir un parent_card_id
--   3. Un planning (mode='planning') NE DOIT PAS avoir de parent_card_id
--   4. Si la carte parent est supprimée, la séquence est supprimée (CASCADE)
--   5. Owner de la carte parent doit correspondre à owner de la timeline (RLS)
--
-- IMPACT SUR DONNÉES EXISTANTES :
--   - Colonne nullable ajoutée : aucune modification des données existantes
--   - Les timelines existantes (mode='planning') auront parent_card_id = NULL (conforme)
--   - Aucune timeline mode='sequence' n'existe encore en DB (nouvelle feature)
--
-- IDEMPOTENCE :
--   - Migration replay-safe : toutes les opérations sont conditionnelles
--   - Peut être exécutée plusieurs fois sans erreur
--
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Ajout de la colonne parent_card_id (IDEMPOTENT)
-- ==============================================================================

-- Ajouter la colonne parent_card_id (nullable) si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'timelines'
    AND column_name = 'parent_card_id'
  ) THEN
    ALTER TABLE public.timelines ADD COLUMN parent_card_id uuid;
    RAISE NOTICE 'Colonne parent_card_id ajoutée à timelines';
  ELSE
    RAISE NOTICE 'Colonne parent_card_id existe déjà, skip';
  END IF;
END $$;

-- Commentaire explicatif
COMMENT ON COLUMN public.timelines.parent_card_id IS
'Carte parente pour les séquences (mode=sequence uniquement). Un owner ne peut avoir qu''une seule séquence par carte (UNIQUE partiel sur owner_id + parent_card_id). NULL pour les plannings (mode=planning).';

-- ==============================================================================
-- ÉTAPE 2 : Ajout des contraintes d'intégrité (IDEMPOTENT)
-- ==============================================================================

-- Contrainte FK vers cards avec CASCADE (IDEMPOTENT)
-- Rationnel : Si la carte parent est supprimée, la séquence n'a plus de sens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timelines_parent_card_id_fkey'
    AND conrelid = 'public.timelines'::regclass
  ) THEN
    ALTER TABLE public.timelines
    ADD CONSTRAINT timelines_parent_card_id_fkey
    FOREIGN KEY (parent_card_id)
    REFERENCES public.cards(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Contrainte FK timelines_parent_card_id_fkey créée';
  ELSE
    RAISE NOTICE 'Contrainte FK timelines_parent_card_id_fkey existe déjà, skip';
  END IF;
END $$;

-- Contrainte UNIQUE partielle : 1 seule séquence par carte PAR PROPRIÉTAIRE (IDEMPOTENT)
-- Rationnel : Permet à plusieurs users d'avoir une séquence sur la même bank card
-- Ancien index incorrect (parent_card_id seul) doit être supprimé
DROP INDEX IF EXISTS public.timelines_unique_parent_card_sequence;

-- Créer le nouvel index correct (owner_id, parent_card_id)
CREATE UNIQUE INDEX IF NOT EXISTS timelines_unique_parent_card_per_owner
ON public.timelines (owner_id, parent_card_id)
WHERE mode = 'sequence';

COMMENT ON INDEX public.timelines_unique_parent_card_per_owner IS
'Garantit qu''un owner ne peut avoir qu''une seule séquence par carte (invariant 1-1 par propriétaire). Permet à plusieurs users d''avoir des séquences sur la même bank card.';

-- ==============================================================================
-- ÉTAPE 3 : Contraintes CHECK pour cohérence mode/parent_card_id (IDEMPOTENT)
-- ==============================================================================

-- Si mode='sequence' alors parent_card_id DOIT être renseigné
-- Si mode='planning' alors parent_card_id DOIT être NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timelines_mode_parent_card_consistency'
    AND conrelid = 'public.timelines'::regclass
  ) THEN
    ALTER TABLE public.timelines
    ADD CONSTRAINT timelines_mode_parent_card_consistency
    CHECK (
      (mode = 'sequence' AND parent_card_id IS NOT NULL)
      OR
      (mode = 'planning' AND parent_card_id IS NULL)
    );
    RAISE NOTICE 'Contrainte CHECK timelines_mode_parent_card_consistency créée';
  ELSE
    RAISE NOTICE 'Contrainte CHECK timelines_mode_parent_card_consistency existe déjà, skip';
  END IF;
END $$;

COMMENT ON CONSTRAINT timelines_mode_parent_card_consistency ON public.timelines IS
'Garantit cohérence : mode=sequence => parent_card_id NOT NULL, mode=planning => parent_card_id IS NULL.';

-- ==============================================================================
-- ÉTAPE 4 : Mise à jour des RLS policies (IDEMPOTENT)
-- ==============================================================================

-- Note : Les policies existantes sur timelines utilisent owner_id pour filtrer l'accès.
-- Nous devons garantir que l'owner de la carte parent correspond à l'owner de la timeline.
-- Cela sera vérifié via une policy supplémentaire.

-- Policy : Vérifier que l'owner de la carte parent = owner de la timeline (INSERT/UPDATE)
-- Cette policy s'applique uniquement aux séquences (mode='sequence')

-- Supprimer l'ancienne policy si elle existe (idempotence)
DROP POLICY IF EXISTS timelines_parent_card_owner_match ON public.timelines;

-- Créer la nouvelle policy avec USING (SELECT/UPDATE/DELETE) et WITH CHECK (INSERT/UPDATE)
CREATE POLICY timelines_parent_card_owner_match ON public.timelines
AS RESTRICTIVE
FOR ALL
USING (
  -- Si mode='planning' : pas de vérification (parent_card_id est NULL)
  mode = 'planning'
  OR
  -- Si mode='sequence' : vérifier que owner de la carte parent = owner de la timeline
  (
    mode = 'sequence'
    AND parent_card_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = timelines.parent_card_id
      AND (
        -- Carte de la banque : accessible à tous
        cards.owner_type = 'bank'
        OR
        -- Carte utilisateur : owner doit correspondre
        (cards.owner_type = 'user' AND cards.owner_id = timelines.owner_id)
      )
    )
  )
)
WITH CHECK (
  -- Même logique pour INSERT/UPDATE : vérifier cohérence owner carte parent
  mode = 'planning'
  OR
  (
    mode = 'sequence'
    AND parent_card_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cards
      WHERE cards.id = parent_card_id
      AND (
        cards.owner_type = 'bank'
        OR
        (cards.owner_type = 'user' AND cards.owner_id = owner_id)
      )
    )
  )
);

COMMENT ON POLICY timelines_parent_card_owner_match ON public.timelines IS
'Garantit que l''owner de la carte parent correspond à l''owner de la timeline pour les séquences. RESTRICTIVE : appliquée en ET avec les autres policies.';

-- ==============================================================================
-- ÉTAPE 5 : Validation post-migration
-- ==============================================================================

-- Vérifier que toutes les timelines existantes respectent les nouvelles contraintes
DO $$
DECLARE
  v_invalid_count integer;
BEGIN
  -- Compter les timelines qui violeraient les contraintes
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.timelines
  WHERE (
    (mode = 'sequence' AND parent_card_id IS NULL)
    OR
    (mode = 'planning' AND parent_card_id IS NOT NULL)
  );

  -- Si des données invalides existent, lever une erreur
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration échouée : % timelines violeraient la contrainte mode/parent_card_id', v_invalid_count;
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 120000 réussie : parent_card_id ajouté avec succès. Toutes les contraintes sont respectées.';
END $$;

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
