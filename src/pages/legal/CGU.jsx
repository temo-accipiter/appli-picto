import { LegalMarkdown } from '@/components'
import { CGU_MD, TERMS_OF_USE_EN_MD } from '@/assets'
import { useI18n } from '@/hooks'

export default function CGU() {
  const { language } = useI18n()
  const content = language === 'en' ? TERMS_OF_USE_EN_MD : CGU_MD
  const title =
    language === 'en' ? 'Terms of Use' : "Conditions Générales d'Utilisation"

  return <LegalMarkdown title={title} content={content} />
}
