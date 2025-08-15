import { LegalMarkdown } from '@/components'

const content = `
# Déclaration d’accessibilité
Nous visons la conformité **WCAG 2.1 AA**. Si vous rencontrez une difficulté d’accès,
écrivez-nous à {{EmailContact}}. Dernière mise à jour : {{DateMAJ}}.
`

export default function Accessibilite() {
  return <LegalMarkdown title="Accessibilité" content={content} />
}
