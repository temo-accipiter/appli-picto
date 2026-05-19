/\*\*

- Toggle Button — Explorations
- Appli-Picto Design System v1.1
  \*/

const { useState, useEffect, useRef } = React;

/\* ────────────────────────────────────────────────────────────────

- Helper: control row used in every artboard
- ──────────────────────────────────────────────────────────────── \*/
function Stage({ children, label, hint, bg = 'var(--color-bg)' }) {
return (
  <div style={{
        width: '100%', height: '100%', background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: 32, fontFamily: 'var(--font-family)',
        color: 'var(--color-text)',
      }}>
  <div style={{ display: 'flex', gap: 56, alignItems: 'center' }}>
  {children}
  </div>
  {hint && <div style={{
          fontSize: 13, color: 'var(--color-text-muted)',
          textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
        }}>{hint}</div>}
  <div style={{
          fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--color-text-muted)', fontWeight: 600,
        }}>{label}</div>
  </div>
  );
  }
function Demo({ children, caption }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {children}
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{caption}</span>
    </div>
  );
}
/* ────────────────────────────────────────────────────────────────

* 02 — Icônes Soleil / Lune (thème) — crossfade + rotation
* ──────────────────────────────────────────────────────────────── _/
  function ToggleTheme() {
  const [dark, setDark] = useState(false);
  return (
  <Stage
  label="02 — Thème clair / sombre"
  hint="Le pouce porte le pictogramme. Crossfade + légère rotation."
  bg={dark ? '#0F172A' : 'var(--color-bg)'} >
  <button
  role="switch" aria-checked={dark}
  onClick={() => setDark(!dark)}
  style={{
              width: 76, height: 38, padding: 4,
              border: 'none', cursor: 'pointer', borderRadius: 999,
              background: dark ? '#1E293B' : '#FEF3C7',
              transition: 'background 300ms ease',
              display: 'flex', alignItems: 'center', position: 'relative',
            }} >
  {/_ étoiles _/}
  <svg width="76" height="38" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: dark ? 1 : 0, transition: 'opacity 300ms ease' }}>
  <circle cx="14" cy="12" r="1" fill="#fff"/>
  <circle cx="22" cy="22" r=".8" fill="#fff"/>
  <circle cx="32" cy="10" r=".6" fill="#fff"/>
  </svg>
  <span style={{
              width: 30, height: 30, borderRadius: '50%',
              background: dark ? '#F8FAFC' : '#FFB400',
              boxShadow: dark ? '0 0 0 3px rgba(248,250,252,.12)' : '0 1px 3px rgba(217,119,6,.4)',
              transform: dark ? 'translateX(38px) rotate(-25deg)' : 'translateX(0) rotate(0)',
              transition: 'transform 350ms cubic-bezier(.5,.05,.3,1.3), background 300ms ease, box-shadow 300ms',
              display: 'grid', placeItems: 'center',
              position: 'relative',
            }}>
  {/_ soleil _/}
  <svg width="18" height="18" viewBox="0 0 24 24" style={{
                position: 'absolute', opacity: dark ? 0 : 1,
                transition: 'opacity 200ms ease', color: '#fff',
              }}>
  <circle cx="12" cy="12" r="4" fill="currentColor"/>
  {[0,45,90,135,180,225,270,315].map(a => (
  <rect key={a} x="11" y="2" width="2" height="3" fill="currentColor" transform={`rotate(${a} 12 12)`} rx="1"/>
  ))}
  </svg>
  {/_ lune \*/}
  <svg width="16" height="16" viewBox="0 0 24 24" style={{
                position: 'absolute', opacity: dark ? 1 : 0,
                transition: 'opacity 200ms ease 80ms', color: '#0F172A',
              }}>
  <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/>
  </svg>
  </span>
  </button>
  </Stage>
  );
  }
  Object.assign(window, {ToggleTheme,});
