-- Migration: Phase 7.4 — RLS policies: Library (cards, categories, user_card_categories)
-- Date: 2026-02-03
-- CORRECTED: 2026-02-03 (execution-only enforcement + bank unpublished readable if referenced)
--
-- Objectif:
-- Créer policies RLS pour bibliothèque cartes + catégories
--
-- Tables affectées: cards, categories, user_card_categories
--
-- Invariants enforced:
-- - cards: anon SELECT bank published, authenticated owner-only personal + bank published
-- - admin: peut gérer bank MAIS JAMAIS accéder personal d'autres users (D2)
-- - categories: owner-only, system immutable
-- - user_card_categories: owner-only, WITH CHECK prévient cross-account UUID
-- - execution-only mode: bloque cards personal INSERT/UPDATE/DELETE + categories/pivot (structural, BLOCKER 4)
-- - bank unpublished readable si referenced par owned objects (BLOCKER 5, TSA critical)
--
-- Décisions appliquées:
-- - D2: Admin ne peut jamais accéder images personnelles d'autres users
-- - Storage Policies restent la garantie primaire (owner-only bucket)
--
-- Smoke test: voir supabase/tests/phase7_smoke_tests.sql

BEGIN;

-- ============================================================
-- TABLE: cards
-- ============================================================
-- Règles:
-- - anon: SELECT bank published uniquement (read-only)
-- - authenticated: SELECT bank published + owner-only personal + bank unpublished if referenced (BLOCKER 5)
-- - admin: gérer bank (INSERT/UPDATE/DELETE) MAIS pas personal d'autres users (D2)
-- - DELETE bank référencée bloquée par trigger (phase5_8)
-- - execution-only mode: bloque personal INSERT/UPDATE/DELETE (structural, BLOCKER 4)

-- SELECT anon: lire cartes banque publiées uniquement
CREATE POLICY cards_select_bank_published_anon
  ON public.cards
  FOR SELECT
  TO anon
  USING (type = 'bank' AND published = TRUE);

-- SELECT authenticated: lire bank published + bank unpublished if referenced + ses propres personal
-- BLOCKER 5: bank unpublished reste lisible si référencée par owned objects (slots, sequences, pivot)
-- TSA critical: éviter cartes disparaissant après unpublish
CREATE POLICY cards_select_authenticated
  ON public.cards
  FOR SELECT
  TO authenticated
  USING (
    -- Bank published (visible à tous)
    (type = 'bank' AND published = TRUE)
    OR
    -- Personal owner-only
    (type = 'personal' AND account_id = auth.uid())
    OR
    -- BLOCKER 5: Bank unpublished MAIS référencée par owned objects
    (type = 'bank' AND published = FALSE AND (
      -- Référencée dans slots owned
      EXISTS (
        SELECT 1 FROM public.slots s
        JOIN public.timelines t ON t.id = s.timeline_id
        JOIN public.child_profiles cp ON cp.id = t.child_profile_id
        WHERE s.card_id = cards.id
        AND cp.account_id = auth.uid()
      )
      OR
      -- Référencée dans sequence_steps owned
      EXISTS (
        SELECT 1 FROM public.sequence_steps ss
        JOIN public.sequences seq ON seq.id = ss.sequence_id
        WHERE (ss.step_card_id = cards.id OR seq.mother_card_id = cards.id)
        AND seq.account_id = auth.uid()
      )
      OR
      -- Référencée dans user_card_categories owned
      EXISTS (
        SELECT 1 FROM public.user_card_categories ucc
        WHERE ucc.card_id = cards.id
        AND ucc.user_id = auth.uid()
      )
    ))
  );

-- SELECT admin: lire bank (toutes, published ou non) MAIS PAS personal d'autres users
-- IMPORTANT D2: admin ne peut JAMAIS lire personal d'autres users
-- (garantie primaire = Storage Policies owner-only bucket)
CREATE POLICY cards_select_admin
  ON public.cards
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    AND type = 'bank'
  );

-- INSERT authenticated: créer personal uniquement (quota via trigger)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY cards_insert_personal
  ON public.cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'personal'
    AND account_id = auth.uid()
    -- published doit être NULL pour personal (contrainte table)
    AND published IS NULL
    -- BLOCKER 4: bloquer INSERT en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- INSERT admin: créer bank uniquement
CREATE POLICY cards_insert_bank_admin
  ON public.cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    AND type = 'bank'
    AND account_id IS NULL
    AND published IS NOT NULL
  );

-- UPDATE authenticated: modifier ses propres personal uniquement
-- IMPORTANT: image_url immutable (trigger phase7_0)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY cards_update_personal
  ON public.cards
  FOR UPDATE
  TO authenticated
  USING (
    type = 'personal'
    AND account_id = auth.uid()
  )
  WITH CHECK (
    type = 'personal'
    AND account_id = auth.uid()
    -- BLOCKER 4: bloquer UPDATE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- UPDATE admin: modifier bank uniquement (publier/dépublier, rename)
CREATE POLICY cards_update_bank_admin
  ON public.cards
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    AND type = 'bank'
  )
  WITH CHECK (
    public.is_admin()
    AND type = 'bank'
  );

-- DELETE authenticated: supprimer ses propres personal uniquement
-- (vérif références via trigger si nécessaire)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY cards_delete_personal
  ON public.cards
  FOR DELETE
  TO authenticated
  USING (
    type = 'personal'
    AND account_id = auth.uid()
    -- BLOCKER 4: bloquer DELETE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- DELETE admin: supprimer bank uniquement
-- (trigger phase5_8 bloque si bank référencée)
CREATE POLICY cards_delete_bank_admin
  ON public.cards
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    AND type = 'bank'
  );

-- ============================================================
-- TABLE: categories
-- ============================================================
-- Owner-only: user peut uniquement gérer ses propres catégories
-- System immutable: "Sans catégorie" ne peut pas être modifiée/supprimée
-- execution-only mode: bloque INSERT/UPDATE/DELETE (structural, BLOCKER 4)

-- SELECT: lire ses propres catégories
CREATE POLICY categories_select_owner
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (account_id = auth.uid());

-- INSERT: créer une catégorie (pas system)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY categories_insert_owner
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id = auth.uid()
    -- is_system=FALSE (uniquement seed DB crée system)
    AND is_system = FALSE
    -- BLOCKER 4: bloquer INSERT en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier catégorie non-système uniquement
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY categories_update_owner
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND is_system = FALSE
  )
  WITH CHECK (
    account_id = auth.uid()
    AND is_system = FALSE
    -- BLOCKER 4: bloquer UPDATE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- DELETE: supprimer catégorie non-système uniquement
-- (trigger remap vers "Sans catégorie")
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY categories_delete_owner
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    account_id = auth.uid()
    AND is_system = FALSE
    -- BLOCKER 4: bloquer DELETE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- TABLE: user_card_categories (PIVOT)
-- ============================================================
-- Owner-only: user peut uniquement gérer ses propres mappings
-- WITH CHECK: prévenir cross-account via UUID injection
-- execution-only mode: bloque INSERT/UPDATE/DELETE (structural, BLOCKER 4)

-- SELECT: lire ses propres mappings
CREATE POLICY user_card_categories_select_owner
  ON public.user_card_categories
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: créer mapping (WITH CHECK vérifie ownership card + category)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY user_card_categories_insert_owner
  ON public.user_card_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    -- Prévenir cross-account: card doit être bank OU personal owner
    AND (
      EXISTS (
        SELECT 1 FROM public.cards
        WHERE id = card_id
        AND (type = 'bank' OR account_id = auth.uid())
      )
    )
    -- Prévenir cross-account: category doit être owner
    AND (
      EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = category_id
        AND account_id = auth.uid()
      )
    )
    -- BLOCKER 4: bloquer INSERT en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- UPDATE: modifier mapping (WITH CHECK vérifie ownership)
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY user_card_categories_update_owner
  ON public.user_card_categories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Même vérifs que INSERT
    AND (
      EXISTS (
        SELECT 1 FROM public.cards
        WHERE id = card_id
        AND (type = 'bank' OR account_id = auth.uid())
      )
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.categories
        WHERE id = category_id
        AND account_id = auth.uid()
      )
    )
    -- BLOCKER 4: bloquer UPDATE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- DELETE: supprimer mapping
-- BLOCKER 4: bloquer en execution-only mode (structural)
CREATE POLICY user_card_categories_delete_owner
  ON public.user_card_categories
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    -- BLOCKER 4: bloquer DELETE en execution-only mode (structural)
    AND NOT public.is_execution_only()
  );

-- ============================================================
-- Commentaires
-- ============================================================
COMMENT ON POLICY cards_select_bank_published_anon ON public.cards IS
  'Anon: read bank published cards only';

COMMENT ON POLICY cards_select_authenticated ON public.cards IS
  'Authenticated: read bank published + own personal cards + bank unpublished if referenced by owned objects (BLOCKER 5 TSA)';

COMMENT ON POLICY cards_select_admin ON public.cards IS
  'Admin: read bank cards (all) but NEVER personal of other users (D2)';

COMMENT ON POLICY cards_insert_personal ON public.cards IS
  'Authenticated: create personal card (quota enforced by trigger, blocked in execution-only mode)';

COMMENT ON POLICY cards_insert_bank_admin ON public.cards IS
  'Admin: create bank card only';

COMMENT ON POLICY cards_update_personal ON public.cards IS
  'Authenticated: update own personal card (image_url immutable by trigger, blocked in execution-only mode)';

COMMENT ON POLICY cards_update_bank_admin ON public.cards IS
  'Admin: update bank card (publish/unpublish, rename)';

COMMENT ON POLICY cards_delete_personal ON public.cards IS
  'Authenticated: delete own personal card (blocked in execution-only mode)';

COMMENT ON POLICY cards_delete_bank_admin ON public.cards IS
  'Admin: delete bank card (blocked if referenced by trigger)';

COMMENT ON POLICY categories_select_owner ON public.categories IS
  'Owner-only: user can read their own categories';

COMMENT ON POLICY categories_insert_owner ON public.categories IS
  'Owner-only: user can create category (not system, blocked in execution-only mode)';

COMMENT ON POLICY categories_update_owner ON public.categories IS
  'Owner-only: user can update non-system categories (blocked in execution-only mode)';

COMMENT ON POLICY categories_delete_owner ON public.categories IS
  'Owner-only: user can delete non-system categories (remap to system by trigger, blocked in execution-only mode)';

COMMENT ON POLICY user_card_categories_select_owner ON public.user_card_categories IS
  'Owner-only: user can read their own card-category mappings';

COMMENT ON POLICY user_card_categories_insert_owner ON public.user_card_categories IS
  'Owner-only: user can create mapping (WITH CHECK prevents cross-account UUID injection, blocked in execution-only mode)';

COMMENT ON POLICY user_card_categories_update_owner ON public.user_card_categories IS
  'Owner-only: user can update mapping (WITH CHECK prevents cross-account, blocked in execution-only mode)';

COMMENT ON POLICY user_card_categories_delete_owner ON public.user_card_categories IS
  'Owner-only: user can delete mapping (blocked in execution-only mode)';

COMMIT;
