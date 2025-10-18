import { replaceLegalPlaceholders } from '@/config/constants/legalConfig'
import { marked } from 'marked'
import PropTypes from 'prop-types'
import './LegalMarkdown.scss'

// Config minimale pour un rendu sûr
marked.setOptions({
  breaks: true,
})

export default function LegalMarkdown({ title, content }) {
  // Remplacement automatique de tous les placeholders
  const processedContent = replaceLegalPlaceholders(content)

  return (
    <article className="legal-content">
      <header className="legal-content__header">
        <h1>{title}</h1>
      </header>
      <div
        className="legal-content__body"
        dangerouslySetInnerHTML={{
          __html: marked.parse(processedContent || ''),
        }}
      />
    </article>
  )
}

LegalMarkdown.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
}
