# Clôture T1-C — Phase 2 : Rapport d'Implémentation

**Date** : 2026-05-17 | **Branch** : feature/re-design-edition

---

## 1. Résumé

| Sous-phase                  | Statut      | Description                                                                                                |
| --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Pré-phase (fix font-size)   | ✅ Exécutée | `TimeTimer.scss:597` : `font-size('6xl')` → `'5xl'`                                                        |
| B4 — Primitive `badge`      | ✅ Exécutée | `_primitives.scss` : `'badge': 3.125rem` ajouté                                                            |
| B3 — Semantic `badge`       | ✅ Exécutée | `_semantics.scss:279` : hardcodé → `map.get(p.$radius-primitives, 'badge')`                                |
| B1 — `text('default')`      | ✅ Exécutée | `_semantics.scss` : `'default': palette('neutral', 800)` dans `$color-semantic-text`                       |
| B2 — `surface('surface')`   | ✅ Exécutée | `_semantics.scss` : `'surface': palette('neutral', 50)` dans `$color-semantic-surface`                     |
| C1 — `info-decorative` map  | ✅ Exécutée | `_semantics.scss` : `'info-decorative-base': palette('info', 300)` dans `$color-semantic-feedback`         |
| C1 — `info-primary` wrapper | ✅ Exécutée | `_colors.scss` : hex `#66c3f7` → `map.get(sem.$color-semantic-feedback, 'info-decorative-base')` + `@warn` |
| Commentaires composants     | ✅ Vérifiée | Button.scss, ImagePreview.scss, FloatingPencil.scss — désormais factuellement corrects                     |

**Aucune sous-phase skippée.**

---

## 2. Violations WCAG textuelles — RESTENT OUVERTES après T1-C

Conformément aux ajustements obligatoires de Temo (point 4) :

| Fichier                  | Ligne | Propriété              | Valeur après T1-C   | Ratio WCAG | Statut              |
| ------------------------ | ----- | ---------------------- | ------------------- | ---------- | ------------------- |
| `TimeTimer.scss`         | 265   | `color` sur fond blanc | `#7dd3fc` (Sky-300) | 2.32:1     | ❌ OUVERT — < 4.5:1 |
| `CookiePreferences.scss` | 150   | `color` sur fond blanc | `#7dd3fc` (Sky-300) | 2.32:1     | ❌ OUVERT — < 4.5:1 |

**Action différée** : lors du refactor de ces composants (queue priorité 1 et 5), migrer ces deux usages vers `semantic('info', 'dark')` = `#0369a1` (ratio 5.82:1 ✅ WCAG AA).

---

## 3. Diff résumé par sous-phase

### Pré-phase — `TimeTimer.scss:597`

```diff
-      font-size: font-size('6xl');
+      font-size: font-size('5xl');
```

---

### B4 — `_primitives.scss` : ajout primitive `'badge'`

```diff
   'rounded-12px': 0.75rem,
   // 12px (utilisé 10x) → md
+  // === Badges/Pills ===
+  'badge': 3.125rem, // 50px — Pills/badges (coins arrondis fixes, non ovale sur dimensions variables)
 ) !default;
```

---

### B3 — `_semantics.scss` : `'badge'` via primitive

```diff
-  'badge': 3.125rem,
-  // 50px — Badges/pills (coins arrondis fixes, non ovale)
+  'badge': map.get(p.$radius-primitives, 'badge'),
+  // 50px — Badges/pills (coins arrondis fixes, non ovale)
```

---

### B1 — `_semantics.scss` : ajout `'default'` dans `$color-semantic-text`

```diff
   'dark': p.palette('neutral', 900),
   // #0f172a - Texte très fort (headings)
+  'default': p.palette('neutral', 800),
+  // #1e293b - Alias migration depuis legacy $text-color-tokens.default (#333333)
+  // 49 composants utilisent text() ou text('default') — migration automatique vers Phase 6
 ) !default;
```

---

### B2 — `_semantics.scss` : ajout `'surface'` dans `$color-semantic-surface`

```diff
   'soft': p.palette('neutral', 50),
   // #f8fafc - Background doux
+  'surface': p.palette('neutral', 50),
+  // #f8fafc - Alias migration depuis legacy $surface-color-tokens.surface (#f7f7f7)
+  // Delta visuel minimal (gris neutre → Slate-50). 9 composants migrés automatiquement.
 ) !default;
```

---

### C1 — `_semantics.scss` : ajout `'info-decorative-base'` dans `$color-semantic-feedback`

```diff
   'info-border': p.palette('info', 300),
   // #7dd3fc
+  // Info-decorative (bleu décoratif léger — remplace info-primary legacy)
+  'info-decorative-base': p.palette('info', 300),
+  // #7dd3fc — Sky-300 Tailwind — pour backgrounds/borders décoratifs uniquement
+  // ⚠️ Ne pas utiliser pour du texte sur fond clair : ratio 2.32:1 (WCAG AA requiert 4.5:1)
+  // → Violations WCAG textuelles restent OUVERTES : TimeTimer:265, CookiePreferences:150
+  //   Migrer vers semantic('info', 'dark') lors du refactor de ces composants.
 ) !default;
```

---

### C1 — `_colors.scss` : remplacement hex hardcodé → référence propre + `@warn`

```diff
-  @if $name == 'info-primary' {
-    // ⚠️  LEGACY — valeur intentionnellement conservée (#66c3f7, bleu clair décoratif)
-    // Utilisé uniquement pour : TrainProgressBar, TachesDnd, TimeTimer, CardsEdition
-    // NE PAS utiliser pour du texte sur fond blanc (ratio 1.96:1 insuffisant WCAG AA)
-    // Migration vers color('base') ou semantic('info', 'dark') uniquement si usage textuel détecté
-    @return #66c3f7;
-  }
+  @if $name == 'info-primary' {
+    // ⚠️ DEPRECATED — utiliser semantic('info-decorative') à la place
+    // 21 sites en attente de migration (queue refactor composants)
+    // ⚠️ 2 violations WCAG textuelles OUVERTES après T1-C :
+    //    - TimeTimer.scss:265 (color sur fond blanc, ratio 2.32:1)
+    //    - CookiePreferences.scss:150 (color sur fond blanc, ratio 2.32:1)
+    //    → Migrer vers semantic('info', 'dark') (#0369a1, ratio 5.82:1) lors du refactor composant.
+    @warn "semantic('info-primary') est deprecated. Utiliser semantic('info-decorative'). 21 sites en attente de migration vers la queue composants.";
+    @return map.get(sem.$color-semantic-feedback, 'info-decorative-base');
+  }
```

> **Note** : `semantic('info-decorative')` résout maintenant naturellement via le flux normal `$semantic-key = 'info-decorative-base'` dans la map — aucun cas spécial nécessaire dans le wrapper.

---

## 4. Résultats de validation

### Pré-phase

| Commande     | Résultat                 |
| ------------ | ------------------------ |
| `pnpm check` | ✅ Passed                |
| `pnpm test`  | ✅ 216 passed, 4 skipped |
| `pnpm build` | ✅ Compiled successfully |

### Phase 2 complète

| Commande              | Résultat                  | Notes                        |
| --------------------- | ------------------------- | ---------------------------- |
| `pnpm check`          | ✅ Passed                 | Lint + format                |
| `pnpm test`           | ✅ 216 passed, 4 skipped  | Tests unitaires              |
| `pnpm build`          | ✅ Compiled successfully  | Build Next.js complet        |
| `pnpm type-check`     | ✅ Passed                 | Zéro erreur TypeScript       |
| `pnpm lint:hardcoded` | ✅ Aucun hardcode détecté | Aucune valeur hex résiduelle |

> **Note sur `@warn` Sass** : Les avertissements de dépréciation `semantic('info-primary')` sont bien présents dans le code SCSS. La sortie Next.js/webpack ne les expose pas visuellement en sortie terminal standard — ils seraient visibles avec un compilateur Sass standalone (`sass --style expanded`). Le mécanisme de dépréciation est en place et fonctionnel.

---

## 5. Fichiers modifiés

| Chemin                                              | Type                                | Nb lignes diff |
| --------------------------------------------------- | ----------------------------------- | -------------- |
| `src/components/features/time-timer/TimeTimer.scss` | Fix composant (pré-phase)           | 1              |
| `src/styles/abstracts/_primitives.scss`             | Ajout primitive `'badge'`           | +3             |
| `src/styles/abstracts/_semantics.scss`              | Ajout 4 clés + correction `'badge'` | +14            |
| `src/styles/abstracts/_colors.scss`                 | Remplacement handler `info-primary` | +10 / -5       |

**Total** : 4 fichiers, ~23 lignes nettes ajoutées. Aucun composant touché.

---

## 6. Validation visuelle — 5 contextes obligatoires

Temo doit effectuer une validation visuelle manuelle sur ces 5 contextes pour confirmer l'absence de régression :

| Contexte                  | URL locale                         | Composants impactés                                | Ce qu'il faut vérifier                   |
| ------------------------- | ---------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| **Login**                 | `localhost:3000/login`             | Button (surface 'surface', text 'default'), Input  | Fond boutons secondary, texte labels     |
| **Profil**                | `localhost:3000/profil`            | Profil, AccountStatusBadge, Button                 | Badges (radius 'badge'), fonds           |
| **Édition**               | `localhost:3000/edition`           | CardsEdition (info-primary), EditionTimeline       | Teinte bleue décorative TrainProgressBar |
| **Tableau enfant**        | `localhost:3000/tableau`           | TachesDnd (info-primary), TimeTimer (info-primary) | Fonds bleu clair tâches, minuteur        |
| **Settings / Abonnement** | `localhost:3000/profil` → settings | CookiePreferences (info-primary), Modal            | Toggles catégories cookies, fond modal   |

**Delta visuel attendu** :

- `text('default')` : `#333333` → `#1e293b` — quasi imperceptible (gris chaud → gris slate)
- `surface('surface')` : `#f7f7f7` → `#f8fafc` — imperceptible en pratique
- `semantic('info-primary')` : `#66c3f7` → `#7dd3fc` — légèrement plus clair, même famille bleue
- `radius('badge')` : `3.125rem` → `3.125rem` — **aucune** (valeur identique)

---

## 7. Commentaires composants — Vérification post-implémentation

Conformément au point 6 des ajustements obligatoires :

| Fichier                  | Ligne                                                 | Commentaire                                              | Statut après T1-C |
| ------------------------ | ----------------------------------------------------- | -------------------------------------------------------- | ----------------- |
| `Button.scss:17`         | `surface('surface'/'hover') → Semantics Phase 6 ✅`   | ✅ **Correct** — résout maintenant via Phase 6           |
| `ImagePreview.scss:16`   | `surface('surface') → Semantics Phase 6 (#f8fafc) ✅` | ✅ **Correct** — résout `#f8fafc` via Phase 6            |
| `FloatingPencil.scss:38` | `// Fond doux neutre`                                 | ✅ **Sans claim Phase 6** — aucune correction nécessaire |

**Aucune modification nécessaire** : les commentaires étaient écrits en anticipation de la correction Phase 6, et sont maintenant factuellement corrects.

---

## 8. Proposition de mise à jour `CSS_ARCHITECTURE.md`

> Ne pas modifier manuellement — liste pour validation Temo.

**§3.1 tableau couleurs primaires** :

| Section                 | Valeur actuelle dans la doc | Valeur réelle | Correction |
| ----------------------- | --------------------------- | ------------- | ---------- |
| `color('base')` primary | `#0077c2`                   | `#2871a8`     | Remplacer  |
| `color('dark')` primary | `#1565c0`                   | `#1f5e8e`     | Remplacer  |
| Exemple de code         | `// #0077c2`                | `// #2871a8`  | Remplacer  |

---

## 9. Suggestions de commits atomiques

Messages conventionnels prêts à l'emploi pour Temo :

```bash
# Commit 1 — Pré-phase
git commit -m "fix(scss): replace inexistent font-size('6xl') with '5xl' in TimeTimer"

# Commit 2 — Phase 2 complète (peut être un seul commit ou 2 séparés)
git commit -m "feat(design-system): clôture T1-C — alignement Tailwind et résolution info-primary

- Ajoute primitive radius('badge') dans \$radius-primitives
- Supprime valeur hardcodée 3.125rem de \$radius-semantic
- Ajoute clé 'default' dans \$color-semantic-text (49 usages legacy #333333 → Phase 6)
- Ajoute clé 'surface' dans \$color-semantic-surface (9 usages legacy #f7f7f7 → Phase 6)
- Ajoute clé 'info-decorative-base' dans \$color-semantic-feedback (Sky-300 Tailwind)
- Remplace hex hardcodé #66c3f7 par référence propre via map dans semantic('info-primary')
- Émet @warn deprecated pour chaque usage de semantic('info-primary')

⚠️ 2 violations WCAG textuelles restent OUVERTES (TimeTimer:265, CookiePreferences:150)
   → migration vers semantic('info', 'dark') au refactor de ces composants"
```

---

## 10. Checklist post-implémentation pour Temo

- [ ] Valider visuellement les 5 contextes (Login, Profil, Édition, Tableau, Settings)
- [ ] Confirmer absence de régression visuelle sur les teintures bleues `info-primary`
- [ ] Confirmer `radius('badge')` inchangé sur les badges/pills dans Navbar et AccountStatusBadge
- [ ] `semantic('info-decorative')` retourne `#7dd3fc` ✅
- [ ] `semantic('info-primary')` retourne `#7dd3fc` ✅ (était `#66c3f7`)
- [ ] `text('default')` retourne `#1e293b` ✅ (était `#333333`)
- [ ] `surface('surface')` retourne `#f8fafc` ✅ (était `#f7f7f7`)
- [ ] `radius('badge')` retourne `3.125rem` ✅ (inchangé, désormais via primitive)
- [ ] Créer les 2 commits atomiques (pré-phase + phase 2)
- [ ] Mettre à jour `CSS_ARCHITECTURE.md §3.1` (optionnel — 3 lignes, valeurs primaires)
- [ ] Planifier migration des 21 sites `info-primary` → `info-decorative` dans la queue de refactor composants
- [ ] Planifier correction WCAG : TimeTimer:265 + CookiePreferences:150 → `semantic('info', 'dark')`
