'use client'

import { LegalMarkdown } from '@/components'
import { CGV_MD, TERMS_OF_SALE_EN_MD } from '@/assets'
import { useI18n } from '@/hooks'

export default function CGV() {
  const { language } = useI18n()
  const content = language === 'en' ? TERMS_OF_SALE_EN_MD : CGV_MD
  const title =
    language === 'en' ? 'Terms of Sale' : 'Conditions Générales de Vente'

  return <LegalMarkdown title={title} content={content} />
}
