// src/data/legalConfig.js
// Configuration centralisée pour toutes les informations légales
// À compléter avec vos vraies informations

export const LEGAL_CONFIG = {
  // Informations de l'entreprise
  company: {
    name: 'Appli Picto',
    legalForm: 'SAS', // ou SASU, EURL, etc.
    siren: '123456789', // À remplacer par votre vrai SIREN
    address: {
      street: '123 Rue de la Technologie',
      city: '75001 Paris',
      country: 'France',
    },
    fullAddress: '123 Rue de la Technologie, 75001 Paris, France',
  },

  // Contacts
  contact: {
    general: 'contact@appli-picto.com', // À remplacer par votre vrai email
    support: 'support@appli-picto.com', // À remplacer par votre vrai email support
    dpo: {
      name: 'Jean Dupont', // À remplacer par le nom de votre DPO
      email: 'dpo@appli-picto.com', // À remplacer par l'email de votre DPO
    },
  },

  // Responsable de publication
  publication: {
    responsible: 'Jean Dupont', // À remplacer par le nom du responsable
    email: 'publication@appli-picto.com', // À remplacer par l'email du responsable
  },

  // Développement et maintenance
  development: {
    team: 'Équipe Appli Picto', // À remplacer par le nom de votre équipe
    maintenance: 'Équipe Appli Picto', // À remplacer par le nom de votre équipe de maintenance
  },

  // Médiation
  mediation: {
    name: 'Médiateur de la Consommation', // À remplacer par le nom de votre médiateur
    url: 'https://www.mediation-conso.fr', // À remplacer par l'URL de votre médiateur
    contact: 'mediation@appli-picto.com', // À remplacer par le contact de votre médiateur
  },

  // Hébergement (déjà correct avec Supabase)
  hosting: {
    provider: 'Supabase',
    company: 'Supabase Inc.',
    website: 'https://supabase.com',
    location: 'États-Unis (avec garanties RGPD)',
  },

  // URLs de l'application
  urls: {
    main: 'https://appli-picto.com', // À remplacer par votre vraie URL
    rgpd: '/rgpd',
    cookies: '/politique-cookies',
    privacy: '/politique-confidentialite',
    terms: '/cgu',
    sales: '/cgv',
  },

  // Version et dates
  version: {
    current: '1.0.0',
    lastUpdate: 'Décembre 2024',
  },

  // === TRANSFERTS HORS UE - CONFORMITÉ RGPD ===
  transfers: {
    // Google Analytics 4
    googleAnalytics: {
      provider: 'Google LLC',
      country: 'États-Unis',
      legalBasis:
        "Consentement explicite de l'utilisateur (Article 49.1.a RGPD)",
      safeguards: [
        "Clauses contractuelles types de l'UE (SCC) approuvées par la Commission européenne",
        'Certification Privacy Shield (si applicable)',
        "Codes de conduite approuvés par l'autorité de contrôle compétente",
        "Certifications approuvées par l'autorité de contrôle compétente",
      ],
      risks: [
        'Accès possible par les autorités américaines (FISA, Patriot Act)',
        'Surveillance gouvernementale potentielle',
        'Lois de sécurité nationale américaines',
      ],
      userRights: [
        'Droit de refuser le transfert (refus du consentement analytics)',
        "Droit à l'effacement des données",
        'Droit de retrait du consentement à tout moment',
        "Droit d'accès aux données transférées",
      ],
      dataTypes: [
        'Adresse IP anonymisée',
        'Données de navigation (pages vues, temps passé)',
        'Informations techniques (navigateur, appareil)',
        "Données d'audience agrégées",
      ],
      retentionPeriod: '2 ans maximum (conforme aux recommandations CNIL)',
      optOutMechanism: 'Bannière de consentement avec option de refus facile',
    },

    // Stripe (paiements)
    stripe: {
      provider: 'Stripe Inc.',
      country: 'États-Unis',
      legalBasis: "Exécution d'un contrat (Article 49.1.b RGPD)",
      safeguards: [
        "Clauses contractuelles types de l'UE (SCC)",
        'Certification PCI DSS (norme de sécurité des paiements)',
        'Chiffrement des données en transit et au repos',
        'Audits de sécurité réguliers',
      ],
      risks: [
        'Accès possible par les autorités américaines',
        'Lois de sécurité nationale américaines',
      ],
      userRights: [
        "Droit d'accès aux données de paiement",
        'Droit de rectification des informations de facturation',
        "Droit à l'effacement (selon les obligations légales)",
        'Droit à la portabilité des données',
      ],
      dataTypes: [
        'Informations de facturation (nom, adresse)',
        'Données de paiement (chiffrées)',
        'Historique des transactions',
        'Informations de contact',
      ],
      retentionPeriod: '10 ans (obligation comptable française)',
      optOutMechanism: 'Impossible (nécessaire pour les paiements)',
    },

    // Supabase (hébergement principal)
    supabase: {
      provider: 'Supabase Inc.',
      country: 'Union Européenne (principal) + États-Unis (certains services)',
      legalBasis:
        'Intérêt légitime et exécution de contrat (Articles 6.1.f et 6.1.b RGPD)',
      safeguards: [
        "Hébergement principal dans l'UE (conformité RGPD)",
        'Clauses contractuelles types pour les services US',
        'Certifications de sécurité (SOC 2, ISO 27001)',
        'Chiffrement des données en transit et au repos',
      ],
      risks: [
        'Transferts limités vers les États-Unis pour certains services',
        'Accès possible par les autorités américaines (services US uniquement)',
      ],
      userRights: [
        "Droit d'accès aux données stockées",
        'Droit de rectification des informations',
        "Droit à l'effacement des données",
        'Droit à la portabilité',
      ],
      dataTypes: [
        'Données utilisateur (profil, préférences)',
        "Contenu créé par l'utilisateur",
        "Données d'authentification",
        "Logs de connexion et d'utilisation",
      ],
      retentionPeriod: 'Selon la politique de confidentialité',
      optOutMechanism:
        'Impossible (nécessaire pour le fonctionnement du service)',
    },
  },

  // === GARANTIES ET MESURES DE SÉCURITÉ ===
  security: {
    dataEncryption: {
      inTransit: 'HTTPS/TLS 1.3',
      atRest: 'Chiffrement AES-256',
      authentication: 'JWT sécurisés avec rotation',
    },
    accessControl: {
      principle: 'Principe du moindre privilège',
      authentication: 'Authentification multi-facteurs disponible',
      authorization: "Contrôle d'accès basé sur les rôles",
    },
    monitoring: {
      logs: 'Journalisation des accès et modifications',
      alerts: "Alertes en cas d'activité suspecte",
      audits: 'Audits de sécurité réguliers',
    },
  },
}

// Fonction utilitaire pour remplacer les placeholders dans le texte
export function replaceLegalPlaceholders(text) {
  if (!text) return text

  return (
    text
      // Informations de l'entreprise
      .replace(/\{\{NomEntreprise\}\}/g, LEGAL_CONFIG.company.name)
      .replace(/\{\{FormeJuridique\}\}/g, LEGAL_CONFIG.company.legalForm)
      .replace(/\{\{SIREN\}\}/g, LEGAL_CONFIG.company.siren)
      .replace(/\{\{Adresse\}\}/g, LEGAL_CONFIG.company.fullAddress)
      .replace(/\{\{AdresseComplète\}\}/g, LEGAL_CONFIG.company.fullAddress)

      // Contacts
      .replace(/\{\{EmailContact\}\}/g, LEGAL_CONFIG.contact.general)
      .replace(
        /\{\{EmailDeContactÀCompléter\}\}/g,
        LEGAL_CONFIG.contact.general
      )
      .replace(
        /\{\{EmailDuSupportÀCompléter\}\}/g,
        LEGAL_CONFIG.contact.support
      )

      // DPO
      .replace(/\{\{DPOouReferent\}\}/g, LEGAL_CONFIG.contact.dpo.name)
      .replace(
        /\{\{NomEtEmailDuDPOÀCompléter\}\}/g,
        `${LEGAL_CONFIG.contact.dpo.name} (${LEGAL_CONFIG.contact.dpo.email})`
      )

      // Responsable de publication
      .replace(
        /\{\{ResponsablePublication\}\}/g,
        LEGAL_CONFIG.publication.responsible
      )
      .replace(
        /\{\{NomDuResponsableÀCompléter\}\}/g,
        LEGAL_CONFIG.publication.responsible
      )
      .replace(
        /\{\{EmailDuResponsableÀCompléter\}\}/g,
        LEGAL_CONFIG.publication.email
      )

      // Développement
      .replace(
        /\{\{NomDeLéquipeDéveloppeurÀCompléter\}\}/g,
        LEGAL_CONFIG.development.team
      )
      .replace(
        /\{\{NomDeLéquipeDeMaintenanceÀCompléter\}\}/g,
        LEGAL_CONFIG.development.maintenance
      )

      // Médiation
      .replace(/\{\{MédiateurÀPréciser\}\}/g, LEGAL_CONFIG.mediation.name)
      .replace(
        /\{\{ContactDuMédiateurÀCompléter\}\}/g,
        LEGAL_CONFIG.mediation.contact
      )
      .replace(
        /\{\{LienVersLeMédiateurÀCompléter\}\}/g,
        LEGAL_CONFIG.mediation.url
      )

      // URLs
      .replace(/\{\{URLSite\}\}/g, LEGAL_CONFIG.urls.main)
      .replace(/\{\{NomSite\}\}/g, LEGAL_CONFIG.company.name)
      .replace(/\{\{LienVersLePortailRGPD\}\}/g, LEGAL_CONFIG.urls.rgpd)

      // Hébergement
      .replace(/\{\{Hebergeur\}\}/g, LEGAL_CONFIG.hosting.provider)
      .replace(/\{\{AdresseHebergeur\}\}/g, LEGAL_CONFIG.hosting.company)
      .replace(/\{\{TelephoneHebergeur\}\}/g, LEGAL_CONFIG.hosting.website)

      // Dates
      .replace(/\{\{Date\}\}/g, LEGAL_CONFIG.version.lastUpdate)
      .replace(/\{\{DateMAJ\}\}/g, LEGAL_CONFIG.version.lastUpdate)
  )
}

// === FONCTIONS UTILITAIRES POUR LA CONFORMITÉ ===

// Fonction pour obtenir les informations sur les transferts hors UE
export function getTransfersInfo() {
  return LEGAL_CONFIG.transfers
}

// Fonction pour vérifier la conformité des transferts
export function checkTransfersCompliance() {
  const transfers = Object.values(LEGAL_CONFIG.transfers)
  const compliance = {
    total: transfers.length,
    compliant: 0,
    details: [],
  }

  transfers.forEach(transfer => {
    const isCompliant =
      transfer.legalBasis &&
      transfer.safeguards &&
      transfer.safeguards.length > 0
    if (isCompliant) compliance.compliant++

    compliance.details.push({
      provider: transfer.provider,
      country: transfer.country,
      compliant: isCompliant,
      legalBasis: transfer.legalBasis,
    })
  })

  return compliance
}

// Fonction pour générer un rapport de conformité
export function generateComplianceReport() {
  return {
    company: LEGAL_CONFIG.company,
    transfers: getTransfersInfo(),
    compliance: checkTransfersCompliance(),
    security: LEGAL_CONFIG.security,
    lastUpdate: LEGAL_CONFIG.version.lastUpdate,
  }
}
