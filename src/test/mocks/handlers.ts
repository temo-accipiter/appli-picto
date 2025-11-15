// src/test/mocks/handlers.ts
/**
 * 🎭 MSW Handlers - Mock Supabase REST API
 *
 * Intercepte les appels HTTP vers Supabase et retourne des données mock
 *
 * Supabase utilise PostgREST :
 * - GET /rest/v1/table?query=params - Select
 * - POST /rest/v1/table - Insert
 * - PATCH /rest/v1/table?id=eq.123 - Update
 * - DELETE /rest/v1/table?id=eq.123 - Delete
 * - POST /rest/v1/rpc/function_name - RPC functions
 */

import { http, HttpResponse } from 'msw'
import type {
  MockTache,
  MockRecompense,
  MockCategory,
  MockParametre,
} from './data'
import {
  mockTaches,
  mockRecompenses,
  mockCategories,
  mockParametres,
  mockDemoCards,
  mockProfiles,
  mockAbonnements,
  mockStations,
} from './data'

const SUPABASE_URL = 'http://localhost:54321'

// État mutable pour simuler la base de données
let tachesDb: MockTache[] = [...mockTaches]
let recompensesDb: MockRecompense[] = [...mockRecompenses]
let categoriesDb: MockCategory[] = [...mockCategories]
let parametresDb: MockParametre[] = [...mockParametres]

/**
 * 🔄 Reset de la DB mock (utile entre les tests)
 */
export const resetMockDb = (): void => {
  tachesDb = [...mockTaches]
  recompensesDb = [...mockRecompenses]
  categoriesDb = [...mockCategories]
  parametresDb = [...mockParametres]
}

/**
 * 🎯 Handlers Supabase REST API
 */
export const handlers = [
  // ========================================
  // TACHES
  // ========================================

  // GET /rest/v1/taches - Select taches
  http.get(`${SUPABASE_URL}/rest/v1/taches`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const order = url.searchParams.get('order')

    let filtered = tachesDb

    // Filtre par user_id
    if (userId) {
      const userIdValue = userId.replace('eq.', '')
      filtered = filtered.filter(t => t.user_id === userIdValue)
    }

    // Ordre
    if (order === 'position') {
      filtered = [...filtered].sort((a, b) => a.position - b.position)
    }

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // POST /rest/v1/taches - Insert tache
  http.post(`${SUPABASE_URL}/rest/v1/taches`, async ({ request }) => {
    const newTache = (await request.json()) as Partial<MockTache>
    const tache: MockTache = {
      id: `tache-${Date.now()}`,
      label: newTache.label || '',
      fait: newTache.fait || false,
      aujourdhui: newTache.aujourdhui || false,
      position: newTache.position || 0,
      imagepath: newTache.imagepath || null,
      category_id: newTache.category_id || null,
      user_id: newTache.user_id || '',
      created_at: new Date().toISOString(),
    }
    tachesDb.push(tache)

    return HttpResponse.json(tache, {
      status: 201,
      headers: { Preference: 'return=representation' },
    })
  }),

  // PATCH /rest/v1/taches - Update tache
  http.patch(`${SUPABASE_URL}/rest/v1/taches`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')
    const updates = (await request.json()) as Partial<MockTache>

    const index = tachesDb.findIndex(t => t.id === id)
    if (index !== -1) {
      tachesDb[index] = { ...tachesDb[index], ...updates } as MockTache
      return HttpResponse.json(tachesDb[index], { status: 200 })
    }

    return HttpResponse.json({ message: 'Tache not found' }, { status: 404 })
  }),

  // DELETE /rest/v1/taches - Delete tache
  http.delete(`${SUPABASE_URL}/rest/v1/taches`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    const index = tachesDb.findIndex(t => t.id === id)
    if (index !== -1) {
      tachesDb.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }

    return HttpResponse.json({ message: 'Tache not found' }, { status: 404 })
  }),

  // ========================================
  // RECOMPENSES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/recompenses`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')

    let filtered = recompensesDb
    if (userId) {
      filtered = filtered.filter(r => r.user_id === userId)
    }

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/recompenses`, async ({ request }) => {
    const newRecompense = (await request.json()) as Partial<MockRecompense>
    const recompense: MockRecompense = {
      id: `reward-${Date.now()}`,
      label: newRecompense.label || '',
      imagepath: newRecompense.imagepath || null,
      selected: newRecompense.selected || false,
      user_id: newRecompense.user_id || '',
      created_at: new Date().toISOString(),
    }
    recompensesDb.push(recompense)

    return HttpResponse.json(recompense, { status: 201 })
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/recompenses`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')
    const updates = (await request.json()) as Partial<MockRecompense>

    const index = recompensesDb.findIndex(r => r.id === id)
    if (index !== -1) {
      recompensesDb[index] = {
        ...recompensesDb[index],
        ...updates,
      } as MockRecompense
      return HttpResponse.json(recompensesDb[index], { status: 200 })
    }

    return HttpResponse.json(
      { message: 'Recompense not found' },
      { status: 404 }
    )
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/recompenses`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    const index = recompensesDb.findIndex(r => r.id === id)
    if (index !== -1) {
      recompensesDb.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }

    return HttpResponse.json(
      { message: 'Recompense not found' },
      { status: 404 }
    )
  }),

  // ========================================
  // CATEGORIES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/categories`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')
    const userIdIsNull = url.searchParams.get('user_id')?.includes('is.null')

    let filtered = categoriesDb

    if (userIdIsNull) {
      // Catégories globales (user_id IS NULL)
      filtered = filtered.filter(c => c.user_id === null)
    } else if (userId) {
      // Catégories de l'utilisateur
      filtered = filtered.filter(c => c.user_id === userId)
    }

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/categories`, async ({ request }) => {
    const newCategory = (await request.json()) as Partial<MockCategory>
    const category: MockCategory = {
      id: `cat-${Date.now()}`,
      name: newCategory.name || '',
      color: newCategory.color || '#000000',
      user_id: newCategory.user_id || null,
      created_at: new Date().toISOString(),
    }
    categoriesDb.push(category)

    return HttpResponse.json(category, { status: 201 })
  }),

  // ========================================
  // PARAMETRES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/parametres`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')

    const filtered = userId
      ? parametresDb.filter(p => p.user_id === userId)
      : parametresDb

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/parametres`, async ({ request }) => {
    const newParam = (await request.json()) as Partial<MockParametre>
    const param: MockParametre = {
      id: `param-${Date.now()}`,
      confettis: newParam.confettis ?? true,
      user_id: newParam.user_id || '',
      created_at: new Date().toISOString(),
    }
    parametresDb.push(param)

    return HttpResponse.json(param, { status: 201 })
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/parametres`, async ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')
    const updates = (await request.json()) as Partial<MockParametre>

    const index = parametresDb.findIndex(p => p.user_id === userId)
    if (index !== -1) {
      parametresDb[index] = {
        ...parametresDb[index],
        ...updates,
      } as MockParametre
      return HttpResponse.json(parametresDb[index], { status: 200 })
    }

    return HttpResponse.json(
      { message: 'Parametres not found' },
      { status: 404 }
    )
  }),

  // ========================================
  // DEMO CARDS
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/demo_cards`, () => {
    return HttpResponse.json(mockDemoCards.tasks, { status: 200 })
  }),

  http.get(`${SUPABASE_URL}/rest/v1/demo_rewards`, () => {
    return HttpResponse.json(mockDemoCards.rewards, { status: 200 })
  }),

  // ========================================
  // PROFILES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/profiles`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    if (id) {
      const profile = mockProfiles.find(p => p.id === id)
      return HttpResponse.json(profile ? [profile] : [], { status: 200 })
    }

    return HttpResponse.json(mockProfiles, { status: 200 })
  }),

  // ========================================
  // ABONNEMENTS
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/abonnements`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')

    const filtered = userId
      ? mockAbonnements.filter(a => a.user_id === userId)
      : mockAbonnements

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // ========================================
  // STATIONS (theme métro)
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/stations`, ({ request }) => {
    const url = new URL(request.url)
    const ligne = url.searchParams.get('ligne')?.replace('eq.', '')

    const filtered = ligne
      ? mockStations.filter(s => s.ligne === parseInt(ligne))
      : mockStations

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // ========================================
  // RPC FUNCTIONS
  // ========================================

  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_my_primary_role`, () => {
    return HttpResponse.json({ role_name: 'free' }, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_my_permissions`, () => {
    return HttpResponse.json([], { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/rpc/get_usage_fast`, () => {
    return HttpResponse.json(
      {
        quotas: [
          {
            quota_type: 'max_tasks',
            quota_limit: 5,
            quota_period: 'total',
          },
          {
            quota_type: 'max_rewards',
            quota_limit: 2,
            quota_period: 'total',
          },
        ],
        usage: [
          { resource_type: 'tasks', usage_count: 2 },
          { resource_type: 'rewards', usage_count: 1 },
        ],
      },
      { status: 200 }
    )
  }),

  // ========================================
  // WEBSOCKET / REALTIME (Mock pour éviter crashes)
  // ========================================
  // CRITICAL: Intercepter les tentatives de connexion WebSocket
  // pour éviter les crashes du worker Vitest

  // GET /realtime/v1/websocket (HTTP et WS avec tous query params)
  http.get(`${SUPABASE_URL}/realtime/v1/*`, () => {
    // Retourner une réponse 200 pour satisfaire MSW
    // Le mock WebSocket global dans setup.ts empêchera la connexion réelle
    return new HttpResponse(null, { status: 200 })
  }),

  // Variantes WebSocket (ws://)
  http.get('ws://localhost:54321/realtime/v1/*', () => {
    return new HttpResponse(null, { status: 200 })
  }),

  // Fallback général pour toutes les routes realtime non capturées
  http.all('*/realtime/*', () => {
    return new HttpResponse(null, { status: 200 })
  }),
]
