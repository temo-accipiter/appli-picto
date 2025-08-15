import PropTypes from 'prop-types'
import { marked } from 'marked'
import './LegalMarkdown.scss'

// Config minimale pour un rendu sûr
marked.setOptions({
  breaks: true,
})

export default function LegalMarkdown({ title, content }) {
  return (
    <article className="legal-content">
      <header className="legal-content__header">
        <h1>{title}</h1>
      </header>
      <div
        className="legal-content__body"
        dangerouslySetInnerHTML={{ __html: marked.parse(content || '') }}
      />
    </article>
  )
}

LegalMarkdown.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
}
