-- ================================================================
-- Migration: Politiques RLS Storage pour images cartes personnelles
-- Bucket : personal-images
-- Chemin contractuel : {account_id}/cards/{card_id}.jpg
--
-- Contraintes :
--  - Propriétaire uniquement : lecture/écriture/suppression de ses propres images
--  - Pas de bypass admin (admin ne doit PAS voir les images perso des autres)
--  - Structure stricte : {uid}/cards/{uuid}.jpg
--  - Protection contre path traversal
--  - DB-first : pas de gating quota/rôle ici (géré par triggers + RLS sur cards)
--
-- COMPORTEMENT LOCAL vs PRODUCTION :
--  En local, storage.objects appartient à supabase_storage_admin.
--  Les migrations s'exécutent avec postgres (non propriétaire) → erreur de privilèges.
--  → La migration dégrade gracieusement : RAISE NOTICE + skip (pas d'erreur).
--  → Appliquer manuellement après reset : pnpm supabase:apply-storage-policies
--
--  En production (Supabase cloud), les migrations ont les droits suffisants.
--  → Cette migration s'applique automatiquement et normalement.
-- ================================================================

DO $$
BEGIN

  -- =====================================
  -- 1. Activer RLS sur storage.objects
  -- =====================================
  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

  -- =====================================
  -- 2. Supprimer les anciennes politiques (idempotent)
  -- =====================================
  EXECUTE 'DROP POLICY IF EXISTS personal_images_select_owner ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS personal_images_insert_owner ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS personal_images_delete_owner ON storage.objects';

  -- =====================================
  -- 3. Créer les nouvelles politiques (path-based robuste)
  -- =====================================

  -- SELECT : lecture uniquement de ses propres images
  -- Chemin : {uid}/cards/{uuid}.jpg
  EXECUTE $policy$
    CREATE POLICY personal_images_select_owner
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'cards'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
      )
  $policy$;

  -- INSERT : upload uniquement vers son propre chemin
  -- Chemin : {uid}/cards/{uuid}.jpg
  --
  -- DB-first : filtre accounts.status ici car Free/Visitor = fonctionnalité indisponible.
  -- Source : FRONTEND_CONTRACT §3.2.3 — "Créer carte personnelle : Free ❌ / Subscriber ✅ / Admin ✅"
  -- Source : ux.md L3118 — "'Pas concerné' = fonctionnalité indisponible, pas quota illimité"
  -- Les quotas stock/mensuel Subscriber sont ensuite contrôlés en DB (trigger check_can_create_personal_card).
  -- Le frontend upload de façon optimiste → INSERT cards → cleanup si rejeté par quota.
  EXECUTE $policy$
    CREATE POLICY personal_images_insert_owner
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'cards'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
        AND EXISTS (
          SELECT 1 FROM public.accounts
          WHERE id = auth.uid()
          AND status IN ('subscriber', 'admin')
        )
      )
  $policy$;

  -- DELETE : suppression uniquement de ses propres images
  -- Chemin : {uid}/cards/{uuid}.jpg
  EXECUTE $policy$
    CREATE POLICY personal_images_delete_owner
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'cards'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
      )
  $policy$;

  RAISE NOTICE '[Storage RLS] Politiques personal_images_* créées avec succès.';

EXCEPTION
  WHEN insufficient_privilege THEN
    -- En local : postgres n'est pas propriétaire de storage.objects → skip gracieux
    -- En production : ne devrait jamais arriver (droits suffisants)
    RAISE NOTICE '[Storage RLS] Droits insuffisants (environnement local détecté). Skip. Appliquer manuellement : pnpm supabase:apply-storage-policies';

END $$;
