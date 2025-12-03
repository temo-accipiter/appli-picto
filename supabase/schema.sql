


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


CREATE TYPE "public"."transport_type" AS ENUM (
    'metro',
    'bus',
    'tram',
    'rer'
);


ALTER TYPE "public"."transport_type" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "public"."_compute_my_permissions"() RETURNS TABLE("feature_name" "text", "can_access" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."_compute_my_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_compute_my_primary_role"() RETURNS TABLE("role_id" "uuid", "role_name" "text", "priority" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."_compute_my_primary_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") IS 'Raise if the caller is neither the target user nor an admin.';



CREATE OR REPLACE FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."categories_counter_del"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(old.user_id, auth.uid()), 'categories', -1);
  return old;
end;
$$;


ALTER FUNCTION "public"."categories_counter_del"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."categories_counter_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'categories', 1);
  return new;
end;
$$;


ALTER FUNCTION "public"."categories_counter_ins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid" DEFAULT NULL::"uuid", "reason" "text" DEFAULT NULL::"text", "metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid", "reason" "text", "metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_existing_record record;
BEGIN
  -- Chercher si l'image existe déjà pour cet utilisateur
  SELECT 
    im.id,
    im.asset_type,
    im.created_at,
    CASE 
      WHEN im.asset_type = 'tache' THEN 
        (SELECT imagePath FROM public.taches WHERE user_id = p_user_id AND imagePath LIKE '%' || im.sha256_hash || '%' LIMIT 1)
      WHEN im.asset_type = 'recompense' THEN 
        (SELECT imagePath FROM public.recompenses WHERE user_id = p_user_id AND imagePath LIKE '%' || im.sha256_hash || '%' LIMIT 1)
      ELSE NULL
    END as image_path
  INTO v_existing_record
  FROM public.image_metrics im
  WHERE im.sha256_hash = p_sha256_hash
    AND im.user_id = p_user_id
    AND im.result = 'success'
  ORDER BY im.created_at DESC
  LIMIT 1;

  -- Si trouvé, retourner les informations
  IF FOUND AND v_existing_record.image_path IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true,
      'imagePath', v_existing_record.image_path,
      'assetType', v_existing_record.asset_type,
      'uploadedAt', v_existing_record.created_at
    );
  ELSE
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") IS 'Vérifie si une image avec ce hash SHA256 existe déjà pour l''utilisateur';



CREATE OR REPLACE FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role record;
  v_quotas jsonb := '{}'::jsonb;
  v_stats jsonb;
  v_can_upload boolean := true;
  v_reason text;
  v_max_image_size bigint;
  v_max_total_size bigint;
  v_sub record;
BEGIN
  -- Garde self/admin
  PERFORM public.assert_self_or_admin(p_user_id);

  -- Rôle prioritaire
  SELECT r.id, r.name, r.priority
    INTO v_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;

  -- 🔧 Fallback si aucun rôle encore actif
  IF v_role.id IS NULL THEN
    SELECT * INTO v_sub
    FROM public.abonnements
    WHERE user_id = p_user_id AND status IN ('active','trialing','past_due','paused')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_sub.id IS NOT NULL THEN
      SELECT id, name, priority INTO v_role FROM public.roles WHERE name = 'abonne' LIMIT 1;
    ELSE
      SELECT id, name, priority INTO v_role FROM public.roles WHERE name = 'free' LIMIT 1;
    END IF;
  END IF;

  -- Admin/Staff : pas de limite
  IF v_role.name IN ('admin','staff') THEN
    RETURN jsonb_build_object('can_upload', true, 'reason', 'admin_unlimited');
  END IF;

  -- Quotas image du rôle
  SELECT COALESCE(jsonb_object_agg(quota_type, quota_limit), '{}'::jsonb)
    INTO v_quotas
  FROM public.role_quotas
  WHERE role_id = v_role.id
    AND quota_type LIKE '%image%';

  -- Stats actuelles
  SELECT public.get_user_assets_stats(p_user_id) INTO v_stats;

  -- Tailles facultatives
  v_max_image_size := NULLIF((v_quotas->>'max_image_size')::bigint, 0);
  v_max_total_size := NULLIF((v_quotas->>'max_total_images_size')::bigint, 0);

  IF p_asset_type NOT IN ('task_image','reward_image') THEN
    RETURN jsonb_build_object('can_upload', false, 'reason', 'invalid_asset_type');
  END IF;

  IF v_max_image_size IS NOT NULL AND p_file_size > v_max_image_size THEN
    v_can_upload := false; v_reason := 'image_too_large';
  END IF;

  IF v_can_upload AND p_asset_type = 'task_image' THEN
    IF (v_stats->>'task_images')::int >= COALESCE((v_quotas->>'max_task_images')::int, 2147483647) THEN
      v_can_upload := false; v_reason := 'task_image_limit_reached';
    END IF;
  ELSIF v_can_upload AND p_asset_type = 'reward_image' THEN
    IF (v_stats->>'reward_images')::int >= COALESCE((v_quotas->>'max_reward_images')::int, 2147483647) THEN
      v_can_upload := false; v_reason := 'reward_image_limit_reached';
    END IF;
  END IF;

  IF v_can_upload AND (v_stats->>'total_images')::int >= COALESCE((v_quotas->>'max_total_images')::int, 2147483647) THEN
    v_can_upload := false; v_reason := 'total_image_limit_reached';
  END IF;

  IF v_can_upload AND v_max_total_size IS NOT NULL THEN
    IF COALESCE((v_stats->>'total_size')::bigint, 0) + GREATEST(p_file_size,0) > v_max_total_size THEN
      v_can_upload := false; v_reason := 'total_image_size_limit_reached';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_upload', v_can_upload,
    'reason', COALESCE(v_reason, 'ok'),
    'role', v_role.name,
    'quotas', v_quotas,
    'stats', v_stats
  );
END
$$;


ALTER FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text" DEFAULT 'monthly'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer DEFAULT 365) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."email_exists"("email_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."email_exists"("email_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_unique_pseudo"("base" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."generate_unique_pseudo"("base" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "action" "text", "old_status" "text", "new_status" "text", "old_role" "text", "new_role" "text", "reason" "text", "changed_by_pseudo" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_status"("user_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "account_status" "text", "role_name" "text", "is_suspended" boolean, "is_pending_verification" boolean, "is_scheduled_for_deletion" boolean, "deletion_date" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_account_status"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_confettis"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select confettis from public.parametres where id = 1
$$;


ALTER FUNCTION "public"."get_confettis"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_confettis"() IS 'Lecture simple du paramètre confettis (singleton id=1).';



CREATE OR REPLACE FUNCTION "public"."get_demo_cards"("card_type_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "card_type" "text", "label" "text", "imagepath" "text", "position" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_demo_cards"("card_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_demo_rewards"() RETURNS TABLE("id" "uuid", "label" "text", "imagepath" "text", "position" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_demo_rewards"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_demo_tasks"() RETURNS TABLE("id" "uuid", "label" "text", "imagepath" "text", "position" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_demo_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_image_analytics_summary"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Admins uniquement
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admins only' USING ERRCODE = '42501';
  END IF;

  -- Statistiques globales (7 derniers jours)
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


ALTER FUNCTION "public"."get_image_analytics_summary"() OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_image_analytics_summary"() IS 'Statistiques uploads 7 derniers jours (admins uniquement). Retourne métriques globales : uploads totaux, taux succès, compression moyenne, etc.';



CREATE OR REPLACE FUNCTION "public"."get_migration_report"() RETURNS TABLE("total_users" integer, "active_users" integer, "suspended_users" integer, "pending_users" integer, "deletion_scheduled_users" integer, "admin_users" integer, "abonne_users" integer, "free_users" integer, "visitor_users" integer, "staff_users" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_migration_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_permissions"() RETURNS TABLE("feature_name" "text", "can_access" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select * from public._compute_my_permissions(); $$;


ALTER FUNCTION "public"."get_my_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_primary_role"() RETURNS TABLE("role_id" "uuid", "role_name" "text", "priority" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ select * from public._compute_my_primary_role(); $$;


ALTER FUNCTION "public"."get_my_primary_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_usage"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
      select jsonb_build_object('user_id', p_user_id);
    $$;


ALTER FUNCTION "public"."get_usage"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role record;
  v_quotas jsonb := '[]'::jsonb;
  v_cnt record;
  v_subscription record;
  v_month_bounds record;
  v_monthly_tasks int := 0;
  v_monthly_rewards int := 0;
  v_monthly_categories int := 0;
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id);

  -- Récupérer le rôle de l'utilisateur
  SELECT r.id, r.name, r.priority
    INTO v_role
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id AND ur.is_active = true
  ORDER BY r.priority DESC
  LIMIT 1;

  -- Fallback sur abonnement ou visiteur si pas de rôle explicite
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

  -- Récupérer les quotas du rôle
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

  -- Récupérer les compteurs totaux (existant)
  SELECT tasks, rewards, categories
    INTO v_cnt
  FROM public.user_usage_counters
  WHERE user_id = p_user_id;

  -- ✅ NOUVEAU : Calculer les compteurs mensuels
  -- Utilise get_user_month_bounds_utc() pour respecter le timezone utilisateur
  BEGIN
    SELECT * INTO v_month_bounds FROM public.get_user_month_bounds_utc(p_user_id);
    
    -- Compter les tâches créées ce mois
    SELECT COUNT(*)::int INTO v_monthly_tasks
    FROM public.taches
    WHERE user_id = p_user_id
      AND created_at >= v_month_bounds.start_utc
      AND created_at < v_month_bounds.end_utc;
    
    -- Compter les récompenses créées ce mois
    SELECT COUNT(*)::int INTO v_monthly_rewards
    FROM public.recompenses
    WHERE user_id = p_user_id
      AND created_at >= v_month_bounds.start_utc
      AND created_at < v_month_bounds.end_utc;
    
    -- Compter les catégories créées ce mois
    SELECT COUNT(*)::int INTO v_monthly_categories
    FROM public.categories
    WHERE user_id = p_user_id
      AND created_at >= v_month_bounds.start_utc
      AND created_at < v_month_bounds.end_utc;
  EXCEPTION
    WHEN OTHERS THEN
      -- Si erreur (ex: get_user_month_bounds_utc échoue), mettre à 0
      v_monthly_tasks := 0;
      v_monthly_rewards := 0;
      v_monthly_categories := 0;
  END;

  -- ✅ NOUVEAU : Retourner usage + monthly_usage
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
    ),
    'monthly_usage', jsonb_build_object(
      'tasks', v_monthly_tasks,
      'rewards', v_monthly_rewards,
      'categories', v_monthly_categories
    )
  );
END
$$;


ALTER FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") IS 'Retourne role, quotas, usage total ET monthly_usage pour un utilisateur. Supporte quotas mensuels via get_user_month_bounds_utc().';



CREATE OR REPLACE FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_emails"() RETURNS TABLE("user_id" "uuid", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_emails"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_emails"() IS 'Récupère les emails des utilisateurs pour la gestion admin. Accessible aux admins seulement.';



CREATE OR REPLACE FUNCTION "public"."get_user_last_logins"() RETURNS TABLE("user_id" "uuid", "last_login" timestamp with time zone, "is_online" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_last_logins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") RETURNS TABLE("start_utc" timestamp with time zone, "end_utc" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") RETURNS TABLE("feature_name" "text", "can_access" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") RETURNS TABLE("role_id" "uuid", "role_name" "text", "priority" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text" DEFAULT 'monthly'::"text") RETURNS TABLE("quota_limit" integer, "current_usage" integer, "remaining" integer, "is_limited" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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

  -- FIX: Qualification explicite avec rq. pour éviter ambiguïté
  SELECT rq.quota_limit INTO v_limit
  FROM public.role_quotas rq
  JOIN public.roles r ON r.id = rq.role_id
  WHERE r.name = user_role
    AND rq.quota_type = get_user_quota_info.quota_type  -- FIX: qualification complète
    AND rq.quota_period = get_user_quota_info.quota_period;  -- FIX: qualification complète

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT NULL::integer, 0::integer, NULL::integer, false;
    RETURN;
  END IF;

  v_usage := 0;

  -- FIX: Qualification explicite des paramètres
  IF get_user_quota_info.quota_period = 'monthly' THEN
    SELECT start_utc, end_utc INTO v_start, v_end 
    FROM public.get_user_month_bounds_utc(user_uuid);

    IF get_user_quota_info.quota_type = 'monthly_tasks' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.taches
      WHERE user_id = user_uuid AND created_at >= v_start AND created_at < v_end;

    ELSIF get_user_quota_info.quota_type = 'monthly_rewards' THEN
      SELECT COUNT(*) INTO v_usage
      FROM public.recompenses
      WHERE user_id = user_uuid AND created_at >= v_start AND created_at < v_end;
    END IF;

  ELSE
    IF get_user_quota_info.quota_type = 'max_tasks' THEN
      SELECT COUNT(*) INTO v_usage FROM public.taches WHERE user_id = user_uuid;
    ELSIF get_user_quota_info.quota_type = 'max_rewards' THEN
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


ALTER FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") IS 'Retourne les informations de quota pour un utilisateur (limite, usage, restant) - Fixed ambiguous column reference (2025-11-20)';



CREATE OR REPLACE FUNCTION "public"."get_user_roles"("p_user_id" "uuid") RETURNS TABLE("role_id" "uuid", "role_name" "text", "priority" integer, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_roles"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_roles"("page_num" integer DEFAULT 1, "page_limit" integer DEFAULT 20, "role_filter" "text" DEFAULT 'all'::"text", "status_filter" "text" DEFAULT 'all'::"text") RETURNS TABLE("id" "uuid", "email" "text", "pseudo" "text", "created_at" timestamp with time zone, "last_login" timestamp with time zone, "account_status" "text", "is_online" boolean, "user_roles" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
DECLARE
  offset_val INT;
  total BIGINT;
BEGIN
  -- Calculer l'offset
  offset_val := (page_num - 1) * page_limit;

  -- Compter le total (pour la pagination)
  SELECT COUNT(DISTINCT p.id) INTO total
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE
    (status_filter = 'all' OR p.account_status = status_filter)
    AND (
      role_filter = 'all'
      OR (role_filter = 'no_roles' AND ur.id IS NULL)
      OR r.name = role_filter
    );

  -- Retourner les résultats
  RETURN QUERY
  SELECT
    p.id,
    u.email::TEXT,
    p.pseudo,
    p.created_at,
    u.last_sign_in_at AS last_login,
    p.account_status,
    false AS is_online, -- Placeholder: is_online n'existe pas dans le schéma actuel
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
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE
    (status_filter = 'all' OR p.account_status = status_filter)
    AND (
      role_filter = 'all'
      OR (role_filter = 'no_roles' AND ur.id IS NULL)
      OR r.name = role_filter
    )
  GROUP BY p.id, u.email, p.pseudo, p.created_at, u.last_sign_in_at, p.account_status
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET offset_val;
END;
$$;


ALTER FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") IS 'Récupère les utilisateurs avec leurs rôles (jointure auth.users pour email) - Fixed schema (2025-11-20)';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_subscription_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_subscription_role_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_subscription_role_change"() IS 'Gère les transitions de rôles lors des changements d''abonnement (free ↔ abonne)';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and ur.is_active and r.name='admin'
  ) or exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Retourne true si auth.uid() possède le rôle admin.';



CREATE OR REPLACE FUNCTION "public"."is_subscriber"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.abonnements a
    where a.user_id = p_user
      and a.status in ('trialing','active','past_due','paused')
  );
$$;


ALTER FUNCTION "public"."is_subscriber"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_system_role"("role_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT role_name = ANY (ARRAY['admin', 'visitor', 'free', 'abonne', 'staff'])
$$;


ALTER FUNCTION "public"."is_system_role"("role_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_system_role"("role_name" "text") IS 'Vérifie si un rôle est un rôle système protégé';



CREATE OR REPLACE FUNCTION "public"."log_card_creation"("_user" "uuid", "_entity" "text", "_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_card_creation"("_user" "uuid", "_entity" "text", "_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_system_role_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF public.is_system_role(OLD.name) THEN
    RAISE EXCEPTION 'Deleting a system role (%) is forbidden', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."prevent_system_role_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_system_role_deletion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."prevent_system_role_deletion"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_system_role_deletion"() IS 'Empêche la suppression accidentelle des rôles système';



CREATE OR REPLACE FUNCTION "public"."purge_old_consentements"("retention_months" integer DEFAULT 25) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin only' USING ERRCODE='42501';
  END IF;

  DELETE FROM public.consentements
  WHERE ts < (now() - make_interval(months => retention_months));
END
$$;


ALTER FUNCTION "public"."purge_old_consentements"("retention_months" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompenses_counter_del"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(old.user_id, auth.uid()), 'rewards', -1);
  return old;
end;
$$;


ALTER FUNCTION "public"."recompenses_counter_del"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompenses_counter_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'rewards', 1);
  return new;
end;
$$;


ALTER FUNCTION "public"."recompenses_counter_ins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rewards_counter_del"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform public.bump_usage_counter(old.user_id, 'rewards', -1);
  return old;
end $$;


ALTER FUNCTION "public"."rewards_counter_del"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rewards_counter_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform public.bump_usage_counter(new.user_id, 'rewards', 1);
  return new;
end $$;


ALTER FUNCTION "public"."rewards_counter_ins"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."recompenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "points_requis" integer DEFAULT 0 NOT NULL,
    "icone" "text",
    "couleur" "text",
    "imagepath" "text",
    "selected" boolean DEFAULT false NOT NULL,
    "visible_en_demo" boolean DEFAULT false NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recompenses_description_length_check" CHECK ((("description" IS NULL) OR ("length"("description") <= 1000))),
    CONSTRAINT "recompenses_imagepath_length_check" CHECK ((("imagepath" IS NULL) OR ("length"("imagepath") <= 2048))),
    CONSTRAINT "recompenses_label_length_check" CHECK (("length"("label") <= 200)),
    CONSTRAINT "recompenses_label_not_blank" CHECK ((("label" IS NOT NULL) AND ("btrim"("label") <> ''::"text"))),
    CONSTRAINT "recompenses_points_requis_positive" CHECK (("points_requis" >= 0))
);

ALTER TABLE ONLY "public"."recompenses" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."recompenses" OWNER TO "postgres";


COMMENT ON TABLE "public"."recompenses" IS 'Récompenses des utilisateurs avec système de points';



COMMENT ON COLUMN "public"."recompenses"."label" IS 'Nom de la récompense affiché';



COMMENT ON COLUMN "public"."recompenses"."description" IS 'Description détaillée de la récompense';



COMMENT ON COLUMN "public"."recompenses"."points_requis" IS 'Points nécessaires pour débloquer cette récompense';



COMMENT ON COLUMN "public"."recompenses"."icone" IS 'Icône de la récompense';



COMMENT ON COLUMN "public"."recompenses"."couleur" IS 'Couleur de la récompense';



COMMENT ON COLUMN "public"."recompenses"."imagepath" IS 'Chemin de l''image associée';



COMMENT ON COLUMN "public"."recompenses"."selected" IS 'Récompense sélectionnée par l''utilisateur';



COMMENT ON COLUMN "public"."recompenses"."visible_en_demo" IS 'Si true, cette récompense sera visible en mode démo pour tous les visiteurs';



COMMENT ON COLUMN "public"."recompenses"."user_id" IS 'Propriétaire de la récompense';



CREATE OR REPLACE FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") RETURNS SETOF "public"."recompenses"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at := now();
  return new;
end$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."taches_counter_del"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(old.user_id, 'tasks', -1);
  return old;
end $$;


ALTER FUNCTION "public"."taches_counter_del"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."taches_counter_ins"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  perform public.bump_usage_counter(coalesce(new.user_id, auth.uid()), 'tasks', 1);
  return new;
end;
$$;


ALTER FUNCTION "public"."taches_counter_ins"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_audit_permission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."tg_audit_permission_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_categories_fill_value"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."tg_categories_fill_value"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_categories_set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_categories_set_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_on_auth_user_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."tg_on_auth_user_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_parametres_lock_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if new.id is distinct from old.id then
    raise exception 'Column "id" is immutable on table "parametres"';
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."tg_parametres_lock_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_permission_changes_validate_json"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."tg_permission_changes_validate_json"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_recompenses_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
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


ALTER FUNCTION "public"."tg_recompenses_normalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_recompenses_set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_recompenses_set_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_taches_log_neutral"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- on log uniquement à la création de carte (INSERT)
  perform public.log_card_creation(new.user_id, 'tache', new.id);
  return new;
end
$$;


ALTER FUNCTION "public"."tg_taches_log_neutral"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_taches_normalize_categorie"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.categorie IS NOT NULL THEN
    NEW.categorie := regexp_replace(lower(trim(NEW.categorie)), '\s+', '-', 'g');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."tg_taches_normalize_categorie"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_taches_set_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_taches_set_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_taches_sync_categorie"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."tg_taches_sync_categorie"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select count(*) <= 1
  from storage.objects
  where bucket_id = 'avatars'
    and name like uid::text || '/%'
$$;


ALTER FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."abonnements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_data" "jsonb",
    "last_event_id" "text",
    "stripe_customer" "text",
    "plan" "text",
    "price_id" "text",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "latest_invoice" "text",
    CONSTRAINT "abonnements_period_chk" CHECK ((("current_period_start" IS NULL) OR ("current_period_end" IS NULL) OR ("current_period_end" >= "current_period_start"))),
    CONSTRAINT "abonnements_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'canceled'::"text", 'incomplete'::"text", 'incomplete_expired'::"text", 'unpaid'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."abonnements" OWNER TO "postgres";


COMMENT ON TABLE "public"."abonnements" IS 'Abonnements Stripe synchronisés';



COMMENT ON COLUMN "public"."abonnements"."status" IS 'Statut de l''abonnement Stripe';



COMMENT ON COLUMN "public"."abonnements"."raw_data" IS 'Données brutes Stripe (webhooks)';



CREATE TABLE IF NOT EXISTS "public"."account_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_status" "text",
    "new_status" "text",
    "old_role" "text",
    "new_role" "text",
    "changed_by" "uuid",
    "reason" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."account_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."account_audit_logs" IS 'Logs d''audit pour tracer les changements d''état et de rôle des comptes';



COMMENT ON COLUMN "public"."account_audit_logs"."action" IS 'Type d''action: status_change, role_change, quota_change, etc.';



COMMENT ON COLUMN "public"."account_audit_logs"."metadata" IS 'Données supplémentaires au format JSON';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "value" "text" NOT NULL,
    "label" "text" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_label_length_check" CHECK (("length"("label") <= 64)),
    CONSTRAINT "categories_value_length_check" CHECK (("length"("value") <= 64)),
    CONSTRAINT "categories_value_slug_check" CHECK (("value" ~ '^[a-z0-9_-]+$'::"text"))
);

ALTER TABLE ONLY "public"."categories" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Catégories personnalisées (NULL=globales).';



COMMENT ON COLUMN "public"."categories"."value" IS 'Slug (a-z0-9_-).';



COMMENT ON COLUMN "public"."categories"."label" IS 'Libellé affiché.';



CREATE TABLE IF NOT EXISTS "public"."consentements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type_consentement" "text" NOT NULL,
    "donnees" "text",
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mode" "text" DEFAULT 'refuse_all'::"text" NOT NULL,
    "choices" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "action" "text",
    "ua" "text",
    "locale" "text",
    "app_version" "text",
    "ip_hash" "text",
    "origin" "text",
    "ts_client" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" "text" DEFAULT '1.0.0'::"text" NOT NULL,
    CONSTRAINT "consentements_action_check" CHECK ((("action" IS NULL) OR ("action" = ANY (ARRAY['first_load'::"text", 'update'::"text", 'withdraw'::"text", 'restore'::"text"])))),
    CONSTRAINT "consentements_choices_is_object" CHECK (("jsonb_typeof"("choices") = 'object'::"text")),
    CONSTRAINT "consentements_ip_hash_len" CHECK ((("ip_hash" IS NULL) OR (("length"("ip_hash") >= 32) AND ("length"("ip_hash") <= 128)))),
    CONSTRAINT "consentements_mode_check" CHECK (("mode" = ANY (ARRAY['accept_all'::"text", 'refuse_all'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."consentements" OWNER TO "postgres";


COMMENT ON TABLE "public"."consentements" IS 'Journal immuable des consentements (RGPD). user_id NULL pour visiteurs.';



CREATE OR REPLACE VIEW "public"."consentements_latest" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "consentements"."id",
            "consentements"."user_id",
            "consentements"."version",
            "consentements"."mode",
            "consentements"."choices",
            "consentements"."action",
            "consentements"."ua",
            "consentements"."locale",
            "consentements"."app_version",
            "consentements"."ip_hash",
            "consentements"."origin",
            "consentements"."ts_client",
            "consentements"."created_at",
            "consentements"."ts",
            COALESCE("consentements"."ts", "consentements"."ts_client", "consentements"."created_at") AS "effective_ts"
           FROM "public"."consentements"
          WHERE ("consentements"."user_id" IS NOT NULL)
        )
 SELECT DISTINCT ON ("user_id") "id",
    "user_id",
    "version",
    "mode",
    "choices",
    "action",
    "ua",
    "locale",
    "app_version",
    "ip_hash",
    "origin",
    "ts_client",
    "created_at",
    "ts",
    "effective_ts"
   FROM "base"
  ORDER BY "user_id", "effective_ts" DESC;


ALTER VIEW "public"."consentements_latest" OWNER TO "postgres";


COMMENT ON VIEW "public"."consentements_latest" IS 'Dernier consentement par utilisateur (ts > ts_client > created_at).';



CREATE TABLE IF NOT EXISTS "public"."demo_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "imagepath" "text",
    "position" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "demo_cards_card_type_check" CHECK (("card_type" = ANY (ARRAY['task'::"text", 'reward'::"text"])))
);


ALTER TABLE "public"."demo_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."demo_cards" IS 'Cartes prédéfinies pour la démonstration aux visiteurs non connectés';



COMMENT ON COLUMN "public"."demo_cards"."card_type" IS 'Type de carte: task (tâche) ou reward (récompense)';



COMMENT ON COLUMN "public"."demo_cards"."position" IS 'Ordre d''affichage des cartes';



COMMENT ON COLUMN "public"."demo_cards"."is_active" IS 'Si true, la carte est visible pour les visiteurs';



CREATE TABLE IF NOT EXISTS "public"."features" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text" NOT NULL,
    "category" "text",
    CONSTRAINT "features_category_chk" CHECK (("category" = ANY (ARRAY['affichage'::"text", 'gestion'::"text", 'systeme'::"text", 'securite'::"text"])))
);


ALTER TABLE "public"."features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sha256_hash" "text" NOT NULL,
    "asset_type" "text" NOT NULL,
    "original_size" bigint NOT NULL,
    "compressed_size" bigint NOT NULL,
    "compression_ratio" numeric(5,4) GENERATED ALWAYS AS (
CASE
    WHEN ("original_size" > 0) THEN (("compressed_size")::numeric / ("original_size")::numeric)
    ELSE (0)::numeric
END) STORED,
    "conversion_ms" integer,
    "upload_ms" integer,
    "result" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "mime_type_original" "text",
    "mime_type_final" "text",
    "conversion_method" "text",
    CONSTRAINT "image_metrics_conversion_method_check" CHECK (("conversion_method" = ANY (ARRAY['client_webp'::"text", 'heic_to_jpeg_then_webp'::"text", 'heic_to_jpeg_only'::"text", 'none'::"text", 'svg_unchanged'::"text", 'fallback_original'::"text"]))),
    CONSTRAINT "valid_asset_type" CHECK (("asset_type" = ANY (ARRAY['tache'::"text", 'recompense'::"text"]))),
    CONSTRAINT "valid_result" CHECK (("result" = ANY (ARRAY['success'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."image_metrics" OWNER TO "supabase_admin";


COMMENT ON TABLE "public"."image_metrics" IS 'Métriques de téléchargement et compression d''images';



COMMENT ON COLUMN "public"."image_metrics"."mime_type_original" IS 'Type MIME du fichier original (ex: image/jpeg, image/heic)';



COMMENT ON COLUMN "public"."image_metrics"."mime_type_final" IS 'Type MIME après conversion (ex: image/webp)';



COMMENT ON COLUMN "public"."image_metrics"."conversion_method" IS 'Méthode de conversion utilisée : client_webp (direct), heic_to_jpeg_then_webp (iPhone), etc.';



CREATE TABLE IF NOT EXISTS "public"."parametres" (
    "id" integer DEFAULT 1 NOT NULL,
    "confettis" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "toasts_enabled" boolean DEFAULT true NOT NULL,
    CONSTRAINT "parametres_id_is_one" CHECK (("id" = 1))
);

ALTER TABLE ONLY "public"."parametres" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."parametres" OWNER TO "postgres";


COMMENT ON TABLE "public"."parametres" IS 'Paramètres globaux de l''application';



COMMENT ON COLUMN "public"."parametres"."id" IS 'ID unique (toujours 1 pour les paramètres globaux)';



COMMENT ON COLUMN "public"."parametres"."confettis" IS 'Contrôle l''affichage des confettis lors de la complétion des tâches';



COMMENT ON COLUMN "public"."parametres"."created_at" IS 'Date de création du paramètre';



COMMENT ON COLUMN "public"."parametres"."updated_at" IS 'Date de dernière modification du paramètre';



COMMENT ON COLUMN "public"."parametres"."toasts_enabled" IS 'Active/désactive les notifications toast dans l''interface (true par défaut)';



CREATE TABLE IF NOT EXISTS "public"."permission_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "changed_by" "uuid",
    "change_type" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "change_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "permission_changes_change_reason_length_check" CHECK ((("change_reason" IS NULL) OR ("length"("change_reason") <= 500))),
    CONSTRAINT "permission_changes_change_type_check" CHECK (("change_type" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"]))),
    CONSTRAINT "permission_changes_record_id_not_null" CHECK (("record_id" IS NOT NULL)),
    CONSTRAINT "permission_changes_table_name_not_blank" CHECK ((("table_name" IS NOT NULL) AND ("btrim"("table_name") <> ''::"text")))
);

ALTER TABLE ONLY "public"."permission_changes" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_changes" OWNER TO "postgres";


COMMENT ON TABLE "public"."permission_changes" IS 'Audit trail des modifications de permissions et rôles';



COMMENT ON COLUMN "public"."permission_changes"."changed_by" IS 'Utilisateur qui a effectué le changement (peut être NULL pour les actions système)';



COMMENT ON COLUMN "public"."permission_changes"."change_type" IS 'Type de changement: INSERT, UPDATE, DELETE';



COMMENT ON COLUMN "public"."permission_changes"."table_name" IS 'Nom de la table modifiée';



COMMENT ON COLUMN "public"."permission_changes"."record_id" IS 'ID de l''enregistrement modifié';



COMMENT ON COLUMN "public"."permission_changes"."old_values" IS 'Anciennes valeurs (JSON)';



COMMENT ON COLUMN "public"."permission_changes"."new_values" IS 'Nouvelles valeurs (JSON)';



COMMENT ON COLUMN "public"."permission_changes"."change_reason" IS 'Raison du changement (optionnel)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "pseudo" "text",
    "avatar_url" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_naissance" "date",
    "ville" "text",
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "deletion_scheduled_at" timestamp with time zone,
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'deletion_scheduled'::"text", 'pending_verification'::"text"]))),
    CONSTRAINT "profiles_birthdate_chk" CHECK ((("date_naissance" IS NULL) OR ("date_naissance" <= CURRENT_DATE)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."account_status" IS 'État du compte utilisateur: active, suspended, deletion_scheduled, pending_verification';



COMMENT ON COLUMN "public"."profiles"."deletion_scheduled_at" IS 'Date de suppression programmée pour les comptes en état deletion_scheduled (30 jours après la demande)';



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "feature_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "can_access" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."roles"."is_active" IS 'Indique si le rôle est actif et disponible pour attribution';



CREATE OR REPLACE VIEW "public"."role_permissions_admin_view" WITH ("security_invoker"='true') AS
 SELECT "rp"."id",
    "rp"."role_id",
    "rp"."feature_id",
    "rp"."can_access",
    "rp"."created_at",
    "rp"."updated_at",
    "r"."name" AS "role_name",
    "r"."display_name" AS "role_display_name",
    "f"."name" AS "feature_name",
    "f"."display_name" AS "feature_display_name",
    "f"."category"
   FROM (("public"."role_permissions" "rp"
     JOIN "public"."roles" "r" ON (("r"."id" = "rp"."role_id")))
     JOIN "public"."features" "f" ON (("f"."id" = "rp"."feature_id")));


ALTER VIEW "public"."role_permissions_admin_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_quotas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "quota_type" "text" NOT NULL,
    "quota_limit" integer NOT NULL,
    "quota_period" "text" DEFAULT 'monthly'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_quotas_quota_period_check" CHECK (("quota_period" = ANY (ARRAY['monthly'::"text", 'total'::"text", 'daily'::"text"])))
);


ALTER TABLE "public"."role_quotas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_quotas_backup_legacy" (
    "id" "uuid",
    "role_id" "uuid",
    "quota_type" "text",
    "quota_limit" integer,
    "quota_period" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."role_quotas_backup_legacy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "ligne" "text" NOT NULL,
    "ordre" integer NOT NULL,
    "type" "public"."transport_type" DEFAULT 'metro'::"public"."transport_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stations_label_length_check" CHECK (("length"("label") <= 150)),
    CONSTRAINT "stations_label_not_blank" CHECK ((("label" IS NOT NULL) AND ("btrim"("label") <> ''::"text"))),
    CONSTRAINT "stations_ligne_format_check" CHECK (("ligne" ~ '^[0-9]+(\s+(bis|ter))?$'::"text")),
    CONSTRAINT "stations_ligne_length_check" CHECK (("length"("ligne") <= 20)),
    CONSTRAINT "stations_ligne_not_blank" CHECK ((("ligne" IS NOT NULL) AND ("btrim"("ligne") <> ''::"text"))),
    CONSTRAINT "stations_ordre_max_check" CHECK (("ordre" <= 50)),
    CONSTRAINT "stations_ordre_positive" CHECK (("ordre" > 0))
);

ALTER TABLE ONLY "public"."stations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."stations" OWNER TO "postgres";


COMMENT ON TABLE "public"."stations" IS 'Stations de transport public (métro, tram, RER, bus)';



COMMENT ON COLUMN "public"."stations"."label" IS 'Nom de la station affiché';



COMMENT ON COLUMN "public"."stations"."ligne" IS 'Ligne de transport (ex: "1", "A", "T1")';



COMMENT ON COLUMN "public"."stations"."ordre" IS 'Ordre de la station sur la ligne (pour tri)';



COMMENT ON COLUMN "public"."stations"."type" IS 'Type de transport (metro, tram, rer, bus)';



CREATE TABLE IF NOT EXISTS "public"."subscription_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "details" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."taches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "categorie" "text",
    "categorie_id" "uuid",
    "points" integer DEFAULT 0 NOT NULL,
    "icone" "text",
    "couleur" "text",
    "aujourdhui" boolean DEFAULT false NOT NULL,
    "fait" boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "imagepath" "text",
    "visible_en_demo" boolean DEFAULT false NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "taches_description_length_check" CHECK (("length"("description") <= 1000)),
    CONSTRAINT "taches_label_length_check" CHECK (("length"("label") <= 200)),
    CONSTRAINT "taches_label_not_blank" CHECK ((("label" IS NOT NULL) AND ("btrim"("label") <> ''::"text"))),
    CONSTRAINT "taches_points_positive" CHECK (("points" >= 0)),
    CONSTRAINT "taches_position_positive" CHECK (("position" >= 0))
);

ALTER TABLE ONLY "public"."taches" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."taches" OWNER TO "postgres";


COMMENT ON TABLE "public"."taches" IS 'Tâches des utilisateurs avec système de récompenses';



COMMENT ON COLUMN "public"."taches"."label" IS 'Nom de la tâche affiché';



COMMENT ON COLUMN "public"."taches"."description" IS 'Description détaillée de la tâche';



COMMENT ON COLUMN "public"."taches"."categorie" IS 'Catégorie de la tâche (compatible avec l''ancien code)';



COMMENT ON COLUMN "public"."taches"."categorie_id" IS 'FK vers la table categories (nouveau système)';



COMMENT ON COLUMN "public"."taches"."points" IS 'Points de récompense pour cette tâche';



COMMENT ON COLUMN "public"."taches"."icone" IS 'Icône de la tâche';



COMMENT ON COLUMN "public"."taches"."couleur" IS 'Couleur de la tâche';



COMMENT ON COLUMN "public"."taches"."aujourdhui" IS 'Tâche du jour (filtrage useTachesDnd)';



COMMENT ON COLUMN "public"."taches"."fait" IS 'Tâche terminée (toggle dans useTaches)';



COMMENT ON COLUMN "public"."taches"."position" IS 'Ordre d''affichage (tri dans useTaches)';



COMMENT ON COLUMN "public"."taches"."imagepath" IS 'Chemin de l''image associée';



COMMENT ON COLUMN "public"."taches"."visible_en_demo" IS 'Si true, cette tâche sera visible en mode démo pour tous les visiteurs';



COMMENT ON COLUMN "public"."taches"."user_id" IS 'Propriétaire de la tâche';



CREATE TABLE IF NOT EXISTS "public"."user_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text",
    "dimensions" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "width" integer,
    "height" integer,
    "sha256_hash" "text",
    "version" integer DEFAULT 1,
    CONSTRAINT "user_assets_asset_type_check" CHECK (("asset_type" = ANY (ARRAY['task_image'::"text", 'reward_image'::"text"]))),
    CONSTRAINT "user_assets_file_size_nonneg" CHECK (("file_size" >= 0)),
    CONSTRAINT "valid_dimensions" CHECK (((("width" IS NULL) AND ("height" IS NULL)) OR (("width" > 0) AND ("height" > 0))))
);


ALTER TABLE "public"."user_assets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_assets"."width" IS 'Largeur de l''image en pixels';



COMMENT ON COLUMN "public"."user_assets"."height" IS 'Hauteur de l''image en pixels';



COMMENT ON COLUMN "public"."user_assets"."sha256_hash" IS 'Hash SHA256 du fichier pour détecter les doublons';



COMMENT ON COLUMN "public"."user_assets"."version" IS 'Version du fichier (incrémenté à chaque mise à jour)';



CREATE TABLE IF NOT EXISTS "public"."user_prefs" (
    "user_id" "uuid" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Paris'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_usage_counters" (
    "user_id" "uuid" NOT NULL,
    "tasks" integer DEFAULT 0 NOT NULL,
    "rewards" integer DEFAULT 0 NOT NULL,
    "categories" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_usage_counters" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_role_quota_matrix" WITH ("security_invoker"='true') AS
 SELECT "r"."name" AS "role_name",
    "rq"."quota_type",
    "rq"."quota_period",
    "rq"."quota_limit"
   FROM ("public"."role_quotas" "rq"
     JOIN "public"."roles" "r" ON (("r"."id" = "rq"."role_id")))
  ORDER BY "r"."name", "rq"."quota_type", "rq"."quota_period";


ALTER VIEW "public"."v_role_quota_matrix" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_user_storage_usage" WITH ("security_invoker"='true') AS
 SELECT "user_id",
    ("count"(*))::integer AS "files_count",
    (COALESCE("sum"("file_size"), (0)::numeric))::bigint AS "bytes_total",
    "max"("created_at") AS "last_upload_at"
   FROM "public"."user_assets" "ua"
  GROUP BY "user_id";


ALTER VIEW "public"."v_user_storage_usage" OWNER TO "postgres";


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
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_namespaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."iceberg_namespaces" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."iceberg_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "namespace_id" "uuid" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "location" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
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


ALTER TABLE ONLY "public"."abonnements"
    ADD CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abonnements"
    ADD CONSTRAINT "abonnements_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."account_audit_logs"
    ADD CONSTRAINT "account_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consentements"
    ADD CONSTRAINT "consentements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_cards"
    ADD CONSTRAINT "demo_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_metrics"
    ADD CONSTRAINT "image_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parametres"
    ADD CONSTRAINT "parametres_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_changes"
    ADD CONSTRAINT "permission_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pseudo_unique" UNIQUE ("pseudo");



ALTER TABLE ONLY "public"."recompenses"
    ADD CONSTRAINT "recompenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_feature_id_key" UNIQUE ("role_id", "feature_id");



ALTER TABLE ONLY "public"."role_quotas"
    ADD CONSTRAINT "role_quotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_quotas"
    ADD CONSTRAINT "role_quotas_role_id_quota_type_quota_period_key" UNIQUE ("role_id", "quota_type", "quota_period");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_logs"
    ADD CONSTRAINT "subscription_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taches"
    ADD CONSTRAINT "taches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_assets"
    ADD CONSTRAINT "unique_user_file_path" UNIQUE ("user_id", "file_path");



ALTER TABLE ONLY "public"."user_assets"
    ADD CONSTRAINT "user_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."user_usage_counters"
    ADD CONSTRAINT "user_usage_counters_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "abonnements_active_idx" ON "public"."abonnements" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'paused'::"text"]));



CREATE INDEX "abonnements_active_user_created_desc_idx" ON "public"."abonnements" USING "btree" ("user_id", "created_at" DESC) WHERE ("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'paused'::"text"]));



CREATE INDEX "abonnements_status_idx" ON "public"."abonnements" USING "btree" ("status");



CREATE INDEX "abonnements_stripe_subscription_id_idx" ON "public"."abonnements" USING "btree" ("stripe_subscription_id");



CREATE UNIQUE INDEX "abonnements_unique_active_per_user" ON "public"."abonnements" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'paused'::"text"]));



CREATE INDEX "abonnements_user_created_desc_idx" ON "public"."abonnements" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "account_audit_logs_user_created_desc_idx" ON "public"."account_audit_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "categories_global_value_unique" ON "public"."categories" USING "btree" ("value") WHERE ("user_id" IS NULL);



CREATE INDEX "categories_user_id_idx" ON "public"."categories" USING "btree" ("user_id");



CREATE UNIQUE INDEX "categories_user_value_unique" ON "public"."categories" USING "btree" ("user_id", "value") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "categories_value_idx" ON "public"."categories" USING "btree" ("value");



CREATE INDEX "consentements_origin_created_idx" ON "public"."consentements" USING "btree" ("origin", "created_at" DESC);



CREATE INDEX "consentements_ts_idx" ON "public"."consentements" USING "btree" ("ts");



CREATE INDEX "consentements_user_created_idx" ON "public"."consentements" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_abonnements_stripe_customer" ON "public"."abonnements" USING "btree" ("stripe_customer");



CREATE INDEX "idx_abonnements_user_status_created" ON "public"."abonnements" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE UNIQUE INDEX "idx_abos_last_event_id_unique" ON "public"."abonnements" USING "btree" ("last_event_id") WHERE ("last_event_id" IS NOT NULL);



CREATE INDEX "idx_account_audit_logs_action" ON "public"."account_audit_logs" USING "btree" ("action");



CREATE INDEX "idx_account_audit_logs_changed_by" ON "public"."account_audit_logs" USING "btree" ("changed_by");



CREATE INDEX "idx_account_audit_logs_created_at" ON "public"."account_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_account_audit_logs_user_id" ON "public"."account_audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_categories_user_created" ON "public"."categories" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_consentements_user_ts" ON "public"."consentements" USING "btree" ("user_id", "ts");



CREATE INDEX "idx_demo_cards_active" ON "public"."demo_cards" USING "btree" ("is_active");



CREATE INDEX "idx_demo_cards_position" ON "public"."demo_cards" USING "btree" ("position");



CREATE INDEX "idx_demo_cards_type" ON "public"."demo_cards" USING "btree" ("card_type");



CREATE INDEX "idx_features_active_category" ON "public"."features" USING "btree" ("is_active", "category");



CREATE INDEX "idx_image_metrics_created_at" ON "public"."image_metrics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_image_metrics_sha256" ON "public"."image_metrics" USING "btree" ("sha256_hash");



CREATE INDEX "idx_image_metrics_user_id" ON "public"."image_metrics" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_account_status" ON "public"."profiles" USING "btree" ("account_status");



CREATE INDEX "idx_profiles_deletion_scheduled" ON "public"."profiles" USING "btree" ("deletion_scheduled_at") WHERE ("account_status" = 'deletion_scheduled'::"text");



CREATE INDEX "idx_profiles_is_admin" ON "public"."profiles" USING "btree" ("is_admin");



CREATE INDEX "idx_profiles_updated_at" ON "public"."profiles" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_recompenses_user_created" ON "public"."recompenses" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_role_permissions_feature_id" ON "public"."role_permissions" USING "btree" ("feature_id");



CREATE INDEX "idx_role_permissions_role_access" ON "public"."role_permissions" USING "btree" ("role_id", "can_access");



CREATE INDEX "idx_role_quotas_role_type" ON "public"."role_quotas" USING "btree" ("role_id", "quota_type");



CREATE INDEX "idx_roles_is_active" ON "public"."roles" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_roles_priority_name" ON "public"."roles" USING "btree" ("priority" DESC, "name");



CREATE INDEX "idx_taches_user_created" ON "public"."taches" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_user_assets_created" ON "public"."user_assets" USING "btree" ("created_at");



CREATE INDEX "idx_user_assets_sha256" ON "public"."user_assets" USING "btree" ("sha256_hash") WHERE ("sha256_hash" IS NOT NULL);



CREATE INDEX "idx_user_assets_type" ON "public"."user_assets" USING "btree" ("user_id", "asset_type");



CREATE UNIQUE INDEX "idx_user_assets_unique_hash" ON "public"."user_assets" USING "btree" ("user_id", "sha256_hash") WHERE ("sha256_hash" IS NOT NULL);



CREATE INDEX "idx_user_assets_user_created_desc" ON "public"."user_assets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_assets_user_id" ON "public"."user_assets" USING "btree" ("user_id");



CREATE INDEX "idx_user_prefs_tz" ON "public"."user_prefs" USING "btree" ("timezone");



CREATE INDEX "idx_user_roles_expires_at" ON "public"."user_roles" USING "btree" ("expires_at");



CREATE INDEX "idx_user_roles_expiring_active" ON "public"."user_roles" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_user_roles_is_active" ON "public"."user_roles" USING "btree" ("is_active");



CREATE INDEX "idx_user_roles_role_active" ON "public"."user_roles" USING "btree" ("role_id", "is_active");



CREATE INDEX "idx_user_roles_role_id" ON "public"."user_roles" USING "btree" ("role_id");



CREATE INDEX "idx_user_roles_user_active" ON "public"."user_roles" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_roles_user_active_inc" ON "public"."user_roles" USING "btree" ("user_id", "is_active") INCLUDE ("role_id");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "permission_changes_change_type_idx" ON "public"."permission_changes" USING "btree" ("change_type");



CREATE INDEX "permission_changes_changed_at_idx" ON "public"."permission_changes" USING "btree" ("changed_at" DESC);



CREATE INDEX "permission_changes_changed_by_idx" ON "public"."permission_changes" USING "btree" ("changed_by");



CREATE INDEX "permission_changes_created_at_idx" ON "public"."permission_changes" USING "btree" ("created_at" DESC);



CREATE INDEX "permission_changes_record_id_idx" ON "public"."permission_changes" USING "btree" ("record_id");



CREATE INDEX "permission_changes_table_name_idx" ON "public"."permission_changes" USING "btree" ("table_name");



CREATE INDEX "permission_changes_table_type_idx" ON "public"."permission_changes" USING "btree" ("table_name", "change_type");



CREATE UNIQUE INDEX "recompenses_one_selected_per_user" ON "public"."recompenses" USING "btree" ("user_id") WHERE (("selected" IS TRUE) AND ("user_id" IS NOT NULL));



CREATE INDEX "recompenses_points_requis_idx" ON "public"."recompenses" USING "btree" ("points_requis");



CREATE INDEX "recompenses_selected_idx" ON "public"."recompenses" USING "btree" ("selected");



CREATE INDEX "recompenses_user_id_idx" ON "public"."recompenses" USING "btree" ("user_id");



CREATE INDEX "recompenses_user_selected_idx" ON "public"."recompenses" USING "btree" ("user_id", "selected");



CREATE INDEX "recompenses_visible_en_demo_idx" ON "public"."recompenses" USING "btree" ("visible_en_demo");



CREATE INDEX "stations_label_idx" ON "public"."stations" USING "btree" ("label");



CREATE INDEX "stations_ligne_type_idx" ON "public"."stations" USING "btree" ("ligne", "type");



CREATE UNIQUE INDEX "stations_type_ligne_label_unique" ON "public"."stations" USING "btree" ("type", "ligne", "label");



CREATE INDEX "stations_type_ligne_ordre_idx" ON "public"."stations" USING "btree" ("type", "ligne", "ordre");



CREATE UNIQUE INDEX "stations_type_ligne_ordre_unique" ON "public"."stations" USING "btree" ("type", "ligne", "ordre");



CREATE INDEX "subscription_logs_user_event_time_idx" ON "public"."subscription_logs" USING "btree" ("user_id", "event_type", "timestamp" DESC);



CREATE INDEX "subscription_logs_user_time_idx" ON "public"."subscription_logs" USING "btree" ("user_id", "timestamp" DESC);



CREATE INDEX "taches_categorie_id_idx" ON "public"."taches" USING "btree" ("categorie_id");



CREATE INDEX "taches_categorie_idx" ON "public"."taches" USING "btree" ("categorie");



CREATE INDEX "taches_fait_idx" ON "public"."taches" USING "btree" ("fait");



CREATE INDEX "taches_user_aujourdhui_idx" ON "public"."taches" USING "btree" ("user_id", "aujourdhui");



CREATE INDEX "taches_user_fait_idx" ON "public"."taches" USING "btree" ("user_id", "fait");



CREATE INDEX "taches_user_fait_true_idx" ON "public"."taches" USING "btree" ("user_id") WHERE ("fait" IS TRUE);



CREATE INDEX "taches_user_id_idx" ON "public"."taches" USING "btree" ("user_id");



CREATE INDEX "taches_user_position_idx" ON "public"."taches" USING "btree" ("user_id", "position");



CREATE INDEX "taches_visible_en_demo_idx" ON "public"."taches" USING "btree" ("visible_en_demo");



CREATE UNIQUE INDEX "uq_user_roles_one_active" ON "public"."user_roles" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "idx_iceberg_namespaces_bucket_id" ON "storage"."iceberg_namespaces" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "idx_iceberg_tables_namespace_id" ON "storage"."iceberg_tables" USING "btree" ("namespace_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE OR REPLACE TRIGGER "a00_categories_set_user_id_before" BEFORE INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."tg_categories_set_user_id"();



CREATE OR REPLACE TRIGGER "a00_recompenses_set_user_id_before" BEFORE INSERT ON "public"."recompenses" FOR EACH ROW EXECUTE FUNCTION "public"."tg_recompenses_set_user_id"();



CREATE OR REPLACE TRIGGER "a00_taches_set_user_id_before" BEFORE INSERT ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."tg_taches_set_user_id"();



CREATE OR REPLACE TRIGGER "a01_categories_fill_value_before" BEFORE INSERT OR UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."tg_categories_fill_value"();



CREATE OR REPLACE TRIGGER "a10_taches_normalize_categorie" BEFORE INSERT OR UPDATE OF "categorie" ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."tg_taches_normalize_categorie"();



CREATE OR REPLACE TRIGGER "a20_taches_sync_categorie" BEFORE INSERT OR UPDATE OF "categorie", "user_id" ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."tg_taches_sync_categorie"();



CREATE OR REPLACE TRIGGER "a99_categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "a99_recompenses_set_updated_at" BEFORE UPDATE ON "public"."recompenses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "a99_taches_set_updated_at" BEFORE UPDATE ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "audit_features_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."features" FOR EACH ROW EXECUTE FUNCTION "public"."tg_audit_permission_change"();



CREATE OR REPLACE TRIGGER "audit_role_permissions_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."tg_audit_permission_change"();



CREATE OR REPLACE TRIGGER "audit_roles_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_audit_permission_change"();



CREATE OR REPLACE TRIGGER "audit_user_roles_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_audit_permission_change"();



CREATE OR REPLACE TRIGGER "on_subscription_change" AFTER INSERT OR UPDATE ON "public"."abonnements" FOR EACH ROW EXECUTE FUNCTION "public"."handle_subscription_role_change"();



CREATE OR REPLACE TRIGGER "parametres_lock_id" BEFORE UPDATE ON "public"."parametres" FOR EACH ROW EXECUTE FUNCTION "public"."tg_parametres_lock_id"();



CREATE OR REPLACE TRIGGER "permission_changes_validate_json" BEFORE INSERT OR UPDATE ON "public"."permission_changes" FOR EACH ROW EXECUTE FUNCTION "public"."tg_permission_changes_validate_json"();



CREATE OR REPLACE TRIGGER "prevent_system_role_delete_trigger" BEFORE DELETE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_role_delete"();



CREATE OR REPLACE TRIGGER "prevent_system_role_deletion_trigger" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_system_role_deletion"();



CREATE OR REPLACE TRIGGER "recompenses_normalize" BEFORE INSERT OR UPDATE ON "public"."recompenses" FOR EACH ROW EXECUTE FUNCTION "public"."tg_recompenses_normalize"();



CREATE OR REPLACE TRIGGER "set_abonnements_updated_at" BEFORE INSERT OR UPDATE ON "public"."abonnements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_features_updated_at" BEFORE UPDATE ON "public"."features" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_parametres_updated_at" BEFORE UPDATE ON "public"."parametres" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_role_permissions_updated_at" BEFORE INSERT OR UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_roles_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_user_roles_updated_at" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "stations_set_updated_at" BEFORE UPDATE ON "public"."stations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "taches_sync_categorie" BEFORE INSERT OR UPDATE ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."tg_taches_sync_categorie"();

ALTER TABLE "public"."taches" DISABLE TRIGGER "taches_sync_categorie";



CREATE OR REPLACE TRIGGER "trg_categories_ctr_del" AFTER DELETE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."categories_counter_del"();



CREATE OR REPLACE TRIGGER "trg_categories_ctr_ins" AFTER INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."categories_counter_ins"();



CREATE OR REPLACE TRIGGER "trg_recompenses_ctr_del" AFTER DELETE ON "public"."recompenses" FOR EACH ROW EXECUTE FUNCTION "public"."recompenses_counter_del"();



CREATE OR REPLACE TRIGGER "trg_recompenses_ctr_ins" AFTER INSERT ON "public"."recompenses" FOR EACH ROW EXECUTE FUNCTION "public"."recompenses_counter_ins"();



CREATE OR REPLACE TRIGGER "trg_taches_ctr_del" AFTER DELETE ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."taches_counter_del"();



CREATE OR REPLACE TRIGGER "trg_taches_ctr_ins" AFTER INSERT ON "public"."taches" FOR EACH ROW EXECUTE FUNCTION "public"."taches_counter_ins"();



CREATE OR REPLACE TRIGGER "trg_user_assets_updated_at" BEFORE UPDATE ON "public"."user_assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."abonnements"
    ADD CONSTRAINT "abonnements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_audit_logs"
    ADD CONSTRAINT "account_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."account_audit_logs"
    ADD CONSTRAINT "account_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consentements"
    ADD CONSTRAINT "consentements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."image_metrics"
    ADD CONSTRAINT "image_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_changes"
    ADD CONSTRAINT "permission_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recompenses"
    ADD CONSTRAINT "recompenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_quotas"
    ADD CONSTRAINT "role_quotas_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_logs"
    ADD CONSTRAINT "subscription_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."taches"
    ADD CONSTRAINT "taches_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."taches"
    ADD CONSTRAINT "taches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_assets"
    ADD CONSTRAINT "user_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_prefs"
    ADD CONSTRAINT "user_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_usage_counters"
    ADD CONSTRAINT "user_usage_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_namespaces"
    ADD CONSTRAINT "iceberg_namespaces_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."iceberg_tables"
    ADD CONSTRAINT "iceberg_tables_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_analytics"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admins can view all image metrics" ON "public"."image_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text") AND ("ur"."is_active" = true)))));



CREATE POLICY "Users can insert own image metrics" ON "public"."image_metrics" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own image metrics" ON "public"."image_metrics" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."abonnements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "abonnements_select_unified" ON "public"."abonnements" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



ALTER TABLE "public"."account_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_audit_logs_insert_admin" ON "public"."account_audit_logs" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "account_audit_logs_select_unified" ON "public"."account_audit_logs" FOR SELECT USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "block_all_access" ON "public"."role_quotas_backup_legacy" USING (false);



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_own" ON "public"."categories" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "categories_insert_unified" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'category'::"text", 'total'::"text") AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'category'::"text", 'monthly'::"text"))));



CREATE POLICY "categories_select_auth" ON "public"."categories" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IS NULL) OR "public"."is_admin"()));



CREATE POLICY "categories_update_own" ON "public"."categories" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"())) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



ALTER TABLE "public"."consentements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consentements_delete" ON "public"."consentements" FOR DELETE TO "authenticated", "anon" USING (false);



CREATE POLICY "consentements_insert_unified" ON "public"."consentements" FOR INSERT WITH CHECK ((("user_id" IS NULL) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "consentements_select" ON "public"."consentements" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "consentements_update" ON "public"."consentements" FOR UPDATE TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."demo_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "demo_cards_select_unified" ON "public"."demo_cards" FOR SELECT USING (("public"."is_admin"() OR ("is_active" = true)));



ALTER TABLE "public"."features" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "features_select_unified" ON "public"."features" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("is_active" = true)));



ALTER TABLE "public"."image_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "logs_select_user_or_admin" ON "public"."subscription_logs" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



ALTER TABLE "public"."parametres" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parametres_delete_admin_only" ON "public"."parametres" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "parametres_insert_authenticated_only" ON "public"."parametres" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "parametres_select_all_including_anon" ON "public"."parametres" FOR SELECT TO "authenticated", "anon" USING (true);



COMMENT ON POLICY "parametres_select_all_including_anon" ON "public"."parametres" IS 'Permet aux visiteurs (anon) et authentifiés de lire les paramètres globaux';



CREATE POLICY "parametres_update_authenticated" ON "public"."parametres" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."permission_changes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_changes_delete_admin" ON "public"."permission_changes" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "permission_changes_insert_admin" ON "public"."permission_changes" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "permission_changes_select_admin" ON "public"."permission_changes" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "permission_changes_update_admin" ON "public"."permission_changes" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_unified" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "id")));



CREATE POLICY "profiles_select_unified" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "profiles_update_unified" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR ("id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."recompenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recompenses_delete_unified" ON "public"."recompenses" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "recompenses_insert_unified" ON "public"."recompenses" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'reward'::"text", 'total'::"text") AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'reward'::"text", 'monthly'::"text"))));



CREATE POLICY "recompenses_select_demo" ON "public"."recompenses" FOR SELECT TO "anon" USING (("visible_en_demo" = true));



CREATE POLICY "recompenses_select_unified" ON "public"."recompenses" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("user_id" IS NULL) AND ("visible_en_demo" = true))));



CREATE POLICY "recompenses_update_unified" ON "public"."recompenses" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_select_unified" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("ur"."role_id" = "role_permissions"."role_id") AND ("ur"."is_active" = true))))));



ALTER TABLE "public"."role_quotas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_quotas_backup_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_quotas_select_public" ON "public"."role_quotas" FOR SELECT USING (true);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_select_unified" ON "public"."roles" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("is_active" = true)));



ALTER TABLE "public"."stations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stations_select_anon" ON "public"."stations" FOR SELECT TO "anon" USING (true);



CREATE POLICY "stations_select_unified" ON "public"."stations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."subscription_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."taches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "taches_delete_unified" ON "public"."taches" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "taches_insert_unified" ON "public"."taches" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'task'::"text", 'total'::"text") AND "public"."check_user_quota"(( SELECT "auth"."uid"() AS "uid"), 'task'::"text", 'monthly'::"text"))));



CREATE POLICY "taches_select_demo" ON "public"."taches" FOR SELECT TO "anon" USING (("visible_en_demo" = true));



CREATE POLICY "taches_select_owner_or_admin" ON "public"."taches" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "taches_update_unified" ON "public"."taches" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."user_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_assets_delete_unified" ON "public"."user_assets" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "user_assets_insert_self" ON "public"."user_assets" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_assets_select_unified" ON "public"."user_assets" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "user_assets_update_unified" ON "public"."user_assets" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id"))) WITH CHECK (("public"."is_admin"() OR (( SELECT "auth"."uid"() AS "uid") = "user_id")));



ALTER TABLE "public"."user_prefs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_prefs_select_self" ON "public"."user_prefs" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_prefs_update_self" ON "public"."user_prefs" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "user_prefs_upsert_self" ON "public"."user_prefs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_insert_unified" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role_id" IN ( SELECT "roles"."id"
   FROM "public"."roles"
  WHERE (("roles"."name" = 'free'::"text") AND ("roles"."is_active" = true)))))));



CREATE POLICY "user_roles_select_unified" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "user_roles_update_unified" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("role_id" IN ( SELECT "roles"."id"
   FROM "public"."roles"
  WHERE (("roles"."name" = 'free'::"text") AND ("roles"."is_active" = true)))))));



ALTER TABLE "public"."user_usage_counters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_usage_counters_select_self" ON "public"."user_usage_counters" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Admins can delete all avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text") AND ("ur"."is_active" = true))))));



CREATE POLICY "Admins can delete all images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text") AND ("ur"."is_active" = true))))));



CREATE POLICY "Admins can view all avatars" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text") AND ("ur"."is_active" = true))))));



CREATE POLICY "Admins can view all images" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."user_roles" "ur"
     JOIN "public"."roles" "r" ON (("ur"."role_id" = "r"."id")))
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("r"."name" = 'admin'::"text") AND ("ur"."is_active" = true))))));



CREATE POLICY "Users can delete own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can delete own images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can update own avatars" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1]))) WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can update own images" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1]))) WITH CHECK ((("bucket_id" = 'images'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can upload own avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can upload own images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'images'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can view own avatars" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Users can view own images" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_namespaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."_compute_my_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."_compute_my_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_compute_my_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_compute_my_primary_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."_compute_my_primary_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_compute_my_primary_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_self_or_admin"("p_target" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_usage_counter"("p_user" "uuid", "p_col" "text", "p_delta" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."categories_counter_del"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."categories_counter_del"() TO "anon";
GRANT ALL ON FUNCTION "public"."categories_counter_del"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categories_counter_del"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."categories_counter_ins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."categories_counter_ins"() TO "anon";
GRANT ALL ON FUNCTION "public"."categories_counter_ins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categories_counter_ins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid", "reason" "text", "metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid", "reason" "text", "metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid", "reason" "text", "metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_account_status"("target_user_id" "uuid", "new_status" "text", "changed_by_user_id" "uuid", "reason" "text", "metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_duplicate_image"("p_sha256_hash" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_image_quota"("p_user_id" "uuid", "p_asset_type" "text", "p_file_size" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_quota"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_quota_free_only"("p_user_id" "uuid", "p_quota_type" "text", "p_period" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"("retention_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."email_exists"("email_to_check" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."email_exists"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."email_exists"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."email_exists"("email_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_unique_pseudo"("base" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_unique_pseudo"("base" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_unique_pseudo"("base" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_history"("user_uuid" "uuid", "limit_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_account_status"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_status"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_status"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_status"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_confettis"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_confettis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_confettis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_confettis"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_demo_cards"("card_type_filter" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_demo_cards"("card_type_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_demo_cards"("card_type_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_demo_cards"("card_type_filter" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_demo_rewards"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_demo_rewards"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_demo_rewards"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_demo_rewards"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_demo_tasks"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_demo_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_demo_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_demo_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_image_analytics_summary"() TO "postgres";
GRANT ALL ON FUNCTION "public"."get_image_analytics_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_image_analytics_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_image_analytics_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_migration_report"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_migration_report"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_migration_report"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_migration_report"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_primary_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_primary_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_primary_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_usage"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_usage"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_usage"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_usage_fast"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_assets_stats"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_emails"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_emails"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_last_logins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_last_logins"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_last_logins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_last_logins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_month_bounds_utc"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_primary_role"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quota_info"("user_uuid" "uuid", "quota_type" "text", "quota_period" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"("page_num" integer, "page_limit" integer, "role_filter" "text", "status_filter" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_subscription_role_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_subscription_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_subscription_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_subscription_role_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_subscriber"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_subscriber"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_subscriber"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_system_role"("role_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_system_role"("role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_system_role"("role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_system_role"("role_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_card_creation"("_user" "uuid", "_entity" "text", "_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_card_creation"("_user" "uuid", "_entity" "text", "_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_card_creation"("_user" "uuid", "_entity" "text", "_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_system_role_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_role_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_role_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_system_role_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_system_role_deletion"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_system_role_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_system_role_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_old_consentements"("retention_months" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_old_consentements"("retention_months" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."purge_old_consentements"("retention_months" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purge_old_consentements"("retention_months" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recompenses_counter_del"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompenses_counter_del"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompenses_counter_del"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompenses_counter_ins"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompenses_counter_ins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompenses_counter_ins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rewards_counter_del"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rewards_counter_del"() TO "anon";
GRANT ALL ON FUNCTION "public"."rewards_counter_del"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rewards_counter_del"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rewards_counter_ins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rewards_counter_ins"() TO "anon";
GRANT ALL ON FUNCTION "public"."rewards_counter_ins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rewards_counter_ins"() TO "service_role";



GRANT ALL ON TABLE "public"."recompenses" TO "anon";
GRANT ALL ON TABLE "public"."recompenses" TO "authenticated";
GRANT ALL ON TABLE "public"."recompenses" TO "service_role";



GRANT ALL ON FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."select_recompense_atomic"("p_reward_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."taches_counter_del"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."taches_counter_del"() TO "anon";
GRANT ALL ON FUNCTION "public"."taches_counter_del"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."taches_counter_del"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."taches_counter_ins"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."taches_counter_ins"() TO "anon";
GRANT ALL ON FUNCTION "public"."taches_counter_ins"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."taches_counter_ins"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_audit_permission_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_audit_permission_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_audit_permission_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_audit_permission_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_categories_fill_value"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_categories_fill_value"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_categories_fill_value"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_categories_set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_categories_set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_categories_set_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_on_auth_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_on_auth_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_on_auth_user_created"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_parametres_lock_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_parametres_lock_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_parametres_lock_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_parametres_lock_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_permission_changes_validate_json"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_permission_changes_validate_json"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_permission_changes_validate_json"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_permission_changes_validate_json"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_recompenses_normalize"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_recompenses_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_recompenses_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_recompenses_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_recompenses_set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_recompenses_set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_recompenses_set_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_taches_log_neutral"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_taches_log_neutral"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_taches_log_neutral"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_taches_normalize_categorie"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_taches_normalize_categorie"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_taches_normalize_categorie"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_taches_set_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_taches_set_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_taches_set_user_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tg_taches_sync_categorie"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_taches_sync_categorie"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_taches_sync_categorie"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_taches_sync_categorie"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_upload_avatar"("uid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."abonnements" TO "anon";
GRANT ALL ON TABLE "public"."abonnements" TO "authenticated";
GRANT ALL ON TABLE "public"."abonnements" TO "service_role";



GRANT ALL ON TABLE "public"."account_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."account_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."account_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."consentements" TO "anon";
GRANT ALL ON TABLE "public"."consentements" TO "authenticated";
GRANT ALL ON TABLE "public"."consentements" TO "service_role";



GRANT ALL ON TABLE "public"."consentements_latest" TO "anon";
GRANT ALL ON TABLE "public"."consentements_latest" TO "authenticated";
GRANT ALL ON TABLE "public"."consentements_latest" TO "service_role";



GRANT ALL ON TABLE "public"."demo_cards" TO "anon";
GRANT ALL ON TABLE "public"."demo_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."demo_cards" TO "service_role";



GRANT ALL ON TABLE "public"."features" TO "anon";
GRANT ALL ON TABLE "public"."features" TO "authenticated";
GRANT ALL ON TABLE "public"."features" TO "service_role";



GRANT ALL ON TABLE "public"."image_metrics" TO "postgres";
GRANT ALL ON TABLE "public"."image_metrics" TO "anon";
GRANT ALL ON TABLE "public"."image_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."image_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."parametres" TO "anon";
GRANT ALL ON TABLE "public"."parametres" TO "authenticated";
GRANT ALL ON TABLE "public"."parametres" TO "service_role";



GRANT ALL ON TABLE "public"."permission_changes" TO "anon";
GRANT ALL ON TABLE "public"."permission_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_changes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions_admin_view" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions_admin_view" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions_admin_view" TO "service_role";



GRANT ALL ON TABLE "public"."role_quotas" TO "anon";
GRANT ALL ON TABLE "public"."role_quotas" TO "authenticated";
GRANT ALL ON TABLE "public"."role_quotas" TO "service_role";



GRANT ALL ON TABLE "public"."role_quotas_backup_legacy" TO "anon";
GRANT ALL ON TABLE "public"."role_quotas_backup_legacy" TO "authenticated";
GRANT ALL ON TABLE "public"."role_quotas_backup_legacy" TO "service_role";



GRANT ALL ON TABLE "public"."stations" TO "anon";
GRANT ALL ON TABLE "public"."stations" TO "authenticated";
GRANT ALL ON TABLE "public"."stations" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_logs" TO "anon";
GRANT ALL ON TABLE "public"."subscription_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_logs" TO "service_role";



GRANT ALL ON TABLE "public"."taches" TO "anon";
GRANT ALL ON TABLE "public"."taches" TO "authenticated";
GRANT ALL ON TABLE "public"."taches" TO "service_role";



GRANT ALL ON TABLE "public"."user_assets" TO "anon";
GRANT ALL ON TABLE "public"."user_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_assets" TO "service_role";



GRANT ALL ON TABLE "public"."user_prefs" TO "anon";
GRANT ALL ON TABLE "public"."user_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_usage_counters" TO "anon";
GRANT ALL ON TABLE "public"."user_usage_counters" TO "authenticated";
GRANT ALL ON TABLE "public"."user_usage_counters" TO "service_role";



GRANT ALL ON TABLE "public"."v_role_quota_matrix" TO "anon";
GRANT ALL ON TABLE "public"."v_role_quota_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."v_role_quota_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."v_user_storage_usage" TO "anon";
GRANT ALL ON TABLE "public"."v_user_storage_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."v_user_storage_usage" TO "service_role";



GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_namespaces" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_namespaces" TO "anon";



GRANT ALL ON TABLE "storage"."iceberg_tables" TO "service_role";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "authenticated";
GRANT SELECT ON TABLE "storage"."iceberg_tables" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



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




