'use client'

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Modal from './Modal'

describe('Modal lifecycle integration', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  })

  it('renders the dialog after the first open render and locks body scroll', async () => {
    render(
      <Modal isOpen onClose={() => {}} title="Sequence test">
        <div>Contenu</div>
      </Modal>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('closes via close button and restores body scroll', async () => {
    function Wrapper() {
      const [open, setOpen] = React.useState(true)

      return (
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Sequence test"
        >
          <div>Contenu</div>
        </Modal>
      )
    }

    render(<Wrapper />)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose via overlay click and Escape, then restores scroll on unmount', async () => {
    const onClose = vi.fn()
    const { unmount, container } = render(
      <Modal isOpen onClose={onClose} title="Sequence test">
        <div>Contenu</div>
      </Modal>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const overlay = container.ownerDocument.querySelector('.modal-overlay')
    expect(overlay).toBeTruthy()

    if (overlay) {
      fireEvent.click(overlay)
    }

    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('supports rapid open/close cycles without leaving body locked', async () => {
    function Wrapper() {
      const [open, setOpen] = React.useState(false)

      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Sequence test"
          >
            <div>Contenu</div>
          </Modal>
        </div>
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe('')
  })
})
