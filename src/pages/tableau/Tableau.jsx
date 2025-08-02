import { useState, useEffect, useRef } from 'react'
import { useWindowSize } from 'react-use'
import Confetti from 'react-confetti'
import {
  TrainProgressBar,
  TachesDnd,
  SelectedRewardFloating,
  ModalRecompense,
  FloatingPencil,
} from '@/components'
import { useDisplay } from '@/contexts'
import { useTachesDnd, useRecompenses } from '@/hooks'
import { supabase } from '@/utils'
import './Tableau.scss'

export default function TableauGrille() {
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
      supabase
        .from('parametres')
        .select('confettis')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('❌ Erreur fetch confettis :', error)
          } else {
            if (data?.confettis) {
              setShowConfettis(true)
              setTimeout(() => setShowConfettis(false), 10000)
            }

            setShowModalRecompense(true)

            modalTimeoutRef.current = setTimeout(() => {
              setShowModalRecompense(false)
            }, 13000) // ✅ reste 13 secondes
          }
        })
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
      <FloatingPencil />

      {showTrain && <TrainProgressBar total={totalTaches} done={doneCount} />}

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
