export default function HomePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#5A9FB8' }}>
        🚀 Migration Next.js en cours...
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', maxWidth: '600px' }}>
        Appli-Picto migre de React + Vite vers Next.js 16.0.3 (App Router).
      </p>
      <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '2rem' }}>
        Phase 1/11 : Setup Next.js ✅
      </p>
    </div>
  )
}
