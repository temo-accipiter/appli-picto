# 🔄 Plan de Reset - Refactoring Mobile-First

## Décision
Abandonner la branche `audit/mobile-first` actuelle et repartir de zéro avec une approche plus méthodique.

## Raisons
- Trop de bugs introduits simultanément
- Difficile d'isoler les problèmes
- Mécanisme de synchronisation Edition↔Tableau trop complexe
- Mieux vaut une approche incrémentale

## Étapes de Reset

### 1. Sauvegarder le travail utile
```bash
# Créer une branche de sauvegarde
git branch audit/mobile-first-BACKUP
```

### 2. Revenir sur main propre
```bash
git checkout main
git pull origin main
```

### 3. Créer nouvelle branche propre
```bash
git checkout -b refactor/mobile-first-v2
```

## Nouvelle Approche Recommandée

### Phase 1: Fix SCSS Critique SEULEMENT (1h)
**Objectif**: Réparer les media queries cassées

1. Fix breakpoints sans quotes
   ```scss
   $breakpoint-sm: 576px;  // pas '576px'
   ```

2. Supprimer mixin dupliqué

3. **TESTER** : build + vérifier responsive fonctionne

4. **COMMIT** immédiatement

5. **STOP** - ne rien toucher d'autre!

### Phase 2: Test Manuel Complet (30min)
Avant TOUTE autre modification:
- [ ] Train visible et se déplace
- [ ] Tâches cochables dans Tableau
- [ ] Drag & drop fonctionne
- [ ] Navigation Edition ↔ Tableau OK
- [ ] Décocher tâche dans Edition fonctionne

Si UN SEUL test échoue → investiguer AVANT de continuer

### Phase 3: Mobile-First Incrémental (par composant)
**UN composant à la fois, avec test après chaque**

1. Navbar (2h)
   - Migrer respond-to(xs) → mobile-first
   - Build + test visuel
   - Commit

2. Cards (2h)
   - BaseCard, EditionCard, TableauCard
   - Build + test interactions
   - Commit

3. Tableau (2h)
   - TrainProgressBar, TachesDnd
   - Build + test complet
   - Commit

4. Edition (2h)
   - Buttons, checkboxes
   - Build + test complet
   - Commit

### Phase 4: Problème Sync Edition↔Tableau (2h)
**Traiter SÉPARÉMENT en dernier**

Options:
1. Supabase Realtime (recommandé - propre)
2. Reload manuel avec bouton
3. Storage events
4. Ne rien faire (accepter refresh manuel)

## Leçons Apprises

❌ **À NE PAS FAIRE**:
- Modifier SCSS + JS en même temps
- Introduire nouveau système (reload) pendant refactor
- Commits trop gros avec multiples changements
- Continuer à coder quand un test échoue

✅ **À FAIRE**:
- Une modification à la fois
- Test après chaque commit
- Commits atomiques et réversibles
- S'arrêter dès qu'un bug apparaît

## Estimation Nouvelle Approche
- Phase 1 (critique): 1h
- Phase 2 (tests): 30min
- Phase 3 (mobile-first): 8h
- Phase 4 (sync): 2h
**Total: ~12h** (vs 20h+ actuellement passées avec bugs)

## Commandes de Reset

```bash
# Sauvegarder
git branch audit/mobile-first-BACKUP

# Retour main
git checkout main

# Nouvelle branche propre
git checkout -b refactor/mobile-first-v2

# Démarrer Phase 1
# ... faire SEULEMENT le fix breakpoints SCSS
```
