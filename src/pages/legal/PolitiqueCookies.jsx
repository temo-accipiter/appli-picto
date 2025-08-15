import { LegalMarkdown } from '@/components'
import { POLITIQUE_COOKIES_MD } from '@/assets'
export default function PolitiqueCookies() {
  return (
    <LegalMarkdown
      title="Politique de Cookies"
      content={POLITIQUE_COOKIES_MD}
    />
  )
}
