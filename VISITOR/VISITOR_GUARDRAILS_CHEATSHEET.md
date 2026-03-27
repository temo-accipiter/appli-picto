# Visitor Guardrails — Cheat Sheet

Une page pour trouver rapidement les guardrails Visitor.

---

## Détection Visitor

```typescript
// ✅ Détect Visitor (non connecté)
import { useIsVisitor } from '@/hooks'
const { isVisitor, authReady } = useIsVisitor()

if (!authReady) return <Loader />
if (isVisitor) return <DemoUI />

// ✅ Détect statut (cosmétique)
import { useAccountStatus } from '@/hooks'
const { isFree, isSubscriber, isAdmin } = useAccountStatus()
// Visitor: status = null
```

---

## Afficher PersonalizationModal

```typescript
// SEULEMENT dans Navbar (lignes 163-167)
import { PersonalizationModal } from '@/components'

<PersonalizationModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  context="visitor"  // ou "free"
/>

// JAMAIS dans Édition (contexte "Édition UNIQUEMENT (adulte)")
```

---

## Masquer boutons/menus

```typescript
// ❌ Masquer lien Édition pour Visitor
{(isTableau || isProfil) && !isVisitor && (
  <Link href="/edition">Éditer</Link>
)}

// ❌ Masquer création carte
{!isFree && (
  <Button label="Créer carte" onClick={...} />
)}

// ✅ Afficher bouton Personnaliser pour Visitor
{isVisitorMode && (
  <button onClick={() => setShowPersonalizationModal(true)}>
    Personnaliser
  </button>
)}
```

---

## Mode lecture seule (Free)

```typescript
// CardsEdition.tsx : Affichage simplifié
if (isFree) {
  return (
    <DndGrid
      onReorder={() => {}}  // No-op
      renderItem={(card) => (
        <EditionCard
          editable={false}  // Pas d'édition
          // ...
        />
      )}
    />
  )
}
```

---

## Gestion d'erreurs DB (Visitor tente créer carte)

```typescript
// usePersonalCards.createCard() → DB refuse
const { error: insertError } = await createCard({
  id: cardId,
  name: label,
  image_url: imagePath,
})

if (insertError) {
  const msg = insertError.message?.toLowerCase() ?? ''

  // Parser erreur
  if (msg.includes('feature_unavailable')) {
    show('Fonctionnalité réservée aux abonnés.', 'error')
  } else if (msg.includes('not_authenticated')) {
    show("Veuillez vous connecter d'abord.", 'error')
  }
}
```

---

## Storage (Images)

```typescript
// ✅ Lire images banque (PUBLIC)
import { SignedImage } from '@/components'

<SignedImage
  filePath={card.image_url}
  bucket="bank-images"  // Public read
  alt={card.name}
/>

// ❌ Upload images perso (PRIVATE - Visitor ne peut pas)
import { uploadCardImage } from '@/utils/storage/uploadCardImage'

// uploadCardImage() → 403 Forbidden (Visitor non authentifié)
// Path strict: personal-images/{accountId}/cards/{cardId}.jpg
```

---

## Routes protégées

```typescript
// ProtectedRoute wrapper : bloque Visitor
<ProtectedRoute requireAdmin={false}>
  <EditionPage />
</ProtectedRoute>

// Visitor → redirect /login
// Non-admin → redirect /tableau
// Si requireAdmin=true : admin-only check
```

---

## Hooks critiques

```typescript
// useIsVisitor() — Détection mode Visitor
const { isVisitor, authReady } = useIsVisitor()
// isVisitor = authReady && !user

// useAccountStatus() — Statut utilisateur (cosmétique)
const { isFree, isSubscriber, isAdmin, status } = useAccountStatus()
// Visitor: status = null
// Free: status = 'free'
// Subscriber: status = 'subscriber'
// Admin: status = 'admin'

// useBankCards() — Cartes banque (READ-only)
const { cards, loading } = useBankCards()
// Accessible à tous : Visitor, Free, Subscriber, Admin
// Images: bank-images (public bucket)

// usePersonalCards() — Cartes perso (RLS bloque Visitor)
const { cards, createCard } = usePersonalCards()
// Visitor: cards = [] (pas d'user)
// Free: RLS bloque insert → error
// Subscriber/Admin: créable
```

---

## PersonalizationModal Wordings

```typescript
// Contexte "visitor" (non connecté)
{
  title: 'Personnalise ton tableau',
  message: 'Pour créer tes propres cartes et catégories, crée un compte et abonne-toi.',
  primaryLabel: 'Créer un compte',  // → /signup
  secondaryLabel: 'Se connecter',   // → /login
}

// Contexte "free" (gratuit)
{
  title: 'Fonctionnalité Premium',
  message: 'Ton compte gratuit te permet de sauvegarder tes préférences. Pour créer des cartes personnalisées, passe à Premium.',
  primaryLabel: 'Passer à Premium',  // → /profil#abonnement
  secondaryLabel: 'Fermer',
}
```

---

## Quotas DB (rejection messages)

```typescript
// Erreurs possibles lors création carte
if (msg.includes('feature_unavailable')) {
  // Visitor non authentifié OU Free sans permissions
}
if (msg.includes('stock')) {
  // Quota atteint (50 cartes max)
}
if (msg.includes('monthly')) {
  // Quota mensuel atteint (100 cartes/mois max)
}
```

---

## Hiérarchie de refus

```
┌─ Niveau 1 : Navigation
│  └─ ProtectedRoute → redirect /login si Visitor
├─ Niveau 2 : UI masquage
│  └─ Navbar : lien Édition caché
│  └─ CardsEdition : boutons création masqués
├─ Niveau 3 : Modales
│  └─ PersonalizationModal : invite sign up
├─ Niveau 4 : DB RLS
│  └─ usePersonalCards.createCard() → feature_unavailable
└─ Niveau 5 : Storage RLS
   └─ uploadCardImage() → 403 Forbidden
```

**Importé** : Les niveaux 1-3 sont cosmétiques.
**Critique** : Les niveaux 4-5 sont les vraies protections (DB-first).

---

## Fichiers clés (par usage)

```
Déterminer si Visitor :
├─ src/hooks/useIsVisitor.ts
└─ src/hooks/useAuth.ts

Afficher modal personnalisation :
└─ src/components/shared/modal/modal-personalization/PersonalizationModal.tsx

Masquer éléments Navbar :
└─ src/components/layout/navbar/Navbar.tsx (lignes 46, 101-112)

Affichage mode Free :
└─ src/components/features/cards/cards-edition/CardsEdition.tsx (ligne 243)

Protéger routes :
└─ src/components/shared/protected-route/ProtectedRoute.tsx

Lire cartes banque :
└─ src/hooks/useBankCards.ts

Créer cartes perso :
├─ src/hooks/usePersonalCards.ts
└─ src/utils/storage/uploadCardImage.ts

Upload images :
├─ src/utils/storage/uploadCardImage.ts (personal)
└─ src/utils/storage/uploadBankCardImage.ts (bank)

Gérer erreurs quota :
└─ src/page-components/edition/Edition.tsx (lignes 231-266)
```

---

## Tests à faire pour Visitor

```
1. Naviguer à /tableau
   ✅ Affichage normal (cartes banque visibles)
   ✅ Lien Édition absent
   ✅ UserMenu absent
   ✅ Bouton Personnaliser visible

2. Cliquer Personnaliser
   ✅ PersonalizationModal "visitor" s'affiche
   ✅ Bouton "Créer un compte" → /signup
   ✅ Bouton "Se connecter" → /login

3. Essayer /edition
   ✅ Redirect → /login

4. Essayer /profil
   ✅ Redirect → /login

5. Essayer /abonnement
   ✅ Redirect → /login

6. En mode demo Tableau
   ✅ Tableau enfant affiche normalement
   ✅ Cartes banque lisibles
   ✅ Pas de boutons édition
```

---

## Notes de développement

**Architecture DB-first** :

- Ne pas faire de vérifications côté frontend pour autorisation
- Laisser DB/RLS rejeter les actions non autorisées
- Frontend gère affichage + erreurs UI

**Hydration Next.js** :

```typescript
// ❌ MAUVAIS
if (isVisitor) return <Demo />

// ✅ BON
const { isVisitor, authReady } = useIsVisitor()
if (!authReady) return <Loader />
if (isVisitor) return <Demo />
```

**PersonalizationModal vs ModalQuota** :

- PersonalizationModal : Invite création compte (Visitor → Free)
- ModalQuota : Affiche quotas épuisés (Free → Subscriber)

**Storage buckets** :

- `bank-images/{cardId}.jpg` : PUBLIC read, admin write
- `personal-images/{accountId}/cards/{cardId}.jpg` : owner-only, subscriber+ write
