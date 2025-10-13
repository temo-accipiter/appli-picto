import { FeatureGate } from '@/components'
import { usePermissions } from '@/contexts'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import './PermissionsTest.scss'

/**
 * Composant de test simple pour vérifier le système de permissions
 * Affiche le statut actuel et teste quelques fonctionnalités
 */
export const PermissionsTest = () => {
  const {
    role,
    can: _can,
    canAll: _canAll,
    canAny: _canAny,
    loading,
    isVisitor,
    isSubscriber,
    isAdmin,
  } = usePermissions()

  if (loading) {
    return (
      <div className="permissions-test loading">
        <AlertCircle size={20} />
        <span>Chargement des permissions...</span>
      </div>
    )
  }

  return (
    <div className="permissions-test">
      <h3>🧪 Test du système de permissions</h3>

      {/* Statut actuel */}
      <div className="test-section">
        <h4>Statut actuel :</h4>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Rôle :</span>
            <span className={`value role-${role}`}>{role}</span>
          </div>
          <div className="status-item">
            <span className="label">Visiteur :</span>
            <span className="value">{isVisitor ? '✅' : '❌'}</span>
          </div>
          <div className="status-item">
            <span className="label">Abonné :</span>
            <span className="value">{isSubscriber ? '✅' : '❌'}</span>
          </div>
          <div className="status-item">
            <span className="label">Admin :</span>
            <span className="value">{isAdmin ? '✅' : '❌'}</span>
          </div>
        </div>
      </div>

      {/* Test des fonctionnalités */}
      <div className="test-section">
        <h4>Test des fonctionnalités :</h4>
        <div className="features-test">
          <div className="feature-test">
            <span>Voir la démo :</span>
            <FeatureGate feature="view_demo">
              <CheckCircle size={16} className="success" />
            </FeatureGate>
            <FeatureGate
              feature="view_demo"
              fallback={<XCircle size={16} className="error" />}
            >
              <span>✅ Accès autorisé</span>
            </FeatureGate>
          </div>

          <div className="feature-test">
            <span>Confettis :</span>
            <FeatureGate feature="confetti">
              <CheckCircle size={16} className="success" />
            </FeatureGate>
            <FeatureGate
              feature="confetti"
              fallback={<XCircle size={16} className="error" />}
            >
              <span>✅ Confettis autorisés</span>
            </FeatureGate>
          </div>

          <div className="feature-test">
            <span>Créer des tâches :</span>
            <FeatureGate feature="create_tasks">
              <CheckCircle size={16} className="success" />
            </FeatureGate>
            <FeatureGate
              feature="create_tasks"
              fallback={<XCircle size={16} className="error" />}
            >
              <span>✅ Création autorisée</span>
            </FeatureGate>
          </div>

          <div className="feature-test">
            <span>Panel admin :</span>
            <FeatureGate feature="admin_panel">
              <CheckCircle size={16} className="success" />
            </FeatureGate>
            <FeatureGate
              feature="admin_panel"
              fallback={<XCircle size={16} className="error" />}
            >
              <span>✅ Admin autorisé</span>
            </FeatureGate>
          </div>
        </div>
      </div>

      {/* Test des nouvelles fonctions canAll et canAny */}
      <div className="test-section">
        <h4>🆕 Test canAll & canAny (Phase 1) :</h4>
        <div className="features-test">
          <div className="feature-test">
            <span>canAll([&apos;view_demo&apos;, &apos;confetti&apos;]) :</span>
            <FeatureGate features={['view_demo', 'confetti']} requireAll={true}>
              <CheckCircle size={16} className="success" />
              <span>✅ Les DEUX permissions</span>
            </FeatureGate>
            <FeatureGate
              features={['view_demo', 'confetti']}
              requireAll={true}
              fallback={
                <>
                  <XCircle size={16} className="error" />
                  <span>❌ Au moins une manque</span>
                </>
              }
            >
              {null}
            </FeatureGate>
          </div>

          <div className="feature-test">
            <span>
              canAny([&apos;create_tasks&apos;, &apos;admin_panel&apos;]) :
            </span>
            <FeatureGate
              features={['create_tasks', 'admin_panel']}
              requireAll={false}
            >
              <CheckCircle size={16} className="success" />
              <span>✅ Au moins UNE permission</span>
            </FeatureGate>
            <FeatureGate
              features={['create_tasks', 'admin_panel']}
              requireAll={false}
              fallback={
                <>
                  <XCircle size={16} className="error" />
                  <span>❌ Aucune des deux</span>
                </>
              }
            >
              {null}
            </FeatureGate>
          </div>

          <div className="feature-test">
            <span>
              canAll([&apos;confetti&apos;, &apos;admin_panel&apos;]) :
            </span>
            <FeatureGate
              features={['confetti', 'admin_panel']}
              requireAll={true}
            >
              <CheckCircle size={16} className="success" />
              <span>✅ Les DEUX (rare sauf admin)</span>
            </FeatureGate>
            <FeatureGate
              features={['confetti', 'admin_panel']}
              requireAll={true}
              fallback={
                <>
                  <XCircle size={16} className="error" />
                  <span>❌ Manque admin_panel</span>
                </>
              }
            >
              {null}
            </FeatureGate>
          </div>
        </div>
      </div>

      {/* Instructions de test */}
      <div className="test-section">
        <h4>Instructions de test :</h4>
        <ul className="test-instructions">
          <li>
            🎯 <strong>Visiteur</strong> : Allez sur <code>/</code> → devrait
            rediriger vers <code>/tableau-demo</code>
          </li>
          <li>
            🔐 <strong>Connexion</strong> : Connectez-vous → devrait rediriger
            vers <code>/tableau</code>
          </li>
          <li>
            🎨 <strong>Fonctionnalités</strong> : Testez les boutons
            thème/langue dans la navbar
          </li>
          <li>
            🚫 <strong>Restrictions</strong> : Essayez de changer de ligne en
            mode démo → modal de conversion
          </li>
          <li>
            🐛 <strong>Debug</strong> : Regardez en bas à droite pour le
            composant de debug
          </li>
        </ul>
      </div>
    </div>
  )
}
