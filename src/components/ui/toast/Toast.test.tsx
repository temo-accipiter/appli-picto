'use client'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  it('renders with correct message when visible', () => {
    render(<Toast message="Test message" type="success" visible={true} />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(<Toast message="Test message" type="success" visible={false} />)
    expect(screen.queryByText('Test message')).not.toBeInTheDocument()
  })

  it('applies correct type class', () => {
    render(<Toast message="Test" type="error" visible={true} />)
    const toast = screen.getByText('Test').closest('.toast')
    expect(toast).toHaveClass('toast--error')
  })

  it('applies success type class', () => {
    render(<Toast message="Test" type="success" visible={true} />)
    const toast = screen.getByText('Test').closest('.toast')
    expect(toast).toHaveClass('toast--success')
  })

  it('applies warning type class', () => {
    render(<Toast message="Test" type="warning" visible={true} />)
    const toast = screen.getByText('Test').closest('.toast')
    expect(toast).toHaveClass('toast--warning')
  })

  it('applies info type class', () => {
    render(<Toast message="Test" type="info" visible={true} />)
    const toast = screen.getByText('Test').closest('.toast')
    expect(toast).toHaveClass('toast--info')
  })

  it('has accessible role', () => {
    render(<Toast message="Test" type="success" visible={true} />)
    const toast = screen.getByRole('status')
    expect(toast).toBeInTheDocument()
  })

  it('has correct aria-live attribute', () => {
    render(<Toast message="Test" type="success" visible={true} />)
    const toast = screen.getByRole('status')
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })
})
