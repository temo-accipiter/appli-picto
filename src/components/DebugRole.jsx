import { usePermissions } from '@/contexts'
import { useSimpleRole } from '@/hooks'

export default function DebugRole() {
  const { role: permissionsRole, loading: permissionsLoading } =
    usePermissions()
  const { role: simpleRole, loading: simpleLoading } = useSimpleRole()

  if (import.meta.env.DEV) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999,
        }}
      >
        <div>🔍 Debug Rôles:</div>
        <div>Permissions: {permissionsLoading ? '⏳' : permissionsRole}</div>
        <div>Simple: {simpleLoading ? '⏳' : simpleRole}</div>
        <div>
          Final: {simpleRole !== 'unknown' ? simpleRole : permissionsRole}
        </div>
      </div>
    )
  }

  return null
}
