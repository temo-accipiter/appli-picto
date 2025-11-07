# Prochaines Étapes - Mobile-First Migration

## État Actuel ✅

Après le merge de `audit/mobile-first` dans `main` :

- ✅ **Breakpoints SCSS corrigés** - Les guillemets ont été retirés, toutes les media queries fonctionnent maintenant
- ✅ **Mixin dupliqué supprimé** - Un seul `respond-to` mobile-first existe maintenant
- ✅ **Build production réussit** - `yarn build` termine sans erreurs
- ✅ **Lint/format passent** - `yarn check` ne remonte qu'1 warning non-bloquant
- ✅ **Système de reload** - Navigation Edition → Tableau recharge les tâches
- ✅ **Fix event propagation** - Les checkboxes fonctionnent avec dnd-kit
- ✅ **Fix className** - Drag & drop actif avec bon curseur

## Fichiers Modifiés Non Commités

```bash
M src/components/features/legal/legal-markdown/LegalMarkdown.jsx
M src/components/features/legal/legal-markdown/LegalMarkdown.scss
M src/components/features/taches/taches-dnd/TachesDnd.jsx
M src/hooks/useFallbackData.js
M src/hooks/useTachesDnd.js
M src/hooks/useTachesEdition.js
M src/pages/tableau/Tableau.jsx
M src/utils/consent.js
```

## Tests Manuels Recommandés AVANT de Continuer

### Test 1 : Navigation et Tâches

1. Se connecter avec un compte test
2. Aller sur `/edition`
3. Créer 3 tâches et les cocher "Aujourd'hui"
4. Aller sur `/tableau`
5. ✅ Vérifier que les 3 tâches apparaissent
6. Cocher une tâche
7. ✅ Vérifier que la checkbox se coche
8. Drag & drop une tâche
9. ✅ Vérifier que le drag fonctionne (curseur grab)
10. Retourner sur `/edition`, décocher une tâche "Aujourd'hui"
11. Retourner sur `/tableau`
12. ✅ Vérifier que la tâche décochée n'apparaît plus

### Test 2 : Train de Progression

1. Sur `/tableau` avec tâches cochées "Aujourd'hui"
2. Aller sur `/edition` → Personnalisation
3. Activer le train
4. Retourner sur `/tableau`
5. ✅ Vérifier que le train est visible
6. Cocher des tâches
7. ✅ Vérifier que le train se déplace

### Test 3 : Responsive Mobile-First

1. Ouvrir DevTools
2. Passer en mode responsive
3. Tester 320px, 375px, 576px, 768px, 992px, 1200px
4. ✅ Vérifier que tous les composants s'adaptent correctement
5. ✅ Vérifier particulièrement :
   - Navbar (menu mobile)
   - Cards (taille adaptative)
   - Train (taille adaptative)
   - Edition (layout adaptatif)

### Test 4 : Build Production

1. `yarn build` ✅ DÉJÀ FAIT
2. `yarn preview`
3. Tester les mêmes scénarios que ci-dessus
4. ✅ Vérifier que tout fonctionne en production

## Prochaines Étapes Recommandées

### Option A : Continuer la Migration Mobile-First (Recommandé)

Si les tests manuels sont OK, continuer la migration composant par composant :

#### Phase 1 : Composants Restants (6h)

**1. Navbar (1h30)**

- Migrer tous les `respond-to(xs)` vers mobile-first
- Tester menu mobile 320px → 768px
- Commit

**2. Edition Layout (2h)**

- Migrer grids et flexbox
- Tester formulaires sur mobile
- Commit

**3. Modals (1h)**

- Migrer tous les modals vers mobile-first
- Tester sur petits écrans
- Commit

**4. Autres composants (1h30)**

- Footer, UserMenu, etc.
- Tester responsive complet
- Commit

#### Phase 2 : Tests Automatisés (4h)

**Playwright + axe-core**

- Installer `@axe-core/playwright`
- Créer tests a11y automatisés
- Créer tests responsive (viewports multiples)
- Intégrer dans CI/CD

#### Phase 3 : Optimisations (2h)

- Code splitting (dynamic imports)
- Lazy loading des images
- Optimiser bundle size

**Total estimé: ~12h**

### Option B : Corriger les Bugs Actuels d'Abord

Si les tests révèlent des problèmes :

1. **Documenter les bugs** dans un fichier BUGS.md
2. **Prioriser** : critique, majeur, mineur
3. **Fixer un par un** avec test après chaque
4. **Commit atomique** pour chaque fix
5. Reprendre Option A quand tout fonctionne

### Option C : Tests de Charge et Performance

Avant de continuer, tester :

- Lighthouse score (Performance, A11y, Best Practices, SEO)
- WebPageTest
- Bundle analyzer (visualize bundle size)

## Commandes Utiles

```bash
# Linter + formatter
yarn check

# Build production
yarn build

# Preview production
yarn preview

# Tests unitaires
yarn test

# Tests E2E (si configurés)
yarn test:e2e

# Stats bundle
yarn stats

# Update schema Supabase + types TypeScript
yarn context:update
```

## Structure de Commit Recommandée

Si vous décidez de commiter les changements actuels :

```bash
git add -A
git commit -m "chore: merge audit/mobile-first - mobile-first foundation

- Fix SCSS breakpoints (remove quotes)
- Remove duplicate respond-to mixin
- Add reload mechanism for Edition → Tableau sync
- Fix checkbox event propagation with dnd-kit
- Fix TableauCard className for drag & drop
- Add console logging for debug

BREAKING CHANGE: None
TESTED: yarn build ✅ | yarn check ✅ (1 warning)
TODO: Manual testing required before production deploy"
```

Ou si vous préférez un commit plus simple :

```bash
git add -A
git commit -m "chore: merge audit/mobile-first branch

Merge improvements from audit/mobile-first including SCSS fixes,
reload mechanism, and mobile-first responsive enhancements."
```

## Documentation Créée

- [ANALYSIS-MOBILE-FIRST.md](ANALYSIS-MOBILE-FIRST.md) - Analyse complète des changements
- [RESET-MOBILE-FIRST.md](RESET-MOBILE-FIRST.md) - Plan de reset initial (obsolète)
- [DEBUG-TACHES-VISIBLES.md](DEBUG-TACHES-VISIBLES.md) - Guide debug synchronisation
- Ce fichier - Prochaines étapes

## Notes Importantes

### Bugs Connus Non Bloquants

1. **Variable `t` non utilisée** dans src/pages/legal/CGU.jsx (warning ESLint)
2. **Dépendances circulaires** useToast (warnings Vite, non-bloquants)
3. **Bundle size** > 1MB (à optimiser plus tard)

### Points d'Attention

- **Synchronisation Edition ↔ Tableau** : Le système de reload fonctionne MAIS nécessite une navigation. Si l'utilisateur modifie dans Edition puis clique sur "Tableau" dans la navbar, le reload se déclenche. Cependant, si l'utilisateur reste sur la même page, pas de reload automatique.

- **Alternative Supabase Realtime** : Pour une synchronisation temps réel sans navigation, il faudrait implémenter Supabase Realtime subscriptions. C'est une feature plus avancée qui peut être ajoutée plus tard si nécessaire.

## Décision à Prendre

Quelle option choisissez-vous ?

**A.** Continuer la migration mobile-first (composants restants)
**B.** Tests manuels complets d'abord
**C.** Corriger les bugs identifiés
**D.** Commit et déployer l'état actuel

Recommandation : **B puis A** (tester d'abord, puis continuer si OK)
