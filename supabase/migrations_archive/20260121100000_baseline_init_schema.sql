-- ============================================================================
-- Migration : baseline_init_schema
-- File      : 20260121100000_baseline_init_schema.sql
-- ============================================================================
-- DB-first baseline (projet neuf) : tables + colonnes + contraintes + indexes
-- + triggers d'intégrité (immutabilité mode, règles séquence, complétion slots).
-- RLS/policies et Storage sont volontairement séparés dans d'autres migrations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Utilitaire : auto-update updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Table : profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'subscriber')),

  plan_expires_at TIMESTAMPTZ NULL,

  is_admin BOOLEAN NOT NULL DEFAULT false,

  pseudo TEXT NULL
    CHECK (pseudo IS NULL OR (length(trim(pseudo)) > 0 AND length(pseudo) <= 50)),
  avatar_url TEXT NULL
    CHECK (avatar_url IS NULL OR length(avatar_url) <= 500),
  ville TEXT NULL
    CHECK (ville IS NULL OR (length(trim(ville)) > 0 AND length(ville) <= 100)),
  date_naissance DATE NULL
    CHECK (date_naissance IS NULL OR (date_naissance <= current_date AND date_naissance >= DATE '1900-01-01')),

  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deletion_scheduled')),

  deletion_scheduled_at TIMESTAMPTZ NULL
    CHECK (deletion_scheduled_at IS NULL OR deletion_scheduled_at > now()),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_pseudo_unique
  ON public.profiles (lower(pseudo))
  WHERE pseudo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles (account_status);

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
  ON public.profiles (deletion_scheduled_at)
  WHERE account_status = 'deletion_scheduled' AND deletion_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_grace_period
  ON public.profiles (user_id, plan_expires_at)
  WHERE plan = 'free' AND plan_expires_at IS NOT NULL;

-- ✅ CORRECTION #1 : Contrainte profiles_subscriber_no_expiry (MANQUANTE)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscriber_no_expiry;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscriber_no_expiry CHECK (
    (plan = 'subscriber' AND plan_expires_at IS NULL) OR
    (plan = 'free')
  );

COMMENT ON CONSTRAINT profiles_subscriber_no_expiry ON public.profiles IS
  'Garantit cohérence : subscriber ne peut jamais avoir plan_expires_at renseigné (source: migration 006)';

-- ----------------------------------------------------------------------------
-- Table : categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  label TEXT NOT NULL CHECK (length(trim(label)) > 0 AND length(label) <= 100),
  value TEXT NOT NULL CHECK (value ~ '^[a-z0-9_-]+$' AND length(value) <= 100),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS categories_updated_at ON public.categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS categories_bank_value_unique
  ON public.categories(value)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_value_unique
  ON public.categories(user_id, value)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_user
  ON public.categories(user_id)
  WHERE user_id IS NOT NULL;

-- ✅ CORRECTION #2 : Contrainte categories_user_only (MANQUANTE)
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_user_only;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_only CHECK (user_id IS NOT NULL);

COMMENT ON CONSTRAINT categories_user_only ON public.categories IS
  'Garantit que toutes les catégories sont user-only (pas de bank categories) - Règle produit (source: migration 007)';

-- ----------------------------------------------------------------------------
-- Table : cards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_type TEXT NOT NULL CHECK (owner_type IN ('bank', 'user')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 200),
  image_path TEXT NOT NULL CHECK (length(trim(image_path)) > 0 AND length(image_path) <= 500),

  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  is_disabled BOOLEAN NOT NULL DEFAULT false,
  disabled_at TIMESTAMPTZ NULL,
  disabled_by UUID NULL,
  disabled_reason TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cards_ownership_check CHECK (
    (owner_type = 'bank' AND owner_id IS NULL) OR
    (owner_type = 'user' AND owner_id IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS cards_updated_at ON public.cards;
CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cards_owner
  ON public.cards(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_cards_category
  ON public.cards(category_id);

CREATE INDEX IF NOT EXISTS idx_cards_disabled
  ON public.cards (disabled_at DESC)
  WHERE is_disabled = true;

-- ✅ CORRECTION #3 : Contrainte cards_bank_no_category (MANQUANTE)
ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS cards_bank_no_category;

ALTER TABLE public.cards
  ADD CONSTRAINT cards_bank_no_category CHECK (
    (owner_type = 'bank' AND category_id IS NULL) OR
    (owner_type = 'user')
  );

COMMENT ON CONSTRAINT cards_bank_no_category ON public.cards IS
  'Garantit que les cartes bank ne peuvent pas avoir de catégorie - Règle produit (source: migration 007)';

-- ✅ CORRECTION #4 : Trigger validate_card_category (MANQUANT)
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

COMMENT ON FUNCTION public.validate_card_category() IS
  'Trigger : valide que la catégorie d''une carte user appartient au même owner (source: migration 007)';

-- ✅ CORRECTION #5 : Trigger validate_card_image_path (MANQUANT)
CREATE OR REPLACE FUNCTION public.validate_card_image_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Bank cards: image_path must start with 'bank/'
  -- → bucket cards-bank (PUBLIC) - migration baseline_storage
  IF NEW.owner_type = 'bank' THEN
    IF NOT (NEW.image_path LIKE 'bank/%') THEN
      RAISE EXCEPTION 'Bank card image_path must start with bank/ (bucket: cards-bank)';
    END IF;
  END IF;

  -- User cards: image_path must start with 'user/<owner_id>/'
  -- → bucket cards-user (PRIVATE) - migration baseline_storage
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

COMMENT ON FUNCTION public.validate_card_image_path() IS
  'Trigger : valide format image_path et mapping bucket:
   - Bank cards: bank/<card_id>.<ext> → bucket cards-bank (PUBLIC)
   - User cards: user/<owner_id>/<card_id>.<ext> → bucket cards-user (PRIVATE)
   (source: migration 007, 008)';

-- ----------------------------------------------------------------------------
-- Table : timelines
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  name TEXT NULL CHECK (name IS NULL OR (length(trim(name)) > 0 AND length(name) <= 200)),
  is_active BOOLEAN NOT NULL DEFAULT false,

  mode TEXT NOT NULL DEFAULT 'planning'
    CHECK (mode IN ('planning', 'sequence')),

  parent_card_id UUID NULL REFERENCES public.cards(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT timelines_parent_card_mode_check CHECK (
    (mode = 'planning' AND parent_card_id IS NULL) OR
    (mode = 'sequence' AND parent_card_id IS NOT NULL)
  )
);

DROP TRIGGER IF EXISTS timelines_updated_at ON public.timelines;
CREATE TRIGGER timelines_updated_at
  BEFORE UPDATE ON public.timelines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS timelines_active_per_user
  ON public.timelines(owner_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_timelines_owner
  ON public.timelines(owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS timelines_unique_parent_card_per_owner
  ON public.timelines (owner_id, parent_card_id)
  WHERE mode = 'sequence';

-- ----------------------------------------------------------------------------
-- Table : slots
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  timeline_id UUID NOT NULL REFERENCES public.timelines(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,

  slot_type TEXT NOT NULL CHECK (slot_type IN ('step', 'reward')),
  position INTEGER NOT NULL CHECK (position >= 0),

  jetons INTEGER NOT NULL DEFAULT 0,

  completed_at TIMESTAMPTZ NULL,
  completed_by UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT slots_jetons_check CHECK (
    (slot_type = 'step' AND jetons >= 0 AND jetons <= 5) OR
    (slot_type = 'reward' AND jetons = 0)
  ),

  CONSTRAINT slots_timeline_position_unique UNIQUE (timeline_id, position)
);

DROP TRIGGER IF EXISTS slots_updated_at ON public.slots;
CREATE TRIGGER slots_updated_at
  BEFORE UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS slots_timeline_reward_unique
  ON public.slots(timeline_id)
  WHERE slot_type = 'reward';

CREATE INDEX IF NOT EXISTS idx_slots_timeline_position
  ON public.slots(timeline_id, position);

CREATE INDEX IF NOT EXISTS idx_slots_card
  ON public.slots(card_id);

CREATE INDEX IF NOT EXISTS idx_slots_completed_at
  ON public.slots(timeline_id, completed_at)
  WHERE completed_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Intégrité : immutabilité timelines.mode
-- ----------------------------------------------------------------------------
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
DROP TRIGGER IF EXISTS prevent_timeline_mode_change_trigger ON public.timelines;
CREATE TRIGGER prevent_timeline_mode_change_trigger
BEFORE UPDATE OF mode ON public.timelines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_timeline_mode_change();

-- ----------------------------------------------------------------------------
-- Intégrité : contraintes séquences (mode='sequence')
-- ----------------------------------------------------------------------------
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
DROP TRIGGER IF EXISTS enforce_sequence_constraints_trigger ON public.slots;
CREATE TRIGGER enforce_sequence_constraints_trigger
BEFORE INSERT OR UPDATE ON public.slots
FOR EACH ROW
EXECUTE FUNCTION public.enforce_sequence_constraints();

-- ----------------------------------------------------------------------------
-- Intégrité : protection slots complétés + completed_by forcé à auth.uid()
-- ----------------------------------------------------------------------------
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
DROP TRIGGER IF EXISTS prevent_modify_completed_slot_trigger ON public.slots;
CREATE TRIGGER prevent_modify_completed_slot_trigger
BEFORE UPDATE OR DELETE ON public.slots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_modify_completed_slot();
