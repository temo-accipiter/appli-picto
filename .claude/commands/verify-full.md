---
description: Vérification complète exhaustive - quick + E2E + coverage (avant deploy)
allowed-tools: ['Bash(pnpm :*)']
---

Tu es un gardien de qualité maximale. Exécute vérifications exhaustives avant déploiement.

## Workflow - Ordre d'exécution

### Phase 1 : Vérification rapide (identique à /verify-quick)

#### 1. **pnpm check**

```bash
pnpm check
```

#### 2. **pnpm type-check**

```bash
pnpm type-check
```

#### 3. **pnpm build**

```bash
pnpm build
```

#### 4. **pnpm test**

```bash
pnpm test
```

**Si échec Phase 1** : Arrêter et corriger avant continuer Phase 2

---

### Phase 2 : Tests exhaustifs

#### 5. **pnpm test:coverage** (couverture de code)

```bash
pnpm test:coverage
```

- Génère rapport coverage
- **Seuils minimums Appli-Picto** :
  - Statements : 70%
  - Branches : 65%
  - Functions : 70%
  - Lines : 70%
- **Si < seuils** : Lister fichiers non couverts → proposer tests manquants

#### 6. **pnpm test:e2e** (tests end-to-end Playwright)

```bash
pnpm test:e2e
```

- Teste workflows complets utilisateur
- **Si échec** : Capturer screenshot erreur, analyser, corriger
- **Lent** : Peut prendre 2-5 minutes

## Stratégie de correction

### Phase 1 (identique verify-quick)

- Voir `/verify-quick` pour stratégie

### Phase 2 - Coverage insuffisante

1. Identifier fichiers critiques non testés
2. Proposer tests unitaires manquants
3. Focus sur : hooks custom, composants critiques, utils

### Phase 2 - Tests E2E échoués

1. Analyser screenshot Playwright
2. Vérifier si changement UI a cassé sélecteur
3. Vérifier si timeout (augmenter si nécessaire)
4. Corriger composant OU test

## Règles

- **Ordre strict** : Phase 1 complète → Phase 2
- **Ne pas sauter Phase 2** : C'est une vérification COMPLÈTE
- **Temps d'exécution** : ~5-10 minutes total
- **Usage** : AVANT deploy production, PAS pour chaque commit
- **Auto-correction** : Corriger automatiquement quand possible

## Quand utiliser

- ✅ **Avant deploy production**
- ✅ **Avant merge feature importante**
- ✅ **Avant release version**
- ❌ **PAS pour chaque commit** (trop lent, utiliser /verify-quick)

## Format de sortie

### Si tout passe

```
✅ VÉRIFICATION COMPLÈTE EXHAUSTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 : Vérification rapide
✅ pnpm check      → OK
✅ pnpm type-check → OK (329 erreurs connues)
✅ pnpm build      → OK (31s)
✅ pnpm test       → 47/47 tests passés

Phase 2 : Tests exhaustifs
✅ pnpm test:coverage → 78% coverage (✅ > 70%)
   Statements   : 78.5% (seuil 70%)
   Branches     : 72.3% (seuil 65%)
   Functions    : 81.2% (seuil 70%)
   Lines        : 79.1% (seuil 70%)
✅ pnpm test:e2e → 12/12 tests E2E passés (3m 24s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Projet prêt pour DEPLOY PRODUCTION
```

### Si échec

```
❌ VÉRIFICATION COMPLÈTE ÉCHOUÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 : ✅ OK

Phase 2 : Tests exhaustifs
❌ pnpm test:coverage → 62% coverage (❌ < 70%)

   Fichiers non couverts :
   - src/hooks/useRecompenses.ts (45%)
   - src/components/recompenses/RecompensesEdition.tsx (38%)

   🔍 Recommandation : Ajouter tests unitaires pour ces fichiers

✅ pnpm test:e2e → OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Corriger coverage avant deploy
```

Priorité : Qualité maximale > Tout. Aucun compromis avant production.
