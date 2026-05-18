'use client'

/**
 * Tests unitaires pour SettingsPanel
 *
 * Vérifie :
 * - Rendu : 3 toggles simples + le bloc TrainThemeSelector présents.
 * - Écriture DB sur clic de chaque toggle (clé DB correcte).
 * - Mode lecture seule Visitor : les 3 toggles désactivés, aucune écriture.
 * - Toast d'erreur si l'écriture DB échoue.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import SettingsPanel from './SettingsPanel'

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

// Stubs minimaux : Toggle et TrainThemeSelector ont leur propre couverture.
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
  TrainThemeSelector: () => <div data-testid="train-theme-selector" />,
}))

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseI18n.mockReturnValue({ t: (key: string) => key })
    mockUseToast.mockReturnValue({ show: mockShow })
    mockUpdatePreferences.mockResolvedValue({ ok: true, error: null })
    mockUseAccountPreferences.mockReturnValue({
      preferences: {
        confetti_enabled: true,
        toasts_enabled: true,
        time_timer_enabled: true,
      },
      updatePreferences: mockUpdatePreferences,
    })
    mockUseIsVisitor.mockReturnValue({ isVisitor: false })
  })

  it('rendu : les 3 toggles et le TrainThemeSelector sont présents', () => {
    render(<SettingsPanel />)

    expect(screen.getByLabelText('edition.confetti')).toBeInTheDocument()
    expect(screen.getByLabelText('edition.notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('edition.timer')).toBeInTheDocument()
    expect(screen.getByTestId('train-theme-selector')).toBeInTheDocument()
  })

  it('clic sur le toggle confettis persiste confetti_enabled', () => {
    render(<SettingsPanel />)

    screen.getByLabelText('edition.confetti').click()

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      confetti_enabled: false,
    })
  })

  it('clic sur le toggle notifications persiste toasts_enabled', () => {
    render(<SettingsPanel />)

    screen.getByLabelText('edition.notifications').click()

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      toasts_enabled: false,
    })
  })

  it('clic sur le toggle Time Timer persiste time_timer_enabled', () => {
    render(<SettingsPanel />)

    screen.getByLabelText('edition.timer').click()

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      time_timer_enabled: false,
    })
  })

  it('mode Visitor : les 3 toggles sont désactivés et aucune écriture', () => {
    mockUseIsVisitor.mockReturnValue({ isVisitor: true })
    mockUseAccountPreferences.mockReturnValue({
      preferences: null,
      updatePreferences: mockUpdatePreferences,
    })
    render(<SettingsPanel />)

    expect(screen.getByLabelText('edition.confetti')).toBeDisabled()
    expect(screen.getByLabelText('edition.notifications')).toBeDisabled()
    expect(screen.getByLabelText('edition.timer')).toBeDisabled()

    screen.getByLabelText('edition.confetti').click()
    expect(mockUpdatePreferences).not.toHaveBeenCalled()
  })

  it('affiche un toast d’erreur si l’écriture DB échoue', async () => {
    mockUpdatePreferences.mockResolvedValue({ ok: false, error: 'fail' })
    render(<SettingsPanel />)

    screen.getByLabelText('edition.confetti').click()

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('errors.generic', 'error')
    })
  })
})
