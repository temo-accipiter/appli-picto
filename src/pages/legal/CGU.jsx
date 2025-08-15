import { LegalMarkdown } from '@/components'
import { CGU_MD } from '@/assets'
export default function CGU() {
  return (
    <LegalMarkdown
      title="Conditions Générales d’Utilisation"
      content={CGU_MD}
    />
  )
}
