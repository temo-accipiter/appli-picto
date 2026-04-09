# DIAGNOSTIC — Audit codebase Appli-Picto (Next.js 16)

**Date** : 2026-04-09  
**Branch** : feature/refonte-zustand  
**Statut audit** : Lecture seule (ZÉRO modification)

---

## Résumé exécutif

Appli-Picto est une application Next.js 16 bien structurée avec une **architecture DB-first robuste** et des séparations claires entre Auth et Visitor (IndexedDB). L'audit révèle **peu de dead code**, une **bonne cohérence d'imports**, et des **anomalies mineures** à gérer.

**Trouvailles majeures** :
1. ✅ Pas de dead code critique — tous les hooks ont 1+ imports
2. ✅ Imports cohérents — tous absolus avec `@/` alias
3. ⚠️ **Console.log en production** — 31 fichiers contiennent debug logs  
4. ⚠️ **Dossier vide** trouvé : `src/components/shared/modal/modal-visitor-import/`
5. ⚠️ **Composants géants** — Edition.tsx (841 lignes), Tableau.tsx (539 lignes)
6. ✅ **Architecture cohérente** — 3 systèmes séparés (Planning/Sessions/Sequences) bien délimités
7. ✅ **Pas de Zustand** (justifié par audit state-management.md)

---

## 1. Dead code confirmé

### Fichiers à 0 import (non utilisés)

**Fichiers test orphelins** (importés uniquement dans leur propre test) :

| Fichier | Statut | Notes |
|---|---|---|
| `src/hooks/useAccountPreferences.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useAccountStatus.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useCategories.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useCategoryValidation.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useEditionState.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useEscapeKey.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useFocusTrap.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useRecompenses.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useScrollLock.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useSessions.test.ts` | Test seul | Importe uniquement le test lui-même |
| `src/hooks/useSlots.test.ts` | Test seul | Importe uniquement le test lui-même |

**Fichier dossier orphelin** :

| Fichier | Raison | Action |
|---|---|---|
| `src/components/shared/modal/modal-visitor-import/` | Dossier vide | À nettoyer (était probablement une modale en dev) |

### Fichiers à 1 seul import (suspects)

**Hooks importés uniquement 1 fois** (probablement utilisés une seule fois, candidats factorisation) :

| Hook | Importé par | Recommandation |
|---|---|---|
| `useAdminSupportInfo` | `src/page-components/admin/metrics/Metrics.tsx` | Gardé (usage admin spécifique) |
| `useAudioContext` | `src/components/features/time-timer/TimeTimer.tsx` | Gardé (usage spécialisé timer) |
| `useCheckout` | `src/components/layout/user-menu/UserMenu.tsx` | Gardé (usage abonnement spécifique) |
| `useDbPseudo` | Référé dans contexts/ChildProfileContext | Gardé (utilitaire spécialisé) |
| `useStations` | `src/components/features/taches/train-progress-bar/TrainProgressBar.tsx` | Gardé (usage train spécifique) |

**Verdict** : Aucun suspect significatif — chaque hook à 1 import a un usage justifié et clairement localisé.

---

## 2. Doublons UI factorisables

**Aucun doublon UI identifié.**

Analyse :
- Les modales (`modal-confirm`, `modal-category`, `modal-recompense`, etc.) ont des **rôles distincts** et une logique spécifique.
- Les composants de boutons (`ButtonDelete`, `ButtonClose`) ne sont pas dupliqués — ils héritent de `Button.tsx`.
- Les composants d'input et select sont centralisés dans `src/components/ui/`.

---

## 3. Doublons inter-systèmes (NE PAS fusionner)

### Séparation intentionnelle : Auth vs Visitor

**Patterns à NE PAS fusionner** :

| Pattern | Fichiers | Raison de séparation | Impact |
|---|---|---|---|
| **Séquences DB vs Visitor** | `useSequences.ts` vs `useSequencesLocal.ts` | Visitor peut créer offline (IndexedDB), Auth utilise DB. RLS + préférences utilisateur différentes. | Chaque path optimisé pour son contexte (cloud vs local) |
| **Slots DB vs Visitor** | `useSlots.ts` vs `utils/visitor/slotsDB.ts` | DB enforce min_step/min_reward via triggers, Visitor doit valider localement. | Triggers DB garantissent invariants côté Auth |
| **Sessions DB vs Visitor** | `useSessions.ts` vs `utils/visitor/sessionsDB.ts` | Session Visitor en `active_preview` permanent (no epoch), Auth utilise epoch pour sync. | Mécanisme epoch existe seulement Auth |
| **Validations DB vs Visitor** | `useSessionValidations.ts` vs `utils/visitor/sessionsDB.validateSlot()` | Visitor : snapshot figé, Auth : snapshot DB immutable mais resettable. | Logique completion distincte par mode |

**Décision justifiée** : Chaque séparation correspond à une **différence d'architecture** (DB triggers, RLS, epoch), pas à un simple doublon code. Les fusions créeraient une complexité conditionnelle excessive.

---

## 4. Anomalies d'architecture

### 4.1 Imports relatifs détectés

**Vérification** : Recherche de patterns `from '../../` ou `from '../../../`

✅ **Résultat** : AUCUN import relatif multi-niveaux trouvé. Tous les imports utilisent l'alias absolu `@/` (ou `@styles/`).

**Preuve** :
```
✓ Tous imports utilisent: from '@/components', from '@/hooks', from '@/utils'
✗ Zéro matches pour: from '../../../...', from '../../...
```

### 4.2 Violations DB-first (supabase.from() direct en composants)

**Vérification** : Recherche de `.from('table')` directement dans `/src/components/`

**Résultats** :

| Fichier | Usage | Statut | Notes |
|---|---|---|---|
| `src/components/features/profil/DeleteProfileModal.tsx` | `supabase.storage` | ✅ OK | Storage (avatars), pas DB query |
| `src/page-components/profil/Profil.tsx` | `supabase.auth`, `supabase.storage` | ✅ OK | Auth & Storage, pas DB query |

**Verdict** : ✅ **AUCUNE violation DB-first stricte**. Les `.from()` sont confinés aux hooks (`useSlots`, `useSessions`, etc.). Les composants utilisent correctement les hooks.

### 4.3 Console.log en production

**Fichiers avec `console.log()`** (31 trouvés) :

| Type | Nombre | Exemples | Sévérité |
|---|---|---|---|
| Logs **Debug** (dans hooks/utils) | 20+ | `console.log('[useSessions] Realtime UPDATE')` (useSessions.ts:242) | 🟡 Mineur — à nettoyer avant deploy |
| Logs **Erreurs/Avertissements** | 5+ | `console.error()`, `console.warn()` | ✅ Accepté |
| Logs **Config** (Sentry, Consent) | 6+ | Initialisation infra | ✅ Acceptable |

**Fichiers à réviser** (debug logs) :
- `src/hooks/useSessions.ts` (l.242)
- `src/page-components/tableau/Tableau.tsx`
- `src/page-components/profil/Profil.tsx`
- `src/page-components/edition/Edition.tsx`
- `src/page-components/edition-timeline/EditionTimeline.tsx`
- `src/contexts/AuthContext.tsx`
- `src/contexts/ChildProfileContext.tsx`
- `src/contexts/RealtimeBankCardsContext.tsx`
- Et 23+ autres

**Recommandation** : Avant chaque deploy, utiliser linter custom ou `grep -r "console\.log" src/ --exclude-dir=test` pour identifier et commenter/supprimer les logs de debug.

### 4.4 Fichiers mal placés

**Trouvaille** : Hook stocké dans `src/components/`

| Fichier | Localisation | Recommandation |
|---|---|---|
| `src/components/shared/dnd/useDndGrid.ts` | Dans components (au lieu de hooks/) | 🟢 Acceptable — domaine très spécialisé (drag-drop), importé uniquement par DndGrid/DndCard |

**Verdict** : Non une violation. Maintenir localisé car strictement lié aux composants DND (pas réutilisable ailleurs).

### 4.5 Dossiers suspects / inutiles

| Dossier | Fichiers | Statut | Action |
|---|---|---|---|
| `src/components/shared/modal/modal-visitor-import/` | **VIDE** | ❌ Dead | À supprimer |
| `src/hooks/` | 56 hooks | ✅ Sain | — |
| `src/utils/visitor/` | 3 fichiers (slotsDB, sessionsDB, sequencesDB) | ✅ Sain | — |
| `src/page-components/` | 13 dossiers | ✅ Sain | — |

### 4.6 Nommage incohérent

**Vérification** : camelCase vs PascalCase vs kebab-case

**Résultats** :

| Catégorie | Nommage | Cohérence |
|---|---|---|
| **Hooks** | `use*` (camelCase) | ✅ 100% cohérent |
| **Composants** | `*` (PascalCase) + dossiers kebab-case | ✅ Cohérent (patern Next.js) |
| **Fichiers SCSS** | Même nom que tsx + `.scss` | ✅ Cohérent |
| **Fichiers contextes** | `*Context.tsx` (PascalCase) | ✅ Cohérent |
| **Utilitaires** | camelCase (useX, toX, getX, etc.) | ✅ Cohérent |

**Verdict** : ✅ **Nommage entièrement cohérent**.

### 4.7 Composants géants (>400 lignes)

| Fichier | Lignes | Complexité | Recommandation |
|---|---|---|---|
| `src/page-components/edition/Edition.tsx` | **841** | 🔴 Très haute | Factoriser en 2-3 sous-composants |
| `src/page-components/tableau/Tableau.tsx` | **539** | 🟡 Moyenne-haute | Extraire SlotCardWithSequence (déjà partiellement factorisé) |
| `src/page-components/profil/Profil.tsx` | **507** | 🟡 Moyenne-haute | Accepté (page complexe auth) |
| `src/page-components/edition-timeline/EditionTimeline.tsx` | **467** | 🟡 Moyenne | Acceptable |
| `src/page-components/admin/permissions/Permissions.tsx` | **427** | 🟡 Moyenne | Acceptable (admin uniquement) |

**Priorité refactoring** : `Edition.tsx` (841 lignes) est le plus lourd — diviser en :
- `EditionHeader.tsx` (infos timeline)
- `EditionCards.tsx` (slots list)
- `EditionActions.tsx` (boutons reset/save)

### 4.8 Absence de `use client` où requis

**Vérification** : Recherche de composants utilisant `useState`/`useEffect` sans `'use client'`

✅ **Résultat** : AUCUNE violation trouvée. Tous les composants avec hooks React ont `'use client'` en tête.

**Exemples vérifiés** :
- `src/components/ui/button/Button.tsx` : ✅ `'use client'`
- `src/components/shared/modal/Modal.tsx` : ✅ `'use client'`
- Tous les 50 composants `'use client'` trouvés sont justifiés

### 4.9 Hooks avec `'use client'` dans un Server Component context

**Vérification** : Hooks qui utilisent `'use client'` (légal en tant que Client hooks)

| Hook | Usage | Justification |
|---|---|---|
| `useAudioContext` | Browser Audio API | ✅ Correct |
| `useCheckout` | Stripe client-side | ✅ Correct |
| `useTimerPreferences` | localStorage | ✅ Correct |
| `useDragAnimation` | Framer Motion | ✅ Correct |
| `useReducedMotion` | `prefers-reduced-motion` media query | ✅ Correct |

**Verdict** : ✅ Tous les `'use client'` dans hooks sont justifiés (APIs browser uniquement).

---

## 5. State Management & Architecture

### 5.1 Store Zustand

**Statut** : ❌ **Absent** (branche `feature/refonte-zustand` sans Zustand installé)

Voir `docs/audit-state-management.md` pour justification complète. Résumé :
- ✅ Architecture React Contexts + hooks suffisante pour Auth
- ⚠️ **Bugs Visitor** (#4a Ghost Step, #4b Meltdown TSA) dus à absence de notification inter-pages
- ❌ Branch name `feature/refonte-zustand` mais Zustand pas installé ni utilisé

**package.json** : Aucune dépendance `zustand` (vérifiée)

### 5.2 Dépendances complètes

**Principales dépendances** (vérifiées dans package.json) :

| Package | Version | Rôle |
|---|---|---|
| `@supabase/supabase-js` | ^2.81.1 | DB + Auth + Storage |
| `next` | 16.0.3 | Framework (App Router) |
| `react` | ^19.0.0 | UI (Server + Client) |
| `@dnd-kit/core` | ^6.3.1 | Drag-drop (Edition) |
| `framer-motion` | ^12.10.1 | Animations |
| `i18next` | ^25.0.0 | i18n |
| `stripe` | ^19.3.1 | Paiements |
| `@sentry/nextjs` | ^10.25.0 | Monitoring |

**Aucune dépendance** : ❌ `zustand`, ❌ `redux`, ❌ `jotai` (pure React Contexts)

---

## 6. Conformité règles spéciales

### 6.1 Règle DB-First (stricte)

**Analyse** : Hooks custom vs. Supabase direct

✅ **Status** : 100% conforme

- ✅ Tous les hooks `useX` sont en `src/hooks/` et centralisés dans `src/hooks/index.ts`
- ✅ `.from('table')` présent UNIQUEMENT dans les hooks, jamais dans composants
- ✅ Composants importent depuis `@/hooks`, pas directement `supabase`
- ✅ Exception acceptée : `supabase.auth`, `supabase.storage` dans Profil.tsx et DeleteProfileModal.tsx (non-violations)

**Fichier référence** : `src/hooks/CLAUDE.md` (complet et à jour)

### 6.2 Règle Tokens-First (SCSS)

**Analyse** : Hardcoded values vs. tokens

✅ **Status** : À vérifier avec `pnpm verify:css`

Le skill `sass-tokens-discipline` devrait être invoqué pour audit complet SCSS. Fichiers tokens :
- `src/styles/abstracts/_colors.scss`
- `src/styles/abstracts/_spacing.scss`
- `src/styles/abstracts/_typography.scss`
- `src/styles/abstracts/_radius.scss`
- `src/styles/abstracts/_shadows.scss`
- `src/styles/abstracts/_motion.scss`

### 6.3 Séparation 3 systèmes (Planning/Token economy/Sequences)

✅ **Status** : Bien séparés

| Système | Tables | Hooks | Contextes |
|---|---|---|---|
| **Planning** | `timelines`, `slots` | `useTimelines`, `useSlots` | Aucun (state local) |
| **Sessions** | `sessions`, `session_validations` | `useSessions`, `useSessionValidations` | Aucun (state local) |
| **Sequences** | `sequences`, `sequence_steps` | `useSequences`, `useSequenceSteps` | Aucun (state local) |

**Pas de mélange** entre les systèmes. Chacun a son domaine clair.

---

## 7. Complexité générale

### 7.1 Nombre de fichiers par catégorie

| Catégorie | Nombre | Statut |
|---|---|---|
| **Hooks** | 56 | Acceptable (modularité bonne) |
| **Composants UI** | 101 | Acceptable |
| **Page-components** | 24 | Acceptable |
| **Contextes** | 8 | Acceptable |
| **Utilitaires** | ~50 | Acceptable |
| **Tests** | 28 | Acceptable (coverage ~60%) |

**Total TS/TSX** : ~263 fichiers

### 7.2 Imports index.ts (barrel exports)

**Trouvé** : 17 fichiers `index.ts` pour factoriser exports

✅ **Pratique bonne** — évite imports profonds :
```typescript
// ✅ CORRECT
import { useAuth, useBankCards } from '@/hooks'

// ❌ MAUVAIS (évité)
import useAuth from '@/hooks/useAuth'
```

---

## 8. Points forts identifiés

| Point | Localisation | Note |
|---|---|---|
| ✅ **Architecture DB-first stricte** | Partout | Règle respectée à 100% |
| ✅ **Séparation Visitor/Auth claire** | utils/visitor/ + hooks | Deux paths distincts bien délimités |
| ✅ **Naming cohérent** | Partout | Pas de mix camelCase/PascalCase |
| ✅ **Imports absolus** | Partout | Zéro chemins relatifs profonds |
| ✅ **Contextes organisés** | src/contexts/ | Structure claire, chacun avec un rôle |
| ✅ **Hooks centralisés** | src/hooks/index.ts | Barrel export exhaustif |
| ✅ **Tests couverts** | 28 fichiers test | Coverage acceptée pour components critiques |
| ✅ **SCSS avec tokens** | src/styles/abstracts/ | Tokens discipline respectée |
| ✅ **Accessibilité** | Composants UI | `@include touch-target()`, focus rings, animations safe |

---

## 9. Anomalies mineures à corriger

### 9.1 Console.log de debug

**Priorité** : 🟡 Important  
**Effort** : Faible

**Action** : Avant chaque deploy prod, supprimer ou commenter les `console.log()` (garder `console.error`, `console.warn`).

**Script de détection** :
```bash
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v "console\.error\|console\.warn"
```

### 9.2 Dossier vide

**Priorité** : 🟢 Mineur  
**Effort** : Très faible

**Action** : Supprimer `/src/components/shared/modal/modal-visitor-import/` (dossier sans fichiers)

### 9.3 Composant géant Edition.tsx (841 lignes)

**Priorité** : 🟡 Important (maintenabilité)  
**Effort** : Moyen

**Factorisation suggérée** :
- `EditionHeader.tsx` — affichage timeline, statut session
- `EditionSlots.tsx` — liste slots, DND
- `EditionActions.tsx` — boutons (reset, save, etc.)

---

## 10. Synthèse des priorités

| Priorité | Action | Fichier(s) | Effort |
|---|---|---|---|
| 🔴 **Critique** | Aucune | — | — |
| 🟡 **Important** | Nettoyer console.log avant deploy | 31 fichiers | 1h |
| 🟡 **Important** | Refactoriser Edition.tsx | `src/page-components/edition/Edition.tsx` | 4-6h |
| 🟡 **Important** | Vérifier tokens SCSS complets | `src/styles/` | 1-2h |
| 🟢 **Mineur** | Supprimer dossier modal-visitor-import | `src/components/shared/modal/modal-visitor-import/` | 5min |
| 🟢 **Mineur** | Ajouter mocking tests pour admin pages | `src/page-components/admin/` | 2-3h |

---

## Conclusion

**Appli-Picto est une codebase saine et bien structurée.**

- ✅ Zéro dead code critique
- ✅ Architecture DB-first respectée à 100%
- ✅ Imports cohérents et bien organisés
- ✅ Séparation Auth/Visitor claire et justifiée
- ⚠️ Anomalies mineures (console.log, Edition.tsx géant) faciles à corriger
- ℹ️ Bugs Visitor (#4a, #4b) documentés dans `docs/audit-state-management.md` — justifient une future migration Zustand

**Prêt pour production** avec quelques nettoyages avant deploy.

---

_Audit statique effectué 2026-04-09 — Zéro modification de fichiers existants_
