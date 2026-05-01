'use client'

// src/page-components/admin/permissions/Permissions.tsx
/**
 * Page admin : Vue récapitulative des règles d'accès par statut.
 *
 * Règles "Refactor Admin" (ux.md) :
 * - Statuts exclusifs : Visitor / Free / Abonné / Admin
 * - Aucune logique de rôle supplémentaire
 * - Vue lecture uniquement (pas de modification des droits)
 * - Guard appliqué en amont par AdminRoute
 */
import { Button } from '@/components'
import { useRouter } from 'next/navigation'
import './Permissions.scss'

// ============================================================================
// Données statiques — règles métier du FRONTEND_CONTRACT.md §3
// ============================================================================

type AccèsNiveau = 'oui' | 'non' | 'partiel' | 'local'

interface RegleAccès {
  action: string
  visitor: AccèsNiveau
  free: AccèsNiveau
  subscriber: AccèsNiveau
  admin: AccèsNiveau
  note?: string
}

interface SectionPermissions {
  titre: string
  regles: RegleAccès[]
}

const SECTIONS_PERMISSIONS: SectionPermissions[] = [
  {
    titre: '📋 Tableau de bord enfant',
    regles: [
      {
        action: 'Accéder au Tableau',
        visitor: 'oui',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Exécuter une session (valider étapes)',
        visitor: 'oui',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Réinitialiser une session',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Visualiser mini-timeline séquence',
        visitor: 'oui',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
    ],
  },
  {
    titre: '✏️ Édition — Plannings',
    regles: [
      {
        action: 'Créer / modifier une timeline',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Organiser les slots (créneaux)',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Modifier les jetons de récompense',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Édition offline (sans réseau)',
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'non',
        note: 'Interdit pour tous — guard UX + toast',
      },
    ],
  },
  {
    titre: '🃏 Cartes & Catégories',
    regles: [
      {
        action: 'Consulter la banque de cartes',
        visitor: 'oui',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Créer des cartes personnelles',
        visitor: 'non',
        free: 'non',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Créer / gérer des catégories',
        visitor: 'non',
        free: 'non',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Publier une carte en banque',
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'oui',
        note: 'Admin uniquement — RLS write',
      },
    ],
  },
  {
    titre: '🔗 Séquençage',
    regles: [
      {
        action: 'Créer / modifier une séquence',
        visitor: 'local',
        free: 'non',
        subscriber: 'oui',
        admin: 'oui',
        note: 'Visitor = local uniquement (IndexedDB)',
      },
      {
        action: 'Afficher mini-timeline séquence',
        visitor: 'oui',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
    ],
  },
  {
    titre: '👤 Profil & Compte',
    regles: [
      {
        action: 'Accéder à la page Profil',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: 'Créer un profil enfant',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
        note: 'Free = 1 max, Abonné = 3 max, Admin = illimité',
      },
      {
        action: 'Gérer les appareils',
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'oui',
      },
      {
        action: "Accéder à l'abonnement Stripe",
        visitor: 'non',
        free: 'oui',
        subscriber: 'oui',
        admin: 'non',
        note: 'Admin = statut attribué manuellement, pas via Stripe',
      },
    ],
  },
  {
    titre: '🛡️ Administration',
    regles: [
      {
        action: "Accéder à l'espace admin",
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'oui',
      },
      {
        action: "Consulter les logs d'abonnement",
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'oui',
      },
      {
        action: 'Support ciblé (métriques compte)',
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'oui',
      },
      {
        action: 'Publier / dépublier cartes banque',
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'oui',
      },
      {
        action: 'Voir les images personnelles des comptes',
        visitor: 'non',
        free: 'non',
        subscriber: 'non',
        admin: 'non',
        note: 'Interdit pour tous y compris Admin — Storage policies',
      },
    ],
  },
]

interface QuotaLigne {
  label: string
  visitor: string
  free: string
  subscriber: string
  admin: string
}

const QUOTAS: QuotaLigne[] = [
  {
    label: 'Profils enfants',
    visitor: '0',
    free: '1',
    subscriber: '3',
    admin: '∞',
  },
  {
    label: 'Appareils enregistrés',
    visitor: '0',
    free: '1',
    subscriber: '3',
    admin: '∞',
  },
  {
    label: 'Cartes personnelles',
    visitor: '0',
    free: '0',
    subscriber: '50 / mois',
    admin: '∞',
  },
  {
    label: 'Timelines par profil',
    visitor: '0',
    free: '3',
    subscriber: '10',
    admin: '∞',
  },
  {
    label: 'Catégories',
    visitor: '0',
    free: '0',
    subscriber: '20',
    admin: '∞',
  },
  {
    label: 'Séquences',
    visitor: 'local',
    free: '0',
    subscriber: '20',
    admin: '∞',
  },
]

// ============================================================================
// Composants d'affichage
// ============================================================================

const ICONES_ACCÈS: Record<
  AccèsNiveau,
  { icon: string; label: string; cls: string }
> = {
  oui: { icon: '✓', label: 'Autorisé', cls: 'perm-allowed' },
  non: { icon: '✗', label: 'Refusé', cls: 'perm-denied' },
  partiel: { icon: '~', label: 'Partiel', cls: 'perm-partial' },
  local: { icon: '⊙', label: 'Local uniquement', cls: 'perm-partial' },
}

const ROLES = ['visitor', 'free', 'subscriber', 'admin'] as const
type Role = (typeof ROLES)[number]

const LABELS_ROLES: Record<Role, string> = {
  visitor: 'Visiteur',
  free: 'Gratuit',
  subscriber: 'Abonné',
  admin: 'Admin',
}

function IconeAccès({ niveau }: { niveau: AccèsNiveau }) {
  const { icon, label, cls } = ICONES_ACCÈS[niveau]
  return (
    <span className={cls} title={label} aria-label={label}>
      {icon}
    </span>
  )
}

function LigneRegle({ regle }: { regle: RegleAccès }) {
  return (
    <div className="permissions-row">
      <div className="permissions-action">
        {regle.action}
        {regle.note && (
          <small className="permissions__action-note">{regle.note}</small>
        )}
      </div>
      <div className="permissions-cells">
        {ROLES.map(role => (
          <div key={role} className="permissions-cell">
            <span className="permissions-cell__role">{LABELS_ROLES[role]}</span>
            <span className="permissions-cell__value">
              <IconeAccès niveau={regle[role]} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Permissions() {
  const router = useRouter()

  return (
    <div className="permissions-page">
      <h1>Règles d&apos;accès par statut</h1>
      <p>
        Vue lecture — conforme au contrat FRONTEND_CONTRACT.md §3. Aucune
        modification possible depuis cette interface.
      </p>

      {/* Statuts disponibles */}
      <section className="permissions-section" aria-label="Statuts utilisateur">
        <h2>Statuts utilisateur</h2>
        <div className="permissions__badges">
          <span className="status-badge status-badge--visitor">Visiteur</span>
          <span className="status-badge status-badge--free">Gratuit</span>
          <span className="status-badge status-badge--subscriber">Abonné</span>
          <span className="status-badge status-badge--admin">Admin</span>
        </div>
        <p className="permissions__roles-note">
          Aucun rôle supplémentaire ne doit subsister dans le système.
        </p>
      </section>

      {/* Sections de règles */}
      {SECTIONS_PERMISSIONS.map(section => (
        <section
          key={section.titre}
          className="permissions-section"
          aria-label={section.titre}
        >
          <h2>{section.titre}</h2>
          <div className="permissions-grid">
            {section.regles.map(regle => (
              <LigneRegle key={regle.action} regle={regle} />
            ))}
          </div>
        </section>
      ))}

      {/* Quotas */}
      <section className="permissions-section" aria-label="Quotas par statut">
        <h2>📊 Quotas par statut</h2>
        <div className="permissions-quotas">
          {QUOTAS.map(quota => (
            <div key={quota.label} className="permissions-quota-row">
              <span className="permissions-quota-row__label">
                {quota.label}
              </span>
              <div className="permissions-quota-row__values">
                {ROLES.map(role => (
                  <div key={role} className="permissions-quota-row__value">
                    {quota[role]}
                    <small>{LABELS_ROLES[role]}</small>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="permissions-footer">
        <Button
          onClick={() => router.push('/profil')}
          label="← Retour au profil"
          variant="secondary"
        />
      </div>
    </div>
  )
}
