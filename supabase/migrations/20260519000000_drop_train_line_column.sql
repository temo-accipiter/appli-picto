-- Migration Phase 6 : Suppression définitive de la colonne train_line
-- Contexte : colonne conservée pour rollback depuis Phase 1.a (passage à progress_style).
-- Confirmé qu'aucun code applicatif ne lit/écrit train_line. Déprécation finale.

ALTER TABLE public.account_preferences
  DROP CONSTRAINT IF EXISTS account_preferences_train_line_chk;

ALTER TABLE public.account_preferences
  DROP COLUMN IF EXISTS train_line;
