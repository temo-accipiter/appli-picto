# Analyse de la Branche audit/mobile-first

## État Actuel

- **Branche actuelle**: `main` (commit 139eb08)
- **Branche abandonnée**: `audit/mobile-first` (sauvegardée comme `audit/mobile-first-BACKUP`)
- **Raison de l'abandon**: Trop de bugs introduits simultanément, difficultés de synchronisation persistantes

## Bugs Critiques Identifiés sur main

### 1. Breakpoints SCSS avec Guillemets (CRITIQUE)

**Fichier**: [src/styles/abstracts/\_variables.scss](src/styles/abstracts/_variables.scss#L79-L82)

```scss
// ACTUEL (CASSÉ)
$breakpoint-sm: '576px'; // ❌ Les guillemets rendent TOUTES les media queries invalides
$breakpoint-md: '768px';
$breakpoint-lg: '992px';
$breakpoint-xl: '1200px';
```

**Impact**: Toutes les media queries responsive ne fonctionnent pas. Le CSS généré est invalide :

```scss
@media (min-width: '576px') { ... } // ❌ INVALIDE
```

**Fix appliqué dans audit/mobile-first**:

```scss
// CORRIGÉ
$breakpoint-sm: 576px; // ✅ Sans guillemets
$breakpoint-md: 768px;
$breakpoint-lg: 992px;
$breakpoint-xl: 1200px;
```

### 2. Mixin respond-to Dupliqué

**Fichier**: [src/styles/abstracts/\_mixins.scss](src/styles/abstracts/_mixins.scss#L110-L116)

Le mixin `respond-to` est défini DEUX FOIS :

- Lignes 19-37 : Version mobile-first correcte (min-width)
- Lignes 110-116 : Version desktop-first incorrecte (max-width)

**Impact**: Comportement CSS imprévisible, conflits potentiels.

**Fix appliqué dans audit/mobile-first**: Suppression du mixin dupliqué (lignes 110-116).

## Modifications Fonctionnelles Testées dans audit/mobile-first

### 1. Système de Reload Navigation-Based

**Objectif**: Synchroniser les tâches entre Edition et Tableau

**Fichiers modifiés**:

- [src/pages/tableau/Tableau.jsx](src/pages/tableau/Tableau.jsx)
- [src/hooks/useTachesDnd.js](src/hooks/useTachesDnd.js)

**Changements**:

```javascript
// Tableau.jsx
const location = useLocation()
const [reloadKey, setReloadKey] = useState(0)

// Détection de navigation
const prevPathRef = useRef(null)
useEffect(() => {
  const currentPath = location.pathname
  const prevPath = prevPathRef.current

  if (currentPath === '/tableau' && prevPath !== null && prevPath !== '/tableau') {
    console.log('🔄 Reload tableau depuis', prevPath)
    setReloadKey(prev => prev + 1)
  }

  prevPathRef.current = currentPath
}, [location.pathname])

// Passage du reloadKey au hook
const { ... } = useTachesDnd((done, total) => {
  setDoneCount(done)
  setTotalTaches(total)
}, reloadKey)  // ✅ Trigger reload
```

```javascript
// useTachesDnd.js
export default function useTachesDnd(onChange, reload = 0) {
  // ...
  const loadTaches = useCallback(
    async (retryCount = 0) => {
      console.log('🔄 useTachesDnd: Loading tasks with aujourdhui=true')
      // ... fetch logic
    },
    [onChange, user?.id]
  ) // ❌ reload NOT in dependencies

  useEffect(() => {
    loadTaches()
  }, [loadTaches, reload]) // ✅ reload triggers effect
}
```

**Problème rencontré**: Boucle infinie si `reload` est dans les dépendances de `loadTaches`.

### 2. Fix Event Propagation Checkbox

**Objectif**: Permettre le clic sur checkbox sans déclencher le drag

**Fichier**: [src/components/shared/card/tableau-card/TableauCard.jsx](src/components/shared/card/tableau-card/TableauCard.jsx)

**Changements**:

```javascript
// AVANT
<Checkbox
  id={`tache-fait-${tache.id}`}
  checked={done}
  onChange={handleCheck}
  className="tableau-card__checkbox"
  size="md"
/>

// APRÈS
<div onPointerDown={e => e.stopPropagation()}>
  <Checkbox
    id={`tache-fait-${tache.id}`}
    checked={done}
    onChange={handleCheck}
    className="tableau-card__checkbox"
    size="md"
  />
</div>
```

**Résultat**: Les checkboxes répondent aux clics sans interférer avec dnd-kit.

### 3. Fix className Mismatch

**Objectif**: Activer les styles drag & drop

**Fichier**: [src/components/shared/card/tableau-card/TableauCard.jsx](src/components/shared/card/tableau-card/TableauCard.jsx)

**Changement**:

```javascript
// AVANT
className={`card-tache ${done ? 'done' : ''}`}  // ❌ CSS n'existe pas

// APRÈS
className={`tableau-card ${done ? 'done' : ''}`}  // ✅ Match avec SCSS
```

**Résultat**: Le curseur `grab` et les styles de drag fonctionnent.

## Bugs Persistants Non Résolus

Malgré tous les fixes, les problèmes suivants persistaient :

1. **Synchronisation Edition ↔ Tableau**: Les tâches décochées dans Edition restaient visibles dans Tableau
2. **Timing React**: Possibles problèmes de timing entre localStorage, state React, et Supabase
3. **Infinite loops**: Risque élevé avec le système de reload actuel

## Recommandations pour Nouvelle Approche

### Phase 1: Fix SCSS Critique SEULEMENT (1h)

**Objectif**: Réparer les media queries cassées

1. ✅ Retirer les guillemets des breakpoints dans `_variables.scss`
2. ✅ Supprimer le mixin dupliqué dans `_mixins.scss`
3. ✅ Build + vérifier que le responsive fonctionne
4. ✅ Commit immédiatement
5. ⚠️ **NE RIEN TOUCHER D'AUTRE**

### Phase 2: Tests Manuels Complets (30min)

Avant TOUTE autre modification, vérifier :

- [ ] Train visible et se déplace correctement
- [ ] Tâches cochables dans Tableau
- [ ] Drag & drop fonctionne
- [ ] Navigation Edition ↔ Tableau OK
- [ ] Décocher tâche dans Edition fonctionne
- [ ] Responsive design fonctionne sur mobile

**Si UN SEUL test échoue → investiguer AVANT de continuer**

### Phase 3: Mobile-First Incrémental (8h)

**UN composant à la fois, avec test après chaque**

1. **Navbar** (2h)
   - Migrer `respond-to(xs)` → mobile-first
   - Build + test visuel
   - Commit

2. **Cards** (2h)
   - BaseCard, EditionCard, TableauCard
   - Build + test interactions
   - Commit

3. **Tableau** (2h)
   - TrainProgressBar, TachesDnd
   - Build + test complet
   - Commit

4. **Edition** (2h)
   - Buttons, checkboxes
   - Build + test complet
   - Commit

### Phase 4: Synchronisation Edition ↔ Tableau (2h)

**Traiter SÉPARÉMENT en dernier**

**Options** :

1. **Supabase Realtime** (recommandé - propre)
2. Reload manuel avec bouton
3. Storage events
4. Ne rien faire (accepter refresh manuel)

## Leçons Apprises

### ❌ À NE PAS FAIRE

1. Modifier SCSS + JS en même temps
2. Introduire nouveau système (reload) pendant refactor
3. Commits trop gros avec multiples changements
4. Continuer à coder quand un test échoue
5. Mettre `reload` dans les dépendances de `useCallback` si utilisé dans `useEffect`

### ✅ À FAIRE

1. Une modification à la fois
2. Test après chaque commit
3. Commits atomiques et réversibles
4. S'arrêter dès qu'un bug apparaît
5. Documenter les changements au fur et à mesure

## Estimation Nouvelle Approche

- **Phase 1 (critique)**: 1h
- **Phase 2 (tests)**: 30min
- **Phase 3 (mobile-first)**: 8h
- **Phase 4 (sync)**: 2h

**Total: ~12h** (vs 20h+ actuellement passées avec bugs)

## Commandes Git pour Démarrer

```bash
# Vérifier qu'on est bien sur main
git branch --show-current  # Doit afficher "main"

# Créer nouvelle branche propre
git checkout -b refactor/mobile-first-v2

# Démarrer Phase 1
# ... faire SEULEMENT le fix breakpoints SCSS
```

## Fichiers à Modifier en Phase 1

1. [src/styles/abstracts/\_variables.scss](src/styles/abstracts/_variables.scss#L79-L82) - Retirer guillemets
2. [src/styles/abstracts/\_mixins.scss](src/styles/abstracts/_mixins.scss#L110-L116) - Supprimer mixin dupliqué

## État du Build Actuel (main)

```bash
yarn build  # ✅ SUCCÈS
# Warnings:
# - Dépendances circulaires useToast (non-bloquant)
# - Bundle size > 1MB (à optimiser plus tard)
# - Pas d'erreurs SCSS car les quotes sont ignorées (silencieusement cassé)
```

## Fichiers de Documentation Créés

1. [RESET-MOBILE-FIRST.md](RESET-MOBILE-FIRST.md) - Plan de reset complet
2. [DEBUG-TACHES-VISIBLES.md](DEBUG-TACHES-VISIBLES.md) - Guide de débogage synchronisation (sur branche abandonnée)
3. Ce fichier - Analyse complète de la situation

## Prochaine Étape Recommandée

Créer la branche `refactor/mobile-first-v2` et implémenter **UNIQUEMENT** la Phase 1 :

```bash
git checkout -b refactor/mobile-first-v2
```

Puis modifier SEULEMENT les 2 fichiers SCSS mentionnés ci-dessus, build, tester, commit, et STOP.
