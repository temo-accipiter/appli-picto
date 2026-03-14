'use client'

import { useI18n } from '@/hooks'
import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Bouton de navigation vers l'espace admin.
 * Ce composant est importé dynamiquement par UserMenu UNIQUEMENT si isAdmin === true.
 * Il n'est jamais inclus dans le barrel partagé (src/components/index.ts).
 */
export default function AdminMenuItem() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <button
      className="user-menu-item admin"
      onClick={() => router.push('/admin/logs')}
    >
      <Shield className="icon" aria-hidden />
      <span>{t('nav.admin')}</span>
    </button>
  )
}
