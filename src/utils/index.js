// src/utils/index.js
// Export centralisé de tous les utilitaires

export * from './consent'
export * from './getDisplayPseudo'
export * from './rgpdExport'
export * from './supabaseClient'
export * from './validationRules'

// Utilitaires de test de configuration légale
export {
    generateDetailedReport,
    testDocumentPlaceholders,
    testLegalConfiguration,
    testRGPDCompliance
} from './testLegalConfig'

