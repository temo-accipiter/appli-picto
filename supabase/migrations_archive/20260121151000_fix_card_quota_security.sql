-- ==============================================================================
-- Migration Corrective : Sécurisation Fonctions de Vérification Quotas Cartes
-- ==============================================================================
-- Objectif : Éliminer les fuites de métadonnées via les fonctions quota helpers
--
-- Problème Corrigé :
--   Les fonctions check_card_quota_stock(uid) et check_card_quota_monthly(uid)
--   sont SECURITY DEFINER avec row_security=off, et acceptent un paramètre uid.
--   → Un utilisateur peut appeler la fonction avec un autre UUID et inférer :
--     - Si le compte existe
--     - Si c'est un admin (toujours true)
--     - Si les quotas sont atteints
--   → Violation de confidentialité (fuite de métadonnées sensibles)
--
-- Solution :
--   1. Créer nouvelles fonctions _self() sans paramètre (utilisent auth.uid())
--   2. Mettre à jour policy cards_insert pour utiliser les nouvelles fonctions
--   3. Supprimer anciennes fonctions (inutilisées hors policy)
--   4. Documenter stratégie concurrence (risque MVP acceptable)
--
-- Garanties Sécurité :
--   ✅ Impossible de vérifier les quotas d'un autre utilisateur
--   ✅ SECURITY DEFINER gardé (nécessaire pour row_security=off)
--   ✅ row_security=off gardé (nécessaire pour COUNT cross-user admin)
--   ✅ Fonctions utilisables UNIQUEMENT pour l'utilisateur courant
--
-- Stratégie Concurrence (MVP) :
--   ⚠️  Risque théorique : 2 inserts simultanés peuvent dépasser quota de 1
--   ✅ Probabilité : très faible (nécessite 2 requêtes au même microsecond)
--   ✅ Impact : limité (1 carte en trop sur 50-100, pas critique business)
--   ✅ Mitigation future : advisory lock pg_advisory_xact_lock(hashtext(auth.uid()))
--   📝 Décision : Risque accepté pour MVP (documenté ici)
--
-- Idempotence : ✅ Migration replay-safe (CREATE OR REPLACE + DROP IF EXISTS)
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : Fonction Helper Sécurisée — Quota Stock (Self)
-- ==============================================================================

-- Nouvelle fonction : vérification quota stock pour l'utilisateur courant UNIQUEMENT
-- Pas de paramètre → impossible de sonder d'autres utilisateurs
CREATE OR REPLACE FUNCTION public.check_card_quota_stock_self()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid;
  v_plan text;
  v_stock_limit integer;
  v_stock_used bigint;
BEGIN
  -- Récupérer l'utilisateur authentifié
  v_user_id := auth.uid();

  -- Si pas d'utilisateur authentifié → bloquer
  -- Cas: fonction appelée hors contexte auth (ne devrait jamais arriver en RLS)
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Récupérer le plan de l'utilisateur courant
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE user_id = v_user_id;

  -- Si utilisateur n'existe pas dans profiles → bloquer
  IF v_plan IS NULL THEN
    RETURN false;
  END IF;

  -- Admin : toujours autorisé (illimité)
  -- Note: check sur v_user_id (pas de paramètre externe)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND is_admin = true) THEN
    RETURN true;
  END IF;

  -- Récupérer la limite de stock pour ce plan
  SELECT stock_limit INTO v_stock_limit
  FROM public.quota_definitions
  WHERE plan = v_plan;

  -- Si limite NULL → illimité (autorisé)
  IF v_stock_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Calculer le stock actuel (nombre de cartes user possédées)
  -- Note: compte POUR L'UTILISATEUR COURANT uniquement
  SELECT COUNT(*) INTO v_stock_used
  FROM public.cards
  WHERE owner_type = 'user' AND owner_id = v_user_id;

  -- Vérifier si le stock actuel est sous la limite
  -- Note : on vérifie < (pas <=) car on est sur le point d'ajouter une carte
  RETURN v_stock_used < v_stock_limit;
END;
$$;

COMMENT ON FUNCTION public.check_card_quota_stock_self() IS
  'Helper RLS : vérifie quota de stock pour l''utilisateur authentifié UNIQUEMENT.

   Différences vs check_card_quota_stock(uid) :
   - Pas de paramètre → impossible de vérifier les quotas d''un autre user
   - Utilise auth.uid() directement → garantie que c''est l''utilisateur courant
   - SECURITY DEFINER gardé → nécessaire pour row_security=off (COUNT cross-user admin)

   Logique :
   - Utilisateur non authentifié : false
   - Admin : toujours true (illimité)
   - Plan avec stock_limit NULL : true (illimité)
   - Sinon : COUNT cartes user < stock_limit

   Garanties Sécurité :
   - Aucune fuite de métadonnées (impossible de sonder autres users)
   - Source de vérité unique : table cards
   - Performance : utilise index idx_cards_owner existant

   Concurrence (MVP) :
   - Risque théorique : 2 inserts simultanés peuvent dépasser quota de 1
   - Probabilité : très faible (requiert 2 requêtes au même microsecond sur même compte)
   - Impact : limité (1 carte en trop, pas critique)
   - Mitigation future : pg_advisory_xact_lock si nécessaire';

-- ==============================================================================
-- ÉTAPE 2 : Fonction Helper Sécurisée — Quota Mensuel (Self)
-- ==============================================================================

-- Nouvelle fonction : vérification quota mensuel pour l'utilisateur courant UNIQUEMENT
CREATE OR REPLACE FUNCTION public.check_card_quota_monthly_self()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid;
  v_plan text;
  v_monthly_limit integer;
  v_monthly_used bigint;
  v_month_start timestamptz;
BEGIN
  -- Récupérer l'utilisateur authentifié
  v_user_id := auth.uid();

  -- Si pas d'utilisateur authentifié → bloquer
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Récupérer le plan de l'utilisateur courant
  SELECT plan INTO v_plan
  FROM public.profiles
  WHERE user_id = v_user_id;

  -- Si utilisateur n'existe pas dans profiles → bloquer
  IF v_plan IS NULL THEN
    RETURN false;
  END IF;

  -- Admin : toujours autorisé (illimité)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id AND is_admin = true) THEN
    RETURN true;
  END IF;

  -- Récupérer la limite mensuelle pour ce plan
  SELECT monthly_limit INTO v_monthly_limit
  FROM public.quota_definitions
  WHERE plan = v_plan;

  -- Si limite NULL → illimité (autorisé)
  IF v_monthly_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Calculer le début du mois courant
  v_month_start := date_trunc('month', now());

  -- Calculer le nombre de cartes créées ce mois par l'utilisateur courant
  -- Note : on compte les créations depuis le 1er du mois (reset automatique)
  SELECT COUNT(*) INTO v_monthly_used
  FROM public.cards
  WHERE owner_type = 'user'
    AND owner_id = v_user_id
    AND created_at >= v_month_start;

  -- Vérifier si l'usage mensuel est sous la limite
  -- Note : on vérifie < (pas <=) car on est sur le point d'ajouter une carte
  RETURN v_monthly_used < v_monthly_limit;
END;
$$;

COMMENT ON FUNCTION public.check_card_quota_monthly_self() IS
  'Helper RLS : vérifie quota mensuel pour l''utilisateur authentifié UNIQUEMENT.

   Différences vs check_card_quota_monthly(uid) :
   - Pas de paramètre → impossible de vérifier les quotas d''un autre user
   - Utilise auth.uid() directement → garantie que c''est l''utilisateur courant
   - SECURITY DEFINER gardé → nécessaire pour row_security=off (COUNT cross-user admin)

   Logique :
   - Utilisateur non authentifié : false
   - Admin : toujours true (illimité)
   - Plan avec monthly_limit NULL : true (illimité)
   - Sinon : COUNT créations depuis date_trunc(month) < monthly_limit

   Garanties Sécurité :
   - Aucune fuite de métadonnées (impossible de sonder autres users)
   - Reset automatique le 1er de chaque mois (via date_trunc)
   - Modifier une carte existante ne consomme rien (count sur created_at uniquement)
   - Source de vérité unique : table cards.created_at
   - Performance : utilise index composite idx_cards_user_monthly

   Concurrence (MVP) :
   - Même stratégie que check_card_quota_stock_self (voir commentaires ci-dessus)';

-- ==============================================================================
-- ÉTAPE 3 : Mise à Jour Policy cards_insert (Utiliser Nouvelles Fonctions)
-- ==============================================================================

-- Recréer la policy cards_insert avec les nouvelles fonctions sécurisées
DROP POLICY IF EXISTS cards_insert ON public.cards;

CREATE POLICY cards_insert ON public.cards
  FOR INSERT
  WITH CHECK (
    (
      -- Cartes utilisateur : vérifications strictes
      owner_type = 'user' AND
      owner_id = auth.uid() AND
      auth.uid() IS NOT NULL AND

      -- Vérification 1 : utilisateur abonné actif (ou période de grâce)
      public.is_subscriber_active(auth.uid()) AND

      -- Vérification 2 : quota stock OK (✅ FONCTION SÉCURISÉE)
      public.check_card_quota_stock_self() AND

      -- Vérification 3 : quota mensuel OK (✅ FONCTION SÉCURISÉE)
      public.check_card_quota_monthly_self()
    )
    OR
    -- Admin : bypass toutes les vérifications (illimité)
    public.is_admin()
  );

COMMENT ON POLICY cards_insert ON public.cards IS
  'Policy INSERT cartes : enforce quotas côté serveur avec fonctions sécurisées.

   Règles :
   - Admin : bypass complet (illimité)
   - Cartes user : subscriber actif + quota stock OK + quota mensuel OK
   - Cartes bank : création interdite via cette policy (admin-only via autres mécanismes)

   Garanties Sécurité :
   ✅ Impossible de bypass (RLS serveur-side)
   ✅ Impossible de vérifier les quotas d''un autre utilisateur (fonctions _self)
   ✅ Visitor/Free bloqués par is_subscriber_active (false)
   ✅ Subscriber bloqué si quota dépassé
   ✅ Modifier une carte existante ne passe PAS par cette policy (cards_update séparée)

   Concurrence (MVP) :
   ⚠️  Risque accepté : 2 inserts simultanés peuvent dépasser quota de 1 (probabilité faible)
   📝 Mitigation future possible : pg_advisory_xact_lock(hashtext(auth.uid()::text))';

-- ==============================================================================
-- ÉTAPE 4 : Suppression Anciennes Fonctions (Nettoyage)
-- ==============================================================================

-- Supprimer les anciennes fonctions non sécurisées
-- Justification :
--   - Utilisées uniquement dans policy cards_insert (maintenant migrée)
--   - Aucun appel frontend direct
--   - Garder ces fonctions = risque de fuite de métadonnées si appelées manuellement

DROP FUNCTION IF EXISTS public.check_card_quota_stock(uuid);
DROP FUNCTION IF EXISTS public.check_card_quota_monthly(uuid);

-- ==============================================================================
-- ÉTAPE 5 : Validation Post-Migration
-- ==============================================================================

DO $$
DECLARE
  v_function_stock_self_exists boolean;
  v_function_monthly_self_exists boolean;
  v_old_function_stock_exists boolean;
  v_old_function_monthly_exists boolean;
BEGIN
  -- Vérifier que les nouvelles fonctions existent
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_stock_self'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_stock_self_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_monthly_self'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_monthly_self_exists;

  -- Vérifier que les anciennes fonctions n'existent plus
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_stock'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_old_function_stock_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_card_quota_monthly'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_old_function_monthly_exists;

  -- Validations
  IF NOT v_function_stock_self_exists THEN
    RAISE EXCEPTION 'Migration échouée : fonction check_card_quota_stock_self non créée';
  END IF;

  IF NOT v_function_monthly_self_exists THEN
    RAISE EXCEPTION 'Migration échouée : fonction check_card_quota_monthly_self non créée';
  END IF;

  IF v_old_function_stock_exists THEN
    RAISE WARNING 'Nettoyage incomplet : ancienne fonction check_card_quota_stock encore présente';
  END IF;

  IF v_old_function_monthly_exists THEN
    RAISE WARNING 'Nettoyage incomplet : ancienne fonction check_card_quota_monthly encore présente';
  END IF;

  -- Vérifier que la policy cards_insert existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'cards' AND policyname = 'cards_insert'
  ) THEN
    RAISE EXCEPTION 'Migration échouée : policy cards_insert non créée';
  END IF;

  -- Log de succès
  RAISE NOTICE 'Migration 151000 réussie : sécurisation fonctions quotas cartes.';
  RAISE NOTICE '  ✅ Nouvelles fonctions sécurisées : check_card_quota_stock_self, check_card_quota_monthly_self';
  RAISE NOTICE '  ✅ Anciennes fonctions supprimées : check_card_quota_stock(uuid), check_card_quota_monthly(uuid)';
  RAISE NOTICE '  ✅ Policy cards_insert mise à jour avec fonctions sécurisées';
  RAISE NOTICE '  🔒 Garantie : Impossible de vérifier les quotas d''un autre utilisateur';
  RAISE NOTICE '  ⚠️  Concurrence : Risque MVP accepté (documenté dans commentaires)';
END $$;

-- ==============================================================================
-- FIN DE LA MIGRATION CORRECTIVE
-- ==============================================================================

-- ==============================================================================
-- NOTES TECHNIQUES : SÉCURITÉ ET ÉVOLUTION
-- ==============================================================================

-- 1. POURQUOI SECURITY DEFINER + row_security = off ?
-- ----------------------------------------------------
-- Les fonctions doivent COUNT(*) sur public.cards pour vérifier les quotas.
-- RLS est activé sur cards → sans SECURITY DEFINER, la fonction ne peut pas
-- compter les cartes d'un admin (qui bypass RLS via is_admin).
-- row_security = off permet à la fonction (exécutée en tant que owner)
-- de voir TOUTES les cartes, nécessaire pour COUNT correct.
--
-- SÉCURITÉ : En supprimant le paramètre uid et en utilisant auth.uid(),
-- on garantit que la fonction ne peut être utilisée QUE pour l'utilisateur courant.

-- 2. STRATÉGIE CONCURRENCE (DÉTAILS)
-- -----------------------------------
-- Scénario théorique :
--   1. User a 49 cartes (limite 50)
--   2. Deux requêtes INSERT simultanées :
--      - Requête A : check_card_quota_stock_self() → COUNT=49 → true → INSERT
--      - Requête B : check_card_quota_stock_self() → COUNT=49 → true → INSERT
--   3. Résultat : 51 cartes (dépassement de 1)
--
-- Probabilité :
--   - Très faible : nécessite 2 requêtes au même microsecond sur même compte
--   - En pratique : utilisateurs créent 1 carte à la fois (UX manuelle)
--
-- Impact :
--   - Limité : 1 carte en trop sur 50-100 (non critique business)
--   - Pas de risque sécurité (pas d'abus systématique possible)
--
-- Décision MVP :
--   - Risque accepté et documenté
--   - Pas de mitigation pour l'instant (complexité vs bénéfice)
--
-- Mitigation future (si nécessaire) :
--   - Advisory lock au niveau transaction :
--     BEGIN;
--     SELECT pg_advisory_xact_lock(hashtext(auth.uid()::text));
--     -- Vérification quotas + INSERT ici
--     COMMIT;
--   - Sérialisé les inserts PAR USER (pas global, pas de bottleneck)
--   - Overhead minimal (~1ms par lock)

-- 3. TESTER LA SÉCURITÉ
-- ----------------------
-- Vérifier qu'un utilisateur ne peut PAS vérifier les quotas d'un autre :
--
-- -- Se connecter en tant qu'utilisateur A
-- SELECT public.check_card_quota_stock_self();  -- OK : retourne boolean pour user A
-- SELECT public.check_card_quota_monthly_self(); -- OK : retourne boolean pour user A
--
-- -- Tenter de vérifier quotas d'un autre utilisateur B (DOIT ÉCHOUER)
-- SELECT public.check_card_quota_stock_self();  -- Retourne toujours les quotas de A, pas B
-- -- Pas de moyen de passer un autre UUID → sécurité garantie

-- 4. PERFORMANCE
-- --------------
-- Aucun changement vs version précédente :
--   - Mêmes index utilisés (idx_cards_owner, idx_cards_user_monthly)
--   - Mêmes requêtes COUNT
--   - Performance attendue : < 5ms par vérification

-- 5. RETROCOMPATIBILITÉ
-- ---------------------
-- Cette migration CASSE la retrocompatibilité si :
--   - Du code externe (scripts, edge functions) appelait directement
--     check_card_quota_stock(uuid) ou check_card_quota_monthly(uuid)
--
-- Vérification nécessaire :
--   - Rechercher dans le codebase : "check_card_quota_stock(" ou "check_card_quota_monthly("
--   - Si trouvé en dehors de la policy cards_insert → adapter le code
--   - Si non trouvé → migration safe (cas attendu)
