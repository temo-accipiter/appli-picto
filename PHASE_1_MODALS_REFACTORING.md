# 🎯 Phase 1: Refactoring Modals - Plan d'Implémentation Complet

## 📊 Vue d'ensemble

**Durée estimée:** 45-60 minutes
**Complexité:** ⭐⭐ (facile à modéré)
**Impact TSA:** 🔴 CRITIQUE

### Objectifs Phase 1

- ✅ Augmenter opacité overlay pour éviter distractions (40% → 75%)
- ✅ Agrandir bouton fermer pour accessibilité motrice (20px → 48px)
- ✅ Ajouter bouton "Annuler" explicite en footer
- ✅ Améliorer contraste et lisibilité (bordure colorée, typographie)
- ✅ Préparer la base pour mobile-first en Phase 2

---

## 📋 Fichiers à Modifier (4 fichiers)

### 1️⃣ `src/components/shared/modal/Modal.tsx`

**Action:** Refactoriser structure pour ajouter header/footer séparé
**Ligne à modifier:** 107-140 (structure JSX)

### 2️⃣ `src/components/shared/modal/Modal.scss`

**Action:** Améliorer styles overlay + modal + animations
**Ligne à modifier:** 1-90 (tout le fichier)

### 3️⃣ `src/components/ui/button/button-close/ButtonClose.tsx`

**Action:** Ajouter prop size pour agrandir le bouton
**Ligne à modifier:** 6-20 (interface + rendu)

### 4️⃣ `src/components/ui/button/button-close/ButtonClose.scss`

**Action:** Ajouter variant size:large (48px)
**Ligne à modifier:** 3-32 (tout le fichier)

---

## 🔧 Détail des Modifications

### Modification 1: Modal.tsx - Refactoriser la structure

**Avant:**

```tsx
return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" role="dialog" {...}>
      {title && <h2 className="modal__title">{title}</h2>}
      <div className="modal__content">{children}</div>
      {actions.length > 0 && (
        <footer className="modal__actions">
          {actions.map(...)}
        </footer>
      )}
      <ButtonClose onClick={onClose} />
    </div>
  </div>
)
```

**Après:**

```tsx
return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" role="dialog" {...}>
      {/* Header avec titre et bouton fermer */}
      <div className="modal__header">
        {title && (
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
        )}
        <ButtonClose onClick={onClose} size="large" />
      </div>

      {/* Contenu principal */}
      <div className="modal__content">{children}</div>

      {/* Footer avec actions */}
      {actions.length > 0 && (
        <footer className="modal__footer">
          {/* Bouton Annuler par défaut à gauche */}
          <Button
            label="Annuler"
            onClick={onClose}
            variant="secondary"
          />
          {/* Autres actions */}
          {actions.map((act, i) => (
            <Button
              key={i}
              label={act.label}
              onClick={act.onClick}
              {...(act.variant !== undefined && { variant: act.variant })}
              {...(act.disabled !== undefined && { disabled: act.disabled })}
            />
          ))}
        </footer>
      )}
    </div>
  </div>
)
```

**Raison du changement:**

- Sépare header/content/footer pour meilleure accessibilité
- ButtonClose maintenant intégré dans header (position logique)
- Bouton Annuler explicite ajoute une 2e option de fermeture
- Plus de flexibilité pour mobile-first plus tard

---

### Modification 2: Modal.scss - Styles améliorés

**Avant:**

```scss
.modal-overlay {
  background-color: rgba(gray(900), 0.4); // 40% opacité
}

.modal {
  max-width: 500px;
  width: 90%;
}

.modal__actions {
  display: flex;
  justify-content: space-between;
  gap: $spacing-sm;
}
```

**Après:**

```scss
@use '@styles/abstracts' as *;

// === OVERLAY ===
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(gray(900), 0.75); // ← 75% opacité au lieu de 40%
  backdrop-filter: blur(4px); // ← augmenter blur de 2px à 4px
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-overlay;
  animation: fadeIn $transition-fast ease-out;
}

// === MODAL CONTENEUR ===
.modal {
  background: $color-surface;
  border: 2px solid $color-primary; // ← 2px border colorée (au lieu de 1px gray)
  border-radius: $radius-lg;
  padding: 0; // ← Padding dans les sections
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden; // ← Empêcher overflow global
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); // ← Ombre plus marquée
  display: flex;
  flex-direction: column;
  animation: scaleIn $transition-fast ease-out;

  &:focus-visible {
    outline: none;
  }
}

// === HEADER ===
.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg $spacing-md;
  border-bottom: 1px solid gray(200);
  flex-shrink: 0;
}

// === TITLE ===
.modal__title {
  margin: 0;
  font-size: $font-size-xl;
  font-weight: $font-weight-bold; // ← bold au lieu de semibold
  color: $color-primary; // ← couleur primaire
  flex: 1;
}

// === CONTENU ===
.modal__content {
  flex: 1;
  padding: $spacing-lg $spacing-md;
  overflow-y: auto;
  min-height: 100px; // Éviter collapsing

  // Scrollbar personnalisée
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: gray(100);
  }

  &::-webkit-scrollbar-thumb {
    background: gray(400);
    border-radius: 4px;

    &:hover {
      background: gray(500);
    }
  }
}

// === MESSAGE CENTRÉ ===
.modal__message {
  text-align: center;
  font-size: $font-size-lg;
  font-weight: $font-weight-semibold;
  margin: 0;
  color: $color-text;
  line-height: $line-height-base;

  p {
    margin: 0;
  }
}

// === FOOTER ===
.modal__footer {
  display: flex;
  justify-content: flex-end; // Actions à droite
  align-items: center;
  gap: $spacing-sm;
  border-top: 1px solid gray(200);
  padding: $spacing-md;
  flex-shrink: 0;
  flex-wrap: wrap; // Responsive

  .btn {
    transition:
      transform $transition-fast ease-out,
      box-shadow $transition-fast ease-out;
    min-height: 44px; // Accessible height

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    // Bouton Annuler à gauche
    &:first-child {
      margin-right: auto;
    }
  }
}

// === ANIMATIONS ===
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

// === RÉDUCTION MOUVEMENT ===
@media (prefers-reduced-motion: reduce) {
  .modal-overlay {
    animation: none;
    opacity: 1;
  }

  .modal {
    animation: none;
    transform: scale(1);
    opacity: 1;
  }
}

// === DARK MODE ===
@media (prefers-color-scheme: dark) {
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.85);
  }

  .modal {
    border-color: $color-primary;
  }

  .modal__header,
  .modal__footer {
    border-bottom-color: var(--color-border);
    border-top-color: var(--color-border);
  }

  .modal__content {
    &::-webkit-scrollbar-track {
      background: var(--color-bg-soft);
    }
  }
}
```

**Raisons des changements:**

- ✅ 75% opacité → Évite distractions TSA
- ✅ 4px blur → Accentue la séparation
- ✅ Bordure colorée → Meilleur contraste
- ✅ Séparation header/content/footer → Structure logique
- ✅ Scrollbar personnalisée → UX améliorée
- ✅ Ombre marquée → Profondeur visuelle
- ✅ prefers-reduced-motion → Respect accessibilité

---

### Modification 3: ButtonClose.tsx - Ajouter prop `size`

**Avant:**

```tsx
interface ButtonCloseProps {
  onClick: () => void
  ariaLabel?: string
}

export default function ButtonClose({
  onClick,
  ariaLabel = 'Fermer',
}: ButtonCloseProps) {
  return (
    <button className="button-close" onClick={onClick} aria-label={ariaLabel}>
      <X size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
```

**Après:**

```tsx
interface ButtonCloseProps {
  onClick: () => void
  ariaLabel?: string
  size?: 'small' | 'large' // ← Ajouter
}

export default function ButtonClose({
  onClick,
  ariaLabel = 'Fermer',
  size = 'small', // ← Default 'small'
}: ButtonCloseProps) {
  // Calculer taille icône selon size
  const iconSize = size === 'large' ? 28 : 20

  return (
    <button
      className={`button-close button-close--${size}`} // ← Class dynamique
      onClick={onClick}
      aria-label={ariaLabel}
      type="button" // ← Explicite
    >
      <X size={iconSize} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
```

**Raison du changement:**

- Permet réutilisabilité du composant
- Modal peut utiliser `size="large"` (48px)
- Autres composants continuent avec default (20px)

---

### Modification 4: ButtonClose.scss - Ajouter variant large

**Avant:**

```scss
.button-close {
  position: absolute;
  top: 0;
  right: 0;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  border-radius: 50%;
  // ... styles
}
```

**Après:**

```scss
@use '@styles/abstracts' as *;

.button-close {
  position: relative; // ← Pas absolute
  width: 2rem; // Default 32px (2rem)
  height: 2rem;
  background: transparent;
  border: none;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background $transition-fast,
    color $transition-fast,
    transform $transition-fast;
  color: $color-text;
  flex-shrink: 0;

  &:hover {
    background: gray(200);
    color: $color-primary;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }

  // === VARIANT: LARGE (pour modals) ===
  &--large {
    width: 3rem; // ← 48px (pour accessibilité)
    height: 3rem;
    background: gray(100); // ← Fond léger pour visibilité
    border: 2px solid $color-primary; // ← Bordure pour contraste

    &:hover {
      background: gray(200);
      transform: scale(1.05); // Moins de scale
    }

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 4px; // ← Plus d'offset
    }
  }
}

// === DARK MODE ===
@media (prefers-color-scheme: dark) {
  .button-close {
    color: var(--color-text);

    &:hover {
      background: var(--color-bg-hover);
    }

    &--large {
      background: var(--color-bg-soft);
      border-color: var(--color-primary);

      &:hover {
        background: var(--color-bg-hover);
      }
    }
  }
}
```

**Raisons des changements:**

- ✅ 48px pour bouton large (accessibilité motrice)
- ✅ Fond léger pour visible sur overlay sombre
- ✅ Bordure colorée pour contraste
- ✅ `position: relative` au lieu de `absolute` (flexibilité)
- ✅ Feedback visuel amélioré (hover/active/focus)

---

## 🚀 Ordre d'Implémentation

### Étape 1: ButtonClose.tsx & ButtonClose.scss (5 min)

Les modifier en premier car Modal.tsx en dépend

```bash
# Modifier ces 2 fichiers
src/components/ui/button/button-close/ButtonClose.tsx
src/components/ui/button/button-close/ButtonClose.scss
```

### Étape 2: Modal.scss (10 min)

Mettre à jour les styles avant de changer la structure JSX

```bash
src/components/shared/modal/Modal.scss
```

### Étape 3: Modal.tsx (15 min)

Refactoriser la structure JSX

```bash
src/components/shared/modal/Modal.tsx
```

### Étape 4: Tests & Vérification (15 min)

```bash
pnpm check          # Format + Lint
pnpm type-check     # Types
pnpm test           # Tests unitaires
pnpm build          # Build
```

---

## ⚠️ Points Importants à Considérer

### ❗ Modals spécialisées affectés

Après refactoring Modal.tsx, ces composants doivent être testés:

1. **ModalConfirm.tsx** - ✅ Pas de changement requis (utilise Modal.tsx standard)
2. **ModalAjout.tsx** - ✅ Pas de changement requis
3. **ModalCategory.tsx** - ✅ Pas de changement requis
4. **ModalRecompense.tsx** - ✅ Pas de changement requis
5. **PersonalizationModal.tsx** - ⚠️ Contient son propre Modal wrapper, à vérifier
6. **SignupPromptModal.tsx** - ⚠️ Contient son propre Modal wrapper, à vérifier
7. **ModalQuota.tsx** - ✅ Pas de changement requis
8. **DeleteAccountModal.tsx** - ✅ Pas de changement requis

### 🎨 Breaking Changes

**Avant:**

```tsx
<Modal isOpen={isOpen} onClose={onClose} actions={[...]}>
  <p>Message</p>
</Modal>
```

**Après (nouveau footer automatique):**

```tsx
<Modal isOpen={isOpen} onClose={onClose} actions={[...]}>
  {/* Bouton "Annuler" ajouté automatiquement dans footer */}
  <p>Message</p>
</Modal>
```

**Implication:** ModalConfirm.tsx aura DEUX boutons "Annuler" (un auto + un custom)

**Solution:** Adapter ModalConfirm.tsx pour utiliser le footer auto:

```tsx
// Avant
<Modal isOpen={isOpen} onClose={onClose} actions={[
  { label: 'Annuler', onClick: onClose },
  { label: 'Confirmer', onClick: handleConfirm, variant: 'primary' }
]}>
  {children}
</Modal>

// Après (Annuler ajouté auto)
<Modal isOpen={isOpen} onClose={onClose} actions={[
  { label: 'Confirmer', onClick: handleConfirm, variant: 'primary' }
]}>
  {children}
</Modal>
```

---

## 🧪 Checklist de Vérification

- [ ] ButtonClose.tsx: Prop `size` ajoutée
- [ ] ButtonClose.scss: Variant `--large` implémenté (48px)
- [ ] Modal.scss: Opacité overlay à 75%, blur 4px
- [ ] Modal.scss: Bordure 2px couleur primaire
- [ ] Modal.scss: Header/Content/Footer bien séparés
- [ ] Modal.tsx: Structure refactorisée
- [ ] Modal.tsx: ButtonClose avec `size="large"`
- [ ] Modal.tsx: Bouton Annuler dans footer
- [ ] ModalConfirm.tsx: Adapté (1 seul Annuler)
- [ ] PersonalizationModal.tsx: Testé
- [ ] SignupPromptModal.tsx: Testé
- [ ] Pas d'erreurs de compilation
- [ ] Tests unitaires passent
- [ ] Build réussit
- [ ] Responsive sur mobile/tablet/desktop

---

## 📱 Phase 2 (à venir)

Une fois Phase 1 stabilisée, on fera:

- [ ] Modal fullscreen sur mobile (`width: 100%`, `height: 100%`)
- [ ] Drawer variant (glisse du bas)
- [ ] Animations réduites sur mobile
- [ ] Gestion clavier virtuel (soft keyboard)
- [ ] Tests E2E Playwright
- [ ] Performance profiling

---

## 🎯 Résultat Attendu Phase 1

✅ **Avant:** Modal petite, distractive, bouton difficile à activer
✅ **Après:** Modal claire, contraste fort, 2 boutons fermeture, accès focalisé

### Avant / Après

**AVANT:**

```
┌─────────────────────────────┐
│ Contenu distractif derrière │ ← 40% opacité visible!
│ (fond grisé transparent)    │
│  ┌──────────────────────┐   │
│  │ Titre           [X]  │   │ ← [X] petit 20px
│  ├──────────────────────┤   │
│  │                      │   │
│  │  Message            │   │
│  │                      │   │
│  ├──────────────────────┤   │
│  │ [Annuler]  [Confirm] │   │ ← Pas de "Annuler" lisible
│  └──────────────────────┘   │
└─────────────────────────────┘
```

**APRÈS:**

```
┌─────────────────────────────┐
│ (Fond complètement noir)    │ ← 75% opacité + blur(4px)
│                             │
│  ┌─────────────────────┐    │
│  │ Titre      [  ✕  ]  │    │ ← [✕] large 48px
│  ├─────────────────────┤    │
│  │                     │    │
│  │  Message (clair)   │    │ ← Bold primary color
│  │                     │    │
│  ├─────────────────────┤    │
│  │ [Annuler] [Confirmer]│   │ ← Deux boutons explicites
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## ✅ Quand tu es prêt:

1. Lis ce document en entier
2. Dis-moi "Go Phase 1!"
3. Je vais implémenter tous les changements avec Bash + Edit
4. On testera avec `pnpm check` et `pnpm build`
5. On marquera les fichiers modifiés dans le commit

**Budget temps total:** 45-60 minutes pour tout + tests ✨
