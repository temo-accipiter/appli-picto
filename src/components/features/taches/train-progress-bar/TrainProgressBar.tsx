'use client'

import React, { useEffect, useState } from 'react'
import {
  useI18n,
  useProgressStations,
  useAccountPreferences,
  useReducedMotion,
  useIsVisitor,
} from '@/hooks'
import './TrainProgressBar.scss'

interface TrainProgressBarProps {
  total: number
  done: number
}

interface Station {
  label: string
  left: string
  isActive: boolean
}

// Thème par défaut — sert aussi de fallback Visitor (voir plus bas).
const DEFAULT_PROGRESS_STYLE = 'train-soleil'

/**
 * Barre de progression « train » — composant STRICTEMENT lecture seule.
 *
 * N'affiche qu'une progression : aucun contrôle, aucune écriture DB.
 * La configuration (activer/désactiver, choix du thème) se fait
 * exclusivement depuis la page Édition.
 */
export default function TrainProgressBar({
  total,
  done,
}: TrainProgressBarProps) {
  const { t } = useI18n()
  const { preferences } = useAccountPreferences()
  const prefersReducedMotion = useReducedMotion()
  const { isVisitor } = useIsVisitor()

  // Fallback Visitor : le visitor n'a pas de row account_preferences en
  // base. `preferences` est donc null → progress_style retombe sur
  // 'train-soleil' et la barre reste affichée (train_progress_enabled
  // n'est jamais explicitement false). Le visitor voit toujours la
  // barre, en thème soleil, sans configuration possible.
  const progressStyle =
    (!isVisitor && preferences?.progress_style) || DEFAULT_PROGRESS_STYLE

  const {
    stations: themeStations,
    loading,
    error,
  } = useProgressStations(progressStyle)
  const [currentStations, setCurrentStations] = useState<
    Array<{ label: string }>
  >([])

  useEffect(() => {
    if (!loading && themeStations.length > 0) {
      setCurrentStations(themeStations)
    }
  }, [loading, themeStations])

  // Auto-désactivation : si la préférence DB est explicitement false, la
  // barre ne s'affiche pas. Le fallback Visitor (preferences null) ne
  // déclenche jamais ce return — la barre reste visible.
  if (preferences?.train_progress_enabled === false) return null

  // Erreur réseau : silence côté Tableau (zéro message technique pour
  // l'enfant TSA — règle next-skills-tsa-override §1).
  if (error) return null

  const stationCount = Number(total) + 1

  // Saturation : aucune limite produit ne plafonne le nombre de tâches.
  // Si la session compte plus d'arrêts que le catalogue (20 par thème),
  // on sature sur le dernier libellé — pas de cycle (anti-surprise TSA).
  const stations: Station[] = Array.from({ length: stationCount }, (_, i) => ({
    label: currentStations[Math.min(i, currentStations.length - 1)]?.label ?? '',
    left: `${(i / Math.max(stationCount - 1, 1)) * 100}%`,
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
    <div
      className="train-progress-bar"
      data-progress-style={progressStyle}
      role="progressbar"
      aria-valuemin={0}
      aria-valuenow={done}
      aria-valuemax={total}
      aria-label={t('tableau.progressionAriaLabel', { done, total })}
    >
      <div className="metroline">
        <svg viewBox="0 0 1000 60" className="metrosvg">
          <path d="M 0 30 H 1000" className="rail-line" />
        </svg>

        {stations.map(({ label, left, isActive }, index) => (
          <div
            key={index}
            className={`station ${isActive ? 'active' : ''} ${done > index ? 'passed' : ''}`}
            style={{ '--station-left': left } as React.CSSProperties}
          >
            <div className="label" title={label}>
              {label}
            </div>
            <div className="dot" />
          </div>
        ))}

        <div
          className={`train ${prefersReducedMotion ? 'train--no-motion' : ''}`}
          style={
            {
              '--train-left': trainStyle.left,
              '--train-transform': trainStyle.transform,
            } as React.CSSProperties
          }
        >
          {/* PLACEHOLDER géométrique — à remplacer par asset
              illustrateur définitif */}
          <svg
            className="train-icon"
            viewBox="0 0 48 24"
            aria-hidden="true"
            focusable="false"
          >
            <rect
              x="1"
              y="1"
              width="46"
              height="22"
              rx="6"
              ry="6"
              className="train-icon__body"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
