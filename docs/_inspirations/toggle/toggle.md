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
function ToggleListe() {
  const [items, setItems] = useState([
    { id: 'notif',  label: 'Notifications push',           on: true },
    { id: 'mail',   label: 'Récap hebdomadaire par email', on: false },
    { id: 'son',    label: 'Sons d\'application',          on: true },
    { id: 'haptic', label: 'Retour haptique',              on: false },
  ]);
  const flip = id => setItems(arr => arr.map(i => i.id === id ? { ...i, on: !i.on } : i));
  return (
    <Stage label="12 — Liste de paramètres" hint="Composition réelle : 4 toggles classiques dans un panneau de réglages.">
      <div style={{
        width: 360,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
      }}>
        {items.map((it, i) => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: i ? '1px solid var(--color-border)' : 'none',
          }}>
            <span style={{ fontSize: 15 }}>{it.label}</span>
            <button
              role="switch" aria-checked={it.on}
              onClick={() => flip(it.id)}
              style={{
                width: 44, height: 24, padding: 2,
                border: 'none', cursor: 'pointer', borderRadius: 999,
                background: it.on ? 'var(--color-primary)' : '#CBD5E1',
                transition: 'background 200ms ease',
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                transform: it.on ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 200ms ease',
              }}/>
            </button>
          </div>
        ))}
      </div>
    </Stage>
  );
}

Object.assign(window, {ToggleListe,});
