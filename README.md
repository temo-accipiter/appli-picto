# 🧩 Appli Picto – Dashboard pour enfants autistes

Un tableau de motivation interactif et personnalisable, conçu pour aider les enfants autistes à accomplir des tâches quotidiennes avec des pictogrammes, des récompenses et une interface apaisante.

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

## 👤 Auteur

**Miminoshvili Temo**  
📍 Paris, France  
🔗 Projet personnel d'accompagnement éducatif
