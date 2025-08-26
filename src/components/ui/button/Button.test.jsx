import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('renders with correct label', () => {
    render(<Button label="Test Button" onClick={() => {}} />)
    expect(screen.getByText('Test Button')).toBeInTheDocument()
  })

  it('applies correct variant class', () => {
    render(<Button label="Test" variant="secondary" onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('btn--secondary')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button label="Click me" onClick={handleClick} />)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button label="Disabled" disabled onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })
})
