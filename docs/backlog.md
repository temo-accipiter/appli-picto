# Backlog — Dette technique

> ⚠️ Document NON CONTRACTUEL.
> Ce fichier recense des items de dette technique différés.
> Il ne fait PAS autorité comme les documents-contrats du projet
> (`docs/refonte-ux-dbfirst/DB_BLUEPRINT.md`, `docs/refonte_front/FRONTEND_CONTRACT.md`, etc.).
> Les décisions d'implémentation restent dans les contrats.

---

## TECH-001 — Dérive "Sans catégorie" : UPSERT au lieu d'absence de ligne

| Champ       | Valeur                                    |
| ----------- | ----------------------------------------- |
| **Statut**  | Ouvert                                    |
| **Priorité** | Moyenne                                  |

### Contexte

Le contrat (`docs/refonte-ux-dbfirst/DB_BLUEPRINT.md` ~ligne 422) définit l'état
"Sans catégorie" comme l'**absence de ligne** dans `user_card_categories`.

Or `EditionCard` fait un **UPSERT vers une catégorie système** quand l'utilisateur
choisit "Sans catégorie" dans le Select — deux représentations du même état coexistent
donc silencieusement.

C'est cette ligne pivot parasite qui a déclenché le faux blocage de suppression de carte
banque (bug `categories=t`). Le symptôme a été corrigé en surface via la migration
`20260520000000_fix_bank_delete_guard_remove_pivot_check.sql` (retrait de la vérification
`user_card_categories` dans le trigger), mais la cause profonde subsiste.

### Localisation

- `src/components/shared/card/edition-card/EditionCard.tsx` — logique de changement de catégorie
- `src/hooks/useAdminBankCardActions.ts` — gestion côté admin
- `docs/refonte-ux-dbfirst/DB_BLUEPRINT.md` ~ligne 422 — définition contractuelle

### Action proposée

**Décision à trancher en doc AVANT tout code** — deux options :

1. **Option A — DELETE** : quand l'utilisateur choisit "Sans catégorie", le front
   supprime la ligne pivot (`user_card_categories`) au lieu d'upsert-er.
2. **Option B — Catégorie réelle** : "Sans catégorie" devient une vraie catégorie en DB
   et la ligne 422 du blueprint est réécrite pour refléter ce choix.

### Critère de terminé

Contrat et implémentation alignés sur **une seule représentation** de l'état
"Sans catégorie". Tests E2E T1 et unitaires `useCategories` mis à jour en conséquence.

---

## TECH-002 — Clé i18n `card.delete` absente

| Champ       | Valeur                           |
| ----------- | -------------------------------- |
| **Statut**  | Ouvert                           |
| **Priorité** | Basse                           |

### Contexte

`public/locales/fr/common.json` ne définit pas la clé `card.delete`.
En runtime, l'`aria-label` du bouton de suppression (`ButtonDelete` dans `EditionCard`)
affiche la clé brute `"card.delete"` au lieu d'un libellé humain.

Impact accessibilité : les lecteurs d'écran annoncent `"card.delete"` — non conforme
WCAG 2.2 AA (critère 4.1.2 nom accessible des composants).

Le sélecteur E2E compense temporairement avec `/card\.delete|Supprimer/i`.

### Localisation

- `public/locales/fr/common.json` — fichier de traductions à compléter
- `src/components/ui/button/button-delete/ButtonDelete.tsx` — composant utilisant la clé
- `tests/e2e/admin-bank-delete.spec.ts` — sélecteur à simplifier une fois la clé ajoutée

### Action proposée

Ajouter dans `public/locales/fr/common.json` :

```json
"card": {
  "delete": "Supprimer la carte"
}
```

Vérifier que `public/locales/en/common.json` reçoit la traduction anglaise correspondante.

### Critère de terminé

L'`aria-label` du bouton vaut `"Supprimer la carte"` en runtime.
Le sélecteur E2E peut être simplifié en `/Supprimer la carte/i`.

---

## TECH-003 — Toast d'erreur relaie le message Postgres brut

| Champ       | Valeur                           |
| ----------- | -------------------------------- |
| **Statut**  | Ouvert                           |
| **Priorité** | Basse (admin-facing, tolérable) |

### Contexte

`useAdminBankCards.ts:300` renvoie `deleteError.message` brut dans l'objet d'erreur.
Quand le trigger bloque une suppression (carte utilisée dans un slot ou une séquence),
l'admin voit en toast la chaîne technique Postgres :

```
"Cannot delete bank card … still referenced (slots=t, seq_mother=f, seq_steps=f)"
```

Ce n'est pas bloquant pour l'UX admin (contexte Édition, règles TSA non applicables),
mais c'est une fuite d'information technique et un libellé inexploitable.

### Localisation

- `src/hooks/useAdminBankCards.ts` ~ligne 299-301 — renvoi du message brut
- `src/hooks/useAdminBankCardActions.ts` ~ligne 155 — affichage du toast d'erreur

### Action proposée

Mapper les exceptions DB connues vers un message contractuel avant d'afficher le toast.
Exemple de mapping :

```typescript
// Dans useAdminBankCards.ts, avant de retourner l'erreur :
const message = deleteError.message?.includes('still referenced')
  ? 'Cette carte est utilisée dans un planning ou une séquence et ne peut pas être supprimée.'
  : deleteError.message ?? 'Erreur lors de la suppression'
```

Ou centraliser dans un utilitaire `formatDeleteError(err)` si d'autres hooks
partagent le même besoin.

### Critère de terminé

Aucun message Postgres brut visible en toast dans le contexte admin.
Le test E2E T2 vérifie déjà le libellé `"Cette carte est utilisée et ne peut pas être supprimée."` — aligner ce libellé avec le message final choisi.
