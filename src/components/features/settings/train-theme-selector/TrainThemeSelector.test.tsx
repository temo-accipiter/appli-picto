'use client'

/**
 * Tests unitaires pour TrainThemeSelector
 *
 * Vérifie :
 * - Rendu par défaut (preferences null, Visitor) : toggle ON, soleil
 *   sélectionné, vignettes désactivées.
 * - Rendu Subscriber : valeurs lues de preferences, vignettes interactives.
 * - Écriture DB sur clic vignette et clic toggle.
 * - Vignette « Bientôt » inerte.
 * - Mode lecture seule Visitor + message visitorHint.
 * - Toast d'erreur si l'écriture DB échoue.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import TrainThemeSelector from './TrainThemeSelector'

const {
  mockUseI18n,
  mockUseAccountPreferences,
  mockUseIsVisitor,
  mockUseToast,
  mockUpdatePreferences,
  mockShow,
} = vi.hoisted(() => ({
  mockUseI18n: vi.fn(),
  mockUseAccountPreferences: vi.fn(),
  mockUseIsVisitor: vi.fn(),
  mockUseToast: vi.fn(),
  mockUpdatePreferences: vi.fn(),
  mockShow: vi.fn(),
}))

vi.mock('@/hooks', () => ({
  useI18n: mockUseI18n,
  useAccountPreferences: mockUseAccountPreferences,
  useIsVisitor: mockUseIsVisitor,
}))

vi.mock('@/contexts', () => ({
  useToast: mockUseToast,
}))

// Stub minimal du Toggle (le vrai Toggle a sa propre couverture de tests).
vi.mock('@/components', () => ({
  Toggle: ({
    checked,
    onChange,
    disabled,
    'aria-label': ariaLabel,
  }: {
    checked: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
    'aria-label': string
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  ),
}))

/** Récupère le bouton-vignette à partir de son libellé visible (clé i18n). */
function vignette(labelKey: string): HTMLButtonElement {
  const button = screen.getByText(labelKey).closest('button')
  if (!button) throw new Error(`Vignette introuvable : ${labelKey}`)
  return button as HTMLButtonElement
}

describe('TrainThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseI18n.mockReturnValue({ t: (key: string) => key })
    mockUseToast.mockReturnValue({ show: mockShow })
    mockUpdatePreferences.mockResolvedValue({ ok: true, error: null })
    mockUseAccountPreferences.mockReturnValue({
      preferences: null,
      updatePreferences: mockUpdatePreferences,
    })
    mockUseIsVisitor.mockReturnValue({ isVisitor: false })
  })

  it('rendu par défaut (preferences null, Visitor) : toggle ON, soleil sélectionné, vignettes désactivées', () => {
    mockUseIsVisitor.mockReturnValue({ isVisitor: true })
    render(<TrainThemeSelector />)

    expect(screen.getByRole('switch')).toBeChecked()
    expect(vignette('trainTheme.themeSoleil')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(vignette('trainTheme.themeSoleil')).toBeDisabled()
    expect(vignette('trainTheme.themeOcean')).toBeDisabled()
  })

  it('rendu Subscriber : valeurs lues de preferences, vignettes interactives', () => {
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        train_progress_enabled: true,
        progress_style: 'train-foret',
      },
      updatePreferences: mockUpdatePreferences,
    })
    render(<TrainThemeSelector />)

    expect(vignette('trainTheme.themeForet')).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(vignette('trainTheme.themeSoleil')).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(vignette('trainTheme.themeOcean')).toBeEnabled()
  })

  it('clic sur une vignette active persiste progress_style', () => {
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        train_progress_enabled: true,
        progress_style: 'train-soleil',
      },
      updatePreferences: mockUpdatePreferences,
    })
    render(<TrainThemeSelector />)

    vignette('trainTheme.themeOcean').click()

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      progress_style: 'train-ocean',
    })
  })

  it('clic sur le toggle persiste train_progress_enabled', () => {
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        train_progress_enabled: true,
        progress_style: 'train-soleil',
      },
      updatePreferences: mockUpdatePreferences,
    })
    render(<TrainThemeSelector />)

    screen.getByRole('switch').click()

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      train_progress_enabled: false,
    })
  })

  it('vignette « Bientôt » est désactivée et ne déclenche aucune écriture', () => {
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        train_progress_enabled: true,
        progress_style: 'train-soleil',
      },
      updatePreferences: mockUpdatePreferences,
    })
    render(<TrainThemeSelector />)

    const soon = vignette('trainTheme.themeMontgolfiere')
    expect(soon).toBeDisabled()

    soon.click()
    expect(mockUpdatePreferences).not.toHaveBeenCalled()
  })

  it('mode Visitor : interactions bloquées et message visitorHint affiché', () => {
    mockUseIsVisitor.mockReturnValue({ isVisitor: true })
    render(<TrainThemeSelector />)

    expect(screen.getByText('trainTheme.visitorHint')).toBeInTheDocument()

    screen.getByRole('switch').click()
    vignette('trainTheme.themeOcean').click()

    expect(mockUpdatePreferences).not.toHaveBeenCalled()
  })

  it('affiche un toast d’erreur si l’écriture DB échoue', async () => {
    mockUpdatePreferences.mockResolvedValue({ ok: false, error: 'fail' })
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        train_progress_enabled: true,
        progress_style: 'train-soleil',
      },
      updatePreferences: mockUpdatePreferences,
    })
    render(<TrainThemeSelector />)

    vignette('trainTheme.themeOcean').click()

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('errors.generic', 'error')
    })
  })
})
