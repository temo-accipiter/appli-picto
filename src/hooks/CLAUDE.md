# CLAUDE.md - Hooks Custom Supabase

Guide patterns hooks custom pour **Appli-Picto** - Application Next.js 16 pour enfants autistes et professionnels TSA.

## 🎯 Vue d'Ensemble

Ce dossier contient **49 hooks custom** qui encapsulent toute la logique d'accès aux données Supabase.

**Principe fondamental** : JAMAIS de query Supabase directe dans composants, TOUJOURS via hooks custom.

---

## 🚨 RÈGLE ABSOLUE

**CRITIQUE** : ❌ **JAMAIS** de query Supabase directe dans composants

```typescript
// ❌ INTERDIT - Query directe dans composant
function TachesListe() {
  const [taches, setTaches] = useState([])

  useEffect(() => {
    supabase.from('taches').select().then(({ data }) => setTaches(data))
  }, [])

  return <div>{taches.map(t => <TacheCard key={t.id} tache={t} />)}</div>
}
```

```typescript
// ✅ CORRECT - Hook custom
import { useTaches } from '@/hooks'

function TachesListe() {
  const { taches, loading, error } = useTaches()

  if (loading) return <Loader />
  if (error) return <ErrorMessage error={error} />

  return <div>{taches.map(t => <TacheCard key={t.id} tache={t} />)}</div>
}
```

**Pourquoi CRITIQUE** :

- ✅ **Réutilisabilité** : Un hook = une source de vérité pour données
- ✅ **Testabilité** : Mock hooks facilement, pas besoin mock Supabase partout
- ✅ **Cleanup automatique** : withAbortSafe gère annulation requêtes
- ✅ **Types sûrs** : Types Supabase centralisés dans hook
- ✅ **Maintenance** : Modifier query = 1 seul fichier (hook)

---

## 📋 Pattern Standard Hook Supabase

**Tous les hooks custom DOIVENT suivre ce pattern** :

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { withAbortSafe } from '@/hooks'
import type { Database } from '@/types/supabase'

type Tache = Database['public']['Tables']['taches']['Row']

export default function useTaches() {
  const [taches, setTaches] = useState<Tache[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Pattern withAbortSafe pour cleanup automatique
    return withAbortSafe(async signal => {
      try {
        const { data, error } = await supabase
          .from('taches')
          .select('*')
          .abortSignal(signal)

        if (error) throw error

        setTaches(data || [])
      } catch (err) {
        console.error('Erreur fetch tâches:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  return { taches, loading, error }
}
```

### Éléments Obligatoires

**1. États (useState)**

- ✅ `data` : Données fetchées (type Supabase)
- ✅ `loading: boolean` : État chargement
- ✅ `error: Error | null` : Erreur éventuelle

**2. Types Supabase**

```typescript
import type { Database } from '@/types/supabase'

type Tache = Database['public']['Tables']['taches']['Row']
type TacheInsert = Database['public']['Tables']['taches']['Insert']
type TacheUpdate = Database['public']['Tables']['taches']['Update']
```

**3. Cleanup (withAbortSafe)**

```typescript
return withAbortSafe(async signal => {
  const { data } = await supabase.from('taches').select().abortSignal(signal) // Annule si composant démonté

  setTaches(data)
})
```

**4. Gestion Erreurs**

```typescript
try {
  const { data, error } = await supabase.from('taches').select()

  if (error) throw error // Vérifier error d'abord

  setTaches(data)
} catch (err) {
  console.error('Erreur:', err) // Log pour debug
  setError(err as Error)
} finally {
  setLoading(false) // TOUJOURS reset loading
}
```

---

## 🎯 Hooks Disponibles par Catégorie

### 📊 Données (CRUD)

#### **useTaches()** - Lecture Tâches

**Localisation** : `src/hooks/useTaches.ts`

**Usage** :

```typescript
import { useTaches } from '@/hooks'

function TableauTaches() {
  const { taches, loading, error } = useTaches()

  return <div>{taches.map(t => <TacheCard tache={t} />)}</div>
}
```

**API** :

- `taches: Tache[]` - Liste tâches utilisateur
- `loading: boolean` - État chargement
- `error: Error | null` - Erreur éventuelle

---

#### **useTachesEdition()** - Création/Modification Tâches

**Localisation** : `src/hooks/useTachesEdition.ts`

**Usage** :

```typescript
import { useTachesEdition } from '@/hooks'

function TachesEditor() {
  const { createTache, updateTache, deleteTache } = useTachesEdition()

  const handleCreate = async () => {
    await createTache({ titre: 'Nouvelle tâche', completed: false })
  }

  return <button onClick={handleCreate}>Créer tâche</button>
}
```

**API** :

- `createTache(data: TacheInsert): Promise<void>` - Créer tâche
- `updateTache(id: string, updates: TacheUpdate): Promise<void>` - Modifier tâche
- `deleteTache(id: string): Promise<void>` - Supprimer tâche

---

#### **useTachesDnd()** - Drag & Drop Tâches

**Localisation** : `src/hooks/useTachesDnd.ts`

**Usage** :

```typescript
import { useTachesDnd } from '@/hooks'

function TableauDnd() {
  const { taches, stations, handleDragEnd } = useTachesDnd()

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Tâches draggables + stations droppables */}
    </DndContext>
  )
}
```

**API** :

- `taches: Tache[]` - Tâches avec positions
- `stations: Station[]` - Stations (lieux)
- `handleDragEnd: (event: DragEndEvent) => void` - Handler drag & drop
- `loading: boolean`

---

#### **useRecompenses()** - CRUD Récompenses

**Localisation** : `src/hooks/useRecompenses.ts`

**API** :

- `recompenses: Recompense[]`
- `createRecompense(data): Promise<void>`
- `updateRecompense(id, updates): Promise<void>`
- `deleteRecompense(id): Promise<void>`
- `loading: boolean`

---

#### **useCategories()** - CRUD Catégories

**Localisation** : `src/hooks/useCategories.ts`

**API** :

- `categories: Categorie[]`
- `createCategorie(data): Promise<void>`
- `updateCategorie(id, updates): Promise<void>`
- `deleteCategorie(id): Promise<void>`
- `loading: boolean`

---

#### **useStations()** - Gestion Stations (Lieux)

**Localisation** : `src/hooks/useStations.ts`

**API** :

- `stations: Station[]`
- `createStation(data): Promise<void>`
- `updateStation(id, updates): Promise<void>`
- `deleteStation(id): Promise<void>`

---

#### **useParametres()** - Paramètres Utilisateur

**Localisation** : `src/hooks/useParametres.ts`

**API** :

- `parametres: Parametres | null`
- `updateParametres(updates): Promise<void>`
- `loading: boolean`

---

### 🔐 Auth & Permissions

#### **useAuth()** - Authentification

**Localisation** : `src/hooks/useAuth.ts`

**Usage** :

```typescript
import { useAuth } from '@/hooks'

function ProfilePage() {
  const { user, authReady, signOut } = useAuth()

  if (!authReady) return <Loader />
  if (!user) return <Navigate to="/login" />

  return (
    <div>
      <p>Email : {user.email}</p>
      <button onClick={signOut}>Déconnexion</button>
    </div>
  )
}
```

**API** :

- `user: User | null` - Utilisateur connecté
- `authReady: boolean` - Flag auth initialisé (TOUJOURS vérifier avant user)
- `signOut: () => Promise<void>` - Déconnexion

**Règles** :

- ✅ **TOUJOURS** vérifier `authReady` avant `user` (évite flash non-auth)
- ✅ Utiliser `useAuth()` hook (pas `AuthContext` direct)

---

#### **useRBAC()** - Legacy documenté

**Localisation** : `src/hooks/useRBAC.ts`
**Statut** : guide RBAC legacy retiré du repo

**Usage** :

```typescript
import { useRBAC } from '@/hooks'

function EditionPage() {
  const { isAdmin, isFree, isSubscriber, canEdit } = useRBAC()

  if (!canEdit) {
    return <FeatureGate role="abonne" />
  }

  return <TachesEdition />
}
```

**API** :

- `isAdmin: boolean` - Utilisateur admin
- `isFree: boolean` - Utilisateur Free (gratuit)
- `isSubscriber: boolean` - Utilisateur abonné (payant)
- `isVisitor: boolean` - Visiteur (non connecté)
- `canEdit: boolean` - Peut éditer tâches/récompenses
- `canView: boolean` - Peut voir tableau

**Référence** : aucune documentation dédiée conservée, section laissée à titre d'archive

---

#### **useSimpleRole()** - Rôle Utilisateur Simplifié

**Localisation** : `src/hooks/useSimpleRole.ts`

**API** :

- `role: 'visiteur' | 'free' | 'abonne' | 'admin'` - Rôle utilisateur
- `loading: boolean`

---

#### **usePermissionsAPI()** - API Permissions Supabase

**Localisation** : `src/hooks/usePermissionsAPI.ts`

**Usage interne** : Utilisé par `useRBAC` pour fetch permissions depuis DB

---

#### **useAdminPermissions()** - Permissions Admin Avancées

**Localisation** : `src/hooks/useAdminPermissions.ts`

**API** :

- `canManageUsers: boolean` - Gérer utilisateurs
- `canViewMetrics: boolean` - Voir métriques
- `canManageQuotas: boolean` - Gérer quotas

---

### 📈 Quotas & Abonnements

#### **useAccountStatus()** - Quotas Utilisateur

**Localisation** : `src/hooks/useAccountStatus.ts`

**Usage** :

```typescript
import { useAccountStatus } from '@/hooks'

function CreateTaskButton() {
  const { canCreateTask, quotas } = useAccountStatus()

  if (!canCreateTask) {
    return <QuotaExceeded message="Limite Free : 5 tâches atteinte" />
  }

  return <button onClick={handleCreate}>Créer tâche</button>
}
```

**API** :

- `canCreateTask: boolean` - Peut créer tâche (quota respecté)
- `canCreateReward: boolean` - Peut créer récompense
- `canCreateCategory: boolean` - Peut créer catégorie
- `quotas: { tasks: number, rewards: number, categories: number }` - Quotas actuels
- `limits: { tasks: number, rewards: number, categories: number }` - Limites rôle

**Règles** :

- ✅ **TOUJOURS** vérifier `canCreateTask` avant création tâche
- ✅ Combiner avec `<FeatureGate>` pour UI conditionnelle

---

#### **useSubscriptionStatus()** - Statut Abonnement Stripe

**Localisation** : `src/hooks/useSubscriptionStatus.ts`

**API** :

- `isSubscribed: boolean` - Utilisateur abonné actif
- `subscriptionStatus: 'active' | 'canceled' | 'past_due' | null`
- `subscriptionEndDate: Date | null` - Date fin abonnement
- `loading: boolean`

---

### 🎨 UX & Accessibilité

#### **useToast()** - Notifications Utilisateur

**Localisation** : Via `@/contexts/ToastContext`

**Usage** :

```typescript
import { useToast } from '@/hooks'

function CreateButton() {
  const { showToast } = useToast()

  const handleCreate = async () => {
    try {
      await createTache(data)
      showToast('Tâche créée avec succès !', 'success')
    } catch (error) {
      showToast('Erreur lors de la création', 'error')
    }
  }

  return <button onClick={handleCreate}>Créer</button>
}
```

**API** :

- `showToast(message: string, type: 'success' | 'error' | 'info'): void`

**Règles TSA-friendly** :

- ✅ Messages courts et clairs (enfants autistes)
- ✅ Pas de toasts multiples simultanés (surcharge visuelle)
- ❌ Éviter toasts trop longs (>3s)

---

#### **useLoading()** - État Chargement Global

**Localisation** : Via `@/contexts/LoadingContext`

**Usage** :

```typescript
import { useLoading } from '@/hooks'

function ImportButton() {
  const { setLoading } = useLoading()

  const handleImport = async () => {
    setLoading(true)
    try {
      await importData()
    } finally {
      setLoading(false) // TOUJOURS dans finally
    }
  }

  return <button onClick={handleImport}>Importer</button>
}
```

**API** :

- `loading: boolean` - État global
- `setLoading(state: boolean): void`

**Règles** :

- ✅ **TOUJOURS** reset dans `finally` (évite loading bloqué)
- ✅ Utiliser pour opérations longues (>1s)
- ❌ Ne PAS utiliser pour chargements courts (<500ms)

---

#### **useAudioContext()** - Sons et Beeps

**Localisation** : `src/hooks/useAudioContext.ts`

**Usage** :

```typescript
import { useAudioContext } from '@/hooks'

function TimeTimerAlert() {
  const { playSound, playBeep } = useAudioContext()

  const handleTimerEnd = async () => {
    await playSound('/sounds/alarm.mp3', 0.7) // Volume 70%
    // ou
    playBeep(440) // La 440Hz
  }

  return <button onClick={handleTimerEnd}>Tester alarme</button>
}
```

**API** :

- `playSound(url: string, volume?: number): Promise<void>` - Lecture fichier audio
- `playBeep(frequency: number): void` - Son bip (fréquence Hz)

**Règles** :

- ✅ Volume par défaut 0.5 (50%)
- ✅ Respecter préférences utilisateur (mode silencieux)
- ❌ Éviter sons trop forts ou brusques (TSA-friendly)

---

#### **useReducedMotion()** - Détection Mouvement Réduit

**Localisation** : `src/hooks/useReducedMotion.ts`

**Usage** :

```typescript
import { useReducedMotion } from '@/hooks'

function AnimatedCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      Contenu
    </motion.div>
  )
}
```

**API** :

- `prefersReducedMotion: boolean` - `true` si utilisateur préfère mouvement réduit

**Règles Accessibilité TSA** :

- ✅ **TOUJOURS** respecter `prefers-reduced-motion`
- ✅ Si `true` : Désactiver animations ou duration: 0
- ✅ Animations max 0.3s si activées

---

#### **useDragAnimation()** - Animations Drag & Drop

**Localisation** : `src/hooks/useDragAnimation.ts`

**Usage** : Animations douces drag & drop compatibles TSA

---

#### **useDebounce()** - Debounce Inputs

**Localisation** : `src/hooks/useDebounce.ts`

**Usage** :

```typescript
import { useDebounce } from '@/hooks'

function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300) // 300ms delay

  useEffect(() => {
    // Fetch avec debouncedSearch
    fetchResults(debouncedSearch)
  }, [debouncedSearch])

  return <input value={search} onChange={e => setSearch(e.target.value)} />
}
```

**API** :

- `useDebounce<T>(value: T, delay: number): T` - Valeur debouncée

---

#### **useI18n()** - Internationalisation

**Localisation** : `src/hooks/useI18n.ts`

**Usage** :

```typescript
import { useI18n } from '@/hooks'

function Greeting() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div>
      <p>{t('welcome')}</p>
      <button onClick={() => setLocale('en')}>English</button>
    </div>
  )
}
```

**API** :

- `t(key: string): string` - Traduire clé
- `locale: 'fr' | 'en'` - Langue actuelle
- `setLocale(locale): void` - Changer langue

---

### 💼 Business Logic Extraits (Déc 2024)

#### **useCheckout()** - Stripe Checkout Session

**Localisation** : `src/hooks/useCheckout.ts`

**Usage** :

```typescript
import { useCheckout } from '@/hooks'

function SubscribeButton() {
  const { handleCheckout } = useCheckout()

  return (
    <button onClick={() => handleCheckout()}>
      S'abonner Premium
    </button>
  )
}
```

**API** :

- `handleCheckout(): Promise<void>` - Redirection Stripe Checkout

**Fonctionnalités** :

- Invoke Supabase Functions (primaire) + fallback fetch (secours)
- Validation automatique priceId depuis env
- Protection double-clic avec useRef
- Gestion erreurs avec alerts UX

---

#### **useMetrics()** - Métriques Dashboard Admin

**Localisation** : `src/hooks/useMetrics.ts`

**Usage** :

```typescript
import { useMetrics } from '@/hooks'

function AdminDashboard() {
  const { metrics, loading, error } = useMetrics()

  if (loading) return <Spinner />

  return (
    <div>
      <StatsCard title="Utilisateurs" value={metrics.users.total} />
      <StatsCard title="Santé système" value={`${metrics.health.score}%`} />
    </div>
  )
}
```

**API** :

- `metrics: AdminMetrics` - Métriques complètes
  - `users: { total, new_7d, active_7d }`
  - `subscriptions: { active, new_7d, cancelled_7d }`
  - `images: { uploads_7d, success_rate, storage_saved_mb }`
  - `errors: { webhooks_7d, images_7d }`
  - `health: { score }` (0-100, basé sur taux erreurs)

**Optimisation** : 9 queries Supabase en parallèle (`Promise.all`)

---

#### **useTimerPreferences()** - localStorage TimeTimer

**Localisation** : `src/hooks/useTimerPreferences.ts`

**Usage** :

```typescript
import { useTimerPreferences } from '@/hooks'

function TimeTimerSettings() {
  const {
    preferences,
    updateSilentMode,
    updateDiskColor,
  } = useTimerPreferences(10) // 10 min par défaut

  return (
    <div>
      <Toggle
        checked={preferences.isSilentMode}
        onChange={updateSilentMode}
      />
    </div>
  )
}
```

**API** :

- `preferences: TimerPreferences` - 5 préférences centralisées
  - `isSilentMode: boolean`
  - `lastDuration: number`
  - `diskColor: string`
  - `showNumbers: boolean`
  - `enableVibration: boolean`
- `updateSilentMode(enabled: boolean): void`
- `updateDiskColor(color: string): void`
- `updateShowNumbers(show: boolean): void`

**Persistence** : Automatique dans localStorage (5 clés STORAGE_KEYS)

---

#### **useTimerSvgPath()** - Géométrie SVG TimeTimer

**Localisation** : `src/hooks/useTimerSvgPath.ts`

**Usage** :

```typescript
import { useTimerSvgPath } from '@/hooks'

function TimeTimerDisk({ percentage }: { percentage: number }) {
  const { redDiskPath, dimensions } = useTimerSvgPath(percentage, false)

  return (
    <svg width={dimensions.svgSize} height={dimensions.svgSize}>
      <path d={redDiskPath} fill="red" />
    </svg>
  )
}
```

**API** :

- `redDiskPath: string` - Path SVG disque rouge (memoïzé)
- `dimensions: { radius, svgSize, centerX, centerY }`

**Optimisation** : Calculs géométriques memoïzés (useMemo)

---

#### **useDbPseudo()** - Fetch Pseudo Utilisateur

**Localisation** : `src/hooks/useDbPseudo.ts`

**Usage** :

```typescript
import { useDbPseudo } from '@/hooks'

function UserGreeting({ userId }: { userId: string }) {
  const pseudo = useDbPseudo(userId)

  return <span>Bonjour {pseudo || 'utilisateur'} !</span>
}
```

**API** :

- `pseudo: string | null` - Pseudo utilisateur depuis `profiles.pseudo`

**Pattern** : Fetch automatique avec `withAbortSafe` + cleanup

---

### 📦 Data Utilities

#### **useDemoCards()** - Cartes Démo Visiteurs

**Localisation** : `src/hooks/useDemoCards.ts`

**Usage** : Fournir cartes démo pour visiteurs non connectés

**API** :

- `demoTaches: Tache[]` - 3 tâches démo
- `demoRecompenses: Recompense[]` - 2 récompenses démo

---

#### **useFallbackData()** - Données Fallback si Erreur

**Localisation** : `src/hooks/useFallbackData.ts`

**Usage** : Données par défaut si fetch échoue

---

## 🧪 Testing Hooks

### Pattern Vitest Standard (Mocks)

**Fichier** : `src/hooks/useTaches.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTaches } from './useTaches'
import { supabase } from '@/utils/supabaseClient'

// Mock Supabase client
vi.mock('@/utils/supabaseClient')

describe('useTaches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('doit charger tâches au montage', async () => {
    // Arrange - Mock data
    const mockTaches = [{ id: '1', titre: 'Tâche 1', completed: false }]
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockTaches, error: null }),
    } as any)

    // Act - Render hook
    const { result } = renderHook(() => useTaches())

    // Assert - État initial
    expect(result.current.loading).toBe(true)

    // Wait - Attendre chargement
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Assert - Données chargées
    expect(result.current.taches).toEqual(mockTaches)
    expect(result.current.error).toBeNull()
  })

  it('doit gérer erreurs Supabase', async () => {
    // Arrange - Mock erreur
    const mockError = { message: 'Erreur réseau' }
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    } as any)

    // Act
    const { result } = renderHook(() => useTaches())

    // Wait
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Assert
    expect(result.current.error).toBeTruthy()
    expect(result.current.taches).toEqual([])
  })
})
```

**Structure test** :

1. **Mock Supabase** : `vi.mock('@/utils/supabaseClient')`
2. **Setup/Cleanup** : `beforeEach` / `afterEach`
3. **Arrange-Act-Assert** : Pattern standard
4. **waitFor** : Attendre état asynchrone

---

### Pattern MSW (Mock Service Worker)

**Fichier** : `src/hooks/useCategories.msw.test.ts`

**Utilisation** : Tests **réalistes** avec requêtes HTTP réelles interceptées

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { useCategories } from './useCategories'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// Setup MSW server
const server = setupServer(
  http.get(`${SUPABASE_URL}/rest/v1/categories`, () => {
    return HttpResponse.json([
      { id: '1', nom: 'Maison', couleur: '#FFE5E5' },
      { id: '2', nom: 'École', couleur: '#E5F3FF' },
    ])
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('useCategories avec MSW', () => {
  it('doit charger catégories via requête Supabase réelle', async () => {
    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toHaveLength(2)
    expect(result.current.categories[0].nom).toBe('Maison')
  })

  it('doit gérer erreurs HTTP 500', async () => {
    // Override handler pour simuler erreur
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/categories`, () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })
})
```

**Avantages MSW** :

- ✅ Tests intégration **réalistes** (requêtes HTTP vraies)
- ✅ Simuler erreurs HTTP spécifiques (500, 403, 429, etc.)
- ✅ Valider format requêtes Supabase (headers, query params)

**Quand utiliser** :

- ✅ **MSW** : Tests intégration, simulation erreurs réseau, validation format API
- ✅ **Vitest mocks** : Tests unitaires isolés, rapidité, contrôle précis

---

## 🚀 Patterns Avancés

### Queries Parallèles (Promise.all)

**Optimisation** : Fetch multiple queries simultanément

**Exemple** : `useMetrics` (9 queries en parallèle)

```typescript
useEffect(() => {
  async function fetchMetrics() {
    const [usersResult, subscriptionsResult, imagesResult] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('subscriptions').select('*'),
      supabase.from('images').select('*'),
    ])

    // Traiter résultats individuellement
    if (usersResult.error) console.error('Erreur users:', usersResult.error)
    if (subscriptionsResult.error)
      console.error('Erreur subs:', subscriptionsResult.error)

    setMetrics({
      users: usersResult.data || [],
      subscriptions: subscriptionsResult.data || [],
      images: imagesResult.data || [],
    })
  }

  fetchMetrics()
}, [])
```

**Règles** :

- ✅ Utiliser pour requêtes **indépendantes** (pas de dépendances entre elles)
- ✅ Gestion erreurs **individuelles** (une erreur n'annule pas les autres)
- ❌ Éviter si requêtes **dépendantes** (préférer chaînage avec `await`)

---

### Cleanup avec withAbortSafe

**Helper disponible** : `@/hooks/_net.ts`

**Implémentation** :

```typescript
export function withAbortSafe(
  fn: (signal: AbortSignal) => Promise<void>
): () => void {
  const controller = new AbortController()
  let cancelled = false

  fn(controller.signal).catch(err => {
    if (!cancelled) {
      console.error('Erreur requête:', err)
    }
  })

  return () => {
    cancelled = true
    controller.abort()
  }
}
```

**Usage dans hook** :

```typescript
useEffect(() => {
  return withAbortSafe(async signal => {
    const { data, error } = await supabase
      .from('taches')
      .select()
      .abortSignal(signal) // Annulation si composant démonté

    if (error) throw error
    setTaches(data)
  })
}, [])
```

**Pourquoi CRITIQUE** :

- ✅ **Annulation automatique** : Requêtes annulées si composant démonté
- ✅ **Pas de setState après unmount** : Évite warnings React
- ✅ **Gestion erreurs propre** : Flag `cancelled` pour ignorer erreurs après unmount

---

### Pattern Optimistic Update

**Exemple** : `useTachesEdition` (mise à jour optimiste)

```typescript
async function updateTache(id: string, updates: TacheUpdate) {
  // 1. Update UI immédiatement (optimiste)
  setTaches(prevTaches =>
    prevTaches.map(t => (t.id === id ? { ...t, ...updates } : t))
  )

  try {
    // 2. Persist en DB
    const { error } = await supabase
      .from('taches')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    // 3. Revert si erreur
    console.error('Erreur update:', error)
    setTaches(prevTaches => /* restore previous state */)
    showToast('Erreur lors de la mise à jour', 'error')
  }
}
```

**Règles** :

- ✅ Update UI **immédiatement** (UX instantané)
- ✅ Persist en DB **après**
- ✅ **Revert si erreur** (rollback état précédent)
- ✅ Toujours afficher toast si erreur

---

## ⚠️ Antipatterns à Éviter

### ❌ Query Directe dans Composant

```typescript
// ❌ INTERDIT
function TachesListe() {
  const [taches, setTaches] = useState([])

  useEffect(() => {
    supabase.from('taches').select().then(({ data }) => setTaches(data))
  }, [])

  return <div>{taches.map(...)}</div>
}
```

**Pourquoi interdit** :

- Code dupliqué (chaque composant refait même logic)
- Pas de cleanup (requêtes non annulées)
- Pas de réutilisation
- Tests difficiles

**Solution** : Créer hook custom `useTaches()`

---

### ❌ Pas de Cleanup (Memory Leak)

```typescript
// ❌ INTERDIT - Fuite mémoire
useEffect(() => {
  supabase
    .from('taches')
    .select()
    .then(({ data }) => setTaches(data))
}, []) // Pas de cleanup si composant démonté
```

**Problème** : Si composant démonté avant fin requête, `setTaches` appelé sur composant démonté → Warning React

**Solution** : Utiliser `withAbortSafe` ou `AbortController`

---

### ❌ Pas de Types Supabase

```typescript
// ❌ INTERDIT - Pas de types
const [taches, setTaches] = useState([])

// ✅ CORRECT - Types Supabase
import type { Database } from '@/types/supabase'
type Tache = Database['public']['Tables']['taches']['Row']
const [taches, setTaches] = useState<Tache[]>([])
```

**Pourquoi CRITIQUE** : Types Supabase auto-générés = source de vérité DB

---

### ❌ Pas de finally pour reset loading

```typescript
// ❌ INTERDIT
try {
  const { data } = await supabase.from('taches').select()
  setTaches(data)
  setLoading(false) // Oublié si erreur
} catch (error) {
  setError(error)
}

// ✅ CORRECT - finally TOUJOURS
try {
  const { data } = await supabase.from('taches').select()
  setTaches(data)
} catch (error) {
  setError(error)
} finally {
  setLoading(false) // TOUJOURS exécuté
}
```

---

### ❌ Ignorer error Supabase

```typescript
// ❌ INTERDIT - Pas de vérification error
const { data, error } = await supabase.from('taches').select()
setTaches(data) // Peut crasher si error

// ✅ CORRECT - Vérifier error d'abord
const { data, error } = await supabase.from('taches').select()
if (error) throw error
setTaches(data) // Safe - data garanti non-null
```

---

## 🔧 Utilitaires Disponibles

### withAbortSafe

**Localisation** : `@/hooks/_net.ts`

**Signature** :

```typescript
function withAbortSafe(fn: (signal: AbortSignal) => Promise<void>): () => void
```

**Usage** : Voir section "Cleanup avec withAbortSafe"

---

### isAbortLike

**Localisation** : `@/hooks/_net.ts`

**Signature** :

```typescript
function isAbortLike(error: unknown): boolean
```

**Usage** : Détecter si erreur est liée à AbortController

```typescript
catch (error) {
  if (isAbortLike(error)) {
    // Ignore erreur annulation (normal)
    return
  }

  // Vraie erreur
  console.error('Erreur:', error)
}
```

---

## 📚 Références

### Documentation Interne

- **CLAUDE.md global** : Section "Patterns CRITIQUES" (règles hooks custom)
- **Tests** : Tous hooks ont fichiers `.test.ts` (exemples référence)

### Fichiers Clés

- **`src/hooks/index.ts`** : Barrel exports (tous hooks + contextes)
- **`src/hooks/_net.ts`** : Utilitaires réseau (`withAbortSafe`, `isAbortLike`)
- **`src/utils/supabaseClient.ts`** : Instance Supabase unique (TOUJOURS importer depuis)

### Exemples Référence

**Hook lecture simple** : `src/hooks/useTaches.ts`
**Hook CRUD complet** : `src/hooks/useTachesEdition.ts`
**Hook avec cleanup** : `src/hooks/useDbPseudo.ts`
**Hook queries parallèles** : `src/hooks/useMetrics.ts`
**Tests Vitest** : `src/hooks/useTaches.test.ts`
**Tests MSW** : `src/hooks/useCategories.msw.test.ts`

---

## ✅ Checklist Création Hook Custom

Avant de créer un nouveau hook :

- [ ] **Pas de query directe** : Encapsuler dans hook custom
- [ ] **Types Supabase** : Importer depuis `@/types/supabase`
- [ ] **Pattern standard** : useState (data + loading + error)
- [ ] **Cleanup** : Utiliser `withAbortSafe` ou `AbortController`
- [ ] **Gestion erreurs** : try/catch + finally pour reset loading
- [ ] **Tests** : Ajouter fichier `.test.ts` (Vitest ou MSW)
- [ ] **Barrel export** : Ajouter à `src/hooks/index.ts`
- [ ] **Documentation** : Mettre à jour ce CLAUDE.md si pattern nouveau

---

## 🎯 Commandes Utiles

```bash
# Tests hooks
pnpm test                      # Mode watch
pnpm test:coverage             # Avec couverture
pnpm test src/hooks/useTaches  # Test hook spécifique

# Type-check
pnpm type-check                # Vérifier erreurs TypeScript

# Régénérer types Supabase (après modif DB)
pnpm context:update            # OBLIGATOIRE après modif DB
```

---

**Dernière mise à jour** : Janvier 2026
**Version Appli-Picto** : Next.js 16, React 19, Supabase v2
