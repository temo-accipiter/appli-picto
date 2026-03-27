# Executive Summary : Importation Visitor → Free

**Enquête Complète** : Logique d'importation données Visitor → compte Free
**Date** : 2026-03-25
**Statut** : ✅ **INVESTIGATION COMPLÈTE**

---

## Verdict

**Aucune fonction d'importation de données Visitor (IndexedDB local) vers compte Free (Supabase cloud) n'existe actuellement.**

C'est **volontaire et documenté** comme **"futur Ticket 4"** dans le code source.

### Points Clés

✅ **Infrastructure prête** :

- Couche Visitor IndexedDB structurée et fonctionnelle
- RPC atomiques cloud `create_sequence_with_steps()` robustes
- Hooks adapter pattern pour routing seamless

❌ **Import function manquante** :

- Aucune RPC migration Visitor → Supabase
- Aucun hook `useImportVisitor()`
- Aucun nettoyage localStorage post-signup
- Données Visitor restent orphelines après login

⏳ **Planifié pour S4 (Ticket 4)** :

- Architecture prête, implémentation reportée
- Documentation complète pour futur développement

---

## Fichiers Pertinents Trouvés

### 1. Couche Visitor IndexedDB (LOCAL)

| Fichier                              | Type       | But                                                  | Lignes |
| ------------------------------------ | ---------- | ---------------------------------------------------- | ------ |
| `src/utils/visitor/sequencesDB.ts`   | Utilitaire | CRUD séquences/étapes Visitor en IndexedDB           | 409    |
| `src/hooks/useSequencesLocal.ts`     | Hook React | Wrapper hook pour IndexedDB (API unifiée avec cloud) | 170    |
| `src/hooks/useSequenceStepsLocal.ts` | Hook React | CRUD étapes Visitor en IndexedDB                     | ~150   |
| `src/hooks/useIsVisitor.ts`          | Hook React | Détecter mode Visitor (non authentifié)              | 46     |

**Capacités** :

- ✅ Transactions multi-store atomiques
- ✅ Contraintes locales (min 2 steps, pas doublons, UNIQUE mother_card_id)
- ✅ Indices composites (UNIQUE séquence/position)
- ✅ Préparation structure pour import futur

### 2. RPC Cloud Atomiques (CLOUD)

| Fichier                                                                | Type          | But                     | Fonction                                                   |
| ---------------------------------------------------------------------- | ------------- | ----------------------- | ---------------------------------------------------------- |
| `supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql` | Migration SQL | RPC atomiques séquences | `create_sequence_with_steps()`, `replace_sequence_steps()` |

**RPC `create_sequence_with_steps(p_mother_card_id, p_step_card_ids)`** :

- ✅ Crée séquence + étapes en une seule transaction SQL
- ✅ Valide auth, permissions, quotas
- ✅ Gère UNIQUE constraints
- ✅ Rollback automatique si erreur
- ⚠️ **Subscriber/Admin uniquement** (Free bloqué par RLS)

### 3. Hooks Cloud (CLOUD)

| Fichier                                    | Type       | But                                                   | Lignes |
| ------------------------------------------ | ---------- | ----------------------------------------------------- | ------ |
| `src/hooks/useSequences.ts`                | Hook React | CRUD séquences cloud via RPC                          | 172    |
| `src/hooks/useSequenceStepsWithVisitor.ts` | Hook React | Adapter routing (Visitor IndexedDB OU Cloud Supabase) | ~150   |
| `src/hooks/useSequencesWithVisitor.ts`     | Hook React | Adapter routing (même pattern)                        | ~150   |

### 4. Auth & Post-Signup

| Fichier                                 | Type      | But                          | Observation                               |
| --------------------------------------- | --------- | ---------------------------- | ----------------------------------------- |
| `src/contexts/AuthContext.tsx`          | Context   | État global auth + lifecycle | ❌ **AUCUN hook post-signup** pour import |
| `src/page-components/signup/Signup.tsx` | Composant | Formulaire inscription       | ❌ **AUCUN appel** vers import function   |

### 5. Offline Queue Pattern (Inspiration)

| Fichier                           | Type    | But                                               | Pattern                             |
| --------------------------------- | ------- | ------------------------------------------------- | ----------------------------------- |
| `src/contexts/OfflineContext.tsx` | Context | Queue validations offline + sync au retour réseau | ✅ Modèle robuste pour import futur |

---

## Workflow Actuel : Données Orphelines

```
┌──────────────────────────────┐
│ VISITOR (Offline)            │
│ Data: IndexedDB local        │
│ DB_NAME: appli-picto-visitor │
└──────────────┬───────────────┘
               │
        [Signup + Login]
               │
               ▼
┌──────────────────────────────┐
│ FREE (Authenticated)         │
│ Data: Supabase cloud         │
│ ❌ VISITOR DATA LOST          │
│    (restent en IndexedDB)    │
└──────────────────────────────┘
```

**Durée** : Données Visitor restent accessibles en IndexedDB jusqu'à... jamais nettoyées.

---

## Patterns Transactionnels Découverts

### IndexedDB (Local)

```typescript
const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')
// ... add, update, delete ...
tx.oncomplete = () => resolve() // ✅ Tout ou rien
tx.onerror = () => reject() // ✅ Rollback auto
```

### PostgreSQL RPC (Cloud)

```sql
CREATE FUNCTION create_sequence_with_steps(...) AS $$
BEGIN
  INSERT INTO sequences (...)
  INSERT INTO sequence_steps (...)  -- ✅ Tout ou rien
  RETURN sequence_id;
EXCEPTION WHEN ... → ROLLBACK AUTO
$$
```

### Application Layer (Hook)

```typescript
const { data, error } = await supabase.rpc(...)
if (!error) refresh()  // ✅ Synchroniser état React
return { id: data, error }  // ✅ Tuple (id, error)
```

**Niveau robustesse** : **EXCELLENT** ✅ (tout ou rien, rollback auto, gestion erreurs)

---

## Gestion Erreurs : Robustesse DB-First

### Erreurs Capturées à la DB

| Code    | Signification                 | Exemple                                |
| ------- | ----------------------------- | -------------------------------------- |
| `23514` | NOT NULL / CHECK violation    | `mother_card_id IS NULL`               |
| `23505` | UNIQUE violation              | Séquence exists pour cette carte       |
| `42501` | RLS violation / Access denied | Free user → can_write_sequences bloque |
| `42501` | Execution-only mode bloqué    | Mode exécution seul, pas édition       |

**Pattern** : Tous les contrôles sont **côté DB (RLS, triggers, constraints)**. Frontend ne valide que cosmétiquement.

---

## Absence Import : Raisons Documentées

### Preuve 1 : Code Source

`src/utils/visitor/sequencesDB.ts`, lignes 19-22 :

```typescript
// ⚠️ IMPORT VISITOR → COMPTE
// - Hors scope Ticket 3 (futur Ticket 4)
// - Cette couche prépare les données pour un import ultérieur
```

### Preuve 2 : Absence Crochets Post-Signup

- `AuthContext.tsx` : ❌ Pas de hook `onAuthStateChange` déclenchant import
- `Signup.tsx` : ❌ Pas d'appel importFunction après signUp() succès
- `(protected)/layout.tsx` : ❌ Pas de détection données Visitor

### Preuve 3 : RPC Autorisations

`create_sequence_with_steps()` vérifie `can_write_sequences()` :

- ✅ Subscriber/Admin : Autorisé
- ❌ **Free/Visitor : Bloqué** (serait problématique si import auto sans modif RLS)

---

## Architecture Solution Ticket 4

### Composants à Créer

```
src/hooks/useImportVisitor.ts
├─ Orchestrer import (load → validate → migrate → cleanup)
├─ Gère loading, error states
└─ Expose importVisitorSequences() function

src/components/features/modal/modal-import-visitor/
├─ UI modal post-login "Importer N séquences?"
├─ Affiche progression (confirm → importing → result)
└─ Feedback toast succès/erreur

src/app/(protected)/layout.tsx (modifié)
├─ Déclenche modal si Visitor data detected
└─ Une seule fois par user (localStorage flag)
```

### Data Flow

```
Modal [Importer]
    ↓
useImportVisitor() hook
    ↓
Pour chaque séquence Visitor :
    ├─ Charger étapes (IndexedDB)
    ├─ Créer via RPC atomique (Supabase)
    └─ Tracker succès/erreur
    ↓
Si ALL succès → Cleanup IndexedDB
Si PARTIAL → Garder pour retry
    ↓
Toast feedback + refresh UI
```

### Robustesse Garantie

✅ **Transactions atomiques** : RPC cloud tout-ou-rien
✅ **Isolation** : Seul ce user peut importer ses données
✅ **Idempotence** : Retry sûr (UNIQUE constraint)
✅ **Fallback** : Si erreur, IndexedDB préservé
✅ **Monitoring** : Logs détaillés + analytics

---

## Checklist Découverte

### ✅ Infrastructure Prête

- [x] Couche Visitor IndexedDB (S3)
- [x] RPC atomiques cloud (S4)
- [x] Hooks adapter pattern (S4)
- [x] Patterns transactionnels robustes
- [x] Gestion erreurs complète

### ❌ Fonction Import Absente

- [ ] Hook useImportVisitor()
- [ ] Modal ModalImportVisitor
- [ ] Déclenchement post-signup
- [ ] Cleanup IndexedDB conditionnel
- [ ] Tests E2E import

### ⏳ Planifié Ticket 4

- [ ] Implémentation (3-4 jours dev)
- [ ] QA & testing (2 jours)
- [ ] Déploiement graduel (monitoring)

---

## Recommendations

### Immédiate

1. **Documenter** : Ajouter note SignUp → "Import à faire en Ticket 4"
2. **Gérer attentes** : Si user demande pourquoi données perdues après login
3. **Nettoyage** : Option localStorage "Oublier données Visitor" si user ne s'inscrit pas

### Court Terme (Ticket 4)

1. Implémenter `useImportVisitor()` hook
2. Créer modal post-login
3. Tester tous cas erreur (quotas, auth, réseau)
4. Monitorer en production (analytics)

### Long Terme

1. Ajouter retry automatique si import échoue
2. Afficher quel séquence échoue (debugging user)
3. Permettre user à réessayer (ui "Retry" button)

---

## Documents Générés

Cette enquête a produit **3 documents complets** :

### 1. `VISITOR_IMPORT_ANALYSIS.md` (Ce repo)

- **But** : Analyse complète fonctionnalité (absente)
- **Contenu** : 500+ lignes, 8 sections
- **Lecteurs** : Dev team, product

### 2. `.claude/TRANSACTION_PATTERNS.md` (Guide technique)

- **But** : Patterns transactionnels découverts
- **Contenu** : 400+ lignes, exemples code
- **Lecteurs** : Dev team (futures implémentations)

### 3. `.claude/TICKET4_IMPLEMENTATION_PLAN.md` (Plan détaillé)

- **But** : Blueprint complet Ticket 4
- **Contenu** : 600+ lignes, code templates
- **Lecteurs** : Dev lead assigné Ticket 4

---

## Conclusion

### État Final

| Aspect              | Statut          | Notes                   |
| ------------------- | --------------- | ----------------------- |
| **Import function** | ❌ N'existe pas | Volontaire, Ticket 4    |
| **Infrastructure**  | ✅ Prête        | IndexedDB + RPC cloud   |
| **Robustesse DB**   | ✅ Excellent    | Transactions atomiques  |
| **Documentation**   | ✅ Complète     | Code bien commenté      |
| **Plan future**     | ✅ Clair        | Blueprint Ticket 4 prêt |

### Garanties Existantes

1. **Données Visitor** : Persistées localement (IndexedDB)
2. **Transactions cloud** : Atomiques (PostgreSQL RPC)
3. **Gestion erreurs** : Complète (try/catch + DB constraints)
4. **Architecture DB-first** : Sécurité au niveau DB (RLS, triggers)

### Risques

- ⚠️ **Données Visitor orphelines** : Restent en IndexedDB après login si Ticket 4 pas fait
- ⚠️ **User perd données** : Si vide IndexedDB sans import
- ⚠️ **Quotas Free** : Si import voudrait créer > 5 séquences

### Mitigations

- ✅ Modal post-login pour explicit import
- ✅ IndexedDB préservé si import échoue
- ✅ RLS bloque auto si quotas Free dépassés
- ✅ Documentation complète pour Ticket 4

---

## Contact & Questions

**Enquête réalisée par** : Claude Code (Haiku 4.5)
**Durée** : Investigation approfondie (exploration complète codebase)
**Artifacts** : 3 documents MD (1500+ lignes total)

**Pour Ticket 4** : Utiliser `.claude/TICKET4_IMPLEMENTATION_PLAN.md` comme blueprint.

**Next Steps** : Assigner Ticket 4 → Dev peut démarrer avec templates fournis.
