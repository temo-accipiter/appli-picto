import React, { useState, useMemo, useId } from 'react'
import { PASSWORD_MIN } from '@/utils'
import './PasswordChecklist.scss'

function getPasswordCriteria(pw = '') {
  return {
    lengthOK: pw.length >= PASSWORD_MIN,
    lowerOK: /[a-z]/.test(pw),
    upperOK: /[A-Z]/.test(pw),
    digitOK: /[0-9]/.test(pw),
    symbolOK: /[^A-Za-z0-9]/.test(pw),
    noSpaceOK: !/\s/.test(pw),
  }
}

function Checklist({ criteria }) {
  const Item = ({ ok, children }) => (
    <li
      className={`password-checklist__item ${ok ? 'is-ok' : 'is-ko'}`}
      aria-live="polite"
    >
      <span aria-hidden="true" className="password-checklist__icon">
        {ok ? '✅' : '•'}
      </span>
      <span className="password-checklist__text">{children}</span>
    </li>
  )

  return (
    <div
      className="password-checklist"
      role="region"
      aria-label="Exigences du mot de passe"
    >
      <p className="password-checklist__title">
        Le mot de passe doit contenir :
      </p>
      <ul className="password-checklist__list">
        <Item ok={criteria.lengthOK}>au moins {PASSWORD_MIN} caractères</Item>
        <Item ok={criteria.lowerOK}>au moins une lettre minuscule</Item>
        <Item ok={criteria.upperOK}>au moins une lettre majuscule</Item>
        <Item ok={criteria.digitOK}>au moins un chiffre</Item>
        <Item ok={criteria.symbolOK}>au moins un symbole</Item>
        <Item ok={criteria.noSpaceOK}>aucun espace</Item>
      </ul>
    </div>
  )
}

/**
 * PasswordChecklist
 * Props:
 * - password: string (requis)
 * - collapsible?: boolean (par défaut false)
 * - defaultOpen?: boolean (par défaut false)
 * - toggleLabel?: string (libellé du bouton)
 * - id?: string (pour aria-controls) - sinon auto
 */
export default function PasswordChecklist({
  password = '',
  collapsible = false,
  defaultOpen = false,
  toggleLabel = 'Exigences du mot de passe',
  id,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const autoId = useId()
  const panelId = id || `pc-panel-${autoId}`

  const criteria = useMemo(() => getPasswordCriteria(password), [password])

  if (!collapsible) {
    return <Checklist criteria={criteria} />
  }

  return (
    <>
      <button
        type="button"
        className="password-checklist__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(s => !s)}
      >
        {toggleLabel}
        <span
          className={`password-checklist__chev ${open ? 'is-open' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        id={panelId}
        className={`password-checklist__collapse ${open ? 'is-open' : 'is-closed'}`}
        aria-hidden={!open}
      >
        <Checklist criteria={criteria} />
      </div>
    </>
  )
}
