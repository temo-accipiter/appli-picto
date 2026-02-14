'use client'

// src/pages/tableau/Tableau.tsx
import {
  FloatingTimeTimer,
  SelectedRewardFloating,
  TachesDnd,
  TrainProgressBar,
} from '@/components'

import { useDisplay } from '@/contexts'
import {
  useDemoCards,
  useFallbackData,
  useI18n,
  useIsVisitor,
  useParametres,
  useRecompenses,
  useTachesDnd,
} from '@/hooks'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { useWindowSize } from 'react-use'

// Lazy load Confetti (utilisé seulement quand toutes les tâches sont terminées)
const Confetti = lazy(() => import('react-confetti'))

// Lazy load des modales (affichées conditionnellement)
const ModalRecompense = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalRecompense }))
)
const PersonalizationModal = lazy(() =>
  import('@/components').then(m => ({ default: m.PersonalizationModal }))
)

import type { Tache, Recompense } from '@/types/global'
import './Tableau.scss'

interface DemoTache extends Tache {
  done?: boolean
  isDemo: boolean
}

interface RewardWithDemo extends Recompense {
  isDemo?: boolean
}

interface TableauGrilleProps {
  isDemo?: boolean
  onLineChange?: (action: string) => void
}

export default function TableauGrille({
  isDemo = false,
  onLineChange,
}: TableauGrilleProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const [reloadKey, setReloadKey] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const [totalTaches, setTotalTaches] = useState(0)
  const [showConfettis, setShowConfettis] = useState(false)
  const [showModalRecompense, setShowModalRecompense] = useState(false)
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false)

  const { width, height } = useWindowSize()
  const { isVisitor } = useIsVisitor()

  // Détecter automatiquement le mode démo si pas spécifié
  const isDemoMode = isDemo || isVisitor

  // Gérer le changement de ligne pour les visiteurs
  const handleLineChange = (action: string) => {
    if (isDemoMode && action === 'line_change') {
      setShowPersonalizationModal(true)
    } else if (onLineChange) {
      onLineChange(action)
    }
  }

  // Recharger les tâches quand on revient sur /tableau depuis une autre page
  const prevPathRef = useRef<string | null>(null) // null au départ pour détecter le premier mount
  useEffect(() => {
    const currentPath = pathname
    const prevPath = prevPathRef.current

    // Si on revient sur /tableau depuis une autre page (pas au premier mount)
    if (
      currentPath === '/tableau' &&
      prevPath !== null &&
      prevPath !== '/tableau'
    ) {
      setReloadKey(prev => prev + 1)
    }

    prevPathRef.current = currentPath
  }, [pathname])

  // Données selon le mode (démo ou personnel)
  const { demoTasks: demoTaches, demoRewards: demoRecompenses } = useDemoCards()
  const { fallbackData, loading: fallbackLoading } = useFallbackData()
  const {
    taches: personalTachesRaw,
    doneMap: personalDoneMapRaw,
    toggleDone: personalToggleDone,
    saveOrder: personalSaveOrder,
    resetAll: personalResetAll,
  } = useTachesDnd((done, total) => {
    setDoneCount(done)
    setTotalTaches(total)
  }, reloadKey)
  const { recompenses: personalRecompensesRaw } = useRecompenses()
  const { parametres } = useParametres()

  // ⚠️ Garde-fous : toujours travailler sur des tableaux (avec useMemo pour éviter re-création)
  const personalTaches = useMemo(
    () => (Array.isArray(personalTachesRaw) ? personalTachesRaw : []),
    [personalTachesRaw]
  )
  const personalRecompenses = useMemo(
    () => (Array.isArray(personalRecompensesRaw) ? personalRecompensesRaw : []),
    [personalRecompensesRaw]
  )
  const personalDoneMap = personalDoneMapRaw ?? {}

  // En mode démo, créer des fonctions de toggle temporaires
  const [demoTachesState, setDemoTachesState] = useState<DemoTache[]>([])
  const [demoDoneMap, setDemoDoneMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isDemoMode) {
      const initialTaches = (demoTaches ?? []).map(
        t =>
          ({
            ...t,
            done: false,
            isDemo: true,
          }) as DemoTache
      )
      setDemoTachesState(initialTaches)
      setTotalTaches(initialTaches.length)
      setDoneCount(0)
      // Initialiser le doneMap pour le mode démo
      const initialDoneMap = Object.fromEntries(
        initialTaches.map(t => [t.id, false])
      )
      setDemoDoneMap(initialDoneMap)
    }
  }, [isDemoMode, demoTaches])

  // Utiliser les données de démo, fallback ou personnelles selon le mode
  const taches = useMemo(() => {
    if (isDemoMode) return demoTachesState
    const fallbackTasks = Array.isArray(fallbackData?.tasks)
      ? (fallbackData.tasks as Tache[]).filter(
          (t: Tache) => t.aujourdhui === true
        )
      : []
    return personalTaches.length > 0 ? personalTaches : fallbackTasks
  }, [isDemoMode, demoTachesState, personalTaches, fallbackData?.tasks])

  const recompenses: RewardWithDemo[] = useMemo(() => {
    if (isDemoMode) {
      return Array.isArray(demoRecompenses)
        ? (demoRecompenses as unknown as Recompense[]).map(
            (r: Recompense) => ({ ...r, isDemo: true }) as RewardWithDemo
          )
        : []
    }
    const fallbackRewards = Array.isArray(fallbackData?.rewards)
      ? (fallbackData.rewards as Recompense[])
      : []
    return personalRecompenses.length > 0
      ? personalRecompenses
      : fallbackRewards
  }, [isDemoMode, demoRecompenses, personalRecompenses, fallbackData?.rewards])

  const doneMap = isDemoMode ? demoDoneMap : personalDoneMap

  // Mémoïser les fonctions pour éviter re-renders inutiles de TachesDnd
  const toggleDone = useCallback(
    (id: string | number, newDone: boolean) => {
      if (isDemoMode) {
        setDemoTachesState(prev => {
          const updated = prev.map(t =>
            t.id === id ? { ...t, done: newDone } : t
          )
          // Mettre à jour le compteur
          const newDoneCount = updated.filter(t => t.done).length
          setDoneCount(newDoneCount)
          return updated
        })
        // Mettre à jour le doneMap pour l'affichage
        setDemoDoneMap(prev => ({
          ...prev,
          [id]: newDone,
        }))
      } else {
        personalToggleDone(id, newDone)
      }
    },
    [isDemoMode, personalToggleDone]
  )

  const saveOrder = useCallback(
    (newList: Tache[]) => {
      if (isDemoMode) {
        // En mode démo, mettre à jour l'état local
        setDemoTachesState(
          (Array.isArray(newList) ? newList : []) as DemoTache[]
        )
      } else {
        personalSaveOrder(newList)
      }
    },
    [isDemoMode, personalSaveOrder]
  )

  const resetAll = useCallback(() => {
    if (isDemoMode) {
      setDemoTachesState(prev => prev.map(t => ({ ...t, done: false })))
      setDemoDoneMap(prev =>
        Object.fromEntries(Object.keys(prev).map(id => [id, false]))
      )
      setDoneCount(0)
    } else {
      personalResetAll()
    }
  }, [isDemoMode, personalResetAll])

  // ⚠️ Sécurise l'accès à .find()
  const selected = (Array.isArray(recompenses) ? recompenses : []).find(
    r => r?.selected === true
  )
  const { showTrain, showRecompense, showTimeTimer } = useDisplay()

  // Pour les visiteurs, sélectionner automatiquement la première récompense
  const selectedReward = useMemo(() => {
    const list = Array.isArray(recompenses) ? recompenses : []
    if (isDemoMode && list.length > 0) {
      return list[0]
    }
    return selected
  }, [isDemoMode, recompenses, selected])

  const modalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 🎯 Confettis + modal dynamique
  useEffect(() => {
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current)
      modalTimeoutRef.current = null
    }

    if (totalTaches > 0 && doneCount === totalTaches) {
      if (isDemoMode) {
        setShowConfettis(false)
        setShowModalRecompense(true)

        modalTimeoutRef.current = setTimeout(() => {
          setShowModalRecompense(false)
        }, 5000)
      } else {
        // Activer les confettis seulement si le paramètre global le permet
        const confettisEnabled = parametres?.confettis !== false
        setShowConfettis(confettisEnabled)
        setTimeout(() => setShowConfettis(false), 10000)
        setShowModalRecompense(true)

        modalTimeoutRef.current = setTimeout(() => {
          setShowModalRecompense(false)
        }, 13000)
      }
    } else {
      setShowConfettis(false)
      setShowModalRecompense(false)
    }

    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, totalTaches, isDemoMode])

  // ⚠️ Sécurise .find() lors du reorder
  const safeTaches: Tache[] = Array.isArray(taches) ? (taches as Tache[]) : []

  return (
    <div className="tableau-magique">
      {/* WCAG 2.4.6 - Structure sémantique avec h1 pour lecteurs d'écran */}
      <h1 className="sr-only">{t('tableau.title')}</h1>

      {showTrain && (
        <section aria-labelledby="progress-heading">
          <h2 id="progress-heading" className="sr-only">
            {t('tableau.progress')}
          </h2>
          {isDemoMode ? (
            <TrainProgressBar
              total={totalTaches}
              done={doneCount}
              isDemo={true}
              onLineChange={handleLineChange}
            />
          ) : (
            <TrainProgressBar
              total={totalTaches}
              done={doneCount}
              isDemo={isDemo}
              {...(onLineChange !== undefined && { onLineChange })}
            />
          )}
        </section>
      )}

      {/* Indicateur de chargement fallback */}
      {!isDemoMode && fallbackLoading && personalTaches.length === 0 && (
        <div className="loading-fallback">
          <p>🔄 {t('tableau.loadingData')}</p>
        </div>
      )}

      <section
        className="tableau-magique__content"
        aria-labelledby="tasks-heading"
      >
        <h2 id="tasks-heading" className="sr-only">
          {t('tasks.title')}
        </h2>
        <TachesDnd
          items={safeTaches}
          doneMap={doneMap}
          onReorder={(ids: (string | number)[]) => {
            const newList = (ids ?? [])
              .map(id => safeTaches.find(t => t?.id === id))
              .filter((t): t is Tache => Boolean(t))
            saveOrder(newList)
          }}
          onToggle={toggleDone}
          onReset={() => {
            resetAll()
            setShowModalRecompense(false)
          }}
        />
      </section>

      {/* Time Timer flottant (toujours affiché, déplaçable) */}
      {showTimeTimer && <FloatingTimeTimer />}

      {showConfettis && !isDemoMode && (
        <Suspense fallback={null}>
          <Confetti width={width} height={height} />
        </Suspense>
      )}

      {showModalRecompense && selectedReward && (
        <Suspense fallback={null}>
          <ModalRecompense
            isOpen={true}
            onClose={() => setShowModalRecompense(false)}
            reward={selectedReward}
          />
        </Suspense>
      )}

      {showRecompense && selectedReward && doneCount < totalTaches && (
        <SelectedRewardFloating reward={selectedReward} />
      )}

      {/* Modal de personnalisation pour les visiteurs */}
      <Suspense fallback={null}>
        <PersonalizationModal
          isOpen={showPersonalizationModal}
          onClose={() => setShowPersonalizationModal(false)}
        />
      </Suspense>
    </div>
  )
}
