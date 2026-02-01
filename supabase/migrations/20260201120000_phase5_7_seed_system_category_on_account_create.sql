-- Migration: Phase 5.7 — Seed catégorie système "Sans catégorie" à la création d'un account
-- Date: 2026-02-01
--
-- Objectif produit (UX/DB_BLUEPRINT): chaque compte doit toujours disposer d'une catégorie système
-- "Sans catégorie" (is_system = TRUE) dès sa création (pas en lazy).
--
-- Pré-requis: idx_categories_system (UNIQUE WHERE is_system=true) existe déjà (Phase 5.6).

BEGIN;

-- 1) Fonction de seed : crée (ou répare) la catégorie système du compte nouvellement créé
CREATE OR REPLACE FUNCTION accounts_seed_system_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_system_id uuid;
BEGIN
  -- Si déjà présent, ne rien faire
  SELECT id INTO v_system_id
  FROM categories
  WHERE account_id = NEW.id
    AND is_system = TRUE
  LIMIT 1;

  IF v_system_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Créer "Sans catégorie" (nom en FR, conforme au contrat actuel)
  -- Stratégie robuste:
  -- - tente une insertion; si un doublon (account_id, name) existe, on force is_system=TRUE
  BEGIN
    INSERT INTO categories (account_id, name, is_system)
    VALUES (NEW.id, 'Sans catégorie', TRUE);
  EXCEPTION
    WHEN unique_violation THEN
      -- Si la catégorie existe déjà (même nom), on la "répare" en is_system=TRUE
      UPDATE categories
      SET is_system = TRUE,
          updated_at = NOW()
      WHERE account_id = NEW.id
        AND name = 'Sans catégorie';
  END;

  -- Sécurité: s'assurer qu'il y a bien une catégorie système (sinon on bloque)
  PERFORM 1
  FROM categories
  WHERE account_id = NEW.id
    AND is_system = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de créer la catégorie système pour account_id=%', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION accounts_seed_system_category() IS
  'Crée la catégorie système "Sans catégorie" (is_system=TRUE) dès la création d''un account';

-- 2) Trigger AFTER INSERT sur accounts
DROP TRIGGER IF EXISTS trigger_accounts_seed_system_category ON accounts;

CREATE TRIGGER trigger_accounts_seed_system_category
  AFTER INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION accounts_seed_system_category();

-- 3) Backfill: garantir que tous les comptes existants ont leur catégorie système
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT a.id AS account_id
    FROM accounts a
    LEFT JOIN categories c
      ON c.account_id = a.id AND c.is_system = TRUE
    WHERE c.id IS NULL
  LOOP
    BEGIN
      INSERT INTO categories (account_id, name, is_system)
      VALUES (r.account_id, 'Sans catégorie', TRUE);
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE categories
        SET is_system = TRUE,
            updated_at = NOW()
        WHERE account_id = r.account_id
          AND name = 'Sans catégorie';
    END;
  END LOOP;
END $$;

COMMIT;
