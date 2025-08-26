--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

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
    'tram',
    'rer',
    'bus'
);


ALTER TYPE public.transport_type OWNER TO postgres;

--
-- Name: email_exists(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.email_exists(email_to_check text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(email_to_check)
  );
$$;


ALTER FUNCTION public.email_exists(email_to_check text) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, pseudo)
  values (
    new.id,
    split_part(new.email, '@', 1)  -- pseudo par défaut
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: purge_old_consentements(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.purge_old_consentements(retention_months integer DEFAULT 25) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  delete from public.consentements
  where ts < (now() - make_interval(months => retention_months));
end;
$$;


ALTER FUNCTION public.purge_old_consentements(retention_months integer) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: user_can_upload_avatar(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_can_upload_avatar(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select count(*) <= 1
  from storage.objects
  where bucket_id = 'avatars'
    and name like uid::text || '/%'
$$;


ALTER FUNCTION public.user_can_upload_avatar(uid uuid) OWNER TO postgres;

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
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
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
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
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
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
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


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abonnements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abonnements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer text,
    stripe_subscription_id text,
    status text,
    plan text,
    price_id text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    latest_invoice text,
    raw_data jsonb,
    last_event_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT abonnements_status_check CHECK ((status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'unpaid'::text, 'paused'::text])))
);


ALTER TABLE public.abonnements OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    value text NOT NULL,
    label text NOT NULL,
    user_id uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: consentements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consentements (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ts_client timestamp with time zone,
    user_id uuid,
    version text NOT NULL,
    mode text NOT NULL,
    choices jsonb NOT NULL,
    action text,
    ua text,
    locale text,
    app_version text,
    ip_hash text,
    origin text,
    CONSTRAINT consentements_mode_check CHECK ((mode = ANY (ARRAY['accept_all'::text, 'refuse_all'::text, 'custom'::text])))
);


ALTER TABLE public.consentements OWNER TO postgres;

--
-- Name: consentements_dernier; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.consentements_dernier WITH (security_invoker='true') AS
 SELECT DISTINCT ON (user_id) id,
    user_id,
    created_at,
    ts_client,
    version,
    mode,
    choices,
    action,
    ua,
    locale,
    app_version,
    origin
   FROM public.consentements
  WHERE (user_id IS NOT NULL)
  ORDER BY user_id, created_at DESC;


ALTER VIEW public.consentements_dernier OWNER TO postgres;

--
-- Name: consentements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consentements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consentements_id_seq OWNER TO postgres;

--
-- Name: consentements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consentements_id_seq OWNED BY public.consentements.id;


--
-- Name: parametres; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parametres (
    id integer NOT NULL,
    confettis boolean DEFAULT true
);


ALTER TABLE public.parametres OWNER TO postgres;

--
-- Name: parametres_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parametres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parametres_id_seq OWNER TO postgres;

--
-- Name: parametres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parametres_id_seq OWNED BY public.parametres.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    pseudo text,
    date_naissance date,
    ville text,
    avatar_url text,
    is_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: recompenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recompenses (
    id integer NOT NULL,
    label text,
    imagepath text,
    selected boolean DEFAULT false,
    user_id uuid,
    visible_en_demo boolean DEFAULT false
);


ALTER TABLE public.recompenses OWNER TO postgres;

--
-- Name: COLUMN recompenses.visible_en_demo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.recompenses.visible_en_demo IS 'Si true, cette récompense sera visible en mode démo pour tous les visiteurs';


--
-- Name: recompenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recompenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recompenses_id_seq OWNER TO postgres;

--
-- Name: recompenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recompenses_id_seq OWNED BY public.recompenses.id;


--
-- Name: stations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stations (
    id integer NOT NULL,
    label text,
    ligne text,
    ordre integer,
    type public.transport_type DEFAULT 'metro'::public.transport_type NOT NULL
);


ALTER TABLE public.stations OWNER TO postgres;

--
-- Name: stations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stations_id_seq OWNER TO postgres;

--
-- Name: stations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stations_id_seq OWNED BY public.stations.id;


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
    label text NOT NULL,
    categorie text,
    aujourdhui boolean DEFAULT false,
    fait boolean DEFAULT false,
    "position" integer DEFAULT 0,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    imagepath text,
    visible_en_demo boolean DEFAULT false
);


ALTER TABLE public.taches OWNER TO postgres;

--
-- Name: COLUMN taches.visible_en_demo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.taches.visible_en_demo IS 'Si true, cette tâche sera visible en mode démo pour tous les visiteurs';


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
    owner_id text
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


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
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


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
-- Name: consentements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consentements ALTER COLUMN id SET DEFAULT nextval('public.consentements_id_seq'::regclass);


--
-- Name: parametres id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametres ALTER COLUMN id SET DEFAULT nextval('public.parametres_id_seq'::regclass);


--
-- Name: recompenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recompenses ALTER COLUMN id SET DEFAULT nextval('public.recompenses_id_seq'::regclass);


--
-- Name: stations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations ALTER COLUMN id SET DEFAULT nextval('public.stations_id_seq'::regclass);


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
-- Name: parametres parametres_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parametres
    ADD CONSTRAINT parametres_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recompenses recompenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recompenses
    ADD CONSTRAINT recompenses_pkey PRIMARY KEY (id);


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
-- Name: stations uniq_stations_type_ligne_label; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT uniq_stations_type_ligne_label UNIQUE (type, ligne, label);


--
-- Name: stations uniq_stations_type_ligne_ordre; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stations
    ADD CONSTRAINT uniq_stations_type_ligne_ordre UNIQUE (type, ligne, ordre);


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
-- Name: abonnements_stripe_subscription_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_stripe_subscription_id_idx ON public.abonnements USING btree (stripe_subscription_id);


--
-- Name: abonnements_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX abonnements_user_id_idx ON public.abonnements USING btree (user_id);


--
-- Name: consentements_user_ts_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consentements_user_ts_idx ON public.consentements USING btree (user_id, created_at DESC);


--
-- Name: idx_recompenses_visible_en_demo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recompenses_visible_en_demo ON public.recompenses USING btree (visible_en_demo);


--
-- Name: idx_stations_ligne; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stations_ligne ON public.stations USING btree (ligne);


--
-- Name: idx_stations_type_ligne; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stations_type_ligne ON public.stations USING btree (type, ligne);


--
-- Name: idx_stations_type_ligne_ordre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stations_type_ligne_ordre ON public.stations USING btree (type, ligne, ordre);


--
-- Name: idx_taches_visible_en_demo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taches_visible_en_demo ON public.taches USING btree (visible_en_demo);


--
-- Name: subscription_logs_user_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_logs_user_time_idx ON public.subscription_logs USING btree (user_id, "timestamp" DESC);


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
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: abonnements set_abonnements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_abonnements_updated_at BEFORE UPDATE ON public.abonnements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


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
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscription_logs subscription_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_logs
    ADD CONSTRAINT subscription_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


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
-- Name: categories Chaque utilisateur peut accéder à ses catégories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Chaque utilisateur peut accéder à ses catégories" ON public.categories TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: taches Delete own taches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Delete own taches" ON public.taches FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: recompenses Delete recompenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Delete recompenses" ON public.recompenses FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: stations Delete stations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Delete stations" ON public.stations FOR DELETE TO authenticated USING (true);


--
-- Name: taches Insert own taches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Insert own taches" ON public.taches FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: recompenses Insert recompenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Insert recompenses" ON public.recompenses FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: stations Insert stations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Insert stations" ON public.stations FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: recompenses Select all recompenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Select all recompenses" ON public.recompenses FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: stations Select all stations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Select all stations" ON public.stations FOR SELECT TO authenticated USING (true);


--
-- Name: parametres Select confettis; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Select confettis" ON public.parametres FOR SELECT TO authenticated USING (true);


--
-- Name: taches Select own taches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Select own taches" ON public.taches FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: parametres Update confettis; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Update confettis" ON public.parametres FOR UPDATE TO authenticated USING ((id = 1));


--
-- Name: taches Update own taches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Update own taches" ON public.taches FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: recompenses Update recompenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Update recompenses" ON public.recompenses FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: stations Update stations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Update stations" ON public.stations FOR UPDATE TO authenticated USING (true);


--
-- Name: abonnements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;

--
-- Name: abonnements abonnements_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY abonnements_select_own ON public.abonnements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: consentements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consentements ENABLE ROW LEVEL SECURITY;

--
-- Name: consentements consentements_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_delete ON public.consentements FOR DELETE TO authenticated USING (false);


--
-- Name: consentements consentements_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_insert ON public.consentements FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: consentements consentements_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_select ON public.consentements FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: consentements consentements_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consentements_update ON public.consentements FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
-- Name: profiles insert-own-profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert-own-profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: subscription_logs logs_select_user_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY logs_select_user_or_admin ON public.subscription_logs FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: parametres; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles read-own-profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "read-own-profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: recompenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.recompenses ENABLE ROW LEVEL SECURITY;

--
-- Name: stations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

--
-- Name: stations stations select public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stations select public" ON public.stations FOR SELECT USING (true);


--
-- Name: subscription_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: taches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.taches ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles update-own-profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update-own-profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: objects Allow upload to images; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Allow upload to images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'images'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: objects User can access own files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "User can access own files" ON storage.objects TO authenticated USING ((split_part(name, '/'::text, 1) = (auth.uid())::text)) WITH CHECK (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text) AND public.user_can_upload_avatar(auth.uid())));


--
-- Name: objects User can insert own files 1oj01fe_0; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "User can insert own files 1oj01fe_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
-- Name: FUNCTION email_exists(email_to_check text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.email_exists(email_to_check text) TO anon;
GRANT ALL ON FUNCTION public.email_exists(email_to_check text) TO authenticated;
GRANT ALL ON FUNCTION public.email_exists(email_to_check text) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION purge_old_consentements(retention_months integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.purge_old_consentements(retention_months integer) TO anon;
GRANT ALL ON FUNCTION public.purge_old_consentements(retention_months integer) TO authenticated;
GRANT ALL ON FUNCTION public.purge_old_consentements(retention_months integer) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION user_can_upload_avatar(uid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) TO anon;
GRANT ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_can_upload_avatar(uid uuid) TO service_role;


--
-- Name: TABLE abonnements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.abonnements TO anon;
GRANT ALL ON TABLE public.abonnements TO authenticated;
GRANT ALL ON TABLE public.abonnements TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE consentements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consentements TO anon;
GRANT ALL ON TABLE public.consentements TO authenticated;
GRANT ALL ON TABLE public.consentements TO service_role;


--
-- Name: TABLE consentements_dernier; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.consentements_dernier TO anon;
GRANT ALL ON TABLE public.consentements_dernier TO authenticated;
GRANT ALL ON TABLE public.consentements_dernier TO service_role;


--
-- Name: SEQUENCE consentements_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.consentements_id_seq TO anon;
GRANT ALL ON SEQUENCE public.consentements_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.consentements_id_seq TO service_role;


--
-- Name: TABLE parametres; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.parametres TO anon;
GRANT ALL ON TABLE public.parametres TO authenticated;
GRANT ALL ON TABLE public.parametres TO service_role;


--
-- Name: SEQUENCE parametres_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.parametres_id_seq TO anon;
GRANT ALL ON SEQUENCE public.parametres_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.parametres_id_seq TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE recompenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recompenses TO anon;
GRANT ALL ON TABLE public.recompenses TO authenticated;
GRANT ALL ON TABLE public.recompenses TO service_role;


--
-- Name: SEQUENCE recompenses_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.recompenses_id_seq TO anon;
GRANT ALL ON SEQUENCE public.recompenses_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.recompenses_id_seq TO service_role;


--
-- Name: TABLE stations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stations TO anon;
GRANT ALL ON TABLE public.stations TO authenticated;
GRANT ALL ON TABLE public.stations TO service_role;


--
-- Name: SEQUENCE stations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.stations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.stations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.stations_id_seq TO service_role;


--
-- Name: TABLE subscription_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscription_logs TO service_role;
GRANT SELECT ON TABLE public.subscription_logs TO authenticated;


--
-- Name: TABLE taches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.taches TO anon;
GRANT ALL ON TABLE public.taches TO authenticated;
GRANT ALL ON TABLE public.taches TO service_role;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


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
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
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

