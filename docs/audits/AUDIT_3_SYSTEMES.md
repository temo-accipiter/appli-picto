# Rapport d'audit — Séparation des 3 systèmes

**Date** : 2026-05-14  
**Périmètre scanné** : src/components, src/features, src/app, src/hooks, src/lib, src/types, src/styles  
**Fichiers analysés** : 236 fichiers TypeScript/TSX (hors tests, node_modules, .next)

---

## Identification des racines des 3 systèmes

| Système                | Localisation                                                   | Tables DB                           | Composants clés                                                         |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| **Planning visuel**    | `src/components/features/timeline/` + `tableau/`               | `timelines`, `slots`                | `SlotsEditor`, `SlotItem`, `CardPicker` + `SlotCard`, `SessionComplete` |
| **Économie de jetons** | `src/components/features/recompenses/`, `tableau/tokens-grid/` | `slots.tokens` (colonne, kind=step) | `TokensGrid`, `SelectedRewardFloating`                                  |
| **Séquençage**         | `src/components/features/sequences/`                           | `sequences`, `sequence_steps`       | `SequenceEditor`, `SequenceMiniTimeline`                                |

**Remarque structure** : Le système Tableau (contexte enfant d'exécution) mélange Planning et Séquençage pour l'affichage intégré. C'est attendu au niveau page (`Tableau.tsx`), pas au niveau composant.

---

## Vérification 1 — Imports croisés TypeScript

### Infractions détectées

**Infraction 1.1 — SlotsEditor importe SequenceEditor**

- **Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/timeline/slots-editor/SlotsEditor.tsx`
- **Ligne** : 50
- **Code** : `import { SequenceEditor } from '@/components/features/sequences'`
- **Système** : Planning importe Séquençage
- **Impact** : Le Planning (édition timeline) contient la logique complète du Séquençage dans la même UI

**Infraction 1.2 — SlotCard importe SequenceMiniTimeline**

- **Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/tableau/slot-card/SlotCard.tsx`
- **Ligne** : 29
- **Code** : `import { SequenceMiniTimeline } from '@/components/features/sequences'`
- **Système** : Tableau (Planning + exécution) importe Séquençage
- **Impact** : SlotCard affiche directement la mini-timeline des étapes de séquence

**VertificationRésultat global** : ❌ Deux infractions structurelles, aucune autre infraction détectée aux imports

---

## Vérification 2 — Types partagés à tort

**Fichiers inspectés** :

- `/Users/accipiter_tell/projets/new_sup/appli-picto/src/types/cards.ts` — Types isolés pour cartes personnelles (OK)
- `/Users/accipiter_tell/projets/new_sup/appli-picto/src/types/supabase.ts` — Types générés Supabase (tables `timelines`, `slots`, `sequences`, `sequence_steps` respectivement isolées dans la DB)

**Résultat** : ✅ Aucune infraction. Les types ne mélangent pas les systèmes.

---

## Vérification 3 — Composants mutualisés à tort

### Couplage détecté dans SlotItem

**Fichier** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/timeline/slot-item/SlotItem.tsx`

**Props de Séquençage dans SlotItem (composant Planning)** :

- Ligne 76 : `sequence?: Sequence | null`
- Ligne 81-84 : `onCreateSequence?: (...) => Promise<{ id: string | null; error: Error | null }>`
- Ligne 89 : `onDeleteSequence?: (sequenceId: string) => Promise<{ error: Error | null }>`
- Ligne 94 : `canCreateSequence?: boolean`
- Ligne 96 : `onOpenSequenceEditor?: (slot: Slot) => void`
- Ligne 98 : `isSequenceEditorOpen?: boolean`
- Ligne 113 : `isSequenceReadOnly?: boolean`

**Impact** : SlotItem mélange Planning (slot, tokens, validation) + Séquençage (createSequence, deleteSequence, editor). C'est un composant hybrid plutôt qu'une séparation claire.

**Résultat** : ⚠️ Couplage fonctionnel observé, mais les props sont optionnelles (destructure par SlotsEditor vs par Tableau).

---

## Vérification 4 — Hooks/services couplés

**Fichiers inspectés** :

- `useSlots.ts` — Retourne slots (Planning uniquement) ✅
- `useSequences.ts` — Retourne sequences (Séquençage uniquement) ✅
- `useSequenceSteps.ts` — Retourne sequence_steps (Séquençage uniquement) ✅
- `useRecompenses.ts` — Retourne recompenses (table dédiée, pas liée aux slots.tokens) ✅
- `useSessions.ts` — Sessions (exécution, indépendant) ✅
- `useSessionValidations.ts` — Validations (exécution, indépendant) ✅

**Hooks composites vérifiés** :

- `useSequencesWithVisitor()` — Unifie Visitor local + DB Supabase pour Séquençage uniquement ✅
- `useSequenceStepsWithVisitor()` — Unifie Visitor local + DB Supabase pour étapes séquence uniquement ✅

**Calcul des jetons** :

- Effectué dans `Tableau.tsx` lignes 379-391 (useMemo)
- Formule : somme des `slot.tokens` pour slots validés / somme totale
- Dérivée de la table `slots` (Planning), pas mélangée avec Séquençage
- ✅ Acceptable — calcul de présentation au niveau page

**Résultat** : ✅ Aucune infraction. Les hooks sont bien séparés et respectent les domaines.

---

## Vérification 5 — BEM croisé en SCSS

**Fichiers inspectés** :

- `timeline/slots-editor/SlotsEditor.scss` — Préfixe `.slots-editor` ✅
- `timeline/slot-item/SlotItem.scss` — Préfixe `.slot-item`, inclut `&__tokens-control`, `&__tokens-select`, `&__sequence-toggle` ✅
- `tableau/slot-card/SlotCard.scss` — Préfixe `.slot-card`, inclut `&__sequence-toggle` ✅
- `tableau/tokens-grid/TokensGrid.scss` — Préfixe `.tokens-grid` ✅
- `sequences/sequence-editor/SequenceEditor.scss` — Préfixe `.sequence-editor` ✅
- `sequences/sequence-mini-timeline/SequenceMiniTimeline.scss` — Préfixe `.sequence-mini-timeline` ✅
- `recompenses/selected-reward-floating/SelectedRewardFloating.scss` — Préfixe `.reward` ✅

**Analyse** :

- Chaque système a son propre préfixe BEM
- `.sequence-mini-timeline` est un nom légitime (mini-timeline pour séquence, non-croisé)
- Les éléments comme `.__tokens-` et `.__sequence-toggle` sont dans le composant qui les utilise
- Pas de sélecteur d'un système dans le SCSS d'un autre système

**Résultat** : ✅ Aucune infraction BEM croisée.

---

## Vérification 6 — Nommage trompeur

**Recherche effectuée** : `tokenSlot`, `slotToken`, `sequenceTimeline`, `timelineSequence`, `rewardStep`, `stepReward`

**Résultat** : ✅ Aucun nom trompeur détecté. Les noms de fichiers et variables respectent la séparation.

---

## Vérification 7 — Logique métier couplante

### Patterns détectés

**Pattern 1 — Recherche de séquence par slot.card_id**

Détecté dans :

- `SlotsEditor.tsx` lignes 479-480
- `Tableau.tsx` lignes 466-467

Code type :

```typescript
const sequence = slot.card_id
  ? (sequences.find(s => s.mother_card_id === slot.card_id) ?? null)
  : null
```

**Analyse** : C'est un assemblage de présentation (Tableau affiche slot + ses étapes de séquence), pas une fusion métier. Acceptable au niveau page/parent. ✅

**Pattern 2 — État local dans SlotCard pour séquence**

`SlotCard.tsx` lignes 71-73 :

```typescript
const [miniTimelineOpen, setMiniTimelineOpen] = useState(false)
const [doneStepIds, setDoneStepIds] = useState<Set<string>>(() => new Set())
```

**Analyse** : État local-only pour l'UI (la progression des étapes n'est pas persistée en DB). Correct. ✅

**Pattern 3 — Calculs de jetons**

`Tableau.tsx` lignes 379-391 :

```typescript
const earnedTokens = useMemo(() => {
  for (const slot of visibleStepSlots) {
    if (effectiveValidatedSlotIds.has(slot.id)) {
      count += slot.tokens ?? 0
    }
  }
  return count
}, [visibleStepSlots, effectiveValidatedSlotIds])
```

**Analyse** : Calcul pur, source est `slots.tokens` (Planning), pas Séquençage. ✅

**Résultat** : ✅ Pas de logique métier couplante détectée. Les couplages observés sont des assemblages de présentation légitimes au niveau page/parent.

---

## Synthèse

### Infractions critiques (couplage logique, à corriger en priorité)

❌ **1 infraction critique** :

- **Couplage fort : SlotsEditor ↔ SequenceEditor**
  - L'éditeur Planning contient complètement le modal Séquençage
  - Tight coupling architectural qui viole la séparation des trois systèmes
  - **Recommandation** : Extraire le modal SequenceEditor hors de SlotsEditor (passer par parent EditionTimeline)

### Infractions structurelles (imports, types, composants)

⚠️ **2 infractions structurelles** :

1. `/src/components/features/timeline/slots-editor/SlotsEditor.tsx:50` — Import `SequenceEditor`
2. `/src/components/features/tableau/slot-card/SlotCard.tsx:29` — Import `SequenceMiniTimeline`

⚠️ **1 couplage de props** :

- `SlotItem` a 7 props optionnelles de Séquençage mélangées avec props Planning
- **Recommandation** : Extraire les props séquençage dans un objet wrapper ou une prop `sequenceConfig?`

### Infractions cosmétiques (nommage, BEM)

✅ Aucune infraction détectée.

---

## Zones grises rencontrées

1. **Tableau = contexte page composite**
   - Tableau mélange intentionnellement Planning (slots validés) + Séquençage (étapes visibles)
   - Ceci est **inévitable** au niveau page d'exécution enfant
   - Mais les imports et props croisées dans les composants sont à éviter

2. **SlotItem = composant "hub"**
   - SlotItem occupe une position de "hub" entre Planning et Séquençage
   - Les props optionnelles permettent une utilisation Planning-only (sans Séquençage)
   - C'est un pragmatisme accepté, mais idéalement on pourrait wrapper cette complexité

3. **Calcul de jetons dans Tableau.tsx**
   - Technique : dérivation de `slots.tokens` (Planning) pour affichage TokensGrid
   - OK au niveau page, pas au niveau composant Planning

---

## Fichiers à revisiter prioritairement

1. `/src/components/features/timeline/slots-editor/SlotsEditor.tsx` — Ligne 50, restructurer modal
2. `/src/components/features/timeline/slot-item/SlotItem.tsx` — Lignes 76–113, wrapper props séquençage
3. `/src/components/features/tableau/slot-card/SlotCard.tsx` — Ligne 29, envisager extraction

---

## Conclusion

La séparation des 3 systèmes est **globalement respectée au niveau des hooks, types et export de composants**. Cependant, il y a **couplage fort au niveau rendu** :

- ✅ Systèmes isolés en termes de données (DB, hooks)
- ✅ Types et API bien séparés
- ⚠️ Imports croisés entre composants Planning/Tableau ↔ Séquençage
- ⚠️ Props mélangées dans SlotItem et SlotCard

**Priorité de fix** : Extraire SequenceEditor hors de SlotsEditor (réduire tight coupling Planning ↔ Séquençage). Les autres infractions sont mineures (optional props, affichage composite page).
