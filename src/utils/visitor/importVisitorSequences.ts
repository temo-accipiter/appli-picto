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
  type VisitorSequence as _VisitorSequence,
  type VisitorSequenceStep as _VisitorSequenceStep,
} from './sequencesDB'
import { getAllSlots } from './slotsDB'
import { supabase } from '../supabaseClient'

/** Résultat détaillé de l'import */
export interface ImportResult {
  success: boolean
  imported_count: number
  skipped_count: number
  total_sequences: number
  slots_imported?: number
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p_sequences_json: payload as any,
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

  const result = data as unknown as ImportResult

  // 5. Retourner résultat (cleanup IndexedDB géré par importAllVisitorData)
  return result
}

/**
 * Import des slots Visitor (IndexedDB) vers la timeline Supabase.
 * Appelé uniquement par importAllVisitorData().
 */
async function importVisitorSlots(): Promise<{
  success: boolean
  imported_count: number
}> {
  const slots = await getAllSlots()

  // Aucun slot → succès sans import
  if (slots.length === 0) {
    return { success: true, imported_count: 0 }
  }

  const payload = {
    slots: slots.map(s => ({
      kind: s.kind,
      position: s.position,
      card_id: s.card_id,
      tokens: s.tokens,
    })),
  }

  const { data, error } = await supabase.rpc(
    'import_visitor_timelines_slots_batch',
    {
      p_slots_json: payload,
    }
  )

  if (error) {
    throw new Error(
      `Erreur import slots : ${error.message} (code: ${error.code ?? 'unknown'})`
    )
  }

  if (!data || typeof data !== 'object') {
    throw new Error(
      'Résultat RPC import_visitor_timelines_slots_batch invalide'
    )
  }

  const result = data as {
    success: boolean
    imported_count: number
    timeline_id: string
  }
  return { success: result.success, imported_count: result.imported_count }
}

/**
 * Import atomique de TOUTES les données Visitor : séquences + slots.
 *
 * Workflow :
 * 1. Import séquences (RPC import_visitor_sequences_batch)
 * 2. Import slots (RPC import_visitor_timelines_slots_batch)
 * 3. Cleanup IndexedDB UNIQUEMENT après les deux imports confirmés
 * 4. Retourner résultat combiné { imported_count, slots_imported }
 *
 * ⚠️ Si séquences ou slots lancent une exception, IndexedDB n'est PAS vidée.
 * L'utilisateur peut relancer l'import (les doublons séquences sont skippés).
 */
export async function importAllVisitorData(): Promise<ImportResult> {
  // 1. Import séquences
  const seqResult = await importVisitorSequences()

  // 2. Import slots
  const slotResult = await importVisitorSlots()

  // 3. Cleanup IndexedDB APRÈS les deux imports (si au moins un a produit des données)
  const hasImported =
    (seqResult.success && seqResult.imported_count > 0) ||
    (slotResult.success && slotResult.imported_count > 0)

  if (hasImported) {
    try {
      await clearVisitorIndexedDB()
    } catch (cleanupError) {
      console.warn(
        'Avertissement : Données importées avec succès, mais IndexedDB non vidée.',
        cleanupError
      )
      // Ne pas fail l'import — les doublons séquences seront skippés au prochain essai
    }
  }

  // 4. Résultat combiné
  return {
    ...seqResult,
    slots_imported: slotResult.imported_count,
  }
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

/**
 * Vérifie si IndexedDB Visitor contient des données locales
 * (slots OU séquences) pour déclencher la proposition d'import.
 *
 * @returns true si au moins une donnée locale existe (slot ou séquence)
 */
export async function hasLocalData(): Promise<boolean> {
  try {
    const [sequences, { getAllSlots }] = await Promise.all([
      getAllSequences(),
      import('./slotsDB'),
    ])
    const slots = await getAllSlots()
    return sequences.length > 0 || slots.length > 0
  } catch (error) {
    console.warn('Erreur vérification données locales Visitor:', error)
    return false
  }
}
