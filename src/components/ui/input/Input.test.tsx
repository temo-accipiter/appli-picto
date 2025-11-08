import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Input from './Input'

describe('Input', () => {
  it('renders with correct label', () => {
    render(<Input id="test" label="Test Input" value="" onChange={() => {}} />)
    expect(screen.getByText('Test Input')).toBeInTheDocument()
  })

  it('renders without label when not provided', () => {
    render(<Input id="test" value="" onChange={() => {}} />)
    expect(screen.queryByText('Test Input')).not.toBeInTheDocument()
  })

  it('handles change events', () => {
    const handleChange = vi.fn()
    render(<Input id="test" value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('shows error when provided', () => {
    render(
      <Input id="test" value="" onChange={() => {}} error="This is an error" />
    )
    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('applies error class when error is present', () => {
    render(<Input id="test" value="" onChange={() => {}} error="Error" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('input-field__input--error')
  })

  it('can be password type with toggle', () => {
    render(<Input id="test" type="password" value="" onChange={() => {}} />)
    const input = screen.getByDisplayValue('')
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('can have placeholder', () => {
    render(
      <Input id="test" value="" onChange={() => {}} placeholder="Enter text" />
    )
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'placeholder',
      'Enter text'
    )
  })
})
