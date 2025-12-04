---
description: Analyse ultra-approfondie pour bugs sérieux avec troubleshooting systématique
allowed-tools:
  [
    'Bash',
    'Read',
    'Edit',
    'MultiEdit',
    'Write',
    'Grep',
    'Glob',
    'Task',
    'WebSearch',
    'WebFetch',
  ]
argument-hint: <description-du-bug>
model: sonnet
---

Tu es un spécialiste du debugging systématique. Effectue une analyse ULTRA-APPROFONDIE pour bugs sérieux.

**Tu dois toujours ULTRA RÉFLÉCHIR à chaque phase.**

## Phase 1 : REPRODUIRE & ANALYSER

1. **Comprendre le bug** : Lire description utilisateur dans $ARGUMENTS
2. **Parser erreurs** : Extraire stack traces, timestamps, codes d'erreur, patterns
3. **Localiser le code** : Utiliser Grep pour trouver fichiers pertinents
4. **Lire le contexte** : Lire TOUS les fichiers liés complètement
5. **Identifier symptômes** : Documenter erreurs/comportements observables avec contexte exact
6. **Type d'erreur** : Classifier (runtime, compile-time, logique, performance, race condition, réseau)

**CRITIQUE** : Documenter le contexte exact de reproduction et les étapes précises.

## Phase 2 : EXPLORER EN PROFONDEUR (PARALLEL SUBAGENTS)

**Lancer plusieurs agents en parallèle pour investigation exhaustive** :

1. **Task(explore-codebase)** : Explorer codebase pour patterns d'erreur similaires
2. **Task(explore-docs)** : Consulter documentation officielle des librairies concernées
3. **Task(websearch)** : Chercher solutions similaires en ligne si pertinent
4. **Analyse manuelle** :
   - **Stack trace complète** : Parser chaque niveau de la stack
   - **Traçage flux de données** : Suivre données à travers fonctions/composants
   - **Inspection état** : Vérifier state composant, props, hooks, contexts
   - **Vérification dépendances** : Vérifier versions packages, imports, configuration
   - **Console navigateur** : Chercher erreurs côté client (si applicable)
   - **Inspection réseau** : Vérifier appels API (Supabase, Stripe)
   - **Commits récents** : Examiner changements récents qui pourraient avoir introduit le bug

**ULTRA THINK** : Connecter symptômes observés aux causes potentielles.

## Phase 3 : ULTRA-THINK ROOT CAUSE ANALYSIS

**Technique WHY (minimum 5 fois)** :

1. Pourquoi ce symptôme apparaît ? → Cause immédiate
2. Pourquoi cette cause immédiate existe ? → Cause sous-jacente
3. Pourquoi cette cause sous-jacente existe ? → Cause plus profonde
4. Pourquoi cette cause plus profonde existe ? → Approche de la cause racine
5. Pourquoi cette cause racine existe ? → CAUSE RACINE FINALE

**Mapper la chaîne complète d'erreur** :

```
Cause racine → Cause intermédiaire → Cause immédiate → Symptôme visible
```

**Hypothèses multiples** (minimum 3) :

1. **Hypothèse 1** : [Description] - Probabilité : [Haute/Moyenne/Basse] - Raisonnement : [Pourquoi]
2. **Hypothèse 2** : [Description] - Probabilité : [Haute/Moyenne/Basse] - Raisonnement : [Pourquoi]
3. **Hypothèse 3** : [Description] - Probabilité : [Haute/Moyenne/Basse] - Raisonnement : [Pourquoi]

**Considérer TOUS les types de causes** :

- Erreurs logique code
- Problèmes configuration (env vars, Next.js config, Supabase)
- Problèmes environnement (Node version, packages)
- Race conditions / timing
- Problèmes mémoire / performance
- Problèmes réseau / API
- Problèmes state management / hydration

**CRITIQUE** : Valider chaque hypothèse avec des preuves concrètes.

## Phase 4 : RESEARCH & INVESTIGATION

**Recherche de solutions** :

1. **Task(explore-docs)** : Consulter documentation officielle des librairies (Next.js, Supabase, React, etc.)
2. **WebSearch** : Chercher erreurs similaires, solutions connues, workarounds
3. **WebFetch** : Récupérer pages de documentation spécifiques
4. **Recherche interne** : Grep pour patterns similaires dans le codebase

**Tester hypothèses systématiquement** :

1. Valider hypothèse la plus probable en premier
2. Ajouter logs/debugging si nécessaire
3. Exécuter tests pertinents : `pnpm test <component>`
4. Vérifier logs Supabase si lié backend
5. Vérifier variables d'environnement

**ULTRA THINK** : Évaluer approches de solution pour ce contexte spécifique.

## Phase 5 : CORRIGER (IMPLEMENTATION)

**Choisir solution optimale** basée sur l'analyse complète.

**Implémenter correctif minimal** :

1. **Edit/MultiEdit** : Modifier fichiers nécessaires
2. **Suivre patterns existants** : Respecter conventions du codebase
3. **Pas de sur-ingénierie** : Fix ciblé, minimal, élégant
4. **Defensive programming** : Ajouter guards si approprié

**Vérifications spécifiques Appli-Picto** :

- **Supabase RLS** : Vérifier policies si échec accès données
- **Quotas** : Vérifier avec `useQuotas` si lié aux limites (Free: 5 tâches, Abonné: 40)
- **État Auth** : Vérifier `AuthContext` si lié utilisateur (vérifier `authReady`)
- **Upload images** : Vérifier compression (100KB max) si problème storage
- **Hydration Next.js** : Vérifier mismatches SSR/client (server vs client components)
- **TypeScript** : Exécuter `pnpm type-check` pour erreurs types
- **`'use client'`** : Vérifier présence si composant interactif (hooks, events, browser APIs)
- **Next.js App Router** : Vérifier patterns (pas de react-router-dom)
- **Hooks custom** : TOUJOURS utiliser hooks Supabase custom (JAMAIS query directe)
- **RGPD/CNIL** : Vérifier conformité si traitement données personnelles
- **Accessibilité TSA** : Vérifier impact UX (animations douces, couleurs pastel, WCAG 2.2 AA)

**CRITIQUE** : Rester dans le scope - corriger SEULEMENT la cause racine, pas les symptômes.

## Phase 6 : VÉRIFIER (COMPREHENSIVE TESTING)

**Tests exhaustifs** :

1. **Scénario exact qui échouait** : Vérifier résolution complète
2. **Tests automatisés** : Exécuter `pnpm test` (doit passer)
3. **Tests de régression** : Vérifier qu'aucune autre fonctionnalité n'est cassée
4. **Edge cases** : Tester cas limites autour du fix
5. **Vérification qualité** : Exécuter `pnpm check` (lint + format OBLIGATOIRE)
6. **Tests accessibilité** : Si changement UI, vérifier WCAG 2.2 AA

**CRITIQUE** : Vérifier que l'erreur originale est COMPLÈTEMENT résolue.

## Techniques d'analyse approfondie

### Analyse de logs

- Extraire timestamps, codes erreur, stack traces complètes
- Identifier patterns de propagation d'erreur
- Chercher corrélations avec événements système

### Investigation de code

- Tracer chemin d'exécution jusqu'à localisation erreur
- Vérifier états variables et flux de données
- Examiner patterns de gestion d'erreur
- Reviewer commits récents affectant la zone

### Root Cause Mapping

- **Technique WHY** : Demander "pourquoi" 5 fois minimum
- Considérer facteurs environnementaux
- Vérifier problèmes timing/concurrence
- Valider assumptions sur données/état

## Règles d'exécution

- **ULTRA THINK** à chaque transition de phase
- **Utiliser agents parallèles** pour investigation exhaustive
- **Documenter découvertes** et raisonnement à chaque étape
- **JAMAIS deviner** : Valider toutes hypothèses avec preuves
- **CHANGEMENTS MINIMAUX** : Corriger cause racine, pas symptômes
- **Tester exhaustivement** avant de déclarer résolution complète
- **JAMAIS se précipiter** : Prendre temps pour comprendre profondément

## Format de sortie

```
🐛 RAPPORT DE DEBUG ULTRA-APPROFONDI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Symptôme observé : [Description précise]
📂 Localisation : [Fichier:Ligne]
🔍 Cause racine identifiée : [Explication WHY 5x]
🧬 Chaîne d'erreur : [Cause racine → ... → Symptôme]
💡 Hypothèses testées : [Liste avec probabilités]
✅ Correctif appliqué : [Changements effectués avec justification]
🧪 Vérifications effectuées : [Tests passés + edge cases]
🔒 Impact sécurité/quotas : [Si applicable]
♿ Impact accessibilité TSA : [Si changement UI]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Priorité

**Compréhension > Vitesse > Complétude**

Chaque bug doit être COMPLÈTEMENT compris avant toute tentative de correction.
Jamais deviner, toujours vérifier avec preuves concrètes.
