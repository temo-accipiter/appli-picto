/**
 * importVisitorSequences.ts — Service d'import atomique séquences Visitor → Supabase.
 *
 * ⚠️ ATOMICITÉ GARANTIE
 * - TOUTES les séquences locales sont envoyées en un seul RPC
 * - Transaction PostgreSQL implicite : tout ou rien
 * - Si le réseau coupe mid-import, aucune donnée locale n'est supprimée
 * - IndexedDB nettoyée UNIQUEMENT après confirmation succès du RPC
 *
 * ⚠️ GESTION CONFLITS
 * - Si une séquence existe déjà en cloud (mother_card_id), elle est skippée (ON CONFLICT DO NOTHING)
 * - Import ne fail jamais à cause d'un doublon
 *
 * ⚠️ RLS & PERMISSIONS
 * - RPC valide auth.uid() côté DB (SECURITY INVOKER)
 * - Free accounts bloqués par can_write_sequences()
 * - Si user non auth, RPC refuse (42501)
 */

import {
  getAllSequences,
  getSequenceSteps,
  type VisitorSequence,
  type VisitorSequenceStep,
} from './sequencesDB'
import { supabase } from '../supabaseClient'

/** Résultat détaillé de l'import */
export interface ImportResult {
  success: boolean
  imported_count: number
  skipped_count: number
  total_sequences: number
  errors: Array<{
    error: string
    sqlstate?: string
    mother_card_id?: string
  }>
}

/** Structure JSON envoyée au RPC */
interface ImportPayload {
  sequences: Array<{
    mother_card_id: string
    steps: Array<{
      step_card_id: string
      position: number
    }>
  }>
}

/**
 * Lit toutes les séquences + étapes depuis IndexedDB et les transforme en JSON.
 */
async function prepareImportPayload(): Promise<ImportPayload> {
  const sequences = await getAllSequences()

  const payload: ImportPayload = {
    sequences: [],
  }

  for (const sequence of sequences) {
    const steps = await getSequenceSteps(sequence.id)

    // Transformer les étapes en format attendu par le RPC
    const formattedSteps = steps.map(step => ({
      step_card_id: step.step_card_id,
      position: step.position,
    }))

    payload.sequences.push({
      mother_card_id: sequence.mother_card_id,
      steps: formattedSteps,
    })
  }

  return payload
}

/**
 * Vide complètement IndexedDB Visitor (séquences + étapes).
 * ⚠️ APPELÉ UNIQUEMENT APRÈS SUCCÈS CONFIRMÉ DU RPC.
 */
async function clearVisitorIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('appli-picto-visitor')

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      console.warn(
        'IndexedDB deletion blocked (onglet ouvert ailleurs). Retry après fermeture.'
      )
      reject(new Error('IndexedDB deletion blocked'))
    }
  })
}

/**
 * Import atomique des séquences Visitor vers Supabase.
 *
 * Workflow:
 * 1. Lire toutes séquences + étapes depuis IndexedDB
 * 2. Transformer en JSON compatible RPC
 * 3. Appeler RPC import_visitor_sequences_batch() (ATOMIQUE)
 * 4. Si succès confirmé, vider IndexedDB
 * 5. Retourner résultat détaillé
 *
 * @throws Error si user non auth, permissions insuffisantes, ou erreur réseau
 * @returns Résultat détaillé { success, imported_count, skipped_count, errors }
 */
export async function importVisitorSequences(): Promise<ImportResult> {
  // 1. Préparer payload depuis IndexedDB
  const payload = await prepareImportPayload()

  // Si aucune séquence à importer, retour immédiat
  if (payload.sequences.length === 0) {
    return {
      success: true,
      imported_count: 0,
      skipped_count: 0,
      total_sequences: 0,
      errors: [],
    }
  }

  // 2. Appeler RPC Supabase (ATOMIQUE)
  const { data, error } = await supabase.rpc('import_visitor_sequences_batch', {
    p_sequences_json: payload,
  })

  // 3. Gestion erreur RPC
  if (error) {
    // Erreurs possibles :
    // - 42501: Non authentifié ou permissions insuffisantes
    // - 22023: JSON invalide
    // - 23514: Violation contraintes (min 2 steps, etc.)
    throw new Error(
      `Erreur import : ${error.message} (code: ${error.code ?? 'unknown'})`
    )
  }

  // 4. Validation résultat
  if (!data || typeof data !== 'object') {
    throw new Error('Résultat RPC invalide (aucune donnée retournée)')
  }

  const result = data as ImportResult

  // 5. Si succès confirmé, vider IndexedDB
  if (result.success && result.imported_count > 0) {
    try {
      await clearVisitorIndexedDB()
    } catch (cleanupError) {
      console.warn(
        'Avertissement : Séquences importées avec succès, mais IndexedDB non vidée.',
        cleanupError
      )
      // Ne pas fail l'import à cause d'un problème de cleanup
      // L'utilisateur pourra retry l'import, les doublons seront skippés
    }
  }

  // 6. Retourner résultat détaillé
  return result
}

/**
 * Vérifie si IndexedDB Visitor contient des séquences.
 * Utilisé pour afficher/masquer la modal d'import.
 *
 * @returns true si au moins une séquence existe localement
 */
export async function hasLocalSequences(): Promise<boolean> {
  try {
    const sequences = await getAllSequences()
    return sequences.length > 0
  } catch (error) {
    console.warn('Erreur vérification séquences locales:', error)
    return false
  }
}
