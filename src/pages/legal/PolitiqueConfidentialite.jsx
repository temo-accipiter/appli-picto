import { LegalMarkdown } from '@/components'
import { POLITIQUE_CONFIDENTIALITE_MD } from '@/assets'
export default function PolitiqueConfidentialite() {
  return (
    <LegalMarkdown
      title="Politique de Confidentialité"
      content={POLITIQUE_CONFIDENTIALITE_MD}
    />
  )
}
