# Diagrammes d'architecture : Persistance Visitor

## Architecture générale : Visitor vs Auth

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLI-PICTO                                 │
│                     (Next.js 16 + Supabase)                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐       ┌──────────────────────────┐
│     MODE VISITOR         │       │      MODE AUTH USER      │
│   (user === null)        │       │  (user !== null)         │
│ authReady && !user       │       │ authReady && user        │
└──────────────────────────┘       └──────────────────────────┘
         │                                    │
         │ No DB                              │ DB Access (RLS)
         │ No Account                         │ Account required
         │                                    │
         ├─ IndexedDB ✅                      ├─ Supabase ✅
         │  ├─ sequences                      │  ├─ sequences
         │  └─ sequence_steps                 │  ├─ sequence_steps
         │                                    │  └─ child_profiles
         │                                    │
         ├─ localStorage ✅                   ├─ localStorage ✅
         │  ├─ activeChildId                  │  ├─ activeChildId (namespaced)
         │  └─ cookie_consent_v2              │  ├─ cookie_consent_v2
         │                                    │  ├─ offline-validation-queue
         │                                    │  └─ showTrain, showAutre, etc.
         │                                    │
         └─ RAM (in-memory state)             └─ RAM + AuthContext
            └─ DisplayContext                    ├─ DisplayContext
            └─ ChildProfileContext              ├─ ChildProfileContext
                                                ├─ OfflineContext
                                                └─ AuthContext
```

---

## Flow de détection Visitor

```
┌─────────────────┐
│   useAuth()     │
└────────┬────────┘
         │
         ├─ user : User | null
         └─ authReady : boolean
                │
                ├─ (false, false)  → Loading
                ├─ (false, true)   → 🔓 VISITOR ← here
                ├─ (true, true)    → 🔐 AUTH USER
                └─ (true, false)   → Error
                │
         ┌──────┴──────┐
         │             │
    ┌────▼─────┐  ┌────▼──────┐
    │ useIsVisitor │ Returns │
    │   returns    │ isVisitor=true
    └────┬─────┘  └──────────┘
         │
    ┌────▼──────────────────┐
    │ Components check:      │
    │ if (isVisitor) {       │
    │   // Show demo mode    │
    │   // Use IndexedDB     │
    │   // Skip RLS checks   │
    │ }                      │
    └───────────────────────┘
```

---

## Flow : Séquences Visitor

```
┌──────────────────────────────────────────────────────────────┐
│           Component (SequenceEditor)                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ├─ useSequenceStepsWithVisitor(sequenceId)
                       │
                       ├─ Router internal:
                       │  ├─ if isVisitor && authReady:
                       │  │  └─ useSequenceStepsLocal(enabled=true)
                       │  └─ else if !isVisitor && authReady:
                       │     └─ useSequenceSteps(enabled=true)
                       │
        ┌──────────────┴──────────────┐
        │ VISITOR PATH                │ AUTH PATH
        │ (IndexedDB local-only)      │ (Supabase cloud + RLS)
        │                             │
    ┌───▼────────────────┐        ┌──▼────────────────┐
    │ useSequenceStepsLocal       │ useSequenceSteps
    └───┬────────────────┘        └──┬────────────────┘
        │                            │
        ├─ Lit depuis IndexedDB       ├─ Lit depuis Supabase
        │  "appli-picto-visitor"      │  table sequence_steps
        │  store: sequence_steps      │  avec RLS policies
        │                            │
        ├─ addStep()                  ├─ addStep()
        │  └─ sequencesDB.addSequenceStep()  └─ supabase.from('sequence_steps').insert()
        │                            │
        ├─ removeStep()               ├─ removeStep()
        │  └─ sequencesDB.removeSequenceStep()  └─ supabase.from('sequence_steps').delete()
        │                            │
        ├─ moveStep()                 ├─ moveStep()
        │  └─ sequencesDB.moveSequenceStep()   └─ supabase.rpc('reorder_steps')
        │                            │
        └─ return { steps, ... }     └─ return { steps, ... }
```

---

## IndexedDB Schema : appli-picto-visitor

```
┌─────────────────────────────────────────────────────────┐
│   DB: "appli-picto-visitor" (v1)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ObjectStore: "sequences"                        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ KeyPath: "id"                                   │  │
│  │                                                 │  │
│  │ Columns:                                        │  │
│  │  ├─ id (string, UUID v4 local) - PRIMARY       │  │
│  │  ├─ mother_card_id (string, FK) - UNIQUE Index │  │
│  │  └─ created_at (number, Date.now())            │  │
│  │                                                 │  │
│  │ Constraints:                                    │  │
│  │  └─ UNIQUE(mother_card_id)                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ObjectStore: "sequence_steps"                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ KeyPath: "id"                                   │  │
│  │                                                 │  │
│  │ Columns:                                        │  │
│  │  ├─ id (string, UUID v4 local) - PRIMARY       │  │
│  │  ├─ sequence_id (string, FK local)             │  │
│  │  ├─ step_card_id (string, FK → cards)          │  │
│  │  └─ position (number, 0-based)                 │  │
│  │                                                 │  │
│  │ Indexes:                                        │  │
│  │  ├─ sequence_id (non-unique) - Foreign Key     │  │
│  │  ├─ sequence_step_card (unique) - COMPOSITE    │  │
│  │  │  └─ [sequence_id, step_card_id]             │  │
│  │  └─ sequence_position (unique) - COMPOSITE     │  │
│  │     └─ [sequence_id, position]                 │  │
│  │                                                 │  │
│  │ Constraints:                                    │  │
│  │  ├─ UNIQUE(sequence_id, step_card_id)          │  │
│  │  └─ UNIQUE(sequence_id, position)              │  │
│  │                                                 │  │
│  │ Application Rules:                              │  │
│  │  ├─ Min 2 steps per sequence                    │  │
│  │  └─ No duplicate card per sequence             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## localStorage Map : Clés et valeurs

```
┌──────────────────────────────────────────────────────────────┐
│              localStorage (Browser Local Storage)             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  VISITOR MODE KEYS                                            │
│  ├─ applipicto:visitor:activeChildId                         │
│  │  └─ Value: "visitor-local" (constant)                     │
│  │     File: ChildProfileContext.tsx:70, 155-162             │
│  │     Scope: Visitor only                                   │
│  │                                                           │
│  AUTH USER KEYS                                               │
│  ├─ applipicto:activeChild:{userId}                          │
│  │  └─ Value: UUID of active child profile                   │
│  │     File: ChildProfileContext.tsx:76, 171-187             │
│  │     Scope: Auth users (namespaced by userId)              │
│  │                                                           │
│  ├─ appli-picto:offline-validation-queue                     │
│  │  └─ Value: JSON array of PendingValidation                │
│  │     [                                                     │
│  │       {                                                   │
│  │         id: string,                                      │
│  │         sessionId: UUID,                                 │
│  │         slotId: UUID,                                    │
│  │         enqueuedAt: number                               │
│  │       },                                                 │
│  │       ...                                                │
│  │     ]                                                    │
│  │     File: OfflineContext.tsx:67, 75-92                   │
│  │     Scope: Auth users (offline queue sync)                │
│  │                                                           │
│  ├─ showTrain                                                │
│  │  └─ Value: "true" | "false"                               │
│  │     File: DisplayContext.tsx:37, 43-45                    │
│  │     Scope: Auth users (Visitor = always true in RAM)      │
│  │                                                           │
│  ├─ showAutre                                                │
│  │  └─ Value: "true" | "false"                               │
│  │     File: DisplayContext.tsx:48-56                        │
│  │     Scope: Auth users (Visitor = always false in RAM)     │
│  │                                                           │
│  ├─ showTimeTimer                                            │
│  │  └─ Value: "true" | "false"                               │
│  │     File: DisplayContext.tsx:58-66                        │
│  │     Scope: Auth users (Visitor = always false in RAM)     │
│  │                                                           │
│  GLOBAL KEYS (Visitor & Auth)                                │
│  ├─ cookie_consent_v2                                        │
│  │  └─ Value: JSON ConsentRecord {                           │
│  │       version: "1.0.0",                                   │
│  │       ts: "2026-03-25T...",                               │
│  │       mode: "custom",                                     │
│  │       choices: {                                          │
│  │         necessary: true,    # always true                 │
│  │         analytics: boolean,                               │
│  │         marketing: boolean                                │
│  │       }                                                   │
│  │     }                                                     │
│  │     File: consent.ts:9, 65-112                            │
│  │     Expiry: 180 days auto-check                           │
│  │                                                           │
│  ├─ lang                                                      │
│  │  └─ Value: "fr" | "en" (or system default)                │
│  │     File: config/i18n/i18n.ts                             │
│  │     Scope: Global (i18n initialization)                   │
│  │                                                           │
│  ├─ theme                                                     │
│  │  └─ Value: "light" | "dark" (or system default)           │
│  │     File: app/layout.tsx                                  │
│  │     Scope: Global (root layout)                           │
│  │                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow : Profil enfant Visitor

```
┌────────────────────────────────────────────────────────┐
│     Application Start (hydration)                      │
└────────────┬─────────────────────────────────────────┘
             │
             ├─ useAuth() checks Supabase session
             │  └─ user === null → isVisitor = true
             │
             ├─ ChildProfileContext mounts
             │  │
             │  ├─ useEffect: if (isVisitor)
             │  │  └─ localStorage.getItem('applipicto:visitor:activeChildId')
             │  │     └─ Returns: "visitor-local" (or null first time)
             │  │
             │  ├─ setActiveChildIdState("visitor-local")
             │  │
             │  ├─ localStorage.setItem(VISITOR_STORAGE_KEY, VISITOR_PROFILE.id)
             │  │  └─ Persists "visitor-local" for next session
             │  │
             │  └─ Provide via context:
             │     {
             │       activeChildProfile: VISITOR_PROFILE,
             │       activeChildId: "visitor-local",
             │       childProfiles: [],  # empty for Visitor
             │       isVisitor: true,
             │       ...
             │     }
             │
             ├─ Components consume context
             │  └─ Display single profile: "Mon enfant"
             │     (no profile switching in Visitor mode)
             │
             └─ User logs out (or logs in)
                └─ AuthContext update → user = null (logout)
                   │
                   ├─ ChildProfileContext detects logout
                   │  │
                   │  └─ useEffect: if (authReady && !user)
                   │     ├─ localStorage.removeItem(storageKey(prevUserId))
                   │     │  # Cleanup auth user's namespaced key
                   │     │
                   │     ├─ setActiveChildIdState(null)
                   │     │
                   │     └─ Next effect (visitor mode) re-initializes
                   │        └─ setActiveChildIdState("visitor-local")
                   │
                   └─ Transition complete: Auth → Visitor mode
```

---

## Import Schema : Local → Supabase (Ticket 4)

```
┌────────────────────────────────────────────────────────────┐
│   Visitor IndexedDB Data (local)                           │
│                                                            │
│   sequences:                                               │
│   ├─ id: "abc123..." (UUID v4 local)                       │
│   ├─ mother_card_id: "card-456..."                         │
│   └─ created_at: 1709000000000 (Date.now())                │
│                                                            │
│   sequence_steps:                                          │
│   ├─ id: "step-789..." (UUID v4 local)                     │
│   ├─ sequence_id: "abc123..." (FK local)                   │
│   ├─ step_card_id: "card-999..."                           │
│   └─ position: 0, 1, 2, ... (0-based)                      │
│                                                            │
└────────────┬───────────────────────────────────────────────┘
             │
             │ IMPORT TRANSFORMATION (Ticket 4)
             │ ├─ Create account (if new user)
             │ ├─ Remap UUIDs: local → Supabase
             │ ├─ Convert timestamps: number → TIMESTAMPTZ
             │ ├─ Add account_id to each sequence
             │ ├─ Resquence positions: [0,1,3,4] → [0,1,2,3]
             │ ├─ Validate constraints locally
             │ └─ Insert in single transaction
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│   Supabase Cloud (after import)                            │
│                                                            │
│   sequences table:                                         │
│   ├─ id: UUID (remapped from local)                        │
│   ├─ account_id: UUID (created during import)              │
│   ├─ mother_card_id: UUID (bank or personal)               │
│   ├─ created_at: TIMESTAMPTZ (converted from timestamp)    │
│   └─ updated_at: TIMESTAMPTZ (=created_at)                 │
│                                                            │
│   sequence_steps table:                                    │
│   ├─ id: UUID (remapped from local)                        │
│   ├─ sequence_id: UUID (remapped FK)                       │
│   ├─ step_card_id: UUID (unchanged)                        │
│   ├─ position: INTEGER (0-based, contiguous)               │
│   ├─ created_at: TIMESTAMPTZ (converted)                   │
│   └─ updated_at: TIMESTAMPTZ (=created_at)                 │
│                                                            │
│   RLS Policies Active:                                     │
│   ├─ sequences: account_id = auth.uid()                    │
│   └─ sequence_steps: (indirect via sequence_id → account)  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Constraints Enforcement : Local vs Cloud

```
┌──────────────────────────────────────────────────────────────┐
│         Constraint                Local (IndexedDB)           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ UNIQUE(mother_card_id)        createSequenceWithSteps():     │
│ Per account                   ├─ Check getSequenceByMotherCardId()
│                               └─ Throw if exists (line 182)  │
│                                                               │
│ Min 2 steps per sequence      createSequenceWithSteps():     │
│                               ├─ Check stepCardIds.length < 2
│                               └─ Throw (line 174-176)        │
│                                                               │
│ removeSequenceStep():                                         │
│ ├─ Check remaining steps < 2                                │
│ └─ Throw (line 339-341)                                     │
│                                                               │
│ UNIQUE(sequence_id, step_card_id)  addSequenceStep():        │
│ No duplicate card                  ├─ Check existing steps
│                                     └─ Throw if found (285)  │
│                                                               │
│ UNIQUE(sequence_id, position)      moveSequenceStep():       │
│ Unique position per sequence       ├─ IndexedDB Composite Index
│                                    └─ Swap positions A↔B     │
│                                       (line 358-408)         │
│                                                               │
│ Position >= 0                      position: number >= 0     │
│                                    (enforced by app logic)   │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         Constraint                Cloud (Supabase)            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ UNIQUE(account_id, mother_card_id)    DB Constraint         │
│                                       (phase6_create_sequences)
│                                                               │
│ Min 2 steps per sequence              Trigger (DEFERRABLE)  │
│                                       (phase6_add_sequence_invariants)
│                                                               │
│ UNIQUE(sequence_id, step_card_id)     DB Constraint         │
│                                       (phase6_create_sequence_steps)
│                                                               │
│ UNIQUE(sequence_id, position)         DB Constraint         │
│ DEFERRABLE INITIALLY DEFERRED         (allows multi-row txns)
│                                       (phase6_create_sequence_steps)
│                                                               │
│ position >= 0                         CHECK constraint      │
│                                       (phase6_create_sequence_steps)
│                                                               │
│ account_id matches auth.uid()         RLS Policy            │
│                                       (phase7_8_rls_sequences)
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Lifecycle : Visitor Session

```
START
  │
  ├─ [1] App loads → useAuth checks Supabase
  │      └─ user = null → isVisitor = true (authReady = true)
  │
  ├─ [2] IndexedDB DB opens
  │      └─ If first time: onupgradeneeded creates stores
  │
  ├─ [3] ChildProfileContext initializes
  │      └─ localStorage loads "visitor-local"
  │
  ├─ [4] User in demo mode
  │      ├─ Can create sequences (IndexedDB)
  │      ├─ Can edit sequences (IndexedDB)
  │      ├─ All data stays local
  │      └─ ⚠️ Data lost if browser storage cleared
  │
  ├─ [5] User clicks "Sign up"
  │      └─ Redirects to /signup
  │
  ├─ [6] New account created in Supabase
  │      ├─ accounts table: new row (account_id)
  │      └─ account_preferences: default prefs
  │
  ├─ [7] User logs in → AuthContext.user = User object
  │      ├─ isVisitor = false
  │      └─ Triggers import (Ticket 4)
  │         ├─ Local IndexedDB → Supabase
  │         ├─ account_id added to sequences
  │         ├─ UUIDs remapped (local → cloud)
  │         └─ RLS policies applied
  │
  ├─ [8] Preference migration
  │      ├─ showTrain → account_preferences (DB)
  │      ├─ showAutre → account_preferences (DB)
  │      └─ showTimeTimer → account_preferences (DB)
  │
  ├─ [9] Session data synced
  │      └─ All state now cloud-backed (RLS protected)
  │
  └─ [10] User can logout → Transition back to Visitor mode
         ├─ AuthContext.user = null
         ├─ DisplayContext preferences reset
         ├─ activeChildId resets to "visitor-local"
         └─ IndexedDB still available (not cleared)
```

---

## State Diagram : Visitor ↔ Auth Transitions

```
                    ┌─────────────────────────────┐
                    │   LOADING                   │
                    │ authReady = false           │
                    └──────────┬──────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
                 ▼                           ▼
         ┌──────────────┐          ┌─────────────────┐
         │  VISITOR     │          │   AUTH USER     │
         │ user = null  │◄────────►│  user !== null  │
         │ authReady=✓  │   Logout │  authReady=✓    │
         │              │    ↓ ↑   │                 │
         │ • IndexedDB  │ (signup) │ • Supabase DB   │
         │ • localStorage│          │ • localStorage  │
         │ • No Account │ (logout) │ • account_id    │
         │ • local-only │    ↑ ↓   │ • RLS + Quotas  │
         │              │    Signup│                 │
         └──────────────┘          └─────────────────┘
                 │                           │
                 │ session stored            │ session stored
                 │ in localStorage           │ in localStorage
                 │ (Supabase SDK)            │ (Supabase SDK)
                 │                           │
                 └───────────────────────────┘
                          │
                          ├─ Browser close
                          ├─ Page reload
                          └─ Session restored from storage
```

---

**Créé** : 2026-03-25 | **Mise à jour** : 2026-03-25
