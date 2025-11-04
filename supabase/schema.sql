--
-- PostgreSQL database dump
--

\restrict etU5mr3ZGjk5K9nXTNYVOosNJ8ZcNy3AMNFOMfYOb0EpXiTdFxYImCmkvNQElka

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: transport_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transport_type AS ENUM (
    'metro',
    'bus',
    'tram',
    'rer'
);


ALTER TYPE public.transport_type OWNER TO postgres;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: _compute_my_permissions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._compute_my_permissions() RETURNS TABLE(feature_name text, can_access boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with my_role as (
    select role_id, role_name from public._compute_my_primary_role()
  )
  select
    f.name as feature_name,
    case
      when (select role_name from my_role) = 'admin' then true
      else coalesce(rp.can_access, false)
    end as can_access
  from features f
  left join role_permissions rp
    on rp.feature_id = f.id
   and rp.role_id = (select role_id from my_role)
$$;


ALTER FUNCTION public._compute_my_permissions() OWNER TO postgres;

--
-- Name: _compute_my_primary_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._compute_my_primary_role() RETURNS TABLE(role_id uuid, role_name text, priority integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select r.id as role_id, r.name as role_name, r.priority
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
    and coalesce(ur.is_active, true) = true
    and coalesce(r.is_active, true) = true
  order by r.priority asc
  limit 1
$$;


ALTER FUNCTION public._compute_my_primary_role() OWNER TO postgres;

--
-- Name: assert_self_or_admin(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assert_self_or_admin(p_target uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_target IS NULL THEN
    RAISE EXCEPTION 'Forbidden (target is null)' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_target AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden (not self nor admin)' USING ERRCODE = '42501';
  END IF;
END;
$$;


ALTER FUNCTION public.assert_self_or_admin(p_target uuid) OWNER TO postgres;

--
-- Name: FUNCTION assert_self_or_admin(p_target uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.assert_self_or_admin(p_target uuid) IS 'Raise if the caller is neither the target user nor an admin.';


--
-- Name: bump_usage_counter(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bump_usage_counter(p_user uuid, p_col text, p_delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  -- Pas d’utilisateur (ligne demo, SQL sans JWT…) => on ne compte pas
  if p_user is null then
    return;
  end if;

  update public.user_usage_counters
     set updated_at = now(),
         -- pas de valeurs négatives
         tasks      = case when p_col = 'tasks'      then greatest(0, tasks + p_delta)      else tasks      end,
         rewards    = case when p_col = 'rewards'    then greatest(0, rewards + p_delta)    else rewards    end,
         categories = case when p_col = 'categories' then greatest(0, categories + p_delta) else categories end
   where user_id = p_user;

  if not found then
    insert into public.user_usage_counters(user_id, tasks, rewards, categories)
    values (
      p_user,
      case when p_col='tasks'      then greatest(0, p_delta) else 0 end,
      case when p_col='rewards'    then greatest(0, p_delta) else 0 end,
      case when p_col='categories' then greatest(0, p_delta) else 0 end
    );
  end if;
end;
$$;


ALTER FUNCTION public.bump_usage_counter(p_user uuid, p_col text, p_delta integer) OWNER TO postgres;

--
-- Name: categories_counter_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.categories_counter_del() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(old.user_id, auth.uid()), 'categories', -1);
  return old;
end;
$$;


ALTER FUNCTION public.categories_counter_del() OWNER TO postgres;

--
-- Name: categories_counter_ins(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.categories_counter_ins() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'categories', 1);
  return new;
end;
$$;


ALTER FUNCTION public.categories_counter_ins() OWNER TO postgres;

--
-- Name: change_account_status(uuid, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid DEFAULT NULL::uuid, reason text DEFAULT NULL::text, metadata jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  old_status text;
  old_role text;
  new_role text;
  had_admin boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Permission denied: admin only' using errcode='42501';
  end if;

  select p.account_status, r.name
    into old_status, old_role
  from public.profiles p
  left join public.user_roles ur on ur.user_id = p.id and ur.is_active = true
  left join public.roles r on r.id = ur.role_id
  where p.id = target_user_id;

  had_admin := public.is_admin();

  update public.profiles
     set account_status = new_status,
         deletion_scheduled_at = case
           when new_status = 'deletion_scheduled' then now() + interval '30 days'
           else null
         end
   where id = target_user_id;

  if new_status = 'active' then
    select case
      when public.is_subscriber(target_user_id) then 'abonne'
      else 'free' end
    into new_role;
  elsif new_status in ('suspended','deletion_scheduled','pending_verification') then
    new_role := 'visitor';
  end if;

  if new_role is not null and new_role <> old_role then
    update public.user_roles set is_active=false where user_id=target_user_id;

    insert into public.user_roles (user_id, role_id, assigned_by)
    select target_user_id, r.id, changed_by_user_id
    from public.roles r
    where r.name = new_role
    on conflict (user_id, role_id) do nothing;

    update public.user_roles
       set is_active=true, updated_at=now()
     where user_id=target_user_id
       and role_id in (select id from public.roles where name=new_role);
  end if;

  if had_admin then
    update public.profiles set is_admin = true where id = target_user_id;
  end if;

  insert into public.account_audit_logs(user_id, changed_by, old_status, new_status, reason, metadata, action)
  values (target_user_id, changed_by_user_id, old_status, new_status, reason, metadata, 'status_change');

  return true;
end;
$$;


ALTER FUNCTION public.change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid, reason text, metadata jsonb) OWNER TO postgres;

--
-- Name: check_duplicate_image(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- 1️⃣ VÉRIFICATION PERMISSION (self ou admin)
  -- ─────────────────────────────────────────────────────────────
  PERFORM public.assert_self_or_admin(p_user_id);

  -- ─────────────────────────────────────────────────────────────
  -- 2️⃣ RECHERCHE HASH EXISTANT (non supprimé)
  -- ─────────────────────────────────────────────────────────────
  SELECT id, file_path, width, height, version, asset_type
  INTO v_existing
  FROM public.user_assets
  WHERE user_id = p_user_id
    AND sha256_hash = p_sha256_hash
    AND deleted_at IS NULL -- Seulement assets actifs
  LIMIT 1;

  -- ─────────────────────────────────────────────────────────────
  -- 3️⃣ RÉSULTAT
  -- ─────────────────────────────────────────────────────────────
  IF v_existing.id IS NOT NULL THEN
    -- ✅ Hash existe déjà → retourner infos asset
    RETURN jsonb_build_object(
      'exists', true,
      'asset_id', v_existing.id,
      'file_path', v_existing.file_path,
      'width', v_existing.width,
      'height', v_existing.height,
      'version', v_existing.version,
      'asset_type', v_existing.asset_type
    );
  ELSE
    -- ❌ Hash nouveau → autoriser upload
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$;


ALTER FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) OWNER TO postgres;

--
-- Name: FUNCTION check_duplicate_image(p_user_id uuid, p_sha256_hash text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) IS 'Vérifie si un hash SHA-256 existe déjà pour un utilisateur (déduplication). Retourne {exists: true, asset_id, file_path, ...} si trouvé, sinon {exists: false}.';


--
-- Name: check_image_quota(uuid, text, bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role_name TEXT;
  v_current_count INTEGER;
  v_max_tasks INTEGER;
  v_max_rewards INTEGER;
  v_total_storage BIGINT;
  v_max_storage BIGINT := 100 * 1024 * 1024; -- 100 Mo par défaut
  v_reason TEXT;
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- 1️⃣ VÉRIFICATION PERMISSION (self ou admin)
  -- ─────────────────────────────────────────────────────────────
  PERFORM public.assert_self_or_admin(p_user_id);

  -- ─────────────────────────────────────────────────────────────
  -- 2️⃣ RÉCUPÉRER RÔLE UTILISATEUR
  -- ─────────────────────────────────────────────────────────────
  SELECT r.name INTO v_role_name
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;

  -- Admin → aucune limite
  IF v_role_name = 'admin' THEN
    RETURN jsonb_build_object(
      'can_upload', true,
      'reason', 'admin_unlimited'
    );
  END IF;

  -- Fallback rôle si non trouvé
  IF v_role_name IS NULL THEN
    v_role_name := 'free';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 3️⃣ RÉCUPÉRER QUOTAS SELON RÔLE
  -- ─────────────────────────────────────────────────────────────
  -- Free : 5 tâches, 2 récompenses
  -- Abonné : 40 tâches, 10 récompenses
  IF v_role_name = 'abonne' THEN
    v_max_tasks := 40;
    v_max_rewards := 10;
    v_max_storage := 500 * 1024 * 1024; -- 500 Mo
  ELSE
    -- Free
    v_max_tasks := 5;
    v_max_rewards := 2;
    v_max_storage := 50 * 1024 * 1024; -- 50 Mo
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 4️⃣ VÉRIFICATION QUOTA IMAGES (task_image ou reward_image)
  -- ─────────────────────────────────────────────────────────────
  IF p_asset_type = 'task_image' THEN
    -- Compter tâches actuelles (user_assets actifs)
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_assets
    WHERE user_id = p_user_id
      AND asset_type = 'task_image'
      AND deleted_at IS NULL;

    IF v_current_count >= v_max_tasks THEN
      v_reason := 'task_image_limit_reached';
      RETURN jsonb_build_object(
        'can_upload', false,
        'reason', v_reason,
        'current', v_current_count,
        'max', v_max_tasks
      );
    END IF;

  ELSIF p_asset_type = 'reward_image' THEN
    -- Compter récompenses actuelles
    SELECT COUNT(*) INTO v_current_count
    FROM public.user_assets
    WHERE user_id = p_user_id
      AND asset_type = 'reward_image'
      AND deleted_at IS NULL;

    IF v_current_count >= v_max_rewards THEN
      v_reason := 'reward_image_limit_reached';
      RETURN jsonb_build_object(
        'can_upload', false,
        'reason', v_reason,
        'current', v_current_count,
        'max', v_max_rewards
      );
    END IF;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 5️⃣ VÉRIFICATION QUOTA STORAGE TOTAL
  -- ─────────────────────────────────────────────────────────────
  SELECT COALESCE(SUM(file_size), 0) INTO v_total_storage
  FROM public.user_assets
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  IF (v_total_storage + p_file_size) > v_max_storage THEN
    v_reason := 'total_storage_limit_reached';
    RETURN jsonb_build_object(
      'can_upload', false,
      'reason', v_reason,
      'current_storage_mb', ROUND(v_total_storage / 1048576.0, 2),
      'max_storage_mb', ROUND(v_max_storage / 1048576.0, 2)
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 6️⃣ VÉRIFICATION TAILLE FICHIER (10 Mo max)
  -- ─────────────────────────────────────────────────────────────
  IF p_file_size > (10 * 1024 * 1024) THEN
    v_reason := 'image_too_large';
    RETURN jsonb_build_object(
      'can_upload', false,
      'reason', v_reason,
      'file_size_mb', ROUND(p_file_size / 1048576.0, 2),
      'max_file_size_mb', 10
    );
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 7️⃣ AUTORISÉ ✅
  -- ─────────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'can_upload', true,
    'reason', 'quota_ok',
    'role', v_role_name
  );
END;
$$;


ALTER FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint) OWNER TO postgres;

--
-- Name: FUNCTION check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint) IS 'Vérifie quotas AVANT upload image (tâches, récompenses, storage total). Paramètres : user_id, asset_type (task_image|reward_image), file_size (bytes). Retourne {can_upload: bool, reason: string, current?, max?}.';


--
-- Name: check_user_quota(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_quota(user_uuid uuid, quota_type text, quota_period text DEFAULT 'monthly'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limit integer;
  v_usage integer;
  v_dummy1 integer; v_dummy2 integer; v_is_limited boolean;
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  -- Réutilise la logique ci-dessus
  SELECT quota_limit, current_usage, remaining, is_limited
  INTO v_limit, v_usage, v_dummy1, v_is_limited
  FROM public.get_user_quota_info(user_uuid, quota_type, quota_period);

  IF v_limit IS NULL THEN
    RETURN true; -- pas de limite => autorisé
  END IF;

  RETURN v_usage < v_limit;
END
$$;


ALTER FUNCTION public.check_user_quota(user_uuid uuid, quota_type text, quota_period text) OWNER TO postgres;

--
-- Name: check_user_quota_free_only(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_free boolean;
  v_limite int;
  v_count int;
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);
  IF p_user_id IS NULL THEN RETURN false; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND ur.is_active = true AND r.name = 'free'
  ) INTO v_is_free;

  IF NOT v_is_free THEN
    RETURN true; -- on ne bloque que FREE ici
  END IF;

  SELECT rq.quota_limit
  INTO v_limite
  FROM role_quotas rq
  JOIN roles r ON r.id = rq.role_id
  WHERE r.name = 'free'
    AND rq.quota_type = p_quota_type
    AND rq.quota_period = CASE WHEN p_period='monthly' THEN 'monthly' ELSE 'total' END
  LIMIT 1;

  IF v_limite IS NULL THEN
    RETURN true;
  END IF;

  IF p_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end FROM get_user_month_bounds_utc(p_user_id);

    IF p_quota_type = 'task' THEN
      SELECT COUNT(*) INTO v_count FROM taches
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSIF p_quota_type = 'reward' THEN
      SELECT COUNT(*) INTO v_count FROM recompenses
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSIF p_quota_type = 'category' THEN
      SELECT COUNT(*) INTO v_count FROM categories
      WHERE user_id = p_user_id AND created_at >= v_start AND created_at < v_end;

    ELSE
      RETURN true;
    END IF;

  ELSE
    IF p_quota_type = 'task' THEN
      SELECT COUNT(*) INTO v_count FROM taches WHERE user_id = p_user_id;
    ELSIF p_quota_type = 'reward' THEN
      SELECT COUNT(*) INTO v_count FROM recompenses WHERE user_id = p_user_id;
    ELSIF p_quota_type = 'category' THEN
      SELECT COUNT(*) INTO v_count FROM categories WHERE user_id = p_user_id;
    ELSE
      RETURN true;
    END IF;
  END IF;

  RETURN v_count < v_limite;
END;
$$;


ALTER FUNCTION public.check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text) OWNER TO postgres;

--
-- Name: cleanup_old_audit_logs(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_audit_logs(retention_days integer DEFAULT 365) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE='42501';
  END IF;

  DELETE FROM public.account_audit_logs
  WHERE created_at < (now() - make_interval(days => retention_days));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$$;


ALTER FUNCTION public.cleanup_old_audit_logs(retention_days integer) OWNER TO postgres;

--
-- Name: email_exists(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.email_exists(email_to_check text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Vérifier si l'email existe dans la table auth.users
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE email = email_to_check
    );
END;
$$;


ALTER FUNCTION public.email_exists(email_to_check text) OWNER TO postgres;

--
-- Name: generate_unique_pseudo(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_unique_pseudo(base text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  candidate text := null;
  i int := 0;
BEGIN
  IF base IS NULL OR btrim(base) = '' THEN
    base := 'Utilisateur';
  END IF;

  -- nettoyage simple
  base := lower(regexp_replace(btrim(base), '\s+', '-', 'g'));

  LOOP
    candidate := CASE WHEN i = 0 THEN base ELSE base || '-' || i::text END;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE pseudo = candidate);
    i := i + 1;
  END LOOP;

  RETURN candidate;
END;
$$;


ALTER FUNCTION public.generate_unique_pseudo(base text) OWNER TO postgres;

--
-- Name: get_account_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_account_history(user_uuid uuid, limit_count integer DEFAULT 50) RETURNS TABLE(id uuid, action text, old_status text, new_status text, old_role text, new_role text, reason text, changed_by_pseudo text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  RETURN QUERY
  SELECT
    aal.id,
    aal.action,
    aal.old_status,
    aal.new_status,
    aal.old_role,
    aal.new_role,
    aal.reason,
    p.pseudo AS changed_by_pseudo,
    aal.created_at
  FROM public.account_audit_logs aal
  LEFT JOIN public.profiles p ON p.id = aal.changed_by
  WHERE aal.user_id = user_uuid
  ORDER BY aal.created_at DESC
  LIMIT limit_count;
END
$$;


ALTER FUNCTION public.get_account_history(user_uuid uuid, limit_count integer) OWNER TO postgres;

--
-- Name: get_account_status(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_account_status(user_uuid uuid) RETURNS TABLE(user_id uuid, account_status text, role_name text, is_suspended boolean, is_pending_verification boolean, is_scheduled_for_deletion boolean, deletion_date timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  RETURN QUERY
  SELECT
    p.id as user_id,
    p.account_status,
    r.name as role_name,
    (p.account_status = 'suspended') as is_suspended,
    (p.account_status = 'pending_verification') as is_pending_verification,
    (p.account_status = 'deletion_scheduled') as is_scheduled_for_deletion,
    p.deletion_scheduled_at as deletion_date
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.is_active = true
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE p.id = user_uuid;
END
$$;


ALTER FUNCTION public.get_account_status(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_confettis(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_confettis() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  select confettis from public.parametres where id = 1
$$;


ALTER FUNCTION public.get_confettis() OWNER TO postgres;

--
-- Name: FUNCTION get_confettis(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_confettis() IS 'Lecture simple du paramètre confettis (singleton id=1).';


--
-- Name: get_demo_cards(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_demo_cards(card_type_filter text DEFAULT NULL::text) RETURNS TABLE(id uuid, card_type text, label text, imagepath text, "position" integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        dc.id,
        dc.card_type,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND (card_type_filter IS NULL OR dc.card_type = card_type_filter)
    ORDER BY dc."position", dc.created_at;
$$;


ALTER FUNCTION public.get_demo_cards(card_type_filter text) OWNER TO postgres;

--
-- Name: get_demo_rewards(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_demo_rewards() RETURNS TABLE(id uuid, label text, imagepath text, "position" integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        dc.id,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND dc.card_type = 'reward'
    ORDER BY dc."position", dc.created_at;
$$;


ALTER FUNCTION public.get_demo_rewards() OWNER TO postgres;

--
-- Name: get_demo_tasks(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_demo_tasks() RETURNS TABLE(id uuid, label text, imagepath text, "position" integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
    SELECT 
        dc.id,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND dc.card_type = 'task'
    ORDER BY dc."position", dc.created_at;
$$;


ALTER FUNCTION public.get_demo_tasks() OWNER TO postgres;

--
-- Name: get_image_analytics_summary(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_image_analytics_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- Admins uniquement
  -- ─────────────────────────────────────────────────────────────
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admins only' USING ERRCODE = '42501';
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- Statistiques globales (7 derniers jours)
  -- ─────────────────────────────────────────────────────────────
  RETURN (
    SELECT jsonb_build_object(
      'period_days', 7,
      'total_uploads', COUNT(*),
      'success_count', COUNT(*) FILTER (WHERE result = 'success'),
      'failed_count', COUNT(*) FILTER (WHERE result = 'failed'),
      'fallback_count', COUNT(*) FILTER (WHERE result = 'fallback_original'),
      'avg_compression_ratio', ROUND(AVG(compression_ratio), 2),
      'avg_conversion_ms', ROUND(AVG(conversion_ms), 0),
      'avg_upload_ms', ROUND(AVG(upload_ms), 0),
      'total_storage_saved_mb', ROUND(SUM(original_size - compressed_size) / 1048576.0, 2),
      'webp_conversions', COUNT(*) FILTER (WHERE conversion_method = 'client_webp'),
      'heic_conversions', COUNT(*) FILTER (WHERE conversion_method LIKE 'heic%')
    )
    FROM public.image_metrics
    WHERE created_at > NOW() - INTERVAL '7 days'
  );
END;
$$;


ALTER FUNCTION public.get_image_analytics_summary() OWNER TO postgres;

--
-- Name: FUNCTION get_image_analytics_summary(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_image_analytics_summary() IS 'Statistiques uploads 7 derniers jours (admins uniquement). Retourne métriques globales : uploads totaux, taux succès, compression moyenne, etc.';


--
-- Name: get_migration_report(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_migration_report() RETURNS TABLE(total_users integer, active_users integer, suspended_users integer, pending_users integer, deletion_scheduled_users integer, admin_users integer, abonne_users integer, free_users integer, visitor_users integer, staff_users integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'active') as active_users,
    (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'suspended') as suspended_users,
    (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'pending_verification') as pending_users,
    (SELECT COUNT(*) FROM public.profiles WHERE account_status = 'deletion_scheduled') as deletion_scheduled_users,
    (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'admin' AND ur.is_active = true) as admin_users,
    (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'abonne' AND ur.is_active = true) as abonne_users,
    (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'free' AND ur.is_active = true) as free_users,
    (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'visitor' AND ur.is_active = true) as visitor_users,
    (SELECT COUNT(*) FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE r.name = 'staff' AND ur.is_active = true) as staff_users;
END
$$;


ALTER FUNCTION public.get_migration_report() OWNER TO postgres;

--
-- Name: get_my_permissions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_permissions() RETURNS TABLE(feature_name text, can_access boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select * from public._compute_my_permissions(); $$;


ALTER FUNCTION public.get_my_permissions() OWNER TO postgres;

--
-- Name: get_my_primary_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_primary_role() RETURNS TABLE(role_id uuid, role_name text, priority integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ select * from public._compute_my_primary_role(); $$;


ALTER FUNCTION public.get_my_primary_role() OWNER TO postgres;

--
-- Name: get_usage(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage(p_user_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      select jsonb_build_object('user_id', p_user_id);
    $$;


ALTER FUNCTION public.get_usage(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_usage_fast(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_fast(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role record;
  v_quotas jsonb := '[]'::jsonb;
  v_cnt record;
  v_subscription record;
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);

  SELECT r.id, r.name, r.priority
    INTO v_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;

  IF v_role.id IS NULL THEN
    SELECT *
      INTO v_subscription
    FROM public.abonnements
    WHERE user_id = p_user_id
      AND status IN ('active','trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription.id IS NOT NULL THEN
      SELECT id, name, priority INTO v_role FROM public.roles WHERE name = 'abonne' LIMIT 1;
    ELSE
      SELECT id, name, priority INTO v_role FROM public.roles WHERE name = 'visitor' LIMIT 1;
    END IF;
  END IF;

  IF v_role.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'quota_type', rq.quota_type,
             'quota_limit', rq.quota_limit,
             'quota_period', rq.quota_period
           )), '[]'::jsonb)
      INTO v_quotas
    FROM public.role_quotas rq
    WHERE rq.role_id = v_role.id;
  END IF;

  SELECT tasks, rewards, categories
    INTO v_cnt
  FROM public.user_usage_counters
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'role', jsonb_build_object(
      'id', v_role.id,
      'name', COALESCE(v_role.name, 'visitor'),
      'priority', COALESCE(v_role.priority, 0)
    ),
    'quotas', v_quotas,
    'usage', jsonb_build_object(
      'tasks', COALESCE(v_cnt.tasks, 0),
      'rewards', COALESCE(v_cnt.rewards, 0),
      'categories', COALESCE(v_cnt.categories, 0)
    )
  );
END
$$;


ALTER FUNCTION public.get_usage_fast(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_assets_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_assets_stats(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_stats jsonb;
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);

  SELECT jsonb_build_object(
    'total_images', COUNT(*),
    'total_size', COALESCE(SUM(file_size), 0),
    'task_images', COUNT(*) FILTER (WHERE asset_type = 'task_image'),
    'reward_images', COUNT(*) FILTER (WHERE asset_type = 'reward_image'),
    'task_images_size', COALESCE(SUM(file_size) FILTER (WHERE asset_type = 'task_image'), 0),
    'reward_images_size', COALESCE(SUM(file_size) FILTER (WHERE asset_type = 'reward_image'), 0)
  ) INTO v_stats
  FROM public.user_assets
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_stats,
    '{"total_images":0,"total_size":0,"task_images":0,"reward_images":0,"task_images_size":0,"reward_images_size":0}'::jsonb
  );
END
$$;


ALTER FUNCTION public.get_user_assets_stats(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_emails(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_emails() RETURNS TABLE(user_id uuid, email text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  SELECT au.id AS user_id, au.email
  FROM auth.users au
  INNER JOIN public.profiles p ON p.id = au.id
  WHERE au.email IS NOT NULL
  ORDER BY p.created_at DESC;
END
$$;


ALTER FUNCTION public.get_user_emails() OWNER TO postgres;

--
-- Name: FUNCTION get_user_emails(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_user_emails() IS 'Récupère les emails des utilisateurs pour la gestion admin. Accessible aux admins seulement.';


--
-- Name: get_user_last_logins(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_last_logins() RETURNS TABLE(user_id uuid, last_login timestamp with time zone, is_online boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: User is not an administrator.';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.last_sign_in_at AS last_login,
    CASE WHEN u.last_sign_in_at > (NOW() - INTERVAL '15 minutes') THEN true ELSE false END AS is_online
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL;
END
$$;


ALTER FUNCTION public.get_user_last_logins() OWNER TO postgres;

--
-- Name: get_user_month_bounds_utc(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_month_bounds_utc(p_user_id uuid) RETURNS TABLE(start_utc timestamp with time zone, end_utc timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tz text;
  v_now_local timestamp;
  v_month_start_local timestamp;
  v_month_end_local   timestamp;
BEGIN
  -- lecture innocente mais on garde la même sémantique (self/admin)
  IF p_user_id IS NOT NULL THEN
    PERFORM public.assert_self_or_admin(p_user_id);
  END IF;

  IF p_user_id IS NULL THEN
    v_tz := 'Europe/Paris';
  ELSE
    SELECT COALESCE(up.timezone, 'Europe/Paris') INTO v_tz
    FROM user_prefs up
    WHERE up.user_id = p_user_id;
    IF v_tz IS NULL THEN v_tz := 'Europe/Paris'; END IF;
  END IF;

  v_now_local := now() AT TIME ZONE v_tz;
  v_month_start_local := date_trunc('month', v_now_local);
  v_month_end_local   := v_month_start_local + interval '1 month';

  start_utc := v_month_start_local AT TIME ZONE v_tz;
  end_utc   := v_month_end_local   AT TIME ZONE v_tz;
  RETURN NEXT;
END
$$;


ALTER FUNCTION public.get_user_month_bounds_utc(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_permissions(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_permissions(user_uuid uuid) RETURNS TABLE(feature_name text, can_access boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  RETURN QUERY
  SELECT
    f.name AS feature_name,
    BOOL_OR(COALESCE(rp.can_access, false)) AS can_access
  FROM features f
  LEFT JOIN role_permissions rp ON f.id = rp.feature_id
  LEFT JOIN user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    AND f.is_active = true
  GROUP BY f.name
  ORDER BY f.name;
END
$$;


ALTER FUNCTION public.get_user_permissions(user_uuid uuid) OWNER TO postgres;

--
-- Name: get_user_primary_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_primary_role(p_user_id uuid) RETURNS TABLE(role_id uuid, role_name text, priority integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);

  RETURN QUERY
  SELECT r.id, r.name, r.priority
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;
END
$$;


ALTER FUNCTION public.get_user_primary_role(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_user_quota_info(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_quota_info(user_uuid uuid, quota_type text, quota_period text DEFAULT 'monthly'::text) RETURNS TABLE(quota_limit integer, current_usage integer, remaining integer, is_limited boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role text;
  v_limit integer;
  v_usage integer;
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  PERFORM public.assert_self_or_admin(user_uuid);

  SELECT r.name INTO user_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = user_uuid AND ur.is_active = true
  LIMIT 1;

  IF user_role IS NULL OR user_role = 'admin' THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = quota_type
    AND rq.quota_period = quota_period;

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  v_usage := 0;

  IF quota_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end FROM public.get_user_month_bounds_utc(user_uuid);

    IF quota_type = 'monthly_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid AND created_at >= v_start AND created_at < v_end;

    ELSIF quota_type = 'monthly_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid AND created_at >= v_start AND created_at < v_end;
    END IF;

  ELSE
    IF quota_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage FROM public.taches WHERE user_id = user_uuid;
    ELSIF quota_type = 'max_rewards' THEN
      SELECT COUNT(*) INTO v_usage FROM public.recompenses WHERE user_id = user_uuid;
    END IF;
  END IF;

  RETURN QUERY SELECT
    v_limit,
    v_usage,
    GREATEST(0, v_limit - v_usage),
    true;
END
$$;


ALTER FUNCTION public.get_user_quota_info(user_uuid uuid, quota_type text, quota_period text) OWNER TO postgres;

--
-- Name: get_user_roles(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_roles(p_user_id uuid) RETURNS TABLE(role_id uuid, role_name text, priority integer, is_active boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);

  RETURN QUERY
  SELECT r.id, r.name, r.priority, ur.is_active
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true
  ORDER BY r.priority DESC;
END
$$;


ALTER FUNCTION public.get_user_roles(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_users_with_roles(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_users_with_roles() RETURNS TABLE(user_id uuid, email text, role_name text, is_active boolean, assigned_at timestamp with time zone, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    au.email,
    r.name as role_name,
    ur.is_active,
    ur.assigned_at,
    ur.expires_at
  FROM profiles p
  INNER JOIN auth.users au ON p.id = au.id
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE ur.is_active = true
    OR ur.is_active IS NULL
  ORDER BY p.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_users_with_roles() OWNER TO postgres;

--
-- Name: FUNCTION get_users_with_roles(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_users_with_roles() IS '✅ Returns all users with their roles - SECURED with search_path';


--
-- Name: get_users_with_roles(integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_users_with_roles(page_num integer DEFAULT 1, page_limit integer DEFAULT 20, role_filter text DEFAULT 'all'::text, status_filter text DEFAULT 'all'::text) RETURNS TABLE(id uuid, email text, pseudo text, created_at timestamp with time zone, last_login timestamp with time zone, account_status text, is_online boolean, user_roles jsonb, total_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  DECLARE
    offset_val INT;
    total BIGINT;
  BEGIN
    offset_val := (page_num - 1) * page_limit;

    -- Compter le total
    SELECT COUNT(DISTINCT p.id) INTO total
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE
      (status_filter = 'all' OR p.account_status = status_filter)
      AND (
        role_filter = 'all'
        OR (role_filter = 'no_roles' AND ur.id IS NULL)
        OR r.name = role_filter
      );

    -- Retourner les résultats avec données de auth.users
    RETURN QUERY
    SELECT
      p.id,
      COALESCE(au.email::TEXT, '') AS email,
      p.pseudo,
      p.created_at,
      au.last_sign_in_at AS last_login,
      p.account_status,
      CASE
        WHEN au.last_sign_in_at > (NOW() - INTERVAL '15 minutes') THEN true
        ELSE false
      END AS is_online,
      COALESCE(
        jsonb_agg(
          CASE
            WHEN ur.id IS NOT NULL THEN
              jsonb_build_object(
                'id', ur.id,
                'role_id', ur.role_id,
                'roles', jsonb_build_object(
                  'id', r.id,
                  'name', r.name,
                  'display_name', r.display_name
                )
              )
            ELSE NULL
          END
        ) FILTER (WHERE ur.id IS NOT NULL),
        '[]'::jsonb
      ) AS user_roles,
      total AS total_count
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE
      (status_filter = 'all' OR p.account_status = status_filter)
      AND (
        role_filter = 'all'
        OR (role_filter = 'no_roles' AND ur.id IS NULL)
        OR r.name = role_filter
      )
    GROUP BY p.id, au.email, p.pseudo, p.created_at, au.last_sign_in_at, p.account_status
    ORDER BY p.created_at DESC
    LIMIT page_limit
    OFFSET offset_val;
  END;
  $$;


ALTER FUNCTION public.get_users_with_roles(page_num integer, page_limit integer, role_filter text, status_filter text) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  free_role_id uuid;
  pseudo_base text;
BEGIN
  pseudo_base := split_part(NEW.email, '@', 1);

  INSERT INTO public.profiles (id, pseudo)
  VALUES (NEW.id, public.generate_unique_pseudo(pseudo_base))
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO free_role_id FROM public.roles WHERE name = 'free' AND is_active = true;

  IF free_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id, is_active, assigned_by, assigned_at)
    VALUES (NEW.id, free_role_id, true, NEW.id, now())
    ON CONFLICT (user_id, role_id)
    DO UPDATE SET is_active = true, assigned_by = NEW.id, assigned_at = now(), updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: handle_subscription_role_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_subscription_role_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_role_free   uuid;
  v_role_abonne uuid;
  v_should_be_abonne boolean;
begin
  select id into v_role_abonne from public.roles where name='abonne' and is_active = true;
  select id into v_role_free   from public.roles where name='free'   and is_active = true;

  -- Abonné si statut Stripe valide ET période non expirée (si présente)
  v_should_be_abonne := (new.status in ('trialing','active','past_due','paused'))
                        and (new.current_period_end is null or new.current_period_end >= now());

  -- Désactiver tous les rôles actifs (respecte uq_user_roles_one_active)
  update public.user_roles
     set is_active = false, updated_at = now()
   where user_id = new.user_id and is_active = true;

  if v_should_be_abonne and v_role_abonne is not null then
    -- Activer 'abonne'
    insert into public.user_roles (user_id, role_id, is_active, assigned_at)
    values (new.user_id, v_role_abonne, true, now())
    on conflict (user_id, role_id) do update
      set is_active = true, updated_at = now();
  else
      -- Variante B : réactiver 'free' (toujours au minimum free)
    if v_role_free is not null then
      insert into public.user_roles (user_id, role_id, is_active, assigned_at)
      values (new.user_id, v_role_free, true, now())
      on conflict (user_id, role_id) do update
        set is_active = true, updated_at = now();
    end if;
  end if;

  return new;
end
$$;


ALTER FUNCTION public.handle_subscription_role_change() OWNER TO postgres;

--
-- Name: FUNCTION handle_subscription_role_change(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_subscription_role_change() IS 'Gère les transitions de rôles lors des changements d''abonnement (free ↔ abonne)';


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and ur.is_active and r.name='admin'
  ) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin);
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_admin() IS 'Retourne true si auth.uid() possède le rôle admin.';


--
-- Name: is_subscriber(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_subscriber(p_user uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.abonnements a
    where a.user_id = p_user
      and a.status in ('trialing','active','past_due','paused')
  );
$$;


ALTER FUNCTION public.is_subscriber(p_user uuid) OWNER TO postgres;

--
-- Name: is_system_role(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_system_role(role_name text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT role_name = ANY (ARRAY['admin', 'visitor', 'free', 'abonne', 'staff'])
$$;


ALTER FUNCTION public.is_system_role(role_name text) OWNER TO postgres;

--
-- Name: FUNCTION is_system_role(role_name text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_system_role(role_name text) IS 'Vérifie si un rôle est un rôle système protégé';


--
-- Name: log_card_creation(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_card_creation(_user uuid, _entity text, _id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if to_regclass('public.card_creation_logs') is not null then
    insert into public.card_creation_logs(user_id, entity, entity_id, created_at)
    values (_user, _entity, _id, now());
  elsif to_regclass('public.image_creation_logs') is not null then
    -- fallback si tu avais déjà une table "image_creation_logs"
    insert into public.image_creation_logs(user_id, kind, card_id, created_at)
    values (_user, _entity, _id, now());
  else
    -- rien d'installé => no-op (ou RAISE NOTICE)
    raise notice 'Aucune table de logs trouvée.';
  end if;
end
$$;


ALTER FUNCTION public.log_card_creation(_user uuid, _entity text, _id uuid) OWNER TO postgres;

--
-- Name: prevent_system_role_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_system_role_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.is_system_role(OLD.name) THEN
    RAISE EXCEPTION 'Deleting a system role (%) is forbidden', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION public.prevent_system_role_delete() OWNER TO postgres;

--
-- Name: prevent_system_role_deletion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_system_role_deletion() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF OLD.is_active = false AND public.is_system_role(OLD.name) THEN
    -- Permettre la désactivation des rôles système
    RETURN NEW;
  END IF;
  
  -- Pour les autres cas, laisser passer
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_system_role_deletion() OWNER TO postgres;

--
-- Name: FUNCTION prevent_system_role_deletion(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.prevent_system_role_deletion() IS 'Empêche la suppression accidentelle des rôles système';


--
-- Name: purge_old_consentements(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.purge_old_consentements(retention_months integer DEFAULT 25) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE='42501';
  END IF;

  DELETE FROM public.consentements
  WHERE ts < (now() - make_interval(months => retention_months));
END
$$;


ALTER FUNCTION public.purge_old_consentements(retention_months integer) OWNER TO postgres;

--
-- Name: recompenses_counter_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recompenses_counter_del() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(old.user_id, auth.uid()), 'rewards', -1);
  return old;
end;
$$;


ALTER FUNCTION public.recompenses_counter_del() OWNER TO postgres;

--
-- Name: recompenses_counter_ins(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recompenses_counter_ins() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'rewards', 1);
  return new;
end;
$$;


ALTER FUNCTION public.recompenses_counter_ins() OWNER TO postgres;

--
-- Name: rewards_counter_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rewards_counter_del() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  perform public.bump_usage_counter(old.user_id, 'rewards', -1);
  return old;
end $$;


ALTER FUNCTION public.rewards_counter_del() OWNER TO postgres;

--
-- Name: rewards_counter_ins(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rewards_counter_ins() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  perform public.bump_usage_counter(new.user_id, 'rewards', 1);
  return new;
end $$;


ALTER FUNCTION public.rewards_counter_ins() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: recompenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recompenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    description text,
    points_requis integer DEFAULT 0 NOT NULL,
    icone text,
    couleur text,
    imagepath text,
    selected boolean DEFAULT false NOT NULL,
    visible_en_demo boolean DEFAULT false NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recompenses_description_length_check CHECK (((description IS NULL) OR (length(description) <= 1000))),
    CONSTRAINT recompenses_imagepath_length_check CHECK (((imagepath IS NULL) OR (length(imagepath) <= 2048))),
    CONSTRAINT recompenses_label_length_check CHECK ((length(label) <= 200)),
    CONSTRAINT recompenses_label_not_blank CHECK (((label IS NOT NULL) AND (btrim(label) <> ''::text))),
    CONSTRAINT recompenses_points_requis_positive CHECK ((points_requis >= 0))
);

ALTER TABLE ONLY public.recompenses FORCE ROW LEVEL SECURITY;


ALTER TABLE public.recompenses OWNER TO postgres;

--
-- Name: TABLE recompenses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.recompenses IS 'Récompenses des utilisateurs avec système de points';


--
-- Name: COLUMN recompenses.label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.label IS 'Nom de la récompense affiché';


--
-- Name: COLUMN recompenses.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.description IS 'Description détaillée de la récompense';


--
-- Name: COLUMN recompenses.points_requis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.points_requis IS 'Points nécessaires pour débloquer cette récompense';


--
-- Name: COLUMN recompenses.icone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.icone IS 'Icône de la récompense';


--
-- Name: COLUMN recompenses.couleur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.couleur IS 'Couleur de la récompense';


--
-- Name: COLUMN recompenses.imagepath; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.imagepath IS 'Chemin de l''image associée';


--
-- Name: COLUMN recompenses.selected; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.selected IS 'Récompense sélectionnée par l''utilisateur';


--
-- Name: COLUMN recompenses.visible_en_demo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.visible_en_demo IS 'Si true, cette récompense sera visible en mode démo pour tous les visiteurs';


--
-- Name: COLUMN recompenses.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.user_id IS 'Propriétaire de la récompense';


--
-- Name: select_recompense_atomic(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.select_recompense_atomic(p_reward_id uuid) RETURNS SETOF public.recompenses
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  DECLARE
    v_user_id uuid;
  BEGIN
    -- Récupérer l'utilisateur courant
    v_user_id := auth.uid();

    -- Vérifier que l'utilisateur est connecté
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Utilisateur non connecté' USING ERRCODE = '42501';
    END IF;

    -- Vérifier que la récompense existe et appartient à l'utilisateur
    PERFORM 1
    FROM public.recompenses
    WHERE id = p_reward_id
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Récompense introuvable ou non autorisée' USING ERRCODE = '42501';
    END IF;

    -- 1️⃣ Désélectionner TOUTES les récompenses de l'utilisateur
    UPDATE public.recompenses
    SET selected = false,
        updated_at = now()
    WHERE user_id = v_user_id
      AND selected = true;

    -- 2️⃣ Sélectionner la récompense demandée
    UPDATE public.recompenses
    SET selected = true,
        updated_at = now()
    WHERE id = p_reward_id
      AND user_id = v_user_id;

    -- 3️⃣ Retourner la récompense sélectionnée
    RETURN QUERY
    SELECT r.*
    FROM public.recompenses r
    WHERE r.id = p_reward_id;
  END;
  $$;


ALTER FUNCTION public.select_recompense_atomic(p_reward_id uuid) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: taches_counter_del(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.taches_counter_del() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(old.user_id, 'tasks', -1);
  return old;
end $$;


ALTER FUNCTION public.taches_counter_del() OWNER TO postgres;

--
-- Name: taches_counter_ins(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.taches_counter_ins() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'tasks', 1);
  return new;
end;
$$;


ALTER FUNCTION public.taches_counter_ins() OWNER TO postgres;

--
-- Name: tg_audit_permission_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_audit_permission_change() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_old jsonb;
  v_new jsonb;
  v_rec_id uuid;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_old := null;
    v_rec_id := coalesce(new.id, gen_random_uuid());
    insert into public.permission_changes
      (change_type, table_name, record_id, old_values, new_values, changed_by, created_at, changed_at)
    values
      ('INSERT', tg_table_name, v_rec_id, v_old, v_new, auth.uid(), now(), now());
    return new;

  elsif tg_op = 'UPDATE' then
    v_new := to_jsonb(new);
    v_old := to_jsonb(old);
    v_rec_id := coalesce(new.id, old.id, gen_random_uuid());
    insert into public.permission_changes
      (change_type, table_name, record_id, old_values, new_values, changed_by, created_at, changed_at)
    values
      ('UPDATE', tg_table_name, v_rec_id, v_old, v_new, auth.uid(), now(), now());
    return new;

  elsif tg_op = 'DELETE' then
    v_new := null;
    v_old := to_jsonb(old);
    v_rec_id := coalesce(old.id, gen_random_uuid());
    insert into public.permission_changes
      (change_type, table_name, record_id, old_values, new_values, changed_by, created_at, changed_at)
    values
      ('DELETE', tg_table_name, v_rec_id, v_old, v_new, auth.uid(), now(), now());
    return old;
  end if;

  return null;
end
$$;


ALTER FUNCTION public.tg_audit_permission_change() OWNER TO postgres;

--
-- Name: tg_categories_fill_value(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_categories_fill_value() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $_$
declare
  v text;
begin
  if new.value is null or btrim(new.value) = '' then
    -- 1) passe en minuscule
    v := lower(coalesce(new.label, ''));
    -- 2) remplace tout ce qui n'est pas [a-z0-9] par "_"
    v := regexp_replace(v, '[^a-z0-9]+', '_', 'g');
    -- 3) retire "_" au début/fin
    v := regexp_replace(v, '^_+|_+$', '', 'g');
    if v = '' then
      v := 'cat_' || substring(md5(random()::text) for 8);
    end if;
    new.value := v;
  end if;
  return new;
end;
$_$;


ALTER FUNCTION public.tg_categories_fill_value() OWNER TO postgres;

--
-- Name: tg_categories_set_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_categories_set_user_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tg_categories_set_user_id() OWNER TO postgres;

--
-- Name: tg_on_auth_user_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_on_auth_user_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_role_free uuid;
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  select id into v_role_free from public.roles where name='free' and is_active = true;

  if v_role_free is not null then
    insert into public.user_roles (user_id, role_id, is_active, assigned_at)
    values (new.id, v_role_free, true, now())
    on conflict (user_id, role_id) do update
      set is_active = true, updated_at = now();
  end if;

  return new;
end
$$;


ALTER FUNCTION public.tg_on_auth_user_created() OWNER TO postgres;

--
-- Name: tg_parametres_lock_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_parametres_lock_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if new.id is distinct from old.id then
    raise exception 'Column "id" is immutable on table "parametres"';
  end if;
  return new;
end$$;


ALTER FUNCTION public.tg_parametres_lock_id() OWNER TO postgres;

--
-- Name: tg_permission_changes_validate_json(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_permission_changes_validate_json() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  if new.old_values is not null and jsonb_typeof(new.old_values) <> 'object' then
    raise exception 'old_values must be a JSON object';
  end if;
  if new.new_values is not null and jsonb_typeof(new.new_values) <> 'object' then
    raise exception 'new_values must be a JSON object';
  end if;
  if new.change_type not in ('INSERT','UPDATE','DELETE') then
    raise exception 'Invalid change_type: %', new.change_type;
  end if;
  return new;
end
$$;


ALTER FUNCTION public.tg_permission_changes_validate_json() OWNER TO postgres;

--
-- Name: tg_recompenses_normalize(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_recompenses_normalize() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
begin
  if new.label is not null then
    new.label := nullif(btrim(new.label), '');
  end if;
  if new.description is not null then
    new.description := nullif(btrim(new.description), '');
  end if;
  return new;
end$$;


ALTER FUNCTION public.tg_recompenses_normalize() OWNER TO postgres;

--
-- Name: tg_recompenses_set_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_recompenses_set_user_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tg_recompenses_set_user_id() OWNER TO postgres;

--
-- Name: tg_taches_log_neutral(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_taches_log_neutral() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- on log uniquement à la création de carte (INSERT)
  perform public.log_card_creation(new.user_id, 'tache', new.id);
  return new;
end
$$;


ALTER FUNCTION public.tg_taches_log_neutral() OWNER TO postgres;

--
-- Name: tg_taches_normalize_categorie(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_taches_normalize_categorie() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.categorie IS NOT NULL THEN
    NEW.categorie := regexp_replace(lower(trim(NEW.categorie)), '\s+', '-', 'g');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.tg_taches_normalize_categorie() OWNER TO postgres;

--
-- Name: tg_taches_set_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_taches_set_user_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.tg_taches_set_user_id() OWNER TO postgres;

--
-- Name: tg_taches_sync_categorie(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.tg_taches_sync_categorie() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_norm text;
  v_desired_id uuid;
BEGIN
  -- 0) Normalisation défensive au cas où l'autre trigger n'ait pas tourné
  IF NEW.categorie IS NOT NULL THEN
    v_norm := regexp_replace(lower(trim(NEW.categorie)), '\s+', '-', 'g');
    NEW.categorie := v_norm;
  END IF;

  -- 1) Cas INSERT : si categorie_id fourni par l'appelant, on ne touche pas (compat)
  IF TG_OP = 'INSERT' THEN
    IF NEW.categorie_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 2) Déterminer la categorie désirée (proprio d'abord, sinon globale)
  IF NEW.categorie IS NOT NULL THEN
    -- Propriétaire
    SELECT id INTO v_desired_id
    FROM public.categories
    WHERE value = NEW.categorie
      AND user_id = NEW.user_id
    LIMIT 1;

    -- Globale en fallback
    IF v_desired_id IS NULL THEN
      SELECT id INTO v_desired_id
      FROM public.categories
      WHERE value = NEW.categorie
        AND user_id IS NULL
      LIMIT 1;
    END IF;
  END IF;

  -- 3) En UPDATE, même si categorie_id est déjà renseigné,
  --    on préfère la propriétaire si elle existe maintenant.
  --    En INSERT, on remplit si absent.
  IF v_desired_id IS NOT NULL THEN
    IF NEW.categorie_id IS DISTINCT FROM v_desired_id THEN
      NEW.categorie_id := v_desired_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.tg_taches_sync_categorie() OWNER TO postgres;

--
-- Name: user_can_upload_avatar(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_can_upload_avatar(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select count(*) <= 1
  from storage.objects
  where bucket_id = 'avatars'
    and name like uid::text || '/%'
$$;


ALTER FUNCTION public.user_can_upload_avatar(uid uuid) OWNER TO postgres;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
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


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
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


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
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


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) OWNER TO supabase_storage_admin;

--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.objects_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.objects_update_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.objects_update_level_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION storage.prefixes_delete_cleanup() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
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


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
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


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

--
-- Name: abonnements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abonnements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_subscription_id text,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_data jsonb,
    last_event_id text,
    stripe_customer text,
    plan text,
    price_id text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    cancel_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    latest_invoice text,
    CONSTRAINT abonnements_period_chk CHECK (((current_period_start IS NULL) OR (current_period_end IS NULL) OR (current_period_end >= current_period_start))),
    CONSTRAINT abonnements_status_check CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'unpaid'::text, 'paused'::text])))
);


ALTER TABLE public.abonnements OWNER TO postgres;

--
-- Name: TABLE abonnements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.abonnements IS 'Abonnements Stripe synchronisés';


--
-- Name: COLUMN abonnements.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.abonnements.status IS 'Statut de l''abonnement Stripe';


--
-- Name: COLUMN abonnements.raw_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.abonnements.raw_data IS 'Données brutes Stripe (webhooks)';


--
-- Name: account_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    old_status text,
    new_status text,
    old_role text,
    new_role text,
    changed_by uuid,
    reason text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.account_audit_logs OWNER TO postgres;

--
-- Name: TABLE account_audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.account_audit_logs IS 'Logs d''audit pour tracer les changements d''état et de rôle des comptes';


--
-- Name: COLUMN account_audit_logs.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.account_audit_logs.action IS 'Type d''action: status_change, role_change, quota_change, etc.';


--
-- Name: COLUMN account_audit_logs.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.account_audit_logs.metadata IS 'Données supplémentaires au format JSON';


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value text NOT NULL,
    label text NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT categories_label_length_check CHECK ((length(label) <= 64)),
    CONSTRAINT categories_value_length_check CHECK ((length(value) <= 64)),
    CONSTRAINT categories_value_slug_check CHECK ((value ~ '^[a-z0-9_-]+$'::text))
);

ALTER TABLE ONLY public.categories FORCE ROW LEVEL SECURITY;


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.categories IS 'Catégories personnalisées (NULL=globales).';


--
-- Name: COLUMN categories.value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.categories.value IS 'Slug (a-z0-9_-).';


--
-- Name: COLUMN categories.label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.categories.label IS 'Libellé affiché.';


--
-- Name: consentements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consentements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type_consentement text NOT NULL,
    donnees text,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    mode text DEFAULT 'refuse_all'::text NOT NULL,
    choices jsonb DEFAULT '{}'::jsonb NOT NULL,
    action text,
    ua text,
    locale text,
    app_version text,
    ip_hash text,
    origin text,
    ts_client timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    version text DEFAULT '1.0.0'::text NOT NULL,
    CONSTRAINT consentements_action_check CHECK (((action IS NULL) OR (action = ANY (ARRAY['first_load'::text, 'update'::text, 'withdraw'::text, 'restore'::text])))),
    CONSTRAINT consentements_choices_is_object CHECK ((jsonb_typeof(choices) = 'object'::text)),
    CONSTRAINT consentements_ip_hash_len CHECK (((ip_hash IS NULL) OR ((length(ip_hash) >= 32) AND (length(ip_hash) <= 128)))),
    CONSTRAINT consentements_mode_check CHECK ((mode = ANY (ARRAY['accept_all'::text, 'refuse_all'::text, 'custom'::text])))
);


ALTER TABLE public.consentements OWNER TO postgres;

--
-- Name: TABLE consentements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.consentements IS 'Journal immuable des consentements (RGPD). user_id NULL pour visiteurs.';


--
-- Name: consentements_latest; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.consentements_latest WITH (security_invoker='true') AS
 WITH base AS (
         SELECT consentements.id,
            consentements.user_id,
            consentements.version,
            consentements.mode,
            consentements.choices,
            consentements.action,
            consentements.ua,
            consentements.locale,
            consentements.app_version,
            consentements.ip_hash,
            consentements.origin,
            consentements.ts_client,
            consentements.created_at,
            consentements.ts,
            COALESCE(consentements.ts, consentements.ts_client, consentements.created_at) AS effective_ts
           FROM public.consentements
          WHERE (consentements.user_id IS NOT NULL)
        )
 SELECT DISTINCT ON (user_id) id,
    user_id,
    version,
    mode,
    choices,
    action,
    ua,
    locale,
    app_version,
    ip_hash,
    origin,
    ts_client,
    created_at,
    ts,
    effective_ts
   FROM base
  ORDER BY user_id, effective_ts DESC;


ALTER VIEW public.consentements_latest OWNER TO postgres;

--
-- Name: VIEW consentements_latest; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.consentements_latest IS 'Dernier consentement par utilisateur (ts > ts_client > created_at).';


--
-- Name: demo_cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demo_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_type text NOT NULL,
    label text NOT NULL,
    imagepath text,
    "position" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT demo_cards_card_type_check CHECK ((card_type = ANY (ARRAY['task'::text, 'reward'::text])))
);


ALTER TABLE public.demo_cards OWNER TO postgres;

--
-- Name: TABLE demo_cards; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.demo_cards IS 'Cartes prédéfinies pour la démonstration aux visiteurs non connectés';


--
-- Name: COLUMN demo_cards.card_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.demo_cards.card_type IS 'Type de carte: task (tâche) ou reward (récompense)';


--
-- Name: COLUMN demo_cards."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.demo_cards."position" IS 'Ordre d''affichage des cartes';


--
-- Name: COLUMN demo_cards.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.demo_cards.is_active IS 'Si true, la carte est visible pour les visiteurs';


--
-- Name: features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text NOT NULL,
    category text,
    CONSTRAINT features_category_chk CHECK ((category = ANY (ARRAY['affichage'::text, 'gestion'::text, 'systeme'::text, 'securite'::text])))
);


ALTER TABLE public.features OWNER TO postgres;

--
-- Name: image_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_type text NOT NULL,
    original_size bigint NOT NULL,
    compressed_size bigint NOT NULL,
    compression_ratio numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (original_size > 0) THEN round((((1)::numeric - ((compressed_size)::numeric / (original_size)::numeric)) * (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    conversion_ms integer,
    upload_ms integer,
    result text NOT NULL,
    error_message text,
    mime_type_original text,
    mime_type_final text,
    conversion_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT image_metrics_asset_type_check CHECK ((asset_type = ANY (ARRAY['task_image'::text, 'reward_image'::text]))),
    CONSTRAINT image_metrics_compressed_size_check CHECK ((compressed_size >= 0)),
    CONSTRAINT image_metrics_conversion_method_check CHECK ((conversion_method = ANY (ARRAY['client_webp'::text, 'heic_to_jpeg_then_webp'::text, 'heic_to_jpeg_only'::text, 'none'::text, 'svg_unchanged'::text, 'fallback_original'::text]))),
    CONSTRAINT image_metrics_conversion_ms_check CHECK ((conversion_ms >= 0)),
    CONSTRAINT image_metrics_original_size_check CHECK ((original_size >= 0)),
    CONSTRAINT image_metrics_result_check CHECK ((result = ANY (ARRAY['success'::text, 'failed'::text, 'fallback_original'::text]))),
    CONSTRAINT image_metrics_upload_ms_check CHECK ((upload_ms >= 0))
);


ALTER TABLE public.image_metrics OWNER TO postgres;

--
-- Name: TABLE image_metrics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.image_metrics IS 'Métriques uploads images : compression ratio, performance, erreurs (analytics).';


--
-- Name: COLUMN image_metrics.compression_ratio; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.image_metrics.compression_ratio IS 'Ratio compression en % (calculé automatiquement). Ex: 75.50 = 75.5% de réduction.';


--
-- Name: COLUMN image_metrics.result; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.image_metrics.result IS 'Résultat upload : success (réussi), failed (échoué), fallback_original (original accepté).';


--
-- Name: COLUMN image_metrics.conversion_method; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.image_metrics.conversion_method IS 'Méthode conversion utilisée : client_webp (direct), heic_to_jpeg_then_webp (iPhone), etc.';


--
-- Name: parametres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parametres (
    id integer DEFAULT 1 NOT NULL,
    confettis boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    toasts_enabled boolean DEFAULT true,
    CONSTRAINT parametres_id_is_one CHECK ((id = 1))
);

ALTER TABLE ONLY public.parametres FORCE ROW LEVEL SECURITY;


ALTER TABLE public.parametres OWNER TO postgres;

--
-- Name: TABLE parametres; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.parametres IS 'Paramètres globaux de l''application';


--
-- Name: COLUMN parametres.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.parametres.id IS 'ID unique (toujours 1 pour les paramètres globaux)';


--
-- Name: COLUMN parametres.confettis; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.parametres.confettis IS 'Contrôle l''affichage des confettis lors de la complétion des tâches';


--
-- Name: COLUMN parametres.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.parametres.created_at IS 'Date de création du paramètre';


--
-- Name: COLUMN parametres.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.parametres.updated_at IS 'Date de dernière modification du paramètre';


--
-- Name: permission_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permission_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    changed_by uuid,
    change_type text NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    old_values jsonb,
    new_values jsonb,
    change_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT permission_changes_change_reason_length_check CHECK (((change_reason IS NULL) OR (length(change_reason) <= 500))),
    CONSTRAINT permission_changes_change_type_check CHECK ((change_type = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))),
    CONSTRAINT permission_changes_record_id_not_null CHECK ((record_id IS NOT NULL)),
    CONSTRAINT permission_changes_table_name_not_blank CHECK (((table_name IS NOT NULL) AND (btrim(table_name) <> ''::text)))
);

ALTER TABLE ONLY public.permission_changes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.permission_changes OWNER TO postgres;

--
-- Name: TABLE permission_changes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.permission_changes IS 'Audit trail des modifications de permissions et rôles';


--
-- Name: COLUMN permission_changes.changed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.changed_by IS 'Utilisateur qui a effectué le changement (peut être NULL pour les actions système)';


--
-- Name: COLUMN permission_changes.change_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.change_type IS 'Type de changement: INSERT, UPDATE, DELETE';


--
-- Name: COLUMN permission_changes.table_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.table_name IS 'Nom de la table modifiée';


--
-- Name: COLUMN permission_changes.record_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.record_id IS 'ID de l''enregistrement modifié';


--
-- Name: COLUMN permission_changes.old_values; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.old_values IS 'Anciennes valeurs (JSON)';


--
-- Name: COLUMN permission_changes.new_values; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.new_values IS 'Nouvelles valeurs (JSON)';


--
-- Name: COLUMN permission_changes.change_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.permission_changes.change_reason IS 'Raison du changement (optionnel)';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    pseudo text,
    avatar_url text,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date_naissance date,
    ville text,
    account_status text DEFAULT 'active'::text NOT NULL,
    deletion_scheduled_at timestamp with time zone,
    CONSTRAINT profiles_account_status_check CHECK ((account_status = ANY (ARRAY['active'::text, 'suspended'::text, 'deletion_scheduled'::text, 'pending_verification'::text]))),
    CONSTRAINT profiles_birthdate_chk CHECK (((date_naissance IS NULL) OR (date_naissance <= CURRENT_DATE)))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.account_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.account_status IS 'État du compte utilisateur: active, suspended, deletion_scheduled, pending_verification';


--
-- Name: COLUMN profiles.deletion_scheduled_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.deletion_scheduled_at IS 'Date de suppression programmée pour les comptes en état deletion_scheduled (30 jours après la demande)';


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    can_access boolean DEFAULT false NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: COLUMN roles.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.roles.is_active IS 'Indique si le rôle est actif et disponible pour attribution';


--
-- Name: role_permissions_admin_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.role_permissions_admin_view WITH (security_invoker='true') AS
 SELECT rp.id,
    rp.role_id,
    rp.feature_id,
    rp.can_access,
    rp.created_at,
    rp.updated_at,
    r.name AS role_name,
    r.display_name AS role_display_name,
    f.name AS feature_name,
    f.display_name AS feature_display_name,
    f.category
   FROM ((public.role_permissions rp
     JOIN public.roles r ON ((r.id = rp.role_id)))
     JOIN public.features f ON ((f.id = rp.feature_id)));


ALTER VIEW public.role_permissions_admin_view OWNER TO postgres;

--
-- Name: role_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_quotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    quota_type text NOT NULL,
    quota_limit integer NOT NULL,
    quota_period text DEFAULT 'monthly'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT role_quotas_quota_period_check CHECK ((quota_period = ANY (ARRAY['monthly'::text, 'total'::text, 'daily'::text])))
);


ALTER TABLE public.role_quotas OWNER TO postgres;

--
-- Name: role_quotas_backup_legacy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_quotas_backup_legacy (
    id uuid NOT NULL,
    role_id uuid,
    quota_type text,
    quota_limit integer,
    quota_period text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.role_quotas_backup_legacy OWNER TO postgres;

--
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    ligne text NOT NULL,
    ordre integer NOT NULL,
    type public.transport_type DEFAULT 'metro'::public.transport_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stations_label_length_check CHECK ((length(label) <= 150)),
    CONSTRAINT stations_label_not_blank CHECK (((label IS NOT NULL) AND (btrim(label) <> ''::text))),
    CONSTRAINT stations_ligne_format_check CHECK ((ligne ~ '^[0-9]+(\s+(bis|ter))?$'::text)),
    CONSTRAINT stations_ligne_length_check CHECK ((length(ligne) <= 20)),
    CONSTRAINT stations_ligne_not_blank CHECK (((ligne IS NOT NULL) AND (btrim(ligne) <> ''::text))),
    CONSTRAINT stations_ordre_max_check CHECK ((ordre <= 50)),
    CONSTRAINT stations_ordre_positive CHECK ((ordre > 0))
);

ALTER TABLE ONLY public.stations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.stations OWNER TO postgres;

--
-- Name: TABLE stations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stations IS 'Stations de transport public (métro, tram, RER, bus)';


--
-- Name: COLUMN stations.label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stations.label IS 'Nom de la station affiché';


--
-- Name: COLUMN stations.ligne; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stations.ligne IS 'Ligne de transport (ex: "1", "A", "T1")';


--
-- Name: COLUMN stations.ordre; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stations.ordre IS 'Ordre de la station sur la ligne (pour tri)';


--
-- Name: COLUMN stations.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stations.type IS 'Type de transport (metro, tram, rer, bus)';


--
-- Name: subscription_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    details jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscription_logs OWNER TO postgres;

--
-- Name: taches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    description text,
    categorie text,
    categorie_id uuid,
    points integer DEFAULT 0 NOT NULL,
    icone text,
    couleur text,
    aujourdhui boolean DEFAULT false NOT NULL,
    fait boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    imagepath text,
    visible_en_demo boolean DEFAULT false NOT NULL,
    user_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT taches_description_length_check CHECK ((length(description) <= 1000)),
    CONSTRAINT taches_label_length_check CHECK ((length(label) <= 200)),
    CONSTRAINT taches_label_not_blank CHECK (((label IS NOT NULL) AND (btrim(label) <> ''::text))),
    CONSTRAINT taches_points_positive CHECK ((points >= 0)),
    CONSTRAINT taches_position_positive CHECK (("position" >= 0))
);

ALTER TABLE ONLY public.taches FORCE ROW LEVEL SECURITY;


ALTER TABLE public.taches OWNER TO postgres;

--
-- Name: TABLE taches; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.taches IS 'Tâches des utilisateurs avec système de récompenses';


--
-- Name: COLUMN taches.label; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.label IS 'Nom de la tâche affiché';


--
-- Name: COLUMN taches.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.description IS 'Description détaillée de la tâche';


--
-- Name: COLUMN taches.categorie; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.categorie IS 'Catégorie de la tâche (compatible avec l''ancien code)';


--
-- Name: COLUMN taches.categorie_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.categorie_id IS 'FK vers la table categories (nouveau système)';


--
-- Name: COLUMN taches.points; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.points IS 'Points de récompense pour cette tâche';


--
-- Name: COLUMN taches.icone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.icone IS 'Icône de la tâche';


--
-- Name: COLUMN taches.couleur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.couleur IS 'Couleur de la tâche';


--
-- Name: COLUMN taches.aujourdhui; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.aujourdhui IS 'Tâche du jour (filtrage useTachesDnd)';


--
-- Name: COLUMN taches.fait; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.fait IS 'Tâche terminée (toggle dans useTaches)';


--
-- Name: COLUMN taches."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches."position" IS 'Ordre d''affichage (tri dans useTaches)';


--
-- Name: COLUMN taches.imagepath; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.imagepath IS 'Chemin de l''image associée';


--
-- Name: COLUMN taches.visible_en_demo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.visible_en_demo IS 'Si true, cette tâche sera visible en mode démo pour tous les visiteurs';


--
-- Name: COLUMN taches.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.user_id IS 'Propriétaire de la tâche';


--
-- Name: user_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_type text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text,
    dimensions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    sha256_hash text,
    width integer,
    height integer,
    deleted_at timestamp with time zone,
    migrated_at timestamp with time zone,
    CONSTRAINT user_assets_asset_type_check CHECK ((asset_type = ANY (ARRAY['task_image'::text, 'reward_image'::text]))),
    CONSTRAINT user_assets_file_size_nonneg CHECK ((file_size >= 0))
);


ALTER TABLE public.user_assets OWNER TO postgres;

--
-- Name: COLUMN user_assets.version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.version IS 'Version de l''image (incrémenté à chaque remplacement). Permet historique et rollback.';


--
-- Name: COLUMN user_assets.sha256_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.sha256_hash IS 'Hash SHA-256 du fichier pour déduplication. Évite uploads identiques (économie storage).';


--
-- Name: COLUMN user_assets.width; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.width IS 'Largeur image en pixels (extrait après upload). NULL si extraction échoue.';


--
-- Name: COLUMN user_assets.height; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.height IS 'Hauteur image en pixels (extrait après upload). NULL si extraction échoue.';


--
-- Name: COLUMN user_assets.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.deleted_at IS 'Soft delete timestamp. NULL = actif, NOT NULL = supprimé (conservé 90 jours).';


--
-- Name: COLUMN user_assets.migrated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_assets.migrated_at IS 'Date migration vers nouveau système. NULL = ancien système, NOT NULL = migré.';


--
-- Name: user_prefs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_prefs (
    user_id uuid NOT NULL,
    timezone text DEFAULT 'Europe/Paris'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_prefs OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_usage_counters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_usage_counters (
    user_id uuid NOT NULL,
    tasks integer DEFAULT 0 NOT NULL,
    rewards integer DEFAULT 0 NOT NULL,
    categories integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_usage_counters OWNER TO postgres;

--
-- Name: v_role_quota_matrix; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_role_quota_matrix WITH (security_invoker='true') AS
 SELECT r.name AS role_name,
    rq.quota_type,
    rq.quota_period,
    rq.quota_limit
   FROM (public.role_quotas rq
     JOIN public.roles r ON ((r.id = rq.role_id)))
  ORDER BY r.name, rq.quota_type, rq.quota_period;


ALTER VIEW public.v_role_quota_matrix OWNER TO postgres;

--
-- Name: v_user_storage_usage; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_user_storage_usage WITH (security_invoker='true') AS
 SELECT user_id,
    (count(*))::integer AS files_count,
    (COALESCE(sum(file_size), (0)::numeric))::bigint AS bytes_total,
    max(created_at) AS last_upload_at
   FROM public.user_assets ua
  GROUP BY user_id;


ALTER VIEW public.v_user_storage_usage OWNER TO postgres;

--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: abonnements abonnements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonnements
    ADD CONSTRAINT abonnements_pkey PRIMARY KEY (id);


--
-- Name: abonnements abonnements_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonnements
    ADD CONSTRAINT abonnements_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: account_audit_logs account_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_audit_logs
    ADD CONSTRAINT account_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: consentements consentements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consentements
    ADD CONSTRAINT consentements_pkey PRIMARY KEY (id);


--
-- Name: demo_cards demo_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_cards
    ADD CONSTRAINT demo_cards_pkey PRIMARY KEY (id);


--
-- Name: features features_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_name_key UNIQUE (name);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: image_metrics image_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_metrics
    ADD CONSTRAINT image_metrics_pkey PRIMARY KEY (id);


--
-- Name: parametres parametres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametres
    ADD CONSTRAINT parametres_pkey PRIMARY KEY (id);


--
-- Name: permission_changes permission_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_changes
    ADD CONSTRAINT permission_changes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pseudo_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pseudo_unique UNIQUE (pseudo);


--
-- Name: recompenses recompenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recompenses
    ADD CONSTRAINT recompenses_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_feature_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_feature_id_key UNIQUE (role_id, feature_id);


--
-- Name: role_quotas_backup_legacy role_quotas_backup_legacy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_quotas_backup_legacy
    ADD CONSTRAINT role_quotas_backup_legacy_pkey PRIMARY KEY (id);


--
-- Name: role_quotas role_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_quotas
    ADD CONSTRAINT role_quotas_pkey PRIMARY KEY (id);


--
-- Name: role_quotas role_quotas_role_id_quota_type_quota_period_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_quotas
    ADD CONSTRAINT role_quotas_role_id_quota_type_quota_period_key UNIQUE (role_id, quota_type, quota_period);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: stations stations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT stations_pkey PRIMARY KEY (id);


--
-- Name: subscription_logs subscription_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_pkey PRIMARY KEY (id);


--
-- Name: taches taches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taches
    ADD CONSTRAINT taches_pkey PRIMARY KEY (id);


--
-- Name: user_assets unique_user_file_path; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_assets
    ADD CONSTRAINT unique_user_file_path UNIQUE (user_id, file_path);


--
-- Name: user_assets user_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_assets
    ADD CONSTRAINT user_assets_pkey PRIMARY KEY (id);


--
-- Name: user_prefs user_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_prefs
    ADD CONSTRAINT user_prefs_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: user_usage_counters user_usage_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_usage_counters
    ADD CONSTRAINT user_usage_counters_pkey PRIMARY KEY (user_id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: abonnements_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_active_idx ON public.abonnements USING btree (user_id) WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text]));


--
-- Name: abonnements_active_user_created_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_active_user_created_desc_idx ON public.abonnements USING btree (user_id, created_at DESC) WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text]));


--
-- Name: abonnements_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_status_idx ON public.abonnements USING btree (status);


--
-- Name: abonnements_stripe_subscription_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_stripe_subscription_id_idx ON public.abonnements USING btree (stripe_subscription_id);


--
-- Name: abonnements_unique_active_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX abonnements_unique_active_per_user ON public.abonnements USING btree (user_id) WHERE (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'paused'::text]));


--
-- Name: abonnements_user_created_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_user_created_desc_idx ON public.abonnements USING btree (user_id, created_at DESC);


--
-- Name: account_audit_logs_user_created_desc_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_audit_logs_user_created_desc_idx ON public.account_audit_logs USING btree (user_id, created_at DESC);


--
-- Name: categories_global_value_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_global_value_unique ON public.categories USING btree (value) WHERE (user_id IS NULL);


--
-- Name: categories_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_user_id_idx ON public.categories USING btree (user_id);


--
-- Name: categories_user_value_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_user_value_unique ON public.categories USING btree (user_id, value) WHERE (user_id IS NOT NULL);


--
-- Name: consentements_origin_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consentements_origin_created_idx ON public.consentements USING btree (origin, created_at DESC);


--
-- Name: consentements_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consentements_user_created_idx ON public.consentements USING btree (user_id, created_at DESC);


--
-- Name: idx_abonnements_stripe_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_abonnements_stripe_customer ON public.abonnements USING btree (stripe_customer);


--
-- Name: idx_abonnements_user_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_abonnements_user_status_created ON public.abonnements USING btree (user_id, status, created_at DESC);


--
-- Name: idx_abos_last_event_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_abos_last_event_id_unique ON public.abonnements USING btree (last_event_id) WHERE (last_event_id IS NOT NULL);


--
-- Name: idx_account_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_audit_logs_action ON public.account_audit_logs USING btree (action);


--
-- Name: idx_account_audit_logs_changed_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_audit_logs_changed_by ON public.account_audit_logs USING btree (changed_by);


--
-- Name: idx_account_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_audit_logs_created_at ON public.account_audit_logs USING btree (created_at DESC);


--
-- Name: idx_account_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_account_audit_logs_user_id ON public.account_audit_logs USING btree (user_id);


--
-- Name: idx_categories_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_user_created ON public.categories USING btree (user_id, created_at);


--
-- Name: idx_consentements_user_ts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consentements_user_ts ON public.consentements USING btree (user_id, ts);


--
-- Name: idx_demo_cards_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demo_cards_position ON public.demo_cards USING btree ("position");


--
-- Name: idx_features_active_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_features_active_category ON public.features USING btree (is_active, category);


--
-- Name: idx_image_metrics_asset_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_metrics_asset_type ON public.image_metrics USING btree (asset_type);


--
-- Name: idx_image_metrics_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_metrics_date ON public.image_metrics USING btree (created_at DESC);


--
-- Name: idx_image_metrics_result; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_metrics_result ON public.image_metrics USING btree (result);


--
-- Name: idx_image_metrics_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_image_metrics_user ON public.image_metrics USING btree (user_id);


--
-- Name: idx_profiles_account_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_account_status ON public.profiles USING btree (account_status);


--
-- Name: idx_profiles_deletion_scheduled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_deletion_scheduled ON public.profiles USING btree (deletion_scheduled_at) WHERE (account_status = 'deletion_scheduled'::text);


--
-- Name: idx_profiles_is_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_is_admin ON public.profiles USING btree (is_admin);


--
-- Name: idx_profiles_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_updated_at ON public.profiles USING btree (updated_at DESC);


--
-- Name: idx_recompenses_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recompenses_user_created ON public.recompenses USING btree (user_id, created_at);


--
-- Name: idx_role_permissions_feature_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_feature_id ON public.role_permissions USING btree (feature_id);


--
-- Name: idx_role_permissions_role_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_access ON public.role_permissions USING btree (role_id, can_access);


--
-- Name: idx_role_quotas_role_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_quotas_role_type ON public.role_quotas USING btree (role_id, quota_type);


--
-- Name: idx_roles_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roles_is_active ON public.roles USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_roles_priority_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roles_priority_name ON public.roles USING btree (priority DESC, name);


--
-- Name: idx_taches_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taches_user_created ON public.taches USING btree (user_id, created_at);


--
-- Name: idx_user_assets_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_created ON public.user_assets USING btree (created_at);


--
-- Name: idx_user_assets_sha256; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_sha256 ON public.user_assets USING btree (sha256_hash) WHERE (sha256_hash IS NOT NULL);


--
-- Name: idx_user_assets_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_type ON public.user_assets USING btree (user_id, asset_type);


--
-- Name: idx_user_assets_unique_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_assets_unique_hash ON public.user_assets USING btree (user_id, sha256_hash) WHERE ((sha256_hash IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_user_assets_user_created_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_user_created_desc ON public.user_assets USING btree (user_id, created_at DESC);


--
-- Name: idx_user_assets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_user_id ON public.user_assets USING btree (user_id);


--
-- Name: idx_user_assets_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_assets_version ON public.user_assets USING btree (user_id, asset_type, version);


--
-- Name: idx_user_prefs_tz; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_prefs_tz ON public.user_prefs USING btree (timezone);


--
-- Name: idx_user_roles_assigned_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_assigned_by ON public.user_roles USING btree (assigned_by);


--
-- Name: INDEX idx_user_roles_assigned_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_user_roles_assigned_by IS '✅ Added: Foreign key index for JOIN optimization - Fixed 2025-01-30';


--
-- Name: idx_user_roles_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_expires_at ON public.user_roles USING btree (expires_at);


--
-- Name: idx_user_roles_expiring_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_expiring_active ON public.user_roles USING btree (expires_at) WHERE (is_active = true);


--
-- Name: idx_user_roles_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_is_active ON public.user_roles USING btree (is_active);


--
-- Name: idx_user_roles_role_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_active ON public.user_roles USING btree (role_id, is_active);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_active ON public.user_roles USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: idx_user_roles_user_active_inc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_active_inc ON public.user_roles USING btree (user_id, is_active) INCLUDE (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: permission_changes_change_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_change_type_idx ON public.permission_changes USING btree (change_type);


--
-- Name: permission_changes_changed_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_changed_at_idx ON public.permission_changes USING btree (changed_at DESC);


--
-- Name: permission_changes_changed_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_changed_by_idx ON public.permission_changes USING btree (changed_by);


--
-- Name: permission_changes_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_created_at_idx ON public.permission_changes USING btree (created_at DESC);


--
-- Name: permission_changes_record_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_record_id_idx ON public.permission_changes USING btree (record_id);


--
-- Name: permission_changes_table_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_table_name_idx ON public.permission_changes USING btree (table_name);


--
-- Name: permission_changes_table_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX permission_changes_table_type_idx ON public.permission_changes USING btree (table_name, change_type);


--
-- Name: recompenses_one_selected_per_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX recompenses_one_selected_per_user ON public.recompenses USING btree (user_id) WHERE ((selected IS TRUE) AND (user_id IS NOT NULL));


--
-- Name: recompenses_points_requis_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recompenses_points_requis_idx ON public.recompenses USING btree (points_requis);


--
-- Name: recompenses_selected_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recompenses_selected_idx ON public.recompenses USING btree (selected);


--
-- Name: recompenses_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recompenses_user_id_idx ON public.recompenses USING btree (user_id);


--
-- Name: recompenses_user_selected_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recompenses_user_selected_idx ON public.recompenses USING btree (user_id, selected);


--
-- Name: recompenses_visible_en_demo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recompenses_visible_en_demo_idx ON public.recompenses USING btree (visible_en_demo);


--
-- Name: stations_type_ligne_label_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stations_type_ligne_label_unique ON public.stations USING btree (type, ligne, label);


--
-- Name: stations_type_ligne_ordre_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stations_type_ligne_ordre_unique ON public.stations USING btree (type, ligne, ordre);


--
-- Name: subscription_logs_user_event_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_logs_user_event_time_idx ON public.subscription_logs USING btree (user_id, event_type, "timestamp" DESC);


--
-- Name: subscription_logs_user_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_logs_user_time_idx ON public.subscription_logs USING btree (user_id, "timestamp" DESC);


--
-- Name: taches_categorie_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_categorie_id_idx ON public.taches USING btree (categorie_id);


--
-- Name: taches_categorie_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_categorie_idx ON public.taches USING btree (categorie);


--
-- Name: taches_fait_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_fait_idx ON public.taches USING btree (fait);


--
-- Name: taches_user_aujourdhui_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_user_aujourdhui_idx ON public.taches USING btree (user_id, aujourdhui);


--
-- Name: taches_user_fait_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_user_fait_idx ON public.taches USING btree (user_id, fait);


--
-- Name: taches_user_fait_true_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_user_fait_true_idx ON public.taches USING btree (user_id) WHERE (fait IS TRUE);


--
-- Name: taches_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_user_id_idx ON public.taches USING btree (user_id);


--
-- Name: taches_user_position_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_user_position_idx ON public.taches USING btree (user_id, "position");


--
-- Name: taches_visible_en_demo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taches_visible_en_demo_idx ON public.taches USING btree (visible_en_demo);


--
-- Name: uq_user_roles_one_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_user_roles_one_active ON public.user_roles USING btree (user_id) WHERE (is_active = true);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: categories a00_categories_set_user_id_before; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a00_categories_set_user_id_before BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_categories_set_user_id();


--
-- Name: recompenses a00_recompenses_set_user_id_before; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a00_recompenses_set_user_id_before BEFORE INSERT ON public.recompenses FOR EACH ROW EXECUTE FUNCTION public.tg_recompenses_set_user_id();


--
-- Name: taches a00_taches_set_user_id_before; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a00_taches_set_user_id_before BEFORE INSERT ON public.taches FOR EACH ROW EXECUTE FUNCTION public.tg_taches_set_user_id();


--
-- Name: categories a01_categories_fill_value_before; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a01_categories_fill_value_before BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.tg_categories_fill_value();


--
-- Name: taches a10_taches_normalize_categorie; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a10_taches_normalize_categorie BEFORE INSERT OR UPDATE OF categorie ON public.taches FOR EACH ROW EXECUTE FUNCTION public.tg_taches_normalize_categorie();


--
-- Name: taches a20_taches_sync_categorie; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a20_taches_sync_categorie BEFORE INSERT OR UPDATE OF categorie, user_id ON public.taches FOR EACH ROW EXECUTE FUNCTION public.tg_taches_sync_categorie();


--
-- Name: categories a99_categories_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a99_categories_set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: recompenses a99_recompenses_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a99_recompenses_set_updated_at BEFORE UPDATE ON public.recompenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: taches a99_taches_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER a99_taches_set_updated_at BEFORE UPDATE ON public.taches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: features audit_features_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_features_changes AFTER INSERT OR DELETE OR UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.tg_audit_permission_change();


--
-- Name: role_permissions audit_role_permissions_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_role_permissions_changes AFTER INSERT OR DELETE OR UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.tg_audit_permission_change();


--
-- Name: roles audit_roles_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_roles_changes AFTER INSERT OR DELETE OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.tg_audit_permission_change();


--
-- Name: user_roles audit_user_roles_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_user_roles_changes AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.tg_audit_permission_change();


--
-- Name: abonnements on_subscription_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_subscription_change AFTER INSERT OR UPDATE ON public.abonnements FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_role_change();


--
-- Name: parametres parametres_lock_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER parametres_lock_id BEFORE UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.tg_parametres_lock_id();


--
-- Name: permission_changes permission_changes_validate_json; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER permission_changes_validate_json BEFORE INSERT OR UPDATE ON public.permission_changes FOR EACH ROW EXECUTE FUNCTION public.tg_permission_changes_validate_json();


--
-- Name: roles prevent_system_role_delete_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_system_role_delete_trigger BEFORE DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.prevent_system_role_delete();


--
-- Name: roles prevent_system_role_deletion_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_system_role_deletion_trigger BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.prevent_system_role_deletion();


--
-- Name: recompenses recompenses_normalize; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER recompenses_normalize BEFORE INSERT OR UPDATE ON public.recompenses FOR EACH ROW EXECUTE FUNCTION public.tg_recompenses_normalize();


--
-- Name: abonnements set_abonnements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_abonnements_updated_at BEFORE INSERT OR UPDATE ON public.abonnements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: features set_features_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_features_updated_at BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: parametres set_parametres_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_parametres_updated_at BEFORE UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_profiles_updated_at BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: role_permissions set_role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_role_permissions_updated_at BEFORE INSERT OR UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles set_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_roles set_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: stations stations_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER stations_set_updated_at BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: taches taches_sync_categorie; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER taches_sync_categorie BEFORE INSERT OR UPDATE ON public.taches FOR EACH ROW EXECUTE FUNCTION public.tg_taches_sync_categorie();

ALTER TABLE public.taches DISABLE TRIGGER taches_sync_categorie;


--
-- Name: categories trg_categories_ctr_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_categories_ctr_del AFTER DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.categories_counter_del();


--
-- Name: categories trg_categories_ctr_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_categories_ctr_ins AFTER INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.categories_counter_ins();


--
-- Name: recompenses trg_recompenses_ctr_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_recompenses_ctr_del AFTER DELETE ON public.recompenses FOR EACH ROW EXECUTE FUNCTION public.recompenses_counter_del();


--
-- Name: recompenses trg_recompenses_ctr_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_recompenses_ctr_ins AFTER INSERT ON public.recompenses FOR EACH ROW EXECUTE FUNCTION public.recompenses_counter_ins();


--
-- Name: taches trg_taches_ctr_del; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_taches_ctr_del AFTER DELETE ON public.taches FOR EACH ROW EXECUTE FUNCTION public.taches_counter_del();


--
-- Name: taches trg_taches_ctr_ins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_taches_ctr_ins AFTER INSERT ON public.taches FOR EACH ROW EXECUTE FUNCTION public.taches_counter_ins();


--
-- Name: user_assets trg_user_assets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_assets_updated_at BEFORE UPDATE ON public.user_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: abonnements abonnements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abonnements
    ADD CONSTRAINT abonnements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: account_audit_logs account_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_audit_logs
    ADD CONSTRAINT account_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: account_audit_logs account_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_audit_logs
    ADD CONSTRAINT account_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consentements consentements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consentements
    ADD CONSTRAINT consentements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: image_metrics image_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image_metrics
    ADD CONSTRAINT image_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: permission_changes permission_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permission_changes
    ADD CONSTRAINT permission_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recompenses recompenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recompenses
    ADD CONSTRAINT recompenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_quotas role_quotas_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_quotas
    ADD CONSTRAINT role_quotas_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: subscription_logs subscription_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: taches taches_categorie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taches
    ADD CONSTRAINT taches_categorie_id_fkey FOREIGN KEY (categorie_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: taches taches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taches
    ADD CONSTRAINT taches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_assets user_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_assets
    ADD CONSTRAINT user_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_prefs user_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_prefs
    ADD CONSTRAINT user_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_usage_counters user_usage_counters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_usage_counters
    ADD CONSTRAINT user_usage_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: image_metrics Users can insert own metrics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert own metrics" ON public.image_metrics FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: abonnements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;

--
-- Name: abonnements abonnements_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY abonnements_select_unified ON public.abonnements FOR SELECT TO authenticated USING ((public.is_admin() OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: account_audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.account_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: account_audit_logs account_audit_logs_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_audit_logs_insert_admin ON public.account_audit_logs FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: account_audit_logs account_audit_logs_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY account_audit_logs_select_unified ON public.account_audit_logs FOR SELECT USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: role_quotas_backup_legacy block_all_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY block_all_access ON public.role_quotas_backup_legacy USING (false);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_delete_own ON public.categories FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));


--
-- Name: categories categories_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_insert_authenticated ON public.categories FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: POLICY categories_insert_authenticated ON categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY categories_insert_authenticated ON public.categories IS '✅ Optimized: Using (SELECT auth.uid()) - Fixed 2025-01-30';


--
-- Name: categories categories_select_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_select_auth ON public.categories FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (user_id IS NULL) OR public.is_admin()));


--
-- Name: categories categories_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY categories_update_own ON public.categories FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin())) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));


--
-- Name: consentements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consentements ENABLE ROW LEVEL SECURITY;

--
-- Name: consentements consentements_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_delete ON public.consentements FOR DELETE TO anon, authenticated USING (false);


--
-- Name: consentements consentements_insert_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_insert_unified ON public.consentements FOR INSERT WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: consentements consentements_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_select ON public.consentements FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));


--
-- Name: consentements consentements_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_update ON public.consentements FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);


--
-- Name: demo_cards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.demo_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: demo_cards demo_cards_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY demo_cards_select_unified ON public.demo_cards FOR SELECT USING ((public.is_admin() OR (is_active = true)));


--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: features features_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY features_select_unified ON public.features FOR SELECT TO authenticated USING ((public.is_admin() OR (is_active = true)));


--
-- Name: image_metrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.image_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_logs logs_select_user_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY logs_select_user_or_admin ON public.subscription_logs FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));


--
-- Name: parametres; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;

--
-- Name: parametres parametres_delete_admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY parametres_delete_admin_only ON public.parametres FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: parametres parametres_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY parametres_insert_authenticated ON public.parametres FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: parametres parametres_select_all_users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY parametres_select_all_users ON public.parametres FOR SELECT TO authenticated USING (true);


--
-- Name: parametres parametres_update_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY parametres_update_authenticated ON public.parametres FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: permission_changes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.permission_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_changes permission_changes_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY permission_changes_delete_admin ON public.permission_changes FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: permission_changes permission_changes_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY permission_changes_insert_admin ON public.permission_changes FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: permission_changes permission_changes_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY permission_changes_select_admin ON public.permission_changes FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: permission_changes permission_changes_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY permission_changes_update_admin ON public.permission_changes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert_unified ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR (( SELECT auth.uid() AS uid) = id)));


--
-- Name: profiles profiles_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_unified ON public.profiles FOR SELECT TO authenticated USING ((public.is_admin() OR (id = ( SELECT auth.uid() AS uid))));


--
-- Name: profiles profiles_update_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_unified ON public.profiles FOR UPDATE TO authenticated USING ((public.is_admin() OR (id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((public.is_admin() OR (id = ( SELECT auth.uid() AS uid))));


--
-- Name: recompenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recompenses ENABLE ROW LEVEL SECURITY;

--
-- Name: recompenses recompenses_delete_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recompenses_delete_unified ON public.recompenses FOR DELETE TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: recompenses recompenses_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recompenses_insert_authenticated ON public.recompenses FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: POLICY recompenses_insert_authenticated ON recompenses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY recompenses_insert_authenticated ON public.recompenses IS '✅ Optimized: Using (SELECT auth.uid()) - Fixed 2025-01-30';


--
-- Name: recompenses recompenses_select_demo; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recompenses_select_demo ON public.recompenses FOR SELECT TO anon USING ((visible_en_demo = true));


--
-- Name: recompenses recompenses_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recompenses_select_unified ON public.recompenses FOR SELECT TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (visible_en_demo = true))));


--
-- Name: recompenses recompenses_update_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY recompenses_update_unified ON public.recompenses FOR UPDATE TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_permissions_select_unified ON public.role_permissions FOR SELECT TO authenticated USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = ( SELECT auth.uid() AS uid)) AND (ur.role_id = role_permissions.role_id) AND (ur.is_active = true))))));


--
-- Name: role_quotas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.role_quotas ENABLE ROW LEVEL SECURITY;

--
-- Name: role_quotas_backup_legacy; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.role_quotas_backup_legacy ENABLE ROW LEVEL SECURITY;

--
-- Name: role_quotas role_quotas_select_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_quotas_select_public ON public.role_quotas FOR SELECT USING (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY roles_select_unified ON public.roles FOR SELECT TO authenticated USING ((public.is_admin() OR (is_active = true)));


--
-- Name: stations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

--
-- Name: stations stations_select_anon; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stations_select_anon ON public.stations FOR SELECT TO anon USING (true);


--
-- Name: stations stations_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stations_select_unified ON public.stations FOR SELECT TO authenticated USING (true);


--
-- Name: subscription_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: taches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

--
-- Name: taches taches_delete_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY taches_delete_unified ON public.taches FOR DELETE TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: taches taches_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY taches_insert_authenticated ON public.taches FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: POLICY taches_insert_authenticated ON taches; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY taches_insert_authenticated ON public.taches IS '✅ Optimized: Using (SELECT auth.uid()) - Fixed 2025-01-30';


--
-- Name: taches taches_select_demo; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY taches_select_demo ON public.taches FOR SELECT TO anon USING ((visible_en_demo = true));


--
-- Name: taches taches_select_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY taches_select_owner_or_admin ON public.taches FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR public.is_admin()));


--
-- Name: taches taches_update_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY taches_update_unified ON public.taches FOR UPDATE TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: image_metrics unified_image_metrics_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY unified_image_metrics_select ON public.image_metrics FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: POLICY unified_image_metrics_select ON image_metrics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY unified_image_metrics_select ON public.image_metrics IS '✅ Optimized: Merged 2 permissive policies into 1 - Fixed 2025-01-30';


--
-- Name: user_assets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_assets user_assets_delete_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_assets_delete_unified ON public.user_assets FOR DELETE TO authenticated USING ((public.is_admin() OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: user_assets user_assets_insert_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_assets_insert_self ON public.user_assets FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_assets user_assets_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_assets_select_unified ON public.user_assets FOR SELECT TO authenticated USING ((public.is_admin() OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: user_assets user_assets_update_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_assets_update_unified ON public.user_assets FOR UPDATE TO authenticated USING ((public.is_admin() OR (( SELECT auth.uid() AS uid) = user_id))) WITH CHECK ((public.is_admin() OR (( SELECT auth.uid() AS uid) = user_id)));


--
-- Name: user_prefs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_prefs user_prefs_select_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_prefs_select_self ON public.user_prefs FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_prefs user_prefs_update_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_prefs_update_self ON public.user_prefs FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_prefs user_prefs_upsert_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_prefs_upsert_self ON public.user_prefs FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_insert_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_insert_unified ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((public.is_admin() OR ((user_id = ( SELECT auth.uid() AS uid)) AND (role_id IN ( SELECT roles.id
   FROM public.roles
  WHERE ((roles.name = 'free'::text) AND (roles.is_active = true)))))));


--
-- Name: user_roles user_roles_select_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_select_unified ON public.user_roles FOR SELECT TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: user_roles user_roles_update_unified; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_update_unified ON public.user_roles FOR UPDATE TO authenticated USING ((public.is_admin() OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK ((public.is_admin() OR ((user_id = ( SELECT auth.uid() AS uid)) AND (role_id IN ( SELECT roles.id
   FROM public.roles
  WHERE ((roles.name = 'free'::text) AND (roles.is_active = true)))))));


--
-- Name: user_usage_counters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_usage_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: user_usage_counters user_usage_counters_select_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_usage_counters_select_self ON public.user_usage_counters FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: objects avatars_delete_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_delete_admin ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND public.is_admin()));


--
-- Name: objects avatars_delete_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_delete_own_files ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects avatars_select_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_select_admin ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'avatars'::text) AND public.is_admin()));


--
-- Name: objects avatars_select_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_select_own_files ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects avatars_update_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_update_admin ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND public.is_admin())) WITH CHECK (((bucket_id = 'avatars'::text) AND public.is_admin()));


--
-- Name: objects avatars_update_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_update_own_files ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))) WITH CHECK (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects avatars_upload_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_upload_admin ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND public.is_admin()));


--
-- Name: objects avatars_upload_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY avatars_upload_own_files ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets buckets_admin_all; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY buckets_admin_all ON storage.buckets TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets buckets_select_authenticated; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY buckets_select_authenticated ON storage.buckets FOR SELECT TO authenticated USING (true);


--
-- Name: objects demo_images_delete_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY demo_images_delete_admin ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'demo-images'::text) AND public.is_admin()));


--
-- Name: objects demo_images_insert_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY demo_images_insert_admin ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'demo-images'::text) AND public.is_admin()));


--
-- Name: objects demo_images_select_public; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY demo_images_select_public ON storage.objects FOR SELECT USING ((bucket_id = 'demo-images'::text));


--
-- Name: objects demo_images_update_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY demo_images_update_admin ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'demo-images'::text) AND public.is_admin()));


--
-- Name: objects images_delete_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_delete_admin ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'images'::text) AND public.is_admin()));


--
-- Name: objects images_delete_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_delete_own_files ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects images_select_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_select_admin ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'images'::text) AND public.is_admin()));


--
-- Name: objects images_select_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_select_own_files ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects images_update_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_update_admin ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'images'::text) AND public.is_admin())) WITH CHECK (((bucket_id = 'images'::text) AND public.is_admin()));


--
-- Name: objects images_update_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_update_own_files ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text))) WITH CHECK (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects images_upload_admin; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_upload_admin ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'images'::text) AND public.is_admin()));


--
-- Name: objects images_upload_own_files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY images_upload_own_files ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: FUNCTION _compute_my_permissions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._compute_my_permissions() TO anon;
GRANT ALL ON FUNCTION public._compute_my_permissions() TO authenticated;
GRANT ALL ON FUNCTION public._compute_my_permissions() TO service_role;


--
-- Name: FUNCTION _compute_my_primary_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._compute_my_primary_role() TO anon;
GRANT ALL ON FUNCTION public._compute_my_primary_role() TO authenticated;
GRANT ALL ON FUNCTION public._compute_my_primary_role() TO service_role;


--
-- Name: FUNCTION assert_self_or_admin(p_target uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.assert_self_or_admin(p_target uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assert_self_or_admin(p_target uuid) TO authenticated;
GRANT ALL ON FUNCTION public.assert_self_or_admin(p_target uuid) TO service_role;


--
-- Name: FUNCTION bump_usage_counter(p_user uuid, p_col text, p_delta integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.bump_usage_counter(p_user uuid, p_col text, p_delta integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bump_usage_counter(p_user uuid, p_col text, p_delta integer) TO service_role;


--
-- Name: FUNCTION categories_counter_del(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.categories_counter_del() FROM PUBLIC;
GRANT ALL ON FUNCTION public.categories_counter_del() TO service_role;
GRANT ALL ON FUNCTION public.categories_counter_del() TO anon;
GRANT ALL ON FUNCTION public.categories_counter_del() TO authenticated;


--
-- Name: FUNCTION categories_counter_ins(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.categories_counter_ins() FROM PUBLIC;
GRANT ALL ON FUNCTION public.categories_counter_ins() TO service_role;
GRANT ALL ON FUNCTION public.categories_counter_ins() TO anon;
GRANT ALL ON FUNCTION public.categories_counter_ins() TO authenticated;


--
-- Name: FUNCTION change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid, reason text, metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid, reason text, metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid, reason text, metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.change_account_status(target_user_id uuid, new_status text, changed_by_user_id uuid, reason text, metadata jsonb) TO service_role;


--
-- Name: FUNCTION check_duplicate_image(p_user_id uuid, p_sha256_hash text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) TO anon;
GRANT ALL ON FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.check_duplicate_image(p_user_id uuid, p_sha256_hash text) TO service_role;


--
-- Name: FUNCTION check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint) TO authenticated;
GRANT ALL ON FUNCTION public.check_image_quota(p_user_id uuid, p_asset_type text, p_file_size bigint) TO service_role;


--
-- Name: FUNCTION check_user_quota(user_uuid uuid, quota_type text, quota_period text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.check_user_quota(user_uuid uuid, quota_type text, quota_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid, quota_type text, quota_period text) TO authenticated;
GRANT ALL ON FUNCTION public.check_user_quota(user_uuid uuid, quota_type text, quota_period text) TO service_role;


--
-- Name: FUNCTION check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.check_user_quota_free_only(p_user_id uuid, p_quota_type text, p_period text) TO service_role;


--
-- Name: FUNCTION cleanup_old_audit_logs(retention_days integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs(retention_days integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cleanup_old_audit_logs(retention_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_audit_logs(retention_days integer) TO service_role;


--
-- Name: FUNCTION email_exists(email_to_check text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.email_exists(email_to_check text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.email_exists(email_to_check text) TO authenticated;
GRANT ALL ON FUNCTION public.email_exists(email_to_check text) TO service_role;


--
-- Name: FUNCTION generate_unique_pseudo(base text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_unique_pseudo(base text) TO anon;
GRANT ALL ON FUNCTION public.generate_unique_pseudo(base text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_unique_pseudo(base text) TO service_role;


--
-- Name: FUNCTION get_account_history(user_uuid uuid, limit_count integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_account_history(user_uuid uuid, limit_count integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_account_history(user_uuid uuid, limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_account_history(user_uuid uuid, limit_count integer) TO service_role;


--
-- Name: FUNCTION get_account_status(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_account_status(user_uuid uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_account_status(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_account_status(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_confettis(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_confettis() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_confettis() TO anon;
GRANT ALL ON FUNCTION public.get_confettis() TO authenticated;
GRANT ALL ON FUNCTION public.get_confettis() TO service_role;


--
-- Name: FUNCTION get_demo_cards(card_type_filter text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_demo_cards(card_type_filter text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_demo_cards(card_type_filter text) TO anon;
GRANT ALL ON FUNCTION public.get_demo_cards(card_type_filter text) TO authenticated;
GRANT ALL ON FUNCTION public.get_demo_cards(card_type_filter text) TO service_role;


--
-- Name: FUNCTION get_demo_rewards(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_demo_rewards() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_demo_rewards() TO anon;
GRANT ALL ON FUNCTION public.get_demo_rewards() TO authenticated;
GRANT ALL ON FUNCTION public.get_demo_rewards() TO service_role;


--
-- Name: FUNCTION get_demo_tasks(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_demo_tasks() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_demo_tasks() TO anon;
GRANT ALL ON FUNCTION public.get_demo_tasks() TO authenticated;
GRANT ALL ON FUNCTION public.get_demo_tasks() TO service_role;


--
-- Name: FUNCTION get_image_analytics_summary(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_image_analytics_summary() TO anon;
GRANT ALL ON FUNCTION public.get_image_analytics_summary() TO authenticated;
GRANT ALL ON FUNCTION public.get_image_analytics_summary() TO service_role;


--
-- Name: FUNCTION get_migration_report(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_migration_report() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_migration_report() TO authenticated;
GRANT ALL ON FUNCTION public.get_migration_report() TO service_role;


--
-- Name: FUNCTION get_my_permissions(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_permissions() TO anon;
GRANT ALL ON FUNCTION public.get_my_permissions() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_permissions() TO service_role;


--
-- Name: FUNCTION get_my_primary_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_primary_role() TO anon;
GRANT ALL ON FUNCTION public.get_my_primary_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_my_primary_role() TO service_role;


--
-- Name: FUNCTION get_usage(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_usage(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_usage_fast(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_usage_fast(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_usage_fast(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_fast(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_assets_stats(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_assets_stats(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_assets_stats(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_assets_stats(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_emails(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_emails() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_emails() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_emails() TO service_role;


--
-- Name: FUNCTION get_user_last_logins(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_last_logins() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_last_logins() TO authenticated;
GRANT ALL ON FUNCTION public.get_user_last_logins() TO service_role;


--
-- Name: FUNCTION get_user_month_bounds_utc(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_month_bounds_utc(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_month_bounds_utc(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_month_bounds_utc(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_permissions(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_permissions(user_uuid uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_permissions(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_permissions(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_user_primary_role(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_primary_role(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_primary_role(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_primary_role(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_quota_info(user_uuid uuid, quota_type text, quota_period text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_quota_info(user_uuid uuid, quota_type text, quota_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_quota_info(user_uuid uuid, quota_type text, quota_period text) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_quota_info(user_uuid uuid, quota_type text, quota_period text) TO service_role;


--
-- Name: FUNCTION get_user_roles(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_roles(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_roles(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_roles(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_users_with_roles(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_users_with_roles() TO anon;
GRANT ALL ON FUNCTION public.get_users_with_roles() TO authenticated;
GRANT ALL ON FUNCTION public.get_users_with_roles() TO service_role;


--
-- Name: FUNCTION get_users_with_roles(page_num integer, page_limit integer, role_filter text, status_filter text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_users_with_roles(page_num integer, page_limit integer, role_filter text, status_filter text) TO anon;
GRANT ALL ON FUNCTION public.get_users_with_roles(page_num integer, page_limit integer, role_filter text, status_filter text) TO authenticated;
GRANT ALL ON FUNCTION public.get_users_with_roles(page_num integer, page_limit integer, role_filter text, status_filter text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_subscription_role_change(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.handle_subscription_role_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_subscription_role_change() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;
GRANT ALL ON FUNCTION public.is_admin() TO anon;


--
-- Name: FUNCTION is_subscriber(p_user uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_subscriber(p_user uuid) TO anon;
GRANT ALL ON FUNCTION public.is_subscriber(p_user uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_subscriber(p_user uuid) TO service_role;


--
-- Name: FUNCTION is_system_role(role_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_system_role(role_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_system_role(role_name text) TO service_role;


--
-- Name: FUNCTION log_card_creation(_user uuid, _entity text, _id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_card_creation(_user uuid, _entity text, _id uuid) TO anon;
GRANT ALL ON FUNCTION public.log_card_creation(_user uuid, _entity text, _id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.log_card_creation(_user uuid, _entity text, _id uuid) TO service_role;


--
-- Name: FUNCTION prevent_system_role_delete(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_system_role_delete() TO anon;
GRANT ALL ON FUNCTION public.prevent_system_role_delete() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_system_role_delete() TO service_role;


--
-- Name: FUNCTION prevent_system_role_deletion(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.prevent_system_role_deletion() FROM PUBLIC;
GRANT ALL ON FUNCTION public.prevent_system_role_deletion() TO service_role;


--
-- Name: FUNCTION purge_old_consentements(retention_months integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.purge_old_consentements(retention_months integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_old_consentements(retention_months integer) TO authenticated;
GRANT ALL ON FUNCTION public.purge_old_consentements(retention_months integer) TO service_role;


--
-- Name: FUNCTION recompenses_counter_del(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recompenses_counter_del() TO anon;
GRANT ALL ON FUNCTION public.recompenses_counter_del() TO authenticated;
GRANT ALL ON FUNCTION public.recompenses_counter_del() TO service_role;


--
-- Name: FUNCTION recompenses_counter_ins(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recompenses_counter_ins() TO anon;
GRANT ALL ON FUNCTION public.recompenses_counter_ins() TO authenticated;
GRANT ALL ON FUNCTION public.recompenses_counter_ins() TO service_role;


--
-- Name: FUNCTION rewards_counter_del(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.rewards_counter_del() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rewards_counter_del() TO service_role;


--
-- Name: FUNCTION rewards_counter_ins(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.rewards_counter_ins() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rewards_counter_ins() TO service_role;


--
-- Name: TABLE recompenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recompenses TO service_role;
GRANT SELECT ON TABLE public.recompenses TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.recompenses TO authenticated;


--
-- Name: FUNCTION select_recompense_atomic(p_reward_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.select_recompense_atomic(p_reward_id uuid) TO anon;
GRANT ALL ON FUNCTION public.select_recompense_atomic(p_reward_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.select_recompense_atomic(p_reward_id uuid) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION taches_counter_del(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.taches_counter_del() FROM PUBLIC;
GRANT ALL ON FUNCTION public.taches_counter_del() TO service_role;
GRANT ALL ON FUNCTION public.taches_counter_del() TO anon;
GRANT ALL ON FUNCTION public.taches_counter_del() TO authenticated;


--
-- Name: FUNCTION taches_counter_ins(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.taches_counter_ins() FROM PUBLIC;
GRANT ALL ON FUNCTION public.taches_counter_ins() TO service_role;
GRANT ALL ON FUNCTION public.taches_counter_ins() TO anon;
GRANT ALL ON FUNCTION public.taches_counter_ins() TO authenticated;


--
-- Name: FUNCTION tg_audit_permission_change(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tg_audit_permission_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_audit_permission_change() TO service_role;


--
-- Name: FUNCTION tg_categories_fill_value(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_categories_fill_value() TO anon;
GRANT ALL ON FUNCTION public.tg_categories_fill_value() TO authenticated;
GRANT ALL ON FUNCTION public.tg_categories_fill_value() TO service_role;


--
-- Name: FUNCTION tg_categories_set_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_categories_set_user_id() TO anon;
GRANT ALL ON FUNCTION public.tg_categories_set_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.tg_categories_set_user_id() TO service_role;


--
-- Name: FUNCTION tg_on_auth_user_created(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_on_auth_user_created() TO anon;
GRANT ALL ON FUNCTION public.tg_on_auth_user_created() TO authenticated;
GRANT ALL ON FUNCTION public.tg_on_auth_user_created() TO service_role;


--
-- Name: FUNCTION tg_parametres_lock_id(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tg_parametres_lock_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_parametres_lock_id() TO service_role;


--
-- Name: FUNCTION tg_permission_changes_validate_json(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tg_permission_changes_validate_json() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_permission_changes_validate_json() TO service_role;


--
-- Name: FUNCTION tg_recompenses_normalize(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tg_recompenses_normalize() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_recompenses_normalize() TO service_role;


--
-- Name: FUNCTION tg_recompenses_set_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_recompenses_set_user_id() TO anon;
GRANT ALL ON FUNCTION public.tg_recompenses_set_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.tg_recompenses_set_user_id() TO service_role;


--
-- Name: FUNCTION tg_taches_log_neutral(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_taches_log_neutral() TO anon;
GRANT ALL ON FUNCTION public.tg_taches_log_neutral() TO authenticated;
GRANT ALL ON FUNCTION public.tg_taches_log_neutral() TO service_role;


--
-- Name: FUNCTION tg_taches_normalize_categorie(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_taches_normalize_categorie() TO anon;
GRANT ALL ON FUNCTION public.tg_taches_normalize_categorie() TO authenticated;
GRANT ALL ON FUNCTION public.tg_taches_normalize_categorie() TO service_role;


--
-- Name: FUNCTION tg_taches_set_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.tg_taches_set_user_id() TO anon;
GRANT ALL ON FUNCTION public.tg_taches_set_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.tg_taches_set_user_id() TO service_role;


--
-- Name: FUNCTION tg_taches_sync_categorie(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.tg_taches_sync_categorie() FROM PUBLIC;
GRANT ALL ON FUNCTION public.tg_taches_sync_categorie() TO service_role;


--
-- Name: FUNCTION user_can_upload_avatar(uid uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) TO service_role;


--
-- Name: TABLE abonnements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.abonnements TO service_role;
GRANT SELECT ON TABLE public.abonnements TO authenticated;


--
-- Name: TABLE account_audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_audit_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.account_audit_logs TO authenticated;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.categories TO authenticated;


--
-- Name: TABLE consentements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consentements TO service_role;
GRANT INSERT ON TABLE public.consentements TO anon;
GRANT SELECT,INSERT ON TABLE public.consentements TO authenticated;


--
-- Name: TABLE consentements_latest; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consentements_latest TO service_role;
GRANT SELECT ON TABLE public.consentements_latest TO authenticated;


--
-- Name: TABLE demo_cards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.demo_cards TO service_role;
GRANT SELECT ON TABLE public.demo_cards TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.demo_cards TO authenticated;


--
-- Name: TABLE features; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.features TO service_role;
GRANT SELECT ON TABLE public.features TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.features TO authenticated;


--
-- Name: TABLE image_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.image_metrics TO authenticated;
GRANT ALL ON TABLE public.image_metrics TO service_role;


--
-- Name: TABLE parametres; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.parametres TO service_role;
GRANT SELECT ON TABLE public.parametres TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE public.parametres TO authenticated;


--
-- Name: TABLE permission_changes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permission_changes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.permission_changes TO authenticated;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO authenticated;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.role_permissions TO authenticated;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.roles TO authenticated;
GRANT SELECT ON TABLE public.roles TO anon;


--
-- Name: TABLE role_permissions_admin_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions_admin_view TO service_role;
GRANT SELECT ON TABLE public.role_permissions_admin_view TO authenticated;


--
-- Name: TABLE role_quotas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_quotas TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.role_quotas TO authenticated;


--
-- Name: TABLE role_quotas_backup_legacy; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_quotas_backup_legacy TO authenticated;
GRANT ALL ON TABLE public.role_quotas_backup_legacy TO service_role;


--
-- Name: TABLE stations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stations TO service_role;
GRANT SELECT ON TABLE public.stations TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stations TO authenticated;


--
-- Name: TABLE subscription_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscription_logs TO service_role;
GRANT SELECT ON TABLE public.subscription_logs TO authenticated;


--
-- Name: TABLE taches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.taches TO service_role;
GRANT SELECT ON TABLE public.taches TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.taches TO authenticated;


--
-- Name: TABLE user_assets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_assets TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_assets TO authenticated;


--
-- Name: TABLE user_prefs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_prefs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_prefs TO authenticated;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO authenticated;


--
-- Name: TABLE user_usage_counters; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_usage_counters TO service_role;
GRANT SELECT ON TABLE public.user_usage_counters TO authenticated;


--
-- Name: TABLE v_role_quota_matrix; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_role_quota_matrix TO authenticated;
GRANT ALL ON TABLE public.v_role_quota_matrix TO service_role;


--
-- Name: TABLE v_user_storage_usage; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_user_storage_usage TO authenticated;
GRANT ALL ON TABLE public.v_user_storage_usage TO service_role;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict etU5mr3ZGjk5K9nXTNYVOosNJ8ZcNy3AMNFOMfYOb0EpXiTdFxYImCmkvNQElka

