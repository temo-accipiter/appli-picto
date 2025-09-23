# 🎨 Projet “Appli-Picto” – Dashboard ludique pour enfants TSA

## 👶 Objectif principal

L'objectif est de créer une application web simple, apaisante et ultra-accessible pour les enfants autistes (TSA), ainsi que leurs familles et les professionnels qui les accompagnent. L'application permet de structurer visuellement les activités de la journée sous forme de **cartes illustrées de tâches**, et de **récompenser l’enfant** une fois qu’il a accompli toutes ses tâches.

Tout est pensé pour être rassurant, clair, joyeux mais sobre : **animations douces, codes couleurs pastel**, **sons discrets**, **interface non surchargée**, **aucun contenu intrusif**.

---

## 🧱 Stack technique utilisée

- **Frontend** : React 18 / React 19, Vite, Yarn PnP (Plug’n’Play), React Router
- **Styles** : SCSS BEM-lite, animations personnalisées (`animations.scss`), thème pastel (pensé pour TSA)
- **Backend & BDD** : Supabase (authentification, base de données PostgreSQL, storage images, edge functions, RLS)
- **Paiement** : Stripe (Checkout, abonnements mensuels, webhooks)
- **Sécurité** : Cloudflare Turnstile (CAPTCHA), quota images, header Cache-Control
- **Hébergement** : actuellement Hostinger (avec contraintes de trafic mensuel et bande passante à surveiller)
- **Éditeur principal** : Cursor avec support Codex + .cursorignore

---

## 👥 Rôles utilisateurs détaillés

| Rôle         | Description détaillée                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visiteur** | Ne crée pas de compte. Peut tester une version très limitée : 3 tâches prédéfinies + 1 récompense. Un modal l’invitant à créer un compte pour accéder à la personnalisation. |
| **Free**     | Compte gratuit. Peut accéder à toutes les pages (profil, édition, tableau), mais avec des quotas                                                                             |
| **Abonné**   | Compte avec abonnement Stripe actif. A accès à des quotas beaucoup plus élevés.                                                                                              |
| **Admin**    | Accès total à l’appli, y compris la page d’administration des rôles et permissions. Ne voit pas les boutons d’abonnement mais peut tout modifier.                            |
| **Staff**    | À définir plus tard. Pourra ider l'admin à gérer l’appli sans tout débloquer.                                                                                                |

> ℹ️ Les droits et fonctionnalités sont contrôlés dans l’interface via des balises `<FeatureGate role="abonne">...</FeatureGate>`

---

## 📄 Pages principales et leur rôle

### 1. **Page Profil**

- Accessible une fois connecté.
- L’utilisateur peut voir/modifier : pseudo, date de naissance, ville, avatar, email, mot de passe.
- À l’inscription, seuls l’email et le mot de passe sont requis. Les autres champs sont optionnels.

### 2. **Page Édition**

- L’utilisateur y crée ses cartes de tâches et de récompenses.
- Il peut trier par catégories, activer ou désactiver les options comme les confettis ou le petit train.
- Il peut cocher les tâches à faire “aujourd’hui” (elles apparaîtront dans la page Tableau).
- Un bouton permet de **réinitialiser toutes les tâches**, un autre pour gérer les **catégories**.

### 3. **Page Tableau**

- L’enfant interagit avec cette page uniquement.
- Les cartes sélectionnées “aujourd’hui” sont affichées dans une **grille drag & drop** (réorganisables manuellement).
- À chaque tâche cochée : animation, progression du train, son léger.
- Une fois toutes les tâches cochées : confettis + carte récompense affichée.

---

## 📦 Gestion des quotas

- Un utilisateur **Free** est limité à :  
  → 5 tâches créées par mois (et 5 max visibles en même temps)  
  → 2 récompenses créées par mois (et 2 max visibles en même temps)  
  → 2 catégories maximum simultanément (mais suppression/recréation illimitée)

- Un **Abonné** :  
  → 40 tâches en simultané  
  → 10 récompenses en simultané
  → 50 catégories en simultané

- La logique est centralisée dans une future fonction RPC Supabase (`rpc.get_usage(user_id)`) pour performances optimales.
- Ces quotas sont **renforcés côté serveur** + visibles dans l’interface avec des messages clairs.

---

## 🖼️ Gestion des images (upload)

- Chaque carte (tâche ou récompense) peut avoir une image personnalisée (picto).
- Upload autorisé uniquement pour les utilisateurs connectés.
- L’image est **compressée automatiquement à 50 Ko** (via `compressImageIfNeeded`) avant envoi à Supabase.
- Les fichiers sont stockés dans un **bucket privé Supabase**, pas accessibles publiquement.
- Les règles de sécurité incluent :
  - Vérification des **magic bytes** pour éviter les fichiers corrompus
  - **Suppression des métadonnées**
  - Headers HTTP : `Cache-Control: private, max-age=31536000`
  - URL signées valables 1h à 24h max (renouvelables si besoin)
  - **Interdiction du hotlinking** (configuration à faire côté Nginx ou hébergeur)

---

## 🔐 Sécurité & RGPD

- Application **conforme CNIL** (aucun cookie tiers sans consentement).
- Tous les contenus uploadés sont **privés par défaut**.
- Aucun utilisateur ne peut voir le contenu d’un autre (sauf contenu de test pour Visiteur).
- Consentement cookie stocké proprement (via Edge Function Supabase).
- Authentification Supabase sécurisée avec Turnstile pour bloquer les bots.

---

## 💳 Paiement par abonnement

- Utilise **Stripe Checkout** (abonnement mensuel).
- Une table `abonnements` contient les données Stripe : customer_id, subscription_id, statut.
- Webhooks Stripe gèrent la création/suspension/résiliation des abonnements.
- L’interface propose un bouton “S’abonner” (sauf pour l’Admin).
- Accès au **Billing Portal** Stripe pour gérer son abonnement (via `redirectToCustomerPortal`).

---

## 🧰 Outils dev, bonnes pratiques

- Éditeur : **Cursor avec Codex activé** pour suggestions contextuelles.
- Développement local sous macOS.
- Architecture en dossiers : chaque composant a son `.jsx` + `.scss` dans son propre dossier.
- Préprocesseur : SCSS avec variables, mixins, palette pastel.
- Utilisation de `@dnd-kit` pour le drag & drop natif React 19 (pas de react-beautiful-dnd).
- Lint : ESLint + Prettier + Husky + lint-staged
- Stockage local temporaire via `localStorage` (sélection des tâches du jour).

---

## 🧪 Fonctionnalités futures

- 🎯 Notifications de rappel (1 semaine + 2 jours avant une échéance importante)
- 🎨 Choix de thème pastel par l’adulte
- 🚇 Sélection de la ligne de métro → changement d’ambiance (couleur interface)
- 🧾 Historique de progression (tâches faites, récompenses obtenues)
- 🧩 Galerie de pictos (intégration Flaticon, SVG, etc.)
- 🔊 Sons personnalisés (succès, clic, encouragement)
- 📊 Dashboard utilisateur avec statistiques et calendrier

---

## ✅ État actuel du projet

- ✅ Authentification Supabase 100 % opérationnelle
- ✅ Rôles & quotas intégrés (testés)
- ✅ Stockage images sécurisé (compression, bucket privé)
- 🟡 Intégration Stripe en cours (Checkout + webhooks)
- 🟡 UI responsive & animée à 80 % (pages principales fonctionnelles)
- 🟡 Dashboard Admin en cours de finalisation

---

## 🔚 Résumé final

Cette application est conçue avec soin pour répondre à un vrai besoin éducatif et émotionnel des enfants autistes et de leurs proches. Elle est pensée pour évoluer avec le temps, accueillir potentiellement des milliers d'utilisateurs, et rester **légère, rapide, sécurisée** et **apaisante**.

Chaque décision technique a été guidée par un **équilibre entre accessibilité, performance, et confidentialité**.
