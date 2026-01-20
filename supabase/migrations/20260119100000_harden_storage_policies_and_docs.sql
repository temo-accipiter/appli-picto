-- ============================================================================
-- Migration 009 : harden_storage_policies_and_docs
-- ============================================================================
-- Objectif : Aligner policies storage et documentation sur règle RGPD stricte
--   "Admin peut gérer métadonnées DB, mais JAMAIS accéder aux images users"
--
-- Changements :
--   1. Retirer OR public.is_admin() des policies WRITE cards-user
--   2. Clarifier documentation sur bucket public vs RLS
--
-- Prérequis : Migration 008 (split_storage_buckets) appliquée
-- ============================================================================

-- ============================================================================
-- 1. POLICIES CARDS-USER : Retirer exception admin des WRITE
-- ============================================================================
-- Règle RGPD : Admin ne peut JAMAIS interagir avec images utilisateurs
-- Même si prefix user/<uid>/ empêche déjà l'accès aux autres, on retire
-- toute mention admin pour clarté et cohérence.
--
-- Nouvelle règle WRITE = owner + subscriber actif (SANS admin)

-- ----------------------------------------------------------------------------
-- INSERT : Owner + subscriber actif (SANS admin)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_user_storage_insert" ON storage.objects;
CREATE POLICY "cards_user_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-user' AND
    auth.uid() IS NOT NULL AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    public.is_subscriber_active(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- UPDATE : Owner + subscriber actif (SANS admin)
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- DELETE : Owner + subscriber actif (SANS admin)
-- ----------------------------------------------------------------------------

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
-- 2. DOCUMENTATION : Clarification bucket public vs RLS
-- ============================================================================
-- NOTE IMPORTANTE SUR LE COMPORTEMENT SUPABASE :
--
-- ⚠️  BUCKET PUBLIC (storage.buckets.public = true) :
-- ----------------------------------------------------------------------------
-- Quand un bucket est marqué "public", Supabase expose les objets via :
--   /storage/v1/object/public/<bucket>/<path>
--
-- Cette URL publique IGNORE TOTALEMENT les policies RLS sur storage.objects.
-- Les policies RLS s'appliquent UNIQUEMENT aux requêtes authentifiées via :
--   - API Supabase (supabase.storage.from(...).list/download/upload)
--   - URLs signées (signed URLs)
--
-- Conséquence pour cards-bank (public=true) :
-- ----------------------------------------------------------------------------
-- Le garde-fou SELECT (name LIKE 'bank/%') protège :
--   ✅ Le listing via API authentifiée (.list())
--   ✅ L'accès via signed URLs
--   ❌ PAS l'accès via URL publique /object/public/cards-bank/...
--
-- La vraie protection contre upload accidentel repose sur :
--   ✅ Policies INSERT/UPDATE/DELETE : admin-only + name LIKE 'bank/%'
--   ✅ Discipline opérationnelle : ne jamais uploader via service_role/scripts
--      non contrôlés directement dans cards-bank
--
-- Si un objet était uploadé avec un mauvais path (ex: 'malicious.jpg') :
--   - Il serait VISIBLE via URL publique (bucket public = true)
--   - Mais INVISIBLE via .list() RLS (SELECT bloqué par name LIKE 'bank/%')
--
-- Conclusion :
-- ----------------------------------------------------------------------------
-- Le SELECT avec prefix est un garde-fou contre le LISTING non autorisé,
-- PAS une protection absolue contre l'accès aux fichiers dans un bucket public.
-- Pour cards-bank, c'est acceptable car les images banque sont publiques by design.
--
-- Pour cards-user (public=false), les policies RLS sont la vraie protection
-- car l'URL publique n'existe pas (bucket privé = signed URLs obligatoires).

-- ============================================================================
-- 3. AUDIT : Vérification policies après migration
-- ============================================================================
--
-- Après application de cette migration, les 8 policies storage doivent être :
--
-- cards-bank (4 policies) :
--   - cards_bank_storage_select  : bucket + name LIKE 'bank/%'
--   - cards_bank_storage_insert  : bucket + name LIKE 'bank/%' + is_admin()
--   - cards_bank_storage_update  : bucket + name LIKE 'bank/%' + is_admin()
--   - cards_bank_storage_delete  : bucket + name LIKE 'bank/%' + is_admin()
--
-- cards-user (4 policies) - SANS is_admin() :
--   - cards_user_storage_select  : bucket + auth.uid() + name LIKE 'user/<uid>/%'
--   - cards_user_storage_insert  : bucket + auth.uid() + name LIKE 'user/<uid>/%' + is_subscriber_active()
--   - cards_user_storage_update  : bucket + auth.uid() + name LIKE 'user/<uid>/%' + is_subscriber_active()
--   - cards_user_storage_delete  : bucket + auth.uid() + name LIKE 'user/<uid>/%' + is_subscriber_active()
--
-- Commande audit :
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- ORDER BY policyname;
--
-- Vérifier qu'AUCUNE policy cards_user_* ne contient 'is_admin'.

-- ============================================================================
-- 4. NOTES RGPD FINALES
-- ============================================================================
--
-- Règle produit respectée :
-- ----------------------------------------------------------------------------
-- ✅ Admin peut voir métadonnées DB (RLS DB cards_select autorise is_admin())
-- ✅ Admin peut supprimer/bloquer carte via DB (RLS DB cards_delete/update)
-- ✅ Admin NE PEUT PAS voir/modifier/supprimer images user (storage policies)
--
-- Aucune policy storage cards-user ne mentionne is_admin() :
--   - SELECT : owner-only strict
--   - INSERT/UPDATE/DELETE : owner + subscriber_active (SANS admin)
--
-- Le blocage admin fonctionne car :
--   1. Bucket cards-user est PRIVATE (public=false)
--   2. Accès nécessite signed URL ou API authentifiée
--   3. Policies RLS bloquent tout sauf owner
--   4. Admin (qui n'est pas owner) est donc bloqué à 100%
