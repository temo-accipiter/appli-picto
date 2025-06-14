import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './LangSelect.scss'

export default function LangSelect() {
  const { i18n } = useTranslation()
  const initialLang = localStorage.getItem('lang') || i18n.language
  const [lang, setLang] = useState(initialLang)

  useEffect(() => {
    if (initialLang !== i18n.language) {
      i18n.changeLanguage(initialLang)
    }
  }, [])

  const handleChange = (e) => {
    const newLang = e.target.value
    setLang(newLang)
    i18n.changeLanguage(newLang)
    localStorage.setItem('lang', newLang)
  }

  return (
    <select
      className="lang-select"
      aria-label="Sélecteur de langue"
      value={lang}
      onChange={handleChange}
    >
      <option value="fr">🇫🇷</option>
      <option value="en">🇬🇧</option>
    </select>
  )
}
