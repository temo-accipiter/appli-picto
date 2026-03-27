# Persistance Visitor : Référence rapide

## 🎯 Clés de stockage : Localisation et usage

### IndexedDB

| BD                       | Store            | Clé        | Type                | Scope        | Lifecycle               |
| ------------------------ | ---------------- | ---------- | ------------------- | ------------ | ----------------------- |
| `appli-picto-visitor` v1 | `sequences`      | UUID local | VisitorSequence     | Visitor only | Jusqu'import (Ticket 4) |
| `appli-picto-visitor` v1 | `sequence_steps` | UUID local | VisitorSequenceStep | Visitor only | Jusqu'import (Ticket 4) |

**Accès** : `src/utils/visitor/sequencesDB.ts`

---

### localStorage : Scope Visitor

| Clé                                | Valeur             | Fichier                 | Ligne       | Lifecycle    |
| ---------------------------------- | ------------------ | ----------------------- | ----------- | ------------ |
| `applipicto:visitor:activeChildId` | `"visitor-local"`  | ChildProfileContext.tsx | 70, 155-162 | Jusqu'logout |
| `cookie_consent_v2`                | JSON ConsentRecord | consent.ts              | 9           | 180 jours    |

---

### localStorage : Scope Auth users

| Clé                                    | Valeur                | Fichier                 | Ligne       | Lifecycle    |
| -------------------------------------- | --------------------- | ----------------------- | ----------- | ------------ |
| `applipicto:activeChild:{userId}`      | UUID profil enfant    | ChildProfileContext.tsx | 76, 171-187 | Jusqu'logout |
| `appli-picto:offline-validation-queue` | JSON array            | OfflineContext.tsx      | 67, 75-92   | Sync réseau  |
| `showTrain`                            | `"true"` \| `"false"` | DisplayContext.tsx      | 37, 43-45   | Persistent   |
| `showAutre`                            | `"true"` \| `"false"` | DisplayContext.tsx      | 51, 54-55   | Persistent   |
| `showTimeTimer`                        | `"true"` \| `"false"` | DisplayContext.tsx      | 61, 64-65   | Persistent   |

---

### localStorage : Scope Global

| Clé     | Valeur                | Fichier        | Lifecycle  |
| ------- | --------------------- | -------------- | ---------- |
| `lang`  | `"fr"` \| `"en"`      | i18n/i18n.ts   | Persistent |
| `theme` | `"light"` \| `"dark"` | app/layout.tsx | Persistent |

---

## 🔄 Hooks : Détection et routing

### Détection Visitor

```typescript
import { useIsVisitor } from '@/hooks'

const { isVisitor, authReady } = useIsVisitor()
// isVisitor = authReady && !user
```

**Fichier** : `src/hooks/useIsVisitor.ts:38-44`

---

### Hooks adapters (router Cloud/Local)

```typescript
// Séquences
import useSequencesWithVisitor from '@/hooks/useSequencesWithVisitor'
const { sequences, createSequence, isVisitorSource } = useSequencesWithVisitor()

// Étapes
import useSequenceStepsWithVisitor from '@/hooks/useSequenceStepsWithVisitor'
const { steps, addStep, moveStep } = useSequenceStepsWithVisitor(sequenceId)
```

**Logique interne** : `isVisitor ? useSequencesLocal : useSequences`

---

### Hooks local-only (Visitor uniquement)

```typescript
// Séquences local
import useSequencesLocal from '@/hooks/useSequencesLocal'
const { sequences, createSequence } = useSequencesLocal()

// Étapes local
import useSequenceStepsLocal from '@/hooks/useSequenceStepsLocal'
const { steps, addStep } = useSequenceStepsLocal(sequenceId)
```

**⚠️ Usage** : Jamais appeler directement ! Utiliser adapter + hook avec `enabled` flag

---

## 📊 Schémas : Local ↔ Supabase

### VisitorSequence ↔ sequences

```typescript
// Local (IndexedDB)
{
  id: string,              // UUID v4 local
  mother_card_id: string,  // FK → cards
  created_at: number       // Date.now() timestamp
}

// Cloud (Supabase)
{
  id: UUID,
  account_id: UUID,        // ⚠️ À ajouter à l'import
  mother_card_id: UUID,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

**Migration** : ID local remappé lors import (Ticket 4)

---

### VisitorSequenceStep ↔ sequence_steps

```typescript
// Local (IndexedDB)
{
  id: string,              // UUID v4 local
  sequence_id: string,     // FK local → VisitorSequence
  step_card_id: string,    // FK → cards
  position: number         // 0, 1, 2, ...
}

// Cloud (Supabase)
{
  id: UUID,
  sequence_id: UUID,
  step_card_id: UUID,
  position: INTEGER,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
}
```

**Constraints** :

- `UNIQUE(sequence_id, step_card_id)` ✅ same both
- `UNIQUE(sequence_id, position)` ✅ same both
- Min 2 étapes ✅ enforced local + DB trigger

---

## 🚀 Accès IndexedDB : Fonctions utiles

### Lire toutes séquences

```typescript
import * as sequencesDB from '@/utils/visitor/sequencesDB'

const sequences = await sequencesDB.getAllSequences()
// → VisitorSequence[]
```

### Créer séquence + étapes

```typescript
const { id } = await sequencesDB.createSequenceWithSteps(
  motherCardId,
  ['step-card-1', 'step-card-2', 'step-card-3'] // ≥2 étapes
)
// Throws si <2 étapes ou séquence déjà existe
```

### Lire étapes d'une séquence

```typescript
const steps = await sequencesDB.getSequenceSteps(sequenceId)
// → VisitorSequenceStep[] (triés par position ASC)
```

### Ajouter étape

```typescript
await sequencesDB.addSequenceStep(sequenceId, stepCardId)
// Throws si carte déjà dans séquence (doublon)
```

### Déplacer étape

```typescript
await sequencesDB.moveSequenceStep(stepId, newPosition)
// Stratégie: échange positions A ↔ B
```

### Supprimer étape

```typescript
await sequencesDB.removeSequenceStep(stepId)
// Throws si resterait <2 étapes
```

---

## 📋 Contextes & Fournisseurs

| Contexte            | Clé localStorage                                                      | Provider fichier                     | Hook d'accès        |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------ | ------------------- |
| AuthContext         | `session` (Supabase SDK)                                              | src/contexts/AuthContext.tsx         | `useAuth()`         |
| ChildProfileContext | `applipicto:visitor:activeChildId`, `applipicto:activeChild:{userId}` | src/contexts/ChildProfileContext.tsx | `useChildProfile()` |
| DisplayContext      | `showTrain`, `showAutre`, `showTimeTimer`                             | src/contexts/DisplayContext.tsx      | `useDisplay()`      |
| OfflineContext      | `appli-picto:offline-validation-queue`                                | src/contexts/OfflineContext.tsx      | `useOffline()`      |

**Setup** : Tous les providers sont dans `src/app/providers.tsx` (root layout)

---

## ⚠️ Pièges courants

### ❌ Appeler directement useSequencesLocal pour Auth users

```typescript
// ❌ INTERDIT
if (isVisitor) {
  const { sequences } = useSequencesLocal() // OK pour Visitor
}

// ✅ CORRECT - Utiliser l'adapter
const { sequences } = useSequencesWithVisitor() // Router auto
```

### ❌ Accéder localStorage sans guard SSR

```typescript
// ❌ INTERDIT
localStorage.getItem('key') // Crash en SSR!

// ✅ CORRECT
if (typeof window !== 'undefined') {
  localStorage.getItem('key')
}
```

### ❌ Supposer localStorage persiste pour Visitor

```typescript
// ❌ INTERDIT - showTrain en localStorage ne s'affiche pas pour Visitor
const [showTrain] = useState(() => {
  return localStorage.getItem('showTrain') === 'true'
})

// ✅ CORRECT - Force true pour Visitor
const [showTrain] = useState(() => {
  return isVisitor ? true : localStorage.getItem('showTrain') === 'true'
})
```

### ❌ Créer séquence avec <2 étapes

```typescript
// ❌ INTERDIT
await sequencesDB.createSequenceWithSteps(motherId, ['step-1'])
// Throws: "La séquence doit avoir au moins 2 étapes."

// ✅ CORRECT
await sequencesDB.createSequenceWithSteps(
  motherId,
  ['step-1', 'step-2'] // ≥2 obligatoire
)
```

### ❌ Double flux d'appel adapter

```typescript
// ❌ INTERDIT - Appeler le hook sans `enabled` flag
const local = useSequencesLocal() // TOUJOURS actif!
const cloud = useSequences() // TOUJOURS actif!
// → Double exécution, state race condition

// ✅ CORRECT - Utiliser enabled flag
const cloud = useSequences(!isVisitor && authReady)
const local = useSequencesLocal(isVisitor && authReady)
// → UN seul actif à la fois
```

---

## 🧪 Testing localStorage en dev

### Vérifier localStorage Visitor

```javascript
// Console DevTools
console.log(
  'Visitor child ID:',
  localStorage.getItem('applipicto:visitor:activeChildId')
)
// → "visitor-local"

console.log('Consent:', JSON.parse(localStorage.getItem('cookie_consent_v2')))
// → { version, ts, mode, choices: {...}, ... }
```

### Vérifier IndexedDB

```javascript
// Ouvrir DB
const db = await new Promise(r => {
  const req = indexedDB.open('appli-picto-visitor')
  req.onsuccess = () => r(req.result)
})

// Lire toutes séquences
const tx = db.transaction('sequences', 'readonly')
const store = tx.objectStore('sequences')
const sequences = await new Promise(r => {
  const req = store.getAll()
  req.onsuccess = () => r(req.result)
})
console.table(sequences)
```

### Simuler offline (Visitor ne concerné)

```javascript
// Pour tester offline queue (Auth users)
window.dispatchEvent(new Event('offline'))
// → OfflineContext détecte offline, enqueue en localStorage
```

---

## 📈 Performance & Limites

| Ressource       | Limite                            | Visitor impact | Notes                                       |
| --------------- | --------------------------------- | -------------- | ------------------------------------------- |
| localStorage    | ~5-10 MB                          | ≈20 KB max     | activeChildId + displayPrefs + consentement |
| IndexedDB       | ~50 MB (Firefox) à 1+ GB (Chrome) | ≈1-10 MB max   | séquences + steps (1000 étapes max)         |
| Session storage | ~5-10 MB                          | Non utilisé    | (reserved pour Supabase SDK)                |

**Bottleneck** : Position resquencing lors import (Ticket 4) = O(n²) si naïf → utiliser DEFERRABLE en transaction

---

## 🔐 Sécurité & RGPD

### Données Visitor

| Donnée                     | Durée                         | Sécurité                       | RGPD                                 |
| -------------------------- | ----------------------------- | ------------------------------ | ------------------------------------ |
| Séquences IndexedDB        | Jusqu'import ou delete manual | Aucune chiffrement (local)     | Portabilité via export JSON (future) |
| activeChildId localStorage | Jusqu'import ou delete manual | Local plaintext                | Portabilité via localStorage export  |
| Consent localStorage       | 180 jours max                 | Local plaintext + expiry check | ✅ CNIL compliant                    |

### Donnees Auth users

| Donnée                     | Durée            | Sécurité                            | RGPD                |
| -------------------------- | ---------------- | ----------------------------------- | ------------------- |
| Offline queue localStorage | Jusqu'sync cloud | Local plaintext                     | ✅ Sync automatique |
| activeChildId localStorage | Jusqu'logout     | Local plaintext (namespaced userId) | ✅ Cleanup logout   |
| Preferences localStorage   | Jusqu'logout     | Local plaintext                     | ✅ Cleanup logout   |

**Pas de données sensibles en localStorage** (pas de tokens, passwords, PII)

---

## 📞 Contacts & Tickets

- **Ticket 3 (Séquençage Visitor)** : ✅ DONE - Implémentation complète
- **Ticket 4 (Import vers compte)** : 📋 TODO - Utilise structures préparées
- **Ticket 5 (Collaboration)** : 🔮 FUTURE - Pas d'impact persistance local

---

**Dernière mise à jour** : 2026-03-25
