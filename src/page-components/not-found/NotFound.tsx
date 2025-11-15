'use client'

import { useI18n } from '@/hooks'
import { Link } from 'react-router-dom'
import './NotFound.scss'

export default function NotFound() {
  const { t } = useI18n()

  return (
    <div className="not-found">
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.message')}</p>
      <Link to="/">{t('notFound.backHome')}</Link>
    </div>
  )
}
