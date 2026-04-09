## 📦 <font color="#00b050">1. Logique d'Import : Déclenchements abusifs et fantômes</font>

**Statut :** Bloquant 🔴 | **Type :** State local vs State DB | **Concerne** : General

- **Comportement actuel :** 1. je suis sur l'appli en tant que Visitor et une timeline est VIDE. Je me connecte avec mes identifiant fictif de Free. 2. La modale d'import s'affiche (alors qu'il n'y a rien à importer à part les templates vides). 3. Si on clique "Plus tard" ou en dehors de modale, elle revient à chaque rechargement. 4. Si on clique "Importer", elle annonce "2 plannings importés". 5. La modale n'apparaît pas sur le Tableau, mais apparaît sur Édition/Profil. 6. Ensuite, j'observe les pages, mais rien n'est importé, ce qui est logique car il y avait rien a importé.
- **Impact UX :** Sensation de bug immédiate post-inscription. Messages mensongers.
- **Directive Claude (AUDIT & ADAPT) :** 1. **Condition d'affichage :** La modale d'import ne doit se déclencher QUE si le `localStorage` du Visitor contient des données _réellement modifiées_ (ex: plus que les 2 slots par défaut, ou contenant des images de la banque). 2. **Persistance du "Plus tard" :** Le bouton "Plus tard" doit marquer un flag (ex: `importDismissed: true`) pour ne plus harceler l'utilisateur au prochain rechargement. 3. **Purge propre :** Après un import réussi, le store local Visitor doit être intégralement vidé pour ne plus jamais interférer avec la session authentifiée. PS. avant toute modification, je veux que tu etudie le sujet et me fasse un rapport, comment import est geré dans l'appli actuellement.

---

## 📱 <font color="#00b050">2. Sécurité/Appareils : UX de révocation confuse</font>

**Statut :** À vérifier 🟡 | **Type :** Logique DB vs UI (Contrat §5.2.1) | **Concerne** : General

- **Comportement actuel :** Dans `profil-card-devices`, révoquer l'appareil actuel fonctionne. Après reconnexion, un _nouvel_ appareil actif apparaît (normal), mais l'ancien appareil révoqué reste affiché indéfiniment.
- **Analyse Contrat :** C'est le comportement attendu en base de données (les logs de révocation sont immuables, cf. Invariants PLATFORM.md). Cependant, l'UI doit être claire pour ne pas stresser l'utilisateur.
- **Directive Claude (AUDIT & ADAPT) :** Le comportement DB est correct (ne pas modifier le backend). Côté Frontend, assure-toi que la liste des appareils affiche clairement le statut (badge "Actif" vs badge "Révoqué"). Si la liste est trop longue, ajoute un filtre visuel ou limite l'affichage des appareils révoqués récents. Si tout est ok et rien a corriger, dit le moi.

---

## 👻 <font color="#00b050">3. UI : Charge cognitive inutile sur le profil</font>

**Statut :** À corriger 🟢 | **Type :** UI / Dette | **Concerne** : Visitor

- **Comportement actuel :** L'élément `edition-timeline__profile-placeholder` affiche un point d'interrogation `?`.
- **Analyse Produit & TSA :** En mode Visiteur, il n'y a ni base de données, ni gestion multi-profils enfants. Ce composant ne fait que rajouter de la charge cognitive (bruit visuel).
- **Directive Claude :** Supprimer ou masquer conditionnellement.

---

## 🐛 <font color="#00b050">4. Bugs Critiques : Édition d'une session commencée</font>

Les deux bugs suivants relèvent du même problème fondamental : **l'état de la Session en cours et l'état de la Timeline (les slots) sont désynchronisés en mémoire locale.**

### 🛑 Cas 1 : Ghost Step (Désynchronisation après suppression)

**Statut :** Critique 🔴 | **Type :** État bloquant | **Concerne** : Visitor

- **Scénario de reproduction :**
  1. Démarrer une session avec 3 étapes (page Tableau).
  2. Valider la 1ère carte.
  3. Aller dans l'Édition et supprimer une étape non validée (ex: la 3ème).
  4. Revenir sur le Tableau.
- **Comportement observé :** La carte est bien supprimée visuellement, mais le compteur total d'étapes (et TrainProgressBar) reste bloqué sur 3.
- **Conséquence UX :** L'enfant valide la 2ème carte, mais la récompense finale ne se déclenche jamais. Le système attend la validation d'une carte qui n'existe plus (deadlock).
- **Directive d'investigation pour Claude :** Je ne connais pas la cause technique exacte. Ton objectif (Phase AUDIT) est d'identifier où est stocké l'état local du Visitor (le store de la session et des timelines). Cherche pourquoi le recalcul du nombre total d'étapes (`total_steps`) ne se déclenche pas lors d'une mutation (suppression) du tableau `slots`, et propose un fix pour garder ces deux valeurs synchronisées.

### 💥 Cas 2 : Meltdown TSA (Réinitialisation brutale après ajout)

**Statut :** Bloquant 🔴 | **Type :** Violation Invariant TSA | **Concerne** : Visitor

- **Scénario de reproduction :**
  1. Démarrer une session avec 2 étapes.
  2. Valider la 1ère carte.
  3. Aller dans l'Édition et ajouter une 3ème étape à la fin.
  4. Revenir sur le Tableau (l'UI affiche bien 3 stations et la nouvelle carte).
  5. Cliquer pour valider la 2ème carte.
- **Comportement observé :** Crash silencieux de l'état local. Toutes les cartes se décochent et le train revient à la station de départ.
- **Conséquence UX (TSA) :** **Inacceptable.** L'enfant perd son travail validé. C'est le déclencheur typique d'une crise de frustration. La réinitialisation ne doit survenir que par une action explicite (bouton Réinitialiser) ou à la fin naturelle de la session.
- **Directive d'investigation pour Claude :** Ton objectif (Phase AUDIT) est de comprendre pourquoi l'ajout d'un slot dans l'édition détruit la référence de la session en cours lors de l'interaction suivante. Analyse le composant qui rend les cartes du Tableau et le store local. Cherche des pertes de `key` React ou un écrasement brutal du tableau `validated_slots`.

---

## 💥 <font color="#00b050">5. UX TSA (Critique) : Fin de session prématurée depuis l'Édition</font>

**Statut :** Bloquant 🔴 | **Type :** Violation Invariant TSA / Synchronisation | **Concerne** : Compte authentifié

- **Comportement actuel :** (Session de 2 cartes, 1 validée). L'adulte supprime la dernière carte non validée depuis l'Édition. Le système considère la session terminée, affiche un toast et réinitialise tout _depuis l'écran Édition_, sans que l'enfant ne voie la fin sur le Tableau.
- **Impact TSA :** L'enfant perd l'accès à l'écran de récompense de fin de session. Rupture brutale de l'économie de jetons.
- **Directive Claude (AUDIT & ADAPT) :** Ca dois etre geré de la meme maniere que lorsque l'utilisateur valide toutes les cartes sur la page tableau et que la recompense apparait et reste tant que l'utilisateur ne change pas de page. La session doit rester en état "Terminé" jusqu'à ce que l'utilisateur revient a la page tableau, ainsi il pourra voir la carte de recompense, confetti, le train avancé a la derniere station, les jetons completés, etc. bref, tout ce qui est prevu a la fin de session.

---

## 🌍 <font color="#00b050">6. UI Glitch (Cycle de vie) : Clés de composant visibles au logout</font>

**Statut :** À corriger 🟢 | **Type :** React Lifecycle / Auth State | **Concerne** : General

- **Comportement actuel :** Intermittent. Lors de la déconnexion, la page Édition re-rend la navbar avec les variables brutes (`nav.personalization`, `nav.createAccount`), au lieu d'un rendu propre. Un rafraîchissement manuel corrige le tir.

- **Impact UX :** Effet "flash" (glitch) très inélégant qui donne une sensation de fragilité à l'application juste après une action de sécurité.

- **Directive Claude (AUDIT & ADAPT) :** Le problème vient probablement d'une **désynchronisation du cycle de vie React lors du `signOut`**.
  1. Inspecte la fonction de déconnexion.
  2. Cherche une _race condition_ : l'état local (Zustand/Context) est probablement purgé _avant_ que la redirection ou le rechargement de la page n'ait abouti, forçant un re-rendu de la Navbar sans son contexte de langue ou de données.
  3. Modifie l'ordre d'exécution : assure-toi d'utiliser `router.push()` ou `router.refresh()` proprement et d'attendre la résolution de l'UI avant de détruire brutalement l'état visuel.

---

## 📱 7. Gestion Appareils : Multiplications des sessions et UI non contrainte

**Statut :** À corriger 🟢 | **Type :** Logique Auth / UI | **Concerne** : Admin

- **Comportement actuel :** 1. La liste des appareils actifs s'allonge à l'infini (aucun scroll limité). 2. Chaque connexion enregistre un _nouvel_ appareil (ex: "Enregistré le 3 avril"), même si l'utilisateur se connecte depuis le _même_ navigateur/appareil qu'hier.

- **Analyse Architecture :** Le backend (Supabase) enregistre logiquement chaque _session_ d'authentification. Cependant, pour éviter que la DB et l'UI ne se remplissent de doublons pour le même appareil physique, il faut une empreinte locale (Device ID)

- **Directive Claude (AUDIT & ADAPT) :** 1. **UI en priorité :** Modifie le conteneur `profil-card-devices`. Ajoute une contrainte CSS pour afficher au maximum ~5 éléments visuellement, avec un `overflow-y: auto` pour faire défiler le reste (utilise les tokens Sass pour les espacements et la scrollbar). 2. **Logique d'empreinte (Device tracking) :** Analyse comment le front appelle l'insertion de l'appareil. Le front doit générer un `deviceId` unique (ex: un UUID) lors de la première connexion de l'appareil, le stocker en `localStorage` (de manière persistante), et l'envoyer à chaque reconnexion pour faire un `UPSERT` (mettre à jour la date de dernière connexion) plutôt qu'un `INSERT` systématique créant des doublons.

---

## 🧹 8. Dette Technique : Centralisation du mapping de statut

**Statut :** À vérifier 🟡 | **Type :** Refacto / DRY (Don't Repeat Yourself) | **Concerne** : General

- **Comportement actuel (suspecté) :** Le composant `Abonnement.tsx` utilise un utilitaire ou mapping centralisé (ex: `statusDisplay`) pour afficher le rôle. En revanche, `Profil.tsx` gère cela via un ternaire inline fragile (`loading ? '⏳' : isActive ? status : 'Free'`), et `UserMenu.tsx` a peut-être sa propre logique.

- **Impact Architecture :** Micro-dette. Le mapping visuel des statuts (Visitor, Free, Abonné, Admin) doit être centralisé à un seul endroit pour garantir une UI prévisible et faciliter les traductions.

- **Directive Claude (AUDIT & ADAPT) :** 1. Inspecte les fichiers `Profil.tsx`, `UserMenu.tsx` et `Abonnement.tsx`. 2. Si `Profil.tsx` ou `UserMenu.tsx` utilisent encore des ternaires inline pour l'affichage textuel du statut de l'utilisateur, supprime-les. 3. Migre cet affichage pour utiliser le même consommateur/utilitaire (`statusDisplay` ou équivalent) que `Abonnement.tsx`. 4. Si tu constates que cela a déjà été corrigé, ne modifie rien et passe au point suivant.

---
