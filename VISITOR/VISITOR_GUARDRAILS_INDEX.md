# Index des Guardrails Visitor — Guide de navigation

**Chemins absolus pour accès direct aux fichiers clés.**

---

## Documentation générée

| Fichier | Contenu | Taille |
|---------|---------|--------|
| `/docs/VISITOR_GUARDRAILS.md` | **Exploration complète exhaustive** — Tous les guardrails détaillés | ~8000 lignes |
| `/docs/VISITOR_GUARDRAILS_SUMMARY.md` | **Synthèse intermédiaire** — Points clés avec références ligne | ~300 lignes |
| `/docs/VISITOR_GUARDRAILS_CHEATSHEET.md` | **Cheat sheet rapide** — Snippets de code + tests | ~200 lignes |
| `/docs/VISITOR_GUARDRAILS_INDEX.md` | **Ce fichier** — Navigation guide | - |

---

## Composants clés

### 1. PersonalizationModal — Invite conversion Visitor

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/modal/modal-personalization/PersonalizationModal.tsx`

**Clé dans doc complète** : [Modales de blocage](VISITOR_GUARDRAILS.md#modales-de-blocage-personalizationmodal)

**Utilisation** :
- Ligne 11 : Type `PersonalizationContext = 'visitor' | 'free'`
- Lignes 21-36 : Wordings par contexte
- Lignes 46-54 : Routage actions

**Affichage** : Navbar uniquement (voir ci-après)

---

### 2. Navbar — Masquage lien Édition + bouton Personnaliser

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/layout/navbar/Navbar.tsx`

**Clé dans doc complète** : [Restrictions UI → Navbar](VISITOR_GUARDRAILS.md#2-navbar--restrictions-de-navigabilité)

**Points d'intérêt** :
- Ligne 27 : Import `useIsVisitor()`
- Lignes 46-60 : Lien Édition masqué si Visitor
- Lignes 101-112 : Bouton Personnaliser visible pour `isVisitorMode`
- Lignes 163-167 : Affichage `PersonalizationModal`

**Détection** :
- Ligne 37 : `isVisitorMode = !user && (isVisitor || !authReady)`

---

### 3. CardsEdition — Mode Free (lecture seule)

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/cards/cards-edition/CardsEdition.tsx`

**Clé dans doc complète** : [Restrictions UI → CardsEdition](VISITOR_GUARDRAILS.md#1-cardeedition--mode-free-affichage-simplifié)

**Points d'intérêt** :
- Lignes 243-293 : Bloc `if (isFree)` — affichage simplifié
- Lignes 251-253 : DnD bloqué (`onReorder={() => {}}`)
- Lignes 267-268 : Édition bloquée (`editable={false}`)
- Lignes 316-336 : Boutons masqués si Free

**Props critiques** :
- Ligne 116 : `isFree?: boolean`
- Ligne 111 : `isAdmin?: boolean`

---

### 4. Hooks de détection

#### useIsVisitor()

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useIsVisitor.ts`

**Clé dans doc complète** : [Hooks de détection → useIsVisitor()](VISITOR_GUARDRAILS.md#hook-useisvisitor)

**Définition** :
- Ligne 42 : `isVisitor: authReady && !user`

**Utilisation** :
```typescript
const { isVisitor, authReady } = useIsVisitor()
if (!authReady) return <Loader />
if (isVisitor) return <DemoUI />
```

#### useAccountStatus()

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useAccountStatus.ts`

**Clé dans doc complète** : [Hooks de détection → useAccountStatus()](VISITOR_GUARDRAILS.md#hook-useaccountstatus)

**Définition** :
- Lignes 66-69 : Fetch depuis DB `accounts.status`
- Visitor : `status = null`

**Important** : Usage COSMÉTIQUE uniquement (affichage)

---

## Storage

### bank-images — PUBLIC read

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/utils/storage/uploadBankCardImage.ts`

**Clé dans doc complète** : [Accès Storage → bank-images](VISITOR_GUARDRAILS.md#bucket-bank-images--public-visitor-peut-lire)

**RLS policies** :
- SELECT : public (anon + auth)
- INSERT/UPDATE/DELETE : admin-only

**Utilisation** :
- CardsEdition ligne 259 : `bucket="bank-images"`

---

### personal-images — PRIVATE (Visitor ne peut pas)

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/utils/storage/uploadCardImage.ts`

**Clé dans doc complète** : [Accès Storage → personal-images](VISITOR_GUARDRAILS.md#bucket-personal-images--private-visitor-ne-peut-pas-accéder)

**RLS policies** :
- SELECT : owner-only
- INSERT : subscriber+ only
- UPDATE : impossible (trigger)

**Utilisation** :
- CardsEdition ligne 600 : `bucket="personal-images"`

---

## Gestion d'erreurs DB

### Refus création carte (Visitor)

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/page-components/edition/Edition.tsx`

**Clé dans doc complète** : [Quotas et gestion d'erreurs → Gestion d'erreurs](VISITOR_GUARDRAILS.md#quotas-et-gestion-derreurs-db)

**Code** (lignes 231-266) :
```typescript
if (insertError) {
  const errorMsg = insertError.message?.toLowerCase() ?? ''
  
  if (errorMsg.includes('feature_unavailable')) {
    show('Fonctionnalité réservée aux abonnés.', 'error')
  } else if (errorMsg.includes('stock')) {
    show('Tu as atteint la limite de 50 cartes.', 'error')
  }
}
```

---

## Routes protégées

### ProtectedRoute

**Chemin absolu** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/protected-route/ProtectedRoute.tsx`

**Clé dans doc complète** : [Restrictions de navigabilité](VISITOR_GUARDRAILS.md#restrictions-de-navigabilité)

**Vérifications** :
- Si pas connecté (`!user`) : redirect `/login`
- Si `requireAdmin=true` et non-admin : redirect `/tableau`

---

## Fichiers de test

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/tests/e2e/`

Chercher fichiers avec :
```bash
grep -r "visitor\|Visitor" tests/ --include="*.spec.ts"
```

---

## Résumé rapide des chemins

```
Détection Visitor :
├─ /src/hooks/useIsVisitor.ts
├─ /src/hooks/useAuth.ts
└─ /src/hooks/useAccountStatus.ts

Modales :
├─ /src/components/shared/modal/modal-personalization/PersonalizationModal.tsx
├─ /src/components/shared/modal/modal-quota/ModalQuota.tsx
└─ /src/components/layout/navbar/Navbar.tsx (affichage)

UI Restrictions :
├─ /src/components/layout/navbar/Navbar.tsx (lien édition caché)
├─ /src/components/features/cards/cards-edition/CardsEdition.tsx (mode free)
└─ /src/components/shared/protected-route/ProtectedRoute.tsx (navigation)

Storage :
├─ /src/utils/storage/uploadCardImage.ts (personal-images private)
└─ /src/utils/storage/uploadBankCardImage.ts (bank-images public)

Gestion erreurs :
├─ /src/page-components/edition/Edition.tsx (parsing erreurs DB)
└─ /src/hooks/usePersonalCards.ts (création avec quota check)

Données :
├─ /src/hooks/useBankCards.ts (read-only public)
└─ /src/hooks/usePersonalCards.ts (RLS bloque visitor)
```

---

## Comment utiliser ce guide

### Je cherche comment détecter un Visitor

→ Voir **useIsVisitor()** + **useAccountStatus()**

### Je dois ajouter une restriction UI

→ Voir **Patterns d'affichage conditionnels** dans VISITOR_GUARDRAILS.md

### Je dois afficher PersonalizationModal

→ Voir **Modales de blocage** + **Navbar**

### Je dois protéger une route

→ Voir **ProtectedRoute**

### Je dois gérer erreurs de quota

→ Voir **Gestion d'erreurs DB** dans VISITOR_GUARDRAILS.md

### Je dois manipuler images

→ Voir **Storage (bank-images vs personal-images)**

### Je veux un code snippet rapide

→ Voir **VISITOR_GUARDRAILS_CHEATSHEET.md**

---

## Checklist avant modification

- [ ] Ai-je lu la section pertinente dans VISITOR_GUARDRAILS.md ?
- [ ] Ai-je vérifié les chemins absolus des fichiers ?
- [ ] Ai-je considéré les niveaux 1-5 de refus (voir synthèse) ?
- [ ] Ai-je testé avec un utilisateur Visitor ?
- [ ] Ai-je vérifié que DB-first est respectée (pas d'autorisation en frontend) ?
- [ ] Ai-je considéré l'hydration Next.js (authReady + isVisitor) ?

---

**Dernière mise à jour** : 2026-03-25

**Documents** :
- VISITOR_GUARDRAILS.md (complet)
- VISITOR_GUARDRAILS_SUMMARY.md (synthèse)
- VISITOR_GUARDRAILS_CHEATSHEET.md (snippets)
- VISITOR_GUARDRAILS_INDEX.md (ce fichier)
