# Tableau Magique

> 🛠️ Une petite application React/Vite pour gérer vos tâches quotidiennes et vos récompenses, pensée pour un usage pédagogique.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Structure du projet](#structure-du-projet)
- [Ajouter un nouveau composant](#ajouter-un-nouveau-composant)
- [Styles (SCSS)](#styles-scss)
- [Traductions (i18n)](#traductions-i18n)
- [Tests & Linting](#tests--linting)
- [Bonnes pratiques](#bonnes-pratiques)

---

## Fonctionnalités

- ✅ **Glisser-déposer** pour réordonner vos tâches
- ✅ **Cocher / décocher** chaque tâche, et bouton **Réinitialiser**
- 🎁 Choix d’une récompense journalière, déverrouillée lorsque toutes les tâches sont faites
- 🛠️ Page **Édition** pour ajouter / modifier / supprimer tâches et récompenses
- 🌐 **Thèmes** clair/sombre et sélecteur de langue (FR / EN)

---

## Prérequis

- [Node.js](https://nodejs.org/) ≥ **16.x**
- [Yarn](https://yarnpkg.com/) (PNPM & Yarn PnP sont supportés)
- macOS / Windows / Linux
- Visual Studio Code (recommandé)

---

## Installation

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/votre-org/tableau-magique.git
   cd tableau-magique
   ```
2. Installez les dépendances :
   ```bash
   yarn install
   ```

---

## Démarrage

- **Mode développement**

  ```bash
  yarn dev
  ```

  > Ouvre le serveur Vite sur `http://localhost:5173/`.

- **Build de production**

  ```bash
  yarn build
  ```

- **Serveur de prévisualisation**
  ```bash
  yarn preview
  ```

---

## Structure du projet

```
src/
├── main.jsx                  # point d’entrée React + i18n init
├── api.js                    # couche HTTP vers le backend
├── hooks/                    # hooks métiers (tâches DnD, édition, récompenses…)
│   ├── useTaches.js
│   ├── useTachesDnd.js
│   ├── useTachesEdition.js
│   └── useRecompenses.js
├── pages/
│   ├── tableau/              # page “Tableau” (grille)
│   │   ├── Tableau.jsx
│   │   └── Tableau.scss
│   ├── edition/              # page “Édition”
│   │   ├── Edition.jsx
│   │   └── Edition.scss
│   └── notFound/             # 404
│       ├── NotFound.jsx
│       └── NotFound.scss
├── components/               # composants UI réutilisables
│   ├── layout/
│   │   ├── Layout.jsx
│   │   └── Layout.scss
│   ├── navbar/
│   ├── theme-toggle/
│   ├── lang-selector/
│   ├── train-progress-bar/
│   ├── selected-recompense/
│   ├── checklist/
│   │   ├── taches-dnd/
│   │   └── taches-edition/
│   │   └── recompenses-edition/
│   └── modal/
│       ├── ajout-tache/
│       └── ajout-recompense/
└── styles/                   # styles globaux / variables / mixins
    ├── abstracts/
    ├── base/
    ├── themes/
    └── main.scss
```

---

## Ajouter un nouveau composant

1. **Dans** `src/components/`, créez un dossier `<nom-du-composant>/` (kebab-case).
2. **À l’intérieur** :
   - `<NomDuComposant>.jsx`
   - `<NomDuComposant>.scss`
3. **En-tête JSDoc** en haut de votre `.jsx` :
   ```jsx
   /**
    * Composant : NomDuComposant
    *
    * Rôle :
    *   • Description concise du rôle.
    *
    * Props :
    *   - propA: Type … Description
    *   - …
    */
   ```
4. **PropTypes** ou **TypeScript** pour décrire vos props.
5. **SCSS** : utilisez des classes locales `.mon-composant { … }`; importez votre fichier scss depuis le jsx.
6. **Import** et **utilisation** :
   ```js
   import NomDuComposant from '@/components/nom-du-composant/NomDuComposant'
   ```

---

## Styles (SCSS)

- **Variables** et **mixins** dans `styles/abstracts/`
- **Styles de base** (reset, typographie…) dans `styles/base/`
- **Thèmes** (clair / sombre) dans `styles/themes/`
- **Main**
  ```scss
  @use './abstracts/variables';
  @use './base/reset';
  @use './themes/dark';
  ```
- **Import** vos `.scss` spécifiques directement dans chaque composant/JSX.

---

## Traductions (i18n)

- Les fichiers JSON sont dans `public/locales/{fr|en}/common.json`.
- Initialisation dans `src/i18n/i18n.js`.
- Utilisez le hook `useTranslation()` de `react-i18next` :
  ```jsx
  const { t } = useTranslation()
  <span>{t('maCle')}</span>
  ```

---

## Tests & Linting

- **ESLint** et **Prettier** déjà configurés (`.eslintrc.js`).
- **Exécuter le linter** :
  ```bash
  yarn lint
  # ou
  yarn check
  ```
- **Tests unitaires** (à mettre en place) :
  - Jest + React Testing Library
  - Exemple de script dans `package.json`

---

## Bonnes pratiques

- **Séparer logique & présentation** :
  - Hooks → gestion des données
  - Composants “dumb” → affichage + callbacks
- **Props contrôlées** et **defaultProps** / **PropTypes**.
- **Accessibilité** : chaque `<input>` doit avoir un `name` ou `id` + `<label>`.
- **Lazy-loading** pour les modals/grosses dépendances.
- **Documenter** chaque composant/page avec un petit header JSDoc.

---

> 🚀 Maintenant vous avez toutes les clés pour développer, maintenir et faire évoluer l’app !  
> Pour toute question, n’hésitez pas à consulter la doc officielle de [React](https://reactjs.org/) et [Vite](https://vitejs.dev/").
