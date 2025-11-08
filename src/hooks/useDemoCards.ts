// src/hooks/useDemoCards.ts
/**
 * Hook pour les cartes de démonstration (mode visiteur)
 * Fournit des tâches et récompenses prédéfinies sans compte utilisateur
 */
import { useMemo } from 'react'

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

interface UseDemoCardsReturn {
  demoTasks: DemoTache[]
  demoRewards: DemoRecompense[]
}

export default function useDemoCards(): UseDemoCardsReturn {
  const demoTasks = useMemo<DemoTache[]>(
    () => [
      {
        id: 'demo-1',
        label: 'Se brosser les dents',
        fait: false,
        position: 0,
        imagepath: null,
        category_id: null,
        isDemo: true,
      },
      {
        id: 'demo-2',
        label: 'Ranger son cartable',
        fait: false,
        position: 1,
        imagepath: null,
        category_id: null,
        isDemo: true,
      },
      {
        id: 'demo-3',
        label: 'Prendre son goûter',
        fait: false,
        position: 2,
        imagepath: null,
        category_id: null,
        isDemo: true,
      },
    ],
    []
  )

  const demoRewards = useMemo<DemoRecompense[]>(
    () => [
      {
        id: 'demo-reward-1',
        label: '15 min de jeu',
        selected: false,
        imagepath: null,
        isDemo: true,
      },
    ],
    []
  )

  return { demoTasks, demoRewards }
}
