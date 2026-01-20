# PRODUCT MODEL — Appli-Picto

Version consolidée (sans implémentation technique)

---

## 1. Objectif du produit

Appli-Picto est une application psycho‑éducative destinée aux enfants autistes,
utilisée avec l’accompagnement d’un adulte (parent, éducateur, professionnel).

Objectifs principaux :

- Réduire l’anxiété liée aux transitions
- Favoriser l’autonomie
- Soutenir la motivation
- Éviter toute surcharge cognitive

L’application transpose en numérique des outils habituellement physiques :

- Planning visuel
- Économie de jetons
- Séquençage de tâches

---

## 2. Principes structurants (non négociables)

- Simplicité d’usage immédiate
- Prévisibilité des états
- Pas de perte de données sans explication
- Les règles critiques sont garanties côté serveur
- Aucune fonctionnalité ne doit dépendre d’un jargon technique visible utilisateur

---

## 3. Statuts utilisateurs (vision produit)

### Visitor (invité)

- Non authentifié
- N’existe pas en base de données
- Accès à la banque de cartes existantes
- Plannings stockés uniquement en local (localStorage)
- Aucune persistance cloud
- Aucune écriture serveur

### Free (compte gratuit)

- Utilisateur authentifié
- Dispose d’un profil
- Accès identique au Visitor sur le contenu :
  - Banque de cartes uniquement
  - Pas de cartes personnalisées
- Accès à la page Profil et préférences
- Plannings sauvegardés de manière sécurisée en cloud
- Non concerné par les quotas de cartes

### Abonné (compte premium)

- Utilisateur authentifié avec abonnement actif
- Accès complet :
  - Banque de cartes
  - Création de cartes personnalisées
- Quotas applicables aux cartes utilisateur
- Plannings persistés en cloud

### Admin

- Utilisateur interne
- Accès illimité
- Outils d’administration
- Aucune limitation fonctionnelle

---

## 4. Règles d’accès et invariants produit

Ces règles sont exprimées au niveau produit et doivent être garanties côté serveur.

- Un Visitor n’écrit jamais en base de données.
- Un compte Free ne peut jamais créer de carte personnalisée.
- La création de cartes utilisateur est réservée aux comptes abonnés et administrateurs.
- Les quotas ne s’appliquent qu’aux cartes utilisateur.
- Les cartes de la banque sont visibles par tous les utilisateurs.
- Les cartes personnalisées ne sont visibles que par leur créateur et les administrateurs.
- Les plannings sont :
  - locaux pour les Visitors
  - persistés en cloud pour Free et Abonné

---

## 5. Entités conceptuelles

### Carte

Objet visuel atomique composé :

- d’une image
- d’un nom

Le rôle d’une carte (tâche, récompense, étape) dépend uniquement du contexte
dans lequel elle est utilisée, jamais de la carte elle‑même.

Deux types conceptuels :

- Carte banque (globale, non modifiable)
- Carte utilisateur (personnalisée, soumise aux règles d’accès)

### Planning (Timeline)

Organisation visuelle d’une suite de cartes dans un ordre donné.

Caractéristiques :

- Appartient à un utilisateur
- Peut être actif ou inactif
- Peut être modifié sans recharger l’application
- Supporte la persistance cloud selon le statut utilisateur

### Séquençage

Décomposition d’une tâche complexe en étapes simples et ordonnées.
Le séquençage repose sur les mêmes briques que les plannings.

---

## 6. Quotas (vision produit)

Les quotas ne concernent que les cartes personnalisées.

- Visitor : non concerné (pas de création)
- Free : non concerné (création interdite)
- Abonné :
  - Limite de stockage
  - Limite de création mensuelle
- Admin : illimité

Les quotas sont conçus comme une protection contre la surcharge,
pas comme un mécanisme punitif.

---

## 7. Évolutions prévues (hors périmètre immédiat)

- Comptes familiaux / multi‑adultes
- Partage de plannings
- Mode établissement
- Bibliothèques spécialisées
- Outils d’analyse anonymisés

Ces évolutions ne doivent pas remettre en cause les invariants définis ci‑dessus.

---

## 8. Séparation des responsabilités documentaires

- Ce document décrit le **quoi** et le **pourquoi**
- Les choix techniques (base de données, RLS, outils) sont documentés ailleurs
- Aucune implémentation technique n’est figée ici

---

Fin du document.
