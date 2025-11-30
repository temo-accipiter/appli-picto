'use client'

import { useEffect, useRef, ReactNode } from 'react'
import type { MouseEvent } from 'react'
import './Dropdown.scss'

interface DropdownProps {
  isOpen: boolean
  onClose: () => void
  trigger: ReactNode // Le bouton/élément qui trigger le dropdown
  children: ReactNode // Le contenu du dropdown
  className?: string
  position?: 'left' | 'right' | 'center' // Position du dropdown par rapport au trigger
}

export default function Dropdown({
  isOpen,
  onClose,
  trigger,
  children,
  className = '',
  position = 'left',
}: DropdownProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Fermer avec Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Fermer quand on clique en dehors
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  const dropdownClasses = `dropdown dropdown--${position} ${className}`.trim()

  return (
    <div className="dropdown-wrapper">
      {/* Trigger */}
      <div ref={triggerRef} className="dropdown-trigger">
        {trigger}
      </div>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          className="dropdown-backdrop"
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            className={dropdownClasses}
            onMouseDown={e => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
