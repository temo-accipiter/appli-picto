# Index : Documentation persistance Visitor

Bienvenue dans la documentation complète de la persistance locale pour le rôle Visitor dans Appli-Picto.

---

## 📚 Fichiers de documentation

| Fichier | Contenu | Público |
|---------|---------|---------|
| **PERSISTENCE_ANALYSIS.md** | 📋 Analyse exhaustive (30KB) - RÉFÉRENCE PRINCIPALE | Ce fichier |
| **PERSISTENCE_QUICK_REFERENCE.md** | ⚡ Synthèse rapide (5KB) - Pour consultation rapide | Recommandé |
| **PERSISTENCE_DIAGRAM.md** | 🎨 Diagrammes ASCII - Architecture visuelle | Recommandé |
| **PERSISTENCE_INDEX.md** | 🗺️ Ce fichier - Guide de navigation | Vous êtes ici |

---

## 🎯 Guide par cas d'usage

### Je dois **intégrer une nouvelle fonctionnalité** pour Visitor

1. **Lire** : `PERSISTENCE_QUICK_REFERENCE.md` → Hooks et clés de stockage
2. **Chercher** : Si c'est lié aux séquences, consulter `PERSISTENCE_ANALYSIS.md` § 1 (IndexedDB)
3. **Copier** : Pattern du hook adapter depuis `PERSISTENCE_ANALYSIS.md` § 5
4. **Tester** : Voir section "Testing localStorage en dev" dans QUICK_REFERENCE

### Je dois **déboguer un problème** de persistance Visitor

1. **Détection** : Est-ce un problem IndexedDB ou localStorage?
   - IndexedDB = Séquences (§ 1 ANALYSIS)
   - localStorage = Prefs, profil enfant (§ 2-4 ANALYSIS)

2. **Inspecter** : Console DevTools (voir QUICK_REFERENCE.md testing section)
3. **Rechercher** : Fichiers concernés dans § 7 ANALYSIS (Cartographie)
4. **Référencer** : Patterns d'implémentation § 8 ANALYSIS

### Je dois **préparer l'import** Visitor → Supabase (Ticket 4)

1. **Comprendre** : Schéma local vs cloud → § 6 ANALYSIS
2. **Implémenter** : Voir § 6 → "Diagnostic : État actuel vs Futur"
3. **Valider** : Checklist points "Gap identifiés" § 6
4. **Visualiser** : Diagramme import DIAGRAM.md

### Je dois **vérifier la conformité** avec les règles Appli-Picto

1. **Vérifier** : Pattern SSR-safe, routing avec `enabled` flag → § 8 ANALYSIS
2. **Pièges** : Voir QUICK_REFERENCE.md § "Pièges courants"
3. **Audit** : Performance & limites § QUICK_REFERENCE

---

## 📂 Localisation des fichiers sources

### IndexedDB (Séquences Visitor)

| Fichier | Ligne | Objectif |
|---------|-------|----------|
| `src/utils/visitor/sequencesDB.ts` | 1-409 | Layer IndexedDB CRUD |
| `src/hooks/useSequencesLocal.ts` | 1-170 | Hook local séquences |
| `src/hooks/useSequenceStepsLocal.ts` | 1-199 | Hook local étapes |

### Hooks adapters (Router)

| Fichier | Ligne | Objectif |
|---------|-------|----------|
| `src/hooks/useIsVisitor.ts` | 1-46 | Détection Visitor |
| `src/hooks/useSequencesWithVisitor.ts` | 1-113 | Router séquences |
| `src/hooks/useSequenceStepsWithVisitor.ts` | 1-104 | Router étapes |

### Contextes (State global)

| Fichier | Ligne | Key localStorage | Objectif |
|---------|-------|------------------|----------|
| `src/contexts/AuthContext.tsx` | 1-150+ | `session` (SDK) | Auth state |
| `src/contexts/ChildProfileContext.tsx` | 1-390 | `applipicto:visitor:activeChildId`, `applipicto:activeChild:{userId}` | Profil enfant |
| `src/contexts/DisplayContext.tsx` | 1-80+ | `showTrain`, `showAutre`, `showTimeTimer` | Prefs UI |
| `src/contexts/OfflineContext.tsx` | 1-242 | `appli-picto:offline-validation-queue` | Queue offline (auth only) |

### Utils

| Fichier | Objectif |
|---------|----------|
| `src/utils/consent.ts` | Gestion consentement CNIL + localStorage |
| `src/utils/supabaseClient.ts` | Client Supabase + localStorage session |
| `src/config/i18n/i18n.ts` | i18n + localStorage langue |

### Composants consommateurs

| Fichier | Hook utilisé | Ligne |
|---------|--------------|-------|
| `src/components/features/sequences/sequence-editor/SequenceEditor.tsx` | `useSequenceStepsWithVisitor` | 41 |
| `src/components/features/timeline/slots-editor/SlotsEditor.tsx` | `useSequencesWithVisitor` | (parent) |
| `src/components/layout/navbar/Navbar.tsx` | `useIsVisitor` | (detection) |

### Migrations Supabase (schéma cloud)

| Fichier | Phase | Contenu |
|---------|-------|---------|
| `supabase/migrations/20260202122000_phase6_create_sequences.sql` | 6.1 | Table sequences |
| `supabase/migrations/20260202123000_phase6_create_sequence_steps.sql` | 6.2 | Table sequence_steps |
| `supabase/migrations/20260202124000_phase6_add_sequence_invariants.sql` | 6.3 | Constraints + triggers |
| `supabase/migrations/20260203133000_phase7_8_rls_sequences.sql` | 7.8 | RLS policies |

### Types TypeScript

| Fichier | Contenu |
|---------|---------|
| `src/types/supabase.ts` | Types Supabase générés (`pnpm db:types`) |
| `src/utils/visitor/sequencesDB.ts:30-42` | Types locaux : VisitorSequence, VisitorSequenceStep |
| `src/hooks/useSequencesLocal.ts:25` | Export VisitorSequence |
| `src/hooks/useSequenceStepsLocal.ts:25` | Export VisitorSequenceStep |

---

## 🔍 Recherche rapide

### "Où sont les IDs persistés?"

- **Visitor profil enfant** : `localStorage` clé `applipicto:visitor:activeChildId` = `"visitor-local"`
  - Fichier : `ChildProfileContext.tsx:70, 155-162`

- **Auth user profil enfant** : `localStorage` clé `applipicto:activeChild:{userId}`
  - Fichier : `ChildProfileContext.tsx:76, 171-187`

### "Où est IndexedDB initié?"

- **Init code** : `src/utils/visitor/sequencesDB.ts:45-86` (fonction `openDB`)
- **DB name** : `"appli-picto-visitor"` (constant ligne 24)
- **Stores** : `"sequences"` et `"sequence_steps"` (lignes 26-27)

### "Où sont les contraintes enforced?"

- **Min 2 étapes** : `sequencesDB.ts:174-176` (create), `:339-341` (delete)
- **UNIQUE mother_card_id** : `sequencesDB.ts:182-185` (create)
- **UNIQUE step_card_id** : `sequencesDB.ts:285-287` (addStep)
- **UNIQUE position** : Index composite IndexedDB `:76-82`

### "Comment router Visitor/Auth?"

- **Pattern** : `enabled` flag dans hooks
- **Exemple** : `useSequencesWithVisitor.ts:78-79`
- **Logique** : `cloudResult = useSequences(!isVisitor && authReady)`

### "Où vérifier SSR-safety?"

- **Guard pattern** : `if (typeof window !== 'undefined')`
- **DisplayContext** : `:37, 43-45, 54-55, 64-65`
- **ChildProfileContext** : `:155, 162, 171, 184`
- **OfflineContext** : `:105-106, 77, 88`

### "Où est la queue offline?"

- **Storage** : `localStorage` clé `appli-picto:offline-validation-queue`
- **Fichier** : `src/contexts/OfflineContext.tsx:67`
- **Scope** : Auth users seulement (Visitor n'a pas de sessions DB)
- **Interface** : `PendingValidation` `:37-46`

---

## 📊 Tableaux rapides

### Clés localStorage par scope

```
VISITOR ONLY:
├─ applipicto:visitor:activeChildId

AUTH USERS ONLY:
├─ applipicto:activeChild:{userId}
├─ appli-picto:offline-validation-queue
├─ showTrain
├─ showAutre
└─ showTimeTimer

BOTH (GLOBAL):
├─ cookie_consent_v2
├─ lang
└─ theme
```

### IndexedDB schema

```
DB: appli-picto-visitor (v1)

Store: sequences
├─ PK: id (string)
├─ Index: mother_card_id (UNIQUE)
└─ Columns: id, mother_card_id, created_at

Store: sequence_steps
├─ PK: id (string)
├─ Index: sequence_id (non-unique)
├─ Index: sequence_step_card (UNIQUE on [sequence_id, step_card_id])
├─ Index: sequence_position (UNIQUE on [sequence_id, position])
└─ Columns: id, sequence_id, step_card_id, position
```

### Hooks: Détection vs Adapters

```
DETECTION:
└─ useIsVisitor() → { isVisitor, authReady }

ADAPTERS (Router):
├─ useSequencesWithVisitor() → Choisit local ou cloud
└─ useSequenceStepsWithVisitor() → Choisit local ou cloud

LOCAL-ONLY (Ne pas appeler directement!):
├─ useSequencesLocal(enabled)
└─ useSequenceStepsLocal(sequenceId, enabled)

CLOUD-ONLY:
├─ useSequences(enabled)
└─ useSequenceSteps(sequenceId, enabled)
```

---

## ✅ Checklist : Avant modification

- [ ] Vérifier si change affecte Visitor ou Auth users
- [ ] Si Visitor: modifier `src/utils/visitor/sequencesDB.ts` ou `useSequences*Local.ts`
- [ ] Si Auth: modifier `src/hooks/useSequences.ts` ou `useSequenceSteps.ts`
- [ ] Appliquer le pattern `enabled` flag pour routing adapter
- [ ] Ajouter guard SSR `typeof window !== 'undefined'` si localStorage
- [ ] Vérifier contraintes DB appliquées (même local que cloud)
- [ ] Tester en mode Visitor (DevTools Applications tab)
- [ ] Tester en mode Auth
- [ ] Vérifier offline mode (Chrome DevTools: offline)
- [ ] Lancer `pnpm check && pnpm test` avant commit

---

## 🔗 Liens utiles

### Documentation Appli-Picto

- `CLAUDE.md` (root) : Conventions du projet
- `src/CLAUDE.md` : Guidelines spécifiques
- `UX.md` : Spécifications UX

### Standards & Spécs

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)

### Tickets relatifs

- **Ticket 3 (S9)** : Séquençage Visitor - ✅ DONE
- **Ticket 4 (S10)** : Import Visitor → Compte - 📋 TODO
- **Ticket 5 (S11)** : Collaboration Timeline - 🔮 FUTURE

---

## 📞 Support

Pour des questions spécifiques :

1. Consulter le fichier `PERSISTENCE_ANALYSIS.md` (section pertinente)
2. Vérifier `PERSISTENCE_QUICK_REFERENCE.md` (pièges courants)
3. Visualiser diagrammes dans `PERSISTENCE_DIAGRAM.md`
4. Inspecter code source (voir cartographie § 7 ANALYSIS)

---

**Créé** : 2026-03-25
**Dernière mise à jour** : 2026-03-25
**Status** : ✅ Documentation complète
**Audience** : Développeurs Appli-Picto
