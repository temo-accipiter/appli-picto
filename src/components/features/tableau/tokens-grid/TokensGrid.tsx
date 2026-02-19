'use client'

// src/components/features/tableau/tokens-grid/TokensGrid.tsx
// Affichage de la grille de jetons (récompenses intermédiaires)
//
// ⚠️ Règles Contexte Tableau (§6.2, §3.1.2)
// - Affichée seulement si totalTokens > 0
// - Les jetons "gagnés" = somme des tokens des étapes validées
// - Les jetons "totaux" = somme des tokens de TOUS les slots étapes non-vides (snapshot)
// - Respecte reduced_motion : si true, affichage statique sans animation
//
// ⚠️ Calcul des jetons
// - Un jeton = 1 unité sur un slot étape validé
// - Les récompenses (kind='reward') n'ont pas de jetons
// - Les slots vides (card_id=null) n'entrent pas dans le calcul

import { useReducedMotion } from '@/hooks'
import './TokensGrid.scss'

interface TokensGridProps {
  /** Nombre de jetons gagnés (étapes validées × tokens) */
  earnedTokens: number
  /** Nombre total de jetons à gagner (étapes non-vides × tokens) */
  totalTokens: number
}

export function TokensGrid({ earnedTokens, totalTokens }: TokensGridProps) {
  const prefersReducedMotion = useReducedMotion()

  // Ne pas afficher si aucun jeton
  if (totalTokens === 0) return null

  return (
    <section
      className="tokens-grid"
      aria-label={`Jetons : ${earnedTokens} sur ${totalTokens}`}
    >
      <div
        className="tokens-grid__grid"
        role="list"
        aria-label="Grille de jetons"
      >
        {Array.from({ length: totalTokens }).map((_, index) => {
          const isEarned = index < earnedTokens
          return (
            <div
              key={index}
              role="listitem"
              className={`tokens-grid__token${isEarned ? ' tokens-grid__token--earned' : ''}${!prefersReducedMotion && isEarned ? ' tokens-grid__token--animated' : ''}`}
              aria-label={isEarned ? 'Jeton gagné' : 'Jeton à gagner'}
              style={
                !prefersReducedMotion && isEarned
                  ? { animationDelay: `${index * 0.05}s` }
                  : undefined
              }
            />
          )
        })}
      </div>
    </section>
  )
}
