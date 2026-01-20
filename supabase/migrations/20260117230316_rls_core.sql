-- ============================================================================
-- Migration 005 : rls_core
-- ============================================================================
-- Perimetre : RLS policies + trigger guard profiles (securite)
-- Activation RLS sur : profiles, categories, cards, timelines, slots
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonctions helper : is_admin
-- ----------------------------------------------------------------------------

-- Verifie si utilisateur connecte est admin
-- LANGUAGE SQL + row_security off evite recursion RLS
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
-- Trigger guard : Empecher modification colonnes sensibles profiles
-- ----------------------------------------------------------------------------

-- Fonction guard : Bloque modification plan/is_admin/account_status/deletion_scheduled_at par non-admin
DROP FUNCTION IF EXISTS public.guard_profiles_sensitive_columns() CASCADE;

CREATE FUNCTION public.guard_profiles_sensitive_columns()
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Trigger BEFORE UPDATE sur profiles
DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;

CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_sensitive_columns();

-- ============================================================================
-- ACTIVATION RLS SUR TOUTES LES TABLES
-- ============================================================================

-- Toutes les tables : ENABLE + FORCE RLS
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

-- ============================================================================
-- POLICIES : public.profiles
-- ============================================================================

-- SELECT : utilisateur peut lire son profil, admin peut lire tous
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- INSERT : utilisateur peut creer son profil, admin peut creer tous
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

-- UPDATE : utilisateur peut modifier son profil, admin peut modifier tous
-- (trigger guard protege colonnes sensibles)
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE : admin uniquement
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- POLICIES : public.categories
-- ============================================================================

-- SELECT : bank categories visibles a tous (anon + authenticated)
--          user categories visibles au proprietaire + admin
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
  FOR SELECT
  USING (
    user_id IS NULL OR
    user_id = auth.uid() OR
    public.is_admin()
  );

-- INSERT : authenticated peut creer ses categories (user_id = auth.uid())
--          admin peut creer bank categories (user_id NULL)
DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
    public.is_admin()
  );

-- UPDATE : user peut modifier ses categories
--          admin peut modifier toutes (y compris bank)
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

-- DELETE : user peut supprimer ses categories
--          admin peut supprimer toutes (y compris bank)
DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
  FOR DELETE
  USING (
    (user_id = auth.uid() AND user_id IS NOT NULL) OR
    public.is_admin()
  );

-- ============================================================================
-- POLICIES : public.cards
-- ============================================================================

-- SELECT : bank cards visibles a tous (anon + authenticated)
--          user cards visibles au proprietaire + admin
DROP POLICY IF EXISTS cards_select ON public.cards;
CREATE POLICY cards_select ON public.cards
  FOR SELECT
  USING (
    owner_type = 'bank' OR
    owner_id = auth.uid() OR
    public.is_admin()
  );

-- INSERT : subscriber peut creer ses cards user (owner_type='user' AND owner_id=auth.uid())
--          free ne peut PAS creer de cards user
--          admin peut creer bank cards + user cards
-- Check subscriber inline via EXISTS sur profiles (public.is_admin() hors EXISTS pour robustesse)
DROP POLICY IF EXISTS cards_insert ON public.cards;
CREATE POLICY cards_insert ON public.cards
  FOR INSERT
  WITH CHECK (
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid()
        AND plan = 'subscriber'
      )
    ) OR
    public.is_admin()
  );

-- UPDATE : user peut modifier ses cards user
--          admin peut modifier toutes (y compris bank)
DROP POLICY IF EXISTS cards_update ON public.cards;
CREATE POLICY cards_update ON public.cards
  FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL) OR
    public.is_admin()
  )
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL) OR
    public.is_admin()
  );

-- DELETE : user peut supprimer ses cards user
--          admin peut supprimer toutes (y compris bank)
DROP POLICY IF EXISTS cards_delete ON public.cards;
CREATE POLICY cards_delete ON public.cards
  FOR DELETE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL) OR
    public.is_admin()
  );

-- ============================================================================
-- POLICIES : public.timelines
-- ============================================================================

-- SELECT : user peut lire ses timelines, admin peut lire toutes
DROP POLICY IF EXISTS timelines_select ON public.timelines;
CREATE POLICY timelines_select ON public.timelines
  FOR SELECT
  USING (
    owner_id = auth.uid() OR public.is_admin()
  );

-- INSERT : user peut creer ses timelines, admin peut creer toutes
DROP POLICY IF EXISTS timelines_insert ON public.timelines;
CREATE POLICY timelines_insert ON public.timelines
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR public.is_admin()
  );

-- UPDATE : user peut modifier ses timelines, admin peut modifier toutes
DROP POLICY IF EXISTS timelines_update ON public.timelines;
CREATE POLICY timelines_update ON public.timelines
  FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- DELETE : user peut supprimer ses timelines, admin peut supprimer toutes
DROP POLICY IF EXISTS timelines_delete ON public.timelines;
CREATE POLICY timelines_delete ON public.timelines
  FOR DELETE
  USING (
    owner_id = auth.uid() OR public.is_admin()
  );

-- ============================================================================
-- POLICIES : public.slots
-- ============================================================================

-- SELECT : autorise si timeline appartient a auth.uid(), ou admin
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

-- INSERT : autorise si timeline appartient a auth.uid(), ou admin
DROP POLICY IF EXISTS slots_insert ON public.slots;
CREATE POLICY slots_insert ON public.slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = timeline_id AND t.owner_id = auth.uid()
    ) OR
    public.is_admin()
  );

-- UPDATE : autorise si timeline appartient a auth.uid(), ou admin
DROP POLICY IF EXISTS slots_update ON public.slots;
CREATE POLICY slots_update ON public.slots
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = slots.timeline_id AND t.owner_id = auth.uid()
    ) OR
    public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timelines t
      WHERE t.id = timeline_id AND t.owner_id = auth.uid()
    ) OR
    public.is_admin()
  );

-- DELETE : autorise si timeline appartient a auth.uid(), ou admin
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

-- ----------------------------------------------------------------------------
-- Commentaires documentation
-- ----------------------------------------------------------------------------
COMMENT ON FUNCTION public.is_admin() IS 'Helper RLS : verifie si utilisateur connecte est admin (LANGUAGE SQL + row_security off evite recursion)';
COMMENT ON FUNCTION public.guard_profiles_sensitive_columns() IS 'Trigger guard : empeche modification colonnes sensibles profiles par non-admin';
