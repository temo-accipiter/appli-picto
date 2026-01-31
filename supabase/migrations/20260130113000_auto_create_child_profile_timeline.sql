-- Migration: Phase 4.5 — Création automatique profil enfant + timeline + slots minimaux
-- Description: Implémente le contrat produit "application jamais vide" lors de la création d'un compte
-- Date: 2026-01-30
-- Référence: PRODUCT_MODEL.md § 2.6 Gestion des profils enfants

-- ============================================================
-- OBJECTIF:
-- À la création d'un compte utilisateur authentifié (Free ou Abonné):
-- 1. Créer automatiquement un profil enfant "Mon enfant"
-- 2. Créer automatiquement sa timeline (1:1)
-- 3. Initialiser automatiquement les slots minimaux (1 step + 1 reward, tokens = 0)
--
-- Résultat: l'utilisateur arrive dans une application fonctionnelle, jamais vide
-- ============================================================


-- ============================================================
-- 1. TRIGGER: Créer automatiquement le premier profil enfant
--    à la création d'un compte (INSERT sur accounts)
-- ============================================================

CREATE OR REPLACE FUNCTION accounts_auto_create_first_child_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer un profil enfant avec nom par défaut "Mon enfant"
  -- Statut = 'active' par défaut (cf. table child_profiles)
  INSERT INTO child_profiles (account_id, name)
  VALUES (NEW.id, 'Mon enfant');

  -- Le trigger sur child_profiles prendra le relais pour créer timeline + slots
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger AFTER INSERT sur accounts
CREATE TRIGGER trigger_accounts_auto_create_first_child_profile
  AFTER INSERT ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION accounts_auto_create_first_child_profile();

COMMENT ON FUNCTION accounts_auto_create_first_child_profile() IS
'Contrat produit § 2.6: Créer automatiquement le premier profil enfant "Mon enfant" à la création d''un compte';


-- ============================================================
-- 2. TRIGGER: Créer automatiquement la timeline
--    à la création d'un profil enfant (INSERT sur child_profiles)
-- ============================================================

CREATE OR REPLACE FUNCTION child_profiles_auto_create_timeline()
RETURNS TRIGGER AS $$
DECLARE
  new_timeline_id UUID;
BEGIN
  -- Créer une timeline pour ce profil enfant (relation 1:1)
  INSERT INTO timelines (child_profile_id)
  VALUES (NEW.id)
  RETURNING id INTO new_timeline_id;

  -- Le trigger sur timelines prendra le relais pour créer slots minimaux
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger AFTER INSERT sur child_profiles
CREATE TRIGGER trigger_child_profiles_auto_create_timeline
  AFTER INSERT ON child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION child_profiles_auto_create_timeline();

COMMENT ON FUNCTION child_profiles_auto_create_timeline() IS
'Contrat produit § 2.6: Créer automatiquement la timeline pour chaque nouveau profil enfant';


-- ============================================================
-- 3. TRIGGER: Initialiser automatiquement les slots minimaux
--    à la création d'une timeline (INSERT sur timelines)
-- ============================================================

CREATE OR REPLACE FUNCTION timelines_auto_create_minimal_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer 1 slot Étape (position 0, vide, tokens = 0)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'step', 0, NULL, 0);

  -- Créer 1 slot Récompense (position 1, vide, tokens = NULL)
  INSERT INTO slots (timeline_id, kind, position, card_id, tokens)
  VALUES (NEW.id, 'reward', 1, NULL, NULL);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger AFTER INSERT sur timelines
CREATE TRIGGER trigger_timelines_auto_create_minimal_slots
  AFTER INSERT ON timelines
  FOR EACH ROW
  EXECUTE FUNCTION timelines_auto_create_minimal_slots();

COMMENT ON FUNCTION timelines_auto_create_minimal_slots() IS
'Contrat produit § 2.6: Initialiser automatiquement la structure minimale (1 step + 1 reward, tokens = 0)';


-- ============================================================
-- 4. MODIFICATION TRIGGERS: Désactiver min_step/min_reward lors des cascades légitimes
--    pour permettre suppression compte, RGPD, maintenance
-- ============================================================

-- Modifier le trigger slots_enforce_min_step pour autoriser cascades
CREATE OR REPLACE FUNCTION slots_enforce_min_step()
RETURNS TRIGGER AS $$
DECLARE
  step_count INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  -- Détecter si on est dans un contexte de cascade (suppression timeline/profil/compte)
  -- En PostgreSQL, un DELETE cascade déclenché par ON DELETE CASCADE n'a pas de marqueur spécifique
  -- On doit vérifier si la timeline parente existe encore
  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id) INTO is_cascade_context;

  -- Si la timeline n'existe plus, c'est une cascade → autoriser
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  -- Si on supprime un slot de type 'step' (hors cascade)
  IF OLD.kind = 'step' THEN
    -- Compter les slots step restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO step_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'step'
      AND id != OLD.id;

    -- Si c'est le dernier slot step, bloquer la suppression
    IF step_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Étape de la timeline (id: %). Une timeline doit contenir au minimum 1 slot Étape.', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot reward ou pas le dernier step ou cascade)
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION slots_enforce_min_step() IS
'Invariant contractuel: empêche suppression du dernier slot step (timeline doit contenir au minimum 1 slot Étape). Autorise cascades (suppression compte, RGPD, maintenance)';


-- Modifier le trigger slots_enforce_min_reward pour autoriser cascades
CREATE OR REPLACE FUNCTION slots_enforce_min_reward()
RETURNS TRIGGER AS $$
DECLARE
  reward_count INTEGER;
  is_cascade_context BOOLEAN;
BEGIN
  -- Détecter si on est dans un contexte de cascade (suppression timeline/profil/compte)
  SELECT EXISTS(SELECT 1 FROM timelines WHERE id = OLD.timeline_id) INTO is_cascade_context;

  -- Si la timeline n'existe plus, c'est une cascade → autoriser
  IF NOT is_cascade_context THEN
    RETURN OLD;
  END IF;

  -- Si on supprime un slot de type 'reward' (hors cascade)
  IF OLD.kind = 'reward' THEN
    -- Compter les slots reward restants pour cette timeline (après suppression)
    SELECT COUNT(*) INTO reward_count
    FROM slots
    WHERE timeline_id = OLD.timeline_id
      AND kind = 'reward'
      AND id != OLD.id;

    -- Si c'est le dernier slot reward, bloquer la suppression
    IF reward_count = 0 THEN
      RAISE EXCEPTION 'Impossible de supprimer le dernier slot Récompense de la timeline (id: %). Une timeline doit toujours contenir au moins 1 slot Récompense (peut être vide).', OLD.timeline_id;
    END IF;
  END IF;

  -- Autoriser la suppression (slot step ou pas le dernier reward ou cascade)
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION slots_enforce_min_reward() IS
'Invariant contractuel: empêche suppression du dernier slot reward (timeline doit toujours contenir au moins 1 slot Récompense, peut être vide). Autorise cascades (suppression compte, RGPD, maintenance)';


-- ============================================================
-- Ce que cette migration introduit:
-- ============================================================
-- ✅ Trigger accounts → auto-création profil enfant "Mon enfant"
-- ✅ Trigger child_profiles → auto-création timeline (1:1)
-- ✅ Trigger timelines → auto-initialisation slots minimaux (1 step position 0 + 1 reward position 1, tokens = 0)
-- ✅ Modification triggers min_step/min_reward pour autoriser cascades (suppression compte, RGPD, maintenance)
--
-- Résultat: Application jamais vide à la création d'un compte (contrat produit § 2.6)
-- ============================================================


-- ============================================================
-- VÉRIFICATIONS MANUELLES (smoke tests):
-- ============================================================
-- 1. Créer un compte → vérifier création auto profil enfant "Mon enfant"
--    INSERT INTO accounts (id, status) VALUES (gen_random_uuid(), 'free');
--    SELECT * FROM child_profiles ORDER BY created_at DESC LIMIT 1;
--    → ATTENDU: 1 ligne, name = 'Mon enfant', status = 'active'
--
-- 2. Vérifier création auto timeline pour ce profil
--    SELECT * FROM timelines WHERE child_profile_id = (SELECT id FROM child_profiles ORDER BY created_at DESC LIMIT 1);
--    → ATTENDU: 1 ligne
--
-- 3. Vérifier création auto slots minimaux (1 step + 1 reward)
--    SELECT * FROM slots WHERE timeline_id = (SELECT id FROM timelines ORDER BY created_at DESC LIMIT 1) ORDER BY position;
--    → ATTENDU: 2 lignes
--      - Ligne 1: kind = 'step', position = 0, card_id = NULL, tokens = 0
--      - Ligne 2: kind = 'reward', position = 1, card_id = NULL, tokens = NULL
--
-- 4. Vérifier que suppression compte fonctionne (cascade autorisée)
--    DELETE FROM accounts WHERE id = (SELECT id FROM accounts ORDER BY created_at DESC LIMIT 1);
--    → ATTENDU: Pas d'erreur, cascade sur child_profiles → timelines → slots
--
-- 5. Vérifier que suppression manuelle dernier step est toujours bloquée (hors cascade)
--    DELETE FROM slots WHERE kind = 'step' AND timeline_id = '<uuid_timeline>';
--    → ATTENDU: EXCEPTION "Impossible de supprimer le dernier slot Étape..."
--
-- 6. Vérifier que création manuelle profil enfant déclenche aussi auto-création timeline + slots
--    INSERT INTO child_profiles (account_id, name) VALUES ('<uuid_account>', 'Deuxième enfant');
--    SELECT * FROM slots WHERE timeline_id = (SELECT id FROM timelines ORDER BY created_at DESC LIMIT 1);
--    → ATTENDU: 2 slots (1 step + 1 reward)
-- ============================================================
