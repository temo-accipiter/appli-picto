# Analyse : Importation Visitor → Free dans Appli-Picto

**Date** : 2026-03-25
**Enquête** : Logique d'importation données Visitor → compte Free après signup
**Statut** : **FONCTION D'IMPORTATION N'EXISTE PAS — Déferred à Ticket 4 (S4)**

---

## Résumé Exécutif

**Verdict** : Aucune fonction d'importation des données Visitor (IndexedDB local) vers le compte Free (Supabase cloud) n'existe actuellement. C'est volontaire et documenté comme **"futur Ticket 4"**.

### Architecture Actuelle

- **Visitor (non authentifié)** → Données **stockées localement en IndexedDB** (`appli-picto-visitor`)
- **Free/Subscriber (authentifié)** → Données **stockées en Supabase cloud**
- **Transition Visitor → Free** → **PAS DE MIGRATION AUTOMATIQUE**

### État du Code

- ✅ Couche Visitor locale (`sequencesDB.ts`) : Fonctionnelle et documentée
- ✅ Transactions atomiques cloud (`create_sequence_with_steps`) : Robustes
- ❌ Fonction d'import données Visitor : **Inexistante**
- ✅ Prépare le terrain pour import futur : Données locals bien structurées

---

## Fichiers Pertinents Trouvés

### 1. Couche Visitor IndexedDB

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/utils/visitor/sequencesDB.ts`
**Type** : Utilitaire (IndexedDB client)
**But** : Gestion complète CRUD séquences/étapes Visitor en mode local-only

#### Code Clé

**Structure IndexedDB** (lignes 24-26) :

```typescript
const DB_NAME = 'appli-picto-visitor'
const DB_VERSION = 1
const STORE_SEQUENCES = 'sequences'
const STORE_STEPS = 'sequence_steps'
```

**Interfaces persistées** (lignes 30-42) :

```typescript
export interface VisitorSequence {
  id: string // UUID généré localement
  mother_card_id: string // FK vers carte
  created_at: number // timestamp
}

export interface VisitorSequenceStep {
  id: string // UUID généré localement
  sequence_id: string // FK locale
  step_card_id: string // FK vers carte
  position: number // 0, 1, 2...
}
```

**Transactions IndexedDB** (lignes 200-211) :

```typescript
// Transaction MULTI-STORE atomique (local IndexedDB)
const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')
const seqStore = tx.objectStore(STORE_SEQUENCES)
const stepsStore = tx.objectStore(STORE_STEPS)

seqStore.add(sequence)
steps.forEach(step => stepsStore.add(step))

tx.oncomplete = () => resolve(sequence)
tx.onerror = () => reject(tx.error)
```

#### Règles Locales (Enforcement)

**Contraintes appliquées localement** (lignes 167-180) :

- Minimum 2 étapes par séquence ✅
- Pas de doublons `step_card_id` dans une séquence ✅
- Position unique par séquence ✅
- Une seule séquence par `mother_card_id` ✅
- Gestion cascade DELETE (séquence → étapes) ✅

#### Note de Documentation Critique

**Ligne 19-22** :

```typescript
// ⚠️ IMPORT VISITOR → COMPTE
// - Hors scope Ticket 3 (futur Ticket 4)
// - Cette couche prépare les données pour un import ultérieur
```

---

### 2. Transactions Atomiques Cloud (RPC PostgreSQL)

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/supabase/migrations/20260315113000_phase7_10_atomic_sequence_rpc.sql`
**Type** : Migration SQL (RPC PostgreSQL)
**But** : Créer séquences + étapes atomiquement en cloud avec validations

#### RPC : create_sequence_with_steps()

**Signature** (lignes 29-36) :

```sql
CREATE OR REPLACE FUNCTION public.create_sequence_with_steps(
  p_mother_card_id UUID,
  p_step_card_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
```

**Contraintes validées** (lignes 38-145) :

1. **Authentification** (lignes 46-53) :

   ```sql
   v_account_id := auth.uid();
   IF v_account_id IS NULL THEN
     RAISE EXCEPTION 'Authentication required: create_sequence_with_steps'
   ```

2. **Validation paramètres** (lignes 55-110) :
   - `mother_card_id` non NULL
   - `step_card_ids` non NULL, aucun NULL interne
   - Minimum 2 étapes
   - Pas de doublons dans la liste

3. **Autorisation** (lignes 62-74) :
   - `can_write_sequences()` → **Subscriber/Admin uniquement** ⚠️
   - `is_execution_only()` → Bloque si mode exécution seul

4. **Transaction atomique** (lignes 112-123) :

   ```sql
   INSERT INTO public.sequences (account_id, mother_card_id)
   VALUES (v_account_id, p_mother_card_id)
   RETURNING id INTO v_sequence_id;

   INSERT INTO public.sequence_steps (sequence_id, step_card_id, position)
   SELECT v_sequence_id, input.step_card_id, input.ordinality - 1
   FROM unnest(p_step_card_ids) WITH ORDINALITY AS input(...)
   ```

5. **Gestion erreurs** (lignes 125-145) :
   ```sql
   EXCEPTION
     WHEN unique_violation THEN
       GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
       IF v_constraint_name = 'unique_sequence_per_account_mother' THEN
         RAISE EXCEPTION 'Sequence already exists for mother_card_id %'
   ```

#### Mécanismes de Robustesse

- ✅ **SECURITY INVOKER** : Pas d'escalade de privilèges
- ✅ **Contrainte UNIQUE(account_id, mother_card_id)** : Une séquence par carte
- ✅ **Trigger `sequences_enforce_min_two_steps`** : Min 2 étapes à la DB
- ✅ **RLS policies** : Ownership vérifié à l'insertion
- ✅ **Rollback automatique** : Tout ou rien (atomicité PostgreSQL)

---

### 3. Hook Cloud (Appel RPC)

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useSequences.ts`
**Type** : Hook React custom
**But** : CRUD séquences pour utilisateurs authentifiés (cloud Supabase)

#### Code Clé

**Appel RPC atomique** (lignes 128-148) :

```typescript
const createSequence = useCallback(
  async (
    motherCardId: string,
    stepCardIds: string[]
  ): Promise<ActionResult & { id: string | null }> => {
    const { data, error: createError } = await supabase.rpc(
      'create_sequence_with_steps',
      {
        p_mother_card_id: motherCardId,
        p_step_card_ids: stepCardIds,
      }
    )

    if (!createError) refresh()
    return {
      id: data ?? null,
      error: createError as Error | null,
    }
  },
  [refresh]
)
```

**Pattern d'erreur** :

- ✅ Capture erreurs RPC
- ✅ Refresh données si succès
- ✅ Retourne `{ id, error }` tuple pour caller

---

### 4. Hook Visitor Local (IndexedDB)

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useSequencesLocal.ts`
**Type** : Hook React custom
**But** : CRUD séquences Visitor mode local-only (IndexedDB)

#### Code Clé

**Signature identique au hook cloud** (lignes 70-72) :

```typescript
export default function useSequencesLocal(
  enabled: boolean = true
): UseSequencesLocalReturn
```

**API unifiée** :

```typescript
interface UseSequencesLocalReturn {
  sequences: VisitorSequence[]
  loading: boolean
  error: Error | null
  createSequence: (
    motherCardId: string,
    stepCardIds: string[]
  ) => Promise<ActionResult & { id: string | null }>
  deleteSequence: (sequenceId: string) => Promise<ActionResult>
  refresh: () => void
}
```

**Pattern enabled** (lignes 80-84) :

```typescript
if (!enabled) {
  setLoading(false)
  return // Skip si enabled = false (adapter routing)
}
```

#### Transactions IndexedDB

**Appel direct à sequencesDB** (lignes 118-139) :

```typescript
const createSequence = useCallback(
  async (
    motherCardId: string,
    stepCardIds: string[]
  ): Promise<ActionResult & { id: string | null }> => {
    try {
      const newSequence = await sequencesDB.createSequenceWithSteps(
        motherCardId,
        stepCardIds
      )
      refresh()
      return { id: newSequence.id, error: null }
    } catch (err) {
      return { id: null, error: err as Error }
    }
  },
  [refresh]
)
```

---

### 5. Détection Visitor vs Authentifié

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/hooks/useIsVisitor.ts`
**Type** : Hook React custom
**But** : Détecter si utilisateur est en mode Visitor (non connecté)

#### Code Clé

```typescript
export default function useIsVisitor(): UseIsVisitorReturn {
  const { user, authReady } = useAuth()

  return {
    isVisitor: authReady && !user,
    authReady,
  }
}
```

**Pattern de routing** :

```typescript
const { isVisitor, authReady } = useIsVisitor()

if (!authReady) return <Loader />
if (isVisitor) {
  return <useSequencesLocal enabled={true} />  // IndexedDB local
}
return <useSequences enabled={true} />  // Supabase cloud
```

---

### 6. Contexte d'Authentification

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/contexts/AuthContext.tsx`
**Type** : React Context
**But** : État global authentication + signOut

#### Points Pertinents pour Import

**Lifecycle auth** (lignes 70-207) :

1. **Init** : Appel `getSession()` avec timeout 5s
2. **Auth state change** : Écoute `onAuthStateChange` (login/logout/refresh)
3. **Announce authReady** : Toujours après init (succès ou échec)
4. **Cleanup** : Unsubscribe listeners

**Note** : Aucun hook de post-signup pour importation Visitor

---

### 7. Page Signup

**Chemin** : `/Users/accipiter_tell/projets/new_sup/appli-picto/src/page-components/signup/Signup.tsx`
**Type** : Composant React (Client)
**But** : Formulaire d'inscription utilisateur

#### Code Clé

**Appel signup** (lignes 72-81) :

```typescript
const { error: signUpError } = await supabase.auth.signUp({
  email: emailNorm,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    captchaToken,
    // Note : Le nouveau schéma DB n'utilise pas user_metadata.pseudo
    // Le trigger DB crée automatiquement le profil enfant "Mon enfant"
  },
})
```

**Post-signup** :

- ✅ Affiche message "Vérifiez votre email"
- ✅ Redirige vers `/login`
- ❌ **AUCUN appel d'importation données Visitor**

**Observation critique** : Le signup ne déclenche aucun processus d'importation

---

## Workflow Complet : Visitor → Authentifié (Actuel)

```
┌─────────────────────────────────────┐
│ VISITOR (Non authentifié)           │
│                                     │
│ • Données : IndexedDB local         │
│ • DB_NAME: appli-picto-visitor      │
│ • useSequencesLocal() actif         │
│ • useSequences() inactif (enabled=false)
└────────────────┬────────────────────┘
                 │
                 │ 1. Utilisateur clique "Créer compte"
                 │
┌────────────────▼────────────────────┐
│ SIGNUP (Formulaire inscription)      │
│                                     │
│ • Email + Password + Captcha        │
│ • supabase.auth.signUp({...})       │
│ • Redirection vers /login           │
│ • ❌ PAS d'importation locale       │
└────────────────┬────────────────────┘
                 │
                 │ 2. Email confirmation
                 │ 3. Login utilisateur
                 │
┌────────────────▼────────────────────┐
│ FREE (Authentifié)                  │
│                                     │
│ • Données : Supabase cloud          │
│ • useSequencesLocal() inactif       │
│ • useSequences() actif              │
│ • ❌ DONNÉES VISITOR PERDUES        │
│    (restent en IndexedDB non lié)   │
└─────────────────────────────────────┘
```

---

## Analyse : Absence de Fonction Import

### Pourquoi N'Existe-t-elle Pas?

1. **Documentation explicite** :
   - Ligne 19-22 `sequencesDB.ts` : "Hors scope Ticket 3 (futur Ticket 4)"

2. **Architecture DB-first** :
   - Import nécessite RPC transactionnelle Visitor → Cloud
   - RPC `create_sequence_with_steps()` existe (cloud) mais pas Visitor equivalent

3. **Contraintes autorisations** :
   - `can_write_sequences()` → Subscriber/Admin uniquement (voir RPC ligne 62)
   - New Free users auraient besoin autorisation temporaire pour importer

4. **Débat de design** :
   - Faut-il importer automatiquement lors du premier login?
   - Faut-il afficher un modal "Importer vos données Visitor"?
   - Faut-il migrer automatiquement ou laisser user recréer manuellement?
   - **Décision reportée à Ticket 4**

### Pattern Établi Pour Futur Import

✅ **Préparation structurelle existe** :

- Données Visitor bien formatées en IndexedDB
- RPC atomique cloud `create_sequence_with_steps()` robuste
- Hook `useIsVisitor()` pour détecter transition
- Pattern `enabled` flag pour adapter routing

### Ce Qui Devrait Exister (Ticket 4)

```typescript
// PSEUDO-CODE : Fonction importation (À CRÉER)

async function importVisitorSequences(
  visitorSequences: VisitorSequence[]
): Promise<void> {
  // 1. Charger toutes séquences + étapes Visitor depuis IndexedDB
  const allVisitorSequences = await getAllSequences()

  // 2. Pour chaque séquence, appeler RPC atomique cloud
  for (const seq of allVisitorSequences) {
    const steps = await getSequenceSteps(seq.id)
    const stepCardIds = steps.map(s => s.step_card_id)

    // 3. Créer dans Supabase via RPC atomique
    const { data: newSeqId, error } = await supabase.rpc(
      'create_sequence_with_steps',
      {
        p_mother_card_id: seq.mother_card_id,
        p_step_card_ids: stepCardIds,
      }
    )

    if (error) throw new Error(`Import failed for sequence ${seq.id}`)
  }

  // 4. Nettoyer IndexedDB après succès complet
  await clearAllVisitorData()

  // 5. Rafraîchir UI
  location.reload()
}
```

---

## Gestion Erreurs : Patterns Découverts

### ✅ Robustesse Cloud (RPC)

**Niveau DB** :

- Transactions SQL atomiques (tout ou rien)
- Trigger `sequences_enforce_min_two_steps` avant COMMIT
- RLS policies appliquées à l'insertion
- Gestion UNIQUE constraint violations (ligne 126-142)

**Niveau Node.js** :

```typescript
const { data, error } = await supabase.rpc(...)
if (error) {
  // Erreurs DB automatiquement capturées
  // (RLS, triggers, constraints)
}
```

### ✅ Robustesse Local (IndexedDB)

**Niveau IndexedDB** :

- Transactions multi-store atomiques
- Indices UNIQUE composites
- Gestion erreurs : `tx.onerror`, `request.onerror`

**Niveau Hook** :

```typescript
try {
  const newSequence = await sequencesDB.createSequenceWithSteps(...)
  refresh()
  return { id: newSequence.id, error: null }
} catch (err) {
  return { id: null, error: err as Error }
}
```

---

## Analyse de Risques : Import Futur

### Risques Identifiés

| Risque                                   | Probabilité | Impact   | Mitigation                             |
| ---------------------------------------- | ----------- | -------- | -------------------------------------- |
| **Authentification expirée lors import** | Élevée      | CRITIQUE | Vérifier `authReady` avant import      |
| **Quotas Free dépassés**                 | Élevée      | HAUT     | Vérifier `can_write_sequences()` avant |
| **Doublons suite rechargement page**     | Moyenne     | MOYEN    | UNIQUE constraint + UUID stable        |
| **IndexedDB non disponible**             | Faible      | HAUT     | Fallback graceful, afficher message    |
| **Réseau interrompu mid-import**         | Moyenne     | MOYEN    | Transaction atomique cloud + retry     |
| **Données Visitor corrompues**           | Très faible | CRITIQUE | Validation avant insert + ROLLBACK     |

### Mitigations à Implémenter (Ticket 4)

1. **Pré-check authentification** :

   ```typescript
   if (!user || !authReady) throw new Error('Auth required')
   ```

2. **Vérifier quotas** :

   ```typescript
   const { isFree, isSubscriber } = useAccountStatus()
   if (isFree && visitorSequences.length > 5) {
     throw new Error('Too many sequences for Free plan')
   }
   ```

3. **Transaction wrapper** :

   ```typescript
   try {
     // Import atomique
   } catch (error) {
     // Rollback local : ne pas nettoyer IndexedDB
     throw error
   }
   ```

4. **Feedback utilisateur** :
   ```typescript
   showToast('Importing your sequences...', 'info')
   // ...progress...
   showToast('Import successful!', 'success')
   ```

---

## Transactions : Pattern Atomicité

### LocalStorage / IndexedDB (Visitor)

**Atomic par design** :

```javascript
// Tout dans UNE transaction IndexedDB → tout ou rien
const tx = db.transaction([STORE_SEQUENCES, STORE_STEPS], 'readwrite')
// ... add, update, delete ...
tx.oncomplete = () => resolve() // Succès atomique
tx.onerror = () => reject() // Rollback auto
```

### PostgreSQL / Supabase (Cloud)

**Atomic par défaut** :

```sql
BEGIN;
  INSERT INTO sequences (...)
  INSERT INTO sequence_steps (...)
COMMIT;
-- Si erreur → ROLLBACK automatique
```

**RPC wrapper** :

```sql
CREATE FUNCTION create_sequence_with_steps(...) AS $$
BEGIN
  -- Tous les INSERTs dans une transaction PostgreSQL
  -- EXCEPTION → ROLLBACK automatique
  INSERT INTO sequences ...
  INSERT INTO sequence_steps ...
  RETURN sequence_id;
EXCEPTION WHEN ... → ROLLBACK
```

### Import Futur (À Implémenter)

```typescript
async function importVisitorSequences() {
  // PSEUDO-CODE : À définir en Ticket 4

  // Approche 1 : Parallèle (fast mais moins safe)
  await Promise.all([importSeq1, importSeq2, importSeq3])
  // → Si une échoue, les autres continuent (inconsistency risk)

  // Approche 2 : Séquentiel (safe mais slow)
  for (const seq of sequences) {
    await importOne(seq) // Stopper si erreur
  }
  // → Atomique au niveau logique

  // Approche 3 : Batch + Rollback (recommandé)
  try {
    // Créer transaction wrapper
    const results = await Promise.all([...sequences.map(s => importOne(s))])
    // Vérifier tous succès
    if (results.every(r => !r.error)) {
      // Commit local : nettoyer IndexedDB
      await clearAllVisitorData()
    } else {
      throw new Error('Partial import failure')
    }
  } catch (error) {
    // Rollback local : garder IndexedDB intact
    // Afficher erreur utilisateur
  }
}
```

---

## Documentation Trouvée : Ticket 4

### Références Explicites

1. **`src/utils/visitor/sequencesDB.ts:19-22`** :

   ```typescript
   // ⚠️ IMPORT VISITOR → COMPTE
   // - Hors scope Ticket 3 (futur Ticket 4)
   // - Cette couche prépare les données pour un import ultérieur
   ```

2. **`src/hooks/useSequencesLocal.ts:12-13`** :

   ```typescript
   // ⚠️ RÈGLES LOCALES VISITOR
   // - Min 2 étapes par séquence (enforcement dans sequencesDB.ts)
   // - Pas de doublons step_card_id (enforcement dans sequencesDB.ts)
   ```

3. **`src/page-components/signup/Signup.tsx:79`** :
   ```typescript
   // Note : Le nouveau schéma DB n'utilise pas user_metadata.pseudo
   // Le trigger DB crée automatiquement le profil enfant "Mon enfant"
   ```

### Phase d'Implémentation

- **S3** (Phase 3 Visitor) : Créé IndexedDB + hooks Visitor ✅
- **S4** (Phase 4 Timelines) : Ajoutera RPC atomiques cloud ✅
- **Ticket 4** (Futur) : Implémentera import Visitor → Free ⏳

---

## Conclusion

### État Actuel

✅ **Infrastructure prête** :

- Couche Visitor locale structurée et documentée
- Transactions atomiques cloud robustes
- Hooks adapter pour routing seamless
- Pattern `enabled` flag pour future import

❌ **Fonction d'importation manquante** :

- Aucune RPC migration Visitor → Supabase
- Aucun hook `useImportVisitor()` ou similaire
- Aucun nettoyage localStorage post-signup
- Données Visitor restent orphelines après login

### Garanties de Robustesse (Existantes)

1. **Transactions cloud** : Atomiques via PostgreSQL + RPC
2. **Contraintes DB** : Enforced au niveau database (RLS, triggers, UNIQUE)
3. **Validation client** : Minimale mais présente
4. **Gestion erreurs** : Try/catch au niveau hook

### Prochaines Étapes (Ticket 4)

1. Créer RPC `import_visitor_sequences(p_visitor_sequences jsonb)`
2. Implémenter hook `useImportVisitor()`
3. Ajouter modal post-signup "Importer données?"
4. Nettoyer IndexedDB après import succès
5. Tester rollback sur erreur partielle

### Verdict Final

**L'importation Visitor → Free est structurellement préparée mais non implémentée, comme documenté dans le code. C'est un choix volontaire reporté à Ticket 4 (S4).**
