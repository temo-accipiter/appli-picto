import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('renders with correct label', () => {
    render(
      <Checkbox
        id="test"
        label="Test Checkbox"
        checked={false}
        onChange={() => {}}
      />
    )
    expect(screen.getByText('Test Checkbox')).toBeInTheDocument()
  })

  it('applies correct size class', () => {
    render(
      <Checkbox
        id="test"
        label="Test"
        checked={false}
        onChange={() => {}}
        size="sm"
      />
    )
    const container = screen.getByText('Test').closest('.checkbox-field')
    expect(container).toHaveClass('checkbox-field--sm')
  })

  it('handles change events', () => {
    const handleChange = vi.fn()
    render(
      <Checkbox
        id="test"
        label="Test"
        checked={false}
        onChange={handleChange}
      />
    )
    screen.getByRole('checkbox').click()
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('shows error when provided', () => {
    render(
      <Checkbox
        id="test"
        label="Test"
        checked={false}
        onChange={() => {}}
        error="This is an error"
      />
    )
    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('can be checked', () => {
    render(
      <Checkbox id="test" label="Test" checked={true} onChange={() => {}} />
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })
})
