# 🧩 Appli Picto – Dashboard pour enfants autistes

Un tableau de motivation interactif et personnalisable, conçu pour aider les enfants autistes à accomplir des tâches quotidiennes avec des pictogrammes, des récompenses et une interface apaisante.

---

## 🏗️ Structure du projet

Ce dépôt contient deux parties :

```
appli-picto/
├── frontend/      → Application React (Vite + SCSS + @dnd-kit)
└── backend/       → API Express + SQLite (Node.js)
```

---

## ⚙️ Installation locale

### 1. Cloner le projet

```bash
git clone https://github.com/temo-accipiter/appli-picto.git
cd appli-picto
```

### 2. Installer toutes les dépendances

```bash
./install.sh
```

### 3. Lancer l’application (backend + frontend)

```bash
./start.sh
```

---

## ✨ Fonctionnalités principales

- ✅ Tâches avec pictogrammes (à cocher)
- 🧲 Drag & Drop (grilles de tâches)
- 🏆 Récompenses visuelles et sonores
- 🎨 Thème clair/sombre, interface douce et accessible
- 🔊 Sons d’encouragement
- 🧠 Conçu pour un usage enfant + adulte
- 🗃️ Données locales en SQLite

---

## 📁 Dossiers importants

| Dossier                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `frontend/`                | Interface React 18 (modulaire, accessible) |
| `frontend/src/components/` | Composants isolés avec SCSS BEM-lite       |
| `backend/server.js`        | Serveur Express + routes API               |
| `backend/database.db`      | Base SQLite locale                         |

---

## Structure du projet

```
src/
├── main.jsx                  # point d’entrée React + i18n init
├── assets
│   ├── images/               # images utilisées dans l’app
│   │   ├── ligne
│   │   └── picto
├── hooks/                    # hooks métiers (tâches DnD, édition, récompenses…)
│   ├── useTaches.js
│   ├── useTachesDnd.js
│   ├── useTachesEdition.js
│   ├── useRecompensesEdition.js
│   ├── useStations.js
│   ├── useCategories.js
│   └── useRecompenses.js
├── data/
│   ├── colors.js
├── utils/                    # fonctions utilitaires
│   ├── api.js                # couche HTTP vers le backend
├── i18n/                     # initialisation i18n
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
│   ├── fields/
│   │   ├── checkbox/
│   │   ├── input/
│   │   ├── select/
│   ├── button/
│   │   ├── Button.jsx
│   │   ├── Button.scss
│   ├── card/
│   │   ├── Card.jsx
│   │   ├── Card.scss
│   ├── forms/
│   │   ├── ItemForm.jsx
│   │   ├── ItemForm.scss
│   ├── navbar/
│   │   ├── Navbar.jsx
│   │   ├── Navbar.scss
│   │   ├── navbar-tableau/
│   │   ├── navbar-edition/
│   ├── theme-toggle/
│   ├── lang-selector/
│   ├── train-progress-bar/
│   ├── selected-recompense/
│   ├── checklist/
│   │   ├── taches-dnd/
│   │   └── taches-edition/
│   │   └── recompenses-edition/
│   └── modal/
│       ├── Modal.jsx
│       ├── Modal.scss
└── styles/                   # styles globaux / variables / mixins
    ├── abstracts/
    ├── base/
    ├── themes/
    ├── vendors/
    └── main.scss
```

---

## 🔐 Accès en ligne (prévu)

> Le projet pourra être hébergé en ligne (Railway, Render, Vercel…), une documentation de déploiement sera ajoutée.

---

## 👤 Auteur

**T. Miminoshvili**  
📍 Paris, France  
🔗 Projet personnel d’accompagnement éducatif
