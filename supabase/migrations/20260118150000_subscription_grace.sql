-- ============================================================================
-- Migration 006 : subscription_grace
-- ============================================================================
-- Perimetre : Gestion periode de grace abonnement (7j apres downgrade)
-- Ajoute plan_expires_at + fonction is_subscriber_active + mise a jour RLS
-- Correction faille RLS slots (ownership cartes user) + UX sortie premium
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALTER TABLE profiles : Ajouter colonne plan_expires_at
-- ----------------------------------------------------------------------------

-- Colonne plan_expires_at (nullable, SANS CHECK temporel pour garder dates passees)
-- IMPORTANT: plan_expires_at doit RESTER renseigne (date passee) apres fin de grace
-- pour permettre purge J+90 avec: plan_expires_at <= now() - interval '90 days'
-- Ne JAMAIS remettre a NULL apres expiration grace
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Contrainte coherence : subscriber ne doit jamais avoir plan_expires_at
-- Drop si existe (idempotence) puis recreer
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscriber_no_expiry;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscriber_no_expiry CHECK (
    (plan = 'subscriber' AND plan_expires_at IS NULL) OR
    (plan = 'free')
  );

-- ----------------------------------------------------------------------------
-- 2. Index : Faciliter queries grace period et purges futures
-- ----------------------------------------------------------------------------

-- Index partiel : users en periode de grace (plan=free + plan_expires_at non null)
CREATE INDEX IF NOT EXISTS idx_profiles_grace_period
  ON public.profiles(user_id, plan_expires_at)
  WHERE plan = 'free' AND plan_expires_at IS NOT NULL;

-- Index partiel : accelere queries purge J+90
-- Filtre plan=free + plan_expires_at non null
-- La condition temporelle (< now() - 90 days) sera dans la query, pas l'index
CREATE INDEX IF NOT EXISTS idx_profiles_purge_candidates
  ON public.profiles(plan_expires_at)
  WHERE plan = 'free' AND plan_expires_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Mettre a jour trigger guard : Proteger plan_expires_at
-- ----------------------------------------------------------------------------

-- Drop trigger explicitement
DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;

-- CREATE OR REPLACE fonction guard avec protection plan_expires_at
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

-- Recreer trigger BEFORE UPDATE
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_sensitive_columns();

-- ----------------------------------------------------------------------------
-- 4. Fonction helper : is_subscriber_active (periode grace incluse)
-- ----------------------------------------------------------------------------

-- Verifie si utilisateur a acces fonctionnalites subscriber (actif ou grace)
-- Retourne true si :
--   - plan = 'subscriber' (actif)
--   - OU plan = 'free' ET plan_expires_at > now() (grace 7j)
-- SECURITY DEFINER + row_security off evite recursion RLS
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

-- ============================================================================
-- 5. MISE A JOUR POLICIES : public.cards
-- ============================================================================

-- NOTE : cards_select (migration 005) reste inchangee
-- Elle permet aux users de voir leurs cartes user (owner_id = auth.uid())
-- meme en free strict (visible mais verrouille = read-only)

-- INSERT : subscriber actif uniquement (plus EXISTS sur profiles.plan='subscriber')
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

-- UPDATE : subscriber actif uniquement (read-only si grace expiree)
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

-- DELETE : subscriber actif uniquement (empeche suppression si grace expiree)
DROP POLICY IF EXISTS cards_delete ON public.cards;
CREATE POLICY cards_delete ON public.cards
  FOR DELETE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid() AND owner_id IS NOT NULL AND public.is_subscriber_active(auth.uid())) OR
    public.is_admin()
  );

-- ============================================================================
-- 6. MISE A JOUR POLICIES : public.slots (CORRECTION FAILLE RLS)
-- ============================================================================

-- NOTE : slots_select et slots_delete (migration 005) restent inchangees
-- Elles permettent aux owners de voir et supprimer leurs slots meme en free strict
-- (utile pour nettoyer le planning apres expiration grace)

-- INSERT : verifier ownership cartes user + subscriber actif
-- FAILLE CORRIGEE : cards.owner_id = auth.uid() pour cartes user
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

-- UPDATE : permettre "sortie premium" (remplacer carte user par carte bank)
-- USING : gate leger (owner timeline), pas de verif carte ancienne
-- WITH CHECK : gate sur nouvelle carte uniquement (permet remplacement)
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

-- ----------------------------------------------------------------------------
-- Commentaires documentation
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN public.profiles.plan_expires_at IS 'Date expiration droits subscriber (periode grace 7j apres downgrade) - States: subscriber (NULL), grace active (> now()), grace expiree (<= now()), free jamais abonne (NULL) - ADMIN-ONLY (protege trigger guard) - CONTRAT: ne JAMAIS remettre a NULL apres expiration grace (necessaire pour purge J+90)';
COMMENT ON FUNCTION public.is_subscriber_active(uuid) IS 'Helper RLS : verifie si utilisateur a acces fonctionnalites subscriber (actif ou periode grace) - SECURITY DEFINER + row_security off evite recursion';
COMMENT ON POLICY slots_insert ON public.slots IS 'Securise ownership cartes user (cards.owner_id = auth.uid()) + require subscriber actif pour cartes user';
COMMENT ON POLICY slots_update ON public.slots IS 'Permet "sortie premium" : remplacer carte user verrouilee par carte bank - USING leger (owner timeline), WITH CHECK gate sur nouvelle carte';

-- ----------------------------------------------------------------------------
-- Notes implementation webhook et purge (hors perimetre migration)
-- ----------------------------------------------------------------------------
-- WEBHOOK STRIPE (downgrade subscriber -> free):
--   SET plan = 'free', plan_expires_at = now() + interval '7 days'
--
-- CRON JOB PURGE J+90 (hors DB, niveau serveur):
--   SELECT user_id FROM profiles
--   WHERE plan = 'free'
--     AND plan_expires_at IS NOT NULL
--     AND plan_expires_at <= now() - interval '90 days'
--
--   Strategie purge cartes user:
--     - slots.card_id a ON DELETE RESTRICT (empeche suppression carte referencee)
--     - Supprimer seulement cartes user NON referencees par des slots
--     - OU strategie avancee (supprimer slots / placeholder) a definir hors scope
--
-- IMPORTANT: ne jamais remettre plan_expires_at a NULL apres expiration grace
