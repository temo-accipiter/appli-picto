'use client'

import { Select } from '@/components'
import { COULEURS_LIGNES } from '@/config/constants/colors'
import { useI18n, useStations } from '@/hooks'
import { useEffect, useState } from 'react'
import './TrainProgressBar.scss'

interface TrainProgressBarProps {
  total: number
  done: number
  isDemo?: boolean
  onLineChange?: (action: string) => void
}

interface Station {
  label: string
  left: string
  isActive: boolean
}

export default function TrainProgressBar({
  total,
  done,
  isDemo = false,
  onLineChange,
}: TrainProgressBarProps) {
  const { t } = useI18n()
  const [ligne, setLigne] = useState(() => localStorage.getItem('ligne') || '1')
  const couleur =
    COULEURS_LIGNES[ligne as unknown as keyof typeof COULEURS_LIGNES] || '#999'
  const stationCount = Number(total) + 1

  const { stations: ligneStations, loading, error } = useStations(ligne)
  const [currentStations, setCurrentStations] = useState<
    Array<{ label: string }>
  >([])

  useEffect(() => {
    document.documentElement.style.setProperty('--couleur-ligne', couleur)
  }, [couleur])

  useEffect(() => {
    if (!loading && ligneStations.length > 0) {
      setCurrentStations(ligneStations)
    }
  }, [loading, ligneStations])

  if (error) return <p>{t('errors.generic')}</p>

  const stations: Station[] = Array.from({ length: stationCount }, (_, i) => ({
    label: currentStations[i % currentStations.length]?.label || '',
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
            loading="lazy"
          />
        </div>

        {/* Logo ligne figé à droite */}
        <div className="dot-logo fixed-logo">
          <img
            src={`/src/assets/images/ligne/ligne${ligne}.png`}
            alt={`Ligne ${ligne}`}
            loading="lazy"
          />
        </div>
      </div>

      <div className="toolbar">
        <Select
          id="ligne"
          label={t('tableau.selectLine')}
          value={ligne}
          onChange={e => {
            const nouvelleLigne = e.target.value

            // En mode démo, empêcher le changement de ligne et ouvrir la modal
            if (isDemo && nouvelleLigne !== '1') {
              e.preventDefault()
              e.target.value = '1' // Remettre la ligne 1
              if (onLineChange) {
                onLineChange('line_change')
              }
              return
            }

            // Mode normal : changer la ligne
            setLigne(nouvelleLigne)
            localStorage.setItem('ligne', nouvelleLigne)
          }}
          options={[
            { value: '1', label: t('tableau.line1') },
            { value: '6', label: t('tableau.line6') },
            { value: '12', label: t('tableau.line12') },
          ]}
        />

        <p className="progression">
          {t('tableau.progression')} : {done} / {total}{' '}
          {t('tasks.title').toLowerCase()}
        </p>
      </div>
    </div>
  )
}
