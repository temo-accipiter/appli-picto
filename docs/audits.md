# 🛡️ Lot 2 : Sécurité, Quotas et Nettoyage Legacy

**Règles strictes pour cette phase :**

1. **Contrat DB-first :** Se référer aux invariants DB existants. Ne PAS inventer de nouvelles règles métier.
2. **State Manager :** Toujours interdit de migrer vers Zustand ou de réécrire l'architecture d'état. (Autorisation unique de modifier la valeur _initiale_ du hook Timeline pour le Ticket 4).
3. **Zéro CSS :** Ne pas toucher au design.

---

## 🪣 1. Backend/Storage : Échec d'upload Avatar

**Concerne :** Édition Profil / Avatar

- **Problème :** Lors de l'upload d'un avatar, une erreur `Bucket not found` se produit.
- **Directive (ADAPT) :** Inspecte la fonction d'upload (ex: `uploadAvatar` ou appel Supabase storage). Le bucket actuel appelé n'existe pas. Modifie-le pour pointer vers le bucket officiel : `personal-images` (vérifie le chemin d'upload requis par le backend).

## 🔓 2. Quotas : Cartes grisées à tort (Création de séquence)

**Concerne :** Modale de création de séquence (Rôle: Free)

- **Problème :** En compte Free, toutes les cartes de la modale de création de séquence sont grisées/désactivées.
- **Directive (ADAPT) :** Localise la condition qui grise les cartes. Un compte Free a le droit de composer des séquences avec les cartes de la banque publique. Le front doit bloquer la _création de nouvelles cartes personnelles_, mais les cartes dont l'origine est `bank-images` doivent être sélectionnables.

## 🛡️ 3. Formulaires : Contrat de validation (Nom enfant vs Pseudo)

**Statut :** À vérifier 🟡 | **Type :** DB-First strict / Zod | **Concerne** : Compte authentifié

- **Comportement actuel :** Les règles de saisie (longueur, caractères interdits) du champ de création du Profil Enfant ne semble pas vérifié formellement côté client par rapport à la DB.

- **Impact Produit :** Risque d'erreur 500 si l'utilisateur envoie une donnée que la base de données refuse (violation de contrainte `CHECK`).

- **Directive Claude (AUDIT & ADAPT) :** 1. Observe les règles pour le champ pseudo, pour identifier les contraintes exactes (longueur max, regex/caractères autorisés).

## 👻 4. Dette Legacy : Le bouton "+récompense" fantôme

**Concerne :** Édition Timeline (Visitor par défaut)

- **Problème :** Le bouton `+recompense` clignote brièvement. Il ne devrait plus exister, car la timeline par défaut doit toujours comporter 1 étape + 1 récompense verrouillée.
- **Directive (ADAPT) :**
  1. Supprime définitivement le composant du bouton `+recompense` (ex: `AddRewardButton`) de tout le code.
  2. Localise l'initialisation de la Timeline par défaut pour un nouveau visiteur (probablement dans un hook context ou utils). Modifie la **valeur initiale** pour qu'elle contienne strictement deux éléments : `[ { type: 'step' }, { type: 'reward', locked: true } ]`.
