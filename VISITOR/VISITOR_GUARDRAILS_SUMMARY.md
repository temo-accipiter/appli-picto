# Guardrails Visitor — Synthèse Rapide

**Fichier complet** : `/docs/VISITOR_GUARDRAILS.md`

---

## Définition Visitor

Utilisateur **non connecté** (`!user` dans `useAuth()`), accédant à `/tableau` en mode lecture seule.

---

## Composants clés

### 1. PersonalizationModal

**Chemin** : `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx`

**Affichage** : Navbar uniquement (lignes 163-167)

**Contexte Visitor** :
- Titre : "Personnalise ton tableau"
- Message : "Pour créer tes propres cartes et catégories, crée un compte et abonne-toi."
- Actions : "Créer un compte" (→ /signup) ou "Se connecter" (→ /login)

---

### 2. Navbar Restrictions

**Chemin** : `src/components/layout/navbar/Navbar.tsx`

| Élément | Visitor | Connecté |
|---------|---------|----------|
| Lien Édition | ❌ Caché (l.46) | ✅ Visible |
| Bouton Personnaliser | ✅ Visible (l.104) | ❌ Absent |
| UserMenu | ❌ Absent | ✅ Visible |
| SettingsMenu | ❌ Absent | ✅ Visible |

---

### 3. CardsEdition Restrictions

**Chemin** : `src/components/features/cards/cards-edition/CardsEdition.tsx`

**Mode Visitor** : Affiche uniquement cartes banque (lecture seule)

**Code** (lignes 243-293) :
```typescript
if (isFree) {
  return (
    <div>
      <DndGrid onReorder={() => {}} />  // No-op
      <EditionCard editable={false} />  // Pas d'édition
    </div>
  )
}
```

**Boutons masqués** :
- Créer carte (l.316)
- Gestion catégories (l.331)
- Filtre catégorie (l.338)

---

### 4. Hooks de détection

#### useIsVisitor()

**Chemin** : `src/hooks/useIsVisitor.ts`

```typescript
const { isVisitor, authReady } = useIsVisitor()
// isVisitor = true si !user && authReady
```

#### useAccountStatus()

**Chemin** : `src/hooks/useAccountStatus.ts`

```typescript
const { isFree, isSubscriber, isAdmin } = useAccountStatus()
// Visitor : status = null (pas d'utilisateur)
```

---

## Storage Access

### bank-images (PUBLIC read)

**Bucket** : `bank-images/{cardId}.jpg`

**Visitor** :
- ✅ Lire : PUBLIC (anon)
- ❌ Uploader : Admin-only (RLS policy `is_admin()`)

**Composant** : `src/utils/storage/uploadBankCardImage.ts`

### personal-images (PRIVATE)

**Bucket** : `personal-images/{accountId}/cards/{cardId}.jpg`

**Visitor** :
- ❌ Lire : Owner-only (RLS)
- ❌ Uploader : Non authentifié

**Composant** : `src/utils/storage/uploadCardImage.ts`

---

## Navigation Restrictions

**ProtectedRoute** : `src/components/shared/protected-route/ProtectedRoute.tsx`

| Route | Visitor | Connecté |
|-------|---------|----------|
| /tableau | ✅ Accès | ✅ Accès |
| /login | ✅ Accès | ✅ Redirect |
| /signup | ✅ Accès | ✅ Redirect |
| /edition | ❌ Redirect /login | ✅ Accès |
| /profil | ❌ Redirect /login | ✅ Accès |
| /abonnement | ❌ Redirect /login | ✅ Accès |
| /admin/* | ❌ AdminRoute /tableau | ✅ Si admin |

---

## Erreurs DB (backend guardrails)

### Tentative création carte (Visitor)

**Frontend** : Tentative via `usePersonalCards.createCard()`

**Backend RLS** : Refus avec erreur

```
Error: Feature unavailable for non-authenticated users
ou
Error: Not authorized to create personal cards
```

**Frontend** : Catch erreur, affiche message toast

**Code** (Edition.tsx lignes 231-266) :

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

## Hiérarchie des guardrails

```
1. NAVIGATION
   ProtectedRoute.tsx → redirect /login

2. UI MASQUAGE
   Navbar.tsx → lien Édition caché
   CardsEdition.tsx → boutons masqués

3. MODALES CONVERSION
   PersonalizationModal → invite sign up

4. DB RLS BLOQUAGE
   usePersonalCards.ts → feature_unavailable error

5. STORAGE RLS
   uploadCardImage.ts → 403 Forbidden
```

---

## Fichiers à surveiller

```
Modales :
├─ modal-personalization/PersonalizationModal.tsx (ligne 11: type)
├─ modal-quota/ModalQuota.tsx
└─ modal-ajout/ModalAjout.tsx

UI Restrictions :
├─ layout/navbar/Navbar.tsx (lignes 101-112: isVisitorMode)
├─ features/cards/cards-edition/CardsEdition.tsx (ligne 243: if isFree)
└─ shared/protected-route/ProtectedRoute.tsx

Hooks :
├─ hooks/useIsVisitor.ts (définition)
├─ hooks/useAccountStatus.ts (cosmétique)
├─ hooks/useBankCards.ts (READ-only)
└─ hooks/usePersonalCards.ts (RLS bloque)

Storage :
├─ utils/storage/uploadCardImage.ts (personal-images)
└─ utils/storage/uploadBankCardImage.ts (bank-images)
```

---

## Points clés

1. **Visitor ≠ Free** : Visitor = non connecté, Free = connecté avec statut 'free'
2. **PersonalizationModal contexte='visitor'** : UNIQUEMENT dans Navbar, jamais Édition
3. **DB-first** : Restrictions vraies viennent de RLS, pas frontend
4. **bank-images PUBLIC** : Visitor peut voir cartes banque
5. **personal-images PRIVATE** : Visitor ne peut pas uploader/voir
6. **ProtectedRoute** : Bloque accès /edition, /profil, /abonnement
7. **Hydration** : Toujours vérifier `authReady` avant `isVisitor`

---

## Checklists pour modifications

### Ajouter restriction UI

```
1. Déterminer état : Visitor, Free, ou Subscriber
2. Importer hook : useIsVisitor() ou useAccountStatus()
3. Ajouter condition : {!isFree && <Button />}
4. Tester : Visitor → affichage correct
```

### Ajouter guardrail Storage

```
1. Choisir bucket : bank-images (public) ou personal-images (private)
2. Vérifier RLS policies existantes
3. Uploader génère path stricte : {accountId}/cards/{cardId}.jpg
4. Frontend gère 403 Forbidden du Storage
```

### Ajouter route protégée

```
1. Placer route dans (protected)/ folder
2. Wrapper avec <ProtectedRoute>
3. Visitor → redirect /login
4. Non-admin → redirect /tableau
```
