# Vérification Pré-Suppression — Commit A

**Date** : 2026-04-17
**Basé sur** : `docs/refonte_front/audit-tokens-phase-0.md`
**Périmètre** : Read-only — grep exhaustif sur `src/` et `src/styles/`
**Objectif** : Confirmer qu'aucun usage résiduel ne bloque la suppression du dead code

---

## ⚠️ CORRECTION DE L'AUDIT PHASE 0

> **Item 4 de l'audit initial (Conflits Primary) contenait une erreur.**
>
> `$primary-color-tokens` avait été classé "orphelin". C'est faux.
> La fonction `color()` dans `_colors.scss` utilise ce map comme données par défaut
> (ligne 55 : `$map: $primary-color-tokens;`). Les appels `color('base')`,
> `color('dark')`, `color('light')` qui prolifèrent dans le codebase lisent
> tous depuis `$primary-color-tokens`. Ce token est **activement utilisé**.

---

## 1. `$primary-color-tokens`

### Accès directs (nommage "primary")

| Pattern grep                          | Résultat      |
| ------------------------------------- | ------------- |
| `color('primary')`                    | **0 fichier** |
| `color('primary-light')`              | **0 fichier** |
| `color('primary-dark')`               | **0 fichier** |
| `map.get($primary-color-tokens, ...)` | **0 fichier** |

### Accès indirects via `color()` (clés des valeurs dans le map)

La fonction `color($key, $type: 'primary')` lit `$primary-color-tokens` par défaut.
Les trois clés du map (`base`, `light`, `dark`) sont donc accessibles via `color('base')` etc.

| Pattern          | Fichiers         | Occurrences                                               |
| ---------------- | ---------------- | --------------------------------------------------------- |
| `color('base')`  | **70+ fichiers** | Très élevé (ex: Navbar.scss, Button.scss, Checkbox.scss…) |
| `color('dark')`  | **12 fichiers**  | Login.scss, ResetPassword.scss, Navbar.scss…              |
| `color('light')` | **2 fichiers**   | AvatarProfil.scss, ChildProfileSelector.scss              |

### Conclusion

**🔴 NOT SAFE TO DELETE** — `$primary-color-tokens` est la source de données active
de la fonction `color()`, qui est l'un des tokens les plus utilisés du codebase.
Supprimer ce map casserait l'ensemble des appels `color('base')`, `color('dark')`, `color('light')`.

**Correction à apporter à l'audit-tokens-phase-0.md** :

> Item 3 (Conflits Primary) : remplacer "orpheline" par "active via color()".
> Ce token ne doit pas figurer dans le périmètre du commit A.

---

## 2. `$admin-ui-color-tokens`

### Grep exhaustif

| Pattern grep                           | Résultat                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `admin-ui(` (appel fonction)           | **1 fichier** : `_colors.scss:326` — c'est la **définition** de la fonction, pas un appel |
| `map.get($admin-ui-color-tokens, ...)` | **1 fichier** : `_colors.scss:329` — corps de la fonction wrapper                         |
| `$admin-ui-color-tokens`               | `_tokens.scss` (définition) + `_colors.scss` (wrapper) uniquement                         |

Aucun composant, page ou abstrait (autre que le wrapper lui-même) n'appelle `admin-ui(...)`.

### Conclusion

**✅ SAFE TO DELETE** — Map + fonction wrapper constituent un îlot fermé.
Deux suppressions à effectuer en bloc :

1. `$admin-ui-color-tokens` dans `_tokens.scss` (lignes 457–489)
2. Fonction `admin-ui($key)` dans `_colors.scss` (à localiser précisément avant commit)

---

## 3. `$size-tokens` — Clés uniques à la 2ème définition (morte)

Rappel : la 2ème définition de `$size-tokens` (lignes ~1368–1474) est ignorée par SASS
car la 1ère (sans `!default`) verrouille la variable. Les clés suivantes ne sont donc
jamais accessibles même si elles sont correctement nommées.

| Clé (2ème définition)    | Valeur | `size('...')` dans `src/` | Verdict |
| ------------------------ | ------ | ------------------------- | ------- |
| `'icon-2xl'`             | 40px   | **0 fichier**             | ✅ SAFE |
| `'input-height-base'`    | 44px   | **0 fichier**             | ✅ SAFE |
| `'navbar-height'`        | 64px   | **0 fichier**             | ✅ SAFE |
| `'navbar-height-mobile'` | 56px   | **0 fichier**             | ✅ SAFE |
| `'modal-min-height'`     | 200px  | **0 fichier**             | ✅ SAFE |

### Conclusion

**✅ SAFE TO DELETE** — La 2ème définition complète (lignes ~1368–1474) peut être supprimée.
Aucun appel ne pointe vers ses clés uniques.

**Attention lors du commit** : vérifier que les clés _partagées_ entre les deux définitions
(ex: `'touch-target-min'`, `'modal-width-md'`, etc.) restent couvertes par la 1ère définition.
Pas de risque fonctionnel, mais à confirmer visuellement.

---

## 4. `$font-size-tokens` — Clés DEPRECATED

Les 6 clés marquées `// DEPRECATED` aux lignes 1007–1019 de `_tokens.scss`.

| Clé deprecated | Pattern grep         | Résultat      | Équivalent recommandé        |
| -------------- | -------------------- | ------------- | ---------------------------- |
| `'0-75'`       | `font-size('0-75')`  | **0 fichier** | `font-size('xs')` (0.75rem)  |
| `'0-875'`      | `font-size('0-875')` | **0 fichier** | `font-size('sm')` (0.875rem) |
| `'0-9'`        | `font-size('0-9')`   | **0 fichier** | _(hors échelle Option B)_    |
| `'0-95'`       | `font-size('0-95')`  | **0 fichier** | _(hors échelle Option B)_    |
| `'1-125'`      | `font-size('1-125')` | **0 fichier** | `font-size('lg')` (1.125rem) |
| `'1-5'`        | `font-size('1-5')`   | **0 fichier** | `font-size('2xl')` (1.5rem)  |

Test supplémentaire (patterns génériques) :

- `font-size('0-` → **0 fichier**
- `font-size('1-` → **0 fichier**

### Conclusion

**✅ SAFE TO DELETE** — Zéro usage dans l'ensemble de `src/`. Dead code de rétrocompatibilité.

---

## 5. `$radius-tokens` — Clés `'rounded-Npx'`

Inventaire des 10 clés explicites (`rounded-2px` → `rounded-24px`) avec résultat grep et
qualification pour le commit B.

| Clé              | Valeur | Usages trouvés   | Alias sémantique existant                        | Verdict              |
| ---------------- | ------ | ---------------- | ------------------------------------------------ | -------------------- |
| `'rounded-2px'`  | 2px    | **0 fichier**    | `'xs'` (2px) ✅                                  | ✅ SAFE              |
| `'rounded-4px'`  | 4px    | **0 fichier**    | `'sm'` (4px) ✅                                  | ✅ SAFE              |
| `'rounded-6px'`  | 6px    | **2 usages**     | ❌ Aucun alias 6px                               | ⚠️ REDIRECT REQUIRED |
| `'rounded-8px'`  | 8px    | 0 usages réels\* | `'md'` / `'default'` / `'button'` / `'input'` ✅ | ✅ SAFE              |
| `'rounded-10px'` | 10px   | **4 usages**     | ❌ Aucun alias 10px                              | ⚠️ REDIRECT REQUIRED |
| `'rounded-12px'` | 12px   | **14 usages**    | ❌ Aucun alias 12px                              | ⚠️ REDIRECT REQUIRED |
| `'rounded-14px'` | 14px   | **0 fichier**    | ❌ Aucun alias 14px                              | ✅ SAFE (0 usage)    |
| `'rounded-16px'` | 16px   | **0 fichier**    | `'lg'` / `'card'` / `'modal'` / `'drawer'` ✅    | ✅ SAFE              |
| `'rounded-20px'` | 20px   | **0 fichier**    | `'xl'` (20px) ✅                                 | ✅ SAFE              |
| `'rounded-24px'` | 24px   | **1 usage**      | `'2xl'` (24px) ✅                                | ⚠️ REDIRECT REQUIRED |

\*`rounded-8px` apparaît dans `_radius.scss:50` à l'intérieur d'un commentaire `///` — pas un appel réel.

### Détail des usages à rediriger

**`rounded-6px`** (2 usages → pas d'alias existant) :

```
src/components/shared/demo-signed-image/DemoSignedImage.scss:92
src/components/shared/demo-signed-image/DemoSignedImage.scss:97
```

→ Aucun alias 6px dans `$radius-tokens`. Option : ajouter `'sm-plus': 6px` ou garder `'rounded-6px'`.

**`rounded-10px`** (4 usages → pas d'alias existant) :

```
src/page-components/login/Login.scss:136
src/page-components/login/Login.scss:203
src/page-components/legal/rgpd/PortailRGPD.scss:75
src/components/features/settings/DeleteAccountGuard.scss:56
```

→ Aucun alias 10px. Option : ajouter `'md-minus': 10px` ou garder `'rounded-10px'`.

**`rounded-12px`** (14 usages → pas d'alias existant, fichier le plus impacté) :

```
src/page-components/login/Login.scss
src/page-components/legal/rgpd/PortailRGPD.scss
src/page-components/abonnement/Abonnement.scss (×4)
src/page-components/admin/logs/Logs.scss (×2)
src/page-components/admin/permissions/Permissions.scss
src/page-components/admin/metrics/Metrics.scss (×2)
src/components/features/consent/CookiePreferences.scss (×3)
```

→ Aucun alias 12px. Option : ajouter `'md-plus': 12px` ou garder `'rounded-12px'`.

**`rounded-24px`** (1 usage → alias `'2xl'` disponible) :

```
src/page-components/login/Login.scss:30
```

→ Redirection directe : `radius('rounded-24px')` → `radius('2xl')`. **Commit B possible immédiatement.**

### Conclusion générale section 5

**Commit B — Suppression immédiate possible** (0 usage, alias existant) :
`'rounded-2px'`, `'rounded-4px'`, `'rounded-8px'`, `'rounded-14px'`, `'rounded-16px'`, `'rounded-20px'`

**Commit B — Redirection simple avant suppression** (alias existant) :

- `'rounded-24px'` → 1 fichier à mettre à jour (`radius('2xl')`)

**Commit B — Décision requise avant suppression** (alias inexistant) :

- `'rounded-6px'` (2 fichiers), `'rounded-10px'` (4 fichiers), `'rounded-12px'` (14 fichiers)
  → Choisir entre : **garder les clés** ou **ajouter des alias sémantiques** (ex: `'sm-plus': 6px`, `'md-minus': 10px`, `'md-plus': 12px`)

---

## Tableau de synthèse

| Token                       | Verdict                          | Action commit A             | Fichiers impactés |
| --------------------------- | -------------------------------- | --------------------------- | ----------------- |
| `$primary-color-tokens`     | 🔴 ACTIVE (correction audit)     | **Ne pas toucher**          | 70+ via `color()` |
| `$admin-ui-color-tokens`    | ✅ SAFE TO DELETE                | Supprimer map + wrapper     | 0 composant       |
| `$size-tokens` 2ème déf.    | ✅ SAFE TO DELETE                | Supprimer lignes ~1368–1474 | 0 composant       |
| Font-size deprecated (×6)   | ✅ SAFE TO DELETE                | Supprimer lignes 1007–1019  | 0 composant       |
| `rounded-Npx` (×6 inactifs) | ✅ SAFE (commit B)               | Planifier commit B          | 0 composant       |
| `rounded-24px`              | ⚠️ REDIRECT 1 fichier (commit B) | Rediriger Login.scss        | 1 fichier         |
| `rounded-6px`               | ⚠️ DÉCISION REQUISE (commit B)   | Choix alias ou conservation | 2 fichiers        |
| `rounded-10px`              | ⚠️ DÉCISION REQUISE (commit B)   | Choix alias ou conservation | 4 fichiers        |
| `rounded-12px`              | ⚠️ DÉCISION REQUISE (commit B)   | Choix alias ou conservation | 14 fichiers       |

---

## Périmètre recommandé pour le commit A

Les suppressions sans risque ni redirection préalable :

1. **`$admin-ui-color-tokens`** dans `_tokens.scss` (lignes ~457–489)
2. **Fonction `admin-ui($key)`** dans `_colors.scss` (wrapper orphelin)
3. **2ème définition `$size-tokens`** dans `_tokens.scss` (lignes ~1368–1474)
4. **6 clés deprecated** dans `$font-size-tokens` (lignes ~1007–1019)

**Hors périmètre commit A** :

- `$primary-color-tokens` → actif, ne pas toucher
- Clés `'rounded-Npx'` → commit B séparé après décision sur les alias manquants

---

_Rapport généré en mode read-only. Aucune modification de code effectuée._
