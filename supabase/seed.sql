-- ============================================================================
-- Seed : Données de développement pour environnement local
-- ============================================================================
--
-- Ce fichier est exécuté automatiquement après `pnpm db:reset`.
-- Il crée des utilisateurs de test pour faciliter le développement local.
--
-- ⚠️ CRITIQUE : Ce fichier NE DOIT JAMAIS être exécuté en production.
--               Les identifiants sont publics et connus.
--
-- Convention Supabase : supabase/seed.sql est automatiquement chargé
--                       après migrations lors d'un `supabase db reset`.
-- ============================================================================

-- ============================================================================
-- 1. Compte Admin (développement local uniquement)
-- ============================================================================

DO $$
DECLARE
  v_admin_user_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';
  v_admin_email TEXT := 'admin@local.dev';
  v_admin_password TEXT := 'Admin1234x';
  v_user_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe déjà dans auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_admin_user_id OR email = v_admin_email
  ) INTO v_user_exists;

  -- Si l'utilisateur n'existe pas, le créer
  IF NOT v_user_exists THEN
    -- Insérer dans auth.users (table Supabase Auth)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_user_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')), -- Hash bcrypt du mot de passe
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insérer l'identité email
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_admin_user_id,
      v_admin_user_id,
      jsonb_build_object(
        'sub', v_admin_user_id,
        'email', v_admin_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Insérer dans public.accounts avec status='admin'
    INSERT INTO public.accounts (
      id,
      status,
      timezone
    ) VALUES (
      v_admin_user_id,
      'admin'::public.account_status,
      'Europe/Paris'
    );

    RAISE NOTICE '✅ Compte admin créé : % (ID: %)', v_admin_email, v_admin_user_id;
  ELSE
    RAISE NOTICE '⏭️  Compte admin existe déjà : %', v_admin_email;
  END IF;
END $$;

-- ============================================================================
-- 2. Comptes de test (optionnels)
-- ============================================================================

DO $$
DECLARE
  v_free_user_id UUID := 'ffffffff-ffff-ffff-ffff-000000000001';
  v_free_email TEXT := 'test-free@local.dev';
  v_free_password TEXT := 'Test1234x';
  v_user_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_free_user_id OR email = v_free_email
  ) INTO v_user_exists;

  -- Si l'utilisateur n'existe pas, le créer
  IF NOT v_user_exists THEN
    -- Insérer dans auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_free_user_id,
      'authenticated',
      'authenticated',
      v_free_email,
      crypt(v_free_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insérer l'identité email
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_free_user_id,
      v_free_user_id,
      jsonb_build_object(
        'sub', v_free_user_id,
        'email', v_free_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Insérer dans public.accounts avec status='free'
    INSERT INTO public.accounts (
      id,
      status,
      timezone
    ) VALUES (
      v_free_user_id,
      'free'::public.account_status,
      'Europe/Paris'
    );

    RAISE NOTICE '✅ Compte test free créé : % (ID: %)', v_free_email, v_free_user_id;
  ELSE
    RAISE NOTICE '⏭️  Compte test free existe déjà : %', v_free_email;
  END IF;
END $$;

-- ============================================================================
-- 3. Compte Subscriber (abonné)
-- ============================================================================

DO $$
DECLARE
  v_subscriber_user_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001';
  v_subscriber_email TEXT := 'test-subscriber@local.dev';
  v_subscriber_password TEXT := 'Test1234x';
  v_user_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe déjà
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_subscriber_user_id OR email = v_subscriber_email
  ) INTO v_user_exists;

  -- Si l'utilisateur n'existe pas, le créer
  IF NOT v_user_exists THEN
    -- Insérer dans auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_subscriber_user_id,
      'authenticated',
      'authenticated',
      v_subscriber_email,
      crypt(v_subscriber_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insérer l'identité email
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_subscriber_user_id,
      v_subscriber_user_id,
      jsonb_build_object(
        'sub', v_subscriber_user_id,
        'email', v_subscriber_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Insérer dans public.accounts avec status='subscriber'
    INSERT INTO public.accounts (
      id,
      status,
      timezone
    ) VALUES (
      v_subscriber_user_id,
      'subscriber'::public.account_status,
      'Europe/Paris'
    );

    RAISE NOTICE '✅ Compte test subscriber créé : % (ID: %)', v_subscriber_email, v_subscriber_user_id;
  ELSE
    RAISE NOTICE '⏭️  Compte test subscriber existe déjà : %', v_subscriber_email;
  END IF;
END $$;

-- ============================================================================
-- Résumé des comptes créés
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔐 ========================================';
  RAISE NOTICE '🔐 Comptes de test disponibles :';
  RAISE NOTICE '🔐 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Admin :';
  RAISE NOTICE '   Email    : admin@local.dev';
  RAISE NOTICE '   Password : Admin1234x';
  RAISE NOTICE '   Statut   : admin';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Subscriber (Abonné) :';
  RAISE NOTICE '   Email    : test-subscriber@local.dev';
  RAISE NOTICE '   Password : Test1234x';
  RAISE NOTICE '   Statut   : subscriber';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Free :';
  RAISE NOTICE '   Email    : test-free@local.dev';
  RAISE NOTICE '   Password : Test1234x';
  RAISE NOTICE '   Statut   : free';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 ========================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Notes importantes :
-- ============================================================================
--
-- 1. Ce fichier est UNIQUEMENT pour le développement local (Docker).
--    ⚠️ NE JAMAIS exécuter en production.
--
-- 2. Les mots de passe sont volontairement simples et publics.
--    Ils sont UNIQUEMENT pour faciliter les tests locaux.
--
-- 3. Les UUID sont fixes pour faciliter les tests et le débogage.
--    Format : aaaaaaaa-aaaa-aaaa-aaaa-00000000000X (admin)
--             ffffffff-ffff-ffff-ffff-00000000000X (free)
--
-- 4. Le script est idempotent :
--    - Vérification EXISTS avant INSERT
--    - Pas d'erreur si les comptes existent déjà
--
-- 5. Exécution automatique :
--    - Lancé automatiquement par `pnpm db:reset`
--    - Lancé automatiquement par `supabase db reset`
--
-- ============================================================================
