## 1. Sécurité/Appareils : UX de révocation confuse

**Statut :** À vérifier 🟡 | **Type :** Logique DB vs UI (Contrat §5.2.1) | **Concerne** : General

- **Comportement actuel :** Dans `profil-card-devices`, révoquer l'appareil actuel fonctionne. Après reconnexion, un _nouvel_ appareil actif apparaît (normal), mais l'ancien appareil révoqué reste affiché indéfiniment.
- **Analyse Contrat :** C'est le comportement attendu en base de données (les logs de révocation sont immuables, cf. Invariants PLATFORM.md). Cependant, l'UI doit être claire pour ne pas stresser l'utilisateur.
- **Directive Claude (AUDIT & ADAPT) :** Le comportement DB est correct (ne pas modifier le backend). Côté Frontend, assure-toi que la liste des appareils affiche clairement le statut (badge "Actif" vs badge "Révoqué"). Si la liste est trop longue, ajoute un filtre visuel ou limite l'affichage des appareils révoqués récents. Si tout est ok et rien a corriger, dit le moi.

---

## 2. UI : Charge cognitive inutile sur le profil

**Statut :** Corrigé ✅ | **Type :** UI / Dette | **Concerne** : Visitor

- **Comportement actuel :** L'élément `edition-timeline__profile-placeholder` affiche un point d'interrogation `?`.
- **Analyse Produit & TSA :** En mode Visiteur, il n'y a ni base de données, ni gestion multi-profils enfants. Ce composant ne fait que rajouter de la charge cognitive (bruit visuel).
- **Directive Claude :** Supprimer ou masquer conditionnellement.

---

## 3. UI Glitch (Cycle de vie) : Clés de composant visibles au logout

**Statut :** Corrigé ✅ | **Type :** React Lifecycle / Auth State | **Concerne** : General

- **Comportement actuel :** Intermittent. Lors de la déconnexion, la page Édition re-rend la navbar avec les variables brutes (`nav.personalization`, `nav.createAccount`), au lieu d'un rendu propre. Un rafraîchissement manuel corrige le tir.

- **Impact UX :** Effet "flash" (glitch) très inélégant qui donne une sensation de fragilité à l'application juste après une action de sécurité.

- **Directive Claude (AUDIT & ADAPT) :** Le problème vient probablement d'une **désynchronisation du cycle de vie React lors du `signOut`**.
  1. Inspecte la fonction de déconnexion.
  2. Cherche une _race condition_ : l'état local (Zustand/Context) est probablement purgé _avant_ que la redirection ou le rechargement de la page n'ait abouti, forçant un re-rendu de la Navbar sans son contexte de langue ou de données.
  3. Modifie l'ordre d'exécution : assure-toi d'utiliser `router.push()` ou `router.refresh()` proprement et d'attendre la résolution de l'UI avant de détruire brutalement l'état visuel.

---

## 4. Gestion Appareils : Multiplications des sessions et UI non contrainte

**Statut :** À corriger 🟢 | **Type :** Logique Auth / UI | **Concerne** : Admin

- **Comportement actuel :** 1. La liste des appareils actifs s'allonge à l'infini (aucun scroll limité). 2. Chaque connexion enregistre un _nouvel_ appareil (ex: "Enregistré le 3 avril"), même si l'utilisateur se connecte depuis le _même_ navigateur/appareil qu'hier.

- **Analyse Architecture :** Le backend (Supabase) enregistre logiquement chaque _session_ d'authentification. Cependant, pour éviter que la DB et l'UI ne se remplissent de doublons pour le même appareil physique, il faut une empreinte locale (Device ID)

- **Directive Claude (AUDIT & ADAPT) :** 1. **UI en priorité :** Modifie le conteneur `profil-card-devices`. Ajoute une contrainte CSS pour afficher au maximum ~5 éléments visuellement, avec un `overflow-y: auto` pour faire défiler le reste (utilise les tokens Sass pour les espacements et la scrollbar). 2. **Logique d'empreinte (Device tracking) :** Analyse comment le front appelle l'insertion de l'appareil. Le front doit générer un `deviceId` unique (ex: un UUID) lors de la première connexion de l'appareil, le stocker en `localStorage` (de manière persistante), et l'envoyer à chaque reconnexion pour faire un `UPSERT` (mettre à jour la date de dernière connexion) plutôt qu'un `INSERT` systématique créant des doublons.

---

## 5. Dette Technique : Centralisation du mapping de statut

**Statut :** Corrigé ✅ | **Type :** Refacto / DRY (Don't Repeat Yourself) | **Concerne** : General

- **Comportement actuel (suspecté) :** Le composant `Abonnement.tsx` utilise un utilitaire ou mapping centralisé (ex: `statusDisplay`) pour afficher le rôle. En revanche, `Profil.tsx` gère cela via un ternaire inline fragile (`loading ? '⏳' : isActive ? status : 'Free'`), et `UserMenu.tsx` a peut-être sa propre logique.

- **Impact Architecture :** Micro-dette. Le mapping visuel des statuts (Visitor, Free, Abonné, Admin) doit être centralisé à un seul endroit pour garantir une UI prévisible et faciliter les traductions.

- **Directive Claude (AUDIT & ADAPT) :** 1. Inspecte les fichiers `Profil.tsx`, `UserMenu.tsx` et `Abonnement.tsx`. 2. Si `Profil.tsx` ou `UserMenu.tsx` utilisent encore des ternaires inline pour l'affichage textuel du statut de l'utilisateur, supprime-les. 3. Migre cet affichage pour utiliser le même consommateur/utilitaire (`statusDisplay` ou équivalent) que `Abonnement.tsx`. 4. Si tu constates que cela a déjà été corrigé, ne modifie rien et passe au point suivant.

---
