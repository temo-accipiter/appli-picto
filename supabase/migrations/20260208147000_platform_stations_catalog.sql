-- PLATFORM / Micro-features: stations catalogue (read-only) + transport_type enum
-- Source: PLATFORM.md §7.2.5

BEGIN;

-- Enum transport_type (public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'transport_type'
  ) THEN
    CREATE TYPE public.transport_type AS ENUM ('metro', 'tram', 'bus');
  END IF;
END $$;

-- Table stations (catalogue non sensible)
CREATE TABLE IF NOT EXISTS public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  type public.transport_type NOT NULL,
  ligne text NOT NULL,
  ordre integer NOT NULL,
  label text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Guardrails (conservateurs mais non bloquants)
  CONSTRAINT stations_ligne_chk CHECK (
    char_length(ligne) BETWEEN 1 AND 32
    AND ligne ~ '^[0-9A-Za-z][0-9A-Za-z]*$'
  ),
  CONSTRAINT stations_ordre_chk CHECK (ordre > 0),
  CONSTRAINT stations_label_chk CHECK (
    btrim(label) <> ''
    AND char_length(label) <= 200
  ),

  CONSTRAINT stations_unique_type_ligne_ordre UNIQUE (type, ligne, ordre),
  CONSTRAINT stations_unique_type_ligne_label UNIQUE (type, ligne, label)
);

-- updated_at
DROP TRIGGER IF EXISTS trg_platform_stations_set_updated_at ON public.stations;
CREATE TRIGGER trg_platform_stations_set_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW
EXECUTE FUNCTION public.platform_set_updated_at();

-- RLS (read-only)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations FORCE ROW LEVEL SECURITY;

-- Grants (SELECT seulement)
GRANT SELECT ON public.stations TO anon;
GRANT SELECT ON public.stations TO authenticated;
GRANT SELECT ON public.stations TO service_role;

-- Policies SELECT (anon + authenticated)
DROP POLICY IF EXISTS stations_select_anon ON public.stations;
CREATE POLICY stations_select_anon
ON public.stations
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS stations_select_authenticated ON public.stations;
CREATE POLICY stations_select_authenticated
ON public.stations
FOR SELECT
TO authenticated
USING (true);

-- Aucune policy d’écriture => INSERT/UPDATE/DELETE interdits côté client

COMMIT;
