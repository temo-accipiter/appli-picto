-- REFONTE TrainProgressBar / Désengagement copyright RATP
--
-- Contexte : les valeurs '1', '6', '12' de train_line étaient des
-- références directes aux lignes RATP (propriété protégée).
-- La nouvelle colonne progress_style introduit 3 thèmes propriétaires
-- (Soleil, Forêt, Océan), extensibles à d'autres métaphores en V2+.
--
-- train_line est conservée pour rollback. Déprécation finale en Phase 6.
--
-- Phase 1.a — ajout colonne + contrainte CHECK + migration des données.

BEGIN;

-- 1) Nouvelle colonne progress_style (DB-authoritative)
--    NOT NULL + DEFAULT 'train-soleil' => les lignes existantes prennent
--    'train-soleil' automatiquement à la création de la colonne.
ALTER TABLE public.account_preferences
  ADD COLUMN IF NOT EXISTS progress_style text NOT NULL DEFAULT 'train-soleil';

-- 2) Contrainte CHECK : seuls les 3 thèmes V1 sont autorisés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'account_preferences_progress_style_chk'
      AND conrelid = 'public.account_preferences'::regclass
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.account_preferences
      ADD CONSTRAINT account_preferences_progress_style_chk
      CHECK (progress_style IN ('train-soleil', 'train-foret', 'train-ocean'))
    $sql$;
  END IF;
END $$;

-- 3) Migration des données existantes depuis train_line
--    '1'  -> 'train-soleil' (déjà couvert par le DEFAULT, pas d'UPDATE nécessaire)
--    '6'  -> 'train-foret'
--    '12' -> 'train-ocean'
--    NULL / autre valeur -> reste 'train-soleil' (DEFAULT)
--
--    Clause AND progress_style = 'train-soleil' : safe-replay.
--    Un replay de la migration ne ré-écrase QUE les lignes encore au défaut ;
--    une préférence déjà changée via le nouveau front n'est jamais écrasée.
UPDATE public.account_preferences
SET progress_style = 'train-foret'
WHERE train_line = '6' AND progress_style = 'train-soleil';

UPDATE public.account_preferences
SET progress_style = 'train-ocean'
WHERE train_line = '12' AND progress_style = 'train-soleil';

COMMIT;
