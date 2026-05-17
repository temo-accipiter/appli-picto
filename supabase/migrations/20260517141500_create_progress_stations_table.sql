-- REFONTE TrainProgressBar / Désengagement copyright RATP
--
-- Phase 1.b — création de la table catalogue progress_stations.
--
-- Contexte : la table « stations » (dépréciée, supprimée en Phase 6)
-- indexait ses arrêts par « ligne » RATP ('1', '6', '12'), une
-- référence directe à une propriété protégée. progress_stations
-- reprend le même concept, indexé par les 3 thèmes propriétaires
-- (progress_style), extensibles à d'autres métaphores en V2+.
--
-- Table de CATALOGUE : alimentée exclusivement par migrations
-- (seed des 60 arrêts en Phase 1.c), strictement read-only côté
-- client. Aucune policy INSERT/UPDATE/DELETE n'est créée
-- volontairement — la modification du catalogue passe par migration.
--
-- Migration safe-replay : CREATE TABLE IF NOT EXISTS + DROP POLICY
-- IF EXISTS avant chaque CREATE POLICY.

BEGIN;

CREATE TABLE IF NOT EXISTS public.progress_stations (
  style    text    NOT NULL,
  position integer NOT NULL,
  label    text    NOT NULL,
  CONSTRAINT progress_stations_pkey PRIMARY KEY (style, position),
  CONSTRAINT progress_stations_style_chk
    CHECK (style IN ('train-soleil', 'train-foret', 'train-ocean')),
  CONSTRAINT progress_stations_position_chk
    CHECK (position > 0),
  CONSTRAINT progress_stations_label_chk
    CHECK (btrim(label) <> '' AND char_length(label) <= 200)
);

ALTER TABLE public.progress_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_stations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS progress_stations_select_anon
  ON public.progress_stations;
CREATE POLICY progress_stations_select_anon
  ON public.progress_stations
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS progress_stations_select_authenticated
  ON public.progress_stations;
CREATE POLICY progress_stations_select_authenticated
  ON public.progress_stations
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
