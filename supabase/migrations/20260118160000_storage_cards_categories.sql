-- ============================================================================
-- Migration 007 : cards_categories_db
-- ============================================================================
-- Périmètre : DB ONLY (RLS cards/categories + constraints + triggers)
-- STORAGE géré par migration 008 (split_storage_buckets)
-- ============================================================================

-- ============================================================================
-- 1. DB INVARIANTS : Cards
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHECK : Bank cards no category
-- ----------------------------------------------------------------------------

ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_bank_no_category;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_bank_no_category CHECK (
    (owner_type = 'bank' AND category_id IS NULL) OR
    (owner_type = 'user')
  );

-- ----------------------------------------------------------------------------
-- Trigger : User card category belongs to same owner
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_card_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Bank cards cannot have category (already checked by constraint)
  IF NEW.owner_type = 'bank' AND NEW.category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bank cards cannot have category';
  END IF;

  -- User cards: if category_id not null, verify it belongs to same owner
  IF NEW.owner_type = 'user' AND NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = NEW.category_id AND user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'User card category must belong to same owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS cards_validate_category ON public.cards;
CREATE TRIGGER cards_validate_category
  BEFORE INSERT OR UPDATE OF category_id, owner_id, owner_type ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_card_category();

-- ----------------------------------------------------------------------------
-- Trigger : image_path matches owner_type/owner_id
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_card_image_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Bank cards: image_path must start with 'bank/'
  -- → bucket cards-bank (PUBLIC) - migration 008
  IF NEW.owner_type = 'bank' THEN
    IF NOT (NEW.image_path LIKE 'bank/%') THEN
      RAISE EXCEPTION 'Bank card image_path must start with bank/ (bucket: cards-bank)';
    END IF;
  END IF;

  -- User cards: image_path must start with 'user/<owner_id>/'
  -- → bucket cards-user (PRIVATE) - migration 008
  IF NEW.owner_type = 'user' THEN
    IF NOT (NEW.image_path LIKE 'user/' || NEW.owner_id::text || '/%') THEN
      RAISE EXCEPTION 'User card image_path must start with user/<owner_id>/ (bucket: cards-user)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS cards_validate_image_path ON public.cards;
CREATE TRIGGER cards_validate_image_path
  BEFORE INSERT OR UPDATE OF image_path, owner_type, owner_id ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_card_image_path();

-- ============================================================================
-- 2. RLS DB : Cards
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT : Bank visible tous, User visible owner + admin (metadata only)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS cards_select ON public.cards;
CREATE POLICY cards_select ON public.cards
  FOR SELECT
  USING (
    -- Bank cards visible a tous (anon/authenticated/admin)
    owner_type = 'bank' OR
    -- User cards visible au proprietaire OU admin (metadata only, NOT images)
    (owner_type = 'user' AND (owner_id = auth.uid() OR public.is_admin()))
  );

-- ----------------------------------------------------------------------------
-- INSERT : Bank admin only, User (owner + subscriber OR admin private)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS cards_insert ON public.cards;
CREATE POLICY cards_insert ON public.cards
  FOR INSERT
  WITH CHECK (
    -- Bank cards: admin uniquement
    (owner_type = 'bank' AND public.is_admin()) OR
    -- User cards: owner + subscriber actif
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user cards: admin sans subscriber requis
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- UPDATE : Bank admin only, User (owner + subscriber OR admin private)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS cards_update ON public.cards;
CREATE POLICY cards_update ON public.cards
  FOR UPDATE
  USING (
    -- Bank cards: admin uniquement
    (owner_type = 'bank' AND public.is_admin()) OR
    -- User cards: owner + subscriber actif
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user cards: admin sans subscriber requis
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_admin()
    )
  )
  WITH CHECK (
    -- Bank cards: admin uniquement
    (owner_type = 'bank' AND public.is_admin()) OR
    -- User cards: owner + subscriber actif
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user cards: admin sans subscriber requis
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- DELETE : Bank admin only, User (owner + subscriber OR admin private)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS cards_delete ON public.cards;
CREATE POLICY cards_delete ON public.cards
  FOR DELETE
  USING (
    -- Bank cards: admin uniquement
    (owner_type = 'bank' AND public.is_admin()) OR
    -- User cards: owner + subscriber actif
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user cards: admin sans subscriber requis
    (
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      owner_id IS NOT NULL AND
      public.is_admin()
    )
  );

-- ============================================================================
-- 3. DB INVARIANTS : Categories
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CHECK : Categories user-only (no bank categories)
-- ----------------------------------------------------------------------------

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_user_only;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_only CHECK (user_id IS NOT NULL);

-- ============================================================================
-- 4. RLS DB : Categories
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT : Owner + admin
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
  FOR SELECT
  USING (
    -- User categories visibles au proprietaire OU admin
    user_id = auth.uid() OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- INSERT : Owner + subscriber OR admin private
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert ON public.categories
  FOR INSERT
  WITH CHECK (
    -- User categories: owner + subscriber actif
    (
      user_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user categories: admin sans subscriber requis
    (
      user_id = auth.uid() AND
      auth.uid() IS NOT NULL AND
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- UPDATE : Owner + subscriber OR admin private
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update ON public.categories
  FOR UPDATE
  USING (
    -- User categories: owner + subscriber actif
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user categories: admin sans subscriber requis
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_admin()
    )
  )
  WITH CHECK (
    -- User categories: owner + subscriber actif
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user categories: admin sans subscriber requis
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_admin()
    )
  );

-- ----------------------------------------------------------------------------
-- DELETE : Owner + subscriber OR admin private
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete ON public.categories
  FOR DELETE
  USING (
    -- User categories: owner + subscriber actif
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_subscriber_active(auth.uid())
    ) OR
    -- Admin private user categories: admin sans subscriber requis
    (
      user_id = auth.uid() AND
      user_id IS NOT NULL AND
      public.is_admin()
    )
  );

-- ============================================================================
-- 5. COMMENTAIRES DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT cards_bank_no_category ON public.cards IS
  'Enforce bank cards cannot have category (owner_type=bank => category_id IS NULL)';

COMMENT ON CONSTRAINT categories_user_only ON public.categories IS
  'Enforce categories are user-only (no bank categories)';

COMMENT ON FUNCTION public.validate_card_category() IS
  'Trigger : validate user card category belongs to same owner';

COMMENT ON FUNCTION public.validate_card_image_path() IS
  'Trigger : validate image_path format and bucket mapping:
   - Bank cards: bank/<card_id>.<ext> → bucket cards-bank (PUBLIC)
   - User cards: user/<owner_id>/<card_id>.<ext> → bucket cards-user (PRIVATE)
   Buckets créés dans migration 008 (split_storage_buckets)';

-- ============================================================================
-- 6. NOTES ARCHITECTURE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Migration 007 : DB ONLY
-- ----------------------------------------------------------------------------
-- Cette migration définit UNIQUEMENT :
--   - Constraints DB (cards_bank_no_category, categories_user_only)
--   - Triggers DB (validate_card_category, validate_card_image_path)
--   - RLS DB (cards_select/insert/update/delete, categories_*)
--
-- STORAGE géré par migration 008 (split_storage_buckets) :
--   - Buckets : cards-bank (PUBLIC), cards-user (PRIVATE)
--   - Policies storage.objects (SELECT/INSERT/UPDATE/DELETE)
--
-- ----------------------------------------------------------------------------
-- RGPD : Admin metadata vs images
-- ----------------------------------------------------------------------------
-- RLS DB cards SELECT → Admin voit metadata (name, category_id, created_at)
-- Storage policies (migration 008) → Admin bloqué pour images user
-- => Admin peut lister user cards mais ne peut PAS fetch les images
--
-- ----------------------------------------------------------------------------
-- Path format (enforce par trigger validate_card_image_path)
-- ----------------------------------------------------------------------------
-- Bank cards : bank/<card_id>.<ext>
-- User cards : user/<owner_id>/<card_id>.<ext>
--
-- Le préfixe détermine le bucket (migration 008) :
--   - Préfixe 'bank/' → bucket cards-bank (PUBLIC)
--   - Préfixe 'user/' → bucket cards-user (PRIVATE)
--
-- Path DB = Path Storage (identique, pas de transformation)
