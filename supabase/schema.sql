


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "public"."account_status" AS ENUM (
    'free',
    'subscriber',
    'admin'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."admin_action" AS ENUM (
    'revoke_sessions',
    'disable_device',
    'resync_subscription_from_stripe',
    'append_subscription_log',
    'request_account_deletion',
    'export_proof_evidence'
);


ALTER TYPE "public"."admin_action" OWNER TO "postgres";


CREATE TYPE "public"."card_type" AS ENUM (
    'bank',
    'personal'
);


ALTER TYPE "public"."card_type" OWNER TO "postgres";


CREATE TYPE "public"."child_profile_status" AS ENUM (
    'active',
    'locked'
);


ALTER TYPE "public"."child_profile_status" OWNER TO "postgres";


CREATE TYPE "public"."session_state" AS ENUM (
    'active_preview',
    'active_started',
    'completed'
);


ALTER TYPE "public"."session_state" OWNER TO "postgres";


CREATE TYPE "public"."slot_kind" AS ENUM (
    'step',
    'reward'
);


ALTER TYPE "public"."slot_kind" OWNER TO "postgres";


CREATE TYPE "public"."transport_type" AS ENUM (
    'metro',
    'tram',
    'bus'
);


ALTER TYPE "public"."transport_type" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "public"."accounts_auto_create_first_child_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Créer un profil enfant avec nom par défaut "Mon enfant"
  -- Statut = 'active' par défaut (cf. table child_profiles)
  INSERT INTO child_profiles (account_id, name)
  VALUES (NEW.id, 'Mon enfant');

  -- Le trigger sur child_profiles prendra le relais pour créer timeline + slots
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."accounts_auto_create_first_child_profile"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accounts_auto_create_first_child_profile"() IS 'Contrat produit § 2.6: Créer automatiquement le premier profil enfant "Mon enfant" à la création d''un compte';



CREATE OR REPLACE FUNCTION "public"."accounts_seed_system_category"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_system_id uuid;
BEGIN
  -- Si déjà présent, ne rien faire
  SELECT id INTO v_system_id
  FROM categories
  WHERE account_id = NEW.id
    AND is_system = TRUE
  LIMIT 1;

  IF v_system_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Créer "Sans catégorie" (nom en FR, conforme au contrat actuel)
  -- Stratégie robuste:
  -- - tente une insertion; si un doublon (account_id, name) existe, on force is_system=TRUE
  BEGIN
    INSERT INTO categories (account_id, name, is_system)
    VALUES (NEW.id, 'Sans catégorie', TRUE);
  EXCEPTION
    WHEN unique_violation THEN
      -- Si la catégorie existe déjà (même nom), on la "répare" en is_system=TRUE
      UPDATE categories
      SET is_system = TRUE,
          updated_at = NOW()
      WHERE account_id = NEW.id
        AND name = 'Sans catégorie';
  END;

  -- Sécurité: s'assurer qu'il y a bien une catégorie système (sinon on bloque)
  PERFORM 1
  FROM categories
  WHERE account_id = NEW.id
    AND is_system = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de créer la catégorie système pour account_id=%', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."accounts_seed_system_category"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accounts_seed_system_category"() IS 'Crée la catégorie système "Sans catégorie" (is_system=TRUE) dès la création d''un account';



CREATE OR REPLACE FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_result JSON;
  v_account_info JSON;
  v_devices_info JSON;
  v_profiles_info JSON;
  v_cards_info JSON;
  v_sessions_info JSON;
BEGIN
  -- Vérifier que current user est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin_get_account_support_info requires admin status'
      USING HINT = 'Only admin users can access support information';
  END IF;

  -- Account info (métadonnées non-sensibles)
  SELECT json_build_object(
    'account_id', id,
    'status', status,
    'timezone', timezone,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO v_account_info
  FROM public.accounts
  WHERE id = target_account_id;

  IF v_account_info IS NULL THEN
    RAISE EXCEPTION 'Account not found: %', target_account_id;
  END IF;

  -- Devices info (compteurs)
  SELECT json_build_object(
    'total_devices', COUNT(*),
    'active_devices', COUNT(*) FILTER (WHERE revoked_at IS NULL),
    'revoked_devices', COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)
  )
  INTO v_devices_info
  FROM public.devices
  WHERE account_id = target_account_id;

  -- Child profiles info (compteurs + list non-sensitive)
  SELECT json_build_object(
    'total_profiles', COUNT(*),
    'active_profiles', COUNT(*) FILTER (WHERE status = 'active'),
    'locked_profiles', COUNT(*) FILTER (WHERE status = 'locked'),
    'profiles', json_agg(json_build_object(
      'profile_id', id,
      'name', name,
      'status', status,
      'created_at', created_at
    ) ORDER BY created_at ASC)
  )
  INTO v_profiles_info
  FROM public.child_profiles
  WHERE account_id = target_account_id;

  -- Cards info (compteurs, PAS image_url pour personal)
  SELECT json_build_object(
    'personal_cards_count', COUNT(*) FILTER (WHERE type = 'personal'),
    'personal_cards_current_month', COUNT(*) FILTER (
      WHERE type = 'personal'
      AND created_at >= date_trunc('month', NOW())
    )
    -- Pas de liste cards personal pour éviter exposition métadonnées
    -- Si nécessaire pour support, créer fonction séparée plus restreinte
  )
  INTO v_cards_info
  FROM public.cards
  WHERE account_id = target_account_id;

  -- Sessions info (compteurs par profil)
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'active_sessions', COUNT(*) FILTER (WHERE state IN ('active_preview', 'active_started')),
    'completed_sessions', COUNT(*) FILTER (WHERE state = 'completed')
  )
  INTO v_sessions_info
  FROM public.sessions
  WHERE child_profile_id IN (
    SELECT id FROM public.child_profiles WHERE account_id = target_account_id
  );

  -- Construire résultat final
  v_result := json_build_object(
    'account', v_account_info,
    'devices', v_devices_info,
    'profiles', v_profiles_info,
    'cards', v_cards_info,
    'sessions', v_sessions_info
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") IS 'Admin support: get targeted account metadata (NO personal card image_url, D2). Requires admin status + specific account_id (no mass-surveillance). search_path hardened.';



CREATE OR REPLACE FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_is_admin boolean;
  v_has_active boolean;
BEGIN
  -- Guard: éviter appel direct applicatif
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'apply_subscription_to_account_status can only be called from trigger';
  END IF;

  SELECT (a.status = 'admin') INTO v_is_admin
  FROM public.accounts a
  WHERE a.id = p_account_id;

  IF v_is_admin THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.account_id = p_account_id
      AND s.status IN ('active','trialing','past_due','paused')
  ) INTO v_has_active;

  IF v_has_active THEN
    UPDATE public.accounts
      SET status = 'subscriber',
          updated_at = now()
    WHERE id = p_account_id
      AND status IS DISTINCT FROM 'subscriber';

    -- Upgrade path: réactiver profils locked automatiquement (PLATFORM.md §1.7) :contentReference[oaicite:9]{index=9}
    UPDATE public.child_profiles
      SET status = 'active',
          updated_at = now()
    WHERE account_id = p_account_id
      AND status = 'locked';

  ELSE
    UPDATE public.accounts
      SET status = 'free',
          updated_at = now()
    WHERE id = p_account_id
      AND status IS DISTINCT FROM 'free';
  END IF;
END;
$$;


ALTER FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_transition_session_on_validation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session_id UUID;
  v_state session_state;
  v_timeline_id UUID;
  v_steps_snapshot INTEGER;
  v_validated_steps INTEGER;
BEGIN
  v_session_id := NEW.session_id;

  -- Verrouiller la session (évite race multi-appareils)
  SELECT s.state, s.timeline_id, s.steps_total_snapshot
    INTO v_state, v_timeline_id, v_steps_snapshot
    FROM sessions s
    WHERE s.id = v_session_id
    FOR UPDATE;

  IF v_state IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si déjà completed, rien à faire (la contrainte BEFORE INSERT bloque normalement)
  IF v_state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Snapshot au démarrage effectif (1ère validation)
  IF v_state = 'active_preview' THEN
    SELECT COUNT(*)
      INTO v_steps_snapshot
      FROM slots
      WHERE timeline_id = v_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    UPDATE sessions
      SET state = 'active_started',
          steps_total_snapshot = v_steps_snapshot,
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = v_session_id;

    v_state := 'active_started';
  END IF;

  -- Défense: si snapshot manquant (cas legacy / import), on le fixe une fois
  IF v_steps_snapshot IS NULL THEN
    SELECT COUNT(*)
      INTO v_steps_snapshot
      FROM slots
      WHERE timeline_id = v_timeline_id
        AND kind = 'step'
        AND card_id IS NOT NULL;

    UPDATE sessions
      SET steps_total_snapshot = v_steps_snapshot,
          updated_at = NOW()
      WHERE id = v_session_id;
  END IF;

  -- Compter validations (ici c'est sûr: BEFORE INSERT a déjà filtré step-only et timeline match)
  SELECT COUNT(*)
    INTO v_validated_steps
    FROM session_validations sv
    WHERE sv.session_id = v_session_id;

  -- Completion: toutes étapes snapshot validées
  -- NB: si snapshot=0, aucune validation ne devrait exister (step non vide requis)
  IF v_state = 'active_started'
     AND v_steps_snapshot IS NOT NULL
     AND v_steps_snapshot > 0
     AND v_validated_steps >= v_steps_snapshot THEN

    UPDATE sessions
      SET state = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = v_session_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_transition_session_on_validation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_normalize_published"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Si carte banque: published ne peut pas être NULL, défaut FALSE
  IF NEW.type = 'bank' THEN
    IF NEW.published IS NULL THEN
      NEW.published := FALSE;
    END IF;

  -- Si carte personnelle: published doit toujours être NULL (non applicable)
  ELSIF NEW.type = 'personal' THEN
    NEW.published := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cards_normalize_published"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cards_normalize_published"() IS 'Normalise published selon type: bank → défaut FALSE si NULL, personal → force NULL';



CREATE OR REPLACE FUNCTION "public"."cards_personal_feature_enabled"("p_status" "public"."account_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT (p_status = 'subscriber' OR p_status = 'admin')
$$;


ALTER FUNCTION "public"."cards_personal_feature_enabled"("p_status" "public"."account_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_has_slot BOOLEAN;
  v_has_pivot BOOLEAN;
  v_has_seq_mother BOOLEAN;
  v_has_seq_step BOOLEAN;
BEGIN
  IF OLD.type <> 'bank' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (SELECT 1 FROM slots WHERE card_id = OLD.id)
    INTO v_has_slot;

  SELECT EXISTS (SELECT 1 FROM user_card_categories WHERE card_id = OLD.id)
    INTO v_has_pivot;

  SELECT EXISTS (SELECT 1 FROM sequences WHERE mother_card_id = OLD.id)
    INTO v_has_seq_mother;

  SELECT EXISTS (SELECT 1 FROM sequence_steps WHERE step_card_id = OLD.id)
    INTO v_has_seq_step;

  IF v_has_slot OR v_has_pivot OR v_has_seq_mother OR v_has_seq_step THEN
    RAISE EXCEPTION
      'Cannot delete bank card %: still referenced (slots=% , categories=% , seq_mother=% , seq_steps=%)',
      OLD.id, v_has_slot, v_has_pivot, v_has_seq_mother, v_has_seq_step
      USING HINT = 'Unpublish the bank card instead of deleting while referenced';
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() IS 'Blocks deletion of bank cards while referenced (slots, user_card_categories, sequences, sequence_steps).';



CREATE OR REPLACE FUNCTION "public"."cards_prevent_update_image_url_personal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Si type='personal' ET image_url a changé
  IF OLD.type = 'personal' AND NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    RAISE EXCEPTION
      'Invariant violation: cannot update image_url for personal card (card_id=%)',
      OLD.id
      USING HINT = 'To replace image, delete the card and create a new one';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cards_prevent_update_image_url_personal"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cards_prevent_update_image_url_personal"() IS 'Invariant DB: personal card image_url is immutable after creation (DB_BLUEPRINT.md #18, PRODUCT_MODEL.md D1)';



CREATE OR REPLACE FUNCTION "public"."categories_before_delete_remap_to_system"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  system_category_id UUID;
BEGIN
  -- Bloquer suppression catégorie système
  IF OLD.is_system = TRUE THEN
    RAISE EXCEPTION 'Impossible de supprimer la catégorie système (id: %)', OLD.id;
  END IF;

  -- Récupérer la catégorie système (par is_system uniquement)
  SELECT id INTO system_category_id
  FROM categories
  WHERE account_id = OLD.account_id
    AND is_system = TRUE
  LIMIT 1;

  -- Créer la catégorie système si absente (robuste concurrence)
  IF system_category_id IS NULL THEN
    INSERT INTO categories (account_id, name, is_system)
    VALUES (OLD.account_id, 'Sans catégorie', TRUE)
    ON CONFLICT (account_id, name)
    DO UPDATE SET is_system = TRUE
    RETURNING id INTO system_category_id;

    -- En cas rare où RETURNING ne remonte rien, re-sélectionner
    IF system_category_id IS NULL THEN
      SELECT id INTO system_category_id
      FROM categories
      WHERE account_id = OLD.account_id
        AND is_system = TRUE
      LIMIT 1;
    END IF;
  END IF;

  IF system_category_id IS NULL THEN
    RAISE EXCEPTION 'Catégorie système introuvable/impossible à créer pour account_id=%', OLD.account_id;
  END IF;

  -- Remapper défensivement: uniquement les associations du même compte
  UPDATE user_card_categories
  SET category_id = system_category_id,
      updated_at = NOW()
  WHERE category_id = OLD.id
    AND user_id = OLD.account_id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."categories_before_delete_remap_to_system"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."categories_before_delete_remap_to_system"() IS 'Bloque suppression catégorie système + remap scoped vers catégorie système (is_system) avant suppression';



CREATE OR REPLACE FUNCTION "public"."check_can_create_child_profile"("p_account_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_status account_status;
  v_limit integer;
  v_count int;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Admin unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_profiles_limit(v_status);

  -- For statuses where limit is NULL but not admin: treat as "no limit" only if that is intended.
  -- Here: free/subscriber have limits; others not expected in DB.
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Count existing profiles for this account (we count total rows; locked profiles still exist)
  SELECT COUNT(*) INTO v_count
  FROM public.child_profiles
  WHERE account_id = p_account_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Nombre maximum de profils enfants atteint.'
      USING ERRCODE='P0001',
            DETAIL='QUOTA_PROFILES_EXCEEDED';
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."check_can_create_child_profile"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_can_create_personal_card"("p_account_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_status account_status;
  v_stock_limit integer;
  v_monthly_limit integer;
  v_stock_count integer;
  v_monthly_count integer;
  v_ctx RECORD;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Feature gating: Free => N/A (no personal card creation)
  IF NOT public.cards_personal_feature_enabled(v_status) THEN
    RAISE EXCEPTION 'Création de cartes personnelles indisponible avec ce statut.'
      USING ERRCODE = 'P0001',
            DETAIL = 'FEATURE_UNAVAILABLE';
  END IF;

  -- Admin => unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  -- Subscriber limits
  v_stock_limit := public.quota_cards_stock_limit(v_status);
  v_monthly_limit := public.quota_cards_monthly_limit(v_status);

  -- Stock count: existing personal cards; DELETE frees immediately by definition
  SELECT COUNT(*) INTO v_stock_count
  FROM public.cards
  WHERE type = 'personal'
    AND account_id = p_account_id;

  IF v_stock_limit IS NOT NULL AND v_stock_count >= v_stock_limit THEN
    RAISE EXCEPTION 'Nombre maximum de cartes personnelles atteint.'
      USING ERRCODE = 'P0001',
            DETAIL = 'QUOTA_STOCK_EXCEEDED';
  END IF;

  -- Monthly quota counts "creations" and is NOT freed by DELETE.
  -- Uses locked month context (anti-abus timezone, predictable).
  SELECT * INTO v_ctx
  FROM public.ensure_quota_month_context(p_account_id);

  IF v_monthly_limit IS NOT NULL THEN
    -- Atomic: only succeeds while personal_cards_created < limit.
    UPDATE public.account_quota_months aqm
    SET personal_cards_created = aqm.personal_cards_created + 1
    WHERE aqm.account_id = p_account_id
      AND aqm.period_ym = v_ctx.period_ym
      AND aqm.personal_cards_created < v_monthly_limit
    RETURNING aqm.personal_cards_created INTO v_monthly_count;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nombre maximum de nouvelles cartes ce mois-ci atteint.'
        USING ERRCODE = 'P0001',
              DETAIL = 'QUOTA_MONTHLY_EXCEEDED';
    END IF;
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."check_can_create_personal_card"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_can_register_device"("p_account_id" "uuid", "p_revoked_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_status account_status;
  v_limit integer;
  v_count int;
BEGIN
  v_status := public.get_account_status(p_account_id);

  -- Admin unlimited
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_devices_limit(v_status);

  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Only active devices count (revoked_at IS NULL)
  -- If someone inserts an already-revoked device row, it shouldn't consume quota.
  IF p_revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.devices
  WHERE account_id = p_account_id
    AND revoked_at IS NULL;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Nombre maximum d''appareils atteint.'
      USING ERRCODE='P0001',
            DETAIL='QUOTA_DEVICES_EXCEEDED';
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."check_can_register_device"("p_account_id" "uuid", "p_revoked_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."child_profiles_auto_create_timeline"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_account_id uuid;
BEGIN
  -- Guard: must be called from trigger
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system trigger function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve owner account
  SELECT cp.account_id INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = NEW.id;

  -- Cross-account guard (when auth context exists)
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.timelines (child_profile_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."child_profiles_auto_create_timeline"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."child_profiles_auto_create_timeline"() IS 'SECURITY DEFINER system trigger: auto-creates timeline on child_profile insert (bypasses strict GRANT).';



CREATE OR REPLACE FUNCTION "public"."create_default_account_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.account_preferences (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_account_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_account_id uuid;
  v_status account_status;
  v_limit integer;
BEGIN
  -- Guard: must be called from a trigger, not directly
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve account_id from the profile involved in the completed session
  SELECT cp.account_id
    INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = p_child_profile_id;

  IF v_account_id IS NULL THEN
    RETURN;
  END IF;

  -- Resolve account_id from the profile involved in the completed session
  SELECT cp.account_id
    INTO v_account_id
  FROM public.child_profiles cp
  WHERE cp.id = p_child_profile_id;

  IF v_account_id IS NULL THEN
    RETURN;
  END IF;

  -- Guard: in app context, caller must be the account owner (defense in depth)
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  v_status := public.get_account_status(v_account_id);

  -- Admin: no locking
  IF v_status = 'admin' THEN
    RETURN;
  END IF;

  v_limit := public.quota_profiles_limit(v_status);
  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  -- Deterministic: keep the oldest v_limit profiles active, lock the others.
  WITH ranked AS (
    SELECT id,
           row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
    FROM public.child_profiles
    WHERE account_id = v_account_id
  ),
  desired AS (
    SELECT
      r.id,
      CASE WHEN r.rn <= v_limit THEN 'active'::child_profile_status
           ELSE 'locked'::child_profile_status
      END AS desired_status
    FROM ranked r
  )
  UPDATE public.child_profiles cp
  SET status = d.desired_status,
      updated_at = now()
  FROM desired d
  WHERE cp.id = d.id
    AND cp.status IS DISTINCT FROM d.desired_status;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_sequence_steps_card_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
  v_sequence_account UUID;
BEGIN
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.step_card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Sequence step invalid: step_card_id % not found', NEW.step_card_id;
  END IF;

  -- bank allowed
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  SELECT s.account_id
    INTO v_sequence_account
  FROM sequences s
  WHERE s.id = NEW.sequence_id;

  IF v_sequence_account IS NULL THEN
    RAISE EXCEPTION 'Sequence step invalid: sequence_id % not found', NEW.sequence_id;
  END IF;

  IF v_card_owner <> v_sequence_account THEN
    RAISE EXCEPTION
      'Sequence step invalid: personal step_card_id % belongs to %, sequence belongs to %',
      NEW.step_card_id, v_card_owner, v_sequence_account
      USING HINT = 'Personal cards can only be used within sequences of the owner account';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_sequence_steps_card_ownership"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_sequence_steps_card_ownership"() IS 'Ownership guard: personal step_card_id must belong to sequences.account_id (bank allowed).';



CREATE OR REPLACE FUNCTION "public"."enforce_sequences_mother_card_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
BEGIN
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.mother_card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Sequence invalid: mother_card_id % not found', NEW.mother_card_id;
  END IF;

  -- bank allowed
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  -- personal must match account
  IF v_card_owner <> NEW.account_id THEN
    RAISE EXCEPTION
      'Sequence invalid: personal mother_card_id % belongs to %, not account_id %',
      NEW.mother_card_id, v_card_owner, NEW.account_id
      USING HINT = 'Personal cards can only be used by their owner account';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_sequences_mother_card_ownership"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_sequences_mother_card_ownership"() IS 'Ownership guard: personal mother_card_id must belong to sequences.account_id (bank allowed).';



CREATE OR REPLACE FUNCTION "public"."enforce_slot_card_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
  v_timeline_account UUID;
BEGIN
  -- slot vide autorisé
  IF NEW.card_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer owner de la carte
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Slot invalide: card_id % introuvable', NEW.card_id;
  END IF;

  -- Si banque: OK
  IF v_card_type = 'bank' THEN
    RETURN NEW;
  END IF;

  -- Si personal: vérifier que la timeline appartient au même compte
  SELECT cp.account_id
    INTO v_timeline_account
  FROM timelines t
  JOIN child_profiles cp ON cp.id = t.child_profile_id
  WHERE t.id = NEW.timeline_id;

  IF v_timeline_account IS NULL THEN
    RAISE EXCEPTION 'Slot invalide: timeline_id % introuvable', NEW.timeline_id;
  END IF;

  IF v_card_owner <> v_timeline_account THEN
    RAISE EXCEPTION
      'Slot invalide: carte personnelle % appartient à %, timeline appartient à %',
      NEW.card_id, v_card_owner, v_timeline_account
      USING HINT = 'Une carte personnelle ne peut être utilisée que dans une timeline du même compte';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_slot_card_ownership"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_slot_card_ownership"() IS 'Empêche qu’une carte personal d’un autre compte soit placée dans une timeline (slots.card_id)';



CREATE OR REPLACE FUNCTION "public"."enforce_user_card_categories_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_card_type card_type;
  v_card_owner UUID;
BEGIN
  -- 1) La catégorie doit appartenir au même compte que user_id
  PERFORM 1
  FROM categories c
  WHERE c.id = NEW.category_id
    AND c.account_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Association invalide: category_id % n''appartient pas à user_id %',
      NEW.category_id, NEW.user_id;
  END IF;

  -- 2) La carte doit exister; si personal, doit appartenir au même user_id
  SELECT c.type, c.account_id
    INTO v_card_type, v_card_owner
  FROM cards c
  WHERE c.id = NEW.card_id;

  IF v_card_type IS NULL THEN
    RAISE EXCEPTION 'Association invalide: card_id % introuvable', NEW.card_id;
  END IF;

  IF v_card_type = 'personal' AND v_card_owner <> NEW.user_id THEN
    RAISE EXCEPTION
      'Association invalide: carte personnelle % appartient à %, pas à user_id %',
      NEW.card_id, v_card_owner, NEW.user_id
      USING HINT = 'Une carte personnelle ne peut être catégorisée que par son propriétaire';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_user_card_categories_integrity"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_user_card_categories_integrity"() IS 'Empêche cross-compte sur user_card_categories: catégorie du user + carte personal du user';



CREATE OR REPLACE FUNCTION "public"."ensure_epoch_monotone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_max_epoch INTEGER;
BEGIN
  -- Récupérer epoch max existant pour ce (child_profile_id, timeline_id)
  SELECT COALESCE(MAX(epoch), 0)
    INTO v_max_epoch
    FROM sessions
    WHERE child_profile_id = NEW.child_profile_id
      AND timeline_id = NEW.timeline_id
      AND id != NEW.id;  -- Exclure ligne en cours d'insertion

  -- Si epoch fourni est inférieur ou égal au max, incrémenter
  IF NEW.epoch <= v_max_epoch THEN
    NEW.epoch := v_max_epoch + 1;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_epoch_monotone"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_quota_month_context"("p_account_id" "uuid") RETURNS TABLE("period_ym" integer, "tz_ref" "text", "month_start_utc" timestamp with time zone, "month_end_utc" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_now       timestamptz := now();
  v_tz        text;
  v_local_now timestamp;
  v_period    integer;
  v_start_utc timestamptz;
  v_end_utc   timestamptz;
BEGIN
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'ensure_quota_month_context: p_account_id cannot be NULL'
      USING ERRCODE = '22004';
  END IF;

  -- 1) Existing current-month row (by UTC interval inclusion)
  RETURN QUERY
  SELECT aqm.period_ym, aqm.tz_ref, aqm.month_start_utc, aqm.month_end_utc
  FROM public.account_quota_months aqm
  WHERE aqm.account_id = p_account_id
    AND v_now >= aqm.month_start_utc
    AND v_now <  aqm.month_end_utc
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- 2) Create month row: lock tz_ref based on current accounts.timezone
  SELECT a.timezone
    INTO v_tz
  FROM public.accounts a
  WHERE a.id = p_account_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'ensure_quota_month_context: account % not found or not accessible', p_account_id
      USING ERRCODE = '42501';
  END IF;

  v_local_now := (v_now AT TIME ZONE v_tz);

  v_period :=
    (EXTRACT(YEAR  FROM v_local_now)::int * 100) +
     EXTRACT(MONTH FROM v_local_now)::int;

  v_start_utc := (date_trunc('month', v_local_now) AT TIME ZONE v_tz);
  v_end_utc   := ((date_trunc('month', v_local_now) + INTERVAL '1 month') AT TIME ZONE v_tz);

  INSERT INTO public.account_quota_months (
    account_id, period_ym, tz_ref, month_start_utc, month_end_utc
  )
  VALUES (
    p_account_id, v_period, v_tz, v_start_utc, v_end_utc
  )
  -- ✅ FIX: avoids ambiguity with RETURNS TABLE(period_ym ...)
  ON CONFLICT ON CONSTRAINT account_quota_months_pk DO NOTHING;

  RETURN QUERY
  SELECT aqm.period_ym, aqm.tz_ref, aqm.month_start_utc, aqm.month_end_utc
  FROM public.account_quota_months aqm
  WHERE aqm.account_id = p_account_id
    AND aqm.period_ym = v_period
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ensure_quota_month_context: unable to create/read month context for account % period %',
      p_account_id, v_period
      USING ERRCODE = '42501';
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION "public"."ensure_quota_month_context"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_status"("p_account_id" "uuid") RETURNS "public"."account_status"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT a.status
  FROM public.accounts a
  WHERE a.id = p_account_id
$$;


ALTER FUNCTION "public"."get_account_status"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_status account_status;
BEGIN
  -- Lire uniquement le statut du compte courant
  SELECT status INTO v_status
  FROM public.accounts
  WHERE id = auth.uid();

  -- NULL si pas authentifié ou compte inexistant
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN v_status = 'admin';
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'RLS helper: returns TRUE if current user (auth.uid()) has status=admin. SECURITY DEFINER minimal (reads only current user account). search_path hardened.';



CREATE OR REPLACE FUNCTION "public"."is_execution_only"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_status account_status;
  v_profile_count INTEGER;
BEGIN
  -- Lire statut + compter profils pour le compte courant
  SELECT a.status, COUNT(cp.id)
  INTO v_status, v_profile_count
  FROM public.accounts a
  LEFT JOIN public.child_profiles cp ON cp.account_id = a.id
  WHERE a.id = auth.uid()
  GROUP BY a.status;

  -- NULL si pas authentifié ou compte inexistant
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- execution-only = free + excess profiles (>1 pour Free)
  RETURN v_status = 'free' AND v_profile_count > 1;
END;
$$;


ALTER FUNCTION "public"."is_execution_only"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_execution_only"() IS 'RLS helper: returns TRUE if current user is in execution-only mode (status=free AND has >1 child_profiles). Used to restrict structural edits after downgrade. search_path hardened.';



CREATE OR REPLACE FUNCTION "public"."is_valid_timezone"("tz" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names
    WHERE name = tz
  );
$$;


ALTER FUNCTION "public"."is_valid_timezone"("tz" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_valid_timezone"("tz" "text") IS 'Returns true if input matches a timezone name known by PostgreSQL (IANA tz).';



CREATE OR REPLACE FUNCTION "public"."platform_forbid_update_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: update/delete forbidden';
END;
$$;


ALTER FUNCTION "public"."platform_forbid_update_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."platform_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_validation_if_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session_state session_state;
BEGIN
  -- Vérifier état session
  SELECT state INTO v_session_state
    FROM sessions
    WHERE id = NEW.session_id;

  IF v_session_state = 'completed' THEN
    RAISE EXCEPTION 'Impossible de valider étape: session terminée (completed)'
      USING HINT = 'Utiliser réinitialisation pour redémarrer la session';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_validation_if_completed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quota_cards_monthly_limit"("p_status" "public"."account_status") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_status = 'subscriber' THEN 100
    ELSE NULL
  END
$$;


ALTER FUNCTION "public"."quota_cards_monthly_limit"("p_status" "public"."account_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quota_cards_stock_limit"("p_status" "public"."account_status") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_status = 'subscriber' THEN 50
    ELSE NULL
  END
$$;


ALTER FUNCTION "public"."quota_cards_stock_limit"("p_status" "public"."account_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quota_devices_limit"("p_status" "public"."account_status") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_status = 'free'       THEN 1
    WHEN p_status = 'subscriber' THEN 3
    ELSE NULL
  END
$$;


ALTER FUNCTION "public"."quota_devices_limit"("p_status" "public"."account_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quota_profiles_limit"("p_status" "public"."account_status") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_status = 'free'       THEN 1
    WHEN p_status = 'subscriber' THEN 3
    ELSE NULL
  END
$$;


ALTER FUNCTION "public"."quota_profiles_limit"("p_status" "public"."account_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session_id UUID;
  v_child_profile_id UUID;
  v_new_epoch INTEGER;
BEGIN
  -- Verrouiller la session active_started si elle existe (anti race condition)
  SELECT s.id, s.child_profile_id
    INTO v_session_id, v_child_profile_id
  FROM sessions s
  WHERE s.timeline_id = p_timeline_id
    AND s.state = 'active_started'
  LIMIT 1
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN;
  END IF;

  -- Clôturer la session courante (on libère l’unicité "active")
  -- Note: on utilise l’état 'completed' faute d’état contractuel 'aborted'.
  UPDATE sessions
  SET state = 'completed',
      completed_at = COALESCE(completed_at, NOW()),
      updated_at = NOW()
  WHERE id = v_session_id;

  -- Calcul epoch = MAX(epoch historique)+1 (par profil + timeline)
  SELECT COALESCE(MAX(epoch), 0) + 1
    INTO v_new_epoch
  FROM sessions
  WHERE child_profile_id = v_child_profile_id
    AND timeline_id = p_timeline_id;

  -- Nouvelle session en prévisualisation
  INSERT INTO sessions (child_profile_id, timeline_id, state, epoch, created_at, updated_at)
  VALUES (v_child_profile_id, p_timeline_id, 'active_preview', v_new_epoch, NOW(), NOW());

  -- (Optionnel) p_reason ignoré côté DB (pas de colonne dédiée dans le contrat)
END;
$$;


ALTER FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text") IS 'Réinitialise une session active_started (epoch++) lors d’une modification structurelle après démarrage';



CREATE OR REPLACE FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_sequence_id IS NULL THEN
    RETURN;
  END IF;

  -- Si la séquence n'existe plus (DELETE explicite ou cascade mother), aucune contrainte.
  PERFORM 1 FROM sequences s WHERE s.id = p_sequence_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM sequence_steps ss
  WHERE ss.sequence_id = p_sequence_id;

  IF v_count < 2 THEN
    RAISE EXCEPTION
      'Invariant violation: sequence % must have at least 2 steps (current=%)',
      p_sequence_id, v_count
      USING HINT = 'Add steps in the same transaction, or delete the sequence explicitly.';
  END IF;
END;
$$;


ALTER FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") IS 'Invariant DB: a sequence must have >= 2 steps (strict, commit-safe, no auto-delete).';



CREATE OR REPLACE FUNCTION "public"."session_validations_enforce_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_session_state session_state;
  v_session_timeline UUID;

  v_slot_kind slot_kind;
  v_slot_card UUID;
  v_slot_timeline UUID;
BEGIN
  -- Charger session
  SELECT s.state, s.timeline_id
    INTO v_session_state, v_session_timeline
    FROM sessions s
    WHERE s.id = NEW.session_id;

  IF v_session_state IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: session_id % introuvable', NEW.session_id;
  END IF;

  -- Session terminée = lecture seule
  IF v_session_state = 'completed' THEN
    RAISE EXCEPTION 'Impossible de valider: session terminée (completed)'
      USING HINT = 'Utiliser un reset (nouvelle session) pour redémarrer';
  END IF;

  -- Autoriser seulement les sessions actives (preview/started)
  IF v_session_state NOT IN ('active_preview', 'active_started') THEN
    RAISE EXCEPTION 'Impossible de valider: session non active (%)', v_session_state;
  END IF;

  -- Charger slot
  SELECT sl.kind, sl.card_id, sl.timeline_id
    INTO v_slot_kind, v_slot_card, v_slot_timeline
    FROM slots sl
    WHERE sl.id = NEW.slot_id;

  IF v_slot_kind IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: slot_id % introuvable', NEW.slot_id;
  END IF;

  -- Step-only
  IF v_slot_kind <> 'step' THEN
    RAISE EXCEPTION 'Validation invalide: seul un slot step est validable (slot kind=%)', v_slot_kind;
  END IF;

  -- Step non vide
  IF v_slot_card IS NULL THEN
    RAISE EXCEPTION 'Validation invalide: impossible de valider un step vide (card_id NULL)';
  END IF;

  -- Slot doit appartenir à la timeline de la session
  IF v_slot_timeline <> v_session_timeline THEN
    RAISE EXCEPTION
      'Validation invalide: slot.timeline_id % ≠ session.timeline_id %',
      v_slot_timeline, v_session_timeline;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."session_validations_enforce_integrity"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."session_validations_enforce_integrity"() IS 'Invariant DB-first: validation step-only, non-vide, appartenant à la timeline de la session + session active.';



CREATE OR REPLACE FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_timeline_child UUID;
BEGIN
  -- Récupérer le child_profile propriétaire de la timeline
  SELECT t.child_profile_id
    INTO v_timeline_child
    FROM timelines t
    WHERE t.id = NEW.timeline_id;

  IF v_timeline_child IS NULL THEN
    RAISE EXCEPTION 'Session invalide: timeline_id % introuvable', NEW.timeline_id;
  END IF;

  IF v_timeline_child <> NEW.child_profile_id THEN
    RAISE EXCEPTION
      'Session invalide: timeline_id % appartient à child_profile_id %, pas %',
      NEW.timeline_id, v_timeline_child, NEW.child_profile_id
      USING HINT = 'Toujours créer une session sur la timeline du profil enfant (1:1)';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() IS 'Invariant DB-first: sessions.timeline_id doit correspondre au child_profile_id (cohérence 1:1).';



CREATE OR REPLACE FUNCTION "public"."sessions_prevent_epoch_decrement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.epoch < OLD.epoch THEN
    RAISE EXCEPTION 'Epoch invalide: décroissance interdite (% -> %)', OLD.epoch, NEW.epoch
      USING HINT = 'Reset = nouvelle session (INSERT) avec epoch = MAX(epoch)+1';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sessions_prevent_epoch_decrement"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sessions_prevent_epoch_decrement"() IS 'Invariant DB-first: epoch ne peut jamais décroître (protection UPDATE).';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slots_enforce_min_reward"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  reward_count INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  -- Détecter si on est dans un contexte de cascade (suppression timeline/profil/compte)
  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id) INTO is_cascade_context;

  -- Si la timeline n'existe plus, c'est une cascade → autoriser
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  -- Si on supprime un slot de type 'reward' (hors cascade)
  IF OLD.kind = 'reward' THEN
    -- Compter les slots reward restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO reward_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'reward'
      AND id != OLD.id;

    -- Si c'est le dernier slot reward, bloquer la suppression
    IF reward_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Récompense de la timeline (id: %). Une timeline doit toujours contenir au moins 1 slot Récompense (peut être vide).', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot step ou pas le dernier reward ou cascade)
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."slots_enforce_min_reward"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."slots_enforce_min_reward"() IS 'Invariant contractuel: empêche suppression du dernier slot reward (timeline doit toujours contenir au moins 1 slot Récompense, peut être vide). Autorise cascades (suppression compte, RGPD, maintenance)';



CREATE OR REPLACE FUNCTION "public"."slots_enforce_min_step"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  step_count INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  -- Détecter si on est dans un contexte de cascade (suppression timeline/profil/compte)
  -- En PostgreSQL, un DELETE cascade déclenché par ON DELETE CASCADE n'a pas de marqueur spécifique
  -- On doit vérifier si la timeline parente existe encore
  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id) INTO is_cascade_context;

  -- Si la timeline n'existe plus, c'est une cascade → autoriser
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  -- Si on supprime un slot de type 'step' (hors cascade)
  IF OLD.kind = 'step' THEN
    -- Compter les slots step restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO step_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'step'
      AND id != OLD.id;

    -- Si c'est le dernier slot step, bloquer la suppression
    IF step_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Étape de la timeline (id: %). Une timeline doit contenir au minimum 1 slot Étape.', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot reward ou pas le dernier step ou cascade)
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."slots_enforce_min_step"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."slots_enforce_min_step"() IS 'Invariant contractuel: empêche suppression du dernier slot step (timeline doit contenir au minimum 1 slot Étape). Autorise cascades (suppression compte, RGPD, maintenance)';



CREATE OR REPLACE FUNCTION "public"."slots_enforce_single_reward"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1
        FROM slots
        WHERE timeline_id = NEW.timeline_id
          AND kind = 'reward'
      ) INTO v_exists;

      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'Only one reward slot is allowed per timeline';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Un reward existant ne peut pas changer de kind ni de timeline
    IF OLD.kind = 'reward' THEN
      IF NEW.kind <> 'reward' THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change kind (slot_id=%)',
          OLD.id;
      END IF;

      IF NEW.timeline_id <> OLD.timeline_id THEN
        RAISE EXCEPTION
          'Invariant violation: reward slot cannot change timeline_id (slot_id=%)',
          OLD.id;
      END IF;
      RETURN NEW;
    END IF;

    -- Un step ne peut pas devenir reward si un reward existe déjà
    IF NEW.kind = 'reward' THEN
      SELECT EXISTS (
        SELECT 1
        FROM slots
        WHERE timeline_id = NEW.timeline_id
          AND kind = 'reward'
          AND id <> NEW.id
      ) INTO v_exists;

      IF v_exists THEN
        RAISE EXCEPTION
          'Invariant violation: timeline % already has a reward slot',
          NEW.timeline_id
          USING HINT = 'A step cannot be converted to reward when reward already exists';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."slots_enforce_single_reward"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."slots_enforce_single_reward"() IS 'Invariant DB: exactly one reward slot per timeline (unique index + guard on kind/timeline_id updates)';



CREATE OR REPLACE FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_active_session_id UUID;
  v_is_validated BOOLEAN;
  v_affects_steps_count BOOLEAN;
BEGIN
  -- On ne s’intéresse qu’aux slots Étape
  IF (TG_OP = 'DELETE' AND OLD.kind <> 'step')
     OR (TG_OP IN ('UPDATE','INSERT') AND NEW.kind <> 'step') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Session active_started ?
  SELECT s.id INTO v_active_session_id
  FROM sessions s
  WHERE s.timeline_id = COALESCE(NEW.timeline_id, OLD.timeline_id)
    AND s.state = 'active_started'
  LIMIT 1;

  IF v_active_session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Slot déjà validé dans la session active ?
  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    IF v_is_validated THEN
      RAISE EXCEPTION
        'Action interdite: suppression d''un slot étape déjà validé (slot_id=%) pendant une session démarrée',
        OLD.id;
    END IF;

    -- DELETE d'un slot step non validé => impact structure => reset
    PERFORM reset_active_started_session_for_timeline(OLD.timeline_id, 'delete_step_slot');
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1 FROM session_validations sv
      WHERE sv.session_id = v_active_session_id
        AND sv.slot_id = OLD.id
    ) INTO v_is_validated;

    -- Verrouillage slot validé: aucune mutation (position, card_id, tokens, kind)
    IF v_is_validated THEN
      IF NEW.position IS DISTINCT FROM OLD.position
         OR NEW.card_id IS DISTINCT FROM OLD.card_id
         OR NEW.tokens IS DISTINCT FROM OLD.tokens
         OR NEW.kind IS DISTINCT FROM OLD.kind THEN
        RAISE EXCEPTION
          'Action interdite: modification d''un slot étape déjà validé (slot_id=%) pendant une session démarrée',
          OLD.id;
      END IF;
      RETURN NEW;
    END IF;

    -- Slot non validé: déterminer si la mutation change le nombre d’étapes "comptées"
    -- (card_id NULL/non-NULL) ou change la nature du slot
    v_affects_steps_count :=
      (OLD.card_id IS NULL) IS DISTINCT FROM (NEW.card_id IS NULL)
      OR (NEW.kind IS DISTINCT FROM OLD.kind);

    IF v_affects_steps_count THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'update_step_slot_affects_count');
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Ajout d’un slot étape non vide pendant active_started => impact structure => reset
    IF NEW.card_id IS NOT NULL THEN
      PERFORM reset_active_started_session_for_timeline(NEW.timeline_id, 'insert_nonempty_step_slot');
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() IS 'Pendant active_started: bloque mutations des slots validés + reset epoch++ sur changements structurels';



CREATE OR REPLACE FUNCTION "public"."tg_cards_quota_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.type = 'personal' THEN
    PERFORM public.check_can_create_personal_card(NEW.account_id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_cards_quota_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_child_profiles_prevent_delete_last"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  remaining_count INT;
BEGIN
  -- ⚠️ BYPASS CASCADE : Si le compte parent n'existe plus (suppression compte RGPD),
  -- ne pas bloquer la cascade DELETE. Permet suppression complète du compte.
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = OLD.account_id) THEN
    RETURN OLD;
  END IF;

  -- Verrou anti-concurrence : bloquer autres deletes du même compte
  -- Évite scénario double-delete simultané qui passerait tous deux le COUNT
  PERFORM 1
  FROM public.child_profiles
  WHERE account_id = OLD.account_id
  FOR UPDATE;

  -- Compter profils restants APRÈS suppression (OLD exclu)
  SELECT COUNT(*)
  INTO remaining_count
  FROM public.child_profiles
  WHERE account_id = OLD.account_id
    AND id <> OLD.id;

  -- Si aucun profil ne restera → erreur explicite
  IF remaining_count = 0 THEN
    -- ERRCODE 23514 : CHECK_VIOLATION (distinct de P0001 pour quotas/triggers génériques)
    RAISE EXCEPTION USING
      ERRCODE = '23514', -- CHECK_VIOLATION PostgreSQL standard
      MESSAGE = 'child_profile_min_one_required: Au moins 1 profil enfant doit être conservé.',
      DETAIL = 'Pour effacer toutes vos données, supprimez votre compte entier (RGPD).',
      HINT = 'La suppression individuelle du dernier profil est interdite (invariant système).';
  END IF;

  RETURN OLD; -- Permettre suppression si count > 0
END;
$$;


ALTER FUNCTION "public"."tg_child_profiles_prevent_delete_last"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() IS 'Trigger BEFORE DELETE: bloque suppression du dernier profil enfant (invariant PLATFORM.md §2.7.2). Erreur explicite ERRCODE 23514 (CHECK_VIOLATION). Verrou FOR UPDATE anti-concurrence.';



CREATE OR REPLACE FUNCTION "public"."tg_child_profiles_quota_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.check_can_create_child_profile(NEW.account_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_child_profiles_quota_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_devices_quota_before_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.check_can_register_device(NEW.account_id, NEW.revoked_at);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_devices_quota_before_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_sessions_on_completed_lock_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (OLD.state IS DISTINCT FROM NEW.state) AND NEW.state = 'completed' THEN
    PERFORM public.enforce_child_profile_limit_after_session_completion(NEW.child_profile_id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_sessions_on_completed_lock_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."timelines_auto_create_minimal_slots"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_account_id uuid;
BEGIN
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'forbidden: system trigger function'
      USING ERRCODE = '42501';
  END IF;

  -- Resolve owner account via timeline -> child_profile
  SELECT cp.account_id INTO v_account_id
  FROM public.child_profiles cp
  JOIN public.timelines t ON t.child_profile_id = cp.id
  WHERE t.id = NEW.id;

  IF auth.uid() IS NOT NULL AND auth.uid() <> v_account_id THEN
    RAISE EXCEPTION 'forbidden: cross-account'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'step', 0, NULL, 0);

  INSERT INTO public.slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'reward', 1, NULL, NULL);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."timelines_auto_create_minimal_slots"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."timelines_auto_create_minimal_slots"() IS 'SECURITY DEFINER system trigger: auto-creates minimal slots on timeline insert (bypasses strict GRANT).';



CREATE OR REPLACE FUNCTION "public"."trg_subscriptions_project_account_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  PERFORM public.apply_subscription_to_account_status(NEW.account_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_subscriptions_project_account_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_sequences_min_two_steps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'sequences' THEN
    -- Insert d'une séquence: doit avoir >=2 steps au commit (steps peuvent être ajoutés dans la même transaction)
    PERFORM sequences_enforce_min_two_steps(NEW.id);
    RETURN NULL;
  END IF;

  -- sequence_steps
  IF TG_OP = 'INSERT' THEN
    PERFORM sequences_enforce_min_two_steps(NEW.sequence_id);
    RETURN NULL;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM sequences_enforce_min_two_steps(OLD.sequence_id);
    RETURN NULL;
  ELSE
    -- UPDATE: vérifier OLD et NEW (si move entre séquences)
    PERFORM sequences_enforce_min_two_steps(OLD.sequence_id);
    PERFORM sequences_enforce_min_two_steps(NEW.sequence_id);
    RETURN NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."trigger_sequences_min_two_steps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_session_state_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Si pas de changement d'état, autoriser
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  -- Transition: active_preview → active_started (OK)
  IF OLD.state = 'active_preview' AND NEW.state = 'active_started' THEN
    RETURN NEW;
  END IF;

  -- Transition: active_started → completed (OK)
  IF OLD.state = 'active_started' AND NEW.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Toutes autres transitions interdites
  RAISE EXCEPTION 'Transition état session interdite: % → %', OLD.state, NEW.state
    USING HINT = 'Utiliser réinitialisation (nouvelle session avec epoch++) pour redémarrer';
END;
$$;


ALTER FUNCTION "public"."validate_session_state_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_preferences" (
    "account_id" "uuid" NOT NULL,
    "reduced_motion" boolean DEFAULT false NOT NULL,
    "toasts_enabled" boolean DEFAULT true NOT NULL,
    "confetti_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "train_progress_enabled" boolean DEFAULT false NOT NULL,
    "train_line" "text",
    "train_type" "public"."transport_type" DEFAULT 'metro'::"public"."transport_type" NOT NULL,
    CONSTRAINT "account_preferences_train_line_chk" CHECK ((("train_line" IS NULL) OR ((("char_length"("train_line") >= 1) AND ("char_length"("train_line") <= 32)) AND ("train_line" ~ '^[0-9A-Za-z][0-9A-Za-z]*$'::"text"))))
);

ALTER TABLE ONLY "public"."account_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_quota_months" (
    "account_id" "uuid" NOT NULL,
    "period_ym" integer NOT NULL,
    "tz_ref" "text" NOT NULL,
    "month_start_utc" timestamp with time zone NOT NULL,
    "month_end_utc" timestamp with time zone NOT NULL,
    "personal_cards_created" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_quota_months_bounds_chk" CHECK (("month_end_utc" > "month_start_utc")),
    CONSTRAINT "account_quota_months_personal_cards_created_chk" CHECK (("personal_cards_created" >= 0)),
    CONSTRAINT "account_quota_months_tz_valid_chk" CHECK ("public"."is_valid_timezone"("tz_ref"))
);


ALTER TABLE "public"."account_quota_months" OWNER TO "postgres";


COMMENT ON TABLE "public"."account_quota_months" IS 'Per-account monthly context used for quota checks; locks timezone per month (anti-abuse + TSA predictability).';



CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" NOT NULL,
    "status" "public"."account_status" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Paris'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accounts_timezone_valid_chk" CHECK ("public"."is_valid_timezone"("timezone"))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'RLS enabled: owner-only access (id = auth.uid()), status immutable via policy WITH CHECK';



COMMENT ON COLUMN "public"."accounts"."id" IS 'PK = auth.users.id (UUID), CASCADE DELETE avec auth';



COMMENT ON COLUMN "public"."accounts"."status" IS 'Statut fonctionnel: free, subscriber, admin (Visitor n''existe PAS en DB)';



COMMENT ON COLUMN "public"."accounts"."timezone" IS 'Timezone IANA pour calcul début mois quota mensuel (défaut Europe/Paris)';



CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_account_id" "uuid" NOT NULL,
    "target_account_id" "uuid",
    "action" "public"."admin_action" NOT NULL,
    "reason" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_audit_metadata_object_chk" CHECK (("jsonb_typeof"("metadata") = 'object'::"text")),
    CONSTRAINT "admin_audit_metadata_size_chk" CHECK (("octet_length"(("metadata")::"text") <= 8192)),
    CONSTRAINT "admin_audit_reason_non_empty_chk" CHECK (("length"("btrim"("reason")) > 0))
);

ALTER TABLE ONLY "public"."admin_audit_log" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."card_type" NOT NULL,
    "account_id" "uuid",
    "name" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "published" boolean,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_card_ownership" CHECK (((("type" = 'bank'::"public"."card_type") AND ("account_id" IS NULL)) OR (("type" = 'personal'::"public"."card_type") AND ("account_id" IS NOT NULL)))),
    CONSTRAINT "check_card_published" CHECK (((("type" = 'bank'::"public"."card_type") AND ("published" IS NOT NULL)) OR (("type" = 'personal'::"public"."card_type") AND ("published" IS NULL))))
);


ALTER TABLE "public"."cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."cards" IS 'RLS enabled: bank published (anon) + owner-only personal (authenticated)';



COMMENT ON COLUMN "public"."cards"."type" IS 'Type: bank (Admin, account_id NULL) ou personal (user, account_id NOT NULL)';



COMMENT ON COLUMN "public"."cards"."account_id" IS 'FK accounts si personal (NULL si bank), CASCADE DELETE';



COMMENT ON COLUMN "public"."cards"."name" IS 'Nom carte (modifiable)';



COMMENT ON COLUMN "public"."cards"."image_url" IS 'URL Supabase Storage (FIGÉE après création si personal)';



COMMENT ON COLUMN "public"."cards"."published" IS 'Banque uniquement: TRUE = visible tous, FALSE = dépubliée (NULL si personal)';



COMMENT ON COLUMN "public"."cards"."created_at" IS 'Utilisé pour quota mensuel cartes personnelles (calcul début mois selon timezone compte)';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'RLS enabled: owner-only (account_id = auth.uid())';



COMMENT ON COLUMN "public"."categories"."account_id" IS 'FK accounts, CASCADE DELETE si suppression compte';



COMMENT ON COLUMN "public"."categories"."name" IS 'Nom catégorie (UNIQUE par utilisateur)';



COMMENT ON COLUMN "public"."categories"."is_system" IS 'TRUE = catégorie système "Sans catégorie" (non supprimable, non modifiable)';



CREATE TABLE IF NOT EXISTS "public"."child_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "public"."child_profile_status" DEFAULT 'active'::"public"."child_profile_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."child_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."child_profiles" IS 'RLS enabled: owner-only access (account_id = auth.uid()), status immutable via policy WITH CHECK';



COMMENT ON COLUMN "public"."child_profiles"."account_id" IS 'FK accounts, CASCADE DELETE si suppression compte';



COMMENT ON COLUMN "public"."child_profiles"."name" IS 'Nom affiché du profil enfant';



COMMENT ON COLUMN "public"."child_profiles"."status" IS 'Statut: active (accessible) ou locked (lecture seule après downgrade)';



COMMENT ON COLUMN "public"."child_profiles"."created_at" IS 'Utilisé pour ancienneté (profil le plus ancien = actif lors downgrade Free)';



CREATE TABLE IF NOT EXISTS "public"."consent_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "consent_type" "text" NOT NULL,
    "mode" "text" DEFAULT 'refuse_all'::"text" NOT NULL,
    "choices" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "action" "text",
    "ip_hash" "text",
    "ua" "text",
    "locale" "text",
    "app_version" "text",
    "origin" "text",
    "ts_client" timestamp with time zone,
    "version" "text" DEFAULT '1.0.0'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consent_events_action_chk" CHECK ((("action" IS NULL) OR ("action" = ANY (ARRAY['first_load'::"text", 'update'::"text", 'withdraw'::"text", 'restore'::"text", 'revoke'::"text"])))),
    CONSTRAINT "consent_events_choices_object_chk" CHECK (("jsonb_typeof"("choices") = 'object'::"text")),
    CONSTRAINT "consent_events_ip_hash_len_chk" CHECK ((("ip_hash" IS NULL) OR (("length"("ip_hash") >= 32) AND ("length"("ip_hash") <= 128)))),
    CONSTRAINT "consent_events_mode_chk" CHECK (("mode" = ANY (ARRAY['accept_all'::"text", 'refuse_all'::"text", 'custom'::"text"])))
);

ALTER TABLE ONLY "public"."consent_events" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."consent_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "devices_revoked_after_created_chk" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "created_at")))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."devices" IS 'RLS enabled: owner-only access (account_id = auth.uid()), no DELETE';



COMMENT ON COLUMN "public"."devices"."device_id" IS 'UUID généré côté client au premier usage, UNIQUE';



COMMENT ON COLUMN "public"."devices"."account_id" IS 'FK accounts (NOT NULL), CASCADE DELETE (pas de devices orphelins)';



COMMENT ON COLUMN "public"."devices"."revoked_at" IS 'Timestamp révocation manuelle (NULL = actif, NOT NULL = révoqué)';



CREATE TABLE IF NOT EXISTS "public"."sequence_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sequence_id" "uuid" NOT NULL,
    "step_card_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sequence_steps_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."sequence_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."sequence_steps" IS 'RLS enabled: owner via sequence';



COMMENT ON COLUMN "public"."sequence_steps"."position" IS 'Index 0..n-1 (sans trous imposés par la DB).';



CREATE TABLE IF NOT EXISTS "public"."sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "mother_card_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sequences" OWNER TO "postgres";


COMMENT ON TABLE "public"."sequences" IS 'RLS enabled: owner-only (account_id = auth.uid())';



COMMENT ON COLUMN "public"."sequences"."mother_card_id" IS 'Carte mère de la séquence (peut être bank ou personal).';



CREATE TABLE IF NOT EXISTS "public"."session_validations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "validated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_validations" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_validations" IS 'RLS enabled: owner via session';



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_profile_id" "uuid" NOT NULL,
    "timeline_id" "uuid" NOT NULL,
    "state" "public"."session_state" NOT NULL,
    "epoch" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "steps_total_snapshot" integer,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."sessions" IS 'RLS enabled: owner via child_profile, epoch protected by trigger';



CREATE TABLE IF NOT EXISTS "public"."slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timeline_id" "uuid" NOT NULL,
    "kind" "public"."slot_kind" NOT NULL,
    "position" integer NOT NULL,
    "card_id" "uuid",
    "tokens" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_tokens_by_kind" CHECK (((("kind" = 'step'::"public"."slot_kind") AND ("tokens" IS NOT NULL) AND (("tokens" >= 0) AND ("tokens" <= 5))) OR (("kind" = 'reward'::"public"."slot_kind") AND ("tokens" IS NULL)))),
    CONSTRAINT "slots_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "slots_tokens_check" CHECK ((("tokens" >= 0) AND ("tokens" <= 5)))
);


ALTER TABLE "public"."slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."slots" IS 'RLS enabled: owner via timeline';



COMMENT ON COLUMN "public"."slots"."id" IS 'PK UUID (slot_id métier stable), indépendant de la position';



COMMENT ON COLUMN "public"."slots"."timeline_id" IS 'FK timelines, CASCADE DELETE si suppression timeline';



COMMENT ON COLUMN "public"."slots"."kind" IS 'Type: step (étape) ou reward (récompense)';



COMMENT ON COLUMN "public"."slots"."position" IS 'Ordre d affichage (modifiable drag & drop), UNIQUE par timeline';



COMMENT ON COLUMN "public"."slots"."card_id" IS 'FK cards, SET NULL si suppression carte (slot devient vide)';



COMMENT ON COLUMN "public"."slots"."tokens" IS 'Jetons (0-5 si step, NULL si reward)';



COMMENT ON CONSTRAINT "check_tokens_by_kind" ON "public"."slots" IS 'Garantit tokens 0-5 si step, NULL si reward';



CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."transport_type" NOT NULL,
    "ligne" "text" NOT NULL,
    "ordre" integer NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stations_label_chk" CHECK ((("btrim"("label") <> ''::"text") AND ("char_length"("label") <= 200))),
    CONSTRAINT "stations_ligne_chk" CHECK (((("char_length"("ligne") >= 1) AND ("char_length"("ligne") <= 32)) AND ("ligne" ~ '^[0-9A-Za-z][0-9A-Za-z]*$'::"text"))),
    CONSTRAINT "stations_ordre_chk" CHECK (("ordre" > 0))
);

ALTER TABLE ONLY "public"."stations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid",
    "event_type" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."subscription_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" NOT NULL,
    "price_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "cancel_at" timestamp with time zone,
    "last_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_period_chk" CHECK ((("current_period_start" IS NULL) OR ("current_period_end" IS NULL) OR ("current_period_end" >= "current_period_start"))),
    CONSTRAINT "subscriptions_status_chk" CHECK (("status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'canceled'::"text", 'unpaid'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'trialing'::"text", 'paused'::"text"])))
);

ALTER TABLE ONLY "public"."subscriptions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "child_profile_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."timelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."timelines" IS 'RLS enabled: owner via child_profile';



COMMENT ON COLUMN "public"."timelines"."id" IS 'PK UUID (génération auto via gen_random_uuid)';



COMMENT ON COLUMN "public"."timelines"."child_profile_id" IS 'FK child_profiles, CASCADE DELETE, UNIQUE (1 timeline par profil)';



CREATE TABLE IF NOT EXISTS "public"."user_card_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_card_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_card_categories" IS 'RLS enabled: owner-only (user_id = auth.uid())';



COMMENT ON COLUMN "public"."user_card_categories"."user_id" IS 'FK accounts, CASCADE DELETE si suppression compte';



COMMENT ON COLUMN "public"."user_card_categories"."card_id" IS 'FK cards, CASCADE DELETE si suppression carte';



COMMENT ON COLUMN "public"."user_card_categories"."category_id" IS 'FK categories, CASCADE DELETE si suppression catégorie';



CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_namespaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_name" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "catalog_id" "uuid" NOT NULL
);


ALTER TABLE "storage"."iceberg_namespaces" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "namespace_id" "uuid" NOT NULL,
    "bucket_name" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "location" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "remote_table_id" "text",
    "shard_key" "text",
    "shard_id" "text",
    "catalog_id" "uuid" NOT NULL
);


ALTER TABLE "storage"."iceberg_tables" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "public"."account_preferences"
    ADD CONSTRAINT "account_preferences_pkey" PRIMARY KEY ("account_id");



ALTER TABLE ONLY "public"."account_quota_months"
    ADD CONSTRAINT "account_quota_months_pk" PRIMARY KEY ("account_id", "period_ym");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_events"
    ADD CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_account_device_id_key" UNIQUE ("account_id", "device_id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_validations"
    ADD CONSTRAINT "session_validations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_unique_type_ligne_label" UNIQUE ("type", "ligne", "label");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_unique_type_ligne_ordre" UNIQUE ("type", "ligne", "ordre");



ALTER TABLE ONLY "public"."subscription_logs"
    ADD CONSTRAINT "subscription_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "timelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "unique_category_name_per_user" UNIQUE ("account_id", "name");



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "unique_sequence_per_account_mother" UNIQUE ("account_id", "mother_card_id");



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "unique_sequence_step_card" UNIQUE ("sequence_id", "step_card_id");



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "unique_sequence_step_position" UNIQUE ("sequence_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "unique_timeline_per_profile" UNIQUE ("child_profile_id");



COMMENT ON CONSTRAINT "unique_timeline_per_profile" ON "public"."timelines" IS 'Garantit 1 timeline unique par profil enfant (1:1)';



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "unique_timeline_position" UNIQUE ("timeline_id", "position");



COMMENT ON CONSTRAINT "unique_timeline_position" ON "public"."slots" IS 'Garantit pas de doublons position sur même timeline';



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "unique_user_card" UNIQUE ("user_id", "card_id");



COMMENT ON CONSTRAINT "unique_user_card" ON "public"."user_card_categories" IS 'CONTRAT EXPLICITE: 1 carte = 1 catégorie par utilisateur (pas de multi-catégories)';



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "account_quota_months_current_idx" ON "public"."account_quota_months" USING "btree" ("account_id", "month_start_utc", "month_end_utc");



CREATE INDEX "idx_accounts_status" ON "public"."accounts" USING "btree" ("status");



CREATE INDEX "idx_cards_bank_published" ON "public"."cards" USING "btree" ("type", "published") WHERE (("type" = 'bank'::"public"."card_type") AND ("published" = true));



CREATE INDEX "idx_cards_personal_account" ON "public"."cards" USING "btree" ("account_id") WHERE ("type" = 'personal'::"public"."card_type");



CREATE INDEX "idx_cards_quota_monthly" ON "public"."cards" USING "btree" ("account_id", "created_at") WHERE ("type" = 'personal'::"public"."card_type");



CREATE INDEX "idx_categories_account_id" ON "public"."categories" USING "btree" ("account_id");



CREATE UNIQUE INDEX "idx_categories_system" ON "public"."categories" USING "btree" ("account_id") WHERE ("is_system" = true);



COMMENT ON INDEX "public"."idx_categories_system" IS 'UNIQUE: une seule catégorie système (Sans catégorie) par compte';



CREATE INDEX "idx_child_profiles_account_id" ON "public"."child_profiles" USING "btree" ("account_id");



CREATE INDEX "idx_child_profiles_created_at" ON "public"."child_profiles" USING "btree" ("account_id", "created_at");



CREATE INDEX "idx_consent_events_account_created" ON "public"."consent_events" USING "btree" ("account_id", "created_at" DESC);



CREATE INDEX "idx_consent_events_origin_created" ON "public"."consent_events" USING "btree" ("origin", "created_at" DESC);



CREATE INDEX "idx_devices_account_id" ON "public"."devices" USING "btree" ("account_id");



CREATE INDEX "idx_devices_active" ON "public"."devices" USING "btree" ("account_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_sequence_steps_sequence_id" ON "public"."sequence_steps" USING "btree" ("sequence_id");



CREATE INDEX "idx_sequence_steps_sequence_position" ON "public"."sequence_steps" USING "btree" ("sequence_id", "position");



CREATE INDEX "idx_sequence_steps_step_card_id" ON "public"."sequence_steps" USING "btree" ("step_card_id");



CREATE INDEX "idx_sequences_account_id" ON "public"."sequences" USING "btree" ("account_id");



CREATE INDEX "idx_sequences_mother_card_id" ON "public"."sequences" USING "btree" ("mother_card_id");



CREATE INDEX "idx_slots_kind" ON "public"."slots" USING "btree" ("timeline_id", "kind");



CREATE INDEX "idx_slots_timeline_id" ON "public"."slots" USING "btree" ("timeline_id");



CREATE INDEX "idx_slots_timeline_position" ON "public"."slots" USING "btree" ("timeline_id", "position");



CREATE INDEX "idx_subscriptions_account_id" ON "public"."subscriptions" USING "btree" ("account_id");



CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_timelines_child_profile_id" ON "public"."timelines" USING "btree" ("child_profile_id");



CREATE INDEX "idx_user_card_categories_card" ON "public"."user_card_categories" USING "btree" ("card_id");



CREATE INDEX "idx_user_card_categories_category" ON "public"."user_card_categories" USING "btree" ("category_id");



CREATE INDEX "idx_user_card_categories_user" ON "public"."user_card_categories" USING "btree" ("user_id");



CREATE INDEX "session_validations_session_id_idx" ON "public"."session_validations" USING "btree" ("session_id");



CREATE INDEX "session_validations_slot_id_idx" ON "public"."session_validations" USING "btree" ("slot_id");



CREATE UNIQUE INDEX "session_validations_unique_slot_per_session" ON "public"."session_validations" USING "btree" ("session_id", "slot_id");



CREATE INDEX "sessions_child_profile_id_idx" ON "public"."sessions" USING "btree" ("child_profile_id");



CREATE UNIQUE INDEX "sessions_one_active_per_profile_timeline" ON "public"."sessions" USING "btree" ("child_profile_id", "timeline_id") WHERE ("state" = ANY (ARRAY['active_preview'::"public"."session_state", 'active_started'::"public"."session_state"]));



CREATE INDEX "sessions_state_idx" ON "public"."sessions" USING "btree" ("state");



CREATE INDEX "sessions_timeline_id_idx" ON "public"."sessions" USING "btree" ("timeline_id");



CREATE UNIQUE INDEX "slots_one_reward_per_timeline" ON "public"."slots" USING "btree" ("timeline_id") WHERE ("kind" = 'reward'::"public"."slot_kind");



CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE UNIQUE INDEX "subscriptions_unique_active_per_account" ON "public"."subscriptions" USING "btree" ("account_id") WHERE ("status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'past_due'::"text", 'paused'::"text"]));



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_iceberg_namespaces_bucket_id" ON "storage"."iceberg_namespaces" USING "btree" ("catalog_id", "name");



CREATE UNIQUE INDEX "idx_iceberg_tables_location" ON "storage"."iceberg_tables" USING "btree" ("location");



CREATE UNIQUE INDEX "idx_iceberg_tables_namespace_id" ON "storage"."iceberg_tables" USING "btree" ("catalog_id", "namespace_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "session_validations_auto_transition" AFTER INSERT ON "public"."session_validations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_transition_session_on_validation"();



CREATE OR REPLACE TRIGGER "session_validations_enforce_integrity" BEFORE INSERT ON "public"."session_validations" FOR EACH ROW EXECUTE FUNCTION "public"."session_validations_enforce_integrity"();



CREATE OR REPLACE TRIGGER "sessions_enforce_profile_timeline_consistency" BEFORE INSERT OR UPDATE OF "child_profile_id", "timeline_id" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."sessions_enforce_profile_timeline_consistency"();



CREATE OR REPLACE TRIGGER "sessions_ensure_epoch_monotone" BEFORE INSERT ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_epoch_monotone"();



CREATE OR REPLACE TRIGGER "sessions_prevent_epoch_decrement" BEFORE UPDATE OF "epoch" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."sessions_prevent_epoch_decrement"();



CREATE OR REPLACE TRIGGER "sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sessions_validate_state_transition" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW WHEN (("old"."state" IS DISTINCT FROM "new"."state")) EXECUTE FUNCTION "public"."validate_session_state_transition"();



CREATE OR REPLACE TRIGGER "trg_cards_quota_before_insert" BEFORE INSERT ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."tg_cards_quota_before_insert"();



CREATE OR REPLACE TRIGGER "trg_child_profiles_prevent_delete_last" BEFORE DELETE ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_child_profiles_prevent_delete_last"();



COMMENT ON TRIGGER "trg_child_profiles_prevent_delete_last" ON "public"."child_profiles" IS 'Empêche suppression du dernier profil enfant (au moins 1 obligatoire). Lève erreur 23514 (CHECK_VIOLATION). Concurrence-safe via FOR UPDATE.';



CREATE OR REPLACE TRIGGER "trg_child_profiles_quota_before_insert" BEFORE INSERT ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_child_profiles_quota_before_insert"();



CREATE OR REPLACE TRIGGER "trg_devices_quota_before_insert" BEFORE INSERT ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."tg_devices_quota_before_insert"();



CREATE OR REPLACE TRIGGER "trg_platform_account_preferences_set_updated_at" BEFORE UPDATE ON "public"."account_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."platform_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_platform_accounts_create_preferences" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_account_preferences"();



CREATE OR REPLACE TRIGGER "trg_platform_admin_audit_log_no_delete" BEFORE DELETE ON "public"."admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_admin_audit_log_no_update" BEFORE UPDATE ON "public"."admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_consent_events_no_delete" BEFORE DELETE ON "public"."consent_events" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_consent_events_no_update" BEFORE UPDATE ON "public"."consent_events" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_stations_set_updated_at" BEFORE UPDATE ON "public"."stations" FOR EACH ROW EXECUTE FUNCTION "public"."platform_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_platform_subscription_logs_no_delete" BEFORE DELETE ON "public"."subscription_logs" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_subscription_logs_no_update" BEFORE UPDATE ON "public"."subscription_logs" FOR EACH ROW EXECUTE FUNCTION "public"."platform_forbid_update_delete"();



CREATE OR REPLACE TRIGGER "trg_platform_subscriptions_project_status" AFTER INSERT OR UPDATE OF "status", "account_id" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_subscriptions_project_account_status"();



CREATE OR REPLACE TRIGGER "trg_platform_subscriptions_set_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."platform_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sessions_on_completed_lock_profiles" AFTER UPDATE ON "public"."sessions" FOR EACH ROW WHEN ((("old"."state" IS DISTINCT FROM "new"."state") AND ("new"."state" = 'completed'::"public"."session_state"))) EXECUTE FUNCTION "public"."tg_sessions_on_completed_lock_profiles"();



CREATE OR REPLACE TRIGGER "trigger_accounts_auto_create_first_child_profile" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."accounts_auto_create_first_child_profile"();



CREATE OR REPLACE TRIGGER "trigger_accounts_seed_system_category" AFTER INSERT ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."accounts_seed_system_category"();



CREATE OR REPLACE TRIGGER "trigger_cards_normalize_published" BEFORE INSERT OR UPDATE ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."cards_normalize_published"();



CREATE OR REPLACE TRIGGER "trigger_cards_prevent_delete_bank_if_referenced" BEFORE DELETE ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."cards_prevent_delete_bank_if_referenced"();



CREATE OR REPLACE TRIGGER "trigger_cards_prevent_update_image_url_personal" BEFORE UPDATE OF "image_url" ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."cards_prevent_update_image_url_personal"();



CREATE OR REPLACE TRIGGER "trigger_categories_before_delete_remap" BEFORE DELETE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."categories_before_delete_remap_to_system"();



CREATE OR REPLACE TRIGGER "trigger_child_profiles_auto_create_timeline" AFTER INSERT ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."child_profiles_auto_create_timeline"();



CREATE OR REPLACE TRIGGER "trigger_sequence_steps_card_ownership" BEFORE INSERT OR UPDATE OF "sequence_id", "step_card_id" ON "public"."sequence_steps" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_sequence_steps_card_ownership"();



CREATE CONSTRAINT TRIGGER "trigger_sequence_steps_min_two_steps" AFTER INSERT OR DELETE OR UPDATE ON "public"."sequence_steps" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sequences_min_two_steps"();



CREATE CONSTRAINT TRIGGER "trigger_sequences_min_two_steps" AFTER INSERT ON "public"."sequences" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sequences_min_two_steps"();



CREATE OR REPLACE TRIGGER "trigger_sequences_mother_card_ownership" BEFORE INSERT OR UPDATE OF "account_id", "mother_card_id" ON "public"."sequences" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_sequences_mother_card_ownership"();



CREATE OR REPLACE TRIGGER "trigger_slots_after_insert_guard_reset" AFTER INSERT ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"();



CREATE OR REPLACE TRIGGER "trigger_slots_before_delete_guard_reset" BEFORE DELETE ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"();



CREATE OR REPLACE TRIGGER "trigger_slots_before_update_guard_reset" BEFORE UPDATE ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"();



CREATE OR REPLACE TRIGGER "trigger_slots_enforce_card_ownership" BEFORE INSERT OR UPDATE OF "timeline_id", "card_id" ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_slot_card_ownership"();



CREATE OR REPLACE TRIGGER "trigger_slots_enforce_min_reward" BEFORE DELETE ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_enforce_min_reward"();



CREATE OR REPLACE TRIGGER "trigger_slots_enforce_min_step" BEFORE DELETE ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_enforce_min_step"();



CREATE OR REPLACE TRIGGER "trigger_slots_enforce_single_reward" BEFORE INSERT OR UPDATE OF "kind", "timeline_id" ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."slots_enforce_single_reward"();



CREATE OR REPLACE TRIGGER "trigger_timelines_auto_create_minimal_slots" AFTER INSERT ON "public"."timelines" FOR EACH ROW EXECUTE FUNCTION "public"."timelines_auto_create_minimal_slots"();



CREATE OR REPLACE TRIGGER "trigger_user_card_categories_integrity" BEFORE INSERT OR UPDATE OF "user_id", "card_id", "category_id" ON "public"."user_card_categories" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_user_card_categories_integrity"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."account_preferences"
    ADD CONSTRAINT "account_preferences_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_quota_months"
    ADD CONSTRAINT "account_quota_months_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_target_account_id_fkey" FOREIGN KEY ("target_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_events"
    ADD CONSTRAINT "consent_events_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "sequence_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequence_steps"
    ADD CONSTRAINT "sequence_steps_step_card_id_fkey" FOREIGN KEY ("step_card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "sequences_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sequences"
    ADD CONSTRAINT "sequences_mother_card_id_fkey" FOREIGN KEY ("mother_card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_validations"
    ADD CONSTRAINT "session_validations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_validations"
    ADD CONSTRAINT "session_validations_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_logs"
    ADD CONSTRAINT "subscription_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "timelines_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_namespace_id_fkey" FOREIGN KEY ("namespace_id") REFERENCES "storage"."iceberg_namespaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



ALTER TABLE "public"."account_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_preferences_self_insert" ON "public"."account_preferences" FOR INSERT TO "authenticated" WITH CHECK (("account_id" = "auth"."uid"()));



CREATE POLICY "account_preferences_self_select" ON "public"."account_preferences" FOR SELECT TO "authenticated" USING (("account_id" = "auth"."uid"()));



CREATE POLICY "account_preferences_self_update" ON "public"."account_preferences" FOR UPDATE TO "authenticated" USING (("account_id" = "auth"."uid"())) WITH CHECK (("account_id" = "auth"."uid"()));



ALTER TABLE "public"."account_quota_months" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_quota_months_delete_own" ON "public"."account_quota_months" FOR DELETE USING (("account_id" = "auth"."uid"()));



CREATE POLICY "account_quota_months_insert_own" ON "public"."account_quota_months" FOR INSERT WITH CHECK (("account_id" = "auth"."uid"()));



CREATE POLICY "account_quota_months_select_own" ON "public"."account_quota_months" FOR SELECT USING (("account_id" = "auth"."uid"()));



CREATE POLICY "account_quota_months_update_own" ON "public"."account_quota_months" FOR UPDATE USING (("account_id" = "auth"."uid"())) WITH CHECK (("account_id" = "auth"."uid"()));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_delete_owner" ON "public"."accounts" FOR DELETE TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "accounts_delete_owner" ON "public"."accounts" IS 'Owner-only: user can delete their own account (RGPD)';



CREATE POLICY "accounts_select_owner" ON "public"."accounts" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "accounts_select_owner" ON "public"."accounts" IS 'Owner-only: user can only read their own account (id = auth.uid())';



CREATE POLICY "accounts_update_owner" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("status" = ( SELECT "accounts_1"."status"
   FROM "public"."accounts" "accounts_1"
  WHERE ("accounts_1"."id" = "auth"."uid"())))));



COMMENT ON POLICY "accounts_update_owner" ON "public"."accounts" IS 'Owner-only: user can update their own account (timezone, etc.) but NOT status (Stripe-managed, WITH CHECK enforced)';



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_log_insert_admin_only" ON "public"."admin_audit_log" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_audit_log_select_admin_only" ON "public"."admin_audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cards_delete_bank_admin" ON "public"."cards" FOR DELETE TO "authenticated" USING (("public"."is_admin"() AND ("type" = 'bank'::"public"."card_type")));



COMMENT ON POLICY "cards_delete_bank_admin" ON "public"."cards" IS 'Admin: delete bank card (blocked if referenced by trigger)';



CREATE POLICY "cards_delete_personal" ON "public"."cards" FOR DELETE TO "authenticated" USING ((("type" = 'personal'::"public"."card_type") AND ("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "cards_delete_personal" ON "public"."cards" IS 'Authenticated: delete own personal card (blocked in execution-only mode)';



CREATE POLICY "cards_insert_bank_admin" ON "public"."cards" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() AND ("type" = 'bank'::"public"."card_type") AND ("account_id" IS NULL) AND ("published" IS NOT NULL)));



COMMENT ON POLICY "cards_insert_bank_admin" ON "public"."cards" IS 'Admin: create bank card only';



CREATE POLICY "cards_insert_personal" ON "public"."cards" FOR INSERT TO "authenticated" WITH CHECK ((("type" = 'personal'::"public"."card_type") AND ("account_id" = "auth"."uid"()) AND ("published" IS NULL) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "cards_insert_personal" ON "public"."cards" IS 'Authenticated: create personal card (quota enforced by trigger, blocked in execution-only mode)';



CREATE POLICY "cards_select_admin" ON "public"."cards" FOR SELECT TO "authenticated" USING (("public"."is_admin"() AND ("type" = 'bank'::"public"."card_type")));



COMMENT ON POLICY "cards_select_admin" ON "public"."cards" IS 'Admin: read bank cards (all) but NEVER personal of other users (D2)';



CREATE POLICY "cards_select_authenticated" ON "public"."cards" FOR SELECT TO "authenticated" USING (((("type" = 'bank'::"public"."card_type") AND ("published" = true)) OR (("type" = 'personal'::"public"."card_type") AND ("account_id" = "auth"."uid"())) OR (("type" = 'bank'::"public"."card_type") AND ("published" = false) AND ((EXISTS ( SELECT 1
   FROM (("public"."slots" "s"
     JOIN "public"."timelines" "t" ON (("t"."id" = "s"."timeline_id")))
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE (("s"."card_id" = "cards"."id") AND ("cp"."account_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."sequence_steps" "ss"
     JOIN "public"."sequences" "seq" ON (("seq"."id" = "ss"."sequence_id")))
  WHERE ((("ss"."step_card_id" = "cards"."id") OR ("seq"."mother_card_id" = "cards"."id")) AND ("seq"."account_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_card_categories" "ucc"
  WHERE (("ucc"."card_id" = "cards"."id") AND ("ucc"."user_id" = "auth"."uid"()))))))));



COMMENT ON POLICY "cards_select_authenticated" ON "public"."cards" IS 'Authenticated: read bank published + own personal cards + bank unpublished if referenced by owned objects (BLOCKER 5 TSA)';



CREATE POLICY "cards_select_bank_published_anon" ON "public"."cards" FOR SELECT TO "anon" USING ((("type" = 'bank'::"public"."card_type") AND ("published" = true)));



COMMENT ON POLICY "cards_select_bank_published_anon" ON "public"."cards" IS 'Anon: read bank published cards only';



CREATE POLICY "cards_update_bank_admin" ON "public"."cards" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() AND ("type" = 'bank'::"public"."card_type"))) WITH CHECK (("public"."is_admin"() AND ("type" = 'bank'::"public"."card_type")));



COMMENT ON POLICY "cards_update_bank_admin" ON "public"."cards" IS 'Admin: update bank card (publish/unpublish, rename)';



CREATE POLICY "cards_update_personal" ON "public"."cards" FOR UPDATE TO "authenticated" USING ((("type" = 'personal'::"public"."card_type") AND ("account_id" = "auth"."uid"()))) WITH CHECK ((("type" = 'personal'::"public"."card_type") AND ("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "cards_update_personal" ON "public"."cards" IS 'Authenticated: update own personal card (image_url immutable by trigger, blocked in execution-only mode)';



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_owner" ON "public"."categories" FOR DELETE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND ("is_system" = false) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "categories_delete_owner" ON "public"."categories" IS 'Owner-only: user can delete non-system categories (remap to system by trigger, blocked in execution-only mode)';



CREATE POLICY "categories_insert_owner" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ((("account_id" = "auth"."uid"()) AND ("is_system" = false) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "categories_insert_owner" ON "public"."categories" IS 'Owner-only: user can create category (not system, blocked in execution-only mode)';



CREATE POLICY "categories_select_owner" ON "public"."categories" FOR SELECT TO "authenticated" USING (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "categories_select_owner" ON "public"."categories" IS 'Owner-only: user can read their own categories';



CREATE POLICY "categories_update_owner" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("account_id" = "auth"."uid"()) AND ("is_system" = false) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "categories_update_owner" ON "public"."categories" IS 'Owner-only: user can update non-system categories (blocked in execution-only mode)';



ALTER TABLE "public"."child_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_profiles_delete_owner" ON "public"."child_profiles" FOR DELETE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND ("status" = 'active'::"public"."child_profile_status") AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "child_profiles_delete_owner" ON "public"."child_profiles" IS 'Owner-only: user can delete active child profiles (not locked, blocked in execution-only mode). Minimum 1 profile enforced by trigger tg_child_profiles_prevent_delete_last (explicit error 23514). Cascade DELETE: timelines → slots → sessions → validations.';



CREATE POLICY "child_profiles_insert_owner" ON "public"."child_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("account_id" = "auth"."uid"()) AND ("status" = 'active'::"public"."child_profile_status") AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "child_profiles_insert_owner" ON "public"."child_profiles" IS 'Owner-only: user can create child profile (quota enforced by trigger, active only, blocked in execution-only mode)';



CREATE POLICY "child_profiles_select_owner" ON "public"."child_profiles" FOR SELECT TO "authenticated" USING (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "child_profiles_select_owner" ON "public"."child_profiles" IS 'Owner-only: user can only read their own child profiles';



CREATE POLICY "child_profiles_update_owner" ON "public"."child_profiles" FOR UPDATE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND ("status" = 'active'::"public"."child_profile_status"))) WITH CHECK ((("account_id" = "auth"."uid"()) AND ("status" = ( SELECT "child_profiles_1"."status"
   FROM "public"."child_profiles" "child_profiles_1"
  WHERE ("child_profiles_1"."id" = "child_profiles_1"."id")))));



COMMENT ON POLICY "child_profiles_update_owner" ON "public"."child_profiles" IS 'Owner-only: user can update active child profiles (locked = read-only, status immutable via WITH CHECK)';



ALTER TABLE "public"."consent_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_events_insert_service_only" ON "public"."consent_events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "consent_events_select_self_or_admin" ON "public"."consent_events" FOR SELECT TO "authenticated" USING ((("account_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "devices_insert_owner" ON "public"."devices" FOR INSERT TO "authenticated" WITH CHECK (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "devices_insert_owner" ON "public"."devices" IS 'Owner-only: user can add device (quota enforced by trigger)';



CREATE POLICY "devices_select_owner" ON "public"."devices" FOR SELECT TO "authenticated" USING (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "devices_select_owner" ON "public"."devices" IS 'Owner-only: user can only read their own devices';



CREATE POLICY "devices_update_owner" ON "public"."devices" FOR UPDATE TO "authenticated" USING (("account_id" = "auth"."uid"())) WITH CHECK (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "devices_update_owner" ON "public"."devices" IS 'Owner-only: user can revoke device (UPDATE revoked_at), DELETE forbidden';



ALTER TABLE "public"."sequence_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sequence_steps_delete_owner" ON "public"."sequence_steps" FOR DELETE TO "authenticated" USING ((("sequence_id" IN ( SELECT "sequences"."id"
   FROM "public"."sequences"
  WHERE ("sequences"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequence_steps_delete_owner" ON "public"."sequence_steps" IS 'Owner via sequence: user can delete step (not execution-only, min 2 steps by trigger)';



CREATE POLICY "sequence_steps_insert_owner" ON "public"."sequence_steps" FOR INSERT TO "authenticated" WITH CHECK ((("sequence_id" IN ( SELECT "sequences"."id"
   FROM "public"."sequences"
  WHERE ("sequences"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequence_steps_insert_owner" ON "public"."sequence_steps" IS 'Owner via sequence: user can create step (not execution-only, ownership checks by trigger)';



CREATE POLICY "sequence_steps_select_owner" ON "public"."sequence_steps" FOR SELECT TO "authenticated" USING (("sequence_id" IN ( SELECT "sequences"."id"
   FROM "public"."sequences"
  WHERE ("sequences"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "sequence_steps_select_owner" ON "public"."sequence_steps" IS 'Owner via sequence: user can read steps of their own sequences';



CREATE POLICY "sequence_steps_update_owner" ON "public"."sequence_steps" FOR UPDATE TO "authenticated" USING ((("sequence_id" IN ( SELECT "sequences"."id"
   FROM "public"."sequences"
  WHERE ("sequences"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"()))) WITH CHECK ((("sequence_id" IN ( SELECT "sequences"."id"
   FROM "public"."sequences"
  WHERE ("sequences"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequence_steps_update_owner" ON "public"."sequence_steps" IS 'Owner via sequence: user can update step (not execution-only, DnD position)';



ALTER TABLE "public"."sequences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sequences_delete_owner" ON "public"."sequences" FOR DELETE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequences_delete_owner" ON "public"."sequences" IS 'Owner-only: user can delete sequence (not execution-only)';



CREATE POLICY "sequences_insert_owner" ON "public"."sequences" FOR INSERT TO "authenticated" WITH CHECK ((("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequences_insert_owner" ON "public"."sequences" IS 'Owner-only: user can create sequence (not execution-only, ownership checks by trigger)';



CREATE POLICY "sequences_select_owner" ON "public"."sequences" FOR SELECT TO "authenticated" USING (("account_id" = "auth"."uid"()));



COMMENT ON POLICY "sequences_select_owner" ON "public"."sequences" IS 'Owner-only: user can read their own sequences';



CREATE POLICY "sequences_update_owner" ON "public"."sequences" FOR UPDATE TO "authenticated" USING ((("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"()))) WITH CHECK ((("account_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sequences_update_owner" ON "public"."sequences" IS 'Owner-only: user can update sequence (not execution-only)';



ALTER TABLE "public"."session_validations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_validations_delete_owner" ON "public"."session_validations" FOR DELETE TO "authenticated" USING ((("session_id" IN ( SELECT "s"."id"
   FROM ("public"."sessions" "s"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "s"."child_profile_id")))
  WHERE ("cp"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "session_validations_delete_owner" ON "public"."session_validations" IS 'Owner via session: user can delete validation for reset (not execution-only)';



CREATE POLICY "session_validations_insert_owner" ON "public"."session_validations" FOR INSERT TO "authenticated" WITH CHECK (("session_id" IN ( SELECT "s"."id"
   FROM ("public"."sessions" "s"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "s"."child_profile_id")))
  WHERE (("cp"."account_id" = "auth"."uid"()) AND ("s"."state" = ANY (ARRAY['active_preview'::"public"."session_state", 'active_started'::"public"."session_state"]))))));



COMMENT ON POLICY "session_validations_insert_owner" ON "public"."session_validations" IS 'Owner via session: user can create validation (active session only, step checks by trigger)';



CREATE POLICY "session_validations_select_owner" ON "public"."session_validations" FOR SELECT TO "authenticated" USING (("session_id" IN ( SELECT "s"."id"
   FROM ("public"."sessions" "s"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "s"."child_profile_id")))
  WHERE ("cp"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "session_validations_select_owner" ON "public"."session_validations" IS 'Owner via session->child_profile: user can read validations of their own sessions';



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete_owner" ON "public"."sessions" FOR DELETE TO "authenticated" USING ((("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "sessions_delete_owner" ON "public"."sessions" IS 'Owner via child_profile: user can reset session (delete) if not execution-only';



CREATE POLICY "sessions_insert_owner" ON "public"."sessions" FOR INSERT TO "authenticated" WITH CHECK (("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "sessions_insert_owner" ON "public"."sessions" IS 'Owner via child_profile: user can create session (normally via trigger)';



CREATE POLICY "sessions_select_owner" ON "public"."sessions" FOR SELECT TO "authenticated" USING (("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "sessions_select_owner" ON "public"."sessions" IS 'Owner via child_profile: user can read sessions of their own profiles';



CREATE POLICY "sessions_update_owner" ON "public"."sessions" FOR UPDATE TO "authenticated" USING ((("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))) AND ("state" = ANY (ARRAY['active_preview'::"public"."session_state", 'active_started'::"public"."session_state"])))) WITH CHECK (("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "sessions_update_owner" ON "public"."sessions" IS 'Owner via child_profile: user can update active session (completed = read-only, state transitions by trigger)';



ALTER TABLE "public"."slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "slots_delete_owner" ON "public"."slots" FOR DELETE TO "authenticated" USING ((("timeline_id" IN ( SELECT "t"."id"
   FROM ("public"."timelines" "t"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE (("cp"."account_id" = "auth"."uid"()) AND ("cp"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "slots_delete_owner" ON "public"."slots" IS 'Owner via timeline: user can delete slot (active profile, not execution-only, min step/reward + validated checks by trigger)';



CREATE POLICY "slots_insert_owner" ON "public"."slots" FOR INSERT TO "authenticated" WITH CHECK ((("timeline_id" IN ( SELECT "t"."id"
   FROM ("public"."timelines" "t"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE (("cp"."account_id" = "auth"."uid"()) AND ("cp"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "slots_insert_owner" ON "public"."slots" IS 'Owner via timeline: user can create slot (active profile, not execution-only, session checks by trigger)';



CREATE POLICY "slots_select_owner" ON "public"."slots" FOR SELECT TO "authenticated" USING (("timeline_id" IN ( SELECT "t"."id"
   FROM ("public"."timelines" "t"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE ("cp"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "slots_select_owner" ON "public"."slots" IS 'Owner via timeline->child_profile: user can read slots of their own timelines';



CREATE POLICY "slots_update_owner" ON "public"."slots" FOR UPDATE TO "authenticated" USING ((("timeline_id" IN ( SELECT "t"."id"
   FROM ("public"."timelines" "t"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE (("cp"."account_id" = "auth"."uid"()) AND ("cp"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"()))) WITH CHECK ((("timeline_id" IN ( SELECT "t"."id"
   FROM ("public"."timelines" "t"
     JOIN "public"."child_profiles" "cp" ON (("cp"."id" = "t"."child_profile_id")))
  WHERE (("cp"."account_id" = "auth"."uid"()) AND ("cp"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "slots_update_owner" ON "public"."slots" IS 'Owner via timeline: user can update slot (active profile, not execution-only, validated slots locked by trigger)';



ALTER TABLE "public"."stations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stations_select_anon" ON "public"."stations" FOR SELECT TO "anon" USING (true);



CREATE POLICY "stations_select_authenticated" ON "public"."stations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."subscription_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_logs_insert_service_only" ON "public"."subscription_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "subscription_logs_select_admin_only" ON "public"."subscription_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_admin_only" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "subscriptions_write_service_only" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."timelines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timelines_select_owner" ON "public"."timelines" FOR SELECT TO "authenticated" USING (("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE ("child_profiles"."account_id" = "auth"."uid"()))));



COMMENT ON POLICY "timelines_select_owner" ON "public"."timelines" IS 'Owner via child_profile: user can read timelines of their own profiles';



CREATE POLICY "timelines_update_owner" ON "public"."timelines" FOR UPDATE TO "authenticated" USING ((("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE (("child_profiles"."account_id" = "auth"."uid"()) AND ("child_profiles"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"()))) WITH CHECK ((("child_profile_id" IN ( SELECT "child_profiles"."id"
   FROM "public"."child_profiles"
  WHERE (("child_profiles"."account_id" = "auth"."uid"()) AND ("child_profiles"."status" = 'active'::"public"."child_profile_status")))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "timelines_update_owner" ON "public"."timelines" IS 'Owner via child_profile: user can update timeline (active profile only, not execution-only)';



ALTER TABLE "public"."user_card_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_card_categories_delete_owner" ON "public"."user_card_categories" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "user_card_categories_delete_owner" ON "public"."user_card_categories" IS 'Owner-only: user can delete mapping (blocked in execution-only mode)';



CREATE POLICY "user_card_categories_insert_owner" ON "public"."user_card_categories" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."cards"
  WHERE (("cards"."id" = "user_card_categories"."card_id") AND (("cards"."type" = 'bank'::"public"."card_type") OR ("cards"."account_id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM "public"."categories"
  WHERE (("categories"."id" = "user_card_categories"."category_id") AND ("categories"."account_id" = "auth"."uid"())))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "user_card_categories_insert_owner" ON "public"."user_card_categories" IS 'Owner-only: user can create mapping (WITH CHECK prevents cross-account UUID injection, blocked in execution-only mode)';



CREATE POLICY "user_card_categories_select_owner" ON "public"."user_card_categories" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "user_card_categories_select_owner" ON "public"."user_card_categories" IS 'Owner-only: user can read their own card-category mappings';



CREATE POLICY "user_card_categories_update_owner" ON "public"."user_card_categories" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."cards"
  WHERE (("cards"."id" = "user_card_categories"."card_id") AND (("cards"."type" = 'bank'::"public"."card_type") OR ("cards"."account_id" = "auth"."uid"()))))) AND (EXISTS ( SELECT 1
   FROM "public"."categories"
  WHERE (("categories"."id" = "user_card_categories"."category_id") AND ("categories"."account_id" = "auth"."uid"())))) AND (NOT "public"."is_execution_only"())));



COMMENT ON POLICY "user_card_categories_update_owner" ON "public"."user_card_categories" IS 'Owner-only: user can update mapping (WITH CHECK prevents cross-account, blocked in execution-only mode)';



CREATE POLICY "bank_images_delete_admin" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'bank-images'::"text") AND "public"."is_admin"() AND ("name" !~~ '%..%'::"text") AND ("name" !~~ '%/%'::"text") AND ("name" ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text")));



CREATE POLICY "bank_images_insert_admin" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'bank-images'::"text") AND "public"."is_admin"() AND ("name" !~~ '%..%'::"text") AND ("name" !~~ '%/%'::"text") AND ("name" ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text")));



CREATE POLICY "bank_images_select_public" ON "storage"."objects" FOR SELECT TO "authenticated", "anon" USING ((("bucket_id" = 'bank-images'::"text") AND ("name" !~~ '%..%'::"text") AND ("name" !~~ '%/%'::"text") AND ("name" ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text")));



CREATE POLICY "bank_images_update_admin" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'bank-images'::"text") AND "public"."is_admin"() AND ("name" !~~ '%..%'::"text") AND ("name" !~~ '%/%'::"text") AND ("name" ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text"))) WITH CHECK ((("bucket_id" = 'bank-images'::"text") AND "public"."is_admin"() AND ("name" !~~ '%..%'::"text") AND ("name" !~~ '%/%'::"text") AND ("name" ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text")));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_namespaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personal_images_delete_owner" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'personal-images'::"text") AND ("owner" = "auth"."uid"()) AND ("name" !~~ '%..%'::"text") AND ("name" ~ (('^'::"text" || ("auth"."uid"())::"text") || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text"))));



CREATE POLICY "personal_images_insert_owner" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'personal-images'::"text") AND ("owner" = "auth"."uid"()) AND ("name" !~~ '%..%'::"text") AND ("name" ~ (('^'::"text" || ("auth"."uid"())::"text") || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text"))));



CREATE POLICY "personal_images_select_owner" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'personal-images'::"text") AND ("owner" = "auth"."uid"()) AND ("name" !~~ '%..%'::"text") AND ("name" ~ (('^'::"text" || ("auth"."uid"())::"text") || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'::"text"))));



ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."accounts_auto_create_first_child_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_auto_create_first_child_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_auto_create_first_child_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."accounts_seed_system_category"() TO "anon";
GRANT ALL ON FUNCTION "public"."accounts_seed_system_category"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."accounts_seed_system_category"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_account_support_info"("target_account_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_subscription_to_account_status"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_personal_feature_enabled"("p_status" "public"."account_status") TO "anon";
GRANT ALL ON FUNCTION "public"."cards_personal_feature_enabled"("p_status" "public"."account_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_personal_feature_enabled"("p_status" "public"."account_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "anon";
GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_can_create_child_profile"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_can_create_child_profile"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_can_create_child_profile"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_can_create_personal_card"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_can_create_personal_card"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_can_create_personal_card"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_can_register_device"("p_account_id" "uuid", "p_revoked_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."check_can_register_device"("p_account_id" "uuid", "p_revoked_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_can_register_device"("p_account_id" "uuid", "p_revoked_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "anon";
GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_default_account_preferences"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_default_account_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_account_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_account_preferences"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_child_profile_limit_after_session_completion"("p_child_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_sequence_steps_card_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_sequence_steps_card_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_sequence_steps_card_ownership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_sequences_mother_card_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_sequences_mother_card_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_sequences_mother_card_ownership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_slot_card_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_slot_card_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_slot_card_ownership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_user_card_categories_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_user_card_categories_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_user_card_categories_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_epoch_monotone"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_epoch_monotone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_epoch_monotone"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_quota_month_context"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_quota_month_context"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_quota_month_context"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_status"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_status"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_status"("p_account_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_execution_only"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_execution_only"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_execution_only"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_execution_only"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_timezone"("tz" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_timezone"("tz" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_timezone"("tz" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."platform_forbid_update_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."platform_forbid_update_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_forbid_update_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."platform_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."platform_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."quota_cards_monthly_limit"("p_status" "public"."account_status") TO "anon";
GRANT ALL ON FUNCTION "public"."quota_cards_monthly_limit"("p_status" "public"."account_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."quota_cards_monthly_limit"("p_status" "public"."account_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."quota_cards_stock_limit"("p_status" "public"."account_status") TO "anon";
GRANT ALL ON FUNCTION "public"."quota_cards_stock_limit"("p_status" "public"."account_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."quota_cards_stock_limit"("p_status" "public"."account_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."quota_devices_limit"("p_status" "public"."account_status") TO "anon";
GRANT ALL ON FUNCTION "public"."quota_devices_limit"("p_status" "public"."account_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."quota_devices_limit"("p_status" "public"."account_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."quota_profiles_limit"("p_status" "public"."account_status") TO "anon";
GRANT ALL ON FUNCTION "public"."quota_profiles_limit"("p_status" "public"."account_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."quota_profiles_limit"("p_status" "public"."account_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_active_started_session_for_timeline"("p_timeline_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sequences_enforce_min_two_steps"("p_sequence_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."session_validations_enforce_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."session_validations_enforce_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."session_validations_enforce_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sessions_enforce_profile_timeline_consistency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sessions_prevent_epoch_decrement"() TO "anon";
GRANT ALL ON FUNCTION "public"."sessions_prevent_epoch_decrement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sessions_prevent_epoch_decrement"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slots_enforce_min_reward"() TO "anon";
GRANT ALL ON FUNCTION "public"."slots_enforce_min_reward"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."slots_enforce_min_reward"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slots_enforce_min_step"() TO "anon";
GRANT ALL ON FUNCTION "public"."slots_enforce_min_step"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."slots_enforce_min_step"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slots_enforce_single_reward"() TO "anon";
GRANT ALL ON FUNCTION "public"."slots_enforce_single_reward"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."slots_enforce_single_reward"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."slots_guard_validated_and_reset_on_structural_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_cards_quota_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_cards_quota_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_cards_quota_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_child_profiles_quota_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_quota_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_quota_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_devices_quota_before_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_devices_quota_before_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_devices_quota_before_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_sessions_on_completed_lock_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_sessions_on_completed_lock_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_sessions_on_completed_lock_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trg_subscriptions_project_account_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trg_subscriptions_project_account_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_subscriptions_project_account_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_subscriptions_project_account_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "service_role";



GRANT ALL ON TABLE "public"."account_preferences" TO "anon";
GRANT ALL ON TABLE "public"."account_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."account_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."account_quota_months" TO "anon";
GRANT ALL ON TABLE "public"."account_quota_months" TO "authenticated";
GRANT ALL ON TABLE "public"."account_quota_months" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."accounts" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."cards" TO "service_role";
GRANT SELECT ON TABLE "public"."cards" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cards" TO "authenticated";



GRANT ALL ON TABLE "public"."categories" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."categories" TO "authenticated";



GRANT ALL ON TABLE "public"."child_profiles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."consent_events" TO "anon";
GRANT ALL ON TABLE "public"."consent_events" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_events" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."devices" TO "authenticated";



GRANT ALL ON TABLE "public"."sequence_steps" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sequence_steps" TO "authenticated";



GRANT ALL ON TABLE "public"."sequences" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sequences" TO "authenticated";



GRANT ALL ON TABLE "public"."session_validations" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."session_validations" TO "authenticated";



GRANT ALL ON TABLE "public"."sessions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."sessions" TO "authenticated";



GRANT ALL ON TABLE "public"."slots" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."slots" TO "authenticated";



GRANT ALL ON TABLE "public"."stations" TO "anon";
GRANT ALL ON TABLE "public"."stations" TO "authenticated";
GRANT ALL ON TABLE "public"."stations" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_logs" TO "anon";
GRANT ALL ON TABLE "public"."subscription_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_logs" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."timelines" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."timelines" TO "authenticated";



GRANT ALL ON TABLE "public"."user_card_categories" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_card_categories" TO "authenticated";



GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_namespaces" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_tables" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




