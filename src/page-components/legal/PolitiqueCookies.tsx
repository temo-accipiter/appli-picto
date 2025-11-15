'use client'

import { LegalMarkdown } from '@/components'
import { POLITIQUE_COOKIES_MD, COOKIE_POLICY_EN_MD } from '@/assets'
import { useI18n } from '@/hooks'

export default function PolitiqueCookies() {
  const { language } = useI18n()
  const content = language === 'en' ? COOKIE_POLICY_EN_MD : POLITIQUE_COOKIES_MD
  const title = language === 'en' ? 'Cookie Policy' : 'Politique de Cookies'

  return <LegalMarkdown title={title} content={content} />
}
