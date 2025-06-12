/**
 * Module : API utilities
 *
 * Rôle :
 *   Fournit des fonctions pour interagir avec le backend REST à l'adresse BASE.
 *   • Tâches :
 *     - fetchTaches(orderBy): GET /taches[?orderBy=…]
 *     - patchTache(id, body): PATCH /taches/:id
 *     - patchResetFait(): PATCH /taches/resetfait
 *     - deleteTache(id): DELETE /taches/:id
 *     - patchResetEdition(): PATCH /taches/reset
 *   • Récompenses :
 *     - getRecompenses(): GET /recompenses
 *     - addRecompense(formData): POST /recompenses
 *     - deleteRecompense(id): DELETE /recompenses/:id
 *     - selectRecompense(id): PATCH /recompenses/select/:id
 *     - deselectAllRecompenses(): PATCH /recompenses/select/0
 *
 * Chaque fonction vérifie le statut de la réponse et lève une exception en cas d’échec.
 *
 * Usage :
 *   import { fetchTaches, patchTache, getRecompenses, addRecompense, ... } from '@/utils/api'
 */

const BASE = 'http://localhost:3001'

// ——— TÂCHES —————————————————————————

export async function fetchTaches(orderBy = '') {
  const url = orderBy ? `${BASE}/taches?orderBy=${orderBy}` : `${BASE}/taches`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Échec fetchTaches')
  return res.json()
}

export async function patchTache(id, body) {
  const res = await fetch(`${BASE}/taches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Échec patchTache')
  return res.json()
}

export async function patchResetFait() {
  const res = await fetch(`${BASE}/taches/resetfait`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Échec patchResetFait')
  return res.json()
}

// 🔥 Nouveau : suppression d’une tâche
export async function deleteTache(id) {
  const res = await fetch(`${BASE}/taches/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Échec deleteTache')
  return res.json()
}

// 🔥 Nouveau : reset de l’édition (aujourdhui → 0)
export async function patchResetEdition() {
  const res = await fetch(`${BASE}/taches/reset`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Échec patchResetEdition')
  return res.json()
}

// ——— RÉCOMPENSES —————————————————————————

export async function getRecompenses() {
  const res = await fetch(`${BASE}/recompenses`)
  if (!res.ok) throw new Error('Échec getRecompenses')
  return res.json()
}

export async function addRecompense(formData) {
  const res = await fetch(`${BASE}/recompenses`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Échec addRecompense')
  return res.json()
}

export async function deleteRecompense(id) {
  const res = await fetch(`${BASE}/recompenses/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Échec deleteRecompense')
  return res.json()
}

export async function selectRecompense(id) {
  const res = await fetch(`${BASE}/recompenses/select/${id}`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error('Échec selectRecompense')
  return res.json()
}

export async function deselectAllRecompenses() {
  const res = await fetch(`${BASE}/recompenses/select/0`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error('Échec deselectAllRecompenses')
  return res.json()
}
