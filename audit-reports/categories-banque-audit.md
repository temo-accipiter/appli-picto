# Audit — Catégorisation des cartes de banque

> Réalisé le 2026-05-20 sur la branche `feature/re-design-edition`
> Périmètre : lecture seule — aucun fichier modifié hormis ce rapport.

---

## 1. Synthèse contrat (3 phrases max)

Les cartes de banque **n'ont pas de catégories globales** : chaque utilisateur peut librement attribuer **ses propres catégories** à une carte de banque via le pivot `user_card_categories`, exactement comme pour les cartes personnelles (§12 ux.md). Le pivot garantit l'unicité `(user_id, card_id)` et le fallback "Sans catégorie" est **applicatif** : l'absence de ligne dans le pivot signifie "Sans catégorie", aucun seed n'est requis (§5.2.4 FRONTEND_CONTRACT). La RLS du pivot autorise explicitement INSERT/UPDATE/DELETE pour `user_id = auth.uid()` **sans aucun filtre sur `cards.type`**, ce qui rend les cartes banque techniquement catégorisables dès aujourd'hui côté DB.

---

## 2. État DB (migrations + RLS + triggers)

### Migrations concernées

| Numéro         | Fichier                                                | Rôle                                                                                                       |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 20260130105000 | `_create_categories.sql`                               | Création table `categories` (`is_system`, `account_id`, etc.)                                              |
| 20260130106000 | `_create_user_card_categories.sql`                     | Création pivot `user_card_categories` — UNIQUE `(user_id, card_id)`                                        |
| 20260130108000 | `_categories_remap_on_delete.sql`                      | Trigger réassignation vers "Sans catégorie" lors suppression catégorie custom                              |
| 20260201119000 | `_phase5_6_corrective_integrity.sql`                   | Contraintes d'intégrité correctives                                                                        |
| 20260201120000 | `_phase5_7_seed_system_category_on_account_create.sql` | Trigger `accounts_seed_system_category` : crée "Sans catégorie" (`is_system=TRUE`) à la création de compte |
| 20260202121000 | `_phase5_8_invariants_reward_bank_guard.sql`           | Guard suppression carte banque référencée                                                                  |
| 20260202124000 | `_phase6_add_sequence_invariants.sql`                  | Invariants séquences (inclut `user_card_categories`)                                                       |
| 20260203127000 | `_phase7_2_enable_rls_and_grants.sql`                  | Activation RLS toutes tables                                                                               |
| 20260203129000 | `_phase7_4_rls_library.sql`                            | **RLS complète** : cards + categories + user_card_categories                                               |

### RLS `user_card_categories`

La policy `user_card_categories_insert_owner` (fichier `20260203129000`) autorise INSERT si :

- `user_id = auth.uid()`
- la carte est `type = 'bank'` **OU** `account_id = auth.uid()` (carte personnelle)
- la catégorie appartient à l'utilisateur

**Aucun filtre sur `cards.type`** n'exclut les cartes banque. La RLS est DB-ready pour les cartes banque.

### Triggers

| Trigger                                                      | Fichier        | Statut                                                  |
| ------------------------------------------------------------ | -------------- | ------------------------------------------------------- |
| `accounts_seed_system_category` (AFTER INSERT ON accounts)   | 20260201120000 | ✅ Présent — crée "Sans catégorie" à la création compte |
| Trigger réassignation catégorie supprimée → "Sans catégorie" | 20260130108000 | ✅ Présent                                              |
| Guard suppression carte bank référencée                      | 20260202121000 | ✅ Présent                                              |

---

## 3. État frontend (composants + hooks)

| Fichier                                                        | Rôle                                                   | État vis-à-vis de la cible                                                                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/page-components/edition/Edition.tsx`                      | Orchestrateur page Édition                             | ❌ Passe `bankCards` à `CardsEdition` **sans `category_id`** hydraté ; `handleUpdateCategorie` appelle `updateCardCategory` mais n'est **pas câblé** sur le panneau Banque |
| `src/hooks/useAdminBankCardActions.ts`                         | Hook admin actions cartes banque                       | ❌ Construit `bankCardsForDisplay` **sans `category_id`** (`// sans catégories` commentaire ligne 70)                                                                      |
| `src/hooks/useBankCards.ts`                                    | Chargement cartes banque                               | ❌ Requête `SELECT *` sur `cards` uniquement — **aucun JOIN sur `user_card_categories`**                                                                                   |
| `src/hooks/usePersonalCards.ts`                                | Chargement + CRUD cartes personnelles                  | ✅ Hydrate `category_id` via une 2e requête sur `user_card_categories` — `updateCardCategory` (UPSERT) fonctionnel                                                         |
| `src/hooks/useCategories.ts`                                   | Chargement CRUD catégories utilisateur                 | ✅ Fournit les catégories utilisateur (partagées banque+perso selon contrat)                                                                                               |
| `src/components/features/cards/cards-edition/CardsEdition.tsx` | Composant racine bibliothèque (onglets Perso / Banque) | ❌ Panneau Banque rend `EditionCard` **sans props `categorie`/`categorieOptions`/`onCategorieChange`**                                                                     |
| `src/components/shared/card/edition-card/EditionCard.tsx`      | CardItem générique                                     | ✅ Possède déjà `categorie`, `categorieOptions`, `onCategorieChange` en props — le `Select` s'affiche **si `categorieOptions.length > 0`**                                 |
| `src/components/shared/modal/modal-category/ModalCategory.tsx` | CRUD catégories (création / suppression)               | ✅ Conforme — ne touche pas `is_system=TRUE` (RLS bloque + filtrage applicatif)                                                                                            |

---

## 4. Réponses aux questions Q1 → Q7

**Q1 — Le pivot accepte-t-il l'insertion d'une ligne pour une carte `type='bank'` ?**

✅ Oui. La policy `user_card_categories_insert_owner` (fichier `20260203129000`) autorise explicitement `type = 'bank'` dans la clause `WITH CHECK` : `(type = 'bank' OR account_id = auth.uid())`. Aucune contrainte CHECK sur la table ne filtre sur `cards.type`. La FK `card_id → cards(id)` accepte n'importe quel type.

**Q2 — Y a-t-il un blocage côté schéma qui empêche l'insertion `(user_id, bank_card_id, category_id)` ?**

❌ Aucun. Ni la DDL (migration 20260130106000), ni les triggers, ni la RLS ne bloquent une insertion sur une carte banque. Le seul garde-fou est BLOCKER 4 (`is_execution_only()`) qui bloque en mode exécution uniquement, ce qui est cohérent avec le contrat.

**Q3 — Le hook `useBankCards` inclut-il un JOIN sur `user_card_categories` ?**

❌ Non. `useBankCards.ts` fait un simple `.select('*').eq('type', 'bank')` sur `cards`, sans aucune requête secondaire sur `user_card_categories`. Le `category_id` n'est pas hydraté sur les cartes banque.

**Q4 — `EditionCard` (panneau Banque) a-t-il un slot UI pour afficher/modifier la catégorie ?**

⚠️ Partiellement. `EditionCard.tsx` possède déjà les props `categorie`, `categorieOptions`, `onCategorieChange` et affiche le `Select` si `categorieOptions.length > 0`. Mais dans `CardsEdition.tsx` panneau Banque, ces props ne sont **pas passées** au `renderItem` des cartes banque — le `Select` catégorie n'apparaît donc jamais.

**Q5 — Point de montage naturel pour un filtre catégorie transversal (perso + banque) ?**

Le point de montage le plus naturel est dans `CardsEdition.tsx` au niveau du conteneur des onglets, **avant** le rendu des deux panneaux. Chemin exact : `src/components/features/cards/cards-edition/CardsEdition.tsx`, dans la zone `cards-edition__tabs` (entre les boutons d'onglets et les panneaux). Cela permettrait de filtrer `items` et `bankCards` simultanément avant rendu. Alternativement, si le filtre doit rester par onglet, il faudrait dupliquer le `Select` dans chaque panneau — moins cohérent avec le §12 qui traite les deux types de manière symétrique.

**Q6 — Quels tests risquent de casser si on étend la catégorisation aux cartes banque ?**

- `src/hooks/useCategories.test.ts` — teste CRUD catégories ; si on ajoute des assertions sur les cartes banque catégorisées, les mocks Supabase devront couvrir le pivot pour les bank cards.
- `src/hooks/useCategoryValidation.test.ts` — si la validation est étendue aux cartes banque.
- `src/page-components/edition/Edition.test.tsx` — teste le composant Edition.tsx ; tout mock de `useBankCards` devrait inclure `category_id` si on hydrate.

**Q7 — Y a-t-il du code mort lié à des catégories sur les cartes banque ?**

Oui, un commentaire explicite dans `useAdminBankCardActions.ts` (ligne ~70) : `// ── Mapping pour affichage (sans catégories) ──`. Ce commentaire signale une décision volontaire (omission de category_id) mais constitue un marqueur de dette à lever. Aucune prop orpheline ni type fantôme détecté ailleurs.

---

## 5. Écart entre état actuel et cible

Liste du plus structurel au plus cosmétique :

1. **`useBankCards.ts` ne charge pas `user_card_categories`** — la donnée `category_id` n'existe pas côté banque.
2. **`useAdminBankCardActions.ts` : `bankCardsForDisplay` exclut volontairement `category_id`** — le mapping d'affichage ne transmet pas la catégorie même si elle existait dans `useBankCards`.
3. **`Edition.tsx` : `handleUpdateCategorie` n'est pas câblé sur le panneau Banque** — la prop `onUpdateCategorie` est passée à `CardsEdition` mais le composant ne l'applique qu'aux cartes perso (le panneau Banque ne reçoit pas `onCategorieChange`).
4. **`CardsEdition.tsx` panneau Banque : `EditionCard` sans props catégorie** — `categorieOptions`, `categorie`, `onCategorieChange` absents du `renderItem` des cartes banque.
5. **Pas de filtre catégorie sur le panneau Banque** — le `Select` de filtre n'existe que sur le panneau "Mes cartes".
6. **Type `BankCardItem` dans `CardsEdition.tsx` ne contient pas `category_id`** — l'interface locale doit être étendue.
7. **Le `filterCategory` de `Edition.tsx` ne s'applique pas aux cartes banque** — la logique de filtrage (`filterCategory === 'all' || (c.category_id || 'none') === filterCategory`) n'est appliquée que sur `items` (cartes perso).

---

## 6. Risques identifiés

### TSA

- Un filtre catégorie sur le panneau Banque mal implémenté pourrait faire disparaître des cartes banque de façon inattendue → risque de surprise visuelle contraire au contrat TSA (prévisibilité).
- Le fallback "Sans catégorie" doit être explicite dans le filtre (option dans le `Select`) pour éviter qu'une carte sans ligne pivot soit invisible quand un filtre est actif.

### Sécurité DB

- Aucun risque nouveau côté DB : la RLS est déjà correcte. L'extension est purement front.
- Vérifier que le UPSERT `updateCardCategory` existant fonctionne bien avec un `card_id` de type banque (pas de contrainte applicative côté `usePersonalCards` qui pourrait filtrer sur `type = 'personal'` avant l'appel) — **aucun tel filtre trouvé**, l'appel est sur `user_card_categories` directement.

### Dette technique

- Dupliquer `updateCardCategory` de `usePersonalCards` pour les cartes banque crée une divergence : mieux vaut extraire la fonction dans un hook partagé `useCardCategoryAssignment` ou dans `useCategories`.
- Le commentaire `// sans catégories` dans `useAdminBankCardActions.ts` doit être supprimé lors du fix.

### Tests

- Aucun test ne couvre actuellement le cas `user_card_categories` avec `type='bank'`. L'extension doit s'accompagner de nouveaux cas de test.

---

## 7. Tokens Sass : disponibles / manquants

### Disponibles et utilisables

| Besoin                             | Token/Composant                                                                              | Statut                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `Select` filtre catégorie          | Composant `Select` existant (`src/components/ui/select/`) + tokens de form via `_forms.scss` | ✅ Disponible                    |
| Badge/indicateur visuel            | Fonction `badge-gradient($role)` dans `_colors.scss` (abstracts)                             | ✅ Disponible (usage à préciser) |
| Couleur "lecture seule" pour badge | `semantic('info', 'dark')` ou `surface('soft')` + `semantic('info')`                         | ✅ Disponible                    |

### Manquants ou à préciser

- **Token manquant** : Aucun token dédié `'readonly'` ou `'bank-indicator'` n'existe dans `$color-semantic-*`. Si l'on veut un badge distinctif "carte de banque" différent des rôles existants, il faudra composer avec les tokens existants (`semantic('info')`, `surface('soft')`) — aucun token à créer, juste une décision de composition.
- **Token manquant** : Pas de token `Input` de recherche texte distinct des `InputWithValidation` existants — non bloquant pour la Phase 2 si la recherche texte est hors périmètre immédiat.

---

## 8. Plan d'attaque recommandé pour la Phase 2

**Sans coder.** Liste ordonnée avec dépendances explicites.

1. **Extraire `updateCardCategory` en hook partagé** (`useCardCategoryAssignment` ou ajout dans `useCategories`)
   → Dépend de : rien / Prérequis de : étapes 2, 3

2. **Étendre `useBankCards.ts`** : ajouter une 2e requête sur `user_card_categories` (comme dans `usePersonalCards`) pour hydrater `category_id` sur chaque carte banque
   → Dépend de : étape 1 (si hook partagé) / Prérequis de : étapes 3, 4

3. **Étendre `bankCardsForDisplay`** dans `useAdminBankCardActions.ts` pour inclure `category_id`
   → Dépend de : étape 2 / Prérequis de : étapes 4, 5

4. **Étendre le type `BankCardItem`** dans `CardsEdition.tsx` pour inclure `category_id?: string | null`
   → Dépend de : étape 3 / Prérequis de : étapes 5, 6

5. **Câbler `categorieOptions`, `categorie`, `onCategorieChange`** dans le `renderItem` du panneau Banque dans `CardsEdition.tsx`
   → Dépend de : étapes 3, 4 / Prérequis de : étape 6

6. **Créer `handleUpdateBankCardCategorie`** dans `Edition.tsx` (appel à `updateCardCategory` avec le `card_id` banque)
   → Dépend de : étape 1 / Prérequis de : étape 7

7. **Passer `onUpdateBankCardCategorie`** à `CardsEdition` et le brancher sur le panneau Banque
   → Dépend de : étapes 5, 6

8. **Étendre le filtre catégorie** au panneau Banque (décision d'architecture à valider : filtre unifié vs. filtre par onglet)
   → Dépend de : étapes 3, 7

9. **Écrire les tests** pour le pivot avec `type='bank'` (unit Vitest sur hook + test composant CardsEdition panneau Banque)
   → Dépend de : toutes les étapes précédentes

---

## 9. Questions ouvertes pour le pilote humain

1. **Filtre catégorie : unifié ou par onglet ?**
   Un filtre unique au-dessus des onglets est plus cohérent avec le §12 (symétrie banque/perso) mais nécessite une UX claire quand l'onglet actif n'a aucune carte dans la catégorie sélectionnée. Choix à valider avant l'étape 8.

2. **Le panneau Banque mode `isFree` doit-il aussi afficher la catégorie ?**
   Actuellement, les utilisateurs Free ont un affichage simplifié (pas d'édition). Faut-il leur montrer la catégorie en lecture seule, ou ignorer les catégories pour ce profil ?

3. **Extraction de `updateCardCategory` : hook partagé ou duplication dans `useBankCards` ?**
   Dupliquer est plus rapide mais crée une divergence à maintenir. Un hook partagé est plus propre mais demande une refacto préalable. Choix à arbitrer selon la priorité calendaire.

4. **Réassignation catégorie lors de la suppression d'une catégorie custom : s'applique-t-elle bien aux mappings banque existants ?**
   Le trigger de réassignation (migration 20260130108000) agit sur `user_card_categories` par `category_id`, donc **indépendamment du type de carte** — mais ce comportement n'a pas été testé avec des cartes banque. À confirmer par un test intégration avant de livrer.

5. **Indicateur visuel "carte de banque" dans le `Select` catégorie ?**
   Si l'UX demande de distinguer visuellement une carte banque dans une liste de résultats (ex. future vue transversale), faut-il un badge ? Si oui, quel token composer (`semantic('info')` + `surface('soft')`) ? Décision cosmétique à valider avec le design.

---

_Généré par audit automatisé — aucun fichier source modifié._
