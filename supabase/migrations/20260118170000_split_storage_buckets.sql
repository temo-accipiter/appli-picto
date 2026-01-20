-- ============================================================================
-- Migration 008 : split_storage_buckets
-- ============================================================================
-- Objectif : Passer de 1 bucket unique à 2 buckets séparés
-- - cards-bank (PUBLIC) : images banque visibles par Visitor (anon)
-- - cards-user (PRIVATE) : images users avec signed URLs (RGPD strict)
--
-- Path format (sans colonne image_bucket) :
-- - Bank : bank/<card_id>.<ext> → bucket cards-bank
-- - User : user/<owner_id>/<card_id>.<ext> → bucket cards-user
-- ============================================================================

-- ============================================================================
-- 0. NETTOYAGE : Supprimer anciennes policies migration 007 (si existent)
-- ============================================================================

-- Anciennes policies sur bucket 'cards' (migration 007)
DROP POLICY IF EXISTS "cards_storage_read_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_read_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_insert_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_update_user" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_bank" ON storage.objects;
DROP POLICY IF EXISTS "cards_storage_delete_user" ON storage.objects;

-- ============================================================================
-- 1. STORAGE : Créer 2 buckets séparés
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Bucket cards-bank (PUBLIC) - Images banque
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cards-bank',
  'cards-bank',
  true, -- PUBLIC (pas de signed URLs requis, Visitor peut voir)
  1048576, -- 1MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- B) Bucket cards-user (PRIVATE) - Images utilisateurs
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cards-user',
  'cards-user',
  false, -- PRIVATE (signed URLs obligatoires, RGPD)
  1048576, -- 1MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORAGE POLICIES : cards-bank (PUBLIC)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT : Tout le monde (anon + authenticated + admin) + enforce prefix 'bank/'
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_bank_storage_select" ON storage.objects;
CREATE POLICY "cards_bank_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%'
  );

-- ----------------------------------------------------------------------------
-- INSERT : Admin uniquement + enforce prefix 'bank/'
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_bank_storage_insert" ON storage.objects;
CREATE POLICY "cards_bank_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- UPDATE : Admin uniquement + enforce prefix 'bank/'
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- DELETE : Admin uniquement + enforce prefix 'bank/'
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_bank_storage_delete" ON storage.objects;
CREATE POLICY "cards_bank_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-bank' AND
    name LIKE 'bank/%' AND
    public.is_admin()
  );

-- ============================================================================
-- 3. STORAGE POLICIES : cards-user (PRIVATE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SELECT : Owner uniquement (PAS admin - RGPD strict)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_user_storage_select" ON storage.objects;
CREATE POLICY "cards_user_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- INSERT : Owner + subscriber actif OU admin
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_user_storage_insert" ON storage.objects;
CREATE POLICY "cards_user_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL AND
    (public.is_subscriber_active(auth.uid()) OR public.is_admin())
  );

-- ----------------------------------------------------------------------------
-- UPDATE : Owner + subscriber actif OU admin
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_user_storage_update" ON storage.objects;
CREATE POLICY "cards_user_storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL AND
    (public.is_subscriber_active(auth.uid()) OR public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL AND
    (public.is_subscriber_active(auth.uid()) OR public.is_admin())
  );

-- ----------------------------------------------------------------------------
-- DELETE : Owner + subscriber actif OU admin
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "cards_user_storage_delete" ON storage.objects;
CREATE POLICY "cards_user_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cards-user' AND
    name LIKE 'user/' || auth.uid()::text || '/%' AND
    auth.uid() IS NOT NULL AND
    (public.is_subscriber_active(auth.uid()) OR public.is_admin())
  );

-- ============================================================================
-- 4. DB INVARIANTS : Mise à jour trigger validate_card_image_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_card_image_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Bank cards: image_path must start with 'bank/'
  -- → bucket cards-bank (PUBLIC)
  IF NEW.owner_type = 'bank' THEN
    IF NOT (NEW.image_path LIKE 'bank/%') THEN
      RAISE EXCEPTION 'Bank card image_path must start with bank/ (bucket: cards-bank)';
    END IF;
  END IF;

  -- User cards: image_path must start with 'user/<owner_id>/'
  -- → bucket cards-user (PRIVATE)
  IF NEW.owner_type = 'user' THEN
    IF NOT (NEW.image_path LIKE 'user/' || NEW.owner_id::text || '/%') THEN
      RAISE EXCEPTION 'User card image_path must start with user/<owner_id>/ (bucket: cards-user)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS cards_validate_image_path ON public.cards;
CREATE TRIGGER cards_validate_image_path
  BEFORE INSERT OR UPDATE OF image_path, owner_type, owner_id ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_card_image_path();

-- ============================================================================
-- 5. RLS DB : Cards & Categories (inchangées, déjà définies migration 007)
-- ============================================================================

-- NOTE: Les policies RLS DB suivantes sont déjà définies dans migration 007:
-- - cards_select, cards_insert, cards_update, cards_delete
-- - categories_select, categories_insert, categories_update, categories_delete
-- - Constraints: cards_bank_no_category, categories_user_only
-- - Triggers: validate_card_category
--
-- Cette migration 008 ne les redéfinit PAS pour éviter redondance.
-- Si migration 007 pas encore appliquée, l'appliquer d'abord.

-- ============================================================================
-- 6. AUDIT : Vérifier aucune policy storage inattendue
-- ============================================================================

-- NOTE: Après application migration 008, seules 8 policies storage doivent exister:
--   - cards_bank_storage_select/insert/update/delete (4)
--   - cards_user_storage_select/insert/update/delete (4)
--
-- Commande audit (à exécuter après migration) :
-- SELECT policyname
-- FROM pg_policies
-- WHERE tablename = 'objects'
-- ORDER BY policyname;
--
-- Résultat attendu : exactement 8 policies listées ci-dessus
-- Si policies supplémentaires existent : investiguer (risque faille sécurité)

-- ============================================================================
-- 7. COMMENTAIRES DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.validate_card_image_path() IS
  'Trigger : validate image_path format and bucket mapping:
   - Bank cards: bank/<card_id>.<ext> → bucket cards-bank (PUBLIC)
   - User cards: user/<owner_id>/<card_id>.<ext> → bucket cards-user (PRIVATE)';

-- ============================================================================
-- 7. NOTES ARCHITECTURE & RGPD
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Architecture 2 buckets
-- ----------------------------------------------------------------------------
-- BUCKET cards-bank (PUBLIC):
--   - Images banque visibles par Visitor (anon) sans signed URLs
--   - Path format: bank/<card_id>.<ext>
--   - WRITE: admin only + enforce prefix 'bank/'
--   - READ: tout le monde + enforce prefix 'bank/' (garde-fou sécurité)
--
-- BUCKET cards-user (PRIVATE):
--   - Images utilisateurs avec signed URLs obligatoires
--   - Path format: user/<owner_id>/<card_id>.<ext>
--   - WRITE: owner + subscriber actif OU admin + enforce prefix 'user/<uid>/'
--   - READ: owner uniquement (RGPD strict)
--
-- ----------------------------------------------------------------------------
-- Mapping DB → Storage (sans colonne image_bucket)
-- ----------------------------------------------------------------------------
-- Le préfixe dans cards.image_path détermine le bucket :
--   - Préfixe 'bank/' → bucket cards-bank
--   - Préfixe 'user/' → bucket cards-user
--
-- Trigger validate_card_image_path enforce cette convention.
--
-- Path DB vs Path Storage (IMPORTANT):
--   - Bank : DB = 'bank/abc.jpg'  → Storage = 'bank/abc.jpg' (identique)
--   - User : DB = 'user/<uid>/x.jpg' → Storage = 'user/<uid>/x.jpg' (identique)
--
-- Pas de transformation nécessaire (contrairement à version précédente).
--
-- ----------------------------------------------------------------------------
-- RGPD : Admin metadata vs images
-- ----------------------------------------------------------------------------
-- RLS DB cards SELECT → Admin voit metadata (name, category_id, created_at)
-- Storage cards-user SELECT → Admin bloqué (owner-only)
-- => Admin peut lister user cards mais ne peut PAS fetch les images
--
-- ----------------------------------------------------------------------------
-- Visitor (anon) support
-- ----------------------------------------------------------------------------
-- Visitor peut :
--   - SELECT public.cards WHERE owner_type='bank' (RLS DB)
--   - Fetch images depuis bucket cards-bank (PUBLIC, pas de signed URLs)
--
-- Visitor ne peut PAS :
--   - Voir user cards (RLS DB bloque)
--   - Fetch images user (bucket cards-user PRIVATE)
--
-- ----------------------------------------------------------------------------
-- Corrections Migration 008 (version 2)
-- ----------------------------------------------------------------------------
-- 🐛 BUG FIXES:
--   - ✅ Policies cards-user: ajout préfixe 'user/' (était manquant)
--   - ✅ Policies cards-bank WRITE: enforce prefix 'bank/' (sécurité)
--   - ✅ Policies cards-bank SELECT: enforce prefix 'bank/' (garde-fou)
--   - ✅ Suppression anciennes policies migration 007 (nettoyage)
--
-- 🧹 NETTOYAGE:
--   - ✅ Suppression redondance constraints/triggers (déjà migration 007)
--   - ✅ Documentation claire dépendance migration 007
--
-- ----------------------------------------------------------------------------
-- Migration données existantes (si bucket 'cards' existe)
-- ----------------------------------------------------------------------------
-- 1. Lister toutes images dans ancien bucket 'cards'
-- 2. Copier images selon path prefix :
--    - Prefix 'bank/' : copier vers cards-bank avec path identique
--    - Prefix 'user/' : copier vers cards-user avec path identique
-- 3. Mettre à jour cards.image_path si format différent
-- 4. Supprimer ancien bucket 'cards' (ou garder temporairement)
--
-- Script migration data : supabase/scripts/migrate-cards-storage.ts
-- Guide complet : supabase/scripts/MIGRATION_GUIDE_008.md
