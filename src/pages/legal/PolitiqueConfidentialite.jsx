import { LegalMarkdown } from '@/components'
import { POLITIQUE_CONFIDENTIALITE_MD, PRIVACY_POLICY_EN_MD } from '@/assets'
import { useI18n } from '@/hooks'

export default function PolitiqueConfidentialite() {
  const { language } = useI18n()
  const content =
    language === 'en' ? PRIVACY_POLICY_EN_MD : POLITIQUE_CONFIDENTIALITE_MD
  const title = language === 'en' ? 'Privacy Policy' : 'Politique de Confidentialité'

  return <LegalMarkdown title={title} content={content} />
}
