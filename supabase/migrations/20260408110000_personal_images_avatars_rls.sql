-- Migration: Ajouter policies RLS pour sous-dossier avatars dans personal-images
-- Date: 2026-04-08
--
-- Contexte:
--   Le bucket personal-images existait uniquement pour {userId}/cards/{UUID}.jpg.
--   Les avatars profil nécessitent un chemin distinct : {userId}/avatars/{UUID}.jpg
--
-- Règles identiques aux cards (personal_images_*_owner) :
--   SELECT  — authentifié + owner + foldername[2]='avatars' + UUID.jpg
--   INSERT  — idem + subscriber ou admin (même restriction que cards)
--   DELETE  — authentifié + owner + foldername[2]='avatars' + UUID.jpg
--
-- COMPORTEMENT LOCAL vs PRODUCTION :
--  En local, storage.objects appartient à supabase_storage_admin.
--  Les migrations s'exécutent avec postgres (non propriétaire) → erreur de privilèges.
--  → La migration dégrade gracieusement : RAISE NOTICE + skip (pas d'erreur).
--  → Appliquer manuellement après reset : pnpm supabase:apply-storage-policies
--
--  En production (Supabase cloud), les migrations ont les droits suffisants.

DO $$
BEGIN

  -- Supprimer les anciennes politiques (idempotent)
  EXECUTE 'DROP POLICY IF EXISTS personal_images_avatars_select_owner ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS personal_images_avatars_insert_owner ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS personal_images_avatars_delete_owner ON storage.objects';

  -- SELECT : lecture de son propre avatar
  EXECUTE $policy$
    CREATE POLICY personal_images_avatars_select_owner
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'avatars'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
      )
  $policy$;

  -- INSERT : upload de son avatar (subscriber/admin uniquement — même règle que cards)
  EXECUTE $policy$
    CREATE POLICY personal_images_avatars_insert_owner
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'avatars'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
        AND EXISTS (
          SELECT 1 FROM public.accounts
          WHERE id = auth.uid()
          AND status IN ('subscriber', 'admin')
        )
      )
  $policy$;

  -- DELETE : suppression de son propre avatar
  EXECUTE $policy$
    CREATE POLICY personal_images_avatars_delete_owner
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'personal-images'
        AND name !~~ '%..%'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND (storage.foldername(name))[2] = 'avatars'
        AND split_part(name, '/', 3) ~* '^[0-9a-f-]{36}\.jpg$'
      )
  $policy$;

  RAISE NOTICE '[Storage RLS] Politiques personal_images_avatars_* créées avec succès.';

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '[Storage RLS] Droits insuffisants (environnement local détecté). Skip. Appliquer manuellement : pnpm supabase:apply-storage-policies';

END $$;
