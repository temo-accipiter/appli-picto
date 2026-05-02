#

[Contexte & objectifs](#contexte-&-objectifs)

[Principes UX TSA & invariants transversaux](#principes-ux-tsa-&-invariants-transversaux)

[Glossaire / Modèle conceptuel commun](#glossaire-/-modèle-conceptuel-commun)

[Rôles & Contextes](#rôles-&-contextes)

[Cartes & Catégories](#cartes-&-catégories)

[Pages Edition / Tableau](#pages-edition-/-tableau)

[Planning visuel](#planning-visuel)

[Économie de jetons](#économie-de-jetons)

[Séquençage](#séquençage)

[Multi-enfants & Multi-appareils](#multi-enfants-&-multi-appareils)

[Persistance / Sync / Offline](#persistance-/-sync-/-offline)

[Quotas & Plans](#quotas-&-plans)

[Évolutivité Des Comptes & Plans](#évolutivité-des-comptes-&-plans)

[Annexes : messages verrouillés, modales, wording](#annexes-:-messages-verrouillés,-modales,-wording)

# **Contexte & objectifs** {#contexte-&-objectifs}

### **Contexte**

Cette refonte vise à faire évoluer l’application vers un **système hybride de Planning Visuel et d’Économie de Jetons**, inspiré des supports physiques utilisés quotidiennement par les personnes autistes  
 (pictogrammes, séquences, jetons).

Cette transposition numérique respecte :

- les contraintes du mobile,
- l’usage réel terrain,
- et les exigences de stabilité émotionnelle propres aux utilisateurs TSA.

---

### **Objectifs principaux**

La refonte a pour objectifs **non négociables** de :

- **Séparer strictement** :
  - l’organisation de l’activité (planning visuel),
  - de la motivation (économie de jetons).
- Offrir à l’enfant une expérience :
  - prévisible,
  - rassurante,
  - non frustrante.
- Donner à l’adulte :
  - un contrôle total de la configuration,
  - sans jamais exposer cette complexité côté enfant.
- Permettre l’évolution future du produit :
  - nouveaux plans,
  - quotas,
  - usages élargis,  
     **sans refonte structurelle**.

👉 Ces objectifs priment sur toute considération technique ou esthétique.

---

# **Principes UX TSA & invariants transversaux** {#principes-ux-tsa-&-invariants-transversaux}

### **Portée**

Les principes définis dans ce chapitre sont **transversaux**.

Ils s’appliquent :

- à l’ensemble des écrans,
- à tous les flux,
- à toutes les fonctionnalités,
- et priment sur toute décision d’implémentation.

Aucune fonctionnalité ne peut être implémentée si elle viole un de ces invariants.

---

### **Invariants UX fondamentaux**

#### **Clarté cognitive**

- Une seule action principale par écran.
- Aucun écran ne doit nécessiter une prise de décision multiple.

---

#### **Prévisibilité**

- Ce qui est fait **reste visible**.
- Aucun état ne disparaît sans transition claire.
- Aucune progression n’est perdue ou masquée.

---

#### **Découplage des rôles (principe structurant)**

- L’adulte :
  - organise,
  - configure,
  - prépare.  
     _(Page Édition)_
- L’enfant :
  - exécute,
  - progresse,
  - valide.  
     _(Page Tableau)_

👉 Ce découplage est strict et non négociable.

---

#### **Mobile-first réel**

- Toutes les interactions critiques doivent être :
  - utilisables à une main,
  - compréhensibles immédiatement,
  - sans gestes complexes.

---

#### **Accessibilité TSA (transversal)**

- Aucune disparition brutale d’éléments.
- Animations :
  - séquencées,
  - lisibles,
  - jamais agressives.
- États visuels toujours explicites :
  - **Cochée (Fini)**
  - **Décochée (Active)**

> _Décision produit du 2026-05-01 — La distinction "Maintenant / À venir" est supprimée. Validation libre, sans focus imposé (souplesse pédagogique)._

---

### **Interdictions explicites**

Il est interdit :

- d’introduire une surprise visuelle,
- de masquer une progression,
- de bloquer l’enfant pour des raisons techniques,
- d’exposer des notions d’abonnement, de quota ou de configuration côté enfant.

---

### **Effet contractuel**

Ces principes constituent la **base contractuelle** du produit.

Tout chapitre suivant :

- doit être cohérent avec ces invariants,
- ne peut pas les contredire,
- ne peut pas les affaiblir implicitement.

---

# **Glossaire / Modèle conceptuel commun** {#glossaire-/-modèle-conceptuel-commun}

**Objectif du glossaire**

Ce glossaire définit l’ensemble des termes métier utilisés dans le document.

Chaque terme :

- possède une définition unique
- est utilisé toujours dans le même sens
- ne doit jamais être interprété différemment selon le contexte.

👉 Ce glossaire fait foi pour :

- la conception UX
- l’implémentation front
- la modélisation DB
- les règles de synchronisation et de quotas.

---

Termes liés aux utilisateurs et comptes

**Visitor**

Utilisateur non authentifié.

- Ne possède pas de compte cloud.
- Dispose d’un profil enfant local implicite unique.
- Utilisation mono-appareil.
- Données persistées localement uniquement.
- Aucun quota de plan (limitation structurelle).

---

**Compte utilisateur (propriétaire)**

Compte authentifié servant d’unité propriétaire du système.

- Peut être Free ou Abonné.
- Possède les cartes et catégories.
- Possède les profils enfants.
- Supporte la synchronisation multi-appareils selon le plan.

👉 Il n’existe qu’un seul type de compte technique.

**Fuseau horaire du compte (timezone)**

Le compte possède un fuseau horaire de référence, stocké sur le profil propriétaire : **profiles.timezone** (valeur IANA, défaut `Europe/Paris`).

Il est utilisé pour calculer le début de mois du quota mensuel de cartes (1er jour du mois à 00:00, heure locale du compte).

---

**Statut utilisateur**

Statut fonctionnel associé à un compte ou à un usage.

Statuts existants :

- Visitor
- Free
- Abonné
- Admin

👉 Les statuts définissent des capacités, pas des rôles pédagogiques.

---

**Admin**

Statut réservé au créateur / mainteneur de l’application.

- N’est pas un rôle pédagogique.
- Non visible dans l’UX standard.
- Dispose d’une Page Administration dédiée.

---

**Termes liés aux enfants**

**Profil enfant**

Représentation d’un enfant accompagné dans l’application.  
 Chaque profil enfant possède :

- sa propre timeline active,
- ses propres sessions,
- sa propre progression.

Aucune donnée n’est partagée entre profils enfants.

---

**Profil enfant local implicite**

Profil enfant unique utilisé par un Visitor.

- Créé implicitement.
- Non supprimable.
- Non dupliquable.
- Stocké localement uniquement.

---

**Termes liés aux cartes**

**Carte**

Entité visuelle représentant une action, une tâche ou une récompense.  
 Une carte est définie par :  
 ● une image,  
 ● un nom.

Catégorisation (règle d’affichage bibliothèque)  
 Pour un utilisateur donné, chaque carte visible dans sa bibliothèque est associée à une catégorie de ce même utilisateur (via un mapping).  
 ● Cette association est modifiable à tout moment (select).  
 ● Elle ne modifie pas la carte elle-même : c’est un classement personnel.  
 ● Par défaut, une carte est associée à la catégorie système « Sans catégorie ».

Une carte peut être utilisée dans différents contextes : planning visuel, séquençage, récompense.

---

**Carte de banque**

Carte prédéfinie fournie par l’application.

- Accessible à tous les utilisateurs.
- Ne consomme aucun quota.
- Non modifiable.
- Peut être utilisée dans des timelines ou des séquences.

---

**Carte personnelle**

Carte créée par un utilisateur Abonné ou Admin.

- Appartient au compte utilisateur.
- Consomme un quota.
- Peut être modifiée ou supprimée par son propriétaire.

---

**Carte mère**

Carte principale à laquelle une séquence est rattachée.

- Une carte mère peut avoir une séquence.
- Une carte sans séquence reste une carte classique.

---

**Carte Récompense**

Carte optionnelle placée dans le slot Récompense d’une timeline.  
 Elle :

- n’est jamais cliquable,
- n’est jamais validée par l’enfant,
- est affichée grisée par défaut,
- se débloque visuellement lorsque toutes les étapes sont terminées.

Aucune action n’est requise pour l’activer.

---

**Voir étapes**

Petit bouton du Contexte Tableau permettant d’afficher/masquer la mini-timeline de séquence d’une carte mère, visible sur toute carte mère non encore validée. N’a aucun impact sur la progression.

_Décision produit du 2026-05-01 — Visibilité indépendante du focus (prévisibilité TSA : l’aide visuelle est accessible quand l’enfant en a besoin)._

---

**Termes liés à l’organisation et au planning**

**Timeline**

Structure unique et active représentant l’activité en cours pour un profil enfant.

Elle est composée de slots successifs (Étapes \+ Récompense) et est configurée exclusivement dans la Page Édition.

Un profil enfant ne possède **qu’une seule timeline à la fois**.

---

**Slot**

Emplacement structurel au sein d’une timeline.  
Un slot référence une carte et définit son rôle dans l’activité.

Un slot est une **entité persistante** identifiée par un **UUID** (slot_id), **indépendante de sa position** dans la timeline.

La réorganisation (drag & drop) modifie **uniquement l’ordre d’affichage** (position/ordre), **jamais l’identité** du slot.

Conséquence : l’état “slot validé” et les règles de verrouillage s’appliquent **au slot_id**, pas à un index.

Il existe deux types de slots :

- **Slot Étape** : peut contenir des jetons.
- **Slot Récompense** : optionnel, non cliquable, sans jetons.

---

**Slot Étape**

Slot représentant une étape de la timeline.

- Peut être associé à 0 à 5 jetons.
- 0 jeton \= planning visuel simple.
- ≥1 jeton \= économie de jetons active pour ce slot.

---

**Slot Récompense**

Slot final, contenu optionnel de la timeline.

- Existe toujours dans la structure.
- Peut être vide ou contenir une carte.
- N’a pas de jetons associés.

### ---

**Slot validé**

État temporaire d’un slot Étape dans le contexte d’une session active.  
 Un slot validé correspond à une étape déjà réalisée pendant la session en cours.  
Cet état est réinitialisé à chaque nouvelle session et n’est jamais persistant au-delà de la session.

---

**Termes liés aux sessions et à l’exécution**

**Session**

​​Exécution temporelle d’une timeline active.

Une session représente l’avancement réel de l’enfant dans l’activité.

Une seule session peut être active à la fois pour un profil enfant.

Les sessions sont indépendantes dans le temps et peuvent se succéder pour une même timeline.

---

**Progression**

État d’avancement d’une session.

- Étapes validées ou non.
- Jetons collectés.
- État de la récompense.

👉 La progression n’est jamais stockée sur la timeline.

---

**Cycle de vie d’une Session (contrat)**

Une session suit un cycle de vie strict, unique et non ambigu.

**États**

**Inexistante** : aucune session active pour ce profil enfant.

**Active** : une session existe et peut évoluer.

- **Sous-état “Prévisualisation”** : session Active avec **0 étape validée** (démarrage non effectif).
- **Sous-état “Démarrée”** : session Active avec **≥ 1 étape validée**.

**Terminée** : toutes les étapes sont validées ; récompense débloquée visuellement ; session en lecture seule.

**Création**

● Une session est **créée automatiquement à la première entrée** dans le Contexte Tableau pour une timeline donnée, **uniquement si aucune session active n’existe**.  
 ● Une session nouvellement créée démarre avec **0 étape validée** et **0 jeton collecté**.  
 ● Tant qu’aucune étape n’est validée, la session est en **mode “prévisualisation”** : l’enfant peut voir le Tableau, mais **la session n’est pas considérée comme démarrée**.

**Démarrage effectif (sans bouton Start)**  
 ● Le démarrage effectif de la session intervient **uniquement lors de la première validation** (première checkbox cochée) dans le Contexte Tableau.  
 ● Avant cette première validation :  
 ○ l’adulte peut encore ajuster la timeline et les jetons en Contexte Édition (voir règles de verrouillage).

Prévisualisation” n’est pas un état séparé : c’est **Active** avec progression \= 0 et **démarrage non effectif**.

**Pause / reprise (implicite)**  
Quitter Tableau (navigation, fermeture app, écran verrouillé) **met l’usage en pause** sans changer l’état de la session.  
**Revenir sur Tableau** reprend **la même session** exactement au même point **tant qu’aucune réinitialisation explicite n’a été déclenchée en Édition**.  
Si, pendant l’absence, l’adulte a déclenché une action structurante (ex : “Vider la timeline” qui entraîne réinitialisation), alors l’écran Tableau **ne reflète ce changement qu’au prochain Chargement du Contexte Tableau** (défini au glossaire).

**Persistance de la Prévisualisation (clarification contractuelle)**  
 Dès la première entrée dans le Contexte Tableau, la session **est créée et persistée** avec progression \= 0 (Prévisualisation).

- **Elle est persistée localement immédiatement** (offline-safe).
- **Elle est synchronisée cloud dès que possible** (si utilisateur connecté).  
   Tant qu’aucune étape n’est validée, la session **reste “non démarrée”** (aucun verrouillage lié aux slots validés ne s’applique), mais **elle est bien la session active à reprendre** en cas de fermeture/réouverture.

**Terminaison**

● Une session devient “Terminée” dès que la dernière étape de la timeline est validée.

● Une session terminée est en lecture seule : aucune validation supplémentaire ne peut la modifier.

Redémarrage d’une activité

● Une activité ne redémarre jamais automatiquement.

● Pour recommencer, l’adulte déclenche explicitement une “Réinitialisation de session”

depuis le Contexte Édition.

● La réinitialisation crée une nouvelle session active (progression remise à zéro).

**Comportement post-terminaison (Tableau)**

Tant que l’adulte n’a pas déclenché une “Réinitialisation de session”, l’enfant peut **consulter** le Tableau (timeline terminée) mais ne peut plus valider d’étapes : l’activité reste **en lecture seule** avec un marqueur de complétion (récompense si présente, sinon feedback de fin).

**Invariants**

● 1 seule session active maximum par (profil enfant, timeline).

● La progression ne doit jamais régresser automatiquement (sauf réinitialisation explicite en Édition).

**Interactions entre modifications en Édition et session active (règles explicites)**  
**Principe**  
Pendant une session active, toute action en Contexte Édition qui pourrait créer une incohérence ou surprendre l’enfant est strictement contrôlée.

1. **Vider la timeline pendant une session active**
   1. L’adulte peut utiliser “Vider la timeline” uniquement en Contexte Édition, même si une session est Active.
   2. Cette action déclenche automatiquement une **Réinitialisation de session** (progression remise à zéro) afin d’éviter toute incohérence.
   3. Le changement de structure n’est jamais appliqué “en direct” dans le Contexte Tableau : il est appliqué uniquement au **prochain Chargement du Contexte Tableau** (tel que défini au glossaire).
   4. Un message de confirmation explicite est affiché côté adulte avant l’action.
2. 👉 Objectif : laisser la main à l’adulte, tout en évitant une disparition brutale et en garantissant une cohérence session/sync.
3. Suppression de la carte correspondant au slot au focus (non validé)  
    Si l’adulte retire ou supprime la carte associée au slot actuellement au focus (et non validé) :
   1. le focus bascule automatiquement vers la prochaine étape valide (prochaine carte non validée disponible),
   2. Aucun état ne doit être “corrompu” côté enfant.
   3. Aucun message technique ne doit apparaître côté enfant ; si l’enfant est présent, l’adulte décide du moment de retour au Tableau.

4. Réorganisation des slots non validés pendant une session active
   1. L’adulte peut réorganiser l’ordre des slots non validés pendant une session active.
   2. La session s’adapte à ce nouvel ordre, sans jamais modifier les slots déjà validés.

---

**Termes liés aux systèmes pédagogiques**

### **Planning Visuel**

Mode d’utilisation de la timeline sans économie de jetons.  
 Il repose uniquement sur :

- l’ordre des cartes,
- la progression visuelle,
- les états Cochée (Fini) / Décochée (Active).

---

**Séquençage**

Outil d’aide visuelle optionnel permettant de décomposer une carte (carte mère) en plusieurs étapes.  
 Le séquençage est :

- personnel à l’utilisateur,
- non obligatoire,
- purement visuel côté enfant,
- indépendant de la validation de la tâche.

---

**Économie de jetons**

Système de motivation optionnel superposé au Planning Visuel.  
Elle est activée dès qu’au moins un slot Étape contient un nombre de jetons supérieur à 0  
Elle ne modifie jamais l’ordre ni la validation des cartes

### ---

**Jeton**

Unité de motivation associée à un slot Étape.  
 Les jetons :

- ne sont jamais définis sur les cartes,
- sont temporaires,
- sont réinitialisés à chaque session,
- n’ont aucune valeur persistante ou cumulative.

---

### **Grille de jetons**

Zone d’affichage regroupant l’ensemble des jetons à collecter pendant une session.  
 Le nombre de cases correspond à la somme des jetons définis sur les slots Étapes de la timeline active.

---

**Termes liés aux contextes UX**

**Contexte Édition**

Contexte UX destiné à l’adulte.

- Permet la création et la modification de la structure.
- Affiche les messages système.
- Bloqué partiellement hors ligne.

---

**Contexte Tableau**

Contexte UX destiné à l’enfant.

- Permet l’exécution d’une timeline.
- Affiche uniquement des éléments pédagogiques.
- Ne montre jamais de messages techniques ou commerciaux.

---

**Termes techniques fonctionnels**

**Offline**

État dans lequel l’application n’a pas de connexion réseau.

- L’exécution des timelines reste possible.
- Toute modification structurelle est bloquée.

---

**Synchronisation**

Processus automatique de mise à jour des données cloud.

- Asynchrone.
- Non bloquant.
- Invisible côté enfant.

### ---

**Texte à ajouter (nouvelle définition)**

**Chargement du Contexte Tableau**  
 Un “chargement du Contexte Tableau” désigne **toute entrée fraîche** dans la Page Tableau qui reconstruit l’écran à partir de l’état courant (local \+ cloud).  
 C’est le cas lorsque :

- l’utilisateur **navigue vers Tableau** depuis un autre écran (Édition, Profil, etc.),
- l’utilisateur **change de profil enfant actif** puis ouvre Tableau,
- l’app est **fermée puis rouverte** (relaunch),
- l’onglet/app revient **au premier plan** après fermeture système / crash / rechargement,
- l’utilisateur fait un **refresh explicite** (web).  
   À l’inverse, **rester sur Tableau** sans quitter l’écran **n’est pas** un “chargement”.

👉 Effet contractuel : toute modification structurante faite en Édition (reflow, ajout/suppression de slots, reset forcé) **n’est jamais poussée “en direct” sur l’écran déjà affiché côté enfant** ; elle s’applique **au prochain Chargement du Contexte Tableau**.

---

**Quota**

Limite explicite définie par un plan.

- Peut concerner les cartes, profils enfants ou appareils.
- Toujours appliqué en Contexte Édition.

### ---

**Bibliothèque de cartes**

Espace listant l’ensemble des cartes disponibles pour l’utilisateur.  
 Elle regroupe :

- les cartes de banque,
- les cartes personnelles (selon le statut).

La bibliothèque est utilisée exclusivement pour sélectionner des cartes à insérer dans la timeline ou dans une séquence.

### ---

**Mini-timeline de séquence**

Affichage horizontal des étapes d’une séquence associée à une carte mère.

Elle peut être affichée sous toute carte mère non encore validée dans la Page Tableau via le bouton « Voir les étapes ».

Elle ne permet aucune modification côté enfant.

### ---

**Toast système**

Message d’information non bloquant affiché temporairement à l’écran.  
 Utilisé notamment pour signaler :

- une action indisponible hors ligne,
- une limitation liée au plan.

Les toasts :

- ne bloquent jamais l’usage,
- ne sont jamais affichés côté enfant.

---

### **Compactage / Reflow**

Comportement automatique de réorganisation visuelle après suppression d’un élément.  
 Après suppression d’une carte, d’un slot ou d’une étape :

- aucun trou visuel n’est laissé,
- les éléments restants se repositionnent naturellement.
- Le compactage ne supprime jamais un slot Étape : il ne fait que réorganiser l’affichage.

**Règle explicite — slots vides**

**Vider un slot (retirer la carte)** : le slot devient vide, reste visible, et reste un emplacement valide.

**Supprimer un slot (action structurelle)** : supprime l’emplacement lui-même (disparaît) et déclenche reflow.

Le compactage/reflow concerne **uniquement l’affichage et l’ordre** ; il **ne supprime jamais** un slot implicitement.

Invariant : une timeline conserve **au minimum 1 slot Étape** (le dernier slot Étape ne peut pas être supprimé).

Un slot n’est supprimé que par une action explicite **“Supprimer le slot”** (Contexte Édition).

**Règle d’exécution (Contexte Tableau)**

Un **slot Étape vide** (sans carte) **n’est jamais exécutable** et **n’est pas affiché** dans le Contexte Tableau (aucun placeholder).

Il est ignoré lors du calcul de progression et des jetons (le Tableau se base uniquement sur les slots Étapes contenant une carte).

---

**Résumé invariant du glossaire**

- Un terme \= une définition.
- Aucun terme ambigu ou surchargé.
- Timeline ≠ Séquençage ≠ Session.
- Carte ≠ Slot.
- Structure ≠ Exécution.
- Adulte / enfant \= contexte UX, pas rôle système.

---

**Effet contractuel**

Toute implémentation :

- doit utiliser ces termes dans ce sens exact,
- ne doit pas redéfinir un concept existant,
- ne doit pas introduire de synonymes concurrents.

Ce glossaire est la référence unique du projet.

---

# **Rôles & Contextes** {#rôles-&-contextes}

**Cadre général (définition unique)**

- Il n’existe qu’un seul type de compte technique.
- Les différences Visitor / Free / Abonné / Admin sont des statuts fonctionnels, pas des rôles pédagogiques.
- Il n’existe aucun rôle “enfant” ni “adulte” en base de données.
- La distinction entre usage adulte et usage enfant est exclusivement UX, via les contextes Édition / Tableau.

---

**Statuts utilisateur**

**1\. Visitor**

Le Visitor est un utilisateur non authentifié, sans compte cloud.

**Caractéristiques**

- Dispose d’un profil enfant local implicite unique.
- Associé à un seul appareil.
- Données persistées localement uniquement (voir _Persistance / Sync / Offline_).
- Aucune synchronisation multi-appareils.

**Fonctionnalités accessibles**

- Accès à la banque de cartes prédéfinies.
- Composition et exécution de timelines.
- Utilisation :
  - du planning visuel,
  - du séquençage,
  - de l’économie de jetons.

**Fonctionnalités interdites**

- Création de cartes personnelles.
- Création de catégories.
- Accès à la page Profil.

**UX spécifique**

- La Page Édition est accessible, avec une navbar simplifiée :
  - bouton “Tableau”
  - bouton “Paramètres”
  - sélecteur de langue
  - bouton “Se connecter”
- Toute tentative de :
  - “Ajouter une tâche”
  - “Gérer les catégories”  
     déclenche l’affichage de PersonalizationModal invitant à créer un compte.

---

**2\. Free**

Le statut Free correspond à un utilisateur authentifié sans abonnement actif.

**Caractéristiques**

- Données persistées dans le cloud.
- Utilisation mono-appareil (limite du plan Free).
- Synchronisation cloud active **uniquement pour cet appareil** (pas d’usage simultané multi-appareils).
- Accès à la page Profil.

**Fonctionnalités accessibles**

- Accès à la banque de cartes prédéfinies.
- Composition et exécution de timelines.
- Utilisation du planning visuel, du séquençage et de l’économie de jetons.

**Fonctionnalités interdites**

- Création de cartes personnelles.
- Création de catégories.

**UX spécifique**

- Toute tentative de création de carte ou de catégorie déclenche PersonalizationModal avec une incitation à passer Abonné.

---

**3\. Abonné**

Le statut Abonné correspond à un utilisateur authentifié avec abonnement actif.

**Fonctionnalités accessibles**

- Accès à toutes les fonctionnalités :
  - création de cartes personnelles,
  - création de catégories,
  - utilisation complète de tous les outils.
- Multi-profils enfants et multi-appareils dans les limites du plan.

**Contraintes**

- Soumis aux quotas définis dans _Quotas & Plans_.

---

**4\. Admin**

Le statut Admin correspond au créateur / mainteneur de l’application.

**Caractéristiques**

- N’est pas un rôle pédagogique.
- N’est pas visible dans l’UX standard.

**Fonctionnalité**

- Accès complet à l’application comme un utilisateur Abonné.
- Accès à une Page Administration dédiée permettant :
  - la gestion de la banque de cartes,
  - la modération,
  - les paramètres globaux.

Les règles de confidentialité Admin restent définies dans le chapitre _Cartes & Catégories_.

---

**Contextes UX fondamentaux**

L’application distingue strictement deux contextes UX, indépendants du statut utilisateur.

**Contexte Édition**

- Utilisé pour :
  - créer,
  - configurer,
  - modifier,
  - supprimer.
- Accessible depuis la Page Édition.
- Destiné à un usage adulte (parent, éducateur).

**Contexte Tableau**

- Utilisé pour :
  - exécuter une timeline,
  - suivre la progression,
  - interagir avec les cartes dans le cadre d’une activité.
- Accessible depuis la Page Tableau.
- Destiné à un usage enfant.

👉 Ces contextes sont mutuellement exclusifs en termes d’actions autorisées.

---

**Actions autorisées par contexte**

**Contexte Édition**

- Création de profils enfants.
- Création / édition / suppression de timelines.
- Création / édition / suppression de cartes.
- Création / suppression de catégories.
- Réinitialisation d’une session.
- Accès aux paramètres du compte.
- Accès aux messages système (sync, quotas, abonnement).

**Contexte Tableau**

- Exécution d’une timeline déjà composée.
- Interaction avec la session active.
- Progression visuelle.
- Gestion des jetons dans le cadre de l’exécution.

**Actions interdites**

- Toute création.
- Toute modification structurelle.
- Toute suppression.
- Tout accès aux paramètres.

---

**Visibilité des messages système**

**Principe fondamental**

- Les messages techniques ou système ne doivent jamais être affichés dans le Contexte Tableau.

Cela inclut :

- états réseau (hors ligne, synchronisation),
- messages liés aux quotas,
- messages liés à l’abonnement,
- erreurs techniques.

Ces messages sont :

- visibles uniquement dans le Contexte Édition,
- totalement invisibles pour l’enfant.

👉 Le Contexte Tableau est émotionnellement neutre.

---

**Résumé invariant (clé UX)**

- Aucun rôle “enfant” ou “adulte” système.
- Un seul type de compte technique.
- Statuts \= Visitor / Free / Abonné / Admin.
- Deux contextes UX stricts : Édition / Tableau.
- Toute implémentation doit respecter cette séparation sans exception.

---

# **Cartes & Catégories** {#cartes-&-catégories}

## **Objectif du chapitre**

# Ce chapitre définit l’ensemble des règles fonctionnelles, UX et structurelles liées aux **cartes** et aux **catégories**, qui constituent le socle visuel et sémantique du produit.

# Il sert de **référence unique** pour :

- # l’implémentation Front,

- # la modélisation DB,

- # les règles RLS,

- # la confidentialité et les accès Admin.

# ---

## **1\. Carte — définition fondamentale**

# Une carte est une entité visuelle unique représentant une action, une étape ou une récompense.

# Une carte contient obligatoirement : ● une image, ● un nom.

# Catégorisation (bibliothèque) ● Une carte peut être associée à une catégorie **par l’utilisateur**, uniquement pour organiser sa bibliothèque. ● Cette association est toujours stockée via un mapping utilisateur ↔ carte (une seule catégorie par carte et par utilisateur), avec fallback automatique « Sans catégorie ».

# 👉 Il n’existe aucune distinction technique entre tâche, étape ou récompense. Le rôle d’une carte dépend uniquement du contexte d’utilisation.

# ---

## **2\. Unicité et réutilisation**

- # Une carte est **unique**.

- # Une carte peut être utilisée :
  - # dans plusieurs timelines,

  - # dans plusieurs séquences,

  - # dans plusieurs contextes simultanément.

- # L’utilisation d’une carte crée **une référence**, jamais une copie.

# 👉 Toute duplication implicite est interdite.

# ---

## **3\. Cartes personnelles — édition**

### **Apparition dans la bibliothèque**

# Une fois créée, la carte apparaît immédiatement dans la **bibliothèque de cartes** (Page Édition).

# ---

### **Actions disponibles sur une carte utilisateur**

# Sur chaque carte, l’utilisateur peut :

- # modifier le **nom** (champ libre),

- # changer la **catégorie** (select),

- # **supprimer** la carte,

- # cocher une **checkbox “Ajouter au planning”**.

# ---

### **Checkbox d’ajout au planning**

# Lorsque la checkbox est cochée :

- # la carte est ajoutée automatiquement au **premier slot “Étape” vide** du planning en cours d’édition,

- # l’ajout est immédiat,

- # aucune duplication de carte n’est effectuée.

# ---

## **4\. Visibilité & propriété**

### **Cartes personnelles**

- # Une carte personnelle est :
  - # strictement **privée**,

  - # visible uniquement par son **propriétaire**.

- # Elle n’est **jamais visible** par un autre utilisateur.

# ---

### **Accès Admin (cartes personnelles)**

# L’Admin :

- # peut accéder aux **données textuelles et structurelles** :
  - # nom,

  - # catégories,

  - # métadonnées techniques,

- # **ne voit jamais les images personnelles**,

- # ne dispose d’aucune interface de navigation visuelle des contenus privés.

# 👉 Principe de **minimisation stricte**.

# ---

## **5\. Suppression d’une carte personnelle**

### **Confirmation explicite**

# Si une carte est utilisée (timeline, séquence, récompense) :

# Un modal de confirmation est affiché :

# « Cette carte est actuellement utilisée. La supprimer la retirera de tous ses usages. »

Cette règle s’applique y compris si la carte supprimée était associée à un slot déjà validé : la réinitialisation est systématique afin de préserver la cohérence et d’éviter tout “trou” dans l’historique de session.

# ---

### **Effets de la suppression**

# Lorsqu’une carte est supprimée :

- # la carte est retirée de la bibliothèque,

- # elle est retirée de **tous ses usages** :
  - # timelines,

  - # séquences,

  - # slots récompense.

**Impact sur les sessions actives (clarification)**  
 Si une carte supprimée est référencée dans la timeline d’un profil enfant ayant une **session Active** (Prévisualisation ou Démarrée) :

- la suppression est une **action structurante**,
- elle déclenche automatiquement une **Réinitialisation de session** pour ce profil enfant (progression remise à zéro),
- et le changement n’est **jamais appliqué en direct** dans un Tableau déjà affiché : il s’applique uniquement au **prochain Chargement du Contexte Tableau**.

# ---

### **Comportement de réorganisation (règle explicite)**

# Après suppression :

- # les éléments restants se **réorganisent automatiquement**,

- # il n’y a **aucun trou visuel** laissé par la carte supprimée,

- # le comportement est un **compactage naturel** (reflow),

- # **aucun placeholder** n’est inséré.

# 👉 Ce comportement est identique :

- # dans la bibliothèque de cartes,

- # dans les timelines,

- # dans les séquences.

# ---

### **Ce qui est explicitement exclu**

# Il est interdit :

- # d’insérer une carte de remplacement automatique,

- # de déplacer une carte depuis un autre contexte,

- # de modifier l’ordre restant autrement que par le compactage naturel.

# 👉 La suppression n’entraîne **aucune décision implicite** autre que la fermeture du vide.

# ---

### **Responsabilité adulte (clarifiée)**

# La responsabilité laissée à l’adulte concerné :

- # **le choix de supprimer une carte en cours d’usage**,

- # **l’impact émotionnel potentiel** pour l’enfant,

# mais **pas** la gestion visuelle de l’espace, qui est **automatique et prévisible**.

# ---

## **6\. Catégories — définition générale**

### **Principe**

# Les **catégories sont personnelles**.

- # Chaque utilisateur possède **ses propres catégories**.

- # Il n’existe **aucune catégorie globale**.

- # Les catégories sont stockées dans une **table distincte** de celle des cartes.

- # Une catégorie appartient toujours à **un seul utilisateur**.

# ---

### **Règle fondamentale**

# 👉 Pour un utilisateur donné, toute carte affichée dans sa bibliothèque a toujours une catégorie **via le mapping utilisateur ↔ carte**, avec fallback automatique « Sans catégorie ».

# **Encadré — Modèle DB simplifié (contrat)**

# ● Les catégories sont stockées dans une table **categories** (personnelles, par utilisateur).

# ● Les cartes (banque et personnelles) sont stockées dans une table **cards**.

# ●L’association “catégorie d’une carte” est stockée dans une **table pivot dédiée** (ex : `user_card_categories`) contenant : `(user_id, card_id, category_id)` avec une **contrainte d’unicité** sur `(user_id, card_id)`.

# ● Conséquence UX : le filtre “catégorie” dans la Bibliothèque s’appuie **uniquement** sur ce mapping, quel que soit le type de carte (banque ou personnelle).

# ● Fallback : si aucune association explicite n’existe, la carte est considérée dans « Sans catégorie ».

---

## **7\. Catégorie système : « Sans catégorie »**

# Pour chaque utilisateur :

- # une catégorie système **« Sans catégorie »** existe,

- # elle est :
  - # créée automatiquement,

  - # non supprimable,

  - # visible dans les filtres et sélecteurs.

# 👉 « Sans catégorie » garantit qu’une carte a toujours une catégorie affichable, sans stocker de catégorie intrinsèque sur la carte.

# ---

## **8\. Suppression et modification des catégories**

### **Suppression**

# Lorsqu’une catégorie est supprimée :

- # un modal de confirmation est affiché,

- # après validation :
  - # toutes les cartes associées sont **réassignées à “Sans catégorie”**,

  - # l’opération est immédiate,

  - # Aucune carte n’est supprimée.

# ---

### **Modification**

- # L’utilisateur peut créer autant de catégories qu’il le souhaite.

- # Une carte peut changer de catégorie à tout moment.

- # Une carte appartient **à une seule catégorie à la fois**.

# 👉 Les multi-catégories sont **explicitement exclues**.

# ---

## **9\. Cartes de banque — définition**

# Les cartes de banque sont :

- # créées par l’Admin,

- # rendues visibles à tous les utilisateurs (Visitor / Free / Abonné).

# Une carte de banque :

- # n’est jamais modifiable par les utilisateurs,

- # peut être utilisée librement dans :
  - # planning visuel,

  - # séquençage,

  - # économie de jetons.

# ---

## **10\. Création & publication (Admin)**

### **Création**

# L’Admin crée une carte :

- # nom \+ image,

- # catégorie par défaut « Sans catégorie ».

# 👉 À ce stade, la carte est une **carte personnelle Admin**.

# ---

### **Publication en banque**

# L’Admin dispose d’un bouton :

- # « Ajouter à la banque »

- # « Retirer de la banque »

# Chaque action :

- # est explicite,

- # confirmée via un modal.

# ---

### **Invariants**

- # La carte reste la **propriété de l’Admin**.

- # La banque est une **publication**, pas un changement de propriétaire.

# ---

## **11\. Dépublication d’une carte de banque**

# Lorsqu’une carte est retirée de la banque :

- elle disparaît de la banque,
- elle ne peut plus être ajoutée à de nouveaux usages,
- elle reste utilisable uniquement là où elle est déjà présente,
- Elle n’apparaît jamais dans la bibliothèque personnelle des utilisateurs.
- Elle reste utilisable là où elle est déjà présente, y compris comme étape d’une séquence existante (la séquence conserve ses références).

# ---

## **12\. Catégories et cartes de banque (point clé)**

# Les cartes de banque **n’ont pas de catégories globales**.

# Chaque utilisateur peut :

- # attribuer **ses propres catégories** aux cartes de banque.

# Conséquence :

- # Une même carte de banque peut être classée différemment selon l’utilisateur.

# ---

### **Règle structurelle (non négociable)**

# L’attribution d’une catégorie à une carte de banque :

- # est un mapping local utilisateur → carte,

- # ne duplique jamais la carte,

- # ne modifie jamais la carte source,

- # peut être absente (fallback automatique « Sans catégorie »).

# ❌ Il est strictement interdit :

- # de copier une carte de banque,

- # de créer une carte dérivée.

Les catégories sont strictement personnelles à l’utilisateur ; seul leur créateur peut les voir et les gérer.

---

**13\. Confidentialité & accès Admin (transversal)**  
**Images**

- # Les images personnelles :
  - # sont strictement privées,

  - # visibles uniquement par leur propriétaire.

- # L’Admin :
  - # ne voit jamais les images personnelles.

# Les images des cartes de banque :

- # sont visibles par tous,

- # car volontairement publiées.

# ---

### **Accès Admin — minimisation**

# L’Admin peut accéder :

- # aux noms,

- # aux catégories,

- # aux relations et métadonnées techniques,

# uniquement pour :

- # support,

- # sécurité,

- # intégrité du produit.

# ---

**14\. Cycle de vie complet d’une carte (synthèse)**

### **Création**

- # nom \+ image requis,

- # catégorie \= « Sans catégorie »,

- # carte privée par défaut.

### **Édition**

- # nom modifiable,

- # catégorie modifiable,

- # image figée.

### **Usage**

- # planning visuel,

- # séquence,

- # économie de jetons.

### **Suppression**

- # confirmation explicite,

- # retrait de tous les usages.

# ---

## **Résumé invariant (DB / RLS)**

Raison (invariant UX) : l’image d’une carte personnelle ne peut pas être modifiée après création afin de garantir la cohérence visuelle dans tous les usages existants (timelines / séquences) et éviter un effet de surprise côté enfant.

- # Carte \= image \+ nom \+ catégorie (obligatoire).

- # Catégories \= toujours personnelles.

- # « Sans catégorie » \= système, non supprimable.

- # Banque \= publication Admin.

- # Dépublication ≠ suppression.

- # Aucun accès Admin aux images privées.

# ---

## **Conclusion contractuelle**

# Ce chapitre est la **référence unique** pour :

- # Cartes,

- # Catégories,

- # Banque,

- # Confidentialité,

- # Cycle de vie.

# Aucune implémentation ne doit :

- # introduire de duplication,

- # exposer des images privées,

- # rendre une carte sans catégorie,

- # violer les règles Admin définies ici..

---

# **Pages Edition / Tableau** {#pages-edition-/-tableau}

## **1\. Page Édition — Vue d’ensemble**

# La **Page Édition** est l’espace de configuration réservé à l’adulte.

# Elle est structurée en **deux zones fixes et complémentaires** :

- # **Zone Haute** : le Planning (Timeline)

- # **Zone Basse** : la Bibliothèque de Cartes

# La Timeline est **sticky** (fixée en haut de l’écran) afin de rester visible en permanence pendant la sélection et l’organisation des cartes.

# 👉 Cette page concentre **toute la complexité de configuration**, jamais exposée à l’enfant.

---

## **2\. Zone Haute — Le Planning (Timeline)**

### **2.1 Structure générale**

# La Timeline est :

- # horizontale,

- # scrollable si nécessaire,

- # toujours visible (sticky),

- # composée de **slots successifs**.

# ---

### **2.2 Slots initiaux**

# À l’ouverture d’une timeline :

- # **1 slot Récompense**, isolé visuellement,

- # **1 slot Étape**.

**Invariant structurel** :

- une timeline doit toujours contenir au minimum 1 slot Étape (éventuellement vide).
- Conséquence : le bouton “Supprimer” est désactivé sur le dernier slot Étape restant.
- Pour “repartir de zéro”, l’adulte utilise Vider la timeline (Contexte Édition).

# ---

### **2.3 Gestion des slots**

# Un bouton **➕** permet d’ajouter dynamiquement des **slots Étapes** supplémentaires.

# Chaque slot Étape comporte :

- # un titre automatique : _Étape 1, Étape 2, etc._,

- # une zone image centrale,

- # un nom affiché sous l’image,

- # un bouton supprimer (coin supérieur droit), sauf contraintes décrites plus bas.
  - # Hors session active :
    - # bouton visible et actif sur tous les slots Étapes (sauf règle “au moins 1 slot Étape”, voir §3.3).

  - # Pendant une session active :
    - # Slot déjà validé :
      - # bouton désactivé (ou masqué) et état verrouillé explicite (“Étape déjà validée”).

    - # slot non validé :
      - # bouton visible et actif ; la suppression déclenche un reflow immédiat (compactage) sans trou.

# Si le nombre de slots dépasse la largeur de l’écran :

- # un **scroll horizontal** est activé.

# ---

### **2.4 Slot Récompense (règle fondamentale)**

- # Le slot Récompense existe toujours dans une timeline.

- # Il peut être :
  - # vide,

  - # ou rempli.

# S’il est vide :

- # aucune récompense n’est affichée dans la Page Tableau.

# Sa présence :

- # n’est jamais conditionnée à l’économie de jetons,

- # reste structurelle, même dans un planning visuel simple.

Côté Tableau, un slot Récompense vide n’occupe aucun espace : aucun placeholder n’est affiché.

# ---

## **3\. Zone Basse — Bibliothèque de Cartes**

### **3.1 Contenu**

# La Bibliothèque conserve sa structure existante :

- # grille de cartes,

- # scroll vertical fluide.

# Elle contient :

- # les **cartes personnelles** (Abonné / Admin),

- # les **cartes de banque**.

# ---

## **4\. Ajout des cartes dans la Timeline**

### **4.1 Mécanisme principal (mobile-first)**

# Lorsque l’utilisateur coche la checkbox d’une carte :

- # la carte est ajoutée automatiquement :
  - # dans le **premier slot Étape vide**,

  - # **jamais** dans le slot Récompense par défaut.

# Un feedback immédiat est fourni :

- # micro-animation,

- # légère vibration (mobile).

# La Timeline sticky permet de visualiser instantanément l’ajout.

# ---

### **4.2 Réorganisation**

# Le **drag & drop** est autorisé **uniquement dans la Timeline** :

- # entre slots Étapes,

- # vers ou depuis le slot Récompense.

# Il est **strictement interdit** :

- # dans la Bibliothèque de cartes (zone basse).

# ---

## **5\. Slots Étapes & Jetons (portée limitée)**

# Chaque slot Étape possède :

- # un **sélecteur de jetons** (0 à 5).

# Valeurs :

- # **0** → planning visuel simple,

- # **≥ 1** → économie de jetons active pour cette étape.

# ---

### **5.1 Conséquences UX**

# Une même carte peut :

- # rapporter des jetons dans une timeline,

- # n’en rapporter aucun dans une autre.

# Si **tous les slots Étapes sont à 0 jeton** :

- # la timeline est considérée comme un **Planning Visuel pur**,

- # la grille de jetons n’apparaît pas dans la Page Tableau,

- # La grille de jetons n’apparaît pas ; le slot Récompense reste présent et peut être laissé vide.

# 👉 Les règles détaillées sont définies dans le chapitre **Économie de jetons**.

# ---

## **6\. Page Tableau — Vue Enfant**

# La **Page Tableau** est l’espace d’exécution réservé à l’enfant.

# ---

### **6.1 Structure générale**

- # La Timeline définie en Édition est affichée **de manière linéaire**.

- # Aucun changement d’ordre n’est possible.

- # Un scroll est activé si la timeline dépasse l’écran.

# ---

## **7\. États visuels des cartes (Tableau)**

> _Décision produit du 2026-05-01 — Les 3 états (Maintenant / À venir / Fini) sont remplacés par 2 états. La notion de "focus" (une seule carte active à la fois) est supprimée : validation libre, guidée par l'accompagnateur selon le rythme de l'enfant._

### **Décochée (Active)**

- # Toutes les cartes non encore validées sont affichées normalement.

- # Toutes sont validables dans l'ordre souhaité.

# ---

### **Cochée (Fini)**

- # Les cartes validées :
  - # restent visibles,

  - # deviennent grisées / opacifiées.

- # Elles ne disparaissent jamais _(prévention de frustration)_.

# ---

## **8\. Carte dans le Tableau — Détails visuels**

# De haut en bas :

- # nom fixe,

- # image (légère rotation horaire au survol),

- # Checkbox de validation.

**Affichage des étapes de séquence (carte mère)**  
Si la carte affichée est une carte mère possédant une séquence et qu’elle n’est pas encore validée :  
● un petit bouton « Voir étapes » est affiché sur la carte (indépendant du focus),  
● cliquer sur « Voir étapes » affiche/masque la mini-timeline des étapes,  
● Cette action est purement visuelle et ne modifie jamais la progression.

_Décision produit du 2026-05-01 — Visibilité indépendante du focus (prévisibilité TSA)._

# ---

### **Validation**

# Au moment de la validation :

- # la carte passe à l’état **Fini**,

- # La carte suivante devient centrale.

Mécanisme d’interaction (non négociable):

- La validation d’une étape se fait uniquement via la checkbox de validation.
- Le tap/clic sur l’image ou le nom de la carte :
  - n’a aucune action de validation
  - ne doit jamais pouvoir valider par erreur.

Objectif : éviter toute validation accidentelle (enfant qui tapote), garantir une prévisibilité maximale.

# ---

## **9\. Affichage et animation des jetons**

- # Les jetons d'un slot ne sont **pas** affichés sur la carte individuelle — visibles uniquement dans la grille de jetons au-dessus de la timeline.

_Décision produit du 2026-05-01 — Simplification visuelle, charge cognitive réduite. Dette UX assumée : l'enfant ne voit pas, avant validation, combien de jetons une carte rapporte. À reconsidérer post-launch via retours terrain._

- # Une **grille de jetons** est affichée au-dessus de la timeline :
  - # nombre de cases \= somme des jetons des slots Étapes.

### **Animation de validation**

# Lors de la validation :

1. # validation de la carte centrale,

2. # pause très courte,

3. # les jetons se détachent et volent vers la grille du header,

4. # Le focus passe automatiquement à la carte suivante.

Accessibilité / réduction des animations (TSA & OS)  
Cette animation respecte prefers-reduced-motion :  
 ○ si l’option est active, les jetons n’effectuent pas de vol,  
 ○ ils apparaissent directement dans la grille (sans mouvement rapide).  
👉 Objectif : éviter sur-stimulation et fixation, tout en conservant un feedback clair.

---

**10\. Récompense (Page Tableau)**  
La carte Récompense, lorsqu’elle est définie dans la timeline :

- # apparaît automatiquement dans la Page Tableau,

- # n’est jamais cliquable,

- # est affichée grisée par défaut

# Lorsque toutes les étapes de la timeline sont validées :

- # La carte Récompense retrouve ses couleurs,

- # une animation légère est déclenchée.

# Aucune action n’est requise de la part de l’enfant.

# La récompense n’est pas une étape à valider.

**Accessibilité mouvement :**  
l’animation de célébration respecte prefers-reduced-motion. Si activé, la carte retrouve ses couleurs sans animation (transition instantanée).

---

## **11\. Règles de verrouillage et cohérence**

### **Principe général**

# Toute modification d’ordre ou de contenu :

- # se fait **uniquement** dans la Page Édition.

# ---

### **Pendant une session active**

# **Avant la première validation (session non démarrée / prévisualisation)** ● Tant qu’aucune étape n’a été validée : ○ la timeline reste **entièrement éditable** en Contexte Édition (cartes, ordre, ajout/suppression de slots, jetons), ○ aucune contrainte “slot validé” ne s’applique encore (puisqu’il n’y a pas de progression).

# **Après la première validation (session démarrée)** ● Dès qu’au moins une étape est validée : ○ les slots déjà validés : – apparaissent grisés dans la Page Édition, – ne peuvent ni être déplacés, ni supprimés, – **leurs jetons ne peuvent plus être modifiés**. ○ les slots non encore validés restent modifiables **sur la structure** (ajout/suppression/re-order), mais sans jamais altérer ce qui a déjà été validé.

# **Règle jetons (après démarrage)** ● Après démarrage, l’adulte **ne peut plus modifier** le nombre de jetons des slots déjà présents. ● Il peut toutefois **ajouter** un nouveau slot Étape (ou une nouvelle carte dans un slot vide) et **définir ses jetons au moment de l’ajout**.

# ---

### **Hors session active**

# En l’absence de session active :

- # La timeline est **entièrement éditable**.

# ---

## **12\. Effet contractuel**

# Ce chapitre définit :

- # la séparation stricte Édition / Tableau,

- # les responsabilités adulte / enfant,

- # les règles de verrouillage liées aux sessions.

# Aucune implémentation ne doit :

- # permettre une modification côté enfant,

- # exposer la configuration,

- # introduire des comportements différents entre les pages.

# ---

# **Planning visuel** {#planning-visuel}

## **1\. Définition**

# Le **Planning Visuel** est un outil d’organisation temporelle simple permettant à l’enfant :

- # d’anticiper les actions à venir,

- # de visualiser sa progression,

- # de réduire l’anxiété liée aux transitions.

# Il repose exclusivement sur :

- # l’ordre des cartes,

- # leur état visuel (Maintenant / À venir / Fini).

# 👉 Le Planning Visuel **n’implique aucune notion de récompense ou de jetons**.

# ---

## **2\. Portée fonctionnelle**

# Le Planning Visuel est utilisé lorsque :

- # tous les slots Étapes sont à **0 jeton**,

- # ou lorsque l’adulte souhaite une organisation **sans motivation conditionnelle**.

# Dans ce cas :

- # la timeline fonctionne seule,

- # la récompense est optionnelle,

- # aucune grille de jetons n’est affichée.

# ---

## **3\. Rôle de l’adulte**

# L’adulte :

- # crée la timeline,

- # ajoute les cartes,

- # définit l’ordre des étapes,

- # peut ajouter ou non une carte récompense.

# 👉 Toute la configuration se fait **exclusivement dans la Page Édition**.

# ---

## **4\. Expérience enfant (Page Tableau)**

# Côté enfant :

- # la timeline est affichée de manière linéaire,

- # une seule carte est active à la fois (focus),

- # les cartes à venir restent visibles,

- # les cartes terminées restent visibles et grisées.

# Aucune carte ne disparaît brutalement.

# ---

## **5\. Validation des étapes**

# L’enfant valide les cartes une par une via la checkbox de validation.

# Chaque validation :

- # fait avancer la timeline,
  - # met à jour l’état visuel.

# 👉 Il n’existe **aucune condition externe** à la validation :

- # pas de score,

- # pas de compteur,

- # pas de seuil à atteindre.

# ---

## **6\. Récompense dans un Planning Visuel**

- La présence d’une carte Récompense est optionnelle.
- Si elle est présente :
  - elle apparaît en fin de timeline,
  - Elle est accessible après validation de toutes les étapes.

👉 La récompense n’est pas conditionnée, elle marque simplement la fin du parcours.

Fin sans récompense (feedback explicite)  
Si aucune carte Récompense n’est définie, la validation de la dernière étape déclenche un feedback de fin (léger, non technique) afin de marquer clairement la clôture de l’activité (ex : “Bravo, c’est terminé \!” \+ transition douce).  
Objectif : éviter toute ambiguïté “c’est fini ?” et réduire l’anxiété de transition.

# ---

## **7\. Invariants (non négociables)**

- # Le Planning Visuel fonctionne **sans jetons**.

- # L’ordre est toujours défini par l’adulte.

- # L’enfant ne peut jamais modifier la structure.

- # Aucune information abstraite (quota, score, condition) n’est visible côté enfant.

# ---

## **8\. Effet contractuel**

# Ce chapitre définit le fonctionnement **minimal et autonome** du Planning Visuel.

# Toute implémentation doit permettre :

- # un usage sans jetons,

- # une exécution fluide,

- # une lisibilité maximale,

- # sans dépendance à l’économie de jetons.

#

# ---

# **Économie de jetons** {#économie-de-jetons}

**1\. Définition**

L’Économie de Jetons est un système de motivation optionnel permettant de :

- renforcer l’engagement,
- matérialiser l’effort,
- différer une récompense.

👉 Elle ne remplace jamais le Planning Visuel.  
👉Elle s’y superpose, étape par étape.

---

**2\. Principe fondamental**

**Les jetons :**

- ne sont jamais définis sur les cartes,
- sont définis uniquement sur les slots Étapes.

Ainsi :

- une même carte peut rapporter des jetons dans une timeline,
- et n’en rapporter aucun dans une autre.

---

**3\. Activation de l’économie de jetons**

L’économie de jetons est active lorsque :

- au moins un slot Étape a une valeur de jetons ≥ 1\.

Si tous les slots sont à 0 :

- l’économie de jetons est désactivée,
- La timeline redevient un Planning Visuel pur.

---

**4\. Calcul des jetons**

- Chaque slot Étape définit un nombre de jetons (0 à 5).
- Le nombre total de jetons à collecter est :
  - la somme des jetons de tous les slots Étapes.

Ce total est :

- recalculé tant qu’aucune étape n’a été validée (prévisualisation),
- figé dès la première validation (démarrage effectif de la session),
- visible dans la grille de jetons du Tableau.

**Évolution pendant session démarrée (cas d’ajout d’étapes)**

● Après démarrage, le total ne change **que si** l’adulte **ajoute** de nouveaux slots Étapes avec des jetons.

● Toute modification structurelle (ajout/suppression) n’est **jamais appliquée “en direct”** dans le Contexte Tableau : elle s’applique **au prochain chargement/retour** au Tableau, afin d’éviter une surprise visuelle côté enfant.

Si l’adulte ajoute un slot Étape (avec jetons) pendant qu’une session est déjà démarrée :

- la nouvelle valeur **n’apparaît pas instantanément** sur un Tableau déjà affiché côté enfant,
- elle est visible **uniquement au prochain Chargement du Contexte Tableau**,
- et la grille est alors recalculée à partir de la structure courante \+ progression synchronisée.

---

**5\. Affichage côté enfant**

Côté enfant :

- les jetons d’une étape ne sont pas affichés sur la carte individuelle,
- la grille de jetons est affichée au-dessus de la timeline,
- aucun calcul n’est requis,
- aucun nombre abstrait n’est demandé à l’enfant.

---

**6\. Collecte des jetons**

Lorsqu’une carte est validée :

- les jetons associés à son slot :
  - sont collectés,
  - s’ajoutent à la grille.

La collecte est :

- animée,
- séquencée,
- toujours visible.

---

**7\. Réinitialisation des jetons**

**Les jetons :**

- sont réinitialisés à chaque session,
- ne sont jamais cumulés entre sessions,
- ne sont jamais stockés comme un score permanent.

👉 Ils n’ont aucune valeur hors de la session en cours.

---

**8.Source de vérité des jetons (sync / conflits)**

● Les jetons collectés ne constituent pas une source de vérité indépendante.

● Le total de jetons collectés est toujours déduit des slots validés (et de la valeur “jetons par slot”).

● En cas de synchronisation multi-appareils, seule la validation des slots est fusionnée ; le total de jetons est recalculé.

---

**9\. Récompense conditionnelle**

Si une carte Récompense est présente et que l’économie de jetons est active

- la récompense est verrouillée tant que tous les jetons ne sont pas collectés,
- une fois la grille complète :
  - la récompense est débloquée,
  - une animation de célébration est déclenchée.

---

**10\. Protection émotionnelle**

- Aucun jeton n’est perdu.
- Aucun échec n’est possible.
- Aucun message négatif n’est affiché.
- L’enfant ne voit jamais :
  - les règles,
  - les calculs,
  - les conditions abstraites.

---

**11\. Invariants (non négociables)**

- Les jetons sont liés aux slots, jamais aux cartes.
- Les jetons sont temporaires (session).
- L’économie de jetons est toujours optionnelle.
- Le Planning Visuel fonctionne sans jetons.

---

**12\. Effet contractuel**

Ce chapitre définit le contrat complet de l’Économie de Jetons.

Aucune implémentation ne doit :

- créer des jetons persistants,
- associer des jetons à une carte,
- rendre la récompense obligatoire,
- introduire de pression ou de sanction.

# ---

# **Séquençage** {#séquençage}

## **1\. Objectif du séquençage**

Le séquençage est un **outil d’aide visuelle optionnel**, destiné à accompagner l’enfant lorsqu’une tâche (carte) est difficile à réaliser.

Il permet de **décomposer une tâche complexe en étapes simples**, sans jamais :

- imposer ces étapes,
- modifier le fonctionnement normal du planning visuel,
- altérer la timeline,
- interférer avec l’économie de jetons.

Le séquençage :

- n’est **jamais obligatoire**,
- ne conditionne **jamais** la validation d’une tâche,
- peut être utilisé **ou ignoré** selon les capacités du moment de l’enfant.

👉 Une même carte peut être réalisée **avec ou sans séquence**, sans impact fonctionnel.

---

## **2\. Carte mère et existence de la séquence**

### **Principe**

Toute carte peut devenir une **carte mère de séquence**.

- Une carte peut avoir **0 ou 1 séquence** associée.
- Une séquence est rattachée :
  - à **une carte mère**,
  - à **un utilisateur**.

---

### **Invariant fondamental (non négociable)**

Une séquence est **toujours locale à l’utilisateur**.

Une même carte (y compris une carte de banque) peut avoir :

- une séquence pour l’utilisateur A,
- une autre séquence différente pour l’utilisateur B,
- aucune séquence pour d’autres utilisateurs.

👉 Il n’existe **aucune séquence globale ou partagée**.

---

## **3\. Séquençage et cartes de banque**

Une séquence peut être créée :

- sur une carte personnelle,
- ou sur une carte de banque.

Même dans le cas d’une carte de banque :

- La séquence reste **strictement personnelle** à chaque utilisateur.

Publication d’une carte en banque (Admin) :

- n’impacte **aucune séquence existante**,
- ne rend **jamais publique** une séquence créée par l’Admin.

👉 La banque concerne **la carte**, jamais les séquences.

---

## **4\. Création et édition d’une séquence**

### **Accès**

Chaque carte dispose d’un bouton dédié **« Séquence »**.

Cliquer sur ce bouton ouvre un **mode spécial d’édition de séquence**.

👉 Ce bouton « Séquence » existe uniquement en Contexte Édition et n’est jamais accessible dans le Contexte Tableau.

---

### **Mode Séquençage (réutilisation de la Timeline)**

Le mode Séquençage réutilise le **même composant Timeline** que le planning visuel, avec des règles spécifiques.

|     Élément     |           Comportement            |
| :-------------: | :-------------------------------: |
|      Slots      |      Slots Étapes uniquement      |
| Slot Récompense |    ❌ Désactivé / non visible     |
|     Jetons      |          ❌ Non visibles          |
|   Drag & drop   | ✅ Autorisé sur toute la timeline |
| Timeline sticky |              ✅ Oui               |

---

### **Étapes**

Une séquence est une **liste ordonnée d’étapes**.

Chaque étape :

- est une carte existante (personnelle ou de banque),
- ne peut apparaître **qu’une seule fois** dans la séquence.

👉 Les doublons sont strictement interdits.

---

### **Ajout des étapes**

En mode Séquençage :

- l’utilisateur coche une carte dans la bibliothèque,
- la carte est ajoutée :
  - dans le **premier slot Étape vide**,
  - jamais ailleurs,
  - sans popup,
  - sans confirmation supplémentaire.

L’ordre peut ensuite être ajusté via **drag & drop**.

---

### **Taille de la séquence**

- Minimum : **2 étapes**
- Maximum : **aucune limite**

---

### **Réorganisation**

- L’ajout, la suppression et l’ordonnancement des étapes sont possibles **uniquement** :
  - en mode Séquençage,
  - via drag & drop.
- La mini-timeline observée par l’enfant est **toujours figée**.

---

### **Changements visuels (édition)**

**En haut de l’écran**

- La timeline passe en **mode Séquence**.
- Indication claire :  
   « Séquence de : Se laver les mains »
- Slot Récompense masqué / désactivé.
- Slots “Étapes” visibles, vides au départ.

**En bas de l’écran**

- La bibliothèque de cartes reste visible.
- Interaction identique à l’édition classique :
  - scroll vertical,
  - checkbox “Ajouter”,
  - feedback immédiat.

👉 Aucun nouvel apprentissage requis.

---

### **Suppression d’étapes**

- L’adulte décoche une carte dans la bibliothèque.
- La carte est retirée de la timeline de séquence.
- Les étapes restantes sont **recompactées automatiquement, sans trou**.

**Garde-fou DB (non négociable)**  
La séquence **ne peut jamais** exister avec moins de 2 étapes.

Conséquence UX :

- toute action qui ferait tomber à **< 2 étapes** est **refusée**,
- un message explicite est affiché,
- pour supprimer une séquence, l’utilisateur doit utiliser une action **« Supprimer la séquence »** (explicite), pas une suppression implicite par retrait des étapes.

---

### **Sortie du mode Séquençage**

- Bouton clair : **« Retour à l’édition »**
- La séquence est sauvegardée automatiquement.

**Règle de cohérence**  
 Si l’utilisateur tente de quitter avec moins de deux étapes :

- la fermeture est bloquée,
- message affiché :  
   « Ajoute au moins deux étapes pour créer une séquence. »

L’utilisateur doit :

- soit ajouter une étape,
- soit décocher la carte pour annuler la séquence.

👉 Pas de bouton “Valider”, pas de modal lourd, pas de risque de perte.

La contrainte **minimum 2 étapes** est **vérifiée en base au commit** (transaction-safe).  
L’UI doit l’anticiper, mais la DB reste l’autorité ultime.

---

### **Messages utilisateur verrouillés**

- « Ajoute au moins deux étapes pour créer une séquence. »
- « Cette carte n’a pas de séquence associée. »

---

## **5\. Affichage et usage dans le planning (timeline)**

- Le séquençage n’est **jamais affiché automatiquement**.
- Dans le planning :
  - La carte mère s’affiche comme une carte normale.

Une carte mère peut apparaître **plusieurs fois** dans un planning.

👉 La séquence est un **template unique**, partagé entre toutes les occurrences,  
 tandis que chaque occurrence correspond à une **exécution indépendante**.

---

### **Activation à la demande**

Le séquençage est utilisé uniquement en cas de besoin.

- Le bouton **« Voir les étapes »** :
  - est visible sur toute carte mère non encore validée,
  - est accessible indépendamment de l'ordre de validation.

Cliquer ouvre l’affichage de la séquence associée.

**Transition “Voir étapes” lors de la validation de la carte mère**

Si la mini-timeline est ouverte via ‘Voir les étapes’ au moment où **l’enfant** valide la carte mère (Page Tableau), la mini-timeline se referme automatiquement via une transition douce :

- La mini-timeline se referme automatiquement avec une transition douce (sans disparition brutale),
- Puis le focus passe à la carte suivante.

---

### **Mini-timeline de séquence**

- Les étapes apparaissent **sous la carte mère**,
- sous forme de mini-timeline horizontale,
- distincte de la timeline de planning visuel.

La mini-timeline est :

- scrollable horizontalement,
- utilisable à une main,
- sans geste complexe obligatoire.

---

## **6\. État “fait” des étapes (purement visuel)**

- Chaque étape est cliquable.
- Cliquer une étape :
  - la grise pour indiquer “fait”.

Cet état :

- est lié uniquement à **l’exécution en cours**,
- est réinitialisé à chaque nouvelle occurrence,
- est strictement **visuel**
- n’impose aucun ordre,
- n’a aucune incidence fonctionnelle.

Même si toutes les étapes sont grisées :

- La carte mère **n’est pas validée automatiquement**.

**Synchronisation (contrat)**

Durée de vie de l’état “fait” (étapes de séquence)

- L’état “fait” des étapes de séquence est un état purement visuel, local-only, non synchronisé cloud.
- **Portée exacte (par occurrence)**
  - L’état “fait” des étapes de séquence est stocké **par occurrence de carte mère**, c’est-à-dire **par slot_id** (dans le cadre d’une session).
  - Conséquence : si la même carte mère apparaît plusieurs fois dans la timeline, chaque occurrence possède son propre état “fait”, indépendant des autres.
- Cet état est persisté localement sur le même appareil pendant toute la durée de la session active : il survit à une fermeture/réouverture de l’app sur le même appareil, mais peut être perdu si le stockage local est purgé par le système. Il n’est jamais synchronisé cloud.
- Cet état est réinitialisé uniquement :
  - à la fin d’une session (nouvelle session), ou
  - lors d’une réinitialisation explicite de session en Contexte Édition.
- En cas de changement d’appareil pendant une session, cet état visuel peut ne pas être retrouvé ; **recommandation d’usage** : éviter de changer d’appareil en cours de tâche lorsque l’enfant s’appuie fortement sur le séquençage.

---

## **7\. Validation de la tâche (règle non négociable)**

**Principe**

La validation d’une tâche (carte mère) se fait exclusivement via la checkbox de validation du Contexte Tableau.

Interactions sur la carte mère (non négociable)

- Le tap/clic sur l’image ou le nom de la carte mère ne déclenche jamais de validation et ne déclenche aucune action.
- La mini-timeline de séquence, si elle existe, est affichée uniquement via un petit bouton dédié « Voir étapes », visible sur toute carte mère non encore validée (indépendant du focus).
- Le bouton « Voir étapes » n’a aucun impact sur la progression et ne peut jamais valider une étape.

👉 L’état “fait” des étapes de la séquence reste purement visuel et n’a aucun impact sur la validation.

---

## **8\. Suppression d’une carte utilisée dans des séquences**

Si une carte est supprimée alors qu’elle est utilisée comme étape :

- une confirmation explicite est affichée, par exemple :

  « Cette carte est utilisée dans 3 séquences. La suppression est impossible tant que ces séquences existent. »

Après tentative de suppression :

- **si la carte est référencée dans une séquence** et que le retrait ferait passer une séquence à **< 2 étapes**, la suppression est **refusée**,
- l’utilisateur doit **supprimer la séquence explicitement**, ou retirer d’abord d’autres étapes pour rester à ≥ 2.

**Suppression d’une carte mère (avec séquence)**

Si la carte supprimée est une carte mère (porteuse d’une séquence) :

● la séquence associée est supprimée automatiquement (cascade) **si la suppression est autorisée**,

● un message de confirmation explicite le retrait de la séquence,

● La carte est retirée de tous ses usages (slots, timelines, références).

**Cas spécifique cartes de banque**  
Une carte de banque **ne peut pas être supprimée** si elle est encore référencée (slots, catégories, séquences, étapes).  
L’action correcte est la **dépublication**, pas la suppression.

👉 Aucune séquence “orpheline” ne doit exister.

---

## **9\. Quotas**

Le séquençage :

- n’est soumis à **aucun quota**.

---

## **Conclusion**

Le séquençage est un **outil d’assistance visuelle non intrusif**, activable à la demande, respectant :

- la prévisibilité,
- la liberté d’usage,
- la sécurité émotionnelle des utilisateurs TSA,

tout en restant :

- simple à comprendre,
- robuste côté données,
- cohérent avec le planning et les sessions.

---

# **Multi-enfants & Multi-appareils** {#multi-enfants-&-multi-appareils}

## **1\. Principe fondamental**

L’application est conçue pour permettre :

- l’accompagnement de **plusieurs enfants** par un même utilisateur,
- l’utilisation de l’application sur **plusieurs appareils**,

tout en garantissant, en toutes circonstances :

- une **séparation stricte** des données par enfant,
- une **continuité d’usage**, y compris hors ligne,
- une **expérience émotionnellement stable et prévisible** pour l’enfant.

Ces principes sont **structurels** et ne dépendent ni du plan ni du contexte réseau.

---

## **2\. Définitions fondamentales**

### **Compte utilisateur (propriétaire)**

Le **compte utilisateur (propriétaire)** est l’unité propriétaire du système.

Il détient :

- les cartes (banque \+ personnelles),
- les catégories,
- les profils enfants,
- les appareils autorisés,
- les timelines créées.

👉 Il n’existe **aucune notion de compte enfant ou compte adulte distinct** au niveau technique.

---

### **Profils enfants**

Un **profil enfant** représente un enfant accompagné dans l’application.

Chaque profil enfant :

- est **indépendant**,
- possède ses **propres timelines**,
- possède ses **propres sessions**,
- possède sa **propre progression**.

👉 **Aucune donnée n’est jamais partagée entre profils enfants.**

---

### **Propriété et partage**

- Les profils enfants appartiennent toujours à un **compte utilisateur (propriétaire)**.
- Les **cartes et catégories** sont partagées entre tous les profils enfants d’un même compte.
- Les **timelines** sont **spécifiques à un profil enfant**.

---

## **3\. Limites sur les profils enfants**

Le nombre de profils enfants :

- n’est **pas limité structurellement**,
- est limité **exclusivement par le plan** (voir _Quotas & Plans_).

---

Création et cycle de vie des profils enfants
Création initiale
Lors de la première utilisation de l’application par un compte authentifié (Free ou Abonné) :
un profil enfant est créé automatiquement,
ce profil porte un nom générique par défaut : « Mon enfant »,
il est immédiatement utilisable.
👉 L’application n’est jamais vide au premier démarrage.

Profils supplémentaires
Selon le plan :
Free :
Un seul profil enfant peut être utilisé.
Abonné :
jusqu’à trois profils enfants peuvent être utilisés.
Dans le Contexte Édition :
l’adulte peut créer un profil enfant supplémentaire tant que la limite du plan n’est pas atteinte,
Chaque nouveau profil enfant dispose immédiatement de sa propre structure prête à l’emploi.

Désactivation d’un profil enfant
Un profil enfant peut être désactivé par l’adulte.
un profil désactivé :
n’apparaît plus dans l’usage courant,
ne peut plus être sélectionné ni utilisé,
conserve ses données (historique, progression).
👉 La désactivation d’un profil libère une place permettant d’en créer un nouveau, dans la limite du plan.

Principe de sécurité émotionnelle (TSA)
Aucune suppression définitive de profil enfant n’est exposée dans l’usage normal.
Ce choix vise à :
éviter les erreurs irréversibles,
garantir la stabilité émotionnelle,
préserver la continuité des repères pour l’enfant.

---

### **Cas Visitor**

Le **Visitor** dispose implicitement :

- d’un **profil enfant local unique**,
- non modifiable,
- non supprimable.

Ce comportement est **structurel**, non lié à un quota.

---

## **4\. Timelines & sessions par enfant**

### **Timelines**

Une timeline est une structure unique, active à un instant donné, rattachée à un profil enfant.

- Un profil enfant ne possède qu’une seule timeline à la fois.
- Cette timeline représente l’activité en cours.
- Pour proposer une nouvelle activité, l’adulte utilise l’action explicite :
  - bouton “Vider la timeline”
  - Effet :
    - retire toutes les cartes des slots Étapes,
    - retire la carte Récompense si elle était définie,
    - remet la structure à l’état de base : 1 slot Étape vide \+ 1 slot Récompense vide.

Distinction non négociable

● “Vider la timeline” modifie la **structure** (Contexte Édition).

● “Réinitialiser la session” remet à zéro la **progression** (Contexte Édition) sans changer la structure.

Il n’existe pas de gestion de multiples timelines parallèles pour un même enfant.

👉 Dans tout le projet, le seul terme utilisé côté produit est **“Réinitialisation de session”** (jamais “reset”, jamais “redémarrage de session”).

---

### **Sessions d’exécution**

Une **session** représente l’exécution concrète d’une timeline active.

- Une timeline peut donner lieu à plusieurs sessions successives au fil du temps.
- Une seule session peut être active à la fois pour un profil enfant.
- Il ne peut jamais exister plus d’une session active pour un enfant donné.

---

### **Invariant non négociable**

👉 Il ne peut **jamais exister deux exécutions simultanées**  
 d’une même timeline pour un même enfant.

Cette règle est :

- structurelle,
- indépendante du plan,
- indépendante du nombre d’appareils.

---

## **5\. Sélecteur d’enfant (principe de contexte)**

Lorsqu’il existe plusieurs profils enfants :

- un **profil enfant actif** est toujours défini,
- Toutes les vues fonctionnent dans le **contexte de cet enfant actif**.

---

### **Changement d’enfant actif**

Changer d’enfant actif :

- ne modifie **jamais** :
  - les cartes visibles,
  - les catégories,
- modifie uniquement :
  - les timelines affichées,
  - les sessions actives,
  - la progression.

👉 Le sélecteur d’enfant est un **filtre de contexte**,  
👉 ce n’est **pas** un changement d’univers ou de données.

---

## **6\. Multi-appareils — principe général**

Un même compte utilisateur peut être utilisé sur plusieurs appareils :

- ordinateur,
- tablette,
- smartphone.

Les appareils sont considérés comme **interchangeables**.

**Définition contractuelle d’un appareil**

Un “appareil” est identifié par un **device_id (UUID)** généré au premier usage et **persisté localement** sur l’appareil.

Lors de la première connexion d’un compte sur cet appareil, le device_id est **enregistré** comme appareil autorisé du compte.

Le quota “nombre maximum d’appareils” se mesure comme le **nombre de device_id actifs** rattachés au compte.

Le système garantit :

- la continuité de l’état,
- la cohérence des sessions,
- l’absence de conflits visibles.

---

## **7\. Multi-appareils — règles de cohérence**

### **Règle de session active**

Pour :

- un enfant donné,
- une timeline donnée,

👉 **une seule session active à la fois**.

---

### **Cas d’usage multi-appareil**

Si une session est déjà active sur un autre appareil :

- l’état est synchronisé,
- toute tentative d’exécution concurrente est évitée.

---

**Résolution des conflits de progression (règle explicite)**

**Principe fondamental**

● En cas de désynchronisation, la progression ne doit jamais régresser automatiquement.

**Règle de fusion (monotone)**

Si deux appareils présentent des progressions différentes pour une même session :

- La progression finale synchronisée est la plus avancée, définie comme l’union des slot_id validés (set), indépendamment de leur position/ordre d’affichage.

Concrètement :

- toute étape validée sur un appareil est considérée validée
- les jetons collectés ne peuvent pas diminuer tant que la session n’a pas été réinitialisée.

**Notion contractuelle : “Epoch de session” (preuve de réinitialisation)**  
 Chaque session possède un identifiant de version appelé **epoch de session** (ex : entier qui s’incrémente).

- À la **création** d’une session : epoch \= 1\.

- À chaque **Réinitialisation de session** : l’epoch **s’incrémente** (epoch \= epoch \+ 1\) et la progression repart à 0\.  
   Règle de sync : toute progression (locale/offline) associée à un epoch **inférieur** à l’epoch courant est **obsolète** et doit être ignorée/écrasée.

**Exception — réinitialisation explicite**

La règle de fusion monotone s’applique **uniquement tant qu’aucune réinitialisation explicite n’a eu lieu**.  
 Une **réinitialisation de session** déclenchée en Contexte Édition est une exception volontaire :

- elle **annule** toute progression antérieure de cette session,
- elle crée une nouvelle session active (progression \= 0),
- Toute progression locale offline plus ancienne est **considérée obsolète** et doit être écrasée.

**Exemple edge case (contractuel)**  
 Appareil A valide 1–3 (offline). Appareil B réinitialise la session.  
 Quand A revient online : l’état A (1–3) est **écrasé** par la réinitialisation, et A se réaligne sur la nouvelle session (0).

**Règle anti-choc (TSA)**

- Cet écrasement n’est jamais appliqué “en direct” pendant qu’un enfant exécute la session dans le Contexte Tableau.
- Il est appliqué uniquement au prochain chargement du Contexte Tableau (ou au prochain retour depuis un autre écran), jamais pendant une exécution en cours.

Aucun conflit ou message technique ne doit jamais apparaître côté enfant (Contexte Tableau).

---

### **Objectifs**

Ces règles visent à :

- empêcher les conflits,
- prévenir les abus,
- garantir une progression fiable et compréhensible.

---

## **8\. Offline & synchronisation (rappel de portée)**

En cas de perte de réseau (Free / Abonné) :

- l’exécution d’une timeline déjà composée reste possible,
- aucune action de création / édition / suppression n’est autorisée,
- La progression est stockée localement puis synchronisée.

Le mode offline :

- est **transparent pour l’enfant**,
- est **explicitement signalé à l’adulte**.

---

## **9\. Anti-abus (principe structurel)**

Le système ne repose **pas** sur des blocages punitifs.

Les garde-fous sont :

- **structurels** : une seule session active,
- **contextuels** : enfant actif unique,
- **invisibles côté enfant**.

Aucun mécanisme coercitif n’est exposé dans l’UX enfant.

---

## **10\. Compatibilité évolutive (sans impact UX)**

Ce modèle permet, sans refonte structurelle :

- l’ajout futur de plusieurs adultes,
- la gestion d’équipes éducatives,
- la création de rôles et permissions.

👉 Le **profil enfant reste l’unité centrale**, garantissant la stabilité du modèle dans le temps.

---

## **11\. Résumé invariant (clé DB / RLS / Front)**

- Compte utilisateur \= propriétaire des cartes et catégories.
- Profils enfants \= unités fonctionnelles isolées.
- Cartes & catégories \= partagées par tous les enfants du compte.
- Timelines \= rattachées à un enfant.
- Sessions \= rattachées à un enfant.
- **1 session active max par timeline et par enfant**.
- Multi-appareils autorisés sans conflit.
- Aucun mécanisme multi-enfant visible côté enfant.

---

## **✅ Effet contractuel**

Ce chapitre constitue la **référence unique** pour :

- la conception DB,
- les règles RLS,
- la synchronisation multi-appareils,
- la logique front.

Aucune implémentation ne doit :

- rattacher des cartes à un enfant,
- dupliquer des cartes par profil,
- exposer le multi-enfant à l’enfant.

# ---

# **Persistance / Sync / Offline** {#persistance-/-sync-/-offline}

**Objectif du chapitre**

Ce chapitre définit les règles de persistance des données, de synchronisation et de fonctionnement hors ligne de l’application.

Les objectifs sont :

- garantir une continuité d’usage sans perte visible,
- permettre l’exécution des activités même sans connexion,
- éviter toute ambiguïté sur ce qui est sauvegardé ou non,
- protéger l’enfant de toute perturbation technique ou émotionnelle.

---

**Principe fondamental**

L’application distingue strictement deux types d’usages :

- l’exécution d’une timeline (usage enfant),
- la modification de la structure (usage adulte).

👉 Hors ligne, seule l’exécution est autorisée.  
 Toute modification structurelle est strictement interdite sans connexion.

---

**Données locales et données synchronisées**

**Visitor**

- Utilisateur non authentifié.
- Toutes les données sont persistées localement uniquement.
- Le stockage local est la source de vérité.
- Aucune synchronisation cloud n’existe.

Sont persistées localement :

- les timelines composées,
- les sessions d’exécution,
- l’avancée dans une timeline (étapes cochées, jetons collectés).

---

**Utilisateur connecté (Free / Abonné)**

- Les données sont :
  - persistées localement,
  - synchronisées avec le cloud lorsqu’une connexion est disponible.
- Le cloud est la source de vérité à long terme.
- Le local sert :
  - de cache,
  - de support offline,
  - de protection contre les coupures réseau.

---

**Fonctionnement hors ligne**

**Principe général**

Lorsque l’application est hors ligne :

- l’utilisateur peut continuer à utiliser une timeline déjà composée,
- l’enfant peut :
  - cocher les étapes,
  - collecter les jetons,
  - atteindre la récompense finale,
- Aucune donnée visible n’est perdue.

---

**Actions autorisées hors ligne**

- Exécuter une timeline existante.
- Continuer une session déjà entamée.
- Mettre en pause une session et la reprendre plus tard.
- Basculer entre différents profils enfants / activités déjà en place, sans modification structurelle.

**Définition de “pause” (offline)**

- “Mettre en pause” est implicite :
  - quitter le Contexte Tableau (navigation, fermeture app, verrouillage écran) met la session en pause.
- “Reprendre” est automatique :
  - revenir au Contexte Tableau reprend la session exactement au même point.
- Aucun bouton “Pause” n’est requis.

👉Objectif : réduire la charge cognitive et éviter les manipulations inutiles en situation réelle (stress / fatigue).

👉 L’avancée de chaque session est conservée localement et reprise exactement au même point.

---

**Actions interdites hors ligne (règle stricte)**

Lorsque l’application est hors ligne, il est impossible de :

- créer, modifier ou supprimer une carte,
- créer, modifier ou supprimer une catégorie,
- créer une nouvelle timeline,
- modifier la structure d’une timeline existante,
- réorganiser les slots,
- changer la configuration des jetons.

Ces actions sont :

- visibles mais désactivées,
- accompagnées d’un message simple :  
   « Indisponible hors ligne »

---

**Sessions et persistance**

**Principe**

La progression n’est jamais stockée sur la timeline elle-même.  
 Elle est toujours rattachée à une session d’exécution.

- Une timeline peut avoir plusieurs sessions dans le temps.
- Chaque session conserve son propre état d’avancement.
- Une session peut être interrompue et reprise ultérieurement.

---

**Sauvegarde**

- L’état d’une session est sauvegardé localement en continu.
- La synchronisation cloud se fait ultérieurement, sans bloquer l’usage.
- Aucun message technique n’est affiché à l’enfant.

---

**Indication réseau (adulte uniquement)**

- Les états réseau ne sont jamais visibles côté enfant.
- En Contexte Édition uniquement :
  - un bandeau discret peut indiquer l’état hors ligne,
  - La synchronisation se fait automatiquement au retour du réseau.

Aucun message anxiogène ou bloquant n’est affiché.

---

**Import des données Visitor**

Lorsqu’un Visitor crée un compte sur le même appareil :

- l’application propose un import explicite des données locales,
- l’utilisateur choisit d’importer ou non.

L’import :

- ne supprime aucune donnée locale sans confirmation,
- est sans perte,
- est déclenchée volontairement.

**Périmètre de l’import (Visitor → compte) :**

- timelines (structure),
- sessions et progression associée,
- séquences (cartes mères \+ étapes),
- mapping catégories (si applicable),

avec gestion des cas où une carte de banque n’est plus publiable : elle reste utilisable uniquement là où elle est déjà présente (y compris dans les séquences existantes).

**Cas des cartes de banque dépubliées :**

● Si les données Visitor contiennent des timelines / séquences utilisant une carte de banque dépubliée entre-temps, cette carte **reste utilisable** dans les usages importés (cohérent avec “dépublication ≠ suppression”).

● La dépublication empêche uniquement l’ajout de nouveaux usages, mais ne casse jamais l’existant.

**Invariant recommandé (banque)** : une carte de banque ne doit **jamais** être supprimée “durablement” si elle peut être référencée par des données utilisateur ; seule la **dépublication** est autorisée.  
 Si malgré tout une référence pointe vers une carte indisponible (cas exceptionnel) :

- côté Tableau : aucun message technique, aucun crash ; l’enfant ne doit jamais voir une erreur,
- Côté Édition : l’adulte voit un état “carte indisponible” et peut remplacer la carte (slot vidé).
- Cet état “carte indisponible” est bloquant uniquement pour la structure (remplacement requis pour réutilisation), mais ne bloque jamais l’exécution d’une session déjà commencée.

---

**En cas d’action indisponible hors ligne (création, édition, suppression) :**

- l’action reste visible mais désactivée,
- un message d’information est affiché sous forme de toast non bloquant,
- Le toast est temporaire et disparaît automatiquement.

Aucun modal bloquant n’est utilisé.

Aucun message n’est affiché côté enfant.

---

## **Note :** la gestion des limites de stockage local (IndexedDB / cache navigateur) relève de l’implémentation technique et n’est pas contractuelle dans ce document.

**Résumé invariant**

- Hors ligne \= exécution autorisée, structure bloquée.
- L’enfant peut toujours terminer une activité commencée.
- Les sessions sont l’unité de progression.
- Visitor \= local uniquement.
- Aucun message technique côté enfant.

# ---

# **Quotas & Plans** {#quotas-&-plans}

**Principe général**

Les quotas définissent les limites fonctionnelles explicites du produit.  
 Ils sont utilisés pour :

- prévenir les abus,
- maîtriser les coûts (stockage, synchronisation),
- différencier les plans Free et Abonné.

Les quotas sont :

- bloquants (une action interdite ne produit aucun état partiel),
- accompagnés d’un message explicite,
- visibles uniquement en Contexte Édition.

👉 Aucun quota, limite ou message commercial n’est jamais visible côté enfant (Contexte Tableau).

---

**Distinction fondamentale**

Le produit repose sur deux types de limitations distinctes :

1. Quotas de plan  
   → limites commerciales explicites, liées à un abonnement.
2. Limitations structurelles  
   → contraintes inhérentes au statut (ex : Visitor), indépendantes de tout plan.

Cette distinction est non négociable et structure toute l’implémentation.

---

**1\. Quotas liés aux cartes (ressource principale)**

**Principe**

Les quotas ne portent ni sur les tâches, ni sur les récompenses,  
 mais uniquement sur les cartes, car ce sont les images qui consomment :

- du stockage,
- de la bande passante,
- des ressources de synchronisation.

---

**Types de quotas cartes**

**a) Quota de stock**

Nombre maximum total de cartes personnelles possédées par l’utilisateur.

- Supprimer une carte libère immédiatement un slot

- Les cartes de banque ne consomment aucun quota.

**b) Quota mensuel**

Nombre maximum de nouvelles cartes personnelles créées par mois.

- Modifier une carte existante ne consomme aucun quota.
- Supprimer puis recréer une carte consomme à nouveau un quota.
- Le mois est calculé selon le **fuseau horaire du compte** (timezone de profil ; par défaut Europe/Paris) : le compteur mensuel se réinitialise au **1er jour du mois à 00:00** heure locale du compte.

**Anti-abus changement de timezone (clarification)**

Les timestamps de création de carte sont stockés en **UTC**.

Le fuseau horaire du compte sert uniquement à déterminer les bornes “début/fin de mois”.

Si l’utilisateur change de timezone, ce changement **ne prend effet pour le quota mensuel qu’au prochain mois** (le mois en cours conserve la timezone de référence au moment de son démarrage).

---

**Application par statut**

|   Statut    | Quota de stock | Quota mensuel |
| :---------: | :------------: | :-----------: |
| **Visitor** |  Pas concerné  | Pas concerné  |
|  **Free**   |  Pas concerné  | Pas concerné  |
| **Abonné**  |   50 cartes    |  100 / mois   |
|  **Admin**  |    Illimité    |   Illimité    |

Note de lecture  
 “Pas concerné” signifie que le statut ne permet pas la création de cartes personnelles.  
 Il ne s’agit pas d’un quota illimité, mais d’une fonctionnalité indisponible.

---

**2\. Limites sur les profils enfants**

**Principe**

Le modèle de données n’impose aucune limite structurelle sur le nombre de profils enfants.  
 Les limites sont définies exclusivement par le plan, à des fins anti-abus.

---

**Application par statut**

|   Statut    | Profils enfants |
| :---------: | :-------------: |
| **Visitor** | Pas concerné\*  |
|  **Free**   |    1 maximum    |
| **Abonné**  |    3 maximum    |
|  **Admin**  |    Illimité     |

\* Visitor  
 Le Visitor est structurellement limité à un profil enfant local implicite unique.  
 Il ne s’agit pas d’un quota de plan.

---

**Comportement en cas de dépassement (Free / Abonné)**

- La création d’un nouveau profil enfant est bloquée.
- Un message explicite est affiché (Contexte Édition) :  
   « Nombre maximum de profils enfants atteint. »

Aucune donnée existante n’est affectée.

---

**3\. Limites sur les appareils**

**Principe**

Un compte utilisateur peut être utilisé sur plusieurs appareils,  
 dans la limite définie par son plan.

Aucune déconnexion automatique silencieuse n’est effectuée.

---

**Application par statut**

|   Statut    |   Appareils    |
| :---------: | :------------: |
| **Visitor** | Pas concerné\* |
|  **Free**   |   1 maximum    |
| **Abonné**  |   3 maximum    |
|  **Admin**  |    Illimité    |

**\* Visitor**  
 Le Visitor est structurellement limité à l’appareil courant,  
 sans notion de quota ni de gestion multi-appareils.

---

**Comportement en cas de dépassement (Free / Abonné)**

- L’accès depuis le nouvel appareil est refusé.
- Un message explicite est affiché (Contexte Édition) :  
   « Nombre maximum d’appareils atteint. »

Aucune session existante n’est interrompue.

---

**4\. Sessions actives (règle structurelle)**

Règle non négociable

Il ne peut exister qu’une seule session active :

- par profil enfant,
- par timeline.

Cette règle :

- n’est pas un quota commercial,
- n’est pas liée à un plan,
- constitue un invariant structurel du produit.

Elle s’applique à tous les statuts sans exception.

---

**5\. Timelines**

- Le nombre de timelines :
  - n’est jamais limité,
  - quel que soit le statut utilisateur.

Ce choix est intentionnel afin de :

- éviter la frustration,
- favoriser l’adaptation aux besoins TSA,
- ne pas bloquer la créativité pédagogique.

---

**6\. Downgrade Abonné → Free (règle de transition)**  
Au moment du downgrade, l’application passe en mode Free :  
● Exécution uniquement : aucune modification structurelle n’est autorisée (création de profil, composition de timeline, ajout/suppression de cartes/slots, réinitialisation de session).  
● Les profils enfants existants au-delà de la limite Free restent accessibles uniquement pour terminer les sessions déjà actives, sans recomposition.  
● Dès qu’une session devient Terminée sur un profil, elle reste en lecture seule et ne peut pas être relancée en mode Free.  
● Une fois toutes les sessions en cours des profils au-delà de la limite Free terminées, ces profils deviennent verrouillés ; l’utilisateur doit conserver 1 profil enfant actif (Free).  
👉 Objectif : empêcher l’abus tout en évitant toute perte de données et en laissant terminer ce qui est déjà en cours.  
**Sélection du profil actif (downgrade)**  
Lors du passage Abonné → Free, le profil enfant **le plus anciennement créé** reste actif par défaut. Les profils excédentaires passent en état **verrouillé (lecture seule)**.  
Si l’utilisateur repasse Abonné, les profils verrouillés sont **réactivés automatiquement** dans la limite du plan.

---

**Résumé invariant (clé UX / DB / RLS)**

- Les quotas portent uniquement sur les cartes personnelles.
- Les profils enfants et appareils sont limités par plan, pas par structure.
- Visitor n’est soumis à aucun quota, mais à des limitations structurelles.
- Tous les quotas sont :
  - bloquants,
  - explicites,
  - invisibles côté enfant.
- La règle “1 session active max” est structurelle et universelle.

---

**Effet contractuel**

Ce chapitre constitue la référence unique pour :

- la gestion des quotas,
- les règles anti-abus,
- l’implémentation DB / RLS,
- les messages UX associés.

Aucune implémentation ne doit :

- introduire de quotas implicites,
- exposer des limites côté enfant,
- mélanger quota commercial et contrainte structurelle.

---

# **Évolutivité Des Comptes & Plans** {#évolutivité-des-comptes-&-plans}

## **Principe fondamental**

# Le modèle de données, de permissions et de quotas est conçu dès l’origine pour permettre, **sans refonte structurelle** :

- # l’ajout de nouveaux statuts fonctionnels (ex : Staff support / modération),

- # l’introduction de comptes famille ou organisation,

- # l’évolution vers des offres professionnelles.

# ---

### **Portée actuelle (référence contractuelle)**

# À ce stade, **seuls les statuts suivants existent et doivent être implémentés** :

- # Visitor

- # Free

- # Abonné

- # Admin

# 👉 Aucun autre statut, rôle ou plan n’est actif en production.

# ---

### **UX actuelle**

- # Aucune hypothèse d’évolutivité future n’est :
  - # visible,

  - # suggérée,

  - # ou anticipée dans l’UX actuelle.

# L’utilisateur n’est exposé **qu’aux capacités réellement disponibles**.

# ---

## **Différenciation Free / Abonné**

### **Free**

# Un utilisateur **Free** :

- # ne peut pas créer de cartes personnelles,

- # utilise uniquement les cartes de banque,

- # peut accéder à la Page Profil,

- # ne bénéficie :
  - # ni du multi-profils enfants,

  - # ni du multi-appareils.

# ---

### **Abonné**

# Un utilisateur **Abonné** :

- # dispose d’un accès complet aux fonctionnalités,

- # peut créer des cartes personnelles et des catégories,

- # bénéficie du multi-profils enfants et du multi-appareils,

- # est soumis aux **quotas définis dans le chapitre “Quotas & Plans”**.

# 👉 Cette section décrit les **capacités fonctionnelles**, 👉 les limites quantitatives sont définies ailleurs.

# ---

## **Protection de l’enfant (principe transversal)**

# Quel que soit le statut ou le plan :

# L’enfant ne voit **jamais** :

- # les quotas,

- # les limitations,

- # les messages liés à l’abonnement,

- # les incitations commerciales.

# ---

### **Invariant UX enfant**

# L’expérience enfant reste en permanence :

- # stable,

- # prévisible,

- # sans pression,

- # sans rupture liée à un changement de plan ou de compte.

# 👉 Cet invariant prévaut sur toute considération commerciale ou technique.

# ---

## **Préparation à l’évolutivité future (sans exposition)**

# Le modèle est conçu pour permettre ultérieurement :

- # plusieurs adultes par compte,

- # des usages professionnels ou institutionnels,

- # des permissions étendues et différenciées.

# ---

### **Cadre strict**

# Cette évolutivité :

- # n’a **aucun impact** sur l’UX actuelle,

- # n’introduit **aucune dette conceptuelle**,

- # n’est **pas implémentée** à ce stade,

- # n’est **pas anticipée dans l’interface**.

# 👉 Toute évolution future devra faire l’objet :

- # d’un document produit dédié,

- # d’une validation UX spécifique,

- # d’une implémentation explicite.

# ---

## **Résumé invariant (clé produit / DB / RLS / Front)**

- # Les plans sont **invisibles côté enfant**.

- # Les quotas sont :
  - # explicites,

  - # confinés au Contexte Édition.

- # Seuls Visitor / Free / Abonné / Admin existent.

- # L’évolutivité est **prévue**, mais **non exposée**.

- # Aucune implémentation ne doit :
  - # exposer des concepts futurs,

  - # créer de rôles implicites,

  - # anticiper des structures non validées.

# ---

## **✅ Effet contractuel**

# Ce chapitre constitue la référence pour :

- # la définition des statuts,

- # la séparation présent / futur,

- # la protection UX enfant,

- # l’architecture évolutive du modèle.

# Toute implémentation doit respecter strictement ce périmètre.

# ---

# **Annexes : messages verrouillés, modales, wording** {#annexes-:-messages-verrouillés,-modales,-wording}

**Refactor Admin**

- La partie Administration du projet doit être adaptée pour refléter la simplification actuelle des statuts utilisateur.
- Les composants existants (permissions, métriques, gestion utilisateurs) doivent être mis à jour pour utiliser exclusivement les statuts suivants : Visitor / Free / Abonné / Admin.
- Aucune logique de rôle supplémentaire ne doit subsister côté Admin.

---

**PersonalizationModal – Wording verrouillé**

**Visitor**

Message : “Pour créer tes propres tâches et catégories, crée un compte et abonne-toi.”

Boutons :

- “Créer un compte”
- “Plus tard”

---

**Free**

Message : “Ton compte gratuit te permet de sauvegarder tes plannings. Pour créer tes propres tâches et catégories, passe à la version Premium.”

Boutons :

- “Passer Premium”
- “Plus tard”

Interdictions UX (non négociables)

- Message culpabilisant
- Modal bloquante
- Obligation de s’abonner pour continuer à utiliser l’existant

---

**Offline**

« Indisponible hors connexion »

(Type : toast non bloquant, durée courte, contexte Édition uniquement)
