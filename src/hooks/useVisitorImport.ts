/**
 * useVisitorImport.ts — Hook d'import atomique séquences Visitor → Supabase.
 *
 * ⚠️ USAGE
 * - Utilisé UNIQUEMENT lors de la première connexion après signup
 * - Affiché dans une modal sobre (UI/UX TSA)
 * - Bouton "Plus tard" respecte liberté utilisateur
 *
 * ⚠️ ATOMICITÉ
 * - Appelle service importVisitorSequences() (pas de boucle for)
 * - Transaction unique côté DB (tout ou rien)
 * - IndexedDB nettoyée SEULEMENT après succès confirmé
 */

import { useState, useCallback } from 'react'
import {
  importVisitorSequences,
  type ImportResult,
} from '@/utils/visitor/importVisitorSequences'

interface UseVisitorImportReturn {
  /** État de l'import en cours */
  importing: boolean

  /** Erreur éventuelle */
  error: string | null

  /** Résultat de l'import (si succès) */
  result: ImportResult | null

  /** Déclenche l'import atomique */
  importSequences: () => Promise<void>

  /** Reset état (pour retry) */
  reset: () => void
}

/**
 * Hook d'import atomique des séquences Visitor vers Supabase.
 *
 * Exemple d'utilisation :
 * ```tsx
 * const { importing, error, result, importSequences } = useVisitorImport()
 *
 * const handleImport = async () => {
 *   try {
 *     await importSequences()
 *     // Succès : result contient { imported_count, skipped_count, errors }
 *   } catch (err) {
 *     // Erreur : afficher message d'erreur
 *   }
 * }
 * ```
 */
export function useVisitorImport(): UseVisitorImportReturn {
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const importSequences = useCallback(async () => {
    // Reset état avant import
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      // Appel service atomique (pas de boucle for)
      const importResult = await importVisitorSequences()

      // Succès : stocker résultat
      setResult(importResult)
    } catch (err) {
      // Erreur : stocker message
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue lors de l'import"

      setError(errorMessage)

      // Re-throw pour permettre à la modal de gérer l'affichage
      throw err
    } finally {
      setImporting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setImporting(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    importing,
    error,
    result,
    importSequences,
    reset,
  }
}
