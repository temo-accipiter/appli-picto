---
name: Erreurs TypeScript
about: Suivre et corriger les erreurs TypeScript dans le projet
title: '[TS] '
labels: typescript, tech-debt, good-first-issue
assignees: ''
---

## 📋 Description

Cette issue suit les erreurs TypeScript dans la catégorie : **[CATÉGORIE]**

## 🎯 Objectif

Corriger toutes les erreurs TypeScript de type **[TYPE D'ERREUR]** dans les fichiers concernés.

## 📂 Fichiers concernés

- [ ] `path/to/file1.ts` - X erreurs
- [ ] `path/to/file2.tsx` - Y erreurs

## 🔍 Types d'erreurs

Liste des types d'erreurs rencontrées :

- `TS2322`: Type 'X' is not assignable to type 'Y'
- `TS2339`: Property 'X' does not exist on type 'Y'
- `TS2345`: Argument of type 'X' is not assignable to parameter of type 'Y'
- Autres...

## ✅ Critères d'acceptance

- [ ] Toutes les erreurs TypeScript listées sont corrigées
- [ ] Les tests passent (`pnpm test`)
- [ ] Le build réussit (`pnpm build`)
- [ ] Aucune régression introduite
- [ ] Code review approuvé

## 💡 Solutions suggérées

### Option 1: Corriger les types

```typescript
// Avant
const data: SomeType = response.data

// Après
const data = response.data as CorrectType
```

### Option 2: Rendre les props optionnelles

```typescript
interface Props {
  value?: string // Au lieu de value: string
}
```

### Option 3: Utiliser des type guards

```typescript
if (value !== undefined) {
  // value est maintenant de type défini
}
```

## 📚 Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Guide des erreurs TS courantes](https://typescript.tv/errors/)
- Documentation du projet : `CLAUDE.md`

## 🔗 Issues liées

- #XXX - Autre catégorie d'erreurs TS
- #YYY - Refactoring connexe

## 📝 Notes

- Ces erreurs n'empêchent pas le build mais doivent être corrigées pour améliorer la qualité du code
- Priorité : **Moyenne** (tech debt)
- Estimation : **X heures**

---

**Instructions pour le développeur** :

1. Vérifier les erreurs avec `pnpm type-check`
2. Corriger fichier par fichier
3. Valider avec `pnpm check && pnpm test && pnpm build`
4. Commit avec message : `fix(ts): correct [TYPE] errors in [FILE]`
