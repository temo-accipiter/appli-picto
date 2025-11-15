'use client'

import React, { useId, useMemo, useState } from 'react'
import { useI18n } from '@/hooks'
import { PASSWORD_MIN } from '@/utils'
import './PasswordChecklist.scss'

interface PasswordCriteria {
  lengthOK: boolean
  lowerOK: boolean
  upperOK: boolean
  digitOK: boolean
  symbolOK: boolean
  noSpaceOK: boolean
}

function getPasswordCriteria(pw: string = ''): PasswordCriteria {
  return {
    lengthOK: pw.length >= PASSWORD_MIN,
    lowerOK: /[a-z]/.test(pw),
    upperOK: /[A-Z]/.test(pw),
    digitOK: /[0-9]/.test(pw),
    symbolOK: /[^A-Za-z0-9]/.test(pw),
    noSpaceOK: !/\s/.test(pw),
  }
}

interface ChecklistItemProps {
  ok: boolean
  children: React.ReactNode
}

function ChecklistItem({ ok, children }: ChecklistItemProps) {
  return (
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
}

interface ChecklistProps {
  criteria: PasswordCriteria
}

function Checklist({ criteria }: ChecklistProps) {
  const { t } = useI18n()

  return (
    <div
      className="password-checklist"
      role="region"
      aria-label={t('password.requirements')}
    >
      <p className="password-checklist__title">{t('password.mustContain')}</p>
      <ul className="password-checklist__list">
        <ChecklistItem ok={criteria.lengthOK}>
          {t('password.minLength', { count: PASSWORD_MIN })}
        </ChecklistItem>
        <ChecklistItem ok={criteria.lowerOK}>
          {t('password.lowercase')}
        </ChecklistItem>
        <ChecklistItem ok={criteria.upperOK}>
          {t('password.uppercase')}
        </ChecklistItem>
        <ChecklistItem ok={criteria.digitOK}>
          {t('password.digit')}
        </ChecklistItem>
        <ChecklistItem ok={criteria.symbolOK}>
          {t('password.symbol')}
        </ChecklistItem>
        <ChecklistItem ok={criteria.noSpaceOK}>
          {t('password.noSpace')}
        </ChecklistItem>
      </ul>
    </div>
  )
}

interface PasswordChecklistProps {
  password?: string
  collapsible?: boolean
  defaultOpen?: boolean
  toggleLabel?: string
  id?: string
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
  toggleLabel,
  id,
}: PasswordChecklistProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const autoId = useId()
  const panelId = id || `pc-panel-${autoId}`

  const criteria = useMemo(() => getPasswordCriteria(password), [password])
  const label = toggleLabel || t('password.requirements')

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
        {label}
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
