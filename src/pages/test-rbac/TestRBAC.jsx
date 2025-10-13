import { PermissionsTest } from '@/components/shared/permissions-test/PermissionsTest'
import './TestRBAC.scss'

/**
 * Page temporaire pour tester les nouvelles fonctions canAll et canAny (Phase 1)
 */
export default function TestRBAC() {
  return (
    <div className="test-rbac-page">
      <h1>🧪 Test RBAC - Phase 1</h1>
      <p className="description">
        Cette page teste les nouvelles fonctions <code>canAll()</code> et{' '}
        <code>canAny()</code> implémentées dans PermissionsContext.
      </p>
      <PermissionsTest />
    </div>
  )
}
