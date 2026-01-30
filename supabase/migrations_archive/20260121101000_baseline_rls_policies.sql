-- ============================================================================
-- Migration : baseline_rls_policies
-- File      : 20260121101000_baseline_rls_policies.sql
-- ============================================================================
-- Baseline sécurité : RLS + policies + helpers (is_admin, is_subscriber_active)
-- + guard trigger sur profiles (colonnes sensibles admin-only)
-- + fonctions admin SECURITY DEFINER (soft-block cards)
--
-- IMPORTANT :
-- - Ce fichier suppose que baseline_init_schema a déjà été appliquée.
-- - Storage est géré dans une migration séparée.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonctions helper : is_admin
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin();

CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- ✅ CORRECTION #6 : Fonction is_subscriber_active (CODE INCORRECT REMPLACÉ)
-- ----------------------------------------------------------------------------
-- Le code original contenait par erreur la policy slots_delete à la place
-- de la fonction is_subscriber_active. Voici la correction.

DROP FUNCTION IF EXISTS public.is_subscriber_active(uuid);

CREATE OR REPLACE FUNCTION public.is_subscriber_active(uid uuid)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT
      plan = 'subscriber' OR
      (plan = 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at > now())
    FROM public.profiles
    WHERE user_id = uid),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- Guard trigger : profils (colonnes sensibles admin-only)
-- ----------------------------------------------------------------------------
-- Empêche un utilisateur non-admin de modifier : plan, plan_expires_at, is_admin,
-- account_status, deletion_scheduled_at.
DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;
CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Si utilisateur non admin tente de modifier colonnes sensibles
  IF NOT public.is_admin() THEN
    -- Bloquer modification plan
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Modification plan interdite (admin-only)';
    END IF;

    -- Bloquer modification is_admin
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Modification is_admin interdite (admin-only)';
    END IF;

    -- Bloquer modification account_status
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Modification account_status interdite (admin-only)';
    END IF;

    -- Bloquer modification deletion_scheduled_at
    IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at THEN
      RAISE EXCEPTION 'Modification deletion_scheduled_at interdite (admin-only)';
    END IF;

    -- Bloquer modification plan_expires_at (NOUVEAU)
    IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'Modification plan_expires_at interdite (admin-only)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Recréer trigger BEFORE UPDATE
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_sensitive_columns();

-- ----------------------------------------------------------------------------
-- Activation RLS (ENABLE + FORCE)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timelines FORCE ROW LEVEL SECURITY;

ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots FORCE ROW LEVEL SECURITY;

-- =====================================================

-- ----------------------------------------------------------------------------
-- Policies RLS (DROP + CREATE)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
  FOR SELECT
  USING (
    user_id IS NULL OR
    user_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND user_id IS NOT NULL) OR
    public.is_admin()
  )
  WITH CHECK (
    (user_id = auth.uid() AND user_id IS NOT NULL) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
  FOR DELETE
  USING (
    (user_id = auth.uid() AND user_id IS NOT NULL) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS cards_select ON public.cards;
CREATE POLICY cards_select ON public.cards
  FOR SELECT
  USING (
    owner_type = 'bank' OR
    owner_id = auth.uid() OR
    public.is_admin()
  );

DROP POLICY IF EXISTS cards_insert ON public.cards;
CREATE POLICY cards_insert ON public.cards
  FOR INSERT
  WITH CHECK (
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS cards_update ON public.cards;
CREATE POLICY cards_update ON public.cards
  FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL AND public.is_subscriber_active(auth.uid())) OR
    public.is_admin()
  )
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL AND public.is_subscriber_active(auth.uid())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS cards_delete ON public.cards;
CREATE POLICY cards_delete ON public.cards
  FOR DELETE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL AND public.is_subscriber_active(auth.uid())) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS timelines_select ON public.timelines;
CREATE POLICY timelines_select ON public.timelines
  FOR SELECT
  USING (
    owner_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS timelines_insert ON public.timelines;
CREATE POLICY timelines_insert ON public.timelines
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS timelines_update ON public.timelines;
CREATE POLICY timelines_update ON public.timelines
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS timelines_delete ON public.timelines;
CREATE POLICY timelines_delete ON public.timelines
  FOR DELETE
  USING (
    owner_id = auth.uid() OR public.is_admin()
  );

-- ✅ CORRECTION #7 : Policy restrictive timelines_parent_card_owner_match (MANQUANTE)
DROP POLICY IF EXISTS timelines_parent_card_owner_match ON public.timelines;

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
  'Garantit que l''owner de la carte parent correspond à l''owner de la timeline pour les séquences. RESTRICTIVE : appliquée en ET avec les autres policies (source: migration 012)';

DROP POLICY IF EXISTS slots_select ON public.slots;
CREATE POLICY slots_select ON public.slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = slots.timeline_id AND t.owner_id = auth.uid()
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS slots_insert ON public.slots;
CREATE POLICY slots_insert ON public.slots
  FOR INSERT
  WITH CHECK (
    (
      -- User doit etre owner de la timeline
      EXISTS (
        SELECT 1 FROM public.timelines t
        WHERE t.id = timeline_id AND t.owner_id = auth.uid()
      )
      AND
      (
        -- Si carte bank, OK
        EXISTS (
          SELECT 1 FROM public.cards c
          WHERE c.id = card_id AND c.owner_type = 'bank'
        )
        OR
        -- Si carte user, verifier owner_id + subscriber actif
        (
          EXISTS (
            SELECT 1 FROM public.cards c
            WHERE c.id = card_id
              AND c.owner_type = 'user'
              AND c.owner_id = auth.uid()
          )
          AND public.is_subscriber_active(auth.uid())
        )
      )
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS slots_update ON public.slots;
CREATE POLICY slots_update ON public.slots
  FOR UPDATE
  USING (
    -- User doit etre owner de la timeline (ou admin)
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = slots.timeline_id AND t.owner_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    (
      -- User doit etre owner de la timeline
      EXISTS (
        SELECT 1 FROM public.timelines t
        WHERE t.id = timeline_id AND t.owner_id = auth.uid()
      )
      AND
      (
        -- Si nouvelle carte bank, OK (permet "sortie premium")
        EXISTS (
          SELECT 1 FROM public.cards c
          WHERE c.id = card_id AND c.owner_type = 'bank'
        )
        OR
        -- Si nouvelle carte user, verifier owner_id + subscriber actif
        (
          EXISTS (
            SELECT 1 FROM public.cards c
            WHERE c.id = card_id
              AND c.owner_type = 'user'
              AND c.owner_id = auth.uid()
          )
          AND public.is_subscriber_active(auth.uid())
        )
      )
    ) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS slots_delete ON public.slots;
CREATE POLICY slots_delete ON public.slots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = slots.timeline_id AND t.owner_id = auth.uid()
    ) OR
    public.is_admin()
  );

-- ✅ CORRECTION #8 : Policy restrictive slots_no_delete_completed (MANQUANTE)
DROP POLICY IF EXISTS slots_no_delete_completed ON public.slots;

CREATE POLICY slots_no_delete_completed ON public.slots
AS RESTRICTIVE
FOR DELETE
USING (
  -- Autoriser DELETE seulement si slot NON complété
  completed_at IS NULL
);

COMMENT ON POLICY slots_no_delete_completed ON public.slots IS
  'RLS : Empêche DELETE de slots complétés (double protection avec trigger prevent_modify_completed_slot) (source: migration 013)';

-- ----------------------------------------------------------------------------
-- Admin : soft-block / unblock cartes utilisateur (sans accès aux images)
-- ----------------------------------------------------------------------------
-- Permet à un admin de désactiver/réactiver une carte user via une fonction
-- SECURITY DEFINER. Aucun accès admin aux objets storage n'est donné ici.
DROP FUNCTION IF EXISTS public.admin_set_card_disabled(uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.admin_set_card_disabled(
  p_card_id uuid,
  p_disabled boolean,
  p_reason text DEFAULT NULL
)
RETURNS public.cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_card public.cards;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Vérifier que la carte existe et est de type 'user'
  -- (on ne bloque pas les cartes banque, elles sont gérées autrement)
  SELECT * INTO v_card
  FROM public.cards
  WHERE id = p_card_id AND owner_type = 'user';

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card not found or not a user card: %', p_card_id;
  END IF;

  -- Appliquer le blocage ou déblocage
  IF p_disabled THEN
    -- BLOCAGE : marquer la carte comme désactivée
    UPDATE public.cards
    SET
      is_disabled = true,
      disabled_at = now(),
      disabled_by = auth.uid(),
      disabled_reason = p_reason
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  ELSE
    -- DÉBLOCAGE : réactiver la carte
    -- On conserve disabled_by pour l'historique (qui a débloqué)
    -- On efface disabled_at et disabled_reason
    UPDATE public.cards
    SET
      is_disabled = false,
      disabled_at = NULL,
      disabled_by = auth.uid(),  -- Trace qui a débloqué
      disabled_reason = NULL
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  END IF;

  RETURN v_card;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_card_disabled(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_card_disabled(uuid, boolean, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- Documentation (COMMENT ON)
-- ----------------------------------------------------------------------------
COMMENT ON FUNCTION public.is_admin() IS
  'Helper RLS : retourne true si l''utilisateur courant (auth.uid()) est admin.';

COMMENT ON FUNCTION public.is_subscriber_active(uuid) IS
  'Helper quotas : true si plan=subscriber OU (plan=free et plan_expires_at > now()) (période de grâce).';

COMMENT ON FUNCTION public.guard_profiles_sensitive_columns() IS
  'Trigger guard : empêche la modification de colonnes sensibles du profil par un non-admin.';

COMMENT ON FUNCTION public.admin_set_card_disabled(uuid, boolean, text) IS
  'Admin only : soft-block/unblock d''une carte user (audit : disabled_at/disabled_by/disabled_reason).';
