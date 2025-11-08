import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Select from './Select'

interface MockOption {
  value: string
  label: string
}

const mockOptions: MockOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select', () => {
  it('renders with correct label', () => {
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

  it('renders without label when not provided', () => {
    render(
      <Select id="test" options={mockOptions} value="" onChange={() => {}} />
    )
    expect(screen.queryByText('Test Select')).not.toBeInTheDocument()
  })

  it('displays all options when opened', () => {
    render(
      <Select id="test" options={mockOptions} value="" onChange={() => {}} />
    )

    const select = screen.getByRole('combobox')
    fireEvent.click(select)

    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('handles option selection', () => {
    const handleChange = vi.fn()

    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={handleChange}
      />
    )

    const select = screen.getByRole('combobox')

    // Simuler la sélection avec un objet d'événement complet
    const event = {
      target: { value: 'option2' },
      currentTarget: { value: 'option2' },
    }
    fireEvent.change(select, event)

    // Vérifier que le handler a été appelé
    expect(handleChange).toHaveBeenCalled()
  })

  it('shows error when provided', () => {
    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={() => {}}
        error="This is an error"
      />
    )
    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(
      <Select
        id="test"
        options={mockOptions}
        value=""
        onChange={() => {}}
        disabled
      />
    )
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })
})
