-- ============================================================================
-- Migration : baseline_storage
-- File      : 20260121102000_baseline_storage.sql
-- ============================================================================
-- Baseline Storage (projet neuf) :
-- - 2 buckets séparés
--   * cards-bank (PUBLIC)  : images banque (accessibles anon via endpoint public)
--   * cards-user (PRIVATE) : images utilisateurs (signed URLs + RLS strict)
-- - Policies storage.objects :
--   * cards-bank  : SELECT public (prefix bank/), WRITE admin only
--   * cards-user  : SELECT owner only, WRITE owner + subscriber actif (SANS admin)
-- ============================================================================
-- Dépendances :
-- - baseline_init_schema + baseline_rls_policies (fonctions public.is_admin,
--   public.is_subscriber_active)
-- ============================================================================

-- ============================================================================
-- 0. NETTOYAGE : anciennes policies (si présentes)
-- ============================================================================
-- Anciennes policies sur bucket 'cards' (ancien design)
DROP POLICY IF EXISTS "cards_storage_read_bank"   ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_read_user"   ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_user" ON storage.objects;

-- ============================================================================
-- 1. BUCKETS
-- ============================================================================
-- A) Bucket cards-bank (PUBLIC) - Images banque
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cards-bank',
  'cards-bank',
  true, -- PUBLIC : endpoint /object/public/... utilisable pour Visitor (anon)
  1048576, -- 1MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- B) Bucket cards-user (PRIVATE) - Images utilisateurs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cards-user',
  'cards-user',
  false, -- PRIVATE : accès via signed URLs + policies RLS
  1048576, -- 1MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. POLICIES : cards-bank (PUBLIC)
-- ============================================================================
-- SELECT : Tout le monde (anon + authenticated) + enforce prefix 'bank/'
DROP POLICY IF EXISTS "cards_bank_storage_select" ON storage.objects;
CREATE POLICY "cards_bank_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%'
  );

-- INSERT : Admin uniquement + enforce prefix 'bank/'
DROP POLICY IF EXISTS "cards_bank_storage_insert" ON storage.objects;
CREATE POLICY "cards_bank_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  );

-- UPDATE : Admin uniquement + enforce prefix 'bank/'
DROP POLICY IF EXISTS "cards_bank_storage_update" ON storage.objects;
CREATE POLICY "cards_bank_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  );

-- DELETE : Admin uniquement + enforce prefix 'bank/'
DROP POLICY IF EXISTS "cards_bank_storage_delete" ON storage.objects;
CREATE POLICY "cards_bank_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  );

-- ============================================================================
-- 3. POLICIES : cards-user (PRIVATE)
-- ============================================================================
-- SELECT : Owner uniquement (PAS admin - RGPD strict) + enforce prefix user/<uid>/
DROP POLICY IF EXISTS "cards_user_storage_select" ON storage.objects;
CREATE POLICY "cards_user_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL
  );

-- INSERT : Owner + subscriber actif (SANS admin)
DROP POLICY IF EXISTS "cards_user_storage_insert" ON storage.objects;
CREATE POLICY "cards_user_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-user' AND
    auth.uid() IS NOT NULL AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    public.is_subscriber_active(auth.uid())
  );

-- UPDATE : Owner + subscriber actif (SANS admin)
DROP POLICY IF EXISTS "cards_user_storage_update" ON storage.objects;
CREATE POLICY "cards_user_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cards-user' AND
    auth.uid() IS NOT NULL AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    public.is_subscriber_active(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'cards-user' AND
    auth.uid() IS NOT NULL AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    public.is_subscriber_active(auth.uid())
  );

-- DELETE : Owner + subscriber actif (SANS admin)
DROP POLICY IF EXISTS "cards_user_storage_delete" ON storage.objects;
CREATE POLICY "cards_user_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-user' AND
    auth.uid() IS NOT NULL AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    public.is_subscriber_active(auth.uid())
  );

-- ============================================================================
-- Notes importantes (comportement Supabase)
-- ============================================================================
-- - Bucket PUBLIC : endpoint /storage/v1/object/public/<bucket>/<path> accessible
--   sans signed URL. Les policies sur storage.objects ne s'appliquent pas à cet
--   endpoint de lecture publique, d'où le choix :
--   * cards-bank = public=true (images banque volontairement publiques)
--   * cards-user = public=false (RGPD : aucune URL publique possible)
-- - Les opérations WRITE (insert/update/delete) passent toujours par RLS.
-- ============================================================================
