# 🧑‍💻 Copilot Instructions – Appli Picto

Ce document guide les agents IA et les développeurs pour contribuer efficacement au projet **Appli-Picto**, un dashboard ludique conçu pour les enfants TSA et leurs familles.

---

## description

Mode FR pour l’application “Appli-Picto” – Dashboard ludique pour enfants TSA.
L’IA doit répondre TOUJOURS en français, avec des explications claires et étape
par étape adaptées à un débutant. Fournir du code prêt à copier-coller, proposer
des diffs/patchs minimaux et demander confirmation avant toute édition multiple.

---

## 🎯 Objectif du projet

- Offrir une application web simple, apaisante et ultra-accessible pour les enfants autistes (TSA).
- Structurer visuellement les activités de la journée sous forme de **cartes illustrées de tâches**.
- Récompenser l’enfant lorsqu’il accomplit toutes ses tâches.
- Interface apaisante : **animations douces**, **couleurs pastel**, **sons discrets**, **aucun contenu intrusif**.
- Conforme aux standards **WCAG AA** (accessibilité).

---

## 🏗️ Architecture & Structure

### Frontend

- React 18 / 19 + Vite + Yarn PnP
- `src/components/` : composants modulaires, chaque composant = `.jsx` + `.scss`
- `src/contexts/` : gestion d’état global (AuthContext, ToastContext…)
- `src/hooks/` : logique métier et accès Supabase (`useTaches`, `useRecompenses`, etc.)
- `src/pages/` : pages principales (profil, édition, tableau, login…)
- `src/utils/supabaseClient.js` : configuration et accès Supabase
- `src/styles/` : SCSS BEM-lite + `animations.scss`

### Backend

- **100 % Supabase** (Postgres, Auth, RLS, Storage, Edge Functions)
- Tables principales : `taches`, `recompenses`, `categories`, `parametres`, `stations`, `abonnements`
- Stockage d’images : bucket privé Supabase `images`

### Paiements

- Stripe Checkout (abonnement mensuel)
- Table `abonnements` (customer_id, subscription_id, status, current_period_end)
- Webhooks Stripe pour créer / mettre à jour / supprimer les abonnements
- Billing Portal Stripe intégré pour gérer son abonnement

---

## 🔄 Flux de données

- Toute la logique métier est centralisée via Supabase.
- Hooks personnalisés gèrent les interactions (lecture/écriture).
- Contexts gèrent l’état global (auth, tâches, toasts).
- Uploads images → compression auto (50 Ko max) + stockage privé Supabase + URL signées.

---

## 👥 Rôles utilisateurs

- **Visiteur** : accès démo (3 tâches prédéfinies).
- **Free** : compte gratuit, quotas stricts.
- **Abonné** : abonnement Stripe actif, quotas élevés.
- **Admin** : accès total, gestion des rôles et permissions.
- **Staff** : rôle futur (support admin).

> ℹ️ Les droits sont appliqués via `<FeatureGate role="abonne">...</FeatureGate>` dans l’interface et renforcés par RLS côté serveur.

---

## 📄 Pages principales

1. **Profil** : gestion des infos utilisateur (pseudo, avatar, email, mot de passe…).
2. **Édition** : création/édition de tâches et récompenses, choix du jour, gestion catégories, reset global, options (confettis, train).
3. **Tableau** : interface enfant → affichage des tâches du jour en **grille drag & drop** avec progression animée et confettis finaux.

---

## 📦 Gestion des quotas

- **Free** :
  - 5 tâches créées/mois (max 5 visibles)
  - 2 récompenses créées/mois (max 2 visibles)
  - 2 catégories max
- **Abonné** :
  - 40 tâches simultanées
  - 10 récompenses simultanées
  - 50 catégories simultanées
- Centralisé via RPC `rpc.get_usage(user_id)` (performances) et enforce côté serveur.

---

## 🖼️ Gestion des images

- Upload réservé aux utilisateurs connectés.
- Compression → 50 Ko max.
- Stockage privé Supabase, accès via URL signées (1–24h).
- Sécurité : vérification magic bytes, suppression métadonnées, interdiction hotlinking, header `Cache-Control`.

---

## 🔐 Sécurité & RGPD

- Conforme CNIL (aucun cookie tiers sans consentement).
- Données privées par défaut, pas de partage entre utilisateurs.
- Auth Supabase sécurisée (Turnstile CAPTCHA).
- Consentement cookies stocké via Edge Function Supabase.

---

## 🛠️ Workflows Dev

### Démarrage local

```bash
yarn install
yarn dev
```

### Build/Preview

```bash
yarn build
yarn preview
```

### Lint/Format

```bash
yarn lint
yarn format
```

### Tests

- Framework : **Vitest** (`vitest.config.js`)
- Peu de tests → cibler hooks et composants critiques.

---

## 🧰 Conventions

- Un composant = dossier avec `.jsx` + `.scss`.
- Styles : SCSS BEM-lite + thème pastel.
- Utilisation de `@dnd-kit` pour le drag & drop (pas `react-beautiful-dnd`).
- ESLint + Prettier + Husky + lint-staged pour code propre.
- Stockage temporaire dans `localStorage` pour certaines préférences (tâches du jour).

---

## 📊 Intégrations externes

- **Supabase** : auth, DB Postgres, Storage privé, Edge Functions.
- **Stripe** : abonnement + Billing Portal (backend only).
- **Cloudflare Turnstile** : CAPTCHA à l’inscription.
- **Hostinger** : hébergement actuel (limite trafic/bande passante).

---

## 📁 Fichiers clés à lire

- `src/hooks/` → logique métier + accès Supabase.
- `src/contexts/` → Auth, Toast, gestion état global.
- `src/utils/supabaseClient.js` → configuration Supabase.
- `src/pages/` → structure des pages principales.
- `README.md` → vue d’ensemble et scripts.

---

## 🔮 Fonctionnalités futures

- Notifications de rappel (1 semaine + 2 jours avant échéance).
- Choix de thème pastel par adulte.
- Ligne de métro = thème couleur.
- Historique de progression et statistiques.
- Galerie de pictos (Flaticon, SVG).
- Sons personnalisés (succès, clic…).

---

## ✅ Règles finales

- Respecter la stack et conventions ci-dessus.
- Toujours documenter les nouveaux patterns dans ce fichier.
- Conserver un style de code clair, accessible et performant.
