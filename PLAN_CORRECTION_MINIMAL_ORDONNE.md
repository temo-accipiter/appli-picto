# 🛠️ PLAN DE CORRECTION MINIMAL ORDONNÉ

**Date** : 2026-02-20
**Version** : 1.0
**Statut** : Prêt pour exécution

**Référence** : Synthèse des 6 audits DB-first + UX TSA

---

## 🎯 Méthodologie

**Priorisation** (3 critères) :

1. **Risque TSA** : Impact expérience enfants autistes (CRITIQUE > ÉLEVÉ > MODÉRÉ > FAIBLE)
2. **Blocage Contractuel** : Violation §1-7 FRONTEND_CONTRACT (BLOQUANT > IMPORTANT > RECOMMANDÉ)
3. **Effort** : Temps estimé (1-2h > 2-4h > 1j > 2-3j)

**Principe** : Petites itérations testables (pattern EXECUTION_PLAN)

**Format Correction** :

- **Titre** : Description concise
- **Priorité** : P0 (critique) → P3 (amélioration)
- **Risque TSA** : CRITIQUE / ÉLEVÉ / MODÉRÉ / FAIBLE
- **Blocage Contractuel** : Référence §FRONTEND_CONTRACT
- **Fichiers touchés** : Chemins exacts
- **Changements** : Description technique
- **Critères acceptation** : Testables (commande + résultat attendu)
- **Effort** : Estimation réaliste

---

## 📊 VUE D'ENSEMBLE

**Total corrections** : **22 corrections** regroupées en **7 phases**

| Phase                            | Priorité | Corrections | Effort Total | Risque TSA Max |
| -------------------------------- | -------- | ----------- | ------------ | -------------- |
| **Phase 0 - Tests Vitaux**       | P0       | 3           | 4-6h         | MODÉRÉ         |
| **Phase 1 - Sécurité DB-First**  | P0       | 1           | 2-3h         | FAIBLE         |
| **Phase 2 - Accessibilité WCAG** | P1       | 4           | 3-5h         | MODÉRÉ         |
| **Phase 3 - Migration DB-First** | P1       | 5           | 2-3j         | ÉLEVÉ          |
| **Phase 4 - Nettoyage Legacy**   | P2       | 7           | 1-2j         | FAIBLE         |
| **Phase 5 - Optimisations**      | P3       | 2           | 4-6h         | FAIBLE         |
| **Phase 6 - Documentation**      | P3       | -           | 2-3h         | -              |

**Durée totale estimée** : **6-8 jours** (1 sprint)

---

## 🚨 PHASE 0 - TESTS VITAUX (P0 - BLOQUANT)

**Objectif** : Restaurer suite tests fonctionnelle (build + tests passent)

**Justification** :

- Build OK mais **31 tests unitaires échouent** (10%)
- Tests E2E **0%** (setup manquant)
- Violation §AUDIT "Tests doivent passer avant déploiement"

---

### 0.1 ✅ Corriger Mocks Supabase `.abortSignal()`

**Priorité** : **P0** (BLOQUANT)
**Risque TSA** : MODÉRÉ (tests échouent → régression possible UX enfant)
**Blocage Contractuel** : Prérequis déploiement (tests doivent passer)

**Problème** :

- **31 tests unitaires échouent** (useAccountStatus, useCategories, useRBAC, etc.)
- Erreur : `TypeError: abortSignal is not a function`
- Cause : Mocks Supabase incomplets (manque chaînage `.abortSignal()`)

**Fichiers touchés** :

- `src/test/setup.ts` (ligne 15-50)

**Changements** :

```typescript
// AVANT (incomplet)
vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      // ⚠️ Manque abortSignal chainable
    }),
  },
}))

// APRÈS (complet)
vi.mock('@/utils/supabaseClient', () => {
  const createChainableMock = (data = { data: [], error: null }) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),

    // ✅ Support abortSignal chainable
    abortSignal: vi.fn().mockResolvedValue(data),
  })

  return {
    supabase: {
      from: vi.fn(table => createChainableMock()),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    },
  }
})
```

**Critères acceptation** :

```bash
# Commande
pnpm test -- --run

# Résultat attendu
✓ Test Files  32 passed (32)
✓      Tests  308 passed (308)
✓   Duration  < 2min

# Vérifier fichiers précédemment échoués
✓ useAccountStatus.test.ts   (6/6)
✓ useCategories.test.ts       (5/5)
✓ useDemoCards.test.ts        (4/4)
✓ useRBAC.test.tsx            (5/5)
✓ Edition.test.tsx            (3/3)
✓ AuthContext.test.tsx        (6/6)
✓ ToastContext.test.tsx       (4/4)
```

**Effort** : **1-2h**

---

### 0.2 ✅ Setup E2E Supabase Local + Seed

**Priorité** : **P0** (BLOQUANT)
**Risque TSA** : FAIBLE (tests seulement)
**Blocage Contractuel** : Prérequis déploiement (E2E doivent passer)

**Problème** :

- **11/11 tests E2E métier échouent** (0%)
- Cause : Supabase local non démarré + données seed manquantes

**Fichiers touchés** :

- `README.md` (section "Tests E2E")
- `scripts/seed-test-data.ts` (créer)
- `tests/setup.ts` (améliorer)
- `.github/workflows/ci.yml` (ajouter step Supabase start)

**Changements** :

**1. Créer script seed data test** (`scripts/seed-test-data.ts`) :

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedTestData() {
  console.log('🌱 Seed data test...')

  // Seed admin
  const admin = await supabase.auth.admin.createUser({
    email: 'admin@test.local',
    password: 'Admin1234!',
    email_confirm: true,
    user_metadata: { role: 'admin' },
  })

  // Seed free user
  const free = await supabase.auth.admin.createUser({
    email: 'free@test.local',
    password: 'Free1234!',
    email_confirm: true,
  })

  // Seed abonné
  const subscriber = await supabase.auth.admin.createUser({
    email: 'subscriber@test.local',
    password: 'Sub1234!',
    email_confirm: true,
  })

  // Seed timelines + slots pour chaque user
  // ... (détails seed)

  console.log('✅ Seed terminé')
}

seedTestData().catch(console.error)
```

**2. Documenter setup dans README** :

```markdown
## Tests E2E

### Prérequis

1. Supabase local démarré : `pnpm supabase:start`
2. Seed data test : `pnpm db:seed:test`

### Commandes

pnpm test:e2e # Tous tests E2E
pnpm test:e2e:ui # Mode UI
pnpm test:e2e:headed # Voir navigateur
pnpm test:e2e:debug # Debug mode
```

**3. Package.json script** :

```json
{
  "scripts": {
    "db:seed:test": "tsx scripts/seed-test-data.ts"
  }
}
```

**Critères acceptation** :

```bash
# 1. Démarrer Supabase local
pnpm supabase:start
# → ✅ API URL: http://127.0.0.1:54321

# 2. Seed data
pnpm db:seed:test
# → ✅ 🌱 Seed data test...
# → ✅ ✓ Admin créé
# → ✅ ✓ Free user créé
# → ✅ ✓ Subscriber créé

# 3. Lancer E2E (subset rapide)
pnpm test:e2e tests/e2e/auth-flows.spec.ts
# → ✅ Test Files  1 passed (1)
# → ✅      Tests  5 passed (5)

# 4. Vérifier tests précédemment échoués passent
✓ Signup utilisateur - Création compte
✓ Login Free → /tableau
✓ Login Abonné → /tableau + features
✓ Login Admin → dashboard admin
✓ Logout - Déconnexion
```

**Effort** : **2-3h**

---

### 0.3 ✅ Corriger Violation WCAG Structurelle (9 pages)

**Priorité** : **P0** (BLOQUANT)
**Risque TSA** : MODÉRÉ (accessibilité enfants TSA)
**Blocage Contractuel** : §6.1 FRONTEND_CONTRACT "WCAG 2.2 AA obligatoire"

**Problème** :

- **9 violations "Serious" WCAG 2.2 AA** (pages principales)
- Toutes les pages ont **exactement la même violation**
- Cause : Élément layout global mal balisé (Navbar / Footer / Layout)

**Fichiers touchés** (hypothèses) :

- `src/components/layout/navbar/Navbar.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/app/layout.tsx`

**Changements** :

**1. Consulter rapport axe-core** :

```bash
open tests/accessibility/report.html
# → Identifier violation exacte commune
```

**2. Hypothèses corrections** (à ajuster selon rapport) :

**Hypothèse A - Landmark manquant** :

```tsx
// AVANT (src/components/layout/navbar/Navbar.tsx)
<div className="navbar">
  <nav>...</nav>
</div>

// APRÈS
<header>
  <nav aria-label="Navigation principale">...</nav>
</header>
```

**Hypothèse B - Bouton sans label** :

```tsx
// AVANT
<button onClick={toggleMenu}>
  <MenuIcon />
</button>

// APRÈS
<button aria-label="Ouvrir menu" onClick={toggleMenu}>
  <MenuIcon aria-hidden="true" />
</button>
```

**Hypothèse C - Contraste insuffisant** :

```scss
// AVANT (Navbar.scss)
.navbar__link {
  color: #ffb3ba; // Contraste 2.8:1 (insuffisant)
}

// APRÈS
.navbar__link {
  color: text('primary'); // Token contraste 7:1
}
```

**Critères acceptation** :

```bash
# Relancer tests accessibilité
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts

# Résultat attendu
✓ Page d'accueil (/)                          PASS (0 violations)
✓ Page Login (/login)                         PASS (0 violations)
✓ Page Signup (/signup)                       PASS (0 violations)
✓ Page Forgot Password (/forgot-password)     PASS (0 violations)
✓ Page Tableau (/tableau)                     PASS (0 violations)
✓ Page Mentions Légales                       PASS (0 violations)
✓ Page CGU                                    PASS (0 violations)
✓ Page Politique Confidentialité              PASS (0 violations)
✓ Page Accessibilité                          PASS (0 violations)

# Total : 9 violations → 0 violations ✅
```

**Effort** : **1h** (consultation rapport + correction unique)

---

## 🔐 PHASE 1 - SÉCURITÉ DB-FIRST (P0 - BLOQUANT)

**Objectif** : Éliminer validation métier côté front (DB-first strict)

---

### 1.1 ✅ Transformer `useRBAC.canCreate()` en Lecture-Seule

**Priorité** : **P0** (BLOQUANT)
**Risque TSA** : FAIBLE (pas d'impact UX visible enfant)
**Blocage Contractuel** : §1.1 FRONTEND_CONTRACT "Toute validation métier doit être en DB (RLS), pas côté UI"

**Problème** :

- **Validation métier côté front** (calcul `usage < limit`)
- Révélation business logic (limites quotas exposées client)
- Bypassable (API directe, DevTools)

**Fichiers touchés** :

- `src/hooks/useRBAC.ts` (lignes 296-334)
- `src/components/shared/quota-indicator/QuotaIndicator.tsx` (si utilise `canCreate`)
- Tests : `src/hooks/useRBAC.test.tsx`

**Changements** :

**AVANT (src/hooks/useRBAC.ts lignes 296-334)** :

```typescript
const canCreate = useCallback(
  (contentType: ContentType): boolean => {
    if (!isFreeAccount) return true

    const key: keyof QuotaMap | null = /* ... */
    if (!key || !quotas[key]) return true

    // ⚠️ VIOLATION : Calcul quota côté front
    const quotaPeriod = quotas[key]!.period || 'total'
    const limit = quotas[key]!.limit

    let currentUsage: number
    if (quotaPeriod === 'monthly') {
      currentUsage = usage[monthlyKey] ?? 0
    } else {
      currentUsage = usage[key] ?? 0
    }

    return currentUsage < limit // ⚠️ Validation métier côté front
  },
  [isFreeAccount, quotas, usage]
)
```

**APRÈS (lecture-seule pour affichage UI)** :

```typescript
/**
 * ⚠️ LECTURE-SEULE - Pour affichage UI uniquement
 * La vraie validation est en DB/RLS (§1.1 FRONTEND_CONTRACT)
 *
 * @returns Informations quotas pour affichage (pas de validation)
 */
const getQuotaInfo = useCallback(
  (contentType: ContentType): {
    currentUsage: number
    limit: number
    isNearLimit: boolean // Pour affichage warning UI
  } => {
    if (!isFreeAccount) {
      return { currentUsage: 0, limit: Infinity, isNearLimit: false }
    }

    const key: keyof QuotaMap | null = /* ... */
    if (!key || !quotas[key]) {
      return { currentUsage: 0, limit: Infinity, isNearLimit: false }
    }

    const quotaPeriod = quotas[key]!.period || 'total'
    const limit = quotas[key]!.limit

    let currentUsage: number
    if (quotaPeriod === 'monthly') {
      currentUsage = usage[monthlyKey] ?? 0
    } else {
      currentUsage = usage[key] ?? 0
    }

    // ✅ Pas de validation, juste données pour affichage
    return {
      currentUsage,
      limit,
      isNearLimit: currentUsage >= limit * 0.8, // Warning UI à 80%
    }
  },
  [isFreeAccount, quotas, usage]
)
```

**Utilisation dans composants** :

```typescript
// AVANT (validation métier UI - INTERDIT)
const { canCreateTask } = useRBAC()

const handleCreate = async () => {
  if (!canCreateTask) {
    showToast('Limite atteinte', 'error')
    return // ❌ Validation côté UI
  }

  await createTask(data) // DB peut quand même refuser
}

// APRÈS (affichage uniquement, DB valide)
const { getQuotaInfo } = useRBAC()

const handleCreate = async () => {
  const { isNearLimit } = getQuotaInfo('task')

  // ⚠️ Warning UI si proche limite (UX proactive)
  if (isNearLimit) {
    showToast('Attention : proche limite Free', 'warning')
  }

  // ✅ Toujours tenter création → DB/RLS décide
  const { error } = await createTask(data)

  if (error) {
    // DB a refusé (quota dépassé, RLS, etc.)
    showToast('Limite Free atteinte. Passez Premium !', 'error')
    openUpgradeModal()
  } else {
    showToast('Tâche créée !', 'success')
  }
}
```

**Critères acceptation** :

```bash
# 1. Tests unitaires passent
pnpm test src/hooks/useRBAC.test.tsx
# → ✅ Tests getQuotaInfo (lecture-seule) passent
# → ✅ Aucun test validation métier (supprimés)

# 2. Tests E2E quotas
pnpm test:e2e tests/e2e/quotas.spec.ts
# → ✅ Free user crée 5 tâches → OK
# → ✅ Tentative créer 6e → DB/RLS refuse (toast "Limite atteinte")
# → ✅ UI n'a PAS bloqué avant tentative DB

# 3. Audit sécurité
grep -r "canCreate\|canEdit\|canDelete" src/hooks src/components
# → ✅ AUCUN usage validation métier côté UI
# → ✅ Seulement getQuotaInfo() pour affichage
```

**Effort** : **2-3h**

---

## ♿ PHASE 2 - ACCESSIBILITÉ WCAG (P1 - IMPORTANT)

**Objectif** : 100% conformité WCAG 2.2 AA (tests accessibilité passent)

---

### 2.1 ✅ Corriger Hiérarchie Headings (h1→h2→h3)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : MODÉRÉ (lisibilité enfants TSA + lecteurs d'écran)
**Blocage Contractuel** : §6.1 FRONTEND_CONTRACT "WCAG 2.2 AA obligatoire"

**Problème** :

- Test "Headings - Hiérarchie correcte (h1→h2→h3)" échoue
- Hiérarchie cassée quelque part (saut h1 → h3, ou h2 hors h1)

**Fichiers touchés** (à auditer) :

- `src/app/(public)/tableau/page.tsx`
- `src/app/(public)/login/page.tsx`
- `src/app/(protected)/edition/page.tsx`
- `src/app/(protected)/profil/page.tsx`
- `src/page-components/**/*.tsx`

**Changements** :

**Règles hiérarchie** :

```tsx
// ✅ CORRECT
<h1>Titre page</h1>
  <h2>Section 1</h2>
    <h3>Sous-section 1.1</h3>
    <h3>Sous-section 1.2</h3>
  <h2>Section 2</h2>

// ❌ INCORRECT - Saut de niveau
<h1>Titre page</h1>
  <h3>Section 1</h3> {/* ❌ Saute h2 */}

// ❌ INCORRECT - h2 avant h1
<h2>Section</h2> {/* ❌ Pas de h1 parent */}
  <h1>Titre</h1>
```

**Audit pages** :

```bash
# Script audit headings (à créer)
grep -rn "<h[1-6]" src/page-components src/app | sort
# → Analyser hiérarchie manuellement
```

**Exemple correction** :

```tsx
// AVANT (Tableau.tsx)
<div className="tableau">
  <h2>Tableau</h2> {/* ❌ Pas de h1 */}
  <div className="tableau__slots">
    <h3>Étapes</h3> {/* ❌ Saute h2 */}
  </div>
</div>

// APRÈS
<div className="tableau">
  <h1>Tableau</h1> {/* ✅ h1 principal */}
  <div className="tableau__slots">
    <h2>Étapes</h2> {/* ✅ h2 sous h1 */}
  </div>
</div>
```

**Critères acceptation** :

```bash
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts
# → ✅ Headings - Hiérarchie correcte (h1→h2→h3) PASS
```

**Effort** : **1-2h**

---

### 2.2 ✅ Ajouter Landmarks Sémantiques (`<header>`, `<main>`, `<nav>`)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : MODÉRÉ (navigation lecteurs d'écran)
**Blocage Contractuel** : §6.1 FRONTEND_CONTRACT "WCAG 2.2 AA obligatoire"

**Problème** :

- Test "Landmarks - header, main, nav correctement balisés" échoue
- Landmarks manquants ou mal balisés

**Fichiers touchés** :

- `src/app/layout.tsx` (layout racine)
- `src/components/layout/navbar/Navbar.tsx`
- `src/components/layout/footer/Footer.tsx`
- Toutes pages (`src/app/**/page.tsx`)

**Changements** :

**Règles landmarks** :

```tsx
// ✅ CORRECT - Layout global
<body>
  <header> {/* Navbar */}
    <nav aria-label="Navigation principale">...</nav>
  </header>

  <main> {/* Contenu principal */}
    {children}
  </main>

  <footer> {/* Footer */}
    <nav aria-label="Navigation légale">...</nav>
  </footer>
</body>

// ❌ INCORRECT - Divs génériques
<body>
  <div className="navbar">...</div> {/* ❌ Devrait être <header> */}
  <div className="content">...</div> {/* ❌ Devrait être <main> */}
  <div className="footer">...</div> {/* ❌ Devrait être <footer> */}
</body>
```

**Correction layout.tsx** :

```tsx
// AVANT
<body>
  <Navbar />
  <div className="main-content">
    {children}
  </div>
  <Footer />
</body>

// APRÈS
<body>
  <Navbar /> {/* Contient déjà <header><nav> */}

  <main id="main-content" className="main-content">
    {children}
  </main>

  <Footer /> {/* Contient déjà <footer> */}
</body>
```

**Correction Navbar.tsx** :

```tsx
// AVANT
<div className="navbar">
  <nav>...</nav>
</div>

// APRÈS
<header className="navbar">
  <nav aria-label="Navigation principale">
    ...
  </nav>
</header>
```

**Critères acceptation** :

```bash
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts
# → ✅ Landmarks - header, main, nav correctement balisés PASS

# Vérifier présence landmarks
grep -r "<header>" src/components/layout src/app
grep -r "<main" src/app
grep -r "<footer>" src/components/layout
# → ✅ Tous présents
```

**Effort** : **1h**

---

### 2.3 ✅ Ajouter `<label>` Manquants Formulaires

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : MODÉRÉ (accessibilité formulaires enfants)
**Blocage Contractuel** : §6.1 FRONTEND_CONTRACT "WCAG 2.2 AA obligatoire"

**Problème** :

- Test "Formulaires - Tous les champs ont des labels" échoue
- Certains `<input>` sans `<label>` associé

**Fichiers touchés** :

- `src/page-components/login/Login.tsx`
- `src/page-components/signup/Signup.tsx`
- `src/page-components/profil/Profil.tsx`
- `src/components/shared/forms/ItemForm.tsx`
- `src/components/ui/input/Input.tsx`

**Changements** :

**Règles labels** :

```tsx
// ✅ CORRECT - Label explicite
<label htmlFor="email">Email</label>
<input id="email" name="email" type="email" />

// ✅ CORRECT - Label wrapper
<label>
  Email
  <input name="email" type="email" />
</label>

// ✅ CORRECT - aria-label si label visuel impossible
<input
  name="search"
  type="search"
  aria-label="Rechercher une tâche"
/>

// ❌ INCORRECT - Input sans label
<input name="email" type="email" /> {/* ❌ Pas de label */}
```

**Exemple correction Login.tsx** :

```tsx
// AVANT
<div className="login__form">
  <input
    name="email"
    type="email"
    placeholder="Email"
  />
</div>

// APRÈS
<div className="login__form">
  <label htmlFor="login-email" className="sr-only">
    Email
  </label>
  <input
    id="login-email"
    name="email"
    type="email"
    placeholder="Email"
    aria-describedby="email-help"
  />
  <small id="email-help">Votre adresse email de connexion</small>
</div>
```

**CSS classe sr-only (screen reader only)** :

```scss
// src/styles/base/_accessibility.scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Critères acceptation** :

```bash
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts
# → ✅ Formulaires - Tous les champs ont des labels PASS

# Audit manuel tous formulaires
grep -r "<input" src --include="*.tsx" | grep -v "aria-label\|<label"
# → ✅ AUCUN input sans label/aria-label
```

**Effort** : **1-2h**

---

### 2.4 ✅ Ajouter `aria-describedby` Messages d'Aide

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : FAIBLE (amélioration guidage)
**Blocage Contractuel** : §6.1 FRONTEND_CONTRACT "WCAG 2.2 AA obligatoire"

**Problème** :

- Test "aria-describedby pour messages d'aide" échoue
- Inputs complexes sans description accessible

**Fichiers touchés** :

- `src/page-components/signup/Signup.tsx` (champs password)
- `src/components/ui/input/Input.tsx` (composant générique)
- `src/components/features/child-profile/ChildProfileSelector.tsx`

**Changements** :

**Pattern aria-describedby** :

```tsx
// Exemple Signup - Password avec règles
<div className="signup__field">
  <label htmlFor="signup-password">Mot de passe</label>
  <input
    id="signup-password"
    name="password"
    type="password"
    aria-describedby="password-rules"
    aria-invalid={passwordError ? 'true' : 'false'}
  />

  <small id="password-rules" className="help-text">
    Minimum 8 caractères, 1 majuscule, 1 chiffre
  </small>

  {passwordError && (
    <span id="password-error" role="alert" className="error-text">
      {passwordError}
    </span>
  )}
</div>
```

**Composant Input générique** :

```tsx
// Input.tsx
interface InputProps {
  id: string
  label: string
  name: string
  type: string
  helpText?: string // Texte d'aide
  error?: string // Message erreur
  required?: boolean
}

export default function Input({
  id,
  label,
  name,
  type,
  helpText,
  error,
  required,
  ...props
}: InputProps) {
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  return (
    <div className="input">
      <label htmlFor={id}>
        {label}
        {required && <span aria-label="requis">*</span>}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        aria-describedby={helpText ? helpId : undefined}
        aria-invalid={error ? 'true' : 'false'}
        aria-errormessage={error ? errorId : undefined}
        {...props}
      />

      {helpText && (
        <small id={helpId} className="input__help">
          {helpText}
        </small>
      )}

      {error && (
        <span id={errorId} role="alert" className="input__error">
          {error}
        </span>
      )}
    </div>
  )
}
```

**Critères acceptation** :

```bash
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts
# → ✅ aria-describedby pour messages d'aide PASS

# Vérifier inputs complexes ont aide
grep -r "aria-describedby" src/components src/page-components
# → ✅ Tous inputs avec règles/aide ont aria-describedby
```

**Effort** : **1h**

---

## 🔄 PHASE 3 - MIGRATION DB-FIRST (P1 - IMPORTANT)

**Objectif** : Supprimer système legacy (taches/recompenses), garder nouveau (timelines/slots/sessions)

---

### 3.1 ✅ Supprimer Pages Legacy

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : ÉLEVÉ (suppression page Edition utilisée actuellement)
**Blocage Contractuel** : §S10+ EXECUTION_PLAN "Migration complète vers DB-first"

**Problème** :

- Page **Edition.tsx** (legacy) coexiste avec **EditionTimeline.tsx** (nouveau)
- Confusion utilisateurs (2 pages édition)
- Legacy utilise hooks legacy (useTaches, useRecompenses)

**Fichiers touchés** :

- `src/page-components/edition/Edition.tsx` → **DELETE**
- `src/page-components/edition/Edition.scss` → **DELETE**
- `src/page-components/edition/Edition.test.tsx` → **DELETE**
- `src/app/(protected)/edition/page.tsx` → **MODIFIER** (pointer vers EditionTimeline)

**Changements** :

**AVANT (src/app/(protected)/edition/page.tsx)** :

```typescript
import Edition from '@/page-components/edition/Edition'

export default function EditionPage() {
  return <Edition />
}
```

**APRÈS** :

```typescript
import EditionTimeline from '@/page-components/edition-timeline/EditionTimeline'

export default function EditionPage() {
  return <EditionTimeline />
}
```

**Vérifier route** :

- URL `/edition` reste identique
- UI bascule automatiquement vers EditionTimeline (nouveau système)

**Critères acceptation** :

```bash
# Vérifier fichiers supprimés
ls src/page-components/edition/Edition.*
# → ✅ No such file or directory

# Vérifier route /edition fonctionne
pnpm dev
# → Naviguer http://localhost:3000/edition
# → ✅ EditionTimeline affiché (pas Edition legacy)

# Tests E2E route édition
pnpm test:e2e tests/e2e/edition-flows.spec.ts
# → ✅ Édition timeline fonctionne (slots, DnD, validation)
```

**Effort** : **30min**

---

### 3.2 ✅ Supprimer Hooks Legacy (7 hooks)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : ÉLEVÉ (si encore utilisés → casse fonctionnalités)
**Blocage Contractuel** : §S10+ EXECUTION_PLAN "Migration complète DB-first"

**Problème** :

- **7 hooks legacy** utilisent tables deprecated (taches, recompenses, categories)
- Nouveaux hooks DB-first existent déjà (useTimelines, useSlots, useSessions)

**Fichiers touchés (DELETE)** :

- `src/hooks/useTaches.ts`
- `src/hooks/useTaches.test.ts`
- `src/hooks/useTachesEdition.ts`
- `src/hooks/useTachesEdition.test.ts`
- `src/hooks/useTachesDnd.ts`
- `src/hooks/useTachesDnd.test.ts`
- `src/hooks/useRecompenses.ts`
- `src/hooks/useRecompenses.test.ts`
- `src/hooks/useRecompenses.msw.test.ts`
- `src/hooks/useCategories.ts`
- `src/hooks/useCategories.test.ts`
- `src/hooks/useCategories.msw.test.ts`
- `src/hooks/useCategoryValidation.ts`
- `src/hooks/useCategoryValidation.test.ts`

**Prérequis** : ⚠️ **Vérifier aucun import restant**

**Commande audit** :

```bash
# Rechercher imports hooks legacy
grep -r "useTaches\|useRecompenses\|useCategories\|useCategoryValidation" \
  src/components \
  src/page-components \
  src/app \
  --include="*.tsx" \
  --include="*.ts"

# → Résultat attendu : AUCUN import (sauf tests deprecated)
```

**Si imports trouvés** → Migrer vers hooks nouveaux :

```typescript
// AVANT (legacy)
import { useTaches } from '@/hooks'
const { taches } = useTaches()

// APRÈS (nouveau DB-first)
import { useSlots } from '@/hooks'
const { slots } = useSlots()
```

**Critères acceptation** :

```bash
# Vérifier fichiers supprimés
ls src/hooks/useTaches* src/hooks/useRecompenses* src/hooks/useCategories*
# → ✅ No such file or directory

# Vérifier aucun import legacy
grep -r "useTaches\|useRecompenses\|useCategories" src
# → ✅ AUCUN résultat

# Tests suite passe
pnpm test -- --run
# → ✅ Tous tests passent (tests legacy supprimés)
```

**Effort** : **1h**

---

### 3.3 ✅ Supprimer Composants Legacy (20 composants)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : ÉLEVÉ (si encore utilisés)
**Blocage Contractuel** : §S10+ EXECUTION_PLAN "Migration complète DB-first"

**Problème** :

- **20+ composants legacy** dépendent hooks deprecated
- Nouveaux composants existent (Tableau, EditionTimeline, SlotItem)

**Fichiers touchés (DELETE)** :

**Taches** (6 composants) :

- `src/components/features/taches/taches-dnd/`
- `src/components/features/taches/taches-edition/`
- `src/components/features/taches/train-progress-bar/`

**Recompenses** (3 composants) :

- `src/components/features/recompenses/recompenses-edition/`
- `src/components/features/recompenses/selected-recompense/`
- `src/components/features/recompenses/selected-reward-floating/`

**Shared legacy** (10+ composants) :

- `src/components/shared/modal/modal-ajout/`
- `src/components/shared/modal/modal-recompense/`
- `src/components/shared/modal/modal-category/`
- `src/components/shared/edition-list/`

**Prérequis** : ⚠️ **Vérifier aucun import restant**

**Commande audit** :

```bash
grep -r "TachesDnd\|TachesEdition\|RecompensesEdition\|ModalAjout\|ModalRecompense\|ModalCategory" \
  src \
  --include="*.tsx"

# → Résultat attendu : AUCUN import (sauf barrel exports à mettre à jour)
```

**Mise à jour barrel exports** (`src/components/index.ts`) :

```typescript
// SUPPRIMER exports legacy
// export { default as TachesDnd } from './features/taches/taches-dnd/TachesDnd'
// export { default as TachesEdition } from './features/taches/taches-edition/TachesEdition'
// ...

// GARDER exports nouveaux
export { default as SlotItem } from './features/timeline/slot-item/SlotItem'
export { default as SlotsEditor } from './features/timeline/slots-editor/SlotsEditor'
export { default as CardPicker } from './features/timeline/card-picker/CardPicker'
```

**Critères acceptation** :

```bash
# Vérifier dossiers supprimés
ls src/components/features/taches
ls src/components/features/recompenses
# → ✅ No such file or directory

# Vérifier imports barrel mis à jour
grep "TachesDnd\|TachesEdition\|RecompensesEdition" src/components/index.ts
# → ✅ AUCUN résultat

# Build passe
pnpm build
# → ✅ Build réussit (aucun import cassé)
```

**Effort** : **1h**

---

### 3.4 ✅ Migrer Composants Dépendants (5 composants MODIFY)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : MODÉRÉ (migration casse temporairement fonctionnalités)
**Blocage Contractuel** : §S10+ EXECUTION_PLAN "Migration complète DB-first"

**Problème** :

- **5 composants** utilisent encore hooks legacy ou logique legacy

**Fichiers touchés (MODIFY)** :

**1. QuotaIndicator.tsx** :

```typescript
// AVANT
import { useAccountStatus } from '@/hooks'

const { quotas } = useAccountStatus()
// quotas.tasks, quotas.rewards → Structure legacy

// APRÈS
import { useAccountStatus } from '@/hooks'

const { slotsUsage, bankCardsUsage } = useAccountStatus()
// slotsUsage.steps, bankCardsUsage.rewards → Nouvelle structure
```

**2. FeatureGate.tsx** :

```typescript
// AVANT
<FeatureGate feature="createTask">
  <CreateTaskButton />
</FeatureGate>

// APRÈS (inchangé, juste vérifier fonctionne avec nouveaux hooks)
// Normalement OK si useRBAC migré
```

**3-5. Autres composants** : Vérifier imports + adapter si nécessaire

**Critères acceptation** :

```bash
# Rechercher imports legacy dans composants partagés
grep -r "useTaches\|useRecompenses" src/components/shared
# → ✅ AUCUN résultat

# Tests composants passent
pnpm test src/components/shared
# → ✅ Tous tests passent

# UI fonctionne
pnpm dev
# → Tester QuotaIndicator, FeatureGate
# → ✅ Affichage correct quotas nouveaux
```

**Effort** : **2-3h**

---

### 3.5 ✅ Supprimer Tables Legacy DB (Migration finale)

**Priorité** : **P1** (IMPORTANT)
**Risque TSA** : **CRITIQUE** (⚠️ PERTE DONNÉES si données prod existantes)
**Blocage Contractuel** : §S10+ EXECUTION_PLAN "Migration complète DB-first"

**⚠️ ATTENTION** : Cette correction suppose **migration données déjà effectuée**

**Problème** :

- Tables legacy `taches`, `recompenses`, `categories` toujours présentes DB
- Doublonne avec nouvelles tables `slots`, `bank_cards`, `personal_cards`

**Fichiers touchés** :

- `supabase/migrations/` → Créer nouvelle migration

**Migration SQL** (`supabase/migrations/20260221000000_drop_legacy_tables.sql`) :

```sql
-- ⚠️ IMPORTANT : Vérifier migration données effectuée AVANT exécution
-- Tables legacy : taches, recompenses, categories, categories_taches, categories_recompenses

-- 1. Backup données (sécurité)
-- (À faire manuellement si données prod)

-- 2. Supprimer tables legacy
DROP TABLE IF EXISTS public.categories_taches CASCADE;
DROP TABLE IF EXISTS public.categories_recompenses CASCADE;
DROP TABLE IF EXISTS public.taches CASCADE;
DROP TABLE IF EXISTS public.recompenses CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- 3. Commentaire final
COMMENT ON SCHEMA public IS 'Migration DB-first terminée - Tables legacy supprimées';
```

**Procédure sécurisée** :

```bash
# 1. Backup complet DB AVANT suppression
pnpm db:dump > backup_before_drop_legacy_$(date +%Y%m%d).sql

# 2. (Production uniquement) Vérifier migration données
psql -d prod -c "SELECT COUNT(*) FROM taches;"
psql -d prod -c "SELECT COUNT(*) FROM slots WHERE kind = 'step';"
# → Vérifier counts équivalents (données migrées)

# 3. Créer migration
pnpm supabase migration new drop_legacy_tables

# 4. Appliquer migration (local d'abord)
pnpm supabase db reset # Reset local avec migration

# 5. Vérifier app fonctionne
pnpm dev
# → Tester EditionTimeline, Tableau
# → ✅ Aucune erreur "table does not exist"

# 6. (Production) Appliquer avec précaution
# pnpm supabase db push # Après validation complète locale
```

**Critères acceptation** :

```bash
# Vérifier tables supprimées
psql -d local -c "\dt" | grep "taches\|recompenses\|categories"
# → ✅ AUCUN résultat

# Vérifier types générés mis à jour
pnpm db:types
# → ✅ Types taches/recompenses supprimés de src/types/supabase.ts

# App fonctionne
pnpm dev
pnpm test:e2e
# → ✅ Aucune erreur table manquante
```

**Effort** : **2h** (+ temps coordination si prod)

---

## 🧹 PHASE 4 - NETTOYAGE LEGACY (P2 - AMÉLIORATION)

**Objectif** : Supprimer fichiers deprecated restants (clarté codebase)

---

### 4.1 ✅ Supprimer Tests Legacy (30 fichiers)

**Priorité** : **P2** (AMÉLIORATION)
**Risque TSA** : FAIBLE (tests seulement)
**Blocage Contractuel** : Aucun (nettoyage)

**Fichiers touchés (DELETE)** :

- Tous tests composants legacy supprimés Phase 3
- Tous tests hooks legacy supprimés Phase 3
- Tests MSW legacy (useCategories.msw.test.ts, useRecompenses.msw.test.ts, useTaches.msw.test.ts)

**Effort** : **30min**

---

### 4.2 à 4.7 ✅ Supprimer Fichiers Utils/Assets Legacy

**Détails** : Voir AUDIT_KEEP_MODIFY_DELETE.md section "DELETE"

**Fichiers DELETE** (~10 fichiers) :

- `src/hooks/useAccountStatus.legacy.ts`
- `src/utils/legacy/*`
- `src/assets/deprecated/*`

**Effort** : **1h**

---

## 🚀 PHASE 5 - OPTIMISATIONS (P3 - NICE-TO-HAVE)

### 5.1 ✅ Update Package `baseline-browser-mapping`

**Priorité** : **P3** (NICE-TO-HAVE)
**Risque TSA** : FAIBLE (warning build uniquement)
**Blocage Contractuel** : Aucun

**Commande** :

```bash
npm i baseline-browser-mapping@latest -D
pnpm build # Vérifier warning disparu
```

**Effort** : **5min**

---

### 5.2 ✅ Optimiser Config Playwright (Workers CI)

**Priorité** : **P3** (NICE-TO-HAVE)
**Risque TSA** : FAIBLE (performance tests CI)
**Blocage Contractuel** : Aucun

**Fichier** : `playwright.config.ts`

**Changement** :

```typescript
// AVANT
workers: process.env.CI ? 4 : 1, // 1 worker local = lent

// APRÈS
workers: process.env.CI ? 4 : 2, // 2 workers local = 2× plus rapide
```

**Effort** : **5min**

---

## 📝 PHASE 6 - DOCUMENTATION (P3 - AMÉLIORATION)

### 6.1 ✅ Documenter Setup E2E dans README

**Intégré dans Phase 0.2**

---

### 6.2 ✅ Créer Guide Migration DB-First

**Fichier** : `docs/MIGRATION_DB_FIRST_COMPLETE.md`

**Contenu** :

- Comparaison ancien vs nouveau système
- Guide migration données (si nécessaire)
- Mapping tables (taches → slots, recompenses → bank_cards)
- Breaking changes API

**Effort** : **2h**

---

## 🎯 ORDRE EXÉCUTION RECOMMANDÉ

**Sprint 1 (Jour 1-2) - Tests + Sécurité** :

1. Phase 0.1 - Mocks Supabase (1-2h)
2. Phase 0.2 - Setup E2E (2-3h)
3. Phase 0.3 - Violation WCAG (1h)
4. Phase 1.1 - useRBAC lecture-seule (2-3h)

**Sprint 2 (Jour 3-4) - Accessibilité** : 5. Phase 2.1 - Headings (1-2h) 6. Phase 2.2 - Landmarks (1h) 7. Phase 2.3 - Labels formulaires (1-2h) 8. Phase 2.4 - aria-describedby (1h)

**Sprint 3 (Jour 5-6) - Migration DB-First** : 9. Phase 3.1 - Supprimer pages legacy (30min) 10. Phase 3.2 - Supprimer hooks legacy (1h) 11. Phase 3.3 - Supprimer composants legacy (1h) 12. Phase 3.4 - Migrer composants dépendants (2-3h) 13. Phase 3.5 - Supprimer tables DB (2h + coordination)

**Sprint 4 (Jour 7-8) - Nettoyage + Optimisations** : 14. Phase 4 - Nettoyage legacy (1-2h) 15. Phase 5 - Optimisations (10min) 16. Phase 6 - Documentation (2h)

---

## ✅ CRITÈRES ACCEPTATION GLOBAUX

**À la fin du plan complet** :

### Tests 100% Passent

```bash
pnpm build          # → ✅ Build réussit (0 erreurs)
pnpm check          # → ✅ Lint + format (0 erreurs)
pnpm test -- --run  # → ✅ 308/308 tests unitaires passent
pnpm test:e2e       # → ✅ 400+/420 tests E2E passent (>95%)
```

### Accessibilité WCAG 2.2 AA

```bash
pnpm test:e2e tests/accessibility/wcag-audit.spec.ts
# → ✅ 27/27 tests accessibilité passent
# → ✅ 0 violations WCAG 2.2 AA (Serious/Critical)
```

### Sécurité DB-First

```bash
grep -r "canCreate\|canEdit\|canDelete" src/hooks src/components
# → ✅ AUCUNE validation métier côté UI (seulement getQuotaInfo lecture-seule)

grep -r "service_role\|SERVICE_ROLE" src
# → ✅ AUCUN secret côté client
```

### Migration DB-First Complète

```bash
ls src/hooks/useTaches* src/components/features/taches
# → ✅ No such file or directory (legacy supprimé)

psql -d local -c "\dt" | grep "taches\|recompenses"
# → ✅ AUCUN résultat (tables legacy supprimées)
```

### Codebase Propre

```bash
find src -name "*.legacy.*" -o -name "*deprecated*"
# → ✅ AUCUN fichier legacy restant

pnpm build
# → ✅ 0 warnings (baseline-browser-mapping updated)
```

---

## 📊 MÉTRIQUES SUCCÈS

| Métrique                | Avant           | Après (Cible)         |
| ----------------------- | --------------- | --------------------- |
| Tests unitaires passent | 212/308 (68.8%) | **308/308 (100%)** ✅ |
| Tests E2E accessibilité | 20/27 (74%)     | **27/27 (100%)** ✅   |
| Tests E2E métier        | 0/11 (0%)       | **11/11 (100%)** ✅   |
| Violations WCAG Serious | 9               | **0** ✅              |
| Violations DB-first     | 1 (useRBAC)     | **0** ✅              |
| Fichiers legacy         | ~70             | **0** ✅              |
| Tables DB legacy        | 5               | **0** ✅              |
| Warnings build          | 1               | **0** ✅              |

---

## 🔗 RÉFÉRENCES

**Audits sources** :

- `AUDIT_KEEP_MODIFY_DELETE.md` - Cartographie fichiers
- `AUDIT_SECURITE_DB_FIRST.md` - Violations sécurité
- `AUDIT_TABLEAU_NEUTRE_TSA.md` - Conformité TSA (100% ✅)
- `AUDIT_DESIGN_TOKENS.md` - Conformité tokens (100% ✅)
- `AUDIT_TESTS_PILE_COMPLETE.md` - Résultats tests

**Contrats** :

- `FRONTEND_CONTRACT.md` v3.0 - Règles DB-first + UX TSA
- `EXECUTION_PLAN.md` v1.0 - Slices migration S0-S12

**Documentation** :

- `README.md` - Setup projet + commandes
- `CLAUDE.md` - Guide développement global

---

**Fin du Plan de Correction Minimal Ordonné**
