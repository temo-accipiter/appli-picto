-- Migration: Renommage du profil enfant par défaut 'Mon enfant' → 'Espace 1'
-- Description: Le trigger de création automatique utilisera désormais 'Espace 1'
-- Date: 2026-05-08
-- Référence: Redesign frontend — Phase 2A / Décision produit validée

-- ============================================================
-- OBJECTIF:
-- Modifier uniquement la valeur hardcodée 'Mon enfant' dans la
-- fonction trigger accounts_auto_create_first_child_profile().
-- Les comptes existants avec 'Mon enfant' ne sont PAS touchés.
-- ============================================================

-- Redéfinition de la fonction (CREATE OR REPLACE — pas de recréation du trigger)
CREATE OR REPLACE FUNCTION accounts_auto_create_first_child_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer un espace enfant avec nom par défaut 'Espace 1'
  -- Statut = 'active' par défaut (cf. table child_profiles)
  INSERT INTO child_profiles (account_id, name)
  VALUES (NEW.id, 'Espace 1');

  -- Le trigger sur child_profiles prendra le relais pour créer timeline + slots
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION accounts_auto_create_first_child_profile() IS
'Contrat produit § 2.6: Créer automatiquement le premier espace enfant "Espace 1" à la création d''un compte';


-- ============================================================
-- NOTE: Le trigger trigger_accounts_auto_create_first_child_profile
-- est conservé tel quel (AFTER INSERT ON accounts). Seule la
-- valeur dans la fonction a changé. Aucun DROP/RECREATE du trigger.
-- ============================================================

-- ============================================================
-- VÉRIFICATIONS MANUELLES (smoke tests):
-- ============================================================
-- 1. Simuler création compte → vérifier nom 'Espace 1'
--    INSERT INTO accounts (id, status) VALUES (gen_random_uuid(), 'free');
--    SELECT name FROM child_profiles ORDER BY created_at DESC LIMIT 1;
--    → ATTENDU: name = 'Espace 1'
--
-- 2. Vérifier que les profils existants avec 'Mon enfant' sont INCHANGÉS
--    SELECT COUNT(*) FROM child_profiles WHERE name = 'Mon enfant';
--    → ATTENDU: même nombre qu'avant la migration (pas de UPDATE rétroactif)
-- ============================================================
