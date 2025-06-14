import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { COULEURS_LIGNES } from '@/data/colors'
import Modal from '@/components/modal/Modal'
import './TrainProgressBar.scss'
import useStations from '@/hooks/useStations'

export default function TrainProgressBar({ total, done, onReset, ready }) {
  const [ligne, setLigne] = useState(() => localStorage.getItem('ligne') || '1')
  const couleur = COULEURS_LIGNES[ligne] || '#999'
  const stationCount = total + 1

  const { stations: ligneStations, loading, error } = useStations(ligne)
  const [currentStations, setCurrentStations] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--couleur-ligne', couleur)
  }, [couleur])

  useEffect(() => {
    if (!loading && ligneStations.length > 0) {
      setCurrentStations(ligneStations)
    }
  }, [loading, ligneStations])

  if (!ready || loading) return null

  if (error) return <p>Erreur lors du chargement des stations.</p>

  const stations = Array.from({ length: stationCount }, (_, i) => ({
    label: currentStations[i % currentStations.length] || '',
    left: stationCount <= 1 ? '0%' : `${(i / (stationCount - 1)) * 100}%`,
    isActive: i === done,
  }))

  const isLast = stationCount > 1 && done === stationCount - 1
  const trainStyle = {
    left:
      stationCount <= 1
        ? '0%'
        : isLast
          ? 'calc(100% - 40px)'
          : `${(done / (stationCount - 1)) * 100}%`,
    transform: stationCount <= 1 || isLast ? 'none' : 'translateX(-50%)',
  }

  return (
    <div className="train-progress-bar">
      <div className="metroline">
        <svg viewBox="0 0 1000 60" className="metrosvg">
          <path
            d="M 0 30 H 1000"
            className="rail-line"
            style={{ stroke: couleur }}
          />
        </svg>

        {stations.map(({ label, left, isActive }, index) => {
          const isLastStation = index === stations.length - 1

          return (
            <div
              key={index}
              className={`station ${isActive ? 'active' : ''} ${done > index && !isLastStation ? 'passed' : ''}`}
              style={{ left }}
            >
              <div className="label" title={label}>
                {label}
              </div>
              {isLastStation ? (
                <div className={`dot-logo ${isActive ? 'arrivee' : ''}`}>
                  <img
                    src={`/src/assets/images/ligne/ligne${ligne}.png`}
                    alt={`Ligne ${ligne}`}
                  />
                </div>
              ) : (
                <div className="dot" />
              )}
            </div>
          )
        })}

        <div className="train" style={trainStyle}>
          <img
            src="/src/assets/images/train.png"
            alt="Métro"
            className="train-icon"
          />
        </div>
      </div>

      <div className="toolbar">
        <div className="ligne-select">
          <label htmlFor="ligne">Ligne :</label>
          <select
            id="ligne"
            value={ligne}
            onChange={(e) => {
              const nouvelleLigne = e.target.value
              setLigne(nouvelleLigne)
              localStorage.setItem('ligne', nouvelleLigne)
            }}
          >
            <option value="1">Ligne 1</option>
            <option value="6">Ligne 6</option>
            <option value="12">Ligne 12</option>
          </select>
        </div>

        <p className="progression">
          Progression : {done} / {total} tâches
        </p>

        <>
          <button className="reset-button" onClick={() => setShowConfirm(true)}>
            Réinitialiser
          </button>

          <Modal
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            actions={[
              { label: 'Annuler', onClick: () => setShowConfirm(false) },
              {
                label: 'Réinitialiser',
                onClick: () => {
                  setShowConfirm(false)
                  onReset()
                },
                variant: 'primary',
                autoFocus: true,
              },
            ]}
          >
            <p>❗ Es-tu sûr de vouloir tout réinitialiser ?</p>
          </Modal>
        </>
      </div>
    </div>
  )
}

TrainProgressBar.propTypes = {
  total: PropTypes.number.isRequired,
  done: PropTypes.number.isRequired,
  onReset: PropTypes.func.isRequired,
  ready: PropTypes.bool.isRequired,
}
