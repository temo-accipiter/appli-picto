'use client'

import Image from 'next/image'
import { SelectWithImage } from '@/components/ui/select-with-image'
import type { SelectWithImageOption } from '@/components/ui/select-with-image'
import { COULEURS_LIGNES } from '@/config/constants/colors'
import { useI18n, useStations } from '@/hooks'
import { useEffect, useState, useMemo } from 'react'
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

  // ✅ FIX : Mémoriser options pour éviter re-création à chaque render
  // CAUSE : Tableau recréé → nouvelle référence → SelectWithImage re-render → boucle infinie
  const ligneOptions = useMemo<SelectWithImageOption[]>(
    () => [
      {
        value: '1',
        label: t('tableau.line1'),
        image: '/images/ligne/ligne1.png',
        imageAlt: 'Ligne 1',
      },
      {
        value: '6',
        label: t('tableau.line6'),
        image: '/images/ligne/ligne6.png',
        imageAlt: 'Ligne 6',
      },
      {
        value: '12',
        label: t('tableau.line12'),
        image: '/images/ligne/ligne12.png',
        imageAlt: 'Ligne 12',
      },
    ],
    [t] // ← Re-créer seulement si t (i18n) change
  )

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
          <Image
            src="/images/train.png"
            alt="Métro"
            width={40}
            height={40}
            className="train-icon"
            priority={false}
          />
        </div>

        {/* Logo ligne figé à droite */}
        <div className="dot-logo fixed-logo">
          <Image
            src={`/images/ligne/ligne${ligne}.png`}
            alt={`Ligne ${ligne}`}
            width={32}
            height={32}
            loading="lazy"
            quality={85}
          />
        </div>
      </div>

      <div className="toolbar">
        <SelectWithImage
          id="ligne"
          label={t('tableau.selectLine')}
          value={ligne}
          onChange={value => {
            const nouvelleLigne = String(value)

            // ✅ Garde anti-boucle : si identique, ne rien faire
            if (nouvelleLigne === ligne) return

            // En mode démo, empêcher le changement de ligne et ouvrir la modal
            if (isDemo && nouvelleLigne !== '1') {
              if (onLineChange) {
                onLineChange('line_change')
              }
              return
            }

            // Mode normal : changer la ligne
            setLigne(nouvelleLigne)
            localStorage.setItem('ligne', nouvelleLigne)
          }}
          options={ligneOptions}
        />

        <p className="progression">
          {t('tableau.progression')} : {done} / {total}{' '}
          {t('tasks.title').toLowerCase()}
        </p>
      </div>
    </div>
  )
}
