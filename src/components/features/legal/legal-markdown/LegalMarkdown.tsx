'use client'

import { replaceLegalPlaceholders } from '@/config/constants/legalConfig'
import { useI18n } from '@/hooks'
import { marked } from 'marked'
import { useRouter } from 'next/navigation'
import './LegalMarkdown.scss'

// Config minimale pour un rendu sûr
marked.setOptions({
  breaks: true,
})

interface LegalMarkdownProps {
  title: string
  content: string
}

export default function LegalMarkdown({ title, content }: LegalMarkdownProps) {
  // Remplacement automatique de tous les placeholders
  const processedContent = replaceLegalPlaceholders(content)
  const router = useRouter()
  const { t } = useI18n()

  const handleBack = () => {
    // Si l'historique existe, revenir en arrière, sinon aller à l'accueil
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/tableau')
    }
  }

  // Parse markdown de manière synchrone
  const htmlContent = marked.parse(processedContent || '', {
    async: false,
  }) as string

  return (
    <article className="legal-content">
      <header className="legal-content__header">
        <button
          onClick={handleBack}
          className="legal-content__back-button"
          aria-label={t('actions.back')}
        >
          ← {t('actions.back')}
        </button>
        <h1>{title}</h1>
      </header>
      <div
        className="legal-content__body"
        dangerouslySetInnerHTML={{
          __html: htmlContent,
        }}
      />
    </article>
  )
}
