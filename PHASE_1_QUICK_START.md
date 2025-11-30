# ⚡ Phase 1 Modals - Quick Start (5 min read)

## 🎯 TL;DR - Ce qu'on change et pourquoi

| Aspect              | Avant        | Après                  | Raison TSA                      |
| ------------------- | ------------ | ---------------------- | ------------------------------- |
| **Overlay opacité** | 40%          | 75%                    | Évite distractions, masque fond |
| **Blur overlay**    | 2px          | 4px                    | Accentue séparation visuelle    |
| **Close button**    | 20px         | 48px                   | Accessible pour contrôle moteur |
| **Border modal**    | 1px gray     | 2px primary            | Meilleur contraste              |
| **Modal structure** | All mixed    | Header/Content/Footer  | Accessibilité sémantique        |
| **Footer button**   | Actions only | Auto Annuler + Actions | 2e option de fermeture          |

---

## 📝 4 Fichiers à Modifier

```
✏️ ButtonClose.tsx        (ajouter prop size)
✏️ ButtonClose.scss       (ajouter variant --large 48px)
✏️ Modal.scss             (couleurs, opacité, layout)
✏️ Modal.tsx              (refactoriser structure)
```

---

## 🚀 Implémentation (ordre critique)

### 1️⃣ ButtonClose (5 min)

**ButtonClose.tsx:**

- Ajouter interface: `size?: 'small' | 'large'`
- Ajouter class: `button-close--${size}`
- Ajuster `iconSize` selon size

**ButtonClose.scss:**

- Variant `.button-close--large` avec:
  - `width: 3rem` (48px)
  - `background: gray(100)`
  - `border: 2px solid $color-primary`

---

### 2️⃣ Modal.scss (10 min)

**Clés:**

- `.modal-overlay` → `background-color: rgba(gray(900), 0.75)` + `backdrop-filter: blur(4px)`
- `.modal` → `border: 2px solid $color-primary` + ombre augmentée
- Ajouter `.modal__header` (flexbox, border-bottom)
- Ajouter `.modal__footer` (flexbox, border-top, gap)
- `.modal__content` → `flex: 1`, scrollable

---

### 3️⃣ Modal.tsx (15 min)

**Nouvelle structure:**

```tsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal" role="dialog" aria-modal="true">

    {/* Header: Titre + Close button */}
    <div className="modal__header">
      {title && <h2 className="modal__title">{title}</h2>}
      <ButtonClose onClick={onClose} size="large" />
    </div>

    {/* Content: Enfants */}
    <div className="modal__content">{children}</div>

    {/* Footer: Annuler auto + Actions */}
    {actions.length > 0 && (
      <footer className="modal__footer">
        <Button onClick={onClose} variant="secondary" label="Annuler" />
        {actions.map(...)}
      </footer>
    )}
  </div>
</div>
```

---

### 4️⃣ Adapter ModalConfirm.tsx (5 min)

**Avant:**

```tsx
actions={[
  { label: 'Annuler', onClick: onClose },
  { label: 'Confirmer', onClick: handleConfirm, variant: 'primary' }
]}
```

**Après (Annuler devient auto):**

```tsx
actions={[
  { label: 'Confirmer', onClick: handleConfirm, variant: 'primary' }
]}
```

---

## 🧪 Vérification

```bash
# Tests après chaque modification
pnpm lint:fix       # Format code
pnpm type-check     # Pas d'erreurs TS
pnpm test           # Tests unitaires (si existent)
pnpm build          # Build complet
```

---

## 📸 Résultat Visuel

**AVANT:**

```
┌─────────────────────────────────────────┐
│ Contenu derrière VISIBLE (distraction) │ ← 40% opacité
│ ┌──────────────────────────────────┐   │
│ │ Title                      [X]   │   │ ← Petit, hard to click
│ ├──────────────────────────────────┤   │
│ │                                  │   │
│ │ Message                         │   │
│ │                                  │   │
│ ├──────────────────────────────────┤   │
│ │           [Annuler]  [Confirmer] │   │
│ └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**APRÈS:**

```
┌─────────────────────────────────────────┐
│                                         │ ← 75% opacité + blur(4px)
│ ┌──────────────────────────────────┐   │
│ │ Title ■■■ ■■■ ■■■ [  ✕  ]      │   │ ← Grande croix 48px
│ ├──────────────────────────────────┤   │
│ │                                  │   │
│ │ Message (Bold, Primary color)   │   │
│ │                                  │   │
│ ├──────────────────────────────────┤   │
│ │ [Annuler]          [Confirmer]   │   │ ← 2 boutons clairs
│ └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist Avant Commit

- [ ] ButtonClose.tsx modifié
- [ ] ButtonClose.scss modifié
- [ ] Modal.scss modifié
- [ ] Modal.tsx refactorisé
- [ ] ModalConfirm.tsx adapté
- [ ] Pas d'erreurs TypeScript
- [ ] Build réussit
- [ ] Pages avec modals testées visuellement

---

## 🆘 Troubleshooting

### Erreur: "ButtonClose is not defined"

→ Vérifier import dans Modal.tsx

### Modal ne ferme pas au Échap

→ Vérifier event listener dans useEffect

### Annuler bouton apparaît 2x

→ Vérifier ModalConfirm n'envoie pas d'action Annuler

### Close button trop grand/petit

→ Vérifier class `button-close--large` est appliquée

---

## 🎉 Ready?

```
→ Dis "Go Phase 1!" pour implémentation complète
→ Je vais faire TOUS les changements avec Edit + Bash
→ Tests automatiques après
```
