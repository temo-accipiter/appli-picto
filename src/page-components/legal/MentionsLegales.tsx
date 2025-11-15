import { LegalMarkdown } from '@/components'
import { MENTIONS_LEGALES_MD, LEGAL_NOTICES_EN_MD } from '@/assets'
import { useI18n } from '@/hooks'

export default function MentionsLegales() {
  const { language } = useI18n()
  const content = language === 'en' ? LEGAL_NOTICES_EN_MD : MENTIONS_LEGALES_MD
  const title = language === 'en' ? 'Legal Notices' : 'Mentions légales'

  return <LegalMarkdown title={title} content={content} />
}
