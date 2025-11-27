---
description: Vérification rapide complète - lint, format, types, build, tests
allowed-tools: ['Bash(pnpm :*)']
---

Tu es un gardien de qualité code. Exécute vérifications essentielles dans l'ordre optimal et corrige erreurs.

## Workflow - Ordre d'exécution

### 1. **pnpm check** (lint + format)

```bash
pnpm check
```

- Corrige automatiquement erreurs ESLint
- Formate code avec Prettier
- **Si échec** : Lister erreurs non auto-corrigeables → demander action utilisateur

### 2. **pnpm type-check** (TypeScript)

```bash
pnpm type-check
```

- Vérifie erreurs TypeScript
- **Si échec** : Identifier erreurs critiques vs non-bloquantes (329 erreurs connues)
- **Action** : Corriger SEULEMENT erreurs nouvelles (pas les 329 existantes)

### 3. **pnpm build** (Next.js)

```bash
pnpm build
```

- Compile projet Next.js avec Turbopack
- **Si échec** : Analyser erreur de build, corriger, relancer
- **Succès attendu** : Build complète malgré erreurs TypeScript (c'est normal)

### 4. **pnpm test** (tests unitaires)

```bash
pnpm test
```

- Exécute tous tests Vitest
- **Si échec** : Lister tests échoués avec raison
- **Action** : Corriger tests cassés, relancer

## Stratégie de correction

### Erreurs auto-corrigeables

- **ESLint/Prettier** : `pnpm check` les corrige automatiquement
- **Action** : Aucune, c'est fait

### Erreurs TypeScript

- **329 erreurs connues** : Ignorer (migration Next.js en cours)
- **Nouvelles erreurs** : Corriger immédiatement
- **Comment distinguer** : Comparer avec `.github/issues/ts-remaining-errors.md`

### Erreurs de build

- **Import manquants** : Ajouter imports
- **Syntaxe invalide** : Corriger syntaxe
- **Modules non trouvés** : Vérifier package.json

### Tests échoués

- **Attentes obsolètes** : Mettre à jour test
- **Composant cassé** : Corriger composant
- **Mock manquant** : Ajouter mock Supabase/Auth

## Règles

- **Ordre strict** : check → type-check → build → test
- **Ne pas sauter** : Si une étape échoue, corriger avant continuer
- **Auto-correction** : Corriger automatiquement quand possible
- **Rapport clair** : Indiquer quelle étape a échoué et pourquoi
- **Pas de test:e2e** : Trop lent pour vérification rapide

## Format de sortie

### Si tout passe

```
✅ VÉRIFICATION RAPIDE COMPLÈTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ pnpm check      → Lint + format OK
✅ pnpm type-check → 329 erreurs (normales)
✅ pnpm build      → Build OK (31s)
✅ pnpm test       → 47 tests passés
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Projet prêt pour commit/push
```

### Si échec

```
❌ VÉRIFICATION ÉCHOUÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ pnpm check      → OK
✅ pnpm type-check → OK (329 erreurs connues)
❌ pnpm build      → ÉCHEC

Erreur de build :
  src/components/Button.tsx:12:5
  Cannot find name 'invalidVar'

🔍 Cause : Variable non définie
✅ Correctif : [Action de correction proposée]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Priorité : Qualité > Vitesse. Tout doit passer avant de continuer.
