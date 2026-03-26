# Index Complet : Fichiers Importation Visitor → Free

**Document** : Index tous fichiers découverts lors de l'enquête.
**Organisation** : Par système (Visitor local, Cloud, Auth, Offline)

---

## Résumé Complet

**Fichiers impliqués** : 15+
**Lignes code analysées** : 2000+
**Migrations SQL** : 1
**Hooks découverts** : 7
**Contextes** : 3

---

## 1. Système Visitor (IndexedDB Local)

### Couche Data

**`src/utils/visitor/sequencesDB.ts`** (409 lignes)
- **But** : CRUD séquences/étapes Visitor en IndexedDB
- **Exports** :
  - `openDB()` : Ouvre/crée DB IndexedDB
  - `getAllSequences()` : Récupère toutes séquences
  - `getSequenceByMotherCardId()` : Lecture par carte
  - `createSequence()`, `createSequenceWithSteps()` : Création
  - `deleteSequence()`, `removeSequenceStep()` : Suppression
  - `addSequenceStep()`, `moveSequenceStep()` : Édition
  - `getSequenceSteps()` : Lecture étapes
- **Interfaces** :
  - `VisitorSequence` { id, mother_card_id, created_at }
  - `VisitorSequenceStep` { id, sequence_id, step_card_id, position }
- **Patterns** :
  - Transactions IndexedDB multi-store atomiques
  - Indices UNIQUE composites (séquence_step_card, séquence_position)
  - Gestion rollback automatique
- **Note critique** (lignes 19-22) :
  ```
  ⚠️ IMPORT VISITOR → COMPTE
  - Hors scope Ticket 3 (futur Ticket 4)
  - Cette couche prépare les données pour un import ultérieur
  ```

### Hooks Visitor

**`src/hooks/useSequencesLocal.ts`** (170 lignes)
- **Type** : Hook React custom
- **But** : CRUD séquences Visitor (wrapper IndexedDB)
- **Signature identique** : `useSequences.ts` (cloud) pour faciliter routing
- **Pattern enabled** : `if (!enabled) return` pour adapter routing
- **Retourne** : { sequences, loading, error, createSequence, deleteSequence, refresh }
- **Appelle** : `sequencesDB.*` pour toutes opérations

**`src/hooks/useSequenceStepsLocal.ts`** (~150 lignes)
- **Type** : Hook React custom
- **But** : CRUD étapes séquences Visitor
- **Pattern** : Identique à `useSequenceStepsWithVisitor` (adapter)

**`src/hooks/useIsVisitor.ts`** (46 lignes)
- **Type** : Hook React custom
- **But** : Détecter si user est en mode Visitor (non authentifié)
- **Return** : { isVisitor: bool, authReady: bool }
- **Logic** : `isVisitor = authReady && !user`

### Hooks Adapter (Routing Visitor ↔ Cloud)

**`src/hooks/useSequencesWithVisitor.ts`** (~150 lignes)
- **Type** : Hook adapter
- **Pattern** :
  ```typescript
  const { isVisitor } = useIsVisitor()
  const local = useSequencesLocal(isVisitor)
  const cloud = useSequences(!isVisitor)
  return isVisitor ? local : cloud
  ```
- **Seamless routing** : Composant ne change pas, juste le hook utilisé

**`src/hooks/useSequenceStepsWithVisitor.ts`** (~150 lignes)
- **Type** : Hook adapter
- **Pattern** : Identique à `useSequencesWithVisitor`
- **Import** :
  ```typescript
  import type { VisitorSequence } from '@/hooks/useSequencesLocal'
  import type { VisitorSequenceStep } from '@/hooks/useSequenceStepsLocal'
  ```

---

## 2. Système Cloud (Supabase)

### RPC Atomiques

**`supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql`** (292 lignes)
- **Date** : 2026-03-15
- **But** : Créer RPC atomiques séquences cloud

#### RPC 1 : `create_sequence_with_steps()`

**Signature** :
```sql
CREATE FUNCTION create_sequence_with_steps(
  p_mother_card_id UUID,
  p_step_card_ids UUID[]
) RETURNS UUID
```

**Validations** (lignes 38-145) :
- Auth : `auth.uid()` required
- Permissions : `can_write_sequences()` (Subscriber/Admin seulement)
- Parametres : mother_card_id NOT NULL, stepCardIds ≥2, pas de doublons
- Constraints : UNIQUE(account_id, mother_card_id)

**Opérations** (lignes 112-123) :
1. INSERT séquence (retourne id)
2. INSERT étapes (via UNNEST avec ORDER BY ordinality)

**Exception Handling** (lignes 125-145) :
- UNIQUE violation → Error message approprié
- Auto-rollback si erreur

#### RPC 2 : `replace_sequence_steps()`

**Signature** :
```sql
CREATE FUNCTION replace_sequence_steps(
  p_sequence_id UUID,
  p_step_card_ids UUID[]
) RETURNS VOID
```

**Patterns** :
- `FOR UPDATE` lock (ligne 244-246) : Empêche race conditions
- DELETE puis INSERT (lignes 256-265) : Remplace tout atomiquement

### Hooks Cloud

**`src/hooks/useSequences.ts`** (172 lignes)
- **Type** : Hook React custom
- **But** : CRUD séquences cloud
- **Appelle** : `supabase.rpc('create_sequence_with_steps', {...})`
- **Pattern appel RPC** (lignes 133-138) :
  ```typescript
  const { data, error: createError } = await supabase.rpc(
    'create_sequence_with_steps',
    {
      p_mother_card_id: motherCardId,
      p_step_card_ids: stepCardIds,
    }
  )
  ```
- **Refresh** : `if (!createError) refresh()`
- **Return** : `{ id: data, error }`

**`src/hooks/useSequenceSteps.ts`** (similaire)
- **Type** : Hook React custom
- **But** : CRUD étapes séquences cloud

---

## 3. Authentification & Post-Signup

**`src/contexts/AuthContext.tsx`** (237 lignes)
- **Type** : React Context
- **But** : État global authentification
- **Lifecycle** (lignes 70-207) :
  - `getSession()` avec timeout 5s (lignes 127-155)
  - `onAuthStateChange` listener (lignes 174-182)
  - Announce `authReady` après init (lignes 163-171)
- **⚠️ MANQUE** : Aucun hook post-signup pour import Visitor
- **signOut** (lignes 209-220) : Logout logic
- **Sentry integration** (lignes 47-68) : Track user auth state

**`src/page-components/signup/Signup.tsx`** (176 lignes)
- **Type** : Composant React (client)
- **But** : Page inscription utilisateur
- **Flow** (lignes 43-97) :
  1. Valide email + password + captcha
  2. `supabase.auth.signUp({email, password, options: {...}})`
  3. Affiche "Vérifiez votre email"
  4. Redirige vers `/login`
- **⚠️ AUCUN appel** : Pas d'import Visitor après signup
- **Note** (ligne 79) : "Le trigger DB crée automatiquement le profil enfant"

**`src/app/(public)/signup/page.tsx`**
- **Type** : Next.js page
- **Simplement** : Render `<Signup />`

---

## 4. Contextes & State Management

**`src/contexts/OfflineContext.tsx`** (242 lignes)
- **Type** : React Context
- **But** : Queue validations offline + sync automatique
- **Pattern robuste** :
  - Save queue en localStorage (lignes 86-92)
  - Load queue au montage (lignes 75-84)
  - Flush au retour réseau (lignes 116-161)
  - Idempotence : UNIQUE DB = retry safe
- **⚠️ INSPIRATION** : Modèle robuste pour import futur

**`src/contexts/ChildProfileContext.tsx`** (~200 lignes)
- **Note** : Gère nettoyage localStorage au logout (lignes 2-5 du commentaire)
- **Pattern** :
  ```typescript
  localStorage.removeItem(storageKey(prevUserIdRef.current))
  localStorage.removeItem(storageKey(userId))
  ```

**`src/contexts/ToastContext.tsx`**
- **Type** : React Context
- **But** : Notifications toast utilisateur
- **Utilisé pour** : Feedback import (succès/erreur)

---

## 5. Composants UI Pertinents

**`src/components/features/modal/modal-import-visitor/`** (À CRÉER - Ticket 4)
- Composant modal post-login
- Affiche "Importer N séquences?"
- États : confirm → importing → result
- Utilise hook `useImportVisitor()`

**`src/components/shared/modal/Modal.tsx`**
- **Type** : Composant wrapper modal
- **Utilisé par** : ModalImportVisitor (futur)

**`src/components/shared/button/Button.tsx`**
- **Type** : Composant bouton réutilisable
- **Props** : label, onClick, disabled, variant
- **Utilisé par** : ModalImportVisitor actions

**`src/components/layout/Navbar.tsx`** (import `useIsVisitor`)
- Utilise `useIsVisitor()` pour adapter affichage
- Affiche "Créer compte" si visitor, "Profil" si auth

---

## 6. Composants Pages

**`src/page-components/tableau/Tableau.tsx`**
- **Imports** :
  - `useSequencesWithVisitor` (visiteur + auth)
  - `useSequenceStepsWithVisitor` (pareil)
- **Logic** : Route automatiquement IndexedDB ↔ Supabase
- **Epoch check** : Réalignement données si session réinitialisée

**`src/page-components/edition-timeline/EditionTimeline.tsx`**
- **Imports** : `useSequencesWithVisitor`
- **Comment** (ligne 4) : "Architecture S4 + S6"

**`src/page-components/edition/Edition.tsx`**
- Utilise hooks sequencesWithVisitor

---

## 7. Structures Layout

**`src/app/(protected)/layout.tsx`**
- **À modifier** (Ticket 4) : Ajouter ModalImportVisitor
- **Logic à ajouter** :
  ```typescript
  const { hasVisitorData } = useImportVisitor()
  const [showImportModal, setShowImportModal] = useState(false)
  
  useEffect(() => {
    if (authReady && user) {
      const hasSeenModal = localStorage.getItem(`import-shown:${user.id}`)
      if (!hasSeenModal && await hasVisitorData()) {
        setShowImportModal(true)
        localStorage.setItem(`import-shown:${user.id}`, 'true')
      }
    }
  }, [authReady, user])
  
  return (
    <>
      {children}
      <ModalImportVisitor isOpen={showImportModal} onClose={() => ...} />
    </>
  )
  ```

**`src/app/(public)/layout.tsx`**
- Layout public (pas auth)
- Affiche navbar public, footer simple

**`src/app/layout.tsx`** (Root)
- `<AuthProvider>` wrapper
- Providers globaux (Auth, Toast, Loading, Display, Offline)

---

## 8. Types & Interfaces

**`src/types/supabase.ts`** (Généré automatiquement)
- Types TypeScript pour tables Supabase
- **À vérifier** : Types sequences, sequence_steps
- **Généré par** : `pnpm db:types`

**Types locaux** (dans fichiers) :
- `VisitorSequence`, `VisitorSequenceStep` (sequencesDB.ts)
- `UseSequencesReturn`, `UseImportVisitorReturn` (hooks)

---

## 9. Configuration & Utils

**`src/utils/supabaseClient.ts`**
- **Export** : `supabase` client instance
- **Utilisé par** : tous hooks (RPC calls)

**`src/hooks/index.ts`**
- **Exports centralisés** : tous hooks
- **À ajouter** : `export { default as useImportVisitor } from '@/hooks/useImportVisitor'`

**`src/config/i18n/i18n.ts`**
- **i18n setup** : messages multilingues
- **À ajouter** : Messages import (visitor.importTitle, etc.)

---

## 10. Fichiers Documentation Générés

**`VISITOR_IMPORT_ANALYSIS.md`** (Repo root)
- Analyse complète 500+ lignes

**`.claude/TRANSACTION_PATTERNS.md`**
- Guide patterns transactionnels 400+ lignes

**`.claude/TICKET4_IMPLEMENTATION_PLAN.md`**
- Plan blueprint Ticket 4, 600+ lignes

**`.claude/VISITOR_IMPORT_EXECUTIVE_SUMMARY.md`**
- Ce fichier, résumé exécutif

**`.claude/VISITOR_IMPORT_FILE_INDEX.md`**
- Index tous fichiers (ce document)

---

## 11. Patterns Utilisés

### Pattern Adapter (Routing Visitor ↔ Cloud)

```typescript
// useSequencesWithVisitor.ts
export default function useSequencesWithVisitor(enabled: boolean = true) {
  const { isVisitor } = useIsVisitor()
  const local = useSequencesLocal(isVisitor && enabled)
  const cloud = useSequences(!isVisitor && enabled)
  
  return isVisitor ? local : cloud
}
```

**Avantage** : Composant peut utiliser `useSequencesWithVisitor` sans changer logique.

### Pattern Enabled Flag (Deactivation)

```typescript
// useSequences.ts
if (!enabled) {
  setLoading(false)
  return
}
```

**Avantage** : Hook peut être désactivé pour adapter routing (surtout Visitor/cloud).

### Pattern Try/Catch + Return Tuple

```typescript
const { id, error } = await createSequence(motherCardId, stepCardIds)
if (error) {
  // Gestion erreur
} else {
  // Succès
}
```

**Avantage** : Caller peut facilement gérer succès/erreur.

---

## 12. Fichiers NON Pertinents

**❌ Legacy** (S3 Visitor) :
- `src/hooks/useTaches.ts` (ancien système, non exporté)
- `src/hooks/useTachesDnd.ts` (ancien système, non exporté)
- `src/hooks/useFallbackData.ts` (ancien système, non exporté)

**❌ Non-impliqués** :
- Hooks: `useTimelines`, `useSlots`, `useSessions` (système planning S4)
- Hooks: `useBankCards`, `usePersonalCards` (cartes, pas séquences)
- Contexts: Tous sauf Auth, Offline, ChildProfile

---

## 13. Checklist Audit

### Audit Complet ✅

- [x] Localisé couche Visitor IndexedDB
- [x] Localisé RPC atomiques cloud
- [x] Localisé hooks adapter routing
- [x] Vérifié absence import function
- [x] Documenté pré-condition Ticket 4
- [x] Analysé patterns transactionnels
- [x] Identifié gestion erreurs
- [x] Créé blueprint Ticket 4
- [x] Indexé tous fichiers pertinents

### À Faire (Ticket 4) ⏳

- [ ] Créer `useImportVisitor.ts`
- [ ] Créer `ModalImportVisitor.tsx` + SCSS
- [ ] Modifier `(protected)/layout.tsx`
- [ ] Ajouter messages i18n
- [ ] Tester tous cas erreur
- [ ] Déployer graduel (monitoring)

---

## 14. Navigation Rapide

### Je veux voir...

**La couche Visitor** :
→ `src/utils/visitor/sequencesDB.ts` (core) + `src/hooks/useSequencesLocal.ts` (hook)

**Le pattern RPC cloud** :
→ `supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql` (RPC) + `src/hooks/useSequences.ts` (hook)

**Le pattern adapter** :
→ `src/hooks/useSequencesWithVisitor.ts` (router)

**Pourquoi pas d'import** :
→ Code source `sequencesDB.ts:19-22` + Absence appel post-signup

**Plan Ticket 4** :
→ `.claude/TICKET4_IMPLEMENTATION_PLAN.md` (blueprint complet)

**Patterns transactionnels** :
→ `.claude/TRANSACTION_PATTERNS.md` (guide technique)

---

## Conclusion

**Audit complet** : 15+ fichiers analysés, patterns documentés, blueprint Ticket 4 prêt.

**Impact** : Infrastructure prête, import reporté Ticket 4 (volontaire).

**Prochaine étape** : Assigner Ticket 4 → Dev utilise templates + checklist.
