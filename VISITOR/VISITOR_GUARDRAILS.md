# Restrictions d'Interface pour le Rôle Visitor — Appli-Picto

**Date** : 2026-03-25
**Version** : 1.0 (exploration complète)
**Objectif** : Documentation exhaustive de tous les guardrails (restrictions d'interface) pour les utilisateurs en mode Visitor.

---

## Index

1. [Vue d'ensemble](#vue-densemble)
2. [Modales de blocage (PersonalizationModal)](#modales-de-blocage-personalizationmodal)
3. [Restrictions UI par composant](#restrictions-ui-par-composant)
4. [Accès Storage (bank-images vs personal-images)](#accès-storage)
5. [Hooks de détection Visitor](#hooks-de-détection-visitor)
6. [Quotas et gestion d'erreurs DB](#quotas-et-gestion-derreurs-db)
7. [Restrictions de navigabilité](#restrictions-de-navigabilité)
8. [Patterns d'affichage conditionnels](#patterns-daffichage-conditionnels)
9. [Synthèse des guardrails](#synthèse-des-guardrails)

---

## Vue d'ensemble

**Définition Visitor** : Utilisateur **non connecté** (`!user` dans `useAuth()`)

**Contexte d'affichage** :
- Visitor accède au Tableau (enfant) via `/tableau` → **mode lecture seule**
- Visitor peut configurer préférences mais **pas créer** de contenu personnalisé
- Les données Visitor sont **local-only** (future IndexedDB en S10)

**Architecture de contrôle** :
- **Frontend** : Restrictions UI cosmétiques (masquage, désactivation)
- **Backend** : RLS Supabase bloque les vraies modifications (DB-first)
- **Storage** : Accès limité à `bank-images` PUBLIC uniquement

---

## Modales de blocage (PersonalizationModal)

### Composant principal

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/modal/modal-personalization/PersonalizationModal.tsx`

**Type** : Client Component
**But** : Afficher message de conversion pour Visitor et Free (deux contextes différents)

**Code clé** :

```typescript
// Lignes 1-19 : Définition des contextes
export type PersonalizationContext = 'visitor' | 'free'

interface PersonalizationModalProps {
  isOpen: boolean
  onClose: () => void
  context: PersonalizationContext
}

// Lignes 20-36 : Wordings contractuels (§6.4)
const WORDINGS = {
  visitor: {
    title: 'Personnalise ton tableau',
    message: 'Pour créer tes propres cartes et catégories, crée un compte et abonne-toi.',
    primaryLabel: 'Créer un compte',
    secondaryLabel: 'Se connecter',
  },
  free: {
    title: 'Fonctionnalité Premium',
    message: 'Ton compte gratuit te permet de sauvegarder tes préférences. Pour créer des cartes et catégories personnalisées, passe à la version Premium.',
    primaryLabel: 'Passer à Premium',
    secondaryLabel: 'Fermer',
  },
} as const

// Lignes 46-54 : Routage des actions primaires
const handlePrimary = () => {
  if (context === 'visitor') {
    router.push('/signup')  // Visitor → création compte
  } else {
    router.push('/profil#abonnement')  // Free → upgrade Stripe
  }
  onClose()
}
```

**Restrictions imposées** :
- Visitor cliquant sur création carte/catégorie → affichage modal
- Modal propose : **Créer un compte** (→ `/signup`) ou **Se connecter** (→ `/login`)
- Pas d'actions destructrices possibles avant création compte

**Contrat** : §6.4 — Wordings spécifiques Visitor et Free

---

### Où est affiché PersonalizationModal

**Emplacement principal** : `src/components/layout/navbar/Navbar.tsx` (lignes 163-167)

```typescript
// Ligne 24-30 : State du modal
const [showPersonalizationModal, setShowPersonalizationModal] = useState(false)

// Ligne 27 : Détection Visitor
const { isVisitor, authReady } = useIsVisitor()

// Lignes 101-112 : Bouton "Personnaliser" pour Visitor uniquement
{isVisitorMode ? (
  <>
    <button
      className="nav-button personalize-button"
      onClick={() => setShowPersonalizationModal(true)}  // Ouvre modal
    >
      <Palette size={18} />
      <span>{t('nav.personalization')}</span>
    </button>
    {/* + boutons Créer compte / Se connecter */}
  </>
) : null}

// Lignes 163-167 : Affichage modal
<PersonalizationModal
  isOpen={showPersonalizationModal}
  onClose={() => setShowPersonalizationModal(false)}
  context="visitor"  // TOUJOURS "visitor" pour Navbar
/>
```

**Conditions d'affichage** :
- Navbar détecte : `isVisitorMode = !user && (isVisitor || !authReady)`
- Si Visitor : affiche bouton "Personnaliser"
- Au clic : modal apparaît avec contexte "visitor"

**Important** : Modal n'est affiché que **dans Navbar**, jamais directement depuis page Édition (contexte "Édition UNIQUEMENT (adulte)" — ligne 3-4 du composant)

---

## Restrictions UI par composant

### 1. CardsEdition — Mode Free (Affichage simplifié)

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/features/cards/cards-edition/CardsEdition.tsx`

**Contexte** : Composant affichage/édition cartes (utilisé en page `/edition`)

**Prop critiques** :
- `isFree?: boolean` — Indicateur cosmétique (lecture seule)
- `bankCards?: BankCardItem[]` — Cartes banque publiques
- `isAdmin?: boolean` — Gestion admin uniquement

**Code de restriction (lignes 243-293)** :

```typescript
// ✅ Free : Affichage simplifié (uniquement cartes banque, sans édition)
if (isFree) {
  return (
    <div className="checklist-edition">
      {/* Affichage simplifié : uniquement cartes banque (lecture seule) */}
      {bankCards && bankCards.length > 0 ? (
        <DndGrid
          items={bankCards}
          // 🔒 Cartes banque : pas de réorganisation (lecture seule)
          onReorder={() => {}}
          renderItem={(bankCard: BankCardItem) => (
            <EditionCard
              // 🔒 Free : lecture seule (pas d'édition)
              editable={false}
              // ✅ Checkbox timeline active
              checked={isCardInTimeline(bankCard.id)}
              onToggleCheck={() => handleToggleCheckbox(bankCard.id)}
              disabled={checkboxDisabled}
              checkboxDisabled={lockedCardIds?.has(bankCard.id) ?? false}
            />
          )}
        />
      ) : (
        <div role="status" aria-live="polite">
          💤 Aucune carte de banque disponible
        </div>
      )}
    </div>
  )
}
```

**Restrictions appliquées** :
1. **Affichage limité** : Seules les cartes banque visibles
2. **Édition bloquée** : `editable={false}` → pas d'édition nom
3. **DnD bloqué** : `onReorder={() => {}}` → pas de réorganisation
4. **Boutons cachés** (lignes 315-336) :
   - Bouton "Créer carte" : masqué si `!isFree`
   - Bouton "Gestion catégories" : masqué si `!isFree`
   - Sélecteur filtre catégorie : masqué si `!isFree`

**Stockage** :
- Cartes banque : bucket `bank-images` (PUBLIC read)
- Pas d'upload `personal-images` possible pour Free/Visitor

---

### 2. Navbar — Restrictions de navigabilité

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/layout/navbar/Navbar.tsx`

**Code de restriction (lignes 46-157)** :

```typescript
// Ligne 46-60 : Lien Édition CACHÉ pour Visitor
{(isTableau || isProfil) && !isVisitor && (
  <motion.div>
    <Link href="/edition" aria-label={t('nav.edition')}>
      <Pencil size={20} />  // ← ABSENT pour Visitor
    </Link>
  </motion.div>
)}

// Lignes 76-160 : Actions différentes selon état auth
{user ? (
  // Connecté : UserMenu + SettingsMenu
  <motion.div className="navbar-actions">
    {isEdition && <SettingsMenu />}
    <UserMenu />
  </motion.div>
) : (
  // Visitor : Boutons de conversion uniquement
  <motion.div className="navbar-actions visitor-actions">
    <div className="visitor-controls">
      <ThemeToggle />
      <LangSelector />
    </div>
    <div className="visitor-buttons">
      {isVisitorMode ? (
        // Visitor : Personnaliser + Créer compte + Connexion
        <>
          <button onClick={() => setShowPersonalizationModal(true)}>
            ← Personnaliser (déclenche modal)
          </button>
          <Link href="/signup">Créer un compte</Link>
          <Link href="/login">Se connecter</Link>
        </>
      ) : (
        // Non-Visitor : Créer compte + Connexion simples
        <>
          <Link href="/signup">Créer un compte</Link>
          <Link href="/login">Se connecter</Link>
        </>
      )}
    </div>
  </motion.div>
)}
```

**Restrictions appliquées** :
1. **Lien Édition caché** : Visitor ne peut pas accéder `/edition`
2. **UserMenu absent** : Pas de menu utilisateur
3. **SettingsMenu absent** : Pas d'accès aux paramètres
4. **Bouton Personnaliser visible** : Invite à créer compte
5. **Navigation limitée** : Seulement Tableau, Login, Signup

---

### 3. ModalQuota — Affichage des limites

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/modal/modal-quota/ModalQuota.tsx`

**But** : Afficher les quotas dépassés (cosmétique, erreur DB déclenche réellement)

**Code (lignes 1-103)** :

```typescript
type ContentType = 'task' | 'reward' | 'category'

interface ModalQuotaProps {
  isOpen: boolean
  onClose: () => void
  contentType: ContentType
  currentUsage: number
  limit: number
  period?: Period  // 'total' | 'monthly'
}

// Lignes 45-61 : Messages contextuels
const getContextMessage = () => {
  if (percentage >= 100) {
    return period === 'monthly'
      ? `Vous avez utilisé toutes vos ${label} pour ce mois.`
      : `Vous avez utilisé toutes vos ${label} disponibles dans votre forfait gratuit.`
  }
  if (percentage >= 90) {
    return `Attention : vous approchez de la limite (${percentage}% utilisé).`
  }
  // ...
}
```

**Restriction** : Modal affiche l'état des quotas, mais **refus réel vient de la DB** via RLS

---

## Accès Storage

### Bucket `bank-images` — PUBLIC (Visitor peut lire)

**Chemin de stockage** : `bank-images/{cardId}.jpg`

**Accès** :
- **SELECT** : PUBLIC (anon + authenticated)
- **INSERT** : Admin uniquement (RLS policy `is_admin()`)
- **UPDATE** : Admin uniquement
- **DELETE** : Admin uniquement

**Composant d'upload** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/utils/storage/uploadBankCardImage.ts`

```typescript
// Lignes 72-83 : Commentaire d'accès
/**
 * Storage policies bank-images :
 * - SELECT : public (anon + authenticated)
 * - INSERT/UPDATE/DELETE : admin-only (is_admin())
 * - Format : {uuid}.jpg
 */

// Ligne 156-162 : Upload vers bucket public
const { data, error } = await supabase.storage
  .from('bank-images')  // Bucket public
  .upload(path, jpegBlob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/jpeg',
  })
```

**Restriction Visitor** : Peut **lire** images banque, **ne peut pas** uploader/modifier

---

### Bucket `personal-images` — PRIVATE (Visitor ne peut pas accéder)

**Chemin de stockage** : `personal-images/{accountId}/cards/{cardId}.jpg`

**Accès** :
- **SELECT** : Owner uniquement (RLS policy `auth.uid() = owner_id`)
- **INSERT** : Subscriber/Admin uniquement (RLS policy `accounts.status`)
- **UPDATE** : Impossible (trigger `prevent_update_image_url`)
- **DELETE** : Owner uniquement

**Composant d'upload** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/utils/storage/uploadCardImage.ts`

```typescript
// Lignes 72-77 : Restriction contractuelle
/**
 * Upload dédié cartes personnelles
 * - Conversion JPEG réelle (pas juste renommage)
 * - Path strict: personal-images/{accountId}/cards/{cardId}.jpg
 * - cardId obligatoire
 * - Aucun fallback legacy
 */

// Lignes 121-139 : Vérification session + validation compte
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  return { path: null, error: new Error('Utilisateur non authentifié') }
}

// Vérifier que accountId correspond à l'utilisateur authentifié
if (session.user.id !== accountId) {
  return { path: null, error: new Error("accountId ne correspond pas") }
}
```

**Restriction Visitor** : **Aucun accès** à `personal-images` (non connecté)

---

### Utilisation dans composants

**CardsEdition (ligne 259)** : Affichage image banque

```typescript
<SignedImage
  filePath={bankCard.image_url || ''}
  bucket="bank-images"  // ← Bucket PUBLIC
  alt={bankCard.name}
/>
```

**CardsEdition (ligne 600)** : Affichage image personnelle (Subscriber uniquement)

```typescript
<SignedImage
  filePath={item.image_url || ''}
  bucket="personal-images"  // ← Bucket PRIVATE
  alt={item.name}
/>
```

**ItemForm (ligne 97)** : Upload vers `personal-images`

```typescript
deleteImageIfAny(uploadedImagePath, 'personal-images').catch(err => {
  console.error('Erreur cleanup:', err)
})
```

---

## Hooks de détection Visitor

### Hook `useIsVisitor()`

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useIsVisitor.ts`

**But** : Détecter si utilisateur est en mode Visitor (non connecté)

**Code (lignes 1-45)** :

```typescript
interface UseIsVisitorReturn {
  isVisitor: boolean
  authReady: boolean
}

export default function useIsVisitor(): UseIsVisitorReturn {
  const { user, authReady } = useAuth()

  return {
    isVisitor: authReady && !user,  // Visitor = !user
    authReady,
  }
}
```

**Conditions** :
- `isVisitor: boolean` = true si `!user && authReady`
- **TOUJOURS** vérifier `authReady` avant `isVisitor` (hydration Next.js)

**Utilisation** (Navbar ligne 27) :

```typescript
const { isVisitor, authReady } = useIsVisitor()
const isVisitorMode = !user && (isVisitor || !authReady)  // Guard hydration
```

---

### Hook `useAccountStatus()`

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useAccountStatus.ts`

**But** : Lecture statut utilisateur (`free`, `subscriber`, `admin`) pour affichage UI

**Code (lignes 1-119)** :

```typescript
interface UseAccountStatusReturn {
  status: AccountStatus | null
  loading: boolean
  error: Error | null
  isFree: boolean
  isSubscriber: boolean
  isAdmin: boolean
}

export default function useAccountStatus(): UseAccountStatusReturn {
  const { user, authReady } = useAuth()
  const [status, setStatus] = useState<AccountStatus | null>(null)

  useEffect(() => {
    // Si auth pas prête ou pas d'user → Visitor (local-only)
    if (!authReady || !user) {
      setStatus(null)
      setLoading(false)
      return
    }

    // Fetch account status depuis DB
    const { data, error: fetchError } = await supabase
      .from('accounts')
      .select('status')
      .eq('id', user.id)
      .single()

    // ... gestion erreur
  }, [user, authReady])

  return {
    status,
    loading,
    error,
    isFree: status === 'free',
    isSubscriber: status === 'subscriber',
    isAdmin: status === 'admin',
  }
}
```

**Important** :
- **Usage COSMÉTIQUE UNIQUEMENT** (affichage UI, badges)
- **NE PAS** utiliser pour autorisation (DB-first via RLS)
- Visitor : `status = null` (pas de compte)
- Free : `status = 'free'`
- Subscriber : `status = 'subscriber'`
- Admin : `status = 'admin'`

**Utilisation** (Edition.tsx ligne 145) :

```typescript
const { isAdmin, isFree } = useAccountStatus()

// Affichage cosmétique uniquement
<CardsEdition
  isFree={isFree}  // ← Masque boutons création
  isAdmin={isAdmin}  // ← Affiche admin features
/>
```

---

## Quotas et gestion d'erreurs DB

### Quotas Visitor

**Restriction fondamentale** : Visitor **ne peut rien créer** (pas d'utilisateur en DB)

**Tentative création carte** :
- Frontend : aucune restriction visible (Visitor peut appuyer sur bouton)
- DB RLS : Refuse avec erreur `feature_unavailable` ou `not_authenticated`
- Frontend : Catch erreur DB, affiche `PersonalizationModal` ou message d'erreur

### Quotas Free (utilisateur connecté avec statut `free`)

**Limites** (RLS + triggers DB) :
- 5 cartes personnelles max
- 2 catégories personnelles max
- 2 profils enfants max
- 1 device max

**Gestion d'erreurs** (Edition.tsx lignes 231-266) :

```typescript
const { error: insertError } = await createCard({
  id: cardId,
  name: label,
  image_url: imagePath,
})

if (insertError) {
  // 🗑️ Cleanup image orpheline
  await deleteImageIfAny(imagePath, 'personal-images')

  // Parser erreur quota
  const errorMsg = insertError.message?.toLowerCase() ?? ''

  if (errorMsg.includes('stock')) {
    show('Tu as atteint la limite de 50 cartes.', 'error')
    return
  }

  if (errorMsg.includes('feature_unavailable') || errorMsg.includes('feature')) {
    show(
      'Fonctionnalité réservée aux abonnés. Passe Premium pour créer des cartes.',
      'error'
    )
    return
  }

  // Erreur générique
  show('Erreur lors de la création de la carte.', 'error')
}
```

**Messages d'erreur** :
- Quota dépassé (50 cartes) : "Tu as atteint la limite de 50 cartes."
- Feature indisponible : "Fonctionnalité réservée aux abonnés."
- Mensuel dépassé : "Tu as créé 100 cartes ce mois-ci. Limite atteinte."

---

## Restrictions de navigabilité

### Routes accessibles Visitor

| Route | Accessible | Raison |
|-------|-----------|--------|
| `/tableau` | ✅ Oui | Affichage demo (cartes banque) |
| `/login` | ✅ Oui | Connexion |
| `/signup` | ✅ Oui | Création compte |
| `/legal/*` | ✅ Oui | Pages légales (CGU, RGPD, etc.) |
| `/edition` | ❌ Non | Page édition (protégée) |
| `/profil` | ❌ Non | Page profil (protégée) |
| `/abonnement` | ❌ Non | Page abonnement (protégée) |
| `/admin/*` | ❌ Non | Pages admin (admin-only) |

### Composant ProtectedRoute

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/components/shared/protected-route/ProtectedRoute.tsx`

**But** : Bloquer accès pages protégées pour Visitor

**Code de vérification** :
```typescript
// Si pas connecté : redirect vers /login
if (!user && authReady) {
  return <redirect url="/login" />
}

// Si non-admin : redirect vers /tableau
if (requireAdmin && !isAdmin) {
  return <redirect url="/tableau" />
}
```

---

## Patterns d'affichage conditionnels

### Pattern 1 : Masquage bouton création (CardsEdition)

**Ligne 316-320** :

```typescript
{!isFree && (
  <Button
    label={`➕ ${t('cards.addCard') || 'Créer carte'}`}
    onClick={() => setModalCardOpen(true)}
  />
)}
```

**Logique** :
- Si `isFree = true` → bouton masqué
- Visitor : n'est pas connecté donc pas `isFree` (pas de statut)
- Free : `isFree = true` → bouton masqué

### Pattern 2 : Affichage conditionnel Navbar

**Ligne 101-112** (Visitor mode) :

```typescript
{isVisitorMode ? (
  <>
    <button onClick={() => setShowPersonalizationModal(true)}>
      Personnaliser
    </button>
    <Link href="/signup">Créer un compte</Link>
    <Link href="/login">Se connecter</Link>
  </>
) : (
  <>
    {/* Connecté : UserMenu, SettingsMenu */}
  </>
)}
```

### Pattern 3 : Mode lecture seule (CardsEdition Free)

**Ligne 243-293** :

```typescript
if (isFree) {
  return (
    <div className="checklist-edition">
      <DndGrid
        items={bankCards}
        onReorder={() => {}}  // No-op
        renderItem={(bankCard) => (
          <EditionCard
            editable={false}  // Pas d'édition
            checked={isCardInTimeline(bankCard.id)}
            onToggleCheck={() => handleToggleCheckbox(bankCard.id)}
          />
        )}
      />
    </div>
  )
}
```

---

## Synthèse des guardrails

### Tableau synthétique

| Guardrail | Visitor | Free | Subscriber/Admin |
|-----------|---------|------|-----------------|
| **UI Navbar** | | | |
| Lien Édition | ❌ Caché | ✅ Visible | ✅ Visible |
| UserMenu | ❌ Absent | ✅ Visible | ✅ Visible |
| Bouton Personnaliser | ✅ Visible | ❌ Absent | ❌ Absent |
| **CardsEdition** | | | |
| Créer carte | ❌ Masqué | ❌ Masqué | ✅ Visible |
| Éditer carte perso | ❌ Impossible | ❌ Impossible | ✅ Possible |
| Voir cartes banque | ✅ Lecture | ✅ Lecture | ✅ Lecture |
| Éditer cartes banque | ❌ Non | ❌ Non | ✅ Admin |
| **Storage** | | | |
| Lire bank-images | ✅ PUBLIC | ✅ PUBLIC | ✅ PUBLIC |
| Uploader personal-images | ❌ RLS bloque | ❌ RLS bloque | ✅ Possible |
| Lire personal-images | ❌ RLS bloque | ✅ Own only | ✅ Own only |
| **Navigation** | | | |
| Accès /edition | ❌ ProtectedRoute | ✅ Oui | ✅ Oui |
| Accès /profil | ❌ ProtectedRoute | ✅ Oui | ✅ Oui |
| Accès /abonnement | ❌ ProtectedRoute | ✅ Oui | ✅ Oui |
| Accès /admin/* | ❌ AdminRoute | ❌ AdminRoute | ✅ Oui |

### Hiérarchie des restrictions

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NAVIGATION (ProtectedRoute, AdminRoute)                  │
│    Visitor → redirect /login si accès /edition              │
├─────────────────────────────────────────────────────────────┤
│ 2. AFFICHAGE CONDITIONNEL (Navbar, CardsEdition)            │
│    Visitor → boutons/menus masqués selon détection UI       │
├─────────────────────────────────────────────────────────────┤
│ 3. MODALES DE CONVERSION (PersonalizationModal)             │
│    Visitor clique "Personnaliser" → modal invite à sign up  │
├─────────────────────────────────────────────────────────────┤
│ 4. REFUS DB (RLS + Triggers)                                │
│    Visitor tente create card → DB refuse (feature_unavail.) │
├─────────────────────────────────────────────────────────────┤
│ 5. ACCÈS STORAGE (RLS policies)                             │
│    Visitor ne peut accéder personal-images (RLS owner-only) │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers clés

### Modales

| Fichier | Rôle |
|---------|------|
| `src/components/shared/modal/modal-personalization/PersonalizationModal.tsx` | Invite création compte/connexion |
| `src/components/shared/modal/modal-quota/ModalQuota.tsx` | Affiche limites quotas |
| `src/components/shared/modal/modal-ajout/ModalAjout.tsx` | Form création cartes (intègre upload) |

### Composants UI avec restrictions

| Fichier | Restrictions |
|---------|-------------|
| `src/components/layout/navbar/Navbar.tsx` | Lien édition caché, UserMenu absent |
| `src/components/features/cards/cards-edition/CardsEdition.tsx` | Mode Free lecture seule, boutons masqués |
| `src/components/shared/protected-route/ProtectedRoute.tsx` | Redirect vers login si non connecté |

### Hooks de détection

| Fichier | Détecte |
|---------|---------|
| `src/hooks/useIsVisitor.ts` | Mode Visitor (!user) |
| `src/hooks/useAccountStatus.ts` | Statut account (free/subscriber/admin) |
| `src/hooks/useAuth.ts` | Authentification (user, authReady) |

### Gestion Storage

| Fichier | Rôle |
|---------|------|
| `src/utils/storage/uploadCardImage.ts` | Upload cartes perso (personal-images) |
| `src/utils/storage/uploadBankCardImage.ts` | Upload cartes banque (bank-images) |
| `src/utils/storage/deleteImageIfAny.ts` | Suppression images orphelines |

### Hooks de données

| Fichier | Restrictions |
|---------|-------------|
| `src/hooks/useBankCards.ts` | SELECT-only (PUBLIC) |
| `src/hooks/usePersonalCards.ts` | Owner-only, RLS bloque Visitor |
| `src/hooks/useCategories.ts` | Owner-only, RLS bloque Visitor |

---

## Notes importantes

### 1. DB-First Architecture

**Critique** : Les restrictions **vraies** viennent de la DB, pas du frontend

```
Frontend : Affichage cosmétique uniquement
Frontend : Boutons masqués/désactivés
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend : RLS policies bloquent l'accès
Backend : Triggers rejectent les créations
Backend : Storage policies empêchent uploads
```

### 2. Hydration Next.js

**Attention** : Toujours vérifier `authReady` avant `isVisitor`

```typescript
// ❌ INCORRECT
const { isVisitor } = useIsVisitor()
if (isVisitor) return <DemoUI />

// ✅ CORRECT
const { isVisitor, authReady } = useIsVisitor()
if (!authReady) return <Loader />
if (isVisitor) return <DemoUI />
```

### 3. PersonalizationModal dans Navbar uniquement

**Documentation ligne 3-4** : "Contexte Édition UNIQUEMENT (adulte)"

```
JAMAIS afficher PersonalizationModal dans :
- Contexte Tableau (enfant)
- Page Édition (parent)
- Autres pages

SEULEMENT afficher dans :
- Navbar (pour tous les contextes qui la contiennent)
```

### 4. Quotas : RLS + Triggers

**Refus création** :
- RLS policy : `accounts.status = 'free'` → refus insert personal cards
- Trigger `check_can_create_personal_card` : vérif quota stock (50 max)
- Trigger `check_monthly_creation_limit` : vérif quota mensuel (100 max)

### 5. Storage : Deux buckets distincts

```
bank-images/
├─ PUBLIC read (anon + auth)
├─ INSERT/UPDATE/DELETE : admin-only (RLS policy is_admin())
└─ Format : {cardId}.jpg (UUID.jpg)

personal-images/
├─ Private (owner-only read)
├─ INSERT/UPDATE : subscriber+ only (RLS policy accounts.status)
├─ UPDATE : IMPOSSIBLE (trigger prevent_update_image_url)
└─ Format : {accountId}/cards/{cardId}.jpg
```

---

## Conclusion

**Les guardrails Visitor sont implémentés en 5 couches** :

1. **Navigation** : ProtectedRoute bloque `/edition`, `/profil`, etc.
2. **UI** : Navbar et CardsEdition masquent boutons/menus
3. **Modales** : PersonalizationModal invite création compte au clic
4. **DB** : RLS bloque vraies modifications (feature_unavailable)
5. **Storage** : Policies bloquent accès personal-images

**Résultat final** : Visitor peut consulter Tableau (cartes banque en lecture), mais toute tentative de modification est prise en charge soit par le frontend (masquage), soit par le backend (refus DB).
