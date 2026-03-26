# Ticket 4 : Plan d'Implémentation - Import Visitor → Free

**Document** : Plan détaillé pour implémenter la migration des données Visitor vers compte Free créé.

**Phase** : S4 (Timelines)

**Dépendances** :
- ✅ S3 : Visitor IndexedDB (complété)
- ✅ S4 : RPC atomiques cloud (complété)
- ⏳ Ticket 4 : Import function (À FAIRE)

---

## Vue d'ensemble

### Scénario Utilisateur

```
1. Utilisateur crée séquences Visitor en mode non-connecté
   → Données en IndexedDB local

2. Utilisateur crée compte + confirme email
   → Se connecte → Nouveau Free account créé

3. Page post-login affiche modal :
   "Vous avez N séquences sauvegardées localement. Importer?"

4. Utilisateur clique "Importer"
   → Fonction transfer toutes séquences vers Supabase
   → Nettoie IndexedDB
   → Affiche toast succès

5. Utilisateur bascule mode Tableau
   → Voit ses séquences depuis Supabase (pas IndexedDB)
```

---

## Architecture Solution

### Composants à Créer

```
src/hooks/useImportVisitor.ts
├─ Hook React pour orchestrer import
├─ Gère state (loading, error, success)
└─ Retourne fonction importVisitorSequences()

src/components/features/modal/modal-import-visitor/
├─ ModalImportVisitor.tsx
├─ ModalImportVisitor.scss
├─ Messages i18n
└─ Affiche modal post-login

src/utils/visitor/importVisitorSequences.ts
├─ Fonction métier (pure)
├─ Charge sequences depuis IndexedDB
├─ Crée dans Supabase via RPC
└─ Cleanup IndexedDB

src/app/(protected)/layout.tsx (modifié)
├─ Déclenche modal import si Visitor data detected
└─ Une seule fois (localStorage flag)
```

### Data Flow

```
┌──────────────────────────────┐
│ ModalImportVisitor (UI)      │
│                              │
│ [Importer] [Plus tard]       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ useImportVisitor (Hook)      │
│                              │
│ • Gère loading, error        │
│ • Appelle importFunction     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ importVisitorSequences (Pure)│
│                              │
│ 1. Charger IndexedDB         │
│ 2. Valider données           │
│ 3. Créer via RPC cloud       │
│ 4. Cleanup IndexedDB         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Résultat                     │
│                              │
│ Toast succès / erreur        │
│ Modal ferme                  │
│ UI rafraîchit (séquences)    │
└──────────────────────────────┘
```

---

## 1. Hook React : useImportVisitor()

### Fichier à Créer
`src/hooks/useImportVisitor.ts`

### Code Template

```typescript
/**
 * useImportVisitor.ts — Hook orchestrant l'import Visitor → Free
 *
 * Charge toutes séquences Visitor depuis IndexedDB et les crée dans
 * Supabase via RPC atomique create_sequence_with_steps().
 *
 * ⚠️ SCOPE : Utilisateurs authentifiés UNIQUEMENT
 * - Visitor : useIsVisitor().isVisitor === true
 * - New Free : useAccountStatus().isFree === true
 *
 * ⚠️ WORKFLOW
 * 1. User crée compte + login
 * 2. Détecte IndexedDB visitor data → Affiche modal
 * 3. User clique "Importer" → appelle importVisitorSequences()
 * 4. All-or-nothing : tout succès → cleanup, sinon guard et gardé
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks'
import * as sequencesDB from '@/utils/visitor/sequencesDB'

interface ImportResult {
  total: number
  imported: number
  failed: number
  errors: Array<{ sequenceId: string; error: string }>
}

interface UseImportVisitorReturn {
  /** true si import en cours */
  loading: boolean
  /** Erreur globale (si import échoue au niveau coordination) */
  error: Error | null
  /** Nombre de séquences detectées localement */
  visitorSequenceCount: number
  /** Exécuter l'import */
  importVisitorSequences: () => Promise<ImportResult | null>
  /** Vérifier si IndexedDB contient données */
  hasVisitorData: () => Promise<boolean>
}

export default function useImportVisitor(): UseImportVisitorReturn {
  const { user, authReady } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [visitorSequenceCount, setVisitorSequenceCount] = useState(0)

  // Vérifier si données Visitor existent
  const hasVisitorData = useCallback(async (): Promise<boolean> => {
    try {
      const sequences = await sequencesDB.getAllSequences()
      setVisitorSequenceCount(sequences.length)
      return sequences.length > 0
    } catch (err) {
      console.error('[useImportVisitor] Failed to check visitor data:', err)
      return false
    }
  }, [])

  // Orchestrer l'import
  const importVisitorSequences = useCallback(
    async (): Promise<ImportResult | null> => {
      // ⚠️ GUARD : User must be authenticated
      if (!user || !authReady) {
        setError(new Error('Authentication required for import'))
        return null
      }

      setLoading(true)
      setError(null)

      const result: ImportResult = {
        total: 0,
        imported: 0,
        failed: 0,
        errors: [],
      }

      try {
        // 1. Charger toutes séquences Visitor depuis IndexedDB
        console.log('[useImportVisitor] Loading visitor sequences from IndexedDB...')
        const visitorSequences = await sequencesDB.getAllSequences()
        result.total = visitorSequences.length

        if (result.total === 0) {
          console.log('[useImportVisitor] No visitor sequences to import')
          return result
        }

        console.log(
          `[useImportVisitor] Found ${result.total} visitor sequences, importing...`
        )

        // 2. Importer séquence par séquence (chacune est atomique)
        for (const visitorSeq of visitorSequences) {
          try {
            // Charger étapes de la séquence
            const steps = await sequencesDB.getSequenceSteps(visitorSeq.id)
            const stepCardIds = steps.map(s => s.step_card_id)

            // Appeler RPC atomique cloud
            const { data: newSeqId, error: rpcError } = await supabase.rpc(
              'create_sequence_with_steps',
              {
                p_mother_card_id: visitorSeq.mother_card_id,
                p_step_card_ids: stepCardIds,
              }
            )

            if (rpcError) {
              throw new Error(
                `RPC failed: ${rpcError.code} - ${rpcError.message}`
              )
            }

            console.log(
              `[useImportVisitor] ✅ Imported sequence ${visitorSeq.id} → ${newSeqId}`
            )
            result.imported++
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error(
              `[useImportVisitor] ❌ Failed to import sequence ${visitorSeq.id}:`,
              err
            )
            result.failed++
            result.errors.push({
              sequenceId: visitorSeq.id,
              error: errMsg,
            })
          }
        }

        // 3. Cleanup IndexedDB SEULEMENT si ALL succès
        if (result.failed === 0) {
          console.log('[useImportVisitor] All imports succeeded, cleaning up IndexedDB...')
          for (const visitorSeq of visitorSequences) {
            try {
              await sequencesDB.deleteSequence(visitorSeq.id)
            } catch (err) {
              console.warn(`[useImportVisitor] Failed to cleanup sequence ${visitorSeq.id}:`, err)
              // Continue cleanup même si une échoue
            }
          }
          console.log('[useImportVisitor] ✅ Cleanup completed')
        } else {
          console.warn(
            `[useImportVisitor] ⚠️ Partial failure (${result.failed}/${result.total}), ` +
              'keeping IndexedDB intact for retry'
          )
        }

        return result
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[useImportVisitor] Import failed:', err)
        setError(new Error(`Import failed: ${errMsg}`))
        return null
      } finally {
        setLoading(false)
      }
    },
    [user, authReady]
  )

  return {
    loading,
    error,
    visitorSequenceCount,
    importVisitorSequences,
    hasVisitorData,
  }
}
```

---

## 2. Modal UI : ModalImportVisitor

### Fichier à Créer
`src/components/features/modal/modal-import-visitor/ModalImportVisitor.tsx`

### Code Template

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth, useI18n, useImportVisitor } from '@/hooks'
import { useToast } from '@/contexts'
import Modal from '@/components/shared/modal/Modal'
import Button from '@/components/shared/button/Button'
import './ModalImportVisitor.scss'

interface ModalImportVisitorProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
}

export default function ModalImportVisitor({
  isOpen,
  onClose,
  onImportSuccess,
}: ModalImportVisitorProps) {
  const { t } = useI18n()
  const { show: showToast } = useToast()
  const { user } = useAuth()
  const { loading, error, visitorSequenceCount, importVisitorSequences } =
    useImportVisitor()

  const [step, setStep] = useState<'confirm' | 'importing' | 'result'>('confirm')
  const [result, setResult] = useState<any>(null)

  const handleImport = useCallback(async () => {
    setStep('importing')
    const importResult = await importVisitorSequences()

    if (importResult) {
      setResult(importResult)
      setStep('result')

      // Afficher toast
      if (importResult.failed === 0) {
        showToast(t('visitor.importSuccess'), 'success')
        // Attendre un peu avant callback (toast visible)
        setTimeout(() => {
          onImportSuccess?.()
          onClose()
        }, 2000)
      } else {
        showToast(
          t('visitor.importPartialError', {
            failed: importResult.failed,
            total: importResult.total,
          }),
          'warning'
        )
      }
    } else {
      showToast(t('visitor.importError'), 'error')
      setStep('confirm')
    }
  }, [importVisitorSequences, showToast, t, onImportSuccess, onClose])

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('visitor.importTitle')}>
      {step === 'confirm' && (
        <div className="modal-import-visitor__confirm">
          <p className="modal-import-visitor__message">
            {t('visitor.importMessage', { count: visitorSequenceCount })}
          </p>

          {error && (
            <div className="modal-import-visitor__error">{error.message}</div>
          )}

          <div className="modal-import-visitor__actions">
            <Button
              label={t('visitor.import')}
              onClick={handleImport}
              disabled={loading || visitorSequenceCount === 0}
              variant="primary"
            />
            <Button
              label={t('visitor.skipForNow')}
              onClick={onClose}
              disabled={loading}
              variant="secondary"
            />
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="modal-import-visitor__importing">
          <div className="modal-import-visitor__spinner" />
          <p>{t('visitor.importing')}</p>
        </div>
      )}

      {step === 'result' && result && (
        <div className="modal-import-visitor__result">
          <h3>
            {result.failed === 0
              ? t('visitor.importSuccessTitle')
              : t('visitor.importPartialTitle')}
          </h3>

          <dl className="modal-import-visitor__stats">
            <dt>{t('visitor.total')}</dt>
            <dd>{result.total}</dd>

            <dt>{t('visitor.imported')}</dt>
            <dd className="success">{result.imported}</dd>

            {result.failed > 0 && (
              <>
                <dt>{t('visitor.failed')}</dt>
                <dd className="error">{result.failed}</dd>
              </>
            )}
          </dl>

          {result.errors.length > 0 && (
            <div className="modal-import-visitor__errors">
              <h4>{t('visitor.errors')}</h4>
              <ul>
                {result.errors.map(err => (
                  <li key={err.sequenceId}>
                    <strong>{err.sequenceId}</strong>: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            label={t('visitor.close')}
            onClick={onClose}
            variant="primary"
          />
        </div>
      )}
    </Modal>
  )
}
```

### Styles SCSS
`src/components/features/modal/modal-import-visitor/ModalImportVisitor.scss`

```scss
// Design system tokens
.modal-import-visitor {
  &__confirm,
  &__importing,
  &__result {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  &__message {
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    line-height: var(--line-height-normal);
  }

  &__error {
    padding: var(--spacing-md);
    background: var(--color-error-light);
    color: var(--color-error);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  &__actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
  }

  &__spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid var(--color-primary-light);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: auto auto;
    gap: var(--spacing-md) var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-md);

    dt {
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    dd {
      font-size: 1.5rem;
      font-weight: 700;

      &.success {
        color: var(--color-success);
      }

      &.error {
        color: var(--color-error);
      }
    }
  }

  &__errors {
    padding: var(--spacing-md);
    background: var(--color-surface-secondary);
    border-radius: var(--radius-md);

    h4 {
      margin: 0 0 var(--spacing-sm);
      font-size: var(--font-size-sm);
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: var(--spacing-xs);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);

        strong {
          font-family: monospace;
          color: var(--color-text-primary);
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## 3. Layout Integration

### Fichier à Modifier
`src/app/(protected)/layout.tsx`

### Code Modification

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks'
import useImportVisitor from '@/hooks/useImportVisitor'
import ModalImportVisitor from '@/components/features/modal/modal-import-visitor/ModalImportVisitor'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, authReady } = useAuth()
  const { hasVisitorData } = useImportVisitor()

  // État pour afficher modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [checkingVisitorData, setCheckingVisitorData] = useState(true)

  // ⚠️ DÉCLENCHE MODAL une seule fois au premier login
  useEffect(() => {
    const checkAndShowModal = async () => {
      if (!authReady || !user) {
        setCheckingVisitorData(false)
        return
      }

      // Vérifier si déjà affichée (localStorage flag)
      const hasSeenImportModal = localStorage.getItem(
        `appli-picto:import-modal-shown:${user.id}`
      )
      if (hasSeenImportModal) {
        setCheckingVisitorData(false)
        return
      }

      // Vérifier données Visitor
      const hasData = await hasVisitorData()
      if (hasData) {
        setShowImportModal(true)
        // Marquer comme affiché
        localStorage.setItem(
          `appli-picto:import-modal-shown:${user.id}`,
          'true'
        )
      }

      setCheckingVisitorData(false)
    }

    void checkAndShowModal()
  }, [authReady, user, hasVisitorData])

  const handleImportSuccess = () => {
    // Rafraîchir UI si nécessaire
    // (hooks vont détecter nouveaux sequences dans Supabase)
  }

  return (
    <>
      {/* Contenu layout */}
      {children}

      {/* Modal import (affiché au premier login + données Visitor) */}
      <ModalImportVisitor
        isOpen={showImportModal && !checkingVisitorData}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </>
  )
}
```

---

## 4. i18n Messages

### Fichier à Modifier/Créer
`src/config/i18n/translations/[lang].json`

### Messages à Ajouter

```json
{
  "visitor": {
    "importTitle": "Importer vos données",
    "importMessage": "Vous avez {count} séquence(s) sauvegardée(s) localement. Voulez-vous les importer dans votre compte?",
    "import": "Importer",
    "skipForNow": "Plus tard",
    "importing": "Importation en cours...",
    "importSuccessTitle": "Importation réussie!",
    "importPartialTitle": "Importation partiellement complétée",
    "total": "Total",
    "imported": "Importées",
    "failed": "Échouées",
    "errors": "Erreurs",
    "close": "Fermer",
    "importSuccess": "Vos séquences ont été importées avec succès!",
    "importPartialError": "{failed} séquence(s) sur {total} n'ont pas pu être importées. Elles restent sauvegardées localement.",
    "importError": "L'importation a échoué. Veuillez réessayer ultérieurement."
  }
}
```

---

## 5. Checklist d'Implémentation

### Phase 1 : Fondations

- [ ] Créer `useImportVisitor.ts`
  - [ ] Charger IndexedDB
  - [ ] Appeler RPC pour chaque séquence
  - [ ] Cleanup conditionnel
  - [ ] Gestion erreurs

- [ ] Créer `ModalImportVisitor.tsx` + SCSS
  - [ ] Étape confirmation
  - [ ] Étape importing (spinner)
  - [ ] Étape résultat (stats + erreurs)
  - [ ] Accessibilité (focus, ARIA, contraste)

### Phase 2 : Intégration

- [ ] Modifier `(protected)/layout.tsx`
  - [ ] Intégrer modal
  - [ ] Déclencher une seule fois par user
  - [ ] localStorage flag pour éviter re-affichage

- [ ] Ajouter messages i18n
  - [ ] Français
  - [ ] Anglais (si applicable)

### Phase 3 : Testing

- [ ] Tests unitaires
  - [ ] `useImportVisitor` (mock IndexedDB)
  - [ ] Gestion erreurs RPC
  - [ ] Cleanup logic

- [ ] Tests E2E
  - [ ] Créer Visitor data
  - [ ] Signup + login
  - [ ] Modal affichée
  - [ ] Import succès → IndexedDB vidé
  - [ ] Import échoue → IndexedDB gardé

- [ ] Tests manuels
  - [ ] Mode offline → queue stockée
  - [ ] Réseau slow → timeout RPC
  - [ ] Quotas Free dépassés → erreur RLS

### Phase 4 : Optimisations

- [ ] Perf
  - [ ] Batch imports (au lieu de 1 par 1)?
  - [ ] Indicateur progrès (x/y séquences)?

- [ ] UX
  - [ ] Afficher quel séquence échoue?
  - [ ] Permettre retry? (garder data, re-déclencher import)

---

## 6. Cas d'Erreur à Gérer

### Scénario 1 : Authentification Expirée

```typescript
if (!user || !authReady) {
  throw new Error('Authentication required for import')
}
// → Modal affiche erreur
// → IndexedDB gardé intact
// → User peut réessayer après login
```

### Scénario 2 : Quotas Free Dépassés

```typescript
// RPC appel `can_write_sequences()` et vérifie quotas
// Si violation → RPC retourne error code '42501' (Access denied)

if (rpcError && rpcError.code === '42501') {
  throw new Error('Quota exceeded or access denied')
}
```

### Scénario 3 : Doublons Séquence

```typescript
// RPC check UNIQUE(account_id, mother_card_id)
// Si violation → error code '23505' (Unique violation)

if (rpcError && rpcError.code === '23505') {
  throw new Error('Sequence already exists (ou doublon détecté)')
}
```

### Scénario 4 : IndexedDB Indisponible

```typescript
try {
  const visitorSeqs = await sequencesDB.getAllSequences()
  if (!visitorSeqs) {
    showToast('IndexedDB non disponible', 'warning')
    return
  }
} catch (err) {
  // Mode privé strict
  showToast('Impossible d\'accéder aux données locales', 'error')
}
```

### Scénario 5 : Réseau Interrompu Mid-import

```typescript
// Si requête RPC timeout ou erreur réseau
// → RPC ne s'exécute PAS (atomicité PostgreSQL)
// → IndexedDB reste intacts
// → User peut retry quand réseau revient

if (rpcError && rpcError.message.includes('Failed to fetch')) {
  throw new Error('Network error - please retry when online')
}
```

---

## 7. Plan de Déploiement

### Pre-flight Checks

- [ ] Tous tests E2E passent
- [ ] Tous tests unitaires passent
- [ ] Pas de TypeScript errors
- [ ] ESLint clean
- [ ] Accessibility audit (WCAG 2.2 AA)
- [ ] Performance audit (Lighthouse)

### Rollout Strategy

1. **Staging** : Tester sur env staging 1 semaine
2. **Beta** : Déployer en production FEATURE_FLAG:false (code présent, pas actif)
3. **Gradual** : Activer pour 10% users, observer logs
4. **Full** : Activer pour 100% users

### Rollback Plan

```typescript
// Si issues découvertes en production
// FEATURE_FLAG = false
// → Modal n'affichée jamais
// → IndexedDB data gardée
// → User peut attendre fix
```

---

## 8. Monitoring & Logging

### Logs à Ajouter

```typescript
// Début import
console.log('[useImportVisitor] Starting import for user:', user.id)
console.log('[useImportVisitor] Found sequences:', visitorSequences.length)

// Par séquence
console.log('[useImportVisitor] Importing sequence', {
  sequenceId: visitorSeq.id,
  motherCardId: visitorSeq.mother_card_id,
  stepCount: steps.length,
})

// Succès
console.log('[useImportVisitor] ✅ Sequence imported', {
  oldId: visitorSeq.id,
  newId: newSeqId,
  duration: Date.now() - startTime,
})

// Erreur
console.error('[useImportVisitor] ❌ Import failed', {
  sequenceId: visitorSeq.id,
  error: rpcError,
  errorCode: rpcError.code,
})

// Cleanup
console.log('[useImportVisitor] Cleanup completed', {
  deletedCount: visitorSequences.length,
  duration: Date.now() - startTime,
})
```

### Métriques à Tracker (Analytics)

- `visitor.import.attempted` : Nombre de fois modal affichée
- `visitor.import.completed_full` : Imports 100% succès
- `visitor.import.completed_partial` : Imports partiels
- `visitor.import.skipped` : User clique "Plus tard"
- `visitor.import.failed` : Échecs complets
- `visitor.import.error_codes` : RPC error codes (23505, 42501, etc.)
- `visitor.import.duration_ms` : Temps import (perf)

---

## Conclusion

**Plan d'implémentation Ticket 4** :

1. **Création 3 fichiers** : Hook + Modal + Layout mod
2. **Utilisation patterns existants** : RPC atomiques, try/catch, cleanup
3. **UX fluide** : Modal post-login, feedback utilisateur, graceful failures
4. **Robustesse** : Gestion tous cas erreur, IndexedDB préservé si échec
5. **Monitoring** : Logs détaillés + analytics pour suivi production

**Complexité estimée** : 3-4 jours dev + 2 jours QA + 1 jour déploiement graduel.

**Risques résiduels** : Quota dépassé (mitigé par RLS DB-first), race conditions (mitigé par UNIQUE DB).
