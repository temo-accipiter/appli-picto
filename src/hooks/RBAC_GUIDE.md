# Guide RBAC - useRBAC()

## 📚 Vue d'ensemble

`useRBAC()` est le **hook unifié** pour toutes les vérifications d'accès, quotas et rôles dans Appli-Picto.

**Remplace :** `useQuotas()` + `useEntitlements()` + appels directs à `usePermissions()`

---

## 🎯 Utilisation de base

### 1. Vérifier un rôle

```jsx
import { useRBAC } from '@/hooks'

function MyComponent() {
  const { isAdmin, isFree, isSubscriber, isVisitor } = useRBAC()

  if (isAdmin) {
    return <AdminPanel />
  }

  if (isFree) {
    return <UpgradePrompt />
  }

  return <RegularContent />
}
```

### 2. Vérifier des permissions

```jsx
const { can, canAll, canAny } = useRBAC()

// Une seule permission
if (can('edit_tasks')) {
  // Afficher bouton édition
}

// TOUTES les permissions (AND)
if (canAll(['edit_tasks', 'delete_tasks'])) {
  // Afficher options avancées
}

// AU MOINS UNE permission (OR)
if (canAny(['view_analytics', 'view_stats'])) {
  // Afficher dashboard
}
```

### 3. Vérifier les quotas

```jsx
const { canCreateTask, getQuotaInfo } = useRBAC()

function handleAddTask() {
  if (!canCreateTask()) {
    const info = getQuotaInfo('task')
    alert(`Limite atteinte : ${info.current}/${info.limit} tâches`)
    return
  }

  // Créer la tâche
}
```

---

## 📖 API Complète

### Propriétés d'état

| Propriété | Type      | Description                                                       |
| --------- | --------- | ----------------------------------------------------------------- |
| `ready`   | `boolean` | `true` quand permissions ET quotas chargés                        |
| `loading` | `boolean` | `true` pendant le chargement                                      |
| `role`    | `string`  | `'visitor'` \| `'free'` \| `'abonne'` \| `'admin'` \| `'unknown'` |

### Flags de rôle

| Flag           | Type      | Description                |
| -------------- | --------- | -------------------------- |
| `isVisitor`    | `boolean` | Utilisateur non connecté   |
| `isFree`       | `boolean` | Compte gratuit             |
| `isSubscriber` | `boolean` | Abonné payant              |
| `isAdmin`      | `boolean` | Administrateur             |
| `isUnknown`    | `boolean` | Rôle inconnu (transitoire) |

### Fonctions de permissions

| Fonction        | Signature               | Description                          |
| --------------- | ----------------------- | ------------------------------------ |
| `can(name)`     | `(string) => boolean`   | Vérifie UNE permission               |
| `canAll(names)` | `(string[]) => boolean` | Vérifie TOUTES les permissions (AND) |
| `canAny(names)` | `(string[]) => boolean` | Vérifie AU MOINS UNE (OR)            |

### Fonctions de quotas

| Fonction                    | Signature                                   | Description              |
| --------------------------- | ------------------------------------------- | ------------------------ |
| `canCreate(type)`           | `('task'\|'reward'\|'category') => boolean` | Peut créer ce type ?     |
| `canCreateTask()`           | `() => boolean`                             | Shortcut pour tasks      |
| `canCreateReward()`         | `() => boolean`                             | Shortcut pour rewards    |
| `canCreateCategory()`       | `() => boolean`                             | Shortcut pour categories |
| `getQuotaInfo(type)`        | `(string) => QuotaInfo \| null`             | Détails du quota         |
| `getMonthlyQuotaInfo(type)` | `(string) => QuotaInfo \| null`             | Quota mensuel            |
| `refreshQuotas()`           | `() => void`                                | Recharger manuellement   |

### Type QuotaInfo

```typescript
{
  limit: number // Limite maximale
  current: number // Utilisation actuelle
  remaining: number // Restant (limit - current)
  percentage: number // Pourcentage (0-100)
  isAtLimit: boolean // Limite atteinte ?
  isNearLimit: boolean // Proche de la limite ? (>80%)
}
```

### Autres

| Fonction   | Description                     |
| ---------- | ------------------------------- |
| `reload()` | Recharger permissions ET quotas |
| `quotas`   | Objet brut des quotas           |
| `usage`    | Objet brut de l'utilisation     |

---

## 🔥 Exemples avancés

### Affichage conditionnel avec quotas

```jsx
function TaskList() {
  const { canCreateTask, getQuotaInfo, isFree } = useRBAC()

  const info = getQuotaInfo('task')

  return (
    <div>
      <h2>Mes tâches</h2>

      {isFree && info && (
        <div className="quota-bar">
          <progress value={info.current} max={info.limit} />
          <span>
            {info.current} / {info.limit} tâches
          </span>
          {info.isNearLimit && <span>⚠️ Bientôt à la limite</span>}
        </div>
      )}

      <button onClick={handleAddTask} disabled={!canCreateTask()}>
        Ajouter une tâche
      </button>
    </div>
  )
}
```

### Protection de route admin

```jsx
function AdminRoute({ children }) {
  const { isAdmin, ready, loading } = useRBAC()

  if (loading || !ready) {
    return <Loader />
  }

  if (!isAdmin) {
    return <Navigate to="/" />
  }

  return children
}
```

### Vérification multi-permissions

```jsx
function AdvancedEditor() {
  const { canAll } = useRBAC()

  const hasFullAccess = canAll([
    'edit_tasks',
    'delete_tasks',
    'manage_categories',
    'bulk_operations',
  ])

  return hasFullAccess ? <AdvancedUI /> : <BasicUI />
}
```

---

## ⚡ Performance

- **Single RPC call** : 1 seule requête `get_usage_fast` au lieu de 2-3
- **Realtime updates** : Écoute automatique des changements pour free accounts
- **Memoization** : Toutes les valeurs sont memoized via `useMemo`/`useCallback`
- **Cache interne** : Évite les re-fetches inutiles

---

## 🔄 Migration depuis anciens hooks

### Depuis `useQuotas()`

```jsx
// ❌ Avant
import { useQuotas } from '@/hooks'
const { canCreateTask, getQuotaInfo, isFreeAccount } = useQuotas()

// ✅ Après
import { useRBAC } from '@/hooks'
const { canCreateTask, getQuotaInfo, isFree } = useRBAC()
```

### Depuis `useEntitlements()`

```jsx
// ❌ Avant
import { useEntitlements } from '@/hooks'
const { canCreateMoreTaches, isSubscriber } = useEntitlements()

// ✅ Après
import { useRBAC } from '@/hooks'
const { canCreateTask, isSubscriber } = useRBAC()
```

### Depuis `usePermissions()`

```jsx
// ❌ Avant
import { usePermissions } from '@/contexts'
const { can, isAdmin } = usePermissions()

// ✅ Après (si tu as besoin de quotas aussi)
import { useRBAC } from '@/hooks'
const { can, isAdmin } = useRBAC()

// ⚠️ OK garder usePermissions() si tu n'as PAS besoin de quotas
```

---

## 🚨 Notes importantes

1. **Backward compatibility** : Les anciens hooks (`useQuotas`, `useEntitlements`) sont conservés mais **dépréciés**.

2. **Permissions vs Quotas** :
   - `can()` = vérifie une **permission** (feature activée ?)
   - `canCreateTask()` = vérifie un **quota** (limite atteinte ?)

3. **Ready state** :
   - Toujours vérifier `ready` ou `loading` avant d'utiliser les données
   - `ready = true` signifie permissions ET quotas sont chargés

4. **Free accounts only** :
   - Les quotas ne s'appliquent qu'aux comptes gratuits
   - Abonnés/Admins ont `canCreateTask() === true` toujours

---

## 📝 Tests

Le hook est couvert par 7 tests unitaires dans `useRBAC.test.jsx` :

- ✅ API complète exposée
- ✅ Quotas pour free accounts
- ✅ `canCreateTask()` avec/sans limite
- ✅ `getQuotaInfo()` calculs corrects
- ✅ Admin/Subscriber accès illimité

---

## 🎨 Pattern recommandé

```jsx
import { useRBAC } from '@/hooks'

export default function MyComponent() {
  const rbac = useRBAC()

  // Early return si pas prêt
  if (rbac.loading) return <Loader />

  // Destructure ce dont tu as besoin
  const { isAdmin, can, canCreateTask } = rbac

  // Utilise les flags
  return (
    <div>
      {isAdmin && <AdminControls />}
      {can('premium_features') && <PremiumSection />}
      {canCreateTask() && <AddTaskButton />}
    </div>
  )
}
```

---

**Créé par Phase 2-3 du refactoring RBAC** ✨
