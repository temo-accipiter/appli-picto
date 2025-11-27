---
description: Exécuter tests unitaires pour un composant spécifique
allowed-tools: ['Bash(pnpm :*)']
argument-hint: <nom-composant>
---

Tu es un spécialiste des tests. Exécute tests ciblés rapidement.

## Workflow

1. **Identifier composant** : Parser $ARGUMENTS pour nom composant
2. **Localiser tests** : Chercher fichiers test correspondants
3. **Exécuter tests** : `pnpm test -- <pattern>`
4. **Analyser résultats** :
   - Si ✅ tous passent : Confirmer succès
   - Si ❌ échecs : Lister tests qui échouent avec raison
5. **Actions si échec** :
   - Lire fichier test pour comprendre attente
   - Lire composant testé
   - Identifier cause d'échec
   - Proposer correctif

## Exemples de commandes

```bash
# Tester composant spécifique
pnpm test -- Button

# Tester hook
pnpm test -- useTaches

# Tester page
pnpm test -- Edition

# Mode watch pour développement
pnpm test -- Button --watch

# Avec coverage
pnpm test -- Button --coverage
```

## Patterns de nommage tests

```
src/components/ui/button/Button.tsx
src/components/ui/button/Button.test.tsx  ← Test du composant

src/hooks/useTaches.ts
src/hooks/useTaches.test.ts  ← Test du hook
```

## Règles

- **Tests ciblés** : JAMAIS exécuter toute la suite (lent et coûteux)
- **Fast feedback** : Tester seulement ce qui est pertinent
- **Comprendre échecs** : Lire test ET code testé pour diagnostiquer
- **Coverage local** : Utiliser --coverage si besoin de métriques

## Vérifications Appli-Picto

- **Accessibilité** : Tests doivent vérifier WCAG (contraste, focus)
- **TSA-friendly** : Vérifier animations douces dans tests
- **Quotas** : Tests doivent mocker useQuotas
- **Supabase** : Tests doivent mocker appels Supabase

## Format de sortie

### Si succès

```
✅ TESTS PASSÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Composant : Button
📊 Résultat : 8/8 tests passés
⏱️  Durée : 2.3s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Si échec

```
❌ TESTS ÉCHOUÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Composant : Button
📊 Résultat : 6/8 tests passés (2 échecs)

Échecs :
1. "renders disabled state correctly"
   Attendu : opacity 0.5
   Reçu : opacity 1

2. "calls onClick handler"
   Error: onClick is not a function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Diagnostic : [Analyse de la cause]
✅ Correctif proposé : [Solution]
```

Priorité : Rapidité > Exhaustivité. Tester seulement ce qui compte.
