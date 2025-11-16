import Link from 'next/link'

// Force dynamic rendering (no prerendering) due to client-only dependencies in global providers
export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#5A9FB8' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#666' }}>
        Page non trouvée
      </h2>
      <p style={{ fontSize: '1rem', color: '#999', marginBottom: '2rem' }}>
        La page que vous recherchez n&apos;existe pas.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#5A9FB8',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem',
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
