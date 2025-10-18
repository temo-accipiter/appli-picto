// src/pages/tableau/Tableau.jsx
import {
  ModalRecompense,
  PersonalizationModal,
  SelectedRewardFloating,
  TachesDnd,
  TrainProgressBar,
} from '@/components'
import DebugRole from '@/tools/debug-role/DebugRole'

import { useDisplay, usePermissions } from '@/contexts'
import {
  useDemoCards,
  useFallbackData,
  useParametres,
  useRecompenses,
  useSimpleRole,
  useTachesDnd,
} from '@/hooks'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import './Tableau.scss'

export default function TableauGrille({ isDemo = false, onLineChange }) {
  const [doneCount, setDoneCount] = useState(0)
  const [totalTaches, setTotalTaches] = useState(0)
  const [showConfettis, setShowConfettis] = useState(false)
  const [showModalRecompense, setShowModalRecompense] = useState(false)
  const [showPersonalizationModal, setShowPersonalizationModal] =
    useState(false)

  const { width, height } = useWindowSize()
  const { role: permissionsRole } = usePermissions()
  const { role: simpleRole /*, loading: _roleLoading*/ } = useSimpleRole()

  // Utiliser le rôle simple en priorité, fallback vers permissions
  const role = simpleRole !== 'unknown' ? simpleRole : permissionsRole

  // Détecter automatiquement le mode démo si pas spécifié
  const isDemoMode = isDemo || role === 'visitor'

  // Debug pour vérifier le mode (une seule fois)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 Tableau - Mode démo:', { isDemo, role, isDemoMode })
    }
  }, [isDemo, role, isDemoMode])

  // Gérer le changement de ligne pour les visiteurs
  const handleLineChange = action => {
    if (isDemoMode && action === 'line_change') {
      setShowPersonalizationModal(true)
    } else if (onLineChange) {
      onLineChange(action)
    }
  }

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
  })
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
  const [demoTachesState, setDemoTachesState] = useState([])
  const [demoDoneMap, setDemoDoneMap] = useState({})

  useEffect(() => {
    if (isDemoMode) {
      const initialTaches = (demoTaches ?? []).map(t => ({
        ...t,
        done: false,
        isDemo: true,
      }))
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
      ? fallbackData.tasks
      : []
    return personalTaches.length > 0 ? personalTaches : fallbackTasks
  }, [isDemoMode, demoTachesState, personalTaches, fallbackData?.tasks])

  const recompenses = useMemo(() => {
    if (isDemoMode) {
      return Array.isArray(demoRecompenses)
        ? demoRecompenses.map(r => ({ ...r, isDemo: true }))
        : []
    }
    const fallbackRewards = Array.isArray(fallbackData?.rewards)
      ? fallbackData.rewards
      : []
    return personalRecompenses.length > 0
      ? personalRecompenses
      : fallbackRewards
  }, [isDemoMode, demoRecompenses, personalRecompenses, fallbackData?.rewards])

  const doneMap = isDemoMode ? demoDoneMap : personalDoneMap

  // Mémoïser les fonctions pour éviter re-renders inutiles de TachesDnd
  const toggleDone = useCallback(
    (id, newDone) => {
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
    newList => {
      if (isDemoMode) {
        // En mode démo, mettre à jour l'état local
        setDemoTachesState(Array.isArray(newList) ? newList : [])
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
    r => r?.selected === true || r?.selected === 1
  )
  const { showTrain, showRecompense } = useDisplay()

  // Pour les visiteurs, sélectionner automatiquement la première récompense
  const selectedReward = useMemo(() => {
    const list = Array.isArray(recompenses) ? recompenses : []
    if (isDemoMode && list.length > 0) {
      return list[0]
    }
    return selected
  }, [isDemoMode, recompenses, selected])

  const modalTimeoutRef = useRef(null)

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
  }, [doneCount, totalTaches, isDemoMode])

  // ⚠️ Sécurise .find() lors du reorder
  const safeTaches = Array.isArray(taches) ? taches : []

  return (
    <div className="tableau-magique">
      <DebugRole />
      {showTrain && (
        <>
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
              onLineChange={onLineChange}
            />
          )}
        </>
      )}

      {/* Indicateur de chargement fallback */}
      {!isDemoMode && fallbackLoading && personalTaches.length === 0 && (
        <div className="loading-fallback">
          <p>🔄 Chargement de vos données...</p>
        </div>
      )}

      <TachesDnd
        items={taches}
        doneMap={doneMap}
        onReorder={ids => {
          const newList = (ids ?? [])
            .map(id => safeTaches.find(t => t?.id === id))
            .filter(Boolean)
          saveOrder(newList)
        }}
        onToggle={toggleDone}
        onReset={() => {
          resetAll()
          setShowModalRecompense(false)
        }}
      />

      {showConfettis && !isDemoMode && (
        <Confetti width={width} height={height} />
      )}

      {showModalRecompense && selectedReward && (
        <ModalRecompense
          isOpen={true}
          onClose={() => setShowModalRecompense(false)}
          reward={selectedReward}
        />
      )}

      {showRecompense && selectedReward && doneCount < totalTaches && (
        <SelectedRewardFloating reward={selectedReward} />
      )}

      {/* Modal de personnalisation pour les visiteurs */}
      <PersonalizationModal
        isOpen={showPersonalizationModal}
        onClose={() => setShowPersonalizationModal(false)}
      />
    </div>
  )
}

TableauGrille.propTypes = {
  isDemo: PropTypes.bool,
  onLineChange: PropTypes.func,
}
