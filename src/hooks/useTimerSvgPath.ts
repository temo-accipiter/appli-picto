'use client'

import { useMemo } from 'react'

/**
 * Interface pour les dimensions SVG
 */
export interface SvgDimensions {
  radius: number
  margin: number
  svgSize: number
  centerX: number
  centerY: number
}

/**
 * Interface pour le résultat du path SVG
 */
export interface SvgPathResult {
  redDiskPath: string
  dimensions: SvgDimensions
}

/**
 * Convertir coordonnées polaires en cartésiennes
 * @param centerX - Coordonnée X du centre
 * @param centerY - Coordonnée Y du centre
 * @param radius - Rayon du cercle
 * @param angleInDegrees - Angle en degrés (0° = haut, sens horaire)
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

/**
 * Créer le path SVG du secteur circulaire (arc)
 * @param centerX - Coordonnée X du centre
 * @param centerY - Coordonnée Y du centre
 * @param radius - Rayon du cercle
 * @param startAngle - Angle de départ en degrés
 * @param endAngle - Angle de fin en degrés
 */
function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    'M',
    centerX,
    centerY,
    'L',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0, // Sweep-flag à 0 pour sens anti-horaire
    end.x,
    end.y,
    'Z',
  ].join(' ')
}

/**
 * Hook pour calculer le path SVG du TimeTimer
 * Encapsule les calculs géométriques complexes
 *
 * @param percentage - Pourcentage de temps restant (0-100)
 * @param compact - Mode compact pour taille réduite
 * @returns Path SVG du disque rouge et dimensions
 */
export function useTimerSvgPath(
  percentage: number,
  compact: boolean = false
): SvgPathResult {
  return useMemo(() => {
    // Calcul des dimensions
    const radius = compact ? 70 : 130
    const margin = compact ? 25 : 30
    const svgSize = 2 * (radius + margin)
    const centerX = svgSize / 2
    const centerY = svgSize / 2

    // Convertir le pourcentage en angle (0° = haut, sens horaire)
    const angle = (percentage / 100) * 360

    // Rayon du disque (réduit de 2px pour rester dans le cercle blanc)
    const diskRadius = radius - 2

    // Le rouge part de la position du temps écoulé et va jusqu'à 360°
    const elapsedAngle = 360 - angle
    const redDiskPath =
      angle > 0
        ? describeArc(centerX, centerY, diskRadius, elapsedAngle, 360)
        : ''

    return {
      redDiskPath,
      dimensions: {
        radius,
        margin,
        svgSize,
        centerX,
        centerY,
      },
    }
  }, [percentage, compact])
}

/**
 * Hook pour calculer la position des numéros autour du cadran
 * @param value - Valeur du marqueur (0-60)
 * @param radius - Rayon du cercle
 * @param centerX - Centre X
 * @param centerY - Centre Y
 * @param compact - Mode compact
 */
export function getNumberPosition(
  value: number,
  radius: number,
  centerX: number,
  centerY: number,
  compact: boolean
): { x: number; y: number } {
  // Convertir la valeur en angle (0 = haut, sens horaire)
  const angleInDegrees = (value / 60) * 360 - 90 // -90 pour commencer en haut
  const angleInRadians = (angleInDegrees * Math.PI) / 180
  const numberRadius = radius + (compact ? 12 : 18)

  return {
    x: centerX + numberRadius * Math.cos(angleInRadians),
    y: centerY + numberRadius * Math.sin(angleInRadians),
  }
}
