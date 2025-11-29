# 🔗 Phase 1 Modals - Dépendances & Impacts

## 📊 Arbre des Dépendances

```
Modal.tsx (BASE)
├── Utilisé par:
│   ├── ModalConfirm.tsx ✅ (adapté Phase 1)
│   ├── ModalAjout.tsx ✅
│   ├── ModalCategory.tsx ✅
│   ├── ModalQuota.tsx ✅
│   └── ModalRecompense.tsx ✅
│
├── Composants enfants:
│   ├── ButtonClose.tsx ← MODIFIÉ (Phase 1)
│   └── Button.tsx ← Pas modifié
│
└── Utilisé dans pages:
    ├── TachesEdition.tsx (multiple modals)
    ├── Tableau.tsx (lazy ModalRecompense, PersonalizationModal)
    ├── Navbar.tsx (PersonalizationModal)
    └── Profil.tsx (DeleteAccountModal)
```

---

## 🔴 IMPACTS Phase 1

### ✅ Zéro Breaking Change (sauf ModalConfirm)

**Modal base fonctionne rétrocompatible:**
- Nouveau footer "Annuler" auto
- Anciens `actions` props continuent de fonctionner
- Nouvelle structure HTML, même API

**SAUF ModalConfirm.tsx → Aura 2 boutons Annuler**

---

## 📝 Fichiers à Modifier (Total: 5)

### Tier 1: Dependencies (doivent être modifiés d'abord)

```
✏️ src/components/ui/button/button-close/ButtonClose.tsx
✏️ src/components/ui/button/button-close/ButtonClose.scss
```

### Tier 2: Core Modal

```
✏️ src/components/shared/modal/Modal.scss
✏️ src/components/shared/modal/Modal.tsx
```

### Tier 3: Adaptations

```
✏️ src/components/shared/modal/modal-confirm/ModalConfirm.tsx
```

---

## 🎯 Fichiers à TESTER (mais ne pas modifier)

Ces fichiers doivent être testés après modifications, mais pas modifiés:

```
✅ src/components/shared/modal/modal-ajout/ModalAjout.tsx
   → Utilise Modal standard, devrait fonctionner automatiquement

✅ src/components/shared/modal/modal-category/ModalCategory.tsx
   → Utilise Modal standard, devrait fonctionner automatiquement

✅ src/components/shared/modal/modal-quota/ModalQuota.tsx
   → Utilise Modal standard, devrait fonctionner automatiquement

✅ src/components/shared/modal/modal-recompense/ModalRecompense.tsx
   → Utilise Modal standard, devrait fonctionner automatiquement

⚠️  src/components/shared/modal/modal-personalization/PersonalizationModal.tsx
   → Contient <Modal> custom, à vérifier

⚠️  src/components/shared/modal/modal-signup-prompt/SignupPromptModal.tsx
   → Contient <Modal> custom, à vérifier

✅ src/components/features/settings/DeleteAccountModal.tsx
   → Ne contient pas Modal, ne sera pas affecté
```

---

## 🧪 Pages à Tester Visuellement

### Tableau (edit mode)
**Modals:** ModalAjout, ModalCategory, ModalConfirm
```bash
npm run dev → /edition
→ Clique "+ Ajouter Tâche"
→ Clique "Gérer Catégories"
→ Clique "Réinitialiser"
```

### Tableau (display mode)
**Modals:** ModalRecompense (lazy), PersonalizationModal
```bash
npm run dev → /tableau
→ Complète toutes les tâches
→ La modal récompense doit s'afficher
→ Testé en mode visiteur: PersonalizationModal à l'action
```

### Profil
**Modals:** DeleteAccountModal, autres
```bash
npm run dev → /profil
→ Scroll jusqu'à "Supprimer compte"
```

### Navbar
**Modals:** PersonalizationModal
```bash
npm run dev → /
→ Visiteur ou pas logged in
→ Click sur icône personnalisation
```

---

## 🔄 Flux de Modification

### Étape 1: ButtonClose (Base)
```
1. Lire ButtonClose.tsx
2. Ajouter prop size
3. Modifier ButtonClose.scss
   → Nouveau class --large (48px)
4. Test build local
```

**Dépendants en attente:** Modal.tsx

---

### Étape 2: Modal.scss
```
1. Lire Modal.scss complet
2. Remplacer overlay styles (75% opacité, blur 4px)
3. Ajouter header/footer sections
4. Améliorer contraste (bordure primaire)
5. Test build local
```

**Dépendants en attente:** Modal.tsx (JSX)

---

### Étape 3: Modal.tsx (JSX)
```
1. Lire Modal.tsx complet
2. Créer nouveau header avec ButtonClose size="large"
3. Créer footer avec bouton Annuler auto
4. Vérifier focusable elements toujours accessibles
5. Test build local
```

**Dépendants déverrouillés:** Modals spécialisés

---

### Étape 4: ModalConfirm Adapt
```
1. Lire ModalConfirm.tsx
2. Enlever action "Annuler" (maintenant auto)
3. Garder action "Confirmer"
4. Test visuel
```

**Dépendants:** TachesEdition.tsx

---

### Étape 5: Vérifications Globales
```
pnpm type-check  → Zéro erreur TS
pnpm lint:fix    → Format ok
pnpm build       → Build réussit
pnpm test        → Tests passent (si exist)
```

---

## 📋 Imports/Exports Concernés

### Export dans index.ts

```typescript
// src/components/index.ts
export { default as Modal } from './shared/modal/Modal'
export { default as ModalConfirm } from './shared/modal/modal-confirm/ModalConfirm'
// ... autres
```

✅ Pas de changement requis (exports restent les mêmes)

---

### Imports dans Pages

#### TachesEdition.tsx
```typescript
import { ModalAjout, ModalCategory, ModalConfirm } from '@/components'
```
✅ Pas de changement requis

#### Tableau.tsx
```typescript
const ModalRecompense = lazy(() =>
  import('@/components').then(m => ({ default: m.ModalRecompense }))
)
```
✅ Pas de changement requis

#### Navbar.tsx
```typescript
import { PersonalizationModal } from '@/components'
```
✅ Pas de changement requis

---

## ⚠️ Cas Spéciaux à Vérifier

### PersonalizationModal.tsx
```typescript
// Contient son propre Modal wrapper
<Modal isOpen={isOpen} onClose={onClose}>
  {/* Custom content */}
</Modal>
```
✅ Fonctionnera avec nouveau Modal
✅ Aura nouveau footer Annuler (peut être redondant)
→ À VÉRIFIER visuellement

### SignupPromptModal.tsx
```typescript
// Contient aussi Modal wrapper custom
<Modal isOpen={isOpen} onClose={handleClose}>
  {/* Custom content */}
</Modal>
```
✅ Fonctionnera avec nouveau Modal
✅ Footer Annuler peut être bon (double option fermeture)
→ À VÉRIFIER visuellement

---

## 🧩 Props Compatibility

### Modal.tsx Props (pas de changement)
```typescript
interface ModalProps {
  isOpen: boolean              // ✅ Inchangé
  onClose: () => void          // ✅ Inchangé
  title?: string               // ✅ Inchangé (maintenant dans header)
  children: ReactNode          // ✅ Inchangé (maintenant dans content)
  actions?: ModalAction[]       // ✅ Inchangé (maintenant dans footer)
  className?: string           // ✅ Inchangé (modal + class)
}
```

✅ **RÉTROCOMPATIBLE** - Tous les callsites continueront de fonctionner

---

## 🎯 Test Coverage

### Unit Tests (si existent)
```
✅ Modal.test.tsx
   → Test isOpen/onClose
   → Test actions rendering
   → Test keyboard handlers (Escape, Tab)
   → Test focus management
   → Test overlay click handling

✅ ButtonClose.test.tsx
   → Test onClick
   → Test size prop (small/large)
   → Test aria-label
   → Test icon rendering

⚠️  ModalConfirm.test.tsx
   → Vérifier n'a pas de doublon bouton Annuler
```

---

## 🚨 Rollback Plan

Si quelque chose casse:

```bash
# Reset fichiers modifiés
git checkout src/components/ui/button/button-close/ButtonClose.tsx
git checkout src/components/ui/button/button-close/ButtonClose.scss
git checkout src/components/shared/modal/Modal.tsx
git checkout src/components/shared/modal/Modal.scss

# Rebuild
pnpm build
```

---

## 📊 Before/After Comparaison

| Aspect | Avant Phase 1 | Après Phase 1 |
|--------|--------------|---------------|
| **Files modified** | 0 | 5 |
| **Breaking changes** | 0 | 0* |
| **API changes** | None | None |
| **Visual changes** | Small | Significant (TSA focused) |
| **Accessibility** | Good | Better |
| **Mobile ready** | Partial | Better (prep for Phase 2) |

*Except ModalConfirm (adaptation needed)

---

## ✅ Post-Implementation Checklist

- [ ] ButtonClose size prop working
- [ ] ButtonClose--large 48px visible
- [ ] Modal overlay 75% opacité
- [ ] Modal header visible (title + close button)
- [ ] Modal footer visible (Annuler + actions)
- [ ] ModalConfirm pas de double Annuler
- [ ] PersonalizationModal still works
- [ ] SignupPromptModal still works
- [ ] All modals closeable with:
  - [ ] [✕] button
  - [ ] Annuler button
  - [ ] Escape key
  - [ ] Overlay click
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Pages load without errors

---

## 🎉 Success Criteria Phase 1

✅ All modals display with:
- 75% opaque overlay (dark, not distracting)
- Large 48px close button (motor accessible)
- Clear "Annuler" footer button (explicit close option)
- Proper header/content/footer separation (semantic)
- Primary color border (contrast)

✅ No regressions:
- All modals still close properly
- All keyboard shortcuts still work
- All animations smooth
- No TypeScript errors
