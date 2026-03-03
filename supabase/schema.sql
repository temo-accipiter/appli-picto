


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



CREATE OR REPLACE FUNCTION "public"."child_profiles_auto_create_timeline"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_timeline_id UUID;
BEGIN
  -- Créer une timeline pour ce profil enfant (relation 1:1)
  INSERT INTO timelines (child_profile_id)
  VALUES (NEW.id)
  RETURNING id INTO new_timeline_id;

  -- Le trigger sur timelines prendra le relais pour créer slots minimaux
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."child_profiles_auto_create_timeline"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."child_profiles_auto_create_timeline"() IS 'Contrat produit § 2.6: Créer automatiquement la timeline pour chaque nouveau profil enfant';



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



CREATE OR REPLACE FUNCTION "public"."tg_child_profiles_prevent_delete_last"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  remaining_count INT;
BEGIN
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



CREATE OR REPLACE FUNCTION "public"."timelines_auto_create_minimal_slots"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Créer 1 slot Étape (position 0, vide, tokens = 0)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'step', 0, NULL, 0);

  -- Créer 1 slot Récompense (position 1, vide, tokens = NULL)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'reward', 1, NULL, NULL);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."timelines_auto_create_minimal_slots"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."timelines_auto_create_minimal_slots"() IS 'Contrat produit § 2.6: Initialiser automatiquement la structure minimale (1 step + 1 reward, tokens = 0)';



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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_accounts_status" ON "public"."accounts" USING "btree" ("status");



CREATE INDEX "idx_cards_bank_published" ON "public"."cards" USING "btree" ("type", "published") WHERE (("type" = 'bank'::"public"."card_type") AND ("published" = true));



CREATE INDEX "idx_cards_personal_account" ON "public"."cards" USING "btree" ("account_id") WHERE ("type" = 'personal'::"public"."card_type");



CREATE INDEX "idx_cards_quota_monthly" ON "public"."cards" USING "btree" ("account_id", "created_at") WHERE ("type" = 'personal'::"public"."card_type");



CREATE INDEX "idx_categories_account_id" ON "public"."categories" USING "btree" ("account_id");



CREATE UNIQUE INDEX "idx_categories_system" ON "public"."categories" USING "btree" ("account_id") WHERE ("is_system" = true);



COMMENT ON INDEX "public"."idx_categories_system" IS 'UNIQUE: une seule catégorie système (Sans catégorie) par compte';



CREATE INDEX "idx_child_profiles_account_id" ON "public"."child_profiles" USING "btree" ("account_id");



CREATE INDEX "idx_child_profiles_created_at" ON "public"."child_profiles" USING "btree" ("account_id", "created_at");



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



CREATE OR REPLACE TRIGGER "session_validations_auto_transition" AFTER INSERT ON "public"."session_validations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_transition_session_on_validation"();



CREATE OR REPLACE TRIGGER "session_validations_enforce_integrity" BEFORE INSERT ON "public"."session_validations" FOR EACH ROW EXECUTE FUNCTION "public"."session_validations_enforce_integrity"();



CREATE OR REPLACE TRIGGER "sessions_enforce_profile_timeline_consistency" BEFORE INSERT OR UPDATE OF "child_profile_id", "timeline_id" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."sessions_enforce_profile_timeline_consistency"();



CREATE OR REPLACE TRIGGER "sessions_ensure_epoch_monotone" BEFORE INSERT ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_epoch_monotone"();



CREATE OR REPLACE TRIGGER "sessions_prevent_epoch_decrement" BEFORE UPDATE OF "epoch" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."sessions_prevent_epoch_decrement"();



CREATE OR REPLACE TRIGGER "sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sessions_validate_state_transition" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW WHEN (("old"."state" IS DISTINCT FROM "new"."state")) EXECUTE FUNCTION "public"."validate_session_state_transition"();



CREATE OR REPLACE TRIGGER "trg_child_profiles_prevent_delete_last" BEFORE DELETE ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_child_profiles_prevent_delete_last"();



COMMENT ON TRIGGER "trg_child_profiles_prevent_delete_last" ON "public"."child_profiles" IS 'Empêche suppression du dernier profil enfant (au moins 1 obligatoire). Lève erreur 23514 (CHECK_VIOLATION). Concurrence-safe via FOR UPDATE.';



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



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "timelines_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_card_categories"
    ADD CONSTRAINT "user_card_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_delete_owner" ON "public"."accounts" FOR DELETE TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "accounts_delete_owner" ON "public"."accounts" IS 'Owner-only: user can delete their own account (RGPD)';



CREATE POLICY "accounts_select_owner" ON "public"."accounts" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



COMMENT ON POLICY "accounts_select_owner" ON "public"."accounts" IS 'Owner-only: user can only read their own account (id = auth.uid())';



CREATE POLICY "accounts_update_owner" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("status" = ( SELECT "accounts_1"."status"
   FROM "public"."accounts" "accounts_1"
  WHERE ("accounts_1"."id" = "auth"."uid"())))));



COMMENT ON POLICY "accounts_update_owner" ON "public"."accounts" IS 'Owner-only: user can update their own account (timezone, etc.) but NOT status (Stripe-managed, WITH CHECK enforced)';



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



GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_transition_session_on_validation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_normalize_published"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_prevent_delete_bank_if_referenced"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "anon";
GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cards_prevent_update_image_url_personal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "anon";
GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categories_before_delete_remap_to_system"() TO "service_role";



GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "anon";
GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."child_profiles_auto_create_timeline"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_validation_if_completed"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_child_profiles_prevent_delete_last"() TO "service_role";



GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "anon";
GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."timelines_auto_create_minimal_slots"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sequences_min_two_steps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_session_state_transition"() TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."accounts" TO "authenticated";



GRANT ALL ON TABLE "public"."cards" TO "service_role";
GRANT SELECT ON TABLE "public"."cards" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cards" TO "authenticated";



GRANT ALL ON TABLE "public"."categories" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."categories" TO "authenticated";



GRANT ALL ON TABLE "public"."child_profiles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."child_profiles" TO "authenticated";



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



GRANT ALL ON TABLE "public"."timelines" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."timelines" TO "authenticated";



GRANT ALL ON TABLE "public"."user_card_categories" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_card_categories" TO "authenticated";



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




