-- REFONTE TrainProgressBar / Désengagement copyright RATP
--
-- Phase 1.c — seed des 60 arrêts du catalogue progress_stations.
--
-- 20 arrêts × 3 thèmes propriétaires : train-soleil, train-foret,
-- train-ocean. Noms fictifs et poétiques, sans aucune référence à
-- un réseau de transport réel (désengagement copyright RATP).
--
-- position : numérotation continue 1..20 par thème, sans trou.
-- Migration safe-replay : ON CONFLICT (style, position) DO NOTHING.

BEGIN;

INSERT INTO public.progress_stations (style, position, label) VALUES
  ('train-soleil',  1, 'Petit Pont'),
  ('train-soleil',  2, 'Moulin'),
  ('train-soleil',  3, 'Vallée'),
  ('train-soleil',  4, 'Champ Doré'),
  ('train-soleil',  5, 'Colline'),
  ('train-soleil',  6, 'Lavandier'),
  ('train-soleil',  7, 'Pierre Blanche'),
  ('train-soleil',  8, 'Roseraie'),
  ('train-soleil',  9, 'Vieille Tour'),
  ('train-soleil', 10, 'Pré Fleuri'),
  ('train-soleil', 11, 'Bergerie'),
  ('train-soleil', 12, 'Fontaine'),
  ('train-soleil', 13, 'Verger'),
  ('train-soleil', 14, 'Tournesol'),
  ('train-soleil', 15, 'Sente'),
  ('train-soleil', 16, 'Mas'),
  ('train-soleil', 17, 'Olivier'),
  ('train-soleil', 18, 'Cigale'),
  ('train-soleil', 19, 'Ruisseau'),
  ('train-soleil', 20, 'Coteau')
ON CONFLICT (style, position) DO NOTHING;

INSERT INTO public.progress_stations (style, position, label) VALUES
  ('train-foret',  1, 'Cabane'),
  ('train-foret',  2, 'Clairière'),
  ('train-foret',  3, 'Grand Chêne'),
  ('train-foret',  4, 'Sentier des Mousses'),
  ('train-foret',  5, 'Pin Penché'),
  ('train-foret',  6, 'Source'),
  ('train-foret',  7, 'Roche Verte'),
  ('train-foret',  8, 'Fougeraie'),
  ('train-foret',  9, 'Vieux Hêtre'),
  ('train-foret', 10, 'Étang'),
  ('train-foret', 11, 'Renard'),
  ('train-foret', 12, 'Champignon'),
  ('train-foret', 13, 'Bouleau'),
  ('train-foret', 14, 'Sous-Bois'),
  ('train-foret', 15, 'Houx'),
  ('train-foret', 16, 'Sapin'),
  ('train-foret', 17, 'Écorce'),
  ('train-foret', 18, 'Genêt'),
  ('train-foret', 19, 'Mésange'),
  ('train-foret', 20, 'Lierre')
ON CONFLICT (style, position) DO NOTHING;

INSERT INTO public.progress_stations (style, position, label) VALUES
  ('train-ocean',  1, 'Phare'),
  ('train-ocean',  2, 'Anse Bleue'),
  ('train-ocean',  3, 'Récif'),
  ('train-ocean',  4, 'Crique'),
  ('train-ocean',  5, 'Brise-Lames'),
  ('train-ocean',  6, 'Galets'),
  ('train-ocean',  7, 'Goéland'),
  ('train-ocean',  8, 'Cap Blanc'),
  ('train-ocean',  9, 'Petit Port'),
  ('train-ocean', 10, 'Sable Fin'),
  ('train-ocean', 11, 'Coquillage'),
  ('train-ocean', 12, 'Algues'),
  ('train-ocean', 13, 'Bouée'),
  ('train-ocean', 14, 'Mouette'),
  ('train-ocean', 15, 'Voile'),
  ('train-ocean', 16, 'Marée'),
  ('train-ocean', 17, 'Rocher'),
  ('train-ocean', 18, 'Étoile de Mer'),
  ('train-ocean', 19, 'Embarcadère'),
  ('train-ocean', 20, 'Falaise')
ON CONFLICT (style, position) DO NOTHING;

COMMIT;
