import {
  ModalRecompense,
  SelectedRewardFloating,
  TachesDnd,
  TrainProgressBar,
} from '@/components'
import { FeatureGate } from '@/components/shared/feature-gate/FeatureGate'

import { useDisplay } from '@/contexts'
import { useRecompenses, useTachesDnd } from '@/hooks'
import { useEffect, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import './Tableau.scss'

export default function TableauGrille({ isDemo = false, onLineChange }) {
  const [doneCount, setDoneCount] = useState(0)
  const [totalTaches, setTotalTaches] = useState(0)
  const [showConfettis, setShowConfettis] = useState(false)
  const [showModalRecompense, setShowModalRecompense] = useState(false)

  const { width, height } = useWindowSize()
  const { taches, toggleDone, saveOrder, resetAll } = useTachesDnd(
    (done, total) => {
      setDoneCount(done)
      setTotalTaches(total)
    }
  )
  const { recompenses } = useRecompenses()
  const selected = recompenses.find(
    r => r.selected === true || r.selected === 1
  )
  const { showTrain, showRecompense } = useDisplay()

  const modalTimeoutRef = useRef(null)

  // 🎯 Confettis + modal dynamique
  useEffect(() => {
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current)
      modalTimeoutRef.current = null
    }

    if (totalTaches > 0 && doneCount === totalTaches) {
      // Note: Les confettis sont maintenant contrôlés par FeatureGate
      // Le paramètre confettis de la base n'est plus utilisé pour le contrôle
      // FeatureGate décide si les confettis peuvent s'afficher

      // Déclencher les confettis (FeatureGate contrôlera l'affichage)
      setShowConfettis(true)
      setTimeout(() => setShowConfettis(false), 10000)

      // Toujours afficher la modal de récompense
      setShowModalRecompense(true)

      modalTimeoutRef.current = setTimeout(() => {
        setShowModalRecompense(false)
      }, 13000) // ✅ reste 13 secondes
    } else {
      setShowConfettis(false)
      setShowModalRecompense(false) // ✅ cache modal si une tâche décochée
    }

    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current)
      }
    }
  }, [doneCount, totalTaches])

  return (
    <div className="tableau-magique">
      {showTrain && (
        <FeatureGate feature="trainprogressbar">
        <TrainProgressBar
          total={totalTaches}
          done={doneCount}
          isDemo={isDemo}
          onLineChange={onLineChange}
        />
        </FeatureGate>
      )}

      <TachesDnd
        items={taches}
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

      {showConfettis && <Confetti width={width} height={height} />}

      {showModalRecompense && selected && (
        <ModalRecompense
          isOpen={true}
          onClose={() => setShowModalRecompense(false)} // ✅ fermeture manuelle
          reward={selected}
        />
      )}

      {showRecompense && selected && doneCount < totalTaches && (
        <SelectedRewardFloating reward={selected} />
      )}
    </div>
  )
}
