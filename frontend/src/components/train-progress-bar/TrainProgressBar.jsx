import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { COULEURS_LIGNES } from '@/data/colors'
import { Select } from '@/components'
import './TrainProgressBar.scss'
import { useStations } from '@/hooks'

export default function TrainProgressBar({ total, done }) {
  const [ligne, setLigne] = useState(() => localStorage.getItem('ligne') || '1')
  const couleur = COULEURS_LIGNES[ligne] || '#999'
  const stationCount = total + 1

  const { stations: ligneStations, loading, error } = useStations(ligne)
  const [currentStations, setCurrentStations] = useState([])

  useEffect(() => {
    document.documentElement.style.setProperty('--couleur-ligne', couleur)
  }, [couleur])

  useEffect(() => {
    if (!loading && ligneStations.length > 0) {
      setCurrentStations(ligneStations)
    }
  }, [loading, ligneStations])

  if (error) return <p>Erreur lors du chargement des stations.</p>

  const stations = Array.from({ length: stationCount }, (_, i) => ({
    label: currentStations[i % currentStations.length] || '',
    left: `${(i / (stationCount - 1)) * 100}%`,
    isActive: i === done,
  }))

  const isLast = done === stationCount - 1

  const trainStyle = {
    left:
      done === 0 || total === 0
        ? '0%'
        : isLast
          ? 'calc(100% - 40px)'
          : `${(done / (stationCount - 1)) * 100}%`,
    transform:
      done === 0 || total === 0 || isLast ? 'none' : 'translateX(-50%)',
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

        {/* Affichage des stations sans le logo */}
        {stations.map(({ label, left, isActive }, index) => (
          <div
            key={index}
            className={`station ${isActive ? 'active' : ''} ${done > index ? 'passed' : ''}`}
            style={{ left }}
          >
            <div className="label" title={label}>
              {label}
            </div>
            <div className="dot" />
          </div>
        ))}

        {/* Train en mouvement */}
        <div className="train" style={trainStyle}>
          <img
            src="/src/assets/images/train.png"
            alt="Métro"
            className="train-icon"
          />
        </div>

        {/* Logo ligne figé à droite */}
        <div className="dot-logo fixed-logo">
          <img
            src={`/src/assets/images/ligne/ligne${ligne}.png`}
            alt={`Ligne ${ligne}`}
          />
        </div>
      </div>

      <div className="toolbar">
        <Select
          id="ligne"
          label="Ligne :"
          value={ligne}
          onChange={(e) => {
            const nouvelleLigne = e.target.value
            setLigne(nouvelleLigne)
            localStorage.setItem('ligne', nouvelleLigne)
          }}
          options={[
            { value: '1', label: 'Ligne 1' },
            { value: '6', label: 'Ligne 6' },
            { value: '12', label: 'Ligne 12' },
          ]}
        />

        <p className="progression">
          Progression : {done} / {total} tâches
        </p>
      </div>
    </div>
  )
}

TrainProgressBar.propTypes = {
  total: PropTypes.number.isRequired,
  done: PropTypes.number.isRequired,
}
