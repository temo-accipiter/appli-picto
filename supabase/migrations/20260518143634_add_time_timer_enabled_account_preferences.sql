-- REFONTE Time Timer — activation pilotée par la DB
--
-- Contexte : l'activation du Time Timer flottant passe de la clé
-- localStorage `showTimeTimer` (DisplayContext) à une préférence DB,
-- alignée sur le pattern de `train_progress_enabled`. DEFAULT true :
-- le Time Timer est découvrable par défaut.
--
-- Aucun réalignement de données : colonne nouvelle, tous les comptes
-- existants reçoivent true via le DEFAULT.
--
-- Phase 4a (Commit 2 bis) de la refonte TrainProgressBar.

BEGIN;

ALTER TABLE public.account_preferences
  ADD COLUMN IF NOT EXISTS time_timer_enabled boolean NOT NULL DEFAULT true;

COMMIT;
