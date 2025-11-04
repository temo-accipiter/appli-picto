-- Migration: Ajouter la colonne label_key pour l'internationalisation des demo_cards
-- Date: 2025-10-29

-- Ajouter une colonne label_key pour les clés de traduction i18n
ALTER TABLE demo_cards ADD COLUMN IF NOT EXISTS label_key text;

COMMENT ON COLUMN demo_cards.label_key IS 'Clé i18n pour la traduction (ex: demo.task1). Si NULL, utiliser label directement.';

-- Mettre à jour les clés de traduction pour les cards existantes
UPDATE demo_cards SET label_key = 'demo.task1' WHERE label = 'Se brosser les dents';
UPDATE demo_cards SET label_key = 'demo.task2' WHERE label = 'Se brosser les cheveux';
UPDATE demo_cards SET label_key = 'demo.task3' WHERE label = 'S''habiller';
UPDATE demo_cards SET label_key = 'demo.reward1' WHERE label = 'Bravo !';
