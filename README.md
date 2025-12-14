# 🧩 Appli Picto – Dashboard pour enfants autistes

[![CI](https://github.com/temo-accipiter/appli-picto/workflows/CI/badge.svg)](https://github.com/temo-accipiter/appli-picto/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/temo-accipiter/appli-picto/branch/main/graph/badge.svg)](https://codecov.io/gh/temo-accipiter/appli-picto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-20.19.4-brightgreen.svg)](https://nodejs.org/)

Un tableau de motivation interactif et personnalisable, conçu pour aider les enfants autistes à accomplir des tâches quotidiennes avec des pictogrammes, des récompenses et interface apaisante.

---

## 🚀 Version 100% Supabase

Cette nouvelle version n'utilise plus de backend Express ni SQLite.  
✅ Toutes les données (tâches, récompenses, paramètres, images) sont désormais gérées par Supabase.

---

## 🏗️ Structure du projet

```txt
appli-picto/
├── public/
├── src/
│   ├── assets/           # Images lignes, train, pictos locaux
│   ├── components/       # Composants modulaires
│   ├── contexts/         # ToastContext, DisplayContext
│   ├── data/             # ex: colors.js
│   ├── hooks/            # Tous les hooks connectés à Supabase
│   ├── pages/            # Pages : tableau / édition / 404
│   ├── styles/           # SCSS global + animations
│   ├── utils/
│   │   └── supabaseClient.js
│   ├── App.jsx
│   └── main.jsx
```

---

## ⚙️ Installation locale

```bash
git clone https://github.com/temo-accipiter/appli-picto.git
cd appli-picto
yarn install
yarn dev
```

👉 Ouvre ensuite http://localhost:5173

---

## 🔐 Supabase

**Tables utilisées :**

- `taches` : tâches quotidiennes (label, fait, aujourdhui, imagePath, etc.)
- `recompenses` : récompenses (label, imagePath, selected)
- `parametres` : paramètre global `confettis`
- `categories` : catégories personnalisées
- `stations` : noms de stations de métro par ligne

**Stockage utilisé :**

- Bucket `images` pour les pictos / récompenses uploadées

---

## ✨ Fonctionnalités

- ✅ Tâches à cocher + Drag & Drop
- 🎁 Récompenses visuelles animées
- 🚆 Train de progression
- 🎉 Confettis à la fin (paramétrable)
- 📂 Upload d’images (Supabase Storage)
- 🎨 Interface douce, animée et accessible (WCAG 2.2 AA)
- 🔁 100% état synchrone avec Supabase

---

## 🧪 Scripts utiles

```bash
yarn dev        # lance le projet en local
yarn build      # build production
yarn preview    # aperçu du build
yarn lint       # vérifie le code avec ESLint
yarn format     # formatte le code avec Prettier
```

---

## 🧪 Testing

### Scripts de tests

```bash
# Tests unitaires
yarn test                  # Lancer les tests Vitest
yarn test:ui              # Interface UI des tests
yarn test:coverage        # Tests avec coverage
yarn test:coverage:open   # Ouvrir le rapport coverage

# Tests E2E
yarn test:e2e             # Tests Playwright
yarn test:e2e:ui          # Mode UI interactif
yarn test:e2e:headed      # Voir le navigateur
yarn test:e2e:debug       # Mode debug
yarn test:e2e:report      # Voir le rapport

# Supabase Local
yarn supabase:start       # Démarrer Supabase Docker
yarn supabase:stop        # Arrêter Supabase
yarn supabase:reset       # Reset DB + seed

# Stripe Testing
yarn stripe:listen        # Écouter webhooks localement
```

### Infrastructure de tests

- ✅ **CI/CD** : GitHub Actions avec jobs parallélisés (5-8 min)
- ✅ **Coverage** : Seuils à 80% (lines, functions, statements)
- ✅ **Supabase Local** : Base de données Docker avec seed automatique
- ✅ **Stripe Test Mode** : CLI pour webhooks locaux
- ✅ **Helpers** : Auth, Database, Accessibility, Stripe mocks
- ✅ **Playwright** : Tests E2E optimisés (4 workers, retry)

### Documentation complète

- 📖 [Supabase Local Setup](docs/supabase-local-setup.md)
- 📖 [Stripe Testing Guide](docs/stripe-testing.md)
- 📖 [CI/CD Configuration](docs/ci-cd-setup.md)
- 📖 [Phase 4 - Fondations](docs/phase4-fondations.md)

---

## 👤 Auteur

**Miminoshvili Temo**  
📍 Paris, France  
🔗 Projet personnel d'accompagnement éducatif
