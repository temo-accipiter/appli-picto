# Hooks Custom Supabase — Appli-Picto

## 🔒 Règle DB-First (OBLIGATOIRE)

**TOUJOURS utiliser ces hooks, JAMAIS query Supabase directe.**
→ Voir skill `db-first-frontend` pour détails complets

---

## 📋 Hooks disponibles (par catégorie)

### Identité & Auth

- `useAuth()` — Authentification (user, authReady, signOut)
- `useAccountStatus()` — Statut compte (free/subscriber/admin) + `statusDisplay` — COSMÉTIQUE UNIQUEMENT
- `useAccountPreferences()` — Préférences utilisateur (train_enabled, reduced_motion)
- `useIsVisitor()` — Détection mode visitor (local-only)

### Cartes & Catégories

- `useBankCards()` — Cartes banque (pictos officiels) — READ-ONLY
- `usePersonalCards()` — Cartes personnelles utilisateur (CRUD)
- `useCategories()` — Catégories utilisateur (CRUD)
- `useCategoryValidation()` — Validation catégories
- `useChildProfiles()` — Profils enfants (CRUD)

### Planning (Timelines/Slots)

- `useTimelines()` — Timelines (CRUD)
- `useSlots()` — Slots (créneaux timeline) (CRUD)

### Exécution (Sessions)

- `useSessions()` — Sessions (exécution) (CRUD)
- `useSessionValidations()` — Validations sessions (CRUD)

### Séquençage (Sequences)

- `useSequences()` — Séquences DB (CRUD)
- `useSequenceSteps()` — Étapes séquences DB (CRUD)
- `useSequencesLocal()` — Séquences visitor (IndexedDB local)
- `useSequenceStepsLocal()` — Étapes visitor (IndexedDB local)
- `useSequencesWithVisitor()` — Séquences unifiées (DB + local)
- `useSequenceStepsWithVisitor()` — Étapes unifiées (DB + local)

### Devices & Checkout

- `useDevices()` — Liste devices utilisateur
- `useDeviceRegistration()` — Enregistrement device
- `useCheckout()` — Checkout Stripe (createCheckoutSession)

### Admin

- `useAdminSupportInfo()` — Infos support compte (admin uniquement)
- `useAdminBankCards()` — Gestion cartes banque (admin uniquement)

### UI Helpers

- `useReducedMotion()` — Détection prefers-reduced-motion
- `useScrollLock()` — Verrouillage scroll (modals)
- `useEscapeKey()` — Détection touche Escape
- `useFocusTrap()` — Piège focus (accessibilité modals)
- `useDebounce()` — Debounce input
- `useOnlineStatus()` — Détection hors ligne
- `useAudioContext()` — Gestion audio
- `useDragAnimation()` — Animations drag & drop

---

Tous les hooks sont exportés dans `src/hooks/index.ts`
