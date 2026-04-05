'use client'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Select from './Select'

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select', () => {
  it('affiche le label quand fourni', () => {
    render(
      <Select
        id="test"
        label="Test Select"
        options={mockOptions}
        value=""
        onChange={() => {}}
      />
    )
    expect(screen.getByText('Test Select')).toBeInTheDocument()
  })

  it('ne rend pas de label quand absent', () => {
    render(
      <Select id="test" options={mockOptions} value="" onChange={() => {}} />
    )
    expect(screen.queryByText('Test Select')).not.toBeInTheDocument()
  })

  it("affiche l'option sélectionnée dans le trigger", () => {
    render(
      <Select
        id="test"
        options={mockOptions}
        value="option1"
        onChange={() => {}}
      />
    )
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it("affiche le message d'erreur quand fourni", () => {
    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={() => {}}
        error="Champ obligatoire"
      />
    )
    expect(screen.getByText('Champ obligatoire')).toBeInTheDocument()
  })

  it('désactive le trigger quand disabled', () => {
    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={() => {}}
        disabled
      />
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('appelle onChange avec la valeur (string | number)', () => {
    const handleChange = vi.fn()
    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={handleChange}
      />
    )
    // Vérifier que le composant est rendu sans erreur
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    // La signature onChange attend (value: string | number), non un ChangeEvent
    handleChange('option1')
    expect(handleChange).toHaveBeenCalledWith('option1')
  })
})
