# 🧠 Design System SCSS — Appli-Picto

## 🎯 Objectif général

Nous utilisons un **design system SCSS strict, token-driven**, conçu pour :

- une **application mobile-first**
- un public **enfants TSA (autisme)** → visuel apaisant, cohérence forte, prévisibilité
- une **maintenabilité long terme**
- empêcher toute dérive de styles, duplication ou valeurs hardcodées
- permettre une évolution maîtrisée sans casser les composants

Ce système est volontairement **contraignant**.

---

## 🔑 Principe fondamental — Sources de vérité

### 1️⃣ `tokens.scss` — SOURCE DE VÉRITÉ ABSOLUE (UI)

`tokens.scss` est **l’unique endroit** où sont définies :

- les **valeurs visuelles autoritatives**
- les **maps canoniques**
- les **noms fonctionnels stables**
- les **décisions UX/UI finales**

Exemples :

- `$spacing-tokens`
- `$font-size-tokens`
- `$role-color-tokens`
- `$ui-gradients`
- `$badge-shadows`
- `$border-width-tokens`

➡️ **Aucune valeur visuelle canonique ne doit être définie ailleurs.**

### 2️⃣ `a11y-tokens.scss` — SOURCE DE VÉRITÉ NORMATIVE (ACCESSIBILITÉ)

`a11y-tokens.scss` est **complémentaire**, jamais concurrent de `tokens.scss`.

Il contient **uniquement** :

- des **seuils**
- des **contraintes**
- des **règles WCAG / TSA**
- des valeurs normatives (contraste min, tailles min, durées max, etc.)

🚫 Il ne contient **aucun choix visuel**, aucune couleur, aucun spacing UI.

**Bonne pratique :**

- `tokens.scss` → **déclare**
- `a11y-tokens.scss` → **contraint**
- les wrappers → **appliquent et valident**

## 🧠 Schéma mental global

```text
tokens.scss        → valeurs UI autoritatives
a11y-tokens.scss   → règles WCAG / TSA
wrappers           → enforcement + validation
components         → consommation uniquement
```

- les autres fichiers abstraits sont des wrappers ou des émetteurs de runtime
- main.scss est l’unique point où le CSS global est matérialisé
- les composants n’importent jamais de runtime, uniquement @styles/abstracts

---

## 🎯 RÈGLE D’OR (CRITIQUE)

❌ INTERDIT

- hardcoder une couleur (#fff, #333, etc.)
- inventer des noms (surface-primary, primary-bg, etc.)
- accéder directement à des maps internes
- redéfinir des valeurs dans les composants

✅ AUTORISÉ

- appeler uniquement des fonctions
- utiliser des noms fonctionnels existants
- laisser les wrappers gérer la logique

---

## 🧱 Architecture SCSS — Rôles clairs

🔹 Abstracts (wrappers)

Fichiers comme :

```scss
_colors.scss
_spacing.scss
_typography.scss
_motion.scss
_radius.scss
_shadows.scss
_borders.scss
_breakpoints.scss
```

Rôle :

- ne créent aucune valeur
- ne décident rien
- lisent les tokens canoniques
- exposent uniquement des fonctions publiques
- valident les clés
- bloquent les usages illégaux via des erreurs SCSS explicites

🔹 Exemple : colors.scss

❌ ne crée pas de couleurs
❌ n’invente pas de noms
✅ expose des fonctions sûres :

color(base)
surface(bg)
text(default)
semantic(success)
tsa-pastel(blue-light)
role-color(admin, base)

Chaque fonction :

- valide les clés
- empêche les usages ambigus
- déclenche une erreur volontairement bloquante en cas d’abus

🚫 Exemple interdit :

```scss
 color(surface-primary); // ❌ ERREUR
```

➡️ surface-\* doit passer par surface(), jamais par color().

🔹 SPACING / TYPO / SHADOWS / MOTION / radius / borders

Tous suivent exactement le même modèle :
Exemple spacing.scss

- lit $spacing-tokens depuis tokens.scss
- expose une fonction du type :
  space(md)
  👉 Aucun composant ne connaît la valeur réelle (8px, 12px, etc.)

---

## 📦 Imports — Stratégie officielle

🧩 Dans les composants

Les composants n’importent jamais :

- colors.scss
- spacing.scss
- typography.scss
  etc.

✅ Import unique autorisé :

```scss
@use '@styles/abstracts' as \*;
```

Ce point d’entrée :

- centralise tous les wrappers
- garantit la cohérence
- permet de faire évoluer l’architecture sans casser les composants

🧠 Dans main.scss (seul point runtime)

main.scss est l’unique endroit où le CSS global est matérialisé.

Il importe explicitement :

- les vendors
- les wrappers runtime (CSS variables)
- les styles de base
- les thèmes

Aucun autre fichier ne doit produire de CSS global.

---

## 📱 Mobile-first (NON NÉGOCIABLE)

Le mobile est la base
Le desktop est une amélioration progressive
Les breakpoints sont utilisés uniquement pour enrichir, jamais pour corriger

🚫 Interdit :
raisonner desktop-first
surcharger le mobile avec des styles inutiles

---

## 🧠 Contexte TSA — Enfants autistes

Le design doit être :

- calme
- cohérent
- prévisible
- non agressif visuellement

Règles implicites :

- pas de contrastes violents inutiles
- pas d’animations décoratives
- pas d’effets de surprise
- cohérence stricte entre composants similaires---

---

## 🏷️ Nommage & structure (BEM)

- BEM lisible et pragmatique
- noms fonctionnels, jamais décoratifs
- profondeur de nesting max : 2 à 3 niveaux
- pas de dépendance implicite au DOM

🚫 Interdit :

- BEM sur-verbeux
- selectors fragiles
- nesting excessif

---

## 🛠️ Qualité attendue (audit & refactor)

Lors de toute analyse ou modification, il faut :

- vérifier la structure du fichier SCSS
- améliorer l’organisation si nécessaire
- supprimer duplications et incohérences
- aligner avec les conventions existantes
- refuser toute solution “rapide mais sale”

---

## 🏁 Règle finale (absolue)

Si une valeur n’est pas accessible via une fonction publique du design system, elle ne doit pas être utilisée.
