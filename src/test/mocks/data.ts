// src/test/mocks/data.ts
/**
 * 📦 Données mock pour les tests
 *
 * Données réutilisables pour simuler Supabase dans les tests
 */

// ✅ Utiliser des UUIDs valides pour les tests
export const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000'
export const ADMIN_USER_ID = '223e4567-e89b-12d3-a456-426614174000'

interface MockUser {
  id: string
  email: string
  created_at: string
}

export const mockUsers: {
  testUser: MockUser
  adminUser: MockUser
} = {
  testUser: {
    id: TEST_USER_ID,
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  },
  adminUser: {
    id: ADMIN_USER_ID,
    email: 'admin@example.com',
    created_at: '2024-01-01T00:00:00Z',
  },
}

export interface MockTache {
  id: string
  label: string
  fait: boolean
  aujourdhui: boolean
  position: number
  imagepath: string | null
  category_id: string | null
  user_id: string
  created_at: string
}

export const mockTaches: MockTache[] = [
  {
    id: '1',
    label: 'Brosser les dents',
    fait: false,
    aujourdhui: true,
    position: 0,
    imagepath: null,
    category_id: null,
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    label: 'Ranger sa chambre',
    fait: false,
    aujourdhui: true,
    position: 1,
    imagepath: 'images/room.jpg',
    category_id: '1',
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    label: 'Faire ses devoirs',
    fait: true,
    aujourdhui: false,
    position: 2,
    imagepath: null,
    category_id: null,
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockRecompense {
  id: string
  label: string
  imagepath: string | null
  selected: boolean
  user_id: string
  created_at: string
}

export const mockRecompenses: MockRecompense[] = [
  {
    id: '1',
    label: 'Temps de jeu vidéo',
    imagepath: 'images/gaming.jpg',
    selected: true,
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    label: 'Sortie au parc',
    imagepath: null,
    selected: false,
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockCategory {
  id: string
  name: string
  color: string
  user_id: string | null
  created_at: string
}

export const mockCategories: MockCategory[] = [
  {
    id: '1',
    name: 'École',
    color: '#3B82F6',
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Maison',
    color: '#10B981',
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'global-1',
    name: 'Hygiène',
    color: '#8B5CF6',
    user_id: null, // Catégorie globale
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockParametre {
  id: string
  confettis: boolean
  user_id: string
  created_at: string
}

export const mockParametres: MockParametre[] = [
  {
    id: '1',
    confettis: true,
    user_id: TEST_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockDemoTask {
  id: string
  label: string
  fait: boolean
  position: number
  isDemo: true
}

export interface MockDemoReward {
  id: string
  label: string
  isDemo: true
}

export const mockDemoCards: {
  tasks: MockDemoTask[]
  rewards: MockDemoReward[]
} = {
  tasks: [
    {
      id: 'demo-1',
      label: 'Se brosser les dents',
      fait: false,
      position: 0,
      isDemo: true,
    },
    {
      id: 'demo-2',
      label: 'Ranger son cartable',
      fait: false,
      position: 1,
      isDemo: true,
    },
  ],
  rewards: [
    {
      id: 'demo-reward-1',
      label: '15 min de jeu',
      isDemo: true,
    },
  ],
}

export interface MockProfile {
  id: string
  email: string
  account_status: string
  created_at: string
}

export const mockProfiles: MockProfile[] = [
  {
    id: 'test-user-123',
    email: 'test@example.com',
    account_status: 'active',
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockAbonnement {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  created_at: string
}

export const mockAbonnements: MockAbonnement[] = [
  {
    id: '1',
    user_id: TEST_USER_ID,
    stripe_customer_id: 'cus_test123',
    stripe_subscription_id: 'sub_test123',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
  },
]

export interface MockStation {
  id: string
  name: string
  ligne: number
}

export const mockStations: MockStation[] = [
  { id: '1', name: 'Châtelet', ligne: 1 },
  { id: '2', name: 'Gare du Nord', ligne: 1 },
  { id: '3', name: 'République', ligne: 1 },
]

// ─── Tables Tableau (timelines, slots, sessions, cards, sequences…) ────────────

export interface MockTimeline {
  id: string
  child_profile_id: string
  created_at: string
  updated_at: string
}

export const mockTimelines: MockTimeline[] = []

export interface MockSlot {
  id: string
  timeline_id: string
  kind: 'step' | 'reward'
  position: number
  card_id: string | null
  tokens: number | null
  created_at: string
  updated_at: string
}

export const mockSlots: MockSlot[] = []

export interface MockSession {
  id: string
  child_profile_id: string
  timeline_id: string
  state: 'active_preview' | 'active_started' | 'completed'
  epoch: number
  steps_total_snapshot: number | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export const mockSessions: MockSession[] = []

export interface MockCard {
  id: string
  type: 'bank' | 'personal'
  name: string
  image_url: string
  account_id: string | null
  published: boolean | null
  created_at: string
  updated_at: string
}

export const mockCards: MockCard[] = []

export interface MockUserCardCategory {
  id: string
  user_id: string
  card_id: string
  category_id: string
  created_at: string
  updated_at: string
}

export const mockUserCardCategories: MockUserCardCategory[] = []

export interface MockSequence {
  id: string
  account_id: string
  mother_card_id: string
  created_at: string
  updated_at: string
}

export const mockSequences: MockSequence[] = []

export interface MockSequenceStep {
  id: string
  sequence_id: string
  step_card_id: string
  position: number
  created_at: string
  updated_at: string
}

export const mockSequenceSteps: MockSequenceStep[] = []
