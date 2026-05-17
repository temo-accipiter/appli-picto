# FIX T2-F — Audit Phase 1 : Wrapper `size()` + `$size-semantic`

**Date** : 2026-05-17 | **Branche** : `feature/re-design-edition`
**Statut** : 🟡 SEMI-GO — 1 bloqueur à trancher par Temo, puis Phase 2 possible

---

## 1. Résumé exécutif

Le wrapper `size()` ne lit pas `$size-semantic` — c'est un oubli historique identique au bug T2-E. Le pattern de correction (`_spacing.scss`) existe déjà et est calquable directement.

**Collision critique découverte** : `modal-width-lg` diverge entre `$size-tokens` (48rem/768px) et `$size-semantic` (45rem/720px — via `$size-primitives`). 6 consommateurs actifs seraient régressés si la priorité Semantics est activée sans correction préalable.

**Verdict** : GO Phase 2 conditionnel à la décision de Temo sur `modal-width-lg` (§1.3).

Les 2 tokens logo (`logo-auth-sm`, `logo-auth-lg`) sont dans `$size-tokens` — leur relocation vers `$size-semantic` est prête dès que le wrapper est corrigé.

---

## 2. Section 1.1 — Cartographie actuelle du wrapper `size()`

### Fichier : `src/styles/abstracts/_size.scss`

```scss
@use 'sass:map';
@use 'tokens' as *; // ← SEULE map lue (legacy $size-tokens)
// ← $size-semantic : non importée, non utilisée
```

**Chaîne de résolution actuelle :**

```
size($key) → map.has-key($size-tokens, $key) → map.get($size-tokens, $key)
                                             → @error si absent
```

**Aucun fallback**, aucune lecture de `$size-semantic`, aucune lecture de `$size-primitives`.

**Pourquoi `$size-semantic` n'est pas lu :** oubli lors de la migration Phase 5→6. `_spacing.scss` a reçu le traitement multi-couches, `_size.scss` a été laissé sur le pattern simple Phase 5. Aucun commentaire TODO dans le fichier.

### Pattern existant dans `_spacing.scss` (référence à calquer)

```scss
@use 'tokens' as *; // Legacy (fallback)
@use 'semantics' as sem; // Phase 6 priorité
@use 'primitives' as prim; // Phase 6 fallback intermédiaire

$ENABLE_LEGACY_SUPPORT: true !default;

@function spacing($key) {
  @if map.has-key(sem.$spacing-semantic, $key) {
    @return map.get(sem.$spacing-semantic, $key); // 1. Semantics
  } @else if map.has-key(prim.$spacing-primitives, $key) {
    @return map.get(prim.$spacing-primitives, $key); // 2. Primitives
  } @else if $ENABLE_LEGACY_SUPPORT and map.has-key($spacing-tokens, $key) {
    @return map.get($spacing-tokens, $key); // 3. Legacy tokens
  } @else {
    @error "...";
  }
}
```

---

## 3. Section 1.2 — Inventaire `$size-semantic` (20 clés, toutes orphelines du wrapper)

| Clé sémantique         | Via primitive     | Valeur résolue    | Présente dans `$size-tokens` ?               |
| ---------------------- | ----------------- | ----------------- | -------------------------------------------- |
| `'touch-min'`          | `touch-min`       | 2.75rem (44px)    | ❌ Non (tokens a `'touch-target-min'`)       |
| `'touch-optimal'`      | `touch-optimal`   | 3rem (48px)       | ❌ Non (tokens a `'touch-target-optimal'`)   |
| `'touch-preferred'`    | `touch-preferred` | 3.5rem (56px)     | ❌ Non (tokens a `'touch-target-preferred'`) |
| `'button-height'`      | `button-height`   | 2.75rem (44px)    | ❌ Non (tokens a `'button-height-md'`)       |
| `'input-height'`       | `input-height`    | 2.75rem (44px)    | ❌ Non (tokens a `'input-height-lg'`)        |
| `'avatar-sm'`          | `avatar-sm`       | 2rem (32px)       | ✅ Oui — valeur identique                    |
| `'avatar-md'`          | `avatar-md`       | 2.5rem (40px)     | ✅ Oui — valeur identique                    |
| `'avatar-lg'`          | `avatar-lg`       | 3rem (48px)       | ✅ Oui — valeur identique                    |
| `'icon-xs'`            | `icon-xs`         | 0.75rem (12px)    | ✅ Oui — valeur identique                    |
| `'icon-sm'`            | `icon-sm`         | 1rem (16px)       | ✅ Oui — valeur identique                    |
| `'icon-md'`            | `icon-md`         | 1.5rem (24px)     | ✅ Oui — valeur identique                    |
| `'icon-lg'`            | `icon-lg`         | 2rem (32px)       | ✅ Oui — valeur identique                    |
| `'icon-xl'`            | `icon-xl`         | 3rem (48px)       | ✅ Oui — valeur identique                    |
| `'card-min-height'`    | `card-min-height` | 8.75rem (140px)   | ✅ Oui — valeur identique                    |
| `'card-max-width'`     | `card-max-width`  | 25rem (400px)     | ✅ Oui — valeur identique                    |
| `'modal-width-sm'`     | `modal-width-sm`  | 20rem (320px)     | ✅ Oui — valeur identique                    |
| `'modal-width-md'`     | `modal-width-md`  | 33.75rem (540px)  | ✅ Oui — valeur identique                    |
| **`'modal-width-lg'`** | `modal-width-lg`  | **45rem (720px)** | **✅ Oui — 🔴 VALEUR DIVERGENTE**            |
| `'sidebar-width'`      | `sidebar-width`   | 17.5rem (280px)   | ✅ Oui — valeur identique                    |
| `'container-lg'`       | `container-lg`    | 64rem (1024px)    | ✅ Oui — valeur identique                    |

**Aucune de ces 20 clés n'est actuellement accessible via `size()`** — toutes sont orphelines. Une @error build se déclencherait si quelqu'un tentait `size('touch-min')` par exemple.

---

## 4. Section 1.3 — Collisions de clés (CRITIQUE)

**15 clés présentes dans les deux maps.** Résultat de comparaison valeur par valeur :

| Clé                    | `$size-tokens`    | `$size-semantic` (résolue) | Verdict          |
| ---------------------- | ----------------- | -------------------------- | ---------------- |
| `'avatar-lg'`          | 3rem              | 3rem                       | ✅ Identique     |
| `'avatar-md'`          | 2.5rem            | 2.5rem                     | ✅ Identique     |
| `'avatar-sm'`          | 2rem              | 2rem                       | ✅ Identique     |
| `'card-max-width'`     | 25rem             | 25rem                      | ✅ Identique     |
| `'card-min-height'`    | 8.75rem           | 8.75rem                    | ✅ Identique     |
| `'container-lg'`       | 64rem             | 64rem                      | ✅ Identique     |
| `'icon-lg'`            | 2rem              | 2rem                       | ✅ Identique     |
| `'icon-md'`            | 1.5rem            | 1.5rem                     | ✅ Identique     |
| `'icon-sm'`            | 1rem              | 1rem                       | ✅ Identique     |
| `'icon-xl'`            | 3rem              | 3rem                       | ✅ Identique     |
| `'icon-xs'`            | 0.75rem           | 0.75rem                    | ✅ Identique     |
| **`'modal-width-lg'`** | **48rem (768px)** | **45rem (720px)**          | **🔴 DIVERGENT** |
| `'modal-width-md'`     | 33.75rem          | 33.75rem                   | ✅ Identique     |
| `'modal-width-sm'`     | 20rem             | 20rem                      | ✅ Identique     |
| `'sidebar-width'`      | 17.5rem           | 17.5rem                    | ✅ Identique     |

### 🔴 BLOQUEUR — `modal-width-lg` : 48rem vs 45rem

**Origine de la divergence :**

- `$size-primitives['modal-width-lg']` = 45rem (720px) — défini lors de la création des primitives Phase 6
- `$size-tokens['modal-width-lg']` = 48rem (768px) — défini antérieurement en legacy

Ces deux valeurs ont été créées indépendamment et ont divergé de 48px.

**Impact si la priorité Semantics est activée sans correction :**
6 consommateurs actifs passeraient de 768px à 720px :

```
src/components/shared/modal/Modal.scss          (×5 usages)
src/components/features/sequences/sequence-mini-timeline/SequenceMiniTimeline.scss (×1)
```

**Options de résolution (décision Temo) :**

| Option                                               | Action                             | Impact                                             |
| ---------------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| **(A) Corriger `$size-primitives`**                  | `'modal-width-lg': 3rem → 48rem`   | Primitives alignées sur legacy — aucune régression |
| **(B) Exclure `modal-width-lg` de `$size-semantic`** | Retirer la clé de `$size-semantic` | Semantic incomplète mais safe                      |
| **(C) Accepter la régression**                       | Laisser 45rem gagner               | 6 modales réduites de 48px — test visuel requis    |

> **Recommandation** : Option A — corriger `$size-primitives['modal-width-lg']` de `45rem` à `48rem`. C'est la valeur réellement utilisée partout. La primitive était incorrecte dès son écriture.

---

## 5. Section 1.4 — Inventaire consommateurs `size()`

**Total : ~700 appels dans ~100+ fichiers SCSS**

### Clés numériques (lues dans `$size-tokens`, inchangées après fix)

`size('2')`, `size('4')`, `size('8')`, `size('10')`, `size('12')`, `size('16')`, `size('20')`, `size('24')`, `size('28')`, `size('32')`, `size('40')`, `size('48')`, `size('50')`, `size('60')`, `size('64')`, `size('80')`, `size('96')`, `size('100')`, `size('120')`, `size('140')`, `size('150')`, `size('160')`, `size('180')`, `size('200')`, `size('260')`, `size('280')`, `size('300')`, `size('320')`, `size('360')`, `size('400')`, `size('480')`, `size('500')`, `size('520')`, `size('600')`, `size('800')`, `size('900')`, `size('980')`, `size('1200')`

### Clés sémantiques actuelles dans `$size-tokens` (inchangées, legacy)

`size('touch-target-min')` (76×), `size('touch-target-optimal')` (8×), `size('touch-target-preferred')` (3×), `size('card-image-height')` (8×), `size('dnd-slot-min-height')` (2×), `size('dnd-card-min-width')` (2×), `size('modal-width-md')` (6×), `size('modal-width-lg')` (6×), `size('modal-width-sm')` (2×), `size('container-lg')` (2×), `size('container-md')` (3×), `size('card-min-height')` (6×), `size('card-max-width')` (3×), `size('sidebar-width')` (—), `size('nav-height-desktop')` (1×), `size('thumbnail-md')` (1×), `size('heading-xl')` (3×), `size('5xl')` (9×), `size('4xl')` (6×), `size('3xl')` (9×), `size('2xl')` (16×), `size('xl')` (28×), `size('lg')` (33×), `size('base')` (78×), `size('sm')` (123×), `size('xs')` (51×), `size('md')` (3×)

> ⚠️ `size('sm')`, `size('xs')`, `size('base')`, `size('lg')`, `size('xl')`, `size('2xl')` — ces clés typographiques sont dans `$size-tokens` mais leur usage comme "size" est probablement hérité du legacy. Inchangé.

### Clés des 2 tokens logo (1× chacune)

`size('logo-auth-sm')` — `AuthLogo.scss` → sera servi par `$size-semantic` après fix
`size('logo-auth-lg')` — `AuthLogo.scss` → idem

### Clés qui pourraient migrer vers `$size-semantic` (inventaire, pas d'action)

`size('touch-target-min')` → déjà en `$size-semantic` comme `'touch-min'` (nom différent)
`size('modal-width-*')`, `size('container-*')`, `size('card-*')`, `size('icon-*')`, `size('avatar-*')` → déjà en `$size-semantic` (mêmes noms, migration possible hors périmètre T2-F)

---

## 6. Section 1.5 — Localisation actuelle des 2 tokens logo

**Fichier** : `src/styles/abstracts/_tokens.scss`
**Lignes** : L960–L963

```scss
// === Branding (Semantic component aliases) ===
'logo-auth-sm':7.5rem, // 120px - Largeur du logo Appli-Picto sur les pages d'authentification (mobile).
'logo-auth-lg': 10rem; // 160px - Largeur du logo Appli-Picto sur les pages d'authentification (desktop).
```

Placés à la fin de `$size-tokens`, section "Branding". À déplacer vers `$size-semantic` en Phase 2.

---

## 7. Section 1.6 — Plan détaillé Phase 2

### Pré-requis : décision Temo sur `modal-width-lg`

Si Option A choisie (recommandée) :

- Modifier `$size-primitives['modal-width-lg']` de `45rem` → `48rem` dans `_primitives.scss`
- Puis procéder aux étapes suivantes

### Étape 1 — `_size.scss` : brancher `$size-semantic`

**Avant :**

```scss
@use 'sass:map';
@use 'tokens' as *;

@function size($key) {
  @if not map.has-key($size-tokens, $key) {
    @error "Size token '#{$key}' not found...";
  }
  @return map.get($size-tokens, $key);
}
```

**Après (calqué sur `_spacing.scss`) :**

```scss
@use 'sass:map';
@use 'tokens' as *;
@use 'semantics' as sem;
@use 'primitives' as prim;

$ENABLE_LEGACY_SUPPORT: true !default;

@function size($key) {
  @if map.has-key(sem.$size-semantic, $key) {
    @return map.get(sem.$size-semantic, $key); // 1. Semantics (priorité)
  } @else if map.has-key(prim.$size-primitives, $key) {
    @return map.get(prim.$size-primitives, $key); // 2. Primitives
  } @else if $ENABLE_LEGACY_SUPPORT and map.has-key($size-tokens, $key) {
    @return map.get($size-tokens, $key); // 3. Legacy tokens
  } @else {
    @if $ENABLE_LEGACY_SUPPORT {
      @error "Size '#{$key}' not found in semantics, primitives, nor legacy tokens. Available semantic keys: #{map.keys(sem.$size-semantic)}.";
    } @else {
      @error "Size '#{$key}' not found in semantics or primitives.";
    }
  }
}
```

### Étape 2 — `_semantics.scss` : ajouter les 2 tokens logo dans `$size-semantic`

À la fin de `$size-semantic`, avant `) !default;` :

```scss
// === Branding (Component-specific semantic aliases) ===
'logo-auth-sm':7.5rem, // 120px — Largeur du logo Appli-Picto sur les pages d'authentification (mobile).
  'logo-auth-lg': 10rem;
// 160px — Largeur du logo Appli-Picto sur les pages d'authentification (desktop).
```

> ⚠️ Ces valeurs sont hardcodées (7.5rem, 10rem) — ils n'ont pas de correspondant dans `$size-primitives`. Conformément à l'instruction Temo du 2026-05-17 : "semantic component aliases, ne nécessitent PAS de primitive correspondante".

### Étape 3 — `_tokens.scss` : supprimer les 2 tokens logo

Supprimer la section "Branding" ajoutée le 2026-05-17 (L959–L963 environ) :

```scss
// === Branding (Semantic component aliases) ===
'logo-auth-sm':7.5rem, // 120px - ...
  'logo-auth-lg': 10rem; // 160px - ...
```

### Étape 4 — Vérification

```bash
pnpm check
pnpm test
pnpm build
pnpm lint:hardcoded
```

Contrôle spécifique : `size('logo-auth-sm')` doit retourner `7.5rem`, `size('logo-auth-lg')` doit retourner `10rem`. Vérifiable via `pnpm build` sans erreur.

### Étape 5 — `CSS_ARCHITECTURE.md` (proposer, ne pas éditer)

- §11 : marquer T2-F ✅ RÉSOLU
- §3.5/§3.7 (si existant) : préciser la chaîne Semantics → Primitives → Tokens

---

## 8. Checklist "Prêt pour GO Phase 2"

- [x] Wrapper `size()` cartographié (ne lit que `$size-tokens`)
- [x] `$size-semantic` inventorié (20 clés, toutes orphelines)
- [x] Collisions vérifiées : 14 identiques ✅, 1 divergente 🔴 (`modal-width-lg`)
- [x] Consommateurs inventoriés (~700 appels, aucune régression si option A choisie)
- [x] Tokens logo localisés (`_tokens.scss` L960–L963)
- [x] Plan Phase 2 détaillé (3 fichiers, ordre précis)
- [ ] ⏳ **Décision Temo sur `modal-width-lg`** — Option A/B/C
- [ ] ⏳ **Message exact "GO Phase 2" de Temo**

---

_Rapport généré le 2026-05-17 — Audit read-only, aucune modification effectuée._
