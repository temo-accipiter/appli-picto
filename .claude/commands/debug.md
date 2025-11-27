---
description: Analyse ultra-approfondie pour bugs sérieux avec troubleshooting systématique
allowed-tools: ['Bash', 'Read', 'Grep', 'Glob']
argument-hint: <description-du-bug>
model: sonnet
---

Tu es un spécialiste du debugging. Effectue une analyse ULTRA-APPROFONDIE pour bugs sérieux.

**Tu dois toujours ULTRA RÉFLÉCHIR.**

## Phase 1 : REPRODUIRE

1. **Comprendre le bug** : Lire description utilisateur dans $ARGUMENTS
2. **Localiser le code** : Utiliser Grep pour trouver fichiers pertinents
3. **Lire le contexte** : Lire TOUS les fichiers liés complètement
4. **Identifier symptômes** : Lister erreurs/comportements observables

## Phase 2 : ANALYSER

1. **Analyse stack trace** : Si logs d'erreur existent, les parser
2. **Traçage flux de données** : Suivre données à travers fonctions
3. **Inspection état** : Vérifier state composant, props, hooks
4. **Vérification dépendances** : Vérifier versions packages, imports
5. **Console navigateur** : Chercher erreurs côté client (si applicable)
6. **Inspection réseau** : Vérifier appels API (Supabase, Stripe)

## Phase 3 : HYPOTHÈSES

1. **Lister causes possibles** (minimum 3 hypothèses)
2. **Classer par probabilité** (plus probable en premier)
3. **Expliquer raisonnement** pour chaque hypothèse

## Phase 4 : INVESTIGUER

1. **Tester hypothèses systématiquement**
2. **Ajouter console.log/debugging** si nécessaire
3. **Exécuter tests pertinents** : `pnpm test <component>`
4. **Vérifier logs Supabase** si lié backend
5. **Vérifier variables d'environnement**

## Phase 5 : CORRIGER

1. **Implémenter correctif minimal** (pas de sur-ingénierie)
2. **Vérifier que le correctif marche** : Exécuter tests, test manuel
3. **Documenter cause racine** pour référence future
4. **Exécuter pnpm check** avant de clore

## Vérifications spécifiques Appli-Picto

- **Supabase RLS** : Vérifier policies si échec accès données
- **Quotas** : Vérifier avec useQuotas si lié aux limites
- **État Auth** : Vérifier AuthContext si lié utilisateur
- **Upload images** : Vérifier compression si problème storage
- **Hydration Next.js** : Vérifier mismatches SSR/client
- **TypeScript** : Exécuter pnpm type-check pour erreurs types
- **`'use client'`** : Vérifier présence si composant interactif

## Règles

- **JAMAIS se précipiter** : Prendre temps pour comprendre profondément
- **Documenter découvertes** : Écrire explications claires
- **Tester exhaustivement** : Vérifier que correctif ne casse rien d'autre
- **Rester dans le scope** : Corriger seulement le bug rapporté

## Format de sortie

```
🐛 RAPPORT DE BUG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Symptôme : [Description]
📂 Localisation : [Fichier:Ligne]
🔍 Cause racine : [Explication]
✅ Correctif appliqué : [Changements effectués]
🧪 Vérification : [Tests passés]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Priorité : Exactitude > Vitesse. Jamais deviner, toujours vérifier.
