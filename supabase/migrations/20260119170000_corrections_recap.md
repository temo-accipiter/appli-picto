# CORRECTIONS DES MIGRATIONS — Récapitulatif des failles corrigées

**Date** : 2026-01-19
**Objectif** : Corriger les failles de sécurité, robustesse et idempotence des migrations 120000, 130000, 140000 + ajout protection mode immuable (160000)

---

## 🎯 RÉSUMÉ DES CORRECTIONS

| Migration  | Fichier                                  | Corrections apportées                                                    | Statut     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| **120000** | `add_sequence_parent_card.sql`           | Idempotence + index unique par owner + RLS WITH CHECK                    | ✅ Corrigé |
| **130000** | `add_slot_completion.sql`                | Idempotence + completed_by forcé auth.uid() + suppression policy inutile | ✅ Corrigé |
| **140000** | `enforce_sequence_constraints.sql`       | Idempotence + jetons forcés à 0 si NULL                                  | ✅ Corrigé |
| **160000** | `protect_timeline_mode_immutability.sql` | ✨ NOUVEAU : Protection mode immuable                                    | ✅ Créé    |

---

## 🐛 FAILLE 1 : Index unique global au lieu de par propriétaire (Migration 120000)

### Problème identifié

```sql
-- ❌ AVANT (INCORRECT) : Index unique GLOBAL
CREATE UNIQUE INDEX timelines_unique_parent_card_sequence
ON public.timelines (parent_card_id)
WHERE mode = 'sequence';
```

**Impact** :

- ❌ Un seul utilisateur pouvait créer une séquence sur une bank card
- ❌ Empêchait plusieurs users d'avoir leur propre séquence sur la même carte banque
- ❌ Violation du modèle produit : les bank cards doivent être utilisables par tous

### Correction appliquée

```sql
-- ✅ APRÈS (CORRECT) : Index unique PAR PROPRIÉTAIRE
DROP INDEX IF EXISTS public.timelines_unique_parent_card_sequence;

CREATE UNIQUE INDEX IF NOT EXISTS timelines_unique_parent_card_per_owner
ON public.timelines (owner_id, parent_card_id)
WHERE mode = 'sequence';
```

**Résultat** :

- ✅ Chaque owner peut avoir 1 séquence par carte (invariant 1-1 par propriétaire)
- ✅ Plusieurs users peuvent avoir des séquences sur la même bank card
- ✅ Alignement avec le modèle produit

---

## 🐛 FAILLE 2 : Non-idempotence de la migration 120000

### Problème identifié

```sql
-- ❌ AVANT : Erreur si replay
ALTER TABLE public.timelines ADD COLUMN parent_card_id uuid;
ALTER TABLE public.timelines ADD CONSTRAINT timelines_parent_card_id_fkey ...;
ALTER TABLE public.timelines ADD CONSTRAINT timelines_mode_parent_card_consistency ...;
CREATE UNIQUE INDEX timelines_unique_parent_card_sequence ...;
```

**Impact** :

- ❌ Migration échoue si rejouée (colonne/contrainte déjà existante)
- ❌ Impossible de reset/rebuild DB proprement
- ❌ Blocage en dev si migration appliquée puis rollback

### Correction appliquée

```sql
-- ✅ APRÈS : Idempotent avec vérifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE ...) THEN
    ALTER TABLE public.timelines ADD COLUMN parent_card_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...') THEN
    ALTER TABLE ... ADD CONSTRAINT ...;
  END IF;
END $$;

DROP INDEX IF EXISTS public.timelines_unique_parent_card_sequence;
CREATE UNIQUE INDEX IF NOT EXISTS timelines_unique_parent_card_per_owner ...;
```

**Résultat** :

- ✅ Migration rejouable sans erreur
- ✅ Reset DB safe
- ✅ Compatible avec workflow de développement

---

## 🐛 FAILLE 3 : RLS policy sans WITH CHECK (Migration 120000)

### Problème identifié

```sql
-- ❌ AVANT : USING uniquement, pas de WITH CHECK
CREATE POLICY timelines_parent_card_owner_match ON public.timelines
AS RESTRICTIVE
FOR ALL
USING (...);
-- Pas de WITH CHECK => INSERT/UPDATE non validés correctement
```

**Impact** :

- ❌ USING filtre SELECT/UPDATE/DELETE mais pas INSERT/UPDATE côté new row
- ❌ Possible d'insérer une timeline avec parent_card_id incohérent
- ❌ Protection RLS incomplète

### Correction appliquée

```sql
-- ✅ APRÈS : USING + WITH CHECK
CREATE POLICY timelines_parent_card_owner_match ON public.timelines
AS RESTRICTIVE
FOR ALL
USING (
  -- Logique pour SELECT/UPDATE/DELETE (old row)
  mode = 'planning' OR (...)
)
WITH CHECK (
  -- Même logique pour INSERT/UPDATE (new row)
  mode = 'planning' OR (...)
);
```

**Résultat** :

- ✅ Protection complète INSERT + UPDATE + SELECT + DELETE
- ✅ Impossible d'insérer données incohérentes même via RLS

---

## 🐛 FAILLE 4 : Non-idempotence de la migration 130000

### Problème identifié

```sql
-- ❌ AVANT : Erreur si replay
ALTER TABLE public.slots ADD COLUMN completed_at timestamptz;
ALTER TABLE public.slots ADD COLUMN completed_by uuid;
CREATE INDEX idx_slots_completed ...;
```

**Impact** :

- ❌ Migration échoue si rejouée
- ❌ Même problème que faille 2

### Correction appliquée

```sql
-- ✅ APRÈS : Idempotent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE ...) THEN
    ALTER TABLE public.slots ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_slots_completed ...;
```

**Résultat** :

- ✅ Migration rejouable sans erreur

---

## 🐛 FAILLE 5 : completed_by non forcé à auth.uid() (Migration 130000)

### Problème identifié

```sql
-- ❌ AVANT : completed_by peut être falsifié
-- L'utilisateur pouvait passer n'importe quel UUID dans completed_by
UPDATE slots SET completed_at = NOW(), completed_by = 'uuid-autre-user' WHERE id = ?;
```

**Impact** :

- ❌ Traçabilité non fiable (falsifiable)
- ❌ Possible d'usurper l'identité d'un autre user
- ❌ Audit compromis

### Correction appliquée

```sql
-- ✅ APRÈS : Trigger force auth.uid() automatiquement
CREATE OR REPLACE FUNCTION public.prevent_modify_completed_slot()
...
  -- CAS 2A : Passage de NULL → NOT NULL (complétion du slot)
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    -- Refuser si non authentifié
    IF v_current_user_id IS NULL THEN
      RAISE EXCEPTION 'Impossible de compléter un slot sans être authentifié';
    END IF;

    -- Forcer completed_by à l'utilisateur courant (non falsifiable)
    NEW.completed_by := v_current_user_id;
    RETURN NEW;
  END IF;

  -- Interdire modification manuelle de completed_by
  IF NEW.completed_by != OLD.completed_by THEN
    RAISE EXCEPTION 'Impossible de modifier completed_by manuellement';
  END IF;
...
```

**Résultat** :

- ✅ completed_by forcé automatiquement à auth.uid() (non falsifiable)
- ✅ Impossible de compléter un slot sans être authentifié
- ✅ Impossible de modifier completed_by manuellement
- ✅ Traçabilité fiable et auditabilité garantie

---

## 🐛 FAILLE 6 : Policy RLS slots_no_reorder_completed inutile (Migration 130000)

### Problème identifié

```sql
-- ❌ AVANT : Policy qui autorise tout (inutile)
CREATE POLICY slots_no_reorder_completed ON public.slots
AS RESTRICTIVE
FOR UPDATE
USING (completed_at IS NULL OR true)  -- Autorise tout si true
WITH CHECK (true);  -- Autorise tout
```

**Impact** :

- ❌ Policy redondante avec le trigger
- ❌ Confusion : donne l'impression de protéger alors qu'elle autorise tout
- ❌ Maintenance inutile

### Correction appliquée

```sql
-- ✅ APRÈS : Policy supprimée
-- Note : La policy slots_no_reorder_completed a été supprimée car elle était redondante
-- et autorisait tout (USING true, WITH CHECK true). Le trigger gère déjà toutes les
-- protections nécessaires pour les UPDATE.
```

**Résultat** :

- ✅ Code plus clair : le trigger gère toutes les protections UPDATE
- ✅ Policy slots_no_delete_completed conservée (utile pour DELETE)
- ✅ Moins de maintenance

---

## 🐛 FAILLE 7 : Non-idempotence de la migration 140000

### Problème identifié

```sql
-- ❌ AVANT : Fonction et trigger recréés mais pas idempotent dans tous les cas
CREATE OR REPLACE FUNCTION ... -- OK (idempotent)
DROP TRIGGER IF EXISTS ... CREATE TRIGGER ... -- OK (idempotent)
-- Mais validation post-migration pourrait échouer si rejouée avec données incohérentes
```

**Impact** :

- ✅ Déjà partiellement idempotent (CREATE OR REPLACE + DROP IF EXISTS)
- ⚠️ Validation pourrait échouer si données incohérentes persistent

### Correction appliquée

```sql
-- ✅ APRÈS : Nettoyage données plus robuste
-- Mettre jetons à 0 pour tous les steps de séquences (y compris jetons NULL)
WITH updated AS (
  UPDATE public.slots
  SET jetons = 0
  WHERE (jetons != 0 OR jetons IS NULL)  -- ✅ Inclut NULL maintenant
  AND timeline_id IN (SELECT id FROM public.timelines WHERE mode = 'sequence')
  RETURNING *
)
SELECT COUNT(*) INTO v_updated_jetons FROM updated;
```

**Résultat** :

- ✅ Gère aussi le cas jetons=NULL (robustesse accrue)
- ✅ Migration rejouable même si données partiellement corrigées

---

## 🐛 FAILLE 8 : Jetons NULL non gérés dans séquences (Migration 140000)

### Problème identifié

```sql
-- ❌ AVANT : Jetons NULL tolérés dans séquences
IF NEW.jetons != 0 THEN
  RAISE EXCEPTION 'Impossible d''attribuer des jetons dans une séquence';
END IF;
-- Mais si NEW.jetons IS NULL => pas d'erreur, incohérence possible
```

**Impact** :

- ❌ Possible d'insérer slots avec jetons=NULL dans séquences
- ❌ Incohérence avec l'invariant "jetons=0 dans séquences"
- ❌ Requêtes `WHERE jetons != 0` ne détectent pas les NULL

### Correction appliquée

```sql
-- ✅ APRÈS : Forcer jetons à 0 si NULL
IF v_timeline_mode = 'sequence' THEN
  -- RÈGLE 2 : Forcer jetons à 0 si NULL, interdire si non-zéro
  IF NEW.jetons IS NULL THEN
    -- Forcer automatiquement à 0 (robustesse)
    NEW.jetons := 0;
    RAISE NOTICE 'Jetons forcés à 0 dans séquence';
  ELSIF NEW.jetons != 0 THEN
    -- Interdire explicitement jetons non-zéro
    RAISE EXCEPTION 'Impossible d''attribuer des jetons dans une séquence';
  END IF;
END IF;
```

**Résultat** :

- ✅ Jetons forcés automatiquement à 0 si NULL dans séquences
- ✅ Robustesse maximale : impossible d'avoir jetons NULL ou non-zéro
- ✅ Invariant "jetons=0" strictement garanti

---

## 🆕 FAILLE 9 : Mode timelines modifiable après création (Protection manquante)

### Problème identifié

```sql
-- ❌ AVANT : Aucune protection contre changement de mode
UPDATE timelines SET mode = 'planning' WHERE id = ? AND mode = 'sequence';
-- Possible de changer sequence→planning ou planning→sequence
```

**Impact** :

- ❌ Si planning→sequence : slots reward existants deviennent invalides
- ❌ Si planning→sequence : jetons non-zéro violent contraintes
- ❌ Si sequence→planning : perte de cohérence conceptuelle
- ❌ Les triggers enforce_sequence_constraints ne s'appliquent pas rétroactivement
- ❌ Données existantes deviennent incohérentes sans détection

### Correction appliquée

**✨ NOUVELLE MIGRATION 160000 : `protect_timeline_mode_immutability.sql`**

```sql
-- ✅ APRÈS : Mode immuable après création
CREATE OR REPLACE FUNCTION public.prevent_timeline_mode_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si le mode a changé
  IF NEW.mode != OLD.mode THEN
    RAISE EXCEPTION 'Impossible de modifier le mode d''une timeline après sa création (id: %, ancien mode: %, nouveau mode: %)',
      OLD.id, OLD.mode, NEW.mode
      USING HINT = 'Le mode est immuable. Supprimez et recréez la timeline si nécessaire.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_timeline_mode_change_trigger
BEFORE UPDATE OF mode ON public.timelines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_timeline_mode_change();
```

**Résultat** :

- ✅ Mode immuable après création (planning reste planning, sequence reste sequence)
- ✅ Protection contre violations d'invariants rétroactives
- ✅ Message d'erreur explicite si tentative de modification
- ✅ Solution MVP simple : supprimer/recréer si changement vraiment nécessaire

---

## 📊 TABLEAU RÉCAPITULATIF DES FAILLES

| #   | Faille                                   | Sévérité         | Migration | Corrigée |
| --- | ---------------------------------------- | ---------------- | --------- | -------- |
| 1   | Index unique global (pas par owner)      | 🔴 Haute         | 120000    | ✅       |
| 2   | Non-idempotence migration 120000         | 🟡 Moyenne       | 120000    | ✅       |
| 3   | RLS sans WITH CHECK                      | 🟠 Moyenne-Haute | 120000    | ✅       |
| 4   | Non-idempotence migration 130000         | 🟡 Moyenne       | 130000    | ✅       |
| 5   | completed_by falsifiable                 | 🔴 Haute         | 130000    | ✅       |
| 6   | Policy RLS inutile (slots_no_reorder)    | 🟢 Faible        | 130000    | ✅       |
| 7   | Non-idempotence migration 140000         | 🟡 Moyenne       | 140000    | ✅       |
| 8   | Jetons NULL tolérés dans séquences       | 🟠 Moyenne-Haute | 140000    | ✅       |
| 9   | Mode timelines modifiable après création | 🔴 Haute         | ✨ 160000 | ✅       |

---

## ✅ INVARIANTS GARANTIS APRÈS CORRECTIONS

| #   | Invariant                                    | Mécanisme                                                | Migration              |
| --- | -------------------------------------------- | -------------------------------------------------------- | ---------------------- |
| 1   | **1 séquence par carte PAR OWNER**           | `UNIQUE(owner_id, parent_card_id) WHERE mode='sequence'` | 120000                 |
| 2   | **Owner carte parent = owner timeline**      | RLS policy avec USING + WITH CHECK                       | 120000                 |
| 3   | **completed_by forcé à auth.uid()**          | Trigger `prevent_modify_completed_slot`                  | 130000                 |
| 4   | **completed_by non falsifiable**             | Trigger empêche modification manuelle                    | 130000                 |
| 5   | **Jetons=0 dans séquences (y compris NULL)** | Trigger force jetons:=0 si NULL                          | 140000                 |
| 6   | **Mode immuable après création**             | Trigger `prevent_timeline_mode_change`                   | 160000                 |
| 7   | **Pas de reward dans séquences**             | Trigger `enforce_sequence_constraints`                   | 140000                 |
| 8   | **Slot complété non supprimable**            | Trigger + RLS                                            | 130000                 |
| 9   | **Migrations idempotentes**                  | IF NOT EXISTS sur colonnes/contraintes/index             | 120000, 130000, 140000 |

---

## 🎯 IMPACT FRONTEND

**✅ AUCUN CHANGEMENT FRONTEND REQUIS**

Toutes les corrections sont transparentes côté client :

1. **Faille 1 (index unique par owner)** : Frontend continue d'envoyer les mêmes requêtes, DB gère correctement
2. **Faille 2, 4, 7 (idempotence)** : Purement infrastructure, pas d'impact frontend
3. **Faille 3 (RLS WITH CHECK)** : Protection renforcée, frontend déjà conforme
4. **Faille 5 (completed_by forcé)** : Frontend peut continuer à envoyer `completed_by` (ignoré) ou ne pas l'envoyer (forcé auto)
5. **Faille 6 (policy supprimée)** : Aucun impact, le trigger gère tout
6. **Faille 8 (jetons NULL)** : Frontend peut continuer à envoyer `jetons=NULL` (forcé à 0 auto) ou `jetons=0` (pas de changement)
7. **Faille 9 (mode immuable)** : Frontend ne doit déjà pas modifier le mode (non prévu UX), erreur explicite si tentative

---

## 🧪 TESTS RECOMMANDÉS

### Tests migration 120000

```sql
-- Test 1 : Vérifier index unique par owner
-- Doit réussir : 2 users avec séquence sur même bank card
INSERT INTO timelines (owner_id, mode, parent_card_id) VALUES
  ('user1', 'sequence', 'bank_card_1'),
  ('user2', 'sequence', 'bank_card_1');  -- ✅ OK

-- Doit échouer : même user avec 2 séquences sur même carte
INSERT INTO timelines (owner_id, mode, parent_card_id) VALUES
  ('user1', 'sequence', 'bank_card_1');  -- ❌ ERREUR UNIQUE

-- Test 2 : Vérifier RLS WITH CHECK
-- Doit échouer : séquence avec carte d'un autre user
INSERT INTO timelines (owner_id, mode, parent_card_id) VALUES
  ('user1', 'sequence', 'user2_card');  -- ❌ ERREUR RLS
```

### Tests migration 130000

```sql
-- Test 3 : Vérifier completed_by forcé
UPDATE slots SET completed_at = NOW(), completed_by = 'fake-uuid' WHERE id = ?;
-- ✅ completed_by ignoré, forcé à auth.uid()

SELECT completed_by FROM slots WHERE id = ?;
-- ✅ Doit retourner auth.uid(), pas 'fake-uuid'

-- Test 4 : Vérifier impossible compléter sans auth
-- Déconnecter, puis tenter :
UPDATE slots SET completed_at = NOW() WHERE id = ?;
-- ❌ ERREUR : Impossible de compléter sans être authentifié
```

### Tests migration 140000

```sql
-- Test 5 : Vérifier jetons forcés à 0 si NULL
INSERT INTO slots (timeline_id, card_id, slot_type, jetons) VALUES
  ('sequence_id', 'card1', 'step', NULL);  -- ✅ jetons forcé à 0

SELECT jetons FROM slots WHERE id = ?;
-- ✅ Doit retourner 0, pas NULL

-- Test 6 : Vérifier reward refusé dans séquence
INSERT INTO slots (timeline_id, card_id, slot_type) VALUES
  ('sequence_id', 'card1', 'reward');  -- ❌ ERREUR : reward interdit
```

### Tests migration 160000

```sql
-- Test 7 : Vérifier mode immuable
INSERT INTO timelines (owner_id, mode) VALUES ('user1', 'planning');
UPDATE timelines SET mode = 'sequence' WHERE id = ?;
-- ❌ ERREUR : Impossible de modifier le mode

-- Test 8 : Vérifier UPDATE autres champs OK
UPDATE timelines SET name = 'Nouveau nom' WHERE id = ?;
-- ✅ OK (mode pas changé)
```

---

## 🚀 PROCHAINES ÉTAPES

### 1. Appliquer les migrations

```bash
# Démarrer Supabase local
pnpm supabase:start

# Les 4 migrations seront appliquées automatiquement :
# - 20260119120000_add_sequence_parent_card.sql (corrigée)
# - 20260119130000_add_slot_completion.sql (corrigée)
# - 20260119140000_enforce_sequence_constraints.sql (corrigée)
# - 20260119160000_protect_timeline_mode_immutability.sql (nouvelle)

# Régénérer les types TypeScript (OBLIGATOIRE)
pnpm context:update
```

### 2. Vérifier les logs

```bash
# Vérifier que les migrations ont réussi
pnpm supabase:status

# Chercher les messages NOTICE et WARNING dans les logs Docker
docker logs supabase_db_appli-picto | grep "Migration.*réussie"
```

### 3. Tester en local

```bash
# Lancer les tests
pnpm test

# Vérifier le build
pnpm verify:quick
```

### 4. Déploiement production (à faire plus tard)

⚠️ **ATTENTION** : Ne pas déployer avant de :

- Tester exhaustivement en local
- Vérifier tous les cas edge
- Valider avec des données de test
- Obtenir approbation utilisateur

---

## 📝 CONCLUSION

**9 failles corrigées** avec **0 impact frontend** :

✅ **Sécurité** : completed_by non falsifiable, RLS complète (WITH CHECK)
✅ **Robustesse** : jetons forcés à 0, mode immuable, index unique par owner
✅ **Idempotence** : migrations rejouables sans erreur
✅ **Maintenabilité** : policy inutile supprimée, commentaires enrichis
✅ **Intégrité** : tous les invariants garantis serveur-side

**Résultat** : Base de données robuste, sécurisée et alignée avec le modèle produit.

---

**Fin du récapitulatif des corrections**
**Auteur** : Claude Code
**Date** : 2026-01-19
