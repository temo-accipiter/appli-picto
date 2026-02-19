// src/hooks/useDemoCards.ts
/**
 * Hook pour les cartes de démonstration (mode visiteur).
 *
 * ⚠️ MIGRATION (Fév 2025) : La table `demo_cards` a été supprimée.
 * Dans le nouveau UX, les visiteurs non connectés voient les cartes publiques
 * créées par l'admin (system "cards banque"), pas des cartes de démo.
 *
 * Ce hook retourne désormais des tableaux vides sans aucune requête Supabase.
 * Il est conservé pour compatibilité d'interface avec Tableau.tsx, en attendant
 * la migration complète vers le système de cards publiques admin.
 */

// Interfaces conservées pour compatibilité d'interface
interface DemoCard {
  id: string
  card_type: 'task' | 'reward'
  label: string
  imagepath?: string | null
  position: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface DemoTache {
  id: string
  label: string
  fait: boolean
  position: number
  imagepath?: string | null
  category_id?: string | null
  isDemo: true
}

interface DemoRecompense {
  id: string
  label: string
  selected?: boolean
  imagepath?: string | null
  isDemo: true
}

interface DemoCardStats {
  total: number
  active: number
  inactive: number
  tasks: number
  rewards: number
}

interface CreateDemoCardInput {
  type: 'task' | 'reward'
  label: string
  imagepath?: string
  position: number
}

interface UseDemoCardsReturn {
  demoCards: DemoCard[]
  demoTasks: DemoTache[]
  demoRewards: DemoRecompense[]
  loading: boolean
  error: string | null
  stats: DemoCardStats
  getCardsByType: (type: 'task' | 'reward') => DemoCard[]
  getActiveCards: () => DemoCard[]
  getInactiveCards: () => DemoCard[]
  createDemoCard: (input: CreateDemoCardInput) => Promise<DemoCard | null>
  updateDemoCard: (
    id: string,
    updates: Partial<DemoCard>
  ) => Promise<DemoCard | null>
  deleteDemoCard: (id: string) => Promise<boolean>
  reorderDemoCards: (orderedIds: string[]) => Promise<boolean>
  toggleDemoCard: (id: string, isActive: boolean) => Promise<DemoCard | null>
  refresh: () => Promise<void>
}

const EMPTY_STATS: DemoCardStats = {
  total: 0,
  active: 0,
  inactive: 0,
  tasks: 0,
  rewards: 0,
}

export default function useDemoCards(): UseDemoCardsReturn {
  return {
    demoCards: [],
    demoTasks: [],
    demoRewards: [],
    loading: false,
    error: null,
    stats: EMPTY_STATS,
    getCardsByType: () => [],
    getActiveCards: () => [],
    getInactiveCards: () => [],
    createDemoCard: async () => null,
    updateDemoCard: async () => null,
    deleteDemoCard: async () => false,
    reorderDemoCards: async () => false,
    toggleDemoCard: async () => null,
    refresh: async () => {},
  }
}
