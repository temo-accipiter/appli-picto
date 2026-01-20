# **Refonte UX – Planning Visuel & Économie de Jetons**

## **1\. Contexte et Objectifs**

Cette refonte vise à faire évoluer l’application vers un système hybride de Planning Visuel et d’Économie de Jetons, inspiré des supports physiques utilisés quotidiennement par les personnes autistes (pictogrammes, séquences, jetons), tout en respectant les contraintes du numérique et une approche mobile-first.

Les objectifs principaux sont :

- Séparer clairement l’organisation (planning) de la motivation (jetons).
- Offrir une expérience prévisible, rassurante et non frustrante pour l’enfant.
- Donner à l’adulte un contrôle total de la séquence, sans exposition de cette complexité côté enfant.
- Permettre une évolution future (nouveaux plans, quotas, usages, rôles) sans refonte structurelle.

---

## **2\. Principes UX Fondamentaux**

- **Clarté cognitive** : une seule action principale par écran.
- **Prévisibilité** : ce qui est fait reste visible.
- **Découplage** :
  - L’adulte organise et configure (Page Édition).
  - L’enfant exécute et progresse (Page Tableau).
- **Mobile-first** : toutes les interactions critiques doivent être simples sur smartphone.
- **Accessibilité autisme** :
  - Pas de disparition brutale d’éléments.
  - Animations séquencées et lisibles.
  - États visuels clairs (Maintenant / À venir / Fini).

---

## **3\. Modèle Conceptuel (Synthèse)**

- **Carte**  
   Une carte représente un concept visuel unique (image \+ nom).  
   Elle est neutre : ni tâche, ni récompense par nature.
- **Slot**  
   Un slot est une position dans une séquence (Étape ou Récompense).  
   C’est le slot qui donne le rôle à la carte.
- **Timeline (Séquence)**  
   Une suite ordonnée de slots définie par l’adulte, représentant une activité ou une routine.h

---

## **4\. Page Édition – Vue d’ensemble**

La page Édition est divisée en deux zones principales :

- **Zone Haute : La Séquence (Timeline)**
- **Zone Basse : La Bibliothèque de Cartes**

La Timeline est **sticky** (fixée en haut de l’écran) afin de rester visible en permanence pendant la sélection des cartes.

---

## **5\. Zone Haute – La Séquence (Timeline)**

### **5.1 Structure générale**

- Timeline horizontale, scrollable si nécessaire.
- Toujours visible (sticky).
- Composée de slots successifs.

### **5.2 Slots initiaux**

À l’ouverture :

- 1 **Slot Récompense** (isolé visuellement, couleur violet clair).
- 1 **Slot Étape**.

### **5.3 Gestion des slots**

- Un bouton ➕ permet d’ajouter dynamiquement des slots Étapes supplémentaires.
- Chaque slot comporte :
  - Un titre automatique : _Étape 1_, _Étape 2_, etc.
  - Une zone image (centrale).
  - Un nom affiché sous l’image.
  - Un bouton supprimer (coin supérieur droit), sauf contraintes décrites plus bas.
- Si le nombre de slots dépasse l’écran visible, un scroll horizontal est activé.

---

## **6\. Zone Basse – Bibliothèque de Cartes**

### **6.1 Contenu**

- Grille existante conservée.
- Bibliothèque \= banque de cartes (pour Visitor/Free), \+ cartes utilisateur (uniquement Abonné/Admin).
- Scroll vertical fluide.

### **6.2 Carte d’édition (entité unique)**

Il n’existe plus de distinction technique entre “tâche” et “récompense”. Seuls les utilisateurs **Abonné/Admin** peuvent créer des cartes utilisateur (composant BaseCard) via ModalAjout. Une fois créé, une carte se place dans la bibliothèque (zone basse).

La carte dans la bibliothèque contient :

- Une image (obligatoire, 1 carte \= 1 image).
- Un nom modifiable.
- Un sélecteur de catégorie (par défaut : “pas de catégorie”).
- Un bouton supprimer.
- Un checkbox unique :  
   “Inclure cette carte dans la séquence (timeline)”
- Un bouton “Créer une séquence” (ou si la séquence est déjà créer, “modifier une séquence”)

---

## **7\. Ajout des cartes dans la Timeline**

### **7.1 Mécanisme principal (mobile-first)**

- Lorsque l’utilisateur coche le checkbox sur la carte de la bibliothèque (zone basse) :
  - La carte est ajoutée automatiquement dans le premier slot “Étape” vide.
  - Jamais dans le slot Récompense par défaut.
- Feedback immédiat :
  - Micro-animation.
  - Légère vibration (mobile).
- La Timeline sticky permet de visualiser instantanément l’ajout.

### **7.2 Réorganisation**

- Le **drag & drop est autorisé uniquement dans la Timeline** :
  - Entre slots Étapes.
  - Vers ou depuis le slot Récompense.
- Aucun drag & drop dans la bibliothèque (zone basse).

---

## **8\. Gestion des Jetons**

### **8.1 Principe fondamental**

Les jetons ne sont **pas définis sur les cartes**, mais sur les **slots “Étapes”**.

### **8.2 Slots Étapes**

Chaque slot Étape possède :

- Un sélecteur de jetons (0 à 5).
  - 0 \= planning visuel simple.
  - ≥1 \= économie de jetons active pour cette étape.

### **8.3 Conséquences UX**

- Une même carte peut :
  - Rapporter des jetons dans une séquence.
  - N’en rapporter aucun dans une autre.
- Si **tous les slots Étapes sont à 0 jeton** :
  - La séquence est considérée comme un **Planning Visuel pur**.
  - La grille de jetons n’apparaît pas dans le Tableau.
  - La récompense devient optionnelle.

---

## **9\. Page Tableau (Vue Enfant)**

### **9.1 Structure générale**

- Le Timeline définie en Édition est affichée de manière linéaire.
- Aucune modification d’ordre possible.
- Scroll possible si la séquence dépasse l’écran.

**9.2 États Visuels de TimeLine dans la page Tableau**

### **Maintenant (Focus)**

- Carte centrale, agrandie.
- Interaction active uniquement sur cette carte.

### **À venir (Anticipation)**

- Cartes suivantes visibles, plus petites.
- Rassurent sur la suite sans distraire.

### **Fini (Satisfaction)**

- Cartes terminées :
  - Restent visibles dans la timeline.
  - Deviennent grisées / opacifiées.
- Elles ne disparaissent jamais (prévention de frustration).

**9.3 Carte dans TimeLine Tableau (composant TableauCard) – Détails Visuels**

De haut en bas :

- Nom fixe.
- Image avec une légère rotation horaire au survol (hover).
- Checkbox de validation.

Au moment de la validation :

- La carte passe à l’état _Fini_.
- La carte suivante devient centrale.

**9.4 Affichage et Animation des Jetons**

- Les jetons associés au slot “Étape” sont visibles sur la carte dans TimeLine Tableau (empilés verticalement sur le coté bord).
- Une grille de jetons est affichée au-dessus de la timeline :
  - Nombre de cases \= somme des jetons des slots Étapes.

### **9.5 Animation de validation**

1. Validation de la carte centrale.
2. Pause très courte.
3. Les jetons se détachent et volent vers la grille du header (framer motion).
4. Le focus passe automatiquement à la carte suivante.

**9.6 carte Récompense dans Tableau (composant )**

- Si le slot Récompense est rempli :
  - La carte récompense apparaît à droite de la grille de jetons.
  - Elle est grisée tant que tous les jetons ne sont pas collectés.
- Une fois la grille complète :
  - Animation de déblocage (couleur, agrandissement, confettis).

---

## **10\. Règles de Verrouillage et Cohérence**

- Toute modification d’ordre ou de contenu :
  - Se fait uniquement dans la Page Édition.
- Les cartes déjà validées dans le Tableau :
  - Apparaissent grisées dans la Timeline Édition.
  - Ne sont ni déplaçables, ni supprimables.
  - Affichent un badge “Déjà fait”.

---

## **11\. Quotas – Nouveau Modèle**

### **Principe**

Les quotas ne portent ni sur les tâches, ni sur les récompenses, mais uniquement sur les cartes, car ce sont les images qui consomment des ressources (stockage, bande passante).

### **Types de quotas**

- **Quota de stock**  
   Nombre maximum total de cartes possédées par l’utilisateur.  
   Supprimer une carte libère immédiatement un slot.
- **Quota mensuel**  
   Nombre maximum de nouvelles cartes créées par mois.  
   Modifier une carte existante ne consomme aucun quota.

---

## **12\. Évolutivité des Comptes et Plans**

Les quotas ne sont pas liés directement à un rôle utilisateur, mais à un plan de compte.

Un plan définit :

- Le quota de stock.
- Le quota mensuel.

Les rôles visibles (Free, Abonné, etc.) sont des représentations commerciales d’un plan.

Cette architecture permet :

- D’ajuster facilement les quotas (ex : passer de 50 à 100 cartes).
- D’ajouter de nouveaux plans (à l’avenir) sans modifier la logique fonctionnelle :
  - Abonné+
  - Famille
  - Établissement / Entreprise
  - Autres usages futurs

---

# **18\. Séquençage – Décomposition d’une tâche complexe**

## **18.1 Définition et objectif**

Le Séquençage permet de décomposer une carte de tâche complexe en une suite ordonnée de micro-étapes visuelles simples, afin d’aider l’enfant à comprendre _comment faire_ une action.

- Le Planning visuel répond à : _“Qu’est-ce que je fais ?”_
- L’Économie de jetons répond à : _“Pourquoi je le fais ?”_
- Le Séquençage répond à : _“Comment je le fais ?”_

Le séquençage est optionnel : une carte peut être réalisée avec ou sans séquence, selon les capacités du moment de l’enfant.

**18.2 Principe fondamental**

- Une séquence est une timeline dédiée, composée de slots Étapes uniquement.
- Elle n’inclut jamais :
  - de slot Récompense,
  - de jetons,
  - de logique de validation automatique.
- Une séquence est rattachée à une carte (carte parent).
- Une carte peut avoir 0 ou 1 séquence associée.

**18.3 Création d’une séquence (Page Édition)**

### **Accès:**

- Sur chaque carte de la bibliothèque, l’adulte dispose d’un bouton “Créer une séquence”.
- Par défaut, aucune carte n’a de séquence.
- Cliquer sur ce bouton ouvre un mode Séquençage dédié.
- Si la séquence est déjà créée, le bouton devient “modifier la séquence”.
- Supprimant toutes les cartes dans la séquence \= supprimer la séquence

**Mode Séquençage (réutilisation de la Timeline)**

Le mode Séquençage réutilise le même composant Timeline que le planning visuel, avec des règles spécifiques :

| Élément         | Comportement                       |
| --------------- | ---------------------------------- |
| Slots           | Slots Étapes uniquement            |
| Slot Récompense | ❌ Désactivé / non visible         |
| Jetons          | ❌ Non visibles                    |
| Drag & drop     | ✅ Autorisé dans toute la timeline |
| Checkbox carte  | ❌ Non utilisé                     |
| Sticky timeline | ✅ Oui                             |

Structure identique, logique différente et pas de nouveau composant à apprendre.

La création et l’édition d’une séquence ne s’effectuent pas via un modal. Elles utilisent un mode Séquençage dédié au sein de la page Édition, reposant sur la même structure de timeline et de bibliothèque de cartes, afin de garantir une continuité visuelle, cognitive et technique.

## **Comportement exact :**

### **Accès:**

- Bouton sur la carte :  
   **Créer / Modifier une séquence**
- Action :
  - La page Édition reste affichée
  - Le mode Séquençage est activé

**Ce qui change visuellement**

#### **En haut de l’écran**

- La Timeline passe en mode Séquence
- Indication claire :  
   “Séquence de : _Se laver les mains_”
- Slot Récompense :
  - masqué ou désactivé
- Slots Étapes :
  - visibles
  - vides au départ

#### **En bas de l’écran**

- La Bibliothèque de cartes reste visible
- Interaction identique à l’édition classique :
  - scroll vertical
  - checkbox “Ajouter”
  - feedback immédiat

Aucun nouvel apprentissage pour l’utilisateur.

**Ajout des étapes (très important)**

Quand l’adulte :

- coche une carte dans la bibliothèque

la carte est ajoutée :

- dans le premier slot Étape vide
- jamais ailleurs
- sans popup
- sans confirmation supplémentaire

Puis :

- il réorganise les étapes directement dans la timeline (DnD)
- exactement comme pour le planning visuel

**Sortie du mode Séquençage**

- Bouton clair en haut :  
   “Retour à l’édition”
- Le contexte se ferme
- La séquence est sauvegardée automatiquement

Pas de bouton “Valider” lourd  
Pas de modal à fermer  
Pas de risque de perte de données

**Ajout des étapes de séquence**

Les **étapes de séquence** proviennent **exclusivement des cartes existantes**.

Concrètement :

- L’adulte **crée d’abord ses cartes** (images \+ noms).
- En mode Séquençage :
  - Il coche une carte dans la bibliothèque
  - Elle s’ajoute dans le **premier slot Étape vide**
- Le drag & drop permet ensuite :
  - de réorganiser l’ordre,
  - d’ajuster finement la séquence.  
     **Une carte peut donc être utilisée :**
- comme tâche,
- comme récompense,
- comme étape de séquence,
- ou les trois selon le contexte.

### **le “Séquençage” doit être déclenché depuis la CARTE (bibliothèque), pas depuis le slot.**

**Pourquoi (produit \+ cognition TSA \+ architecture) :**

- Une **séquence est une propriété d’un “concept”** (“Se laver les mains”) → donc **attachée à la carte** (template réutilisable).

- Un **slot est une instance** dans une timeline → il ne doit pas porter un “éditeur de séquence”, sinon tu mélanges _template_ vs _instance_ (dette conceptuelle \+ UX confuse).

- A la différence de séquence, les **jetons** sont bien sur les **slots** (contexte dépendant) — et c’est exactement le bon précédent : _même carte, jetons différents selon la timeline_.

**18.4 Affichage du séquençage (Page Tableau)**

### **18.4.1 Affichage conditionnel**

- Le séquençage **n’est jamais affiché automatiquement**.
- Il est visible **uniquement sous la carte actuellement au focus**.
- Un bouton explicite est affiché sur la carte :

**“Voir les étapes”**

Cela respecte :

- l’autonomie progressive,
- l’évitement de surcharge cognitive.

**18.4.2 Comportement UX**

Lorsque l’adulte ou l’enfant active le séquençage :

- Une **mini-timeline** apparaît sous la carte centrale.
- Chaque étape affiche :
  - l’image,
  - le nom.
- **Aucun checkbox** sur les étapes.  
   L’enfant :
- observe,
- exécute,
- puis valide la carte principale quand il est prêt.

**18.5 Validation et cohérence cognitive**

- Les étapes de séquence **ne valident jamais automatiquement** la carte.
- **Une seule validation existe** : celle de la carte principale.
- Cela évite :
  - la confusion,
  - la double validation,
  - la pression excessive.

Le séquençage est un **support**, pas une contrainte.

**18.6 Règles de cohérence et limites**

- Une séquence :
  - ne génère jamais de jetons,
  - n’a pas d’état _Fini / À venir_ propre,
  - n’apparaît jamais dans le planning principal.
- Modifier une carte utilisée dans une séquence :
  - met à jour automatiquement l’étape correspondante.
- Supprimer une carte utilisée comme étape :
  - nécessite une confirmation explicite.

**18.7 Synthèse (analogie finale)**

- **Planning visuel** → _l’agenda_
- **Économie de jetons** → _la motivation_
- **Séquençage** → _la notice étape par étape_

Sans le séquençage :

même avec le temps et la récompense, certaines tâches restent inaccessibles.

**18.8 Impact technique (rappel)**

- Aucun nouveau type d’entité :
  - toujours **Carte / Slot / Timeline**
- Une séquence \= une timeline avec un **mode \= "sequence"**
- Réutilisation maximale :
  - composants,
  - logique DnD,
  - persistance cloud.

---

**19\. Rôles et Quotas – Nouveau Modèle**

### **Principe**

Les quotas ne portent **ni sur les tâches, ni sur les récompenses**, mais uniquement sur les **cartes**, car ce sont les images qui consomment des ressources (stockage, bande passante).

### **Types de quotas**

- **Quota de stock**  
   Nombre maximum total de cartes possédées par l’utilisateur.  
   Supprimer une carte libère immédiatement un slot.
- **Quota mensuel**  
   Nombre maximum de nouvelles cartes créées par mois.  
   Modifier une carte existante ne consomme aucun quota.

---

## **20\. Évolutivité des Comptes et Plans**

Les quotas ne sont **pas liés directement à un rôle utilisateur**, mais à un **plan de compte**.

Un plan définit :

- Le quota de stock.
- Le quota mensuel.

Les rôles visibles (Free, Abonné, etc.) sont des **représentations commerciales** d’un plan.

Cette architecture permet :

- D’ajuster facilement les quotas (ex : passer de 50 à 100 cartes).
- D’ajouter de nouveaux plans à l'avenir, sans modifier la logique fonctionnelle :
  - Abonné+
  - Famille
  - Établissement / Entreprise
  - Autres usages futurs

**Plans Initiaux**

|  Rôle   | Description                                                 | Accès                                                                             |
| :-----: | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Visitor | Visiteur sans compte (guest) \= **sauvegarde localstorage** | Banque prédéfinie lecture seule, pas de création. Pages edition & tableau         |
|  Free   | Free \= “compte gratuit” \= **sauvegarde cloud**            | Banque prédéfinie lecture seule, pas de création. Pages edition, tableau & Profil |
| Abonné  | Utilisateur avec compte \+ Stripe actif                     | Création cartes (avec un quota défini plus bas), toutes fonctionnalités           |
|  Admin  | Administrateur système                                      | Accès complet, metrics, gestion globale                                           |

|  Rôles  | Quota de stock | Quota mensuel |
| :-----: | :------------: | :-----------: |
| Visitor |  pas concerné  | pas concerné  |
|  Free   |  pas concerné  | pas concerné  |
| Abonné  |   50 cartes    |  100 / mois   |
|  Admin  |    Illimité    |   Illimité    |

Dorénavant, les rôles de l’application seront simplifiés en 4 catégories principales :

1. **Visitor** :
   - Ce rôle correspond à un utilisateur qui n’a pas encore ouvert un compte.
   - Il peut utiliser la banque de cartes prédéfinies, sans pouvoir créer de nouvelles cartes.
   - Le rôle Visitor ne correspond pas à un compte utilisateur authentifié. L’utilisateur Visitor n’a pas de profil, ni de données persistées.
   - Il pourra donc choisir les cartes à placer dans les slots, ensuite les utiliser comme un planning visuel, économie de jeton et séquençage. sauvegarde localstorage.
   - Il ne pourra pas accéder à la page profil.
   - Lorsqu’il se trouve à la page édition, il voit la page comme les autres rôles, sauf le navbar, qui est différent. Dans navbar se trouve:
     1. un bouton “tableau”
     2. un bouton “paramètres”
     3. deux boutons de langues fr/en
     4. un bouton “se connecter” (ca redirige vers la page login)
   - Lorsqu’il clique sur les boutons “ajouter une tâche” ou “gérer catégories”, il verra apparaître PersonalizationModal (qui existe déjà dans le projet), et qui l’invite à créer un compte et prendre un abonnement.
2. **Free :**
   - Ce rôle correspond à un utilisateur qui a ouvert un compte.
   - Il peut utiliser la banque de cartes prédéfinies, sans pouvoir créer de nouvelles cartes.
   - Il pourra donc choisir les cartes à placer dans les slots, ensuite les utiliser comme un planning visuel, économie de jeton et séquençage. sauvegarde serveur.
   - Il va accéder à la page Profil et pourra donc modifier ces données personnelles.
   - Lorsqu’il clique sur les boutons “ajouter une tâche” ou “gérer catégories”, il verra apparaître PersonalizationModal (qui existe déjà dans le projet).
3. **Abonné** :
   - Abonné \= utilisateur qui a un compte \+ abonnement actif. Un compte peut exister sans abonnement (Free).
   - Il a accès à la banque de cartes, comme le Visitor, mais en plus, il peut créer ses propres cartes (sous condition de quotas)
4. **Admin** : Peut faire tout.

- **\*\*Note évolutivité\*\*** : Le modèle permet d'ajouter d'autres rôles futurs (ex: compte famille, compte entreprise, compte abonné pro, etc.) sans refonte structurelle. Pour l'instant, seuls **\*\*Visitor / Free / Abonné / Admin\*\*** sont implémentés. **\*\***
- **Note pour refacto Admin\*\*** : La partie Admin du projet doit être adaptée pour refléter cette simplification des rôles. Les composants existants (permissions, métriques, gestion utilisateurs) doivent être mis à jour pour utiliser uniquement Visitor / Free / Abonné / Admin.
- La banque de cartes sera donc une collection de cartes prédéfinies, accessible à tous les utilisateurs. Les abonnés, à la différence de Visitor, pourront ajouter leurs propres cartes, ce qui enrichira l’expérience et la personnalisation de l’application.
- La **PersonalizationModal doit être différente selon le statut** :

#### **Visitor :**

Message attendu (exemple fonctionnel) :

_“Pour créer tes propres tâches et catégories, crée un compte et abonne-toi.”_  
 Boutons :

- “Créer un compte”
- “Plus tard”

#### **Free :**

Message attendu :

_“Ton compte gratuit te permet de sauvegarder tes plannings._  
 _Pour créer tes propres tâches et catégories, passe à la version Premium.”_  
 Boutons :

- “Passer Premium”
- “Plus tard”

❌ **Interdit** :

- message culpabilisant
- modal bloquante
- obligation de s’abonner pour continuer à utiliser l’existant

### **Scénarios offline / stress**

- En mode hors-ligne, Free continue localement et synchronise dès que possible.
- Pas de perte, pas de blocage.
- Les erreurs réseau ne sont pas montrées à l’enfant.
