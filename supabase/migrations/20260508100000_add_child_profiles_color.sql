-- Migration: Ajout colonne color à child_profiles
-- Description: Chaque espace enfant dispose d'une couleur parmi 8 valeurs prédéfinies
-- Date: 2026-05-08
-- Référence: Redesign frontend — Phase 2A

-- ============================================================
-- OBJECTIF:
-- Ajouter la colonne 'color' à child_profiles pour permettre
-- l'identification visuelle de chaque espace enfant par couleur.
-- Valeurs autorisées : 8 couleurs prédéfinies alignées sur les tokens Sass.
-- ============================================================

ALTER TABLE child_profiles
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'blue'
  CONSTRAINT child_profiles_color_check
  CHECK (color IN ('blue', 'green', 'orange', 'purple', 'red', 'yellow', 'teal', 'pink'));

COMMENT ON COLUMN child_profiles.color IS
'Couleur de l''espace enfant (identifiant visuel). Valeurs: blue, green, orange, purple, red, yellow, teal, pink. Défaut: blue.';


-- ============================================================
-- VÉRIFICATIONS MANUELLES (smoke tests):
-- ============================================================
-- 1. Vérifier que la colonne existe avec la valeur par défaut
--    SELECT id, name, color FROM child_profiles LIMIT 5;
--    → ATTENDU: tous les profils existants ont color = 'blue'
--
-- 2. Vérifier que la contrainte CHECK fonctionne
--    UPDATE child_profiles SET color = 'invalid' WHERE id = (SELECT id FROM child_profiles LIMIT 1);
--    → ATTENDU: ERROR: new row for relation "child_profiles" violates check constraint
--
-- 3. Vérifier qu'une couleur valide peut être écrite
--    UPDATE child_profiles SET color = 'green' WHERE id = (SELECT id FROM child_profiles LIMIT 1);
--    → ATTENDU: UPDATE 1
-- ============================================================
