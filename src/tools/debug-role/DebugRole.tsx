// src/components/DebugRole.jsx
import { useState } from 'react'
import { usePermissions } from '@/contexts'
import { useSimpleRole } from '@/hooks'

export default function DebugRole() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem('debug-role-visible') !== 'false'
  )

  const {
    role: permissionsRole,
    ready,
    isUnknown,
    error,
    reload,
  } = usePermissions()
  const { role: simpleRole } = useSimpleRole()

  const permissionsLoading = !ready || isUnknown
  const finalRole = simpleRole !== 'unknown' ? simpleRole : permissionsRole

  const toggleVisible = () => {
    setVisible(v => {
      localStorage.setItem('debug-role-visible', String(!v))
      return !v
    })
  }

  if (process.env.NODE_ENV !== 'development') return null

  if (!visible) {
    return (
      <button
        onClick={toggleVisible}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          padding: '8px 10px',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          zIndex: 9999,
        }}
        title="Afficher debug rôles"
      >
        🔍
      </button>
    )
  }

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div>🔍 Debug Rôles:</div>
        <button
          onClick={toggleVisible}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            padding: 0,
            lineHeight: 1,
          }}
          title="Masquer"
        >
          ✕
        </button>
      </div>
      <div>Permissions: {permissionsLoading ? '⏳' : permissionsRole}</div>
      <div>Simple: {simpleRole}</div>
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
