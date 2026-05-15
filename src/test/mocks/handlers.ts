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
  MockTimeline,
  MockSlot,
  MockSession,
  MockCard,
  MockUserCardCategory,
  MockSequence,
  MockSequenceStep,
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
  mockTimelines,
  mockSlots,
  mockSessions,
  mockCards,
  mockUserCardCategories,
  mockSequences,
  mockSequenceSteps,
  TEST_USER_ID,
} from './data'

const SUPABASE_URL = 'http://localhost:54321'

// État mutable pour simuler la base de données
let tachesDb: MockTache[] = [...mockTaches]
let recompensesDb: MockRecompense[] = [...mockRecompenses]
let categoriesDb: MockCategory[] = [...mockCategories]
let parametresDb: MockParametre[] = [...mockParametres]
let timelinesDb: MockTimeline[] = [...mockTimelines]
let slotsDb: MockSlot[] = [...mockSlots]
let sessionsDb: MockSession[] = [...mockSessions]
let cardsDb: MockCard[] = [...mockCards]
let userCardCategoriesDb: MockUserCardCategory[] = [...mockUserCardCategories]
let sequencesDb: MockSequence[] = [...mockSequences]
let sequenceStepsDb: MockSequenceStep[] = [...mockSequenceSteps]

/**
 * 🔄 Reset de la DB mock (utile entre les tests)
 */
export const resetMockDb = (): void => {
  tachesDb = [...mockTaches]
  recompensesDb = [...mockRecompenses]
  categoriesDb = [...mockCategories]
  parametresDb = [...mockParametres]
  timelinesDb = [...mockTimelines]
  slotsDb = [...mockSlots]
  sessionsDb = [...mockSessions]
  cardsDb = [...mockCards]
  userCardCategoriesDb = [...mockUserCardCategories]
  sequencesDb = [...mockSequences]
  sequenceStepsDb = [...mockSequenceSteps]
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
  // TIMELINES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/timelines`, ({ request }) => {
    const url = new URL(request.url)
    const childProfileId = url.searchParams
      .get('child_profile_id')
      ?.replace('eq.', '')

    const filtered = childProfileId
      ? timelinesDb.filter(t => t.child_profile_id === childProfileId)
      : timelinesDb

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // ========================================
  // SLOTS
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/slots`, ({ request }) => {
    const url = new URL(request.url)
    const timelineId = url.searchParams
      .get('timeline_id')
      ?.replace('eq.', '')

    let filtered = slotsDb
    if (timelineId) {
      filtered = filtered.filter(s => s.timeline_id === timelineId)
    }
    filtered = [...filtered].sort((a, b) => a.position - b.position)

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/slots`, async ({ request }) => {
    const body = (await request.json()) as Partial<MockSlot>
    const slot: MockSlot = {
      id: `slot-${Date.now()}`,
      timeline_id: body.timeline_id || '',
      kind: body.kind || 'step',
      position: body.position ?? 0,
      card_id: body.card_id ?? null,
      tokens: body.tokens ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    slotsDb.push(slot)
    return HttpResponse.json(slot, { status: 201 })
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/slots`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')
    const timelineId = url.searchParams.get('timeline_id')?.replace('eq.', '')
    const kind = url.searchParams.get('kind')?.replace('eq.', '')
    const updates = (await request.json()) as Partial<MockSlot>

    // Mise à jour par id (updateSlot)
    if (id) {
      const index = slotsDb.findIndex(s => s.id === id)
      if (index !== -1) {
        slotsDb[index] = { ...slotsDb[index], ...updates } as MockSlot
        return HttpResponse.json(slotsDb[index], { status: 200 })
      }
      return HttpResponse.json({ message: 'Slot not found' }, { status: 404 })
    }

    // Mise à jour par timeline_id (clearAllCards — filtre optionnel kind)
    if (timelineId) {
      slotsDb = slotsDb.map(s => {
        if (s.timeline_id !== timelineId) return s
        if (kind && s.kind !== kind) return s
        return { ...s, ...updates }
      })
      return HttpResponse.json(
        slotsDb.filter(s => s.timeline_id === timelineId),
        { status: 200 }
      )
    }

    return HttpResponse.json({ message: 'Filtre manquant' }, { status: 400 })
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/slots`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    const index = slotsDb.findIndex(s => s.id === id)
    if (index !== -1) {
      slotsDb.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }
    return HttpResponse.json({ message: 'Slot not found' }, { status: 404 })
  }),

  // ========================================
  // SESSIONS
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/sessions`, ({ request }) => {
    const url = new URL(request.url)
    const childProfileId = url.searchParams
      .get('child_profile_id')
      ?.replace('eq.', '')
    const timelineId = url.searchParams
      .get('timeline_id')
      ?.replace('eq.', '')
    const stateParam = url.searchParams.get('state')

    let filtered = sessionsDb
    if (childProfileId) {
      filtered = filtered.filter(s => s.child_profile_id === childProfileId)
    }
    if (timelineId) {
      filtered = filtered.filter(s => s.timeline_id === timelineId)
    }
    if (stateParam) {
      // Format PostgREST : in.(active_preview,active_started) ou eq.completed
      if (stateParam.startsWith('in.(')) {
        const states = stateParam.replace('in.(', '').replace(')', '').split(',')
        filtered = filtered.filter(s => states.includes(s.state))
      } else {
        const state = stateParam.replace('eq.', '')
        filtered = filtered.filter(s => s.state === state)
      }
    }

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/sessions`, async ({ request }) => {
    const body = (await request.json()) as Partial<MockSession>
    const session: MockSession = {
      id: `session-${Date.now()}`,
      child_profile_id: body.child_profile_id || '',
      timeline_id: body.timeline_id || '',
      state: body.state || 'active_preview',
      epoch: 1,
      steps_total_snapshot: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    }
    sessionsDb.push(session)
    return HttpResponse.json(session, { status: 201 })
  }),

  // ========================================
  // CARDS (banque + perso — même table Supabase)
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/cards`, ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')?.replace('eq.', '')
    const accountId = url.searchParams.get('account_id')?.replace('eq.', '')

    let filtered = cardsDb
    if (type) filtered = filtered.filter(c => c.type === type)
    if (accountId) filtered = filtered.filter(c => c.account_id === accountId)

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.post(`${SUPABASE_URL}/rest/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as
      | Partial<MockCard>
      | Partial<MockCard>[]
    // usePersonalCards passe un tableau [cardInsert]
    const input: Partial<MockCard> = Array.isArray(body)
      ? (body[0] ?? {})
      : body
    const card: MockCard = {
      id: input.id || `card-${Date.now()}`,
      type: input.type || 'personal',
      name: input.name || '',
      image_url: input.image_url || '',
      account_id: input.account_id ?? null,
      published: input.published ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    cardsDb.push(card)
    return HttpResponse.json(card, { status: 201 })
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/cards`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')
    const updates = (await request.json()) as Partial<MockCard>

    const index = cardsDb.findIndex(c => c.id === id)
    if (index !== -1) {
      cardsDb[index] = { ...cardsDb[index], ...updates } as MockCard
      return HttpResponse.json(cardsDb[index], { status: 200 })
    }
    return HttpResponse.json({ message: 'Card not found' }, { status: 404 })
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/cards`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    const index = cardsDb.findIndex(c => c.id === id)
    if (index !== -1) {
      cardsDb.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }
    return HttpResponse.json({ message: 'Card not found' }, { status: 404 })
  }),

  // ========================================
  // USER_CARD_CATEGORIES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/user_card_categories`, ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')?.replace('eq.', '')

    const filtered = userId
      ? userCardCategoriesDb.filter(u => u.user_id === userId)
      : userCardCategoriesDb

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // POST sert aussi d'upsert (Prefer: resolution=merge-duplicates)
  http.post(
    `${SUPABASE_URL}/rest/v1/user_card_categories`,
    async ({ request }) => {
      const body = (await request.json()) as Partial<MockUserCardCategory>
      const existing = userCardCategoriesDb.findIndex(
        u => u.user_id === body.user_id && u.card_id === body.card_id
      )
      if (existing !== -1) {
        userCardCategoriesDb[existing] = {
          ...userCardCategoriesDb[existing],
          ...body,
        } as MockUserCardCategory
        return HttpResponse.json(userCardCategoriesDb[existing], {
          status: 200,
        })
      }
      const ucc: MockUserCardCategory = {
        id: `ucc-${Date.now()}`,
        user_id: body.user_id || '',
        card_id: body.card_id || '',
        category_id: body.category_id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      userCardCategoriesDb.push(ucc)
      return HttpResponse.json(ucc, { status: 201 })
    }
  ),

  // ========================================
  // SEQUENCES
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/sequences`, ({ request }) => {
    const url = new URL(request.url)
    const accountId = url.searchParams.get('account_id')?.replace('eq.', '')

    const filtered = accountId
      ? sequencesDb.filter(s => s.account_id === accountId)
      : sequencesDb

    return HttpResponse.json(filtered, { status: 200 })
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/sequences`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.replace('eq.', '')

    const index = sequencesDb.findIndex(s => s.id === id)
    if (index !== -1) {
      sequencesDb.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }
    return HttpResponse.json(
      { message: 'Sequence not found' },
      { status: 404 }
    )
  }),

  // ========================================
  // SEQUENCE_STEPS
  // ========================================

  http.get(`${SUPABASE_URL}/rest/v1/sequence_steps`, ({ request }) => {
    const url = new URL(request.url)
    const sequenceId = url.searchParams
      .get('sequence_id')
      ?.replace('eq.', '')

    const filtered = sequenceId
      ? sequenceStepsDb.filter(s => s.sequence_id === sequenceId)
      : sequenceStepsDb

    return HttpResponse.json(filtered, { status: 200 })
  }),

  // ========================================
  // RPC — Séquences
  // ========================================

  http.post(
    `${SUPABASE_URL}/rest/v1/rpc/create_sequence_with_steps`,
    async ({ request }) => {
      const body = (await request.json()) as {
        p_mother_card_id: string
        p_step_card_ids: string[]
      }
      const sequenceId = `sequence-${Date.now()}`
      const sequence: MockSequence = {
        id: sequenceId,
        account_id: TEST_USER_ID,
        mother_card_id: body.p_mother_card_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      sequencesDb.push(sequence)
      body.p_step_card_ids.forEach((cardId, i) => {
        sequenceStepsDb.push({
          id: `step-${Date.now()}-${i}`,
          sequence_id: sequenceId,
          step_card_id: cardId,
          position: i,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      })
      return HttpResponse.json(sequenceId, { status: 200 })
    }
  ),

  http.post(
    `${SUPABASE_URL}/rest/v1/rpc/replace_sequence_steps`,
    async ({ request }) => {
      const body = (await request.json()) as {
        p_sequence_id: string
        p_step_card_ids: string[]
      }
      // Supprimer les étapes existantes et recréer
      sequenceStepsDb = sequenceStepsDb.filter(
        s => s.sequence_id !== body.p_sequence_id
      )
      body.p_step_card_ids.forEach((cardId, i) => {
        sequenceStepsDb.push({
          id: `step-${Date.now()}-${i}`,
          sequence_id: body.p_sequence_id,
          step_card_id: cardId,
          position: i,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      })
      return HttpResponse.json(null, { status: 200 })
    }
  ),

  // ========================================
  // RPC — Sessions
  // ========================================

  http.post(
    `${SUPABASE_URL}/rest/v1/rpc/hard_reset_timeline_session`,
    async () => {
      return HttpResponse.json(null, { status: 200 })
    }
  ),

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
