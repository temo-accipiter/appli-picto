# [TS] Corriger les erreurs TypeScript liées à i18n (TFunction)

## 📋 Description

Cette issue suit les **erreurs TypeScript liées à i18next** (`TFunction`) dans tout le projet.

## 🎯 Objectif

Corriger environ **~250 erreurs TypeScript** liées au type `TFunction` manquant de la propriété `$TFunctionBrand`.

## 📂 Fichiers concernés

### Fichiers avec erreurs TFunction
- [ ] `src/components/shared/card/base-card/BaseCard.tsx` - 3 erreurs
- [ ] `src/components/shared/forms/ItemForm.tsx` - 6 erreurs
- [ ] `src/components/features/settings/DeleteAccountModal.tsx` - 1 erreur
- [ ] `src/utils/validationRules.ts` - Potentiellement ~50 erreurs (fonctions `make*`)
- [ ] Tous les composants utilisant `useI18n()` ou `useTranslation()`

## 🔍 Erreur type

```
error TS2345: Argument of type '(key: string, options?: object | undefined) => string'
is not assignable to parameter of type 'TFunction<"translation", undefined>'.
Property '$TFunctionBrand' is missing in type '(key: string, options?: object | undefined) => string'
but required in type 'TFunction<"translation", undefined>'.
```

## 🎯 Cause racine

La fonction `t` retournée par `useI18n()` ou `useTranslation()` n'a pas le bon type.
Le type `TFunction` de i18next v23+ requiert une propriété interne `$TFunctionBrand` pour la type safety.

## ✅ Critères d'acceptance

- [ ] Toutes les erreurs TFunction corrigées
- [ ] Le hook `useI18n` retourne le bon type
- [ ] Les fonctions `make*` dans validationRules acceptent `TFunction`
- [ ] Les tests passent : `pnpm test`
- [ ] Le build réussit : `pnpm build`
- [ ] Les traductions fonctionnent correctement

## 💡 Solutions suggérées

### Solution 1: Corriger le hook useI18n (RECOMMANDÉ)
```typescript
// src/hooks/useI18n.ts
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

export const useI18n = () => {
  const { t, i18n } = useTranslation()

  return {
    t: t as TFunction<'translation'>,  // Cast explicite
    i18n,
    language: i18n.language,
  }
}
```

### Solution 2: Utiliser useTranslation directement
```typescript
// Dans chaque composant
import { useTranslation } from 'react-i18next'

const { t } = useTranslation()
// t a maintenant le bon type automatiquement
```

### Solution 3: Typer les paramètres de fonction
```typescript
// Pour les fonctions qui acceptent t
import type { TFunction } from 'i18next'

export const makeValidateNotEmpty = (t: TFunction<'translation'>) => {
  // ...
}
```

### Solution 4: Cast explicite lors de l'appel
```typescript
// Moins recommandé, mais fonctionne
const rules = makeValidateNotEmpty(t as TFunction<'translation'>)
```

## 📚 Ressources

- [i18next TypeScript Guide](https://www.i18next.com/overview/typescript)
- [React i18next TypeScript](https://react.i18next.com/latest/typescript)
- [TFunction API](https://www.i18next.com/overview/api#t)

## 🎯 Plan d'action recommandé

### Phase 1: Corriger le hook useI18n
1. Ouvrir `src/hooks/useI18n.ts`
2. Ajouter le cast `as TFunction<'translation'>`
3. Vérifier que tous les appels fonctionnent

### Phase 2: Vérifier les fonctions de validation
1. Ouvrir `src/utils/validationRules.ts`
2. S'assurer que les fonctions `make*` acceptent `TFunction<'translation'>`
3. Tester les validations

### Phase 3: Corriger les cas spécifiques
1. BaseCard.tsx
2. ItemForm.tsx
3. DeleteAccountModal.tsx

### Phase 4: Vérification globale
1. Lancer `pnpm type-check`
2. Filtrer les erreurs TFunction restantes
3. Corriger au cas par cas

## 🔗 Issues liées

- #XXX - [TS] Erreurs dans composants Admin
- #YYY - [TS] Erreurs dans composants Shared
- Documentation i18n : `docs/I18N/I18N_GUIDE.md`

## 📝 Notes

- Priorité : **Haute** (affecte beaucoup de fichiers)
- Estimation : **3-4 heures** (avec Solution 1)
- Étiquettes : `typescript`, `i18n`, `tech-debt`, `good-first-issue`

---

**Checklist de test** :
- [ ] Changement de langue fonctionne
- [ ] Toutes les traductions s'affichent
- [ ] Validation des formulaires fonctionne
- [ ] Messages d'erreur traduits
- [ ] Pas d'erreurs console
- [ ] Type-check passe sans erreurs TFunction
