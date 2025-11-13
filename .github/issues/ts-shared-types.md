# [TS] Corriger les erreurs TypeScript dans les composants Shared

## 📋 Description

Cette issue suit les erreurs TypeScript dans les **composants partagés (shared)** après la migration vers pnpm.

## 🎯 Objectif

Corriger environ **~200 erreurs TypeScript** dans les composants partagés et UI.

## 📂 Fichiers concernés

### Composants de carte

- [ ] `src/components/shared/card/base-card/BaseCard.tsx` - ~5 erreurs
  - Type TFunction incompatible
  - Props optionnelles (`categorie`, `onDelete`)
- [ ] `src/components/shared/card/edition-card/EditionCard.tsx` - Corrigé ✅
- [ ] `src/components/shared/card/tableau-card/TableauCard.tsx` - ~3 erreurs
  - Prop `style` inexistante sur SignedImage
  - `audioCtxRef.current` peut être null

### Composants d'image

- [ ] `src/components/shared/signed-image/SignedImage.tsx` - Partiellement corrigé
  - Ajouter prop `style` optionnelle
- [ ] `src/components/shared/avatar-profil/AvatarProfil.tsx` - ~2 erreurs
  - Prop `title` inexistante sur Button

### Formulaires et inputs

- [ ] `src/components/shared/forms/ItemForm.tsx` - ~10 erreurs
  - Type TFunction incompatible (6 occurrences)
  - Type `string | null` non assignable
  - Props manquantes sur Button
- [ ] `src/components/shared/input-with-validation/InputWithValidation.tsx` - ~1 erreur
  - Props avec `undefined` au lieu de types stricts

### Autres composants shared

- [ ] `src/components/shared/edition-list/EditionList.tsx` - Import React inutilisé
- [ ] `src/components/shared/error-boundary/ErrorBoundary.tsx` - Import React inutilisé
- [ ] `src/components/shared/index.ts` - ~8 erreurs
  - Modules introuvables (mauvais chemins d'import)

### UI components

- [ ] `src/components/ui/button/Button.tsx` - Partiellement corrigé
  - Ajouter variant `danger`
  - Rendre `onClick` optionnel
- [ ] `src/components/shared/modal/Modal.tsx` - Corrigé ✅
- [ ] `src/components/shared/modal/modal-ajout/ModalAjout.tsx` - Corrigé ✅

## 🔍 Types d'erreurs principaux

1. **TS2345**: Type TFunction incompatible (`$TFunctionBrand` manquant)
2. **TS2322**: Type incompatible (props avec exactOptionalPropertyTypes)
3. **TS2307**: Module introuvable (chemins d'import incorrects)
4. **TS6133**: Import inutilisé
5. **TS2339**: Propriété inexistante

## ✅ Critères d'acceptance

- [ ] Toutes les erreurs dans `src/components/shared/` corrigées
- [ ] Toutes les erreurs dans `src/components/ui/` corrigées
- [ ] Les tests passent : `pnpm test`
- [ ] Le build réussit : `pnpm build`
- [ ] Aucune régression UI

## 💡 Solutions suggérées

### Pour les erreurs TFunction

```typescript
// Importer le type correct
import { type TFunction } from 'i18next'

// Utiliser le cast explicite
makeValidateNotEmpty(t as TFunction)

// OU typer la fonction correctement
const validateFn = (t: TFunction<'translation'>) => {
  /* ... */
}
```

### Pour les props optionnelles avec exactOptionalPropertyTypes

```typescript
// Définir comme optionnel dans l'interface
interface Props {
  className?: string // Accepte string | undefined
  style?: CSSProperties
}

// Ou utiliser des valeurs par défaut
const { className = '' } = props
```

### Pour les imports manquants

```typescript
// Vérifier que les fichiers existent
// Corriger les chemins dans src/components/shared/index.ts
export { default as Button } from '../ui/button/Button' // Au lieu de './Button'
```

### Pour React inutilisé

```typescript
// Supprimer l'import si non utilisé
// React 17+ n'a plus besoin de l'import pour JSX
```

## 📚 Ressources

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes)
- [i18next TypeScript](https://www.i18next.com/overview/typescript)

## 🔗 Issues liées

- #XXX - [TS] Erreurs dans composants Admin
- #YYY - [TS] Erreurs i18n TFunction

## 📝 Notes

- Priorité : **Haute** (composants utilisés partout)
- Estimation : **6-8 heures**
- Étiquettes : `typescript`, `tech-debt`, `ui`, `shared`

---

**Checklist de test** :

- [ ] Toutes les pages chargent sans erreur
- [ ] Formulaires fonctionnent (ajout/édition)
- [ ] Images s'affichent correctement
- [ ] Modales s'ouvrent/ferment
- [ ] Boutons sont cliquables
- [ ] Pas d'erreurs console
