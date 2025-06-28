/**
 * Rôle :
 *   • Affiche le tableau en grille des tâches du jour
 *   • Permet de réordonner les tâches (glisser-déposer)
 *   • Permet de cocher / décocher chaque tâche individuellement
 *   • Propose un bouton “Réinitialiser” pour décocher toutes les tâches
 *   • Affiche la barre de progression et la récompense du jour
 */

import { useState } from 'react'
import { useWindowSize } from 'react-use'
import Confetti from 'react-confetti'
import { NavLink } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { motion } from 'framer-motion'
import { TrainProgressBar, TachesDnd, SelectedRecompense } from '@/components'
import { useDisplay } from '@/contexts'
import { useTachesDnd, useRecompenses, useParametres } from '@/hooks'
import './Tableau.scss'

export default function TableauGrille() {
  const [doneCount, setDoneCount] = useState(0)
  const [totalTaches, setTotalTaches] = useState(0)

  const { width, height } = useWindowSize()
  const { parametres } = useParametres()

  const { taches, toggleDone, saveOrder, resetAll } = useTachesDnd(
    (done, total) => {
      setDoneCount(done)
      setTotalTaches(total)
    }
  )

  const handleReorder = (newOrderIds) => {
    const newList = newOrderIds.map((id) => taches.find((t) => t.id === id))
    saveOrder(newList)
  }

  const { recompenses, selectRecompense } = useRecompenses()
  const selected = recompenses.find((r) => r.selected === 1)
  const { showTrain, showRecompense } = useDisplay()

  return (
    <div className="tableau-magique">
      <motion.div
        className="floating-pencil"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <NavLink to="/edition" aria-label="édition" title="édition">
          <Pencil size={20} strokeWidth={2} />
        </NavLink>
      </motion.div>

      {showTrain && <TrainProgressBar total={totalTaches} done={doneCount} />}

      <TachesDnd
        items={taches}
        onReorder={handleReorder}
        onToggle={toggleDone}
        onReset={resetAll}
      />

      {showRecompense && (
        <>
          <h1 className="titre-recompense">🎁 Récompense</h1>
          <SelectedRecompense
            recompense={selected}
            done={doneCount}
            total={totalTaches}
            onSelect={selectRecompense}
          />
        </>
      )}

      {selected &&
        totalTaches > 0 &&
        doneCount === totalTaches &&
        parametres?.confettis && <Confetti width={width} height={height} />}
    </div>
  )
}
