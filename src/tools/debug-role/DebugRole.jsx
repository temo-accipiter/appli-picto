// src/components/DebugRole.jsx
import { usePermissions } from '@/contexts'
import { useSimpleRole } from '@/hooks'

export default function DebugRole() {
  const {
    role: permissionsRole,
    ready,
    isUnknown,
    error,
    reload,
  } = usePermissions()
  const { role: simpleRole, loading: simpleLoading } = useSimpleRole()

  const permissionsLoading = !ready || isUnknown
  const finalRole = simpleRole !== 'unknown' ? simpleRole : permissionsRole

  if (!import.meta.env.DEV) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.86)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 9999,
        lineHeight: 1.4,
        maxWidth: 260,
      }}
    >
      <div>🔍 Debug Rôles:</div>
      <div>Permissions: {permissionsLoading ? '⏳' : permissionsRole}</div>
      <div>Simple: {simpleLoading ? '⏳' : simpleRole}</div>
      <div>Final: {finalRole}</div>
      <div style={{ marginTop: 6, opacity: 0.8 }}>
        ready: {String(ready)} — unknown: {String(isUnknown)}
      </div>
      {error && (
        <div style={{ marginTop: 6, color: '#ffd8d8' }}>
          err: {error?.message || String(error)}
        </div>
      )}
      <button
        style={{ marginTop: 8, padding: '4px 8px', borderRadius: 6 }}
        onClick={() => reload()}
      >
        Recharger rôles
      </button>
    </div>
  )
}
