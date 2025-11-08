import { getGA4ComplianceStatus } from '@/config/analytics'
import {
  CGU_MD,
  CGV_MD,
  MENTIONS_LEGALES_MD,
  POLITIQUE_CONFIDENTIALITE_MD,
  POLITIQUE_COOKIES_MD,
} from '@/assets'
import {
  checkTransfersCompliance,
  generateComplianceReport,
  getTransfersInfo,
} from '@/config/constants/legalConfig'
import {
  testDocumentPlaceholders,
  testLegalConfiguration,
} from '@/utils/testLegalConfig'
import { useState } from 'react'

export default function LegalConfigTester() {
  const [testResults, setTestResults] = useState(null)
  const [isTesting, setIsTesting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const runTests = async () => {
    setIsTesting(true)

    try {
      // Test 1 : Configuration générale
      const configResult = testLegalConfiguration()

      // Test 2 : Tous les documents
      const documents = [
        { name: 'Mentions légales', content: MENTIONS_LEGALES_MD },
        { name: 'CGU', content: CGU_MD },
        { name: 'CGV', content: CGV_MD },
        {
          name: 'Politique de confidentialité',
          content: POLITIQUE_CONFIDENTIALITE_MD,
        },
        { name: 'Politique de cookies', content: POLITIQUE_COOKIES_MD },
      ]

      const documentResults = documents.map(doc => ({
        name: doc.name,
        result: testDocumentPlaceholders(doc.content, doc.name),
      }))

      // Test 3 : Transferts hors UE
      const transfersCompliance = checkTransfersCompliance()

      // Test 4 : Conformité GA4
      const ga4Status = getGA4ComplianceStatus()

      setTestResults({
        config: configResult,
        documents: documentResults,
        transfers: transfersCompliance,
        ga4: ga4Status,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Erreur lors des tests:', error)
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsTesting(false)
    }
  }

  const clearResults = () => {
    setTestResults(null)
    setShowDetails(false)
  }

  const generateReport = () => {
    const report = generateComplianceReport()
    console.log('📊 Rapport de conformité complet:', report)

    // Créer un fichier de rapport téléchargeable
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-conformite-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!testResults) {
    return (
      <div className="legal-config-tester">
        <h3>🧪 Testeur de Configuration Légale</h3>
        <p>
          Ce composant vous permet de tester que tous vos documents légaux
          affichent correctement vos informations et respectent la conformité
          RGPD.
        </p>
        <button className="btn" onClick={runTests} disabled={isTesting}>
          {isTesting ? 'Tests en cours...' : 'Lancer les tests de conformité'}
        </button>
        <p className="legal-config-tester__note">
          <strong>Note :</strong> Ouvrez la console du navigateur pour voir les
          résultats détaillés.
        </p>
      </div>
    )
  }

  return (
    <div className="legal-config-tester">
      <h3>🧪 Résultats des Tests de Conformité</h3>

      {testResults.error ? (
        <div className="legal-config-tester__error">
          <h4>❌ Erreur lors des tests</h4>
          <p>{testResults.error}</p>
        </div>
      ) : (
        <>
          <div className="legal-config-tester__summary">
            <h4>📋 Résumé des Tests</h4>

            {/* Configuration générale */}
            <div className="test-section">
              <h5>Configuration générale</h5>
              <p className={testResults.config ? 'status-ok' : 'status-error'}>
                {testResults.config ? '✅ OK' : '❌ Erreur'}
              </p>
            </div>

            {/* Documents légaux */}
            <div className="test-section">
              <h5>Documents légaux</h5>
              <ul>
                {testResults.documents.map((doc, index) => (
                  <li
                    key={index}
                    className={doc.result ? 'status-ok' : 'status-error'}
                  >
                    {doc.name}:{' '}
                    {doc.result ? '✅ OK' : '❌ Placeholders restants'}
                  </li>
                ))}
              </ul>
            </div>

            {/* Transferts hors UE */}
            <div className="test-section">
              <h5>Transferts hors UE</h5>
              <p
                className={
                  testResults.transfers.compliant ===
                  testResults.transfers.total
                    ? 'status-ok'
                    : 'status-warning'
                }
              >
                {testResults.transfers.compliant}/{testResults.transfers.total}{' '}
                conformes
              </p>
              <button
                className="btn btn-small"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Masquer' : 'Voir'} les détails
              </button>
            </div>

            {/* Conformité GA4 */}
            <div className="test-section">
              <h5>Google Analytics 4</h5>
              <p
                className={
                  testResults.ga4.isPrivacyCompliant
                    ? 'status-ok'
                    : 'status-warning'
                }
              >
                {testResults.ga4.isPrivacyCompliant
                  ? '✅ Mode respectueux activé'
                  : '⚠️ Vérification nécessaire'}
              </p>
            </div>

            <p className="legal-config-tester__timestamp">
              Tests effectués le :{' '}
              {new Date(testResults.timestamp).toLocaleString('fr-FR')}
            </p>
          </div>

          {/* Détails des transferts hors UE */}
          {showDetails && (
            <div className="legal-config-tester__details">
              <h4>🌍 Détails des Transferts Hors UE</h4>
              {Object.entries(getTransfersInfo()).map(([key, transfer]) => (
                <div key={key} className="transfer-details">
                  <h5>
                    {transfer.provider} ({transfer.country})
                  </h5>
                  <div className="transfer-info">
                    <p>
                      <strong>Base légale :</strong> {transfer.legalBasis}
                    </p>
                    <p>
                      <strong>Garanties :</strong>
                    </p>
                    <ul>
                      {transfer.safeguards.map((safeguard, index) => (
                        <li key={index}>{safeguard}</li>
                      ))}
                    </ul>
                    <p>
                      <strong>Risques :</strong>
                    </p>
                    <ul>
                      {transfer.risks.map((risk, index) => (
                        <li key={index}>{risk}</li>
                      ))}
                    </ul>
                    <p>
                      <strong>Droits utilisateur :</strong>
                    </p>
                    <ul>
                      {transfer.userRights.map((right, index) => (
                        <li key={index}>{right}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="legal-config-tester__actions">
            <button className="btn" onClick={runTests}>
              Relancer les tests
            </button>
            <button className="btn btn-secondary" onClick={generateReport}>
              📊 Générer rapport
            </button>
            <button className="btn btn-outline" onClick={clearResults}>
              Effacer les résultats
            </button>
          </div>
        </>
      )}

      <div className="legal-config-tester__help">
        <h4>💡 Comment utiliser ce testeur</h4>
        <ol>
          <li>
            Modifiez <code>src/data/legalConfig.js</code> avec vos vraies
            informations
          </li>
          <li>Lancez les tests pour vérifier la conformité</li>
          <li>Consultez la console pour les détails techniques</li>
          <li>Générez un rapport de conformité si nécessaire</li>
          <li>Supprimez ce composant une fois tout configuré</li>
        </ol>

        <h4>🔍 Vérifications effectuées</h4>
        <ul>
          <li>
            <strong>Configuration :</strong> Vérification des informations de
            base
          </li>
          <li>
            <strong>Documents :</strong> Détection des placeholders restants
          </li>
          <li>
            <strong>Transferts UE :</strong> Conformité RGPD des transferts hors
            UE
          </li>
          <li>
            <strong>GA4 :</strong> Paramètres de respect de la vie privée
          </li>
        </ul>
      </div>
    </div>
  )
}
