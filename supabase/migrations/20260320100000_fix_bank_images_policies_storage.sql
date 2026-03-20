-- ============================================================================
-- Migration : Fix bank-images Storage RLS Policies (admin-only)
-- Date : 2026-03-20
-- ============================================================================
--
-- PROBLÈME RÉSOLU :
-- Les policies bank-images utilisaient is_admin() (fonction SECURITY DEFINER).
-- Bug Supabase Storage v1.33.0 : auth.uid() retourne NULL dans le contexte
-- d'évaluation des policies BEFORE INSERT, causant is_admin() → FALSE.
--
-- SOLUTION :
-- Remplacer is_admin() par SELECT status inline (pas EXISTS).
-- Pattern qui fonctionne : (SELECT status FROM accounts WHERE id = auth.uid()) = 'admin'
-- Pattern qui fonctionne : auth.uid() utilisé directement dans la policy.
--
-- COMPORTEMENT LOCAL vs PRODUCTION :
-- En local, storage.objects appartient à supabase_storage_admin.
-- Les migrations s'exécutent avec postgres (non propriétaire) → erreur de privilèges.
-- → La migration dégrade gracieusement : RAISE NOTICE + skip (pas d'erreur).
-- → Appliquer manuellement après reset : pnpm supabase:apply-bank-storage-policies
--
-- RÉFÉRENCE :
-- - Migration similaire : 20260226071400_fix_personal_images_policies_for_cards.sql
-- - Pattern testé : personal_images_* (fonctionne avec auth.uid() inline)
--
-- ============================================================================

DO $$
BEGIN
  -- ============================================================================
  -- Drop policies existantes (idempotent)
  -- ============================================================================

  DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;
  DROP POLICY IF EXISTS bank_images_update_admin ON storage.objects;
  DROP POLICY IF EXISTS bank_images_delete_admin ON storage.objects;

  -- ============================================================================
  -- bank_images_insert_admin (admin-only write) - AVEC EXISTS INLINE
  -- ============================================================================

  CREATE POLICY bank_images_insert_admin
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bank-images'
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%/%'
    AND name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$'
    AND (
      -- Vérification admin inline (SELECT status) au lieu de EXISTS
      -- Pattern qui fonctionne avec Supabase Storage API
      (SELECT status FROM public.accounts WHERE id = auth.uid()) = 'admin'::public.account_status
    )
  );

  -- ============================================================================
  -- bank_images_update_admin (admin-only update) - AVEC EXISTS INLINE
  -- ============================================================================

  CREATE POLICY bank_images_update_admin
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%/%'
    AND name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$'
    AND (
      (SELECT status FROM public.accounts WHERE id = auth.uid()) = 'admin'::public.account_status
    )
  )
  WITH CHECK (
    bucket_id = 'bank-images'
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%/%'
    AND name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$'
    AND (
      (SELECT status FROM public.accounts WHERE id = auth.uid()) = 'admin'::public.account_status
    )
  );

  -- ============================================================================
  -- bank_images_delete_admin (admin-only delete) - AVEC EXISTS INLINE
  -- ============================================================================

  CREATE POLICY bank_images_delete_admin
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bank-images'
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%/%'
    AND name ~ '^[0-9A-Fa-f-]{36}\.[A-Za-z0-9]+$'
    AND (
      (SELECT status FROM public.accounts WHERE id = auth.uid()) = 'admin'::public.account_status
    )
  );

  RAISE NOTICE '[Storage RLS] Policies bank-images corrigées (is_admin() → EXISTS inline)';

EXCEPTION
  WHEN insufficient_privilege THEN
    -- En local : postgres n'est pas propriétaire de storage.objects → skip gracieux
    RAISE NOTICE '[Storage RLS] Droits insuffisants (environnement local détecté). Skip. Appliquer manuellement : pnpm supabase:apply-bank-storage-policies';
  WHEN OTHERS THEN
    -- Autres erreurs : propagation
    RAISE;
END $$;
