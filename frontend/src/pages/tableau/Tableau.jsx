/**
 * Page : TableauGrille
 *
 * Rôle :
 *   • Affiche le tableau en grille des tâches du jour
 *   • Permet de réordonner les tâches (glisser-déposer)
 *   • Permet de cocher / décocher chaque tâche individuellement
 *   • Propose un bouton “Réinitialiser” pour décocher toutes les tâches
 *   • Affiche la barre de progression et la récompense du jour
 *
 * Hooks & composants utilisés :
 *   • useTachesDnd(onProgressChange) → {
 *       taches,
 *       toggleDone,
 *       saveOrder,
 *       resetAll
 *     }
 *   • useRecompenses() → {
 *       recompenses,
 *       selectRecompense
 *     }
 *   • ChecklistTachesDnd     – composant “dumb” pour l’affichage et DnD
 *   • TrainProgressBar       – barre de progression
 *   • SelectedRecompense     – affichage + sélection de la récompense
 *
 * Props :
 *   (aucune – page ‘Tableau’ gère tout en interne via hooks)
 */

import { useState } from 'react'
import { useWindowSize } from 'react-use'
import Confetti from 'react-confetti'

import TrainProgressBar from '@/components/train-progress-bar/TrainProgressBar'
import ChecklistTachesDnd from '@/components/checklist/taches-dnd/checklistTachesDnd/ChecklistTachesDnd'
import SelectedRecompense from '@/components/selected-recompense/SelectedRecompense'
import useTachesDnd from '@/hooks/useTachesDnd'
import useRecompenses from '@/hooks/useRecompenses'
import useParametres from '@/hooks/useParametres'
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

  return (
    <div className="tableau-magique">
      <TrainProgressBar
        total={totalTaches}
        done={doneCount}
        onReset={resetAll}
      />

      <ChecklistTachesDnd
        items={taches}
        onReorder={handleReorder}
        onToggle={toggleDone}
        onReset={resetAll}
        showResetButton={false}
      />

      <h1 className="titre-recompense">🎁 Récompense</h1>

      <SelectedRecompense
        recompense={selected}
        done={doneCount}
        total={totalTaches}
        onSelect={selectRecompense}
      />

      {selected &&
        totalTaches > 0 &&
        doneCount === totalTaches &&
        parametres?.confettis && <Confetti width={width} height={height} />}
    </div>
  )
}
