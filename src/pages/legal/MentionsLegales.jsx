import { LegalMarkdown } from '@/components'
import { MENTIONS_LEGALES_MD } from '@/assets'

export default function MentionsLegales() {
  return (
    <LegalMarkdown title="Mentions légales" content={MENTIONS_LEGALES_MD} />
  )
}
