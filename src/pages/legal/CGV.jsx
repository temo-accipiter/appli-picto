import { LegalMarkdown } from '@/components'
import { CGV_MD } from '@/assets'
export default function CGV() {
  return (
    <LegalMarkdown title="Conditions Générales de Vente" content={CGV_MD} />
  )
}
