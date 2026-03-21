'use client'

import { useI18n } from '@/hooks'
import {
  Shield,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart3,
  Lock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Bouton de navigation vers l'espace admin avec sous-menu.
 * Ce composant est importé dynamiquement par UserMenu UNIQUEMENT si isAdmin === true.
 * Il n'est jamais inclus dans le barrel partagé (src/components/index.ts).
 */
export default function AdminMenuItem() {
  const router = useRouter()
  const { t } = useI18n()
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <>
      <button
        className="user-menu-item admin"
        onClick={() => setAdminOpen(!adminOpen)}
        aria-expanded={adminOpen}
      >
        <Shield className="icon" aria-hidden />
        <span>{t('nav.admin')}</span>
        {adminOpen ? (
          <ChevronUp className="icon chevron" aria-hidden />
        ) : (
          <ChevronDown className="icon chevron" aria-hidden />
        )}
      </button>

      {/* Sous-menu Admin */}
      {adminOpen && (
        <div className="user-menu-submenu">
          <button
            className="user-menu-item submenu-item"
            onClick={() => router.push('/admin/logs')}
          >
            <FileText className="icon" aria-hidden />
            <span>Logs d&apos;abonnement</span>
          </button>
          <button
            className="user-menu-item submenu-item"
            onClick={() => router.push('/admin/metrics')}
          >
            <BarChart3 className="icon" aria-hidden />
            <span>Métriques</span>
          </button>
          <button
            className="user-menu-item submenu-item"
            onClick={() => router.push('/admin/permissions')}
          >
            <Lock className="icon" aria-hidden />
            <span>Permissions</span>
          </button>
        </div>
      )}
    </>
  )
}
