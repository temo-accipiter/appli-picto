


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


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_type" "text" NOT NULL,
    "owner_id" "uuid",
    "name" "text" NOT NULL,
    "image_path" "text" NOT NULL,
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_disabled" boolean DEFAULT false NOT NULL,
    "disabled_at" timestamp with time zone,
    "disabled_by" "uuid",
    "disabled_reason" "text",
    CONSTRAINT "cards_bank_no_category" CHECK (((("owner_type" = 'bank'::"text") AND ("category_id" IS NULL)) OR ("owner_type" = 'user'::"text"))),
    CONSTRAINT "cards_image_path_check" CHECK ((("length"(TRIM(BOTH FROM "image_path")) > 0) AND ("length"("image_path") <= 500))),
    CONSTRAINT "cards_name_check" CHECK ((("length"(TRIM(BOTH FROM "name")) > 0) AND ("length"("name") <= 200))),
    CONSTRAINT "cards_owner_type_check" CHECK (("owner_type" = ANY (ARRAY['bank'::"text", 'user'::"text"]))),
    CONSTRAINT "cards_ownership_check" CHECK (((("owner_type" = 'bank'::"text") AND ("owner_id" IS NULL)) OR (("owner_type" = 'user'::"text") AND ("owner_id" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."cards" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."cards" IS 'Cartes atomiques (image + nom) - bank ou user';



COMMENT ON COLUMN "public"."cards"."owner_type" IS 'Type ownership : bank (globale) ou user (personnalisee)';



COMMENT ON COLUMN "public"."cards"."owner_id" IS 'NULL si bank, auth.users(id) si user (ON DELETE CASCADE)';



COMMENT ON COLUMN "public"."cards"."name" IS 'Nom carte affiche UI (max 200 char, trim valide)';



COMMENT ON COLUMN "public"."cards"."image_path" IS 'Chemin relatif storage (ex: cards/uuid.webp, max 500 char, trim valide)';



COMMENT ON COLUMN "public"."cards"."category_id" IS 'Categorie carte (nullable, ON DELETE SET NULL)';



COMMENT ON COLUMN "public"."cards"."is_disabled" IS 'Soft-block : true = carte désactivée par admin, invisible pour owner';



COMMENT ON COLUMN "public"."cards"."disabled_at" IS 'Timestamp du blocage par admin (null si carte active)';



COMMENT ON COLUMN "public"."cards"."disabled_by" IS 'UUID de l''admin ayant bloqué la carte (null si carte active)';



COMMENT ON COLUMN "public"."cards"."disabled_reason" IS 'Raison du blocage pour audit/support (ex: "Contenu inapproprié")';



COMMENT ON CONSTRAINT "cards_bank_no_category" ON "public"."cards" IS 'Enforce bank cards cannot have category (owner_type=bank => category_id IS NULL)';



CREATE OR REPLACE FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."cards"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_card public.cards;
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Vérifier que la carte existe et est de type 'user'
  -- (on ne bloque pas les cartes banque, elles sont gérées autrement)
  SELECT * INTO v_card
  FROM public.cards
  WHERE id = p_card_id AND owner_type = 'user';

  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card not found or not a user card: %', p_card_id;
  END IF;

  -- Appliquer le blocage ou déblocage
  IF p_disabled THEN
    -- BLOCAGE : marquer la carte comme désactivée
    UPDATE public.cards
    SET
      is_disabled = true,
      disabled_at = now(),
      disabled_by = auth.uid(),
      disabled_reason = p_reason
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  ELSE
    -- DÉBLOCAGE : réactiver la carte
    -- On conserve disabled_by pour l'historique (qui a débloqué)
    -- On efface disabled_at et disabled_reason
    UPDATE public.cards
    SET
      is_disabled = false,
      disabled_at = NULL,
      disabled_by = auth.uid(),  -- Trace qui a débloqué
      disabled_reason = NULL
    WHERE id = p_card_id
    RETURNING * INTO v_card;
  END IF;

  RETURN v_card;
END;
$$;


ALTER FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text") IS 'Permet à l''admin de bloquer/débloquer une carte utilisateur.

RÈGLE RGPD RESPECTÉE :
  - Admin peut désactiver une carte signalée SANS voir l''image
  - La fonction agit sur les métadonnées DB uniquement
  - Aucun accès storage n''est impliqué (policies storage inchangées)

PARAMÈTRES :
  - p_card_id : UUID de la carte à (dés)activer
  - p_disabled : true = bloquer, false = débloquer
  - p_reason : raison du blocage (optionnel, pour audit)

RETOUR :
  - La row cards mise à jour

SÉCURITÉ :
  - SECURITY DEFINER : bypass RLS pour permettre update admin
  - Vérification is_admin() : seul l''admin peut appeler
  - Ne fonctionne que sur owner_type = ''user'' (pas les cartes banque)

EXEMPLE :
  -- Bloquer une carte
  SELECT * FROM public.admin_set_card_disabled(
    ''123e4567-e89b-12d3-a456-426614174000'',
    true,
    ''Contenu signalé comme inapproprié''
  );

  -- Débloquer une carte
  SELECT * FROM public.admin_set_card_disabled(
    ''123e4567-e89b-12d3-a456-426614174000'',
    false
  );';



CREATE OR REPLACE FUNCTION "public"."guard_profiles_sensitive_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Si utilisateur non admin tente de modifier colonnes sensibles
  IF NOT public.is_admin() THEN
    -- Bloquer modification plan
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Modification plan interdite (admin-only)';
    END IF;

    -- Bloquer modification is_admin
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Modification is_admin interdite (admin-only)';
    END IF;

    -- Bloquer modification account_status
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
      RAISE EXCEPTION 'Modification account_status interdite (admin-only)';
    END IF;

    -- Bloquer modification deletion_scheduled_at
    IF NEW.deletion_scheduled_at IS DISTINCT FROM OLD.deletion_scheduled_at THEN
      RAISE EXCEPTION 'Modification deletion_scheduled_at interdite (admin-only)';
    END IF;

    -- Bloquer modification plan_expires_at (NOUVEAU)
    IF NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'Modification plan_expires_at interdite (admin-only)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_profiles_sensitive_columns"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_profiles_sensitive_columns"() IS 'Trigger guard : empeche modification colonnes sensibles profiles par non-admin';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Helper RLS : verifie si utilisateur connecte est admin (LANGUAGE SQL + row_security off evite recursion)';



CREATE OR REPLACE FUNCTION "public"."is_subscriber_active"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT COALESCE(
    (SELECT
      plan = 'subscriber' OR
      (plan = 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at > now())
    FROM public.profiles
    WHERE user_id = uid),
    false
  );
$$;


ALTER FUNCTION "public"."is_subscriber_active"("uid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_subscriber_active"("uid" "uuid") IS 'Helper RLS : verifie si utilisateur a acces fonctionnalites subscriber (actif ou periode grace) - SECURITY DEFINER + row_security off evite recursion';



CREATE OR REPLACE FUNCTION "public"."validate_card_category"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- Bank cards cannot have category (already checked by constraint)
  IF NEW.owner_type = 'bank' AND NEW.category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Bank cards cannot have category';
  END IF;

  -- User cards: if category_id not null, verify it belongs to same owner
  IF NEW.owner_type = 'user' AND NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.categories
      WHERE id = NEW.category_id AND user_id = NEW.owner_id
    ) THEN
      RAISE EXCEPTION 'User card category must belong to same owner';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_card_category"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_card_category"() IS 'Trigger : validate user card category belongs to same owner';



CREATE OR REPLACE FUNCTION "public"."validate_card_image_path"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_card_image_path"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_card_image_path"() IS 'Trigger : validate image_path format and bucket mapping:
   - Bank cards: bank/<card_id>.<ext> → bucket cards-bank (PUBLIC)
   - User cards: user/<owner_id>/<card_id>.<ext> → bucket cards-user (PRIVATE)';



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


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "value" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "categories_label_check" CHECK ((("length"(TRIM(BOTH FROM "label")) > 0) AND ("length"("label") <= 100))),
    CONSTRAINT "categories_user_only" CHECK (("user_id" IS NOT NULL)),
    CONSTRAINT "categories_value_check" CHECK ((("value" ~ '^[a-z0-9_-]+$'::"text") AND ("length"("value") <= 100)))
);

ALTER TABLE ONLY "public"."categories" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Categories de cartes (bank globales + user custom)';



COMMENT ON COLUMN "public"."categories"."label" IS 'Nom affiche UI (modifiable, max 100 char, trim valide)';



COMMENT ON COLUMN "public"."categories"."value" IS 'Slug stable technique (a-z0-9_- uniquement, max 100 char)';



COMMENT ON COLUMN "public"."categories"."user_id" IS 'NULL = categorie bank, UUID = categorie user custom (ON DELETE CASCADE)';



COMMENT ON CONSTRAINT "categories_user_only" ON "public"."categories" IS 'Enforce categories are user-only (no bank categories)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pseudo" "text",
    "avatar_url" "text",
    "ville" "text",
    "date_naissance" "date",
    "account_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "deletion_scheduled_at" timestamp with time zone,
    "plan_expires_at" timestamp with time zone,
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'deletion_scheduled'::"text"]))),
    CONSTRAINT "profiles_avatar_url_check" CHECK ((("avatar_url" IS NULL) OR ("length"("avatar_url") <= 500))),
    CONSTRAINT "profiles_date_naissance_check" CHECK ((("date_naissance" IS NULL) OR (("date_naissance" <= CURRENT_DATE) AND ("date_naissance" >= '1900-01-01'::"date")))),
    CONSTRAINT "profiles_deletion_scheduled_at_check" CHECK ((("deletion_scheduled_at" IS NULL) OR ("deletion_scheduled_at" > "now"()))),
    CONSTRAINT "profiles_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'subscriber'::"text"]))),
    CONSTRAINT "profiles_pseudo_check" CHECK ((("pseudo" IS NULL) OR (("length"(TRIM(BOTH FROM "pseudo")) > 0) AND ("length"("pseudo") <= 50)))),
    CONSTRAINT "profiles_subscriber_no_expiry" CHECK (((("plan" = 'subscriber'::"text") AND ("plan_expires_at" IS NULL)) OR ("plan" = 'free'::"text"))),
    CONSTRAINT "profiles_ville_check" CHECK ((("ville" IS NULL) OR (("length"(TRIM(BOTH FROM "ville")) > 0) AND ("length"("ville") <= 100))))
);

ALTER TABLE ONLY "public"."profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profils utilisateurs - source unique verite (lien auth.users)';



COMMENT ON COLUMN "public"."profiles"."user_id" IS 'PK + FK vers auth.users(id) - identifiant unique utilisateur';



COMMENT ON COLUMN "public"."profiles"."plan" IS 'Plan utilisateur : free (defaut) ou subscriber (abonne actif)';



COMMENT ON COLUMN "public"."profiles"."is_admin" IS 'Administrateur systeme (bypass quotas et permissions)';



COMMENT ON COLUMN "public"."profiles"."created_at" IS 'Date creation profil';



COMMENT ON COLUMN "public"."profiles"."updated_at" IS 'Date derniere modification (auto-update via trigger)';



COMMENT ON COLUMN "public"."profiles"."pseudo" IS 'Pseudo utilisateur (unique case-insensitive si non null, max 50 char, trim valide) - editable user';



COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL avatar (storage ou externe, max 500 char, nullable) - editable user';



COMMENT ON COLUMN "public"."profiles"."ville" IS 'Ville utilisateur (max 100 char, trim valide, nullable) - editable user';



COMMENT ON COLUMN "public"."profiles"."date_naissance" IS 'Date naissance (nullable, <= current_date, >= 1900-01-01) - editable user';



COMMENT ON COLUMN "public"."profiles"."account_status" IS 'Statut compte : active/suspended/deletion_scheduled (default active) - ADMIN-ONLY (protege par trigger guard)';



COMMENT ON COLUMN "public"."profiles"."deletion_scheduled_at" IS 'Date suppression planifiee RGPD (nullable, > now()) - ADMIN-ONLY (protege par trigger guard)';



COMMENT ON COLUMN "public"."profiles"."plan_expires_at" IS 'Date expiration droits subscriber (periode grace 7j apres downgrade) - States: subscriber (NULL), grace active (> now()), grace expiree (<= now()), free jamais abonne (NULL) - ADMIN-ONLY (protege trigger guard) - CONTRAT: ne JAMAIS remettre a NULL apres expiration grace (necessaire pour purge J+90)';



CREATE TABLE IF NOT EXISTS "public"."slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timeline_id" "uuid" NOT NULL,
    "card_id" "uuid" NOT NULL,
    "slot_type" "text" NOT NULL,
    "position" integer NOT NULL,
    "jetons" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "slots_jetons_check" CHECK (((("slot_type" = 'step'::"text") AND ("jetons" >= 0) AND ("jetons" <= 5)) OR (("slot_type" = 'reward'::"text") AND ("jetons" = 0)))),
    CONSTRAINT "slots_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "slots_slot_type_check" CHECK (("slot_type" = ANY (ARRAY['step'::"text", 'reward'::"text"])))
);

ALTER TABLE ONLY "public"."slots" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."slots" IS 'Slots dans timelines (steps ou rewards) avec jetons - max 1 reward par timeline';



COMMENT ON COLUMN "public"."slots"."timeline_id" IS 'Timeline parente (FK timelines, ON DELETE CASCADE)';



COMMENT ON COLUMN "public"."slots"."card_id" IS 'Carte associee (FK cards, ON DELETE RESTRICT empeche suppression carte utilisee)';



COMMENT ON COLUMN "public"."slots"."slot_type" IS 'Type slot : step (avec jetons 0-5) ou reward (0 jetons) - max 1 reward par timeline';



COMMENT ON COLUMN "public"."slots"."position" IS 'Position dans timeline (ordre affichage >= 0, UNIQUE par timeline)';



COMMENT ON COLUMN "public"."slots"."jetons" IS 'Jetons economie : 0-5 pour steps, 0 pour rewards (CHECK constraint)';



CREATE TABLE IF NOT EXISTS "public"."timelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mode" "text" DEFAULT 'planning'::"text" NOT NULL,
    CONSTRAINT "timelines_mode_check" CHECK (("mode" = ANY (ARRAY['planning'::"text", 'sequence'::"text"]))),
    CONSTRAINT "timelines_name_check" CHECK ((("name" IS NULL) OR (("length"(TRIM(BOTH FROM "name")) > 0) AND ("length"("name") <= 200))))
);

ALTER TABLE ONLY "public"."timelines" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."timelines" OWNER TO "postgres";


COMMENT ON TABLE "public"."timelines" IS 'Timelines (plannings visuels) utilisateur - 1 seule active par user';



COMMENT ON COLUMN "public"."timelines"."owner_id" IS 'Utilisateur proprietaire (FK profiles.user_id, ON DELETE CASCADE)';



COMMENT ON COLUMN "public"."timelines"."name" IS 'Nom timeline (optionnel, max 200 char, trim valide)';



COMMENT ON COLUMN "public"."timelines"."is_active" IS 'Timeline active (UNIQUE partiel : 1 seule active par owner_id)';



COMMENT ON COLUMN "public"."timelines"."mode" IS 'Mode de la timeline. "planning" = planning visuel avec economie de jetons et recompense possible (affiche dans page Tableau). "sequence" = sequencage pour decomposer une tache complexe en micro-etapes visuelles (affiche sous carte au focus, sans jetons/recompense, slots Etapes uniquement).';



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


ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_timeline_position_unique" UNIQUE ("timeline_id", "position");



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "timelines_pkey" PRIMARY KEY ("id");



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



CREATE UNIQUE INDEX "categories_bank_value_unique" ON "public"."categories" USING "btree" ("value") WHERE ("user_id" IS NULL);



CREATE UNIQUE INDEX "categories_user_value_unique" ON "public"."categories" USING "btree" ("user_id", "value") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_cards_category" ON "public"."cards" USING "btree" ("category_id");



CREATE INDEX "idx_cards_disabled" ON "public"."cards" USING "btree" ("disabled_at" DESC) WHERE ("is_disabled" = true);



COMMENT ON INDEX "public"."idx_cards_disabled" IS 'Index partiel pour dashboard admin : liste des cartes bloquées';



CREATE INDEX "idx_cards_owner" ON "public"."cards" USING "btree" ("owner_type", "owner_id");



CREATE INDEX "idx_categories_user" ON "public"."categories" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_profiles_account_status" ON "public"."profiles" USING "btree" ("account_status");



CREATE INDEX "idx_profiles_deletion_scheduled" ON "public"."profiles" USING "btree" ("deletion_scheduled_at") WHERE (("account_status" = 'deletion_scheduled'::"text") AND ("deletion_scheduled_at" IS NOT NULL));



CREATE INDEX "idx_profiles_grace_period" ON "public"."profiles" USING "btree" ("user_id", "plan_expires_at") WHERE (("plan" = 'free'::"text") AND ("plan_expires_at" IS NOT NULL));



CREATE INDEX "idx_profiles_purge_candidates" ON "public"."profiles" USING "btree" ("plan_expires_at") WHERE (("plan" = 'free'::"text") AND ("plan_expires_at" IS NOT NULL));



CREATE INDEX "idx_slots_card" ON "public"."slots" USING "btree" ("card_id");



CREATE INDEX "idx_slots_timeline_position" ON "public"."slots" USING "btree" ("timeline_id", "position");



CREATE INDEX "idx_timelines_owner" ON "public"."timelines" USING "btree" ("owner_id");



CREATE UNIQUE INDEX "profiles_pseudo_unique" ON "public"."profiles" USING "btree" ("lower"("pseudo")) WHERE ("pseudo" IS NOT NULL);



CREATE UNIQUE INDEX "slots_timeline_reward_unique" ON "public"."slots" USING "btree" ("timeline_id") WHERE ("slot_type" = 'reward'::"text");



CREATE UNIQUE INDEX "timelines_active_per_user" ON "public"."timelines" USING "btree" ("owner_id") WHERE ("is_active" = true);



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



CREATE OR REPLACE TRIGGER "cards_updated_at" BEFORE UPDATE ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "cards_validate_category" BEFORE INSERT OR UPDATE OF "category_id", "owner_id", "owner_type" ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."validate_card_category"();



CREATE OR REPLACE TRIGGER "cards_validate_image_path" BEFORE INSERT OR UPDATE OF "image_path", "owner_type", "owner_id" ON "public"."cards" FOR EACH ROW EXECUTE FUNCTION "public"."validate_card_image_path"();



CREATE OR REPLACE TRIGGER "categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_guard_sensitive_columns" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profiles_sensitive_columns"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "slots_updated_at" BEFORE UPDATE ON "public"."slots" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "timelines_updated_at" BEFORE UPDATE ON "public"."timelines" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timelines"
    ADD CONSTRAINT "timelines_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



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



ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cards_delete" ON "public"."cards" FOR DELETE USING (((("owner_type" = 'bank'::"text") AND "public"."is_admin"()) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_admin"())));



CREATE POLICY "cards_insert" ON "public"."cards" FOR INSERT WITH CHECK (((("owner_type" = 'bank'::"text") AND "public"."is_admin"()) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("auth"."uid"() IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("auth"."uid"() IS NOT NULL) AND "public"."is_admin"())));



CREATE POLICY "cards_select" ON "public"."cards" FOR SELECT USING ((("owner_type" = 'bank'::"text") OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("is_disabled" = false)) OR (("owner_type" = 'user'::"text") AND "public"."is_admin"())));



CREATE POLICY "cards_update" ON "public"."cards" FOR UPDATE USING (((("owner_type" = 'bank'::"text") AND "public"."is_admin"()) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_admin"()))) WITH CHECK (((("owner_type" = 'bank'::"text") AND "public"."is_admin"()) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("owner_type" = 'user'::"text") AND ("owner_id" = "auth"."uid"()) AND ("owner_id" IS NOT NULL) AND "public"."is_admin"())));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete" ON "public"."categories" FOR DELETE USING (((("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_admin"())));



CREATE POLICY "categories_insert" ON "public"."categories" FOR INSERT WITH CHECK (((("user_id" = "auth"."uid"()) AND ("auth"."uid"() IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("user_id" = "auth"."uid"()) AND ("auth"."uid"() IS NOT NULL) AND "public"."is_admin"())));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "categories_update" ON "public"."categories" FOR UPDATE USING (((("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_admin"()))) WITH CHECK (((("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_subscriber_active"("auth"."uid"())) OR (("user_id" = "auth"."uid"()) AND ("user_id" IS NOT NULL) AND "public"."is_admin"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "slots_delete" ON "public"."slots" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."timelines" "t"
  WHERE (("t"."id" = "slots"."timeline_id") AND ("t"."owner_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "slots_insert" ON "public"."slots" FOR INSERT WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."timelines" "t"
  WHERE (("t"."id" = "slots"."timeline_id") AND ("t"."owner_id" = "auth"."uid"())))) AND ((EXISTS ( SELECT 1
   FROM "public"."cards" "c"
  WHERE (("c"."id" = "slots"."card_id") AND ("c"."owner_type" = 'bank'::"text")))) OR ((EXISTS ( SELECT 1
   FROM "public"."cards" "c"
  WHERE (("c"."id" = "slots"."card_id") AND ("c"."owner_type" = 'user'::"text") AND ("c"."owner_id" = "auth"."uid"())))) AND "public"."is_subscriber_active"("auth"."uid"())))) OR "public"."is_admin"()));



COMMENT ON POLICY "slots_insert" ON "public"."slots" IS 'Securise ownership cartes user (cards.owner_id = auth.uid()) + require subscriber actif pour cartes user';



CREATE POLICY "slots_select" ON "public"."slots" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."timelines" "t"
  WHERE (("t"."id" = "slots"."timeline_id") AND ("t"."owner_id" = "auth"."uid"())))) OR "public"."is_admin"()));



CREATE POLICY "slots_update" ON "public"."slots" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."timelines" "t"
  WHERE (("t"."id" = "slots"."timeline_id") AND ("t"."owner_id" = "auth"."uid"())))) OR "public"."is_admin"())) WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."timelines" "t"
  WHERE (("t"."id" = "slots"."timeline_id") AND ("t"."owner_id" = "auth"."uid"())))) AND ((EXISTS ( SELECT 1
   FROM "public"."cards" "c"
  WHERE (("c"."id" = "slots"."card_id") AND ("c"."owner_type" = 'bank'::"text")))) OR ((EXISTS ( SELECT 1
   FROM "public"."cards" "c"
  WHERE (("c"."id" = "slots"."card_id") AND ("c"."owner_type" = 'user'::"text") AND ("c"."owner_id" = "auth"."uid"())))) AND "public"."is_subscriber_active"("auth"."uid"())))) OR "public"."is_admin"()));



COMMENT ON POLICY "slots_update" ON "public"."slots" IS 'Permet "sortie premium" : remplacer carte user verrouilee par carte bank - USING leger (owner timeline), WITH CHECK gate sur nouvelle carte';



ALTER TABLE "public"."timelines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timelines_delete" ON "public"."timelines" FOR DELETE USING ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "timelines_insert" ON "public"."timelines" FOR INSERT WITH CHECK ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "timelines_select" ON "public"."timelines" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "timelines_update" ON "public"."timelines" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cards_bank_storage_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'cards-bank'::"text") AND ("name" ~~ 'bank/%'::"text") AND "public"."is_admin"()));



CREATE POLICY "cards_bank_storage_insert" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'cards-bank'::"text") AND ("name" ~~ 'bank/%'::"text") AND "public"."is_admin"()));



CREATE POLICY "cards_bank_storage_select" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'cards-bank'::"text") AND ("name" ~~ 'bank/%'::"text")));



CREATE POLICY "cards_bank_storage_update" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'cards-bank'::"text") AND ("name" ~~ 'bank/%'::"text") AND "public"."is_admin"())) WITH CHECK ((("bucket_id" = 'cards-bank'::"text") AND ("name" ~~ 'bank/%'::"text") AND "public"."is_admin"()));



CREATE POLICY "cards_user_storage_delete" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'cards-user'::"text") AND ("auth"."uid"() IS NOT NULL) AND ("name" ~~ (('user/'::"text" || ("auth"."uid"())::"text") || '/%'::"text")) AND "public"."is_subscriber_active"("auth"."uid"())));



CREATE POLICY "cards_user_storage_insert" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'cards-user'::"text") AND ("auth"."uid"() IS NOT NULL) AND ("name" ~~ (('user/'::"text" || ("auth"."uid"())::"text") || '/%'::"text")) AND "public"."is_subscriber_active"("auth"."uid"())));



CREATE POLICY "cards_user_storage_select" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'cards-user'::"text") AND ("name" ~~ (('user/'::"text" || ("auth"."uid"())::"text") || '/%'::"text")) AND ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "cards_user_storage_update" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'cards-user'::"text") AND ("auth"."uid"() IS NOT NULL) AND ("name" ~~ (('user/'::"text" || ("auth"."uid"())::"text") || '/%'::"text")) AND "public"."is_subscriber_active"("auth"."uid"()))) WITH CHECK ((("bucket_id" = 'cards-user'::"text") AND ("auth"."uid"() IS NOT NULL) AND ("name" ~~ (('user/'::"text" || ("auth"."uid"())::"text") || '/%'::"text")) AND "public"."is_subscriber_active"("auth"."uid"())));



ALTER TABLE "storage"."iceberg_namespaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."iceberg_tables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON TABLE "public"."cards" TO "anon";
GRANT ALL ON TABLE "public"."cards" TO "authenticated";
GRANT ALL ON TABLE "public"."cards" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_card_disabled"("p_card_id" "uuid", "p_disabled" boolean, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_profiles_sensitive_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_profiles_sensitive_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_profiles_sensitive_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_subscriber_active"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_subscriber_active"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_subscriber_active"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_card_category"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_card_category"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_card_category"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_card_image_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_card_image_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_card_image_path"() TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."slots" TO "anon";
GRANT ALL ON TABLE "public"."slots" TO "authenticated";
GRANT ALL ON TABLE "public"."slots" TO "service_role";



GRANT ALL ON TABLE "public"."timelines" TO "anon";
GRANT ALL ON TABLE "public"."timelines" TO "authenticated";
GRANT ALL ON TABLE "public"."timelines" TO "service_role";



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




