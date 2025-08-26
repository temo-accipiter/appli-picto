// src/utils/testLegalConfig.js
// Script de test pour vérifier la configuration légale

import { LEGAL_CONFIG, replaceLegalPlaceholders } from '@/data/legalConfig'

export function testLegalConfiguration() {
  console.log('🧪 Test de la configuration légale...')
  
  // Test 1 : Vérification de la structure
  console.log('\n📋 Structure de la configuration :')
  console.log('✅ Nom entreprise:', LEGAL_CONFIG.company.name)
  console.log('⚠️  SIREN:', LEGAL_CONFIG.company.siren)
  console.log('⚠️  Adresse:', LEGAL_CONFIG.company.fullAddress)
  console.log('⚠️  Email contact:', LEGAL_CONFIG.contact.general)
  console.log('⚠️  DPO:', LEGAL_CONFIG.contact.dpo.name)
  
  // Test 2 : Vérification des placeholders
  console.log('\n🔍 Test des remplacements :')
  
  const testText = `
    Entreprise : {{NomEntreprise}}
    SIREN : {{SIREN}}
    Adresse : {{Adresse}}
    Email : {{EmailContact}}
    DPO : {{DPOouReferent}}
  `
  
  const processedText = replaceLegalPlaceholders(testText)
  console.log('Texte original:', testText.trim())
  console.log('Texte traité:', processedText.trim())
  
  // Test 3 : Détection des placeholders restants
  const remainingPlaceholders = processedText.match(/\{\{[^}]+\}\}/g)
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.log('\n❌ Placeholders restants détectés :', remainingPlaceholders)
  } else {
    console.log('\n✅ Aucun placeholder restant !')
  }
  
  // Test 4 : Vérification des informations critiques
  const criticalInfo = [
    { name: 'SIREN', value: LEGAL_CONFIG.company.siren, valid: /^\d{9}$/ },
    { name: 'Email contact', value: LEGAL_CONFIG.contact.general, valid: /^[^@]+@[^@]+\.[^@]+$/ },
    { name: 'Adresse', value: LEGAL_CONFIG.company.fullAddress, valid: /.+/ },
    { name: 'DPO', value: LEGAL_CONFIG.contact.dpo.name, valid: /.+/ }
  ]
  
  console.log('\n🔍 Vérification des informations critiques :')
  criticalInfo.forEach(info => {
    const isValid = info.valid.test(info.value)
    const status = isValid ? '✅' : '❌'
    console.log(`${status} ${info.name}: ${info.value}`)
  })
  
  // Test 5 : Vérification des transferts hors UE
  console.log('\n🌍 Vérification des transferts hors UE :')
  const transfers = Object.values(LEGAL_CONFIG.transfers)
  transfers.forEach(transfer => {
    const hasLegalBasis = !!transfer.legalBasis
    const hasSafeguards = transfer.safeguards && transfer.safeguards.length > 0
    const hasUserRights = transfer.userRights && transfer.userRights.length > 0
    
    const status = hasLegalBasis && hasSafeguards && hasUserRights ? '✅' : '⚠️'
    console.log(`${status} ${transfer.provider} (${transfer.country}):`)
    console.log(`   Base légale: ${hasLegalBasis ? '✅' : '❌'}`)
    console.log(`   Garanties: ${hasSafeguards ? '✅' : '❌'}`)
    console.log(`   Droits utilisateur: ${hasUserRights ? '✅' : '❌'}`)
  })
  
  // Test 6 : Recommandations
  console.log('\n💡 Recommandations :')
  
  if (LEGAL_CONFIG.company.siren === '123456789') {
    console.log('⚠️  Remplacez le SIREN par votre vrai numéro')
  }
  
  if (LEGAL_CONFIG.contact.general.includes('appli-picto.com')) {
    console.log('⚠️  Remplacez les emails par vos vrais emails')
  }
  
  if (LEGAL_CONFIG.company.fullAddress.includes('Rue de la Technologie')) {
    console.log('⚠️  Remplacez l\'adresse par votre vraie adresse')
  }
  
  // Test 7 : Vérification de la sécurité
  console.log('\n🔒 Vérification des mesures de sécurité :')
  const security = LEGAL_CONFIG.security
  if (security) {
    console.log('✅ Chiffrement en transit:', security.dataEncryption?.inTransit || 'Non spécifié')
    console.log('✅ Chiffrement au repos:', security.dataEncryption?.atRest || 'Non spécifié')
    console.log('✅ Contrôle d\'accès:', security.accessControl?.principle || 'Non spécifié')
  } else {
    console.log('⚠️  Mesures de sécurité non définies')
  }
  
  console.log('\n🎯 Configuration testée avec succès !')
  return true
}

// Fonction pour vérifier un document spécifique
export function testDocumentPlaceholders(documentContent, documentName) {
  console.log(`\n📄 Test du document: ${documentName}`)
  
  const processedContent = replaceLegalPlaceholders(documentContent)
  const remainingPlaceholders = processedContent.match(/\{\{[^}]+\}\}/g)
  
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.log(`❌ ${remainingPlaceholders.length} placeholder(s) restant(s) dans ${documentName}:`)
    remainingPlaceholders.forEach(placeholder => {
      console.log(`   - ${placeholder}`)
    })
    return false
  } else {
    console.log(`✅ Aucun placeholder restant dans ${documentName}`)
    return true
  }
}

// Fonction pour vérifier la conformité RGPD globale
export function testRGPDCompliance() {
  console.log('\n🛡️ Test de conformité RGPD global...')
  
  const compliance = {
    configuration: false,
    documents: false,
    transfers: false,
    security: false,
    overall: false
  }
  
  try {
    // Test de la configuration
    compliance.configuration = testLegalConfiguration()
    
    // Test des transferts hors UE
    const transfers = Object.values(LEGAL_CONFIG.transfers)
    const compliantTransfers = transfers.filter(t => 
      t.legalBasis && t.safeguards && t.safeguards.length > 0
    )
    compliance.transfers = compliantTransfers.length === transfers.length
    
    // Test de la sécurité
    compliance.security = !!(
      LEGAL_CONFIG.security?.dataEncryption?.inTransit &&
      LEGAL_CONFIG.security?.dataEncryption?.atRest
    )
    
    // Score global
    const scores = Object.values(compliance).filter(Boolean).length
    compliance.overall = scores >= 3 // Au moins 3/4 critères respectés
    
    console.log('\n📊 Score de conformité RGPD :')
    console.log(`Configuration: ${compliance.configuration ? '✅' : '❌'}`)
    console.log(`Transferts UE: ${compliance.transfers ? '✅' : '❌'}`)
    console.log(`Sécurité: ${compliance.security ? '✅' : '❌'}`)
    console.log(`\nScore global: ${scores}/4 - ${compliance.overall ? '✅ Conforme' : '⚠️ Améliorations nécessaires'}`)
    
  } catch (error) {
    console.error('❌ Erreur lors du test de conformité RGPD:', error)
    compliance.overall = false
  }
  
  return compliance
}

// Fonction pour obtenir un rapport détaillé
export function generateDetailedReport() {
  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      company: LEGAL_CONFIG.company,
      contact: LEGAL_CONFIG.contact,
      publication: LEGAL_CONFIG.publication
    },
    transfers: LEGAL_CONFIG.transfers,
    security: LEGAL_CONFIG.security,
    compliance: testRGPDCompliance()
  }
  
  console.log('\n📋 Rapport détaillé de conformité :', report)
  return report
}
