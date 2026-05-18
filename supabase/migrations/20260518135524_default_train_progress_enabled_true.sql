-- REFONTE TrainProgressBar — alignement défaut produit
--
-- Contexte : la barre de progression est désormais une feature
-- découvrable par défaut (Visitor la voit, l'utilisateur qui
-- s'inscrit doit la garder visible — pas de palier d'onboarding).
-- La colonne train_progress_enabled passe de DEFAULT false à
-- DEFAULT true. Les comptes existants en pré-launch sont
-- réalignés sur le nouveau défaut.
--
-- Phase 4a (Commit 2) de la refonte TrainProgressBar.

BEGIN;

-- 1) Nouveau défaut pour les futurs comptes
ALTER TABLE public.account_preferences
  ALTER COLUMN train_progress_enabled SET DEFAULT true;

-- 2) Réalignement des comptes existants sur le nouveau défaut
-- En pré-launch (aucun utilisateur payant), aucune préférence
-- explicite false ne mérite préservation. Tous les comptes
-- repassent à true pour cohérence avec le nouveau comportement
-- par défaut.
UPDATE public.account_preferences
SET train_progress_enabled = true
WHERE train_progress_enabled = false;

COMMIT;
