import {
  ModalRecompense,
  PersonalizationModal,
  SelectedRewardFloating,
  TachesDnd,
  TrainProgressBar,
} from '@/components'
import DebugRole from '@/components/DebugRole'
import { FeatureGate } from '@/components/shared/feature-gate/FeatureGate'

import { useDisplay, usePermissions } from '@/contexts'
import {
  useDemoData,
  useFallbackData,
  useRecompenses,
  useSimpleRole,
  useTachesDnd,
} from '@/hooks'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const { role: simpleRole, loading: roleLoading } = useSimpleRole()

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
  const { demoTaches, demoRecompenses } = useDemoData()
  const { fallbackData, loading: fallbackLoading } = useFallbackData()
  const {
    taches: personalTaches,
    doneMap: personalDoneMap,
    toggleDone: personalToggleDone,
    saveOrder: personalSaveOrder,
    resetAll: personalResetAll,
  } = useTachesDnd((done, total) => {
    setDoneCount(done)
    setTotalTaches(total)
  })
  const { recompenses: personalRecompenses } = useRecompenses()

  // En mode démo, créer des fonctions de toggle temporaires
  const [demoTachesState, setDemoTachesState] = useState([])
  const [demoDoneMap, setDemoDoneMap] = useState({})

  useEffect(() => {
    if (isDemoMode) {
      const initialTaches = demoTaches.map(t => ({ ...t, done: false }))
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
    return personalTaches.length > 0
      ? personalTaches
      : fallbackData?.tasks || []
  }, [isDemoMode, demoTachesState, personalTaches, fallbackData?.tasks])

  const recompenses = useMemo(() => {
    if (isDemoMode) return demoRecompenses
    return personalRecompenses.length > 0
      ? personalRecompenses
      : fallbackData?.rewards || []
  }, [isDemoMode, demoRecompenses, personalRecompenses, fallbackData?.rewards])

  const doneMap = isDemoMode ? demoDoneMap : personalDoneMap

  const toggleDone = isDemoMode
    ? (id, newDone) => {
        // Debug logs désactivés pour réduire le bruit dans la console
        // if (import.meta.env.DEV) {
        //   console.log('🔍 Toggle démo:', { id, newDone, isDemoMode })
        // }
        setDemoTachesState(prev => {
          const updated = prev.map(t =>
            t.id === id ? { ...t, done: newDone } : t
          )
          // Mettre à jour le compteur
          const newDoneCount = updated.filter(t => t.done).length
          setDoneCount(newDoneCount)
          // if (import.meta.env.DEV) {
          //   console.log('🔍 État mis à jour:', updated)
          // }
          return updated
        })
        // Mettre à jour le doneMap pour l'affichage
        setDemoDoneMap(prev => ({
          ...prev,
          [id]: newDone,
        }))
      }
    : personalToggleDone

  const saveOrder = isDemoMode
    ? newList => {
        // En mode démo, mettre à jour l'état local
        setDemoTachesState(newList)
      }
    : personalSaveOrder
  const resetAll = isDemoMode
    ? () => {
        setDemoTachesState(prev => prev.map(t => ({ ...t, done: false })))
        setDemoDoneMap(prev =>
          Object.fromEntries(Object.keys(prev).map(id => [id, false]))
        )
        setDoneCount(0)
      }
    : personalResetAll

  const selected = recompenses.find(
    r => r.selected === true || r.selected === 1
  )
  const { showTrain, showRecompense } = useDisplay()

  // Pour les visiteurs, sélectionner automatiquement la première récompense
  const selectedReward = useMemo(() => {
    if (isDemoMode && recompenses.length > 0) {
      // En mode démo, toujours retourner la première récompense
      return recompenses[0]
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
      // Pour les visiteurs : pas de confettis, mais modal de récompense
      if (isDemoMode) {
        // Mode démo : pas de confettis, juste la modal
        setShowConfettis(false)
        setShowModalRecompense(true)

        modalTimeoutRef.current = setTimeout(() => {
          setShowModalRecompense(false)
        }, 5000) // Modal plus courte pour les visiteurs
      } else {
        // Mode normal : confettis + modal
        setShowConfettis(true)
        setTimeout(() => setShowConfettis(false), 10000)
        setShowModalRecompense(true)

        modalTimeoutRef.current = setTimeout(() => {
          setShowModalRecompense(false)
        }, 13000)
      }
    } else {
      setShowConfettis(false)
      setShowModalRecompense(false) // ✅ cache modal si une tâche décochée
    }

    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
      }
    }
  }, [doneCount, totalTaches, isDemoMode])

  return (
    <div className="tableau-magique">
      <DebugRole />
      {showTrain && (
        <FeatureGate feature="trainprogressbar">
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
        </FeatureGate>
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
          const newList = ids.map(id => taches.find(t => t.id === id))
          saveOrder(newList)
        }}
        onToggle={toggleDone}
        onReset={() => {
          resetAll()
          setShowModalRecompense(false) // ✅ ferme modal si reset
        }}
      />

      {showConfettis && !isDemoMode && (
        <Confetti width={width} height={height} />
      )}

      {showModalRecompense && selectedReward && (
        <ModalRecompense
          isOpen={true}
          onClose={() => setShowModalRecompense(false)} // ✅ fermeture manuelle
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
