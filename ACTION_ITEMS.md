# Action Items - Appli-Picto Layout & Navigation
## Recommandations Immédiates par Priorité

**Date**: 28 novembre 2024 | **Status**: Analysis Complete
**Documents liés**: ARCHITECTURE_ANALYSIS.md, ACCESSIBILITY_PATTERNS.md, CODEBASE_INDEX.md

---

## PRIORITÉ 1 - CRITIQUE (À faire avant prochain release)

### 1.1 Audit Accessibilité Complet avec axe-core

**Statut**: ⚠️ Requis
**Effort**: 2-4 heures
**Impact**: Découvrir violations WCAG 2.2 AA

```bash
# Package déjà présent en devDependencies
npm list axe-core  # Vérifier version

# Créer script de test:
pnpm test:a11y  # Nouveau script
```

**Checklist**:
- [ ] Installer Playwright + axe plugin
- [ ] Créer tests E2E pour chaque page majeure
- [ ] Exécuter sur breakpoints: 320px, 768px, 1200px
- [ ] Documenter violations trouvées
- [ ] Assigner fixes par composant

**Fichiers à créer**:
- `tests/accessibility.spec.ts` - Tests axe-core E2E
- `tests/keyboard-navigation.spec.ts` - Keyboard flow tests

---

### 1.2 Vérifier Touch Targets (44px minimum) - Audit Complet

**Statut**: ✅ Théorie ok, ❌ Pratique non vérifiée
**Effort**: 3-4 heures
**Impact**: Compliance WCAG 2.2 AA (pointer target size)

**À tester**:
- [ ] Navbar buttons mobile (320px width)
  - [ ] Nav icons: largeur réelle >= 44px?
  - [ ] Spacing entre icones: >= 8px?
  - [ ] UserMenu trigger avatar: size + border?

- [ ] Form inputs (all pages)
  - [ ] Input fields: vraiment min-height 44px?
  - [ ] Toggle password button: taille + spacing?
  - [ ] Checkbox/Radio: label clickable area?

- [ ] Modal buttons
  - [ ] Modal.scss L53-60 actions: taille + spacing?

- [ ] Footer links
  - [ ] Links padding + size ?

- [ ] Drag & drop targets
  - [ ] TachesDnd: tâche item size + spacing?

**Outil**: Measure in DevTools (Ctrl+Shift+C)

**Commande Test**:
```bash
# Créer utility pour vérifier touch targets:
pnpm test:touch-targets
```

**Fichier à créer**:
- `tests/touch-targets.spec.ts` - Playwright test checking min 44px

---

### 1.3 Test Réel sur Mobile (320px-480px Viewport)

**Statut**: ⚠️ Non fait
**Effort**: 2-3 heures
**Impact**: Découvrir mobile UX issues

**À tester sur device réel OU DevTools emulation**:
- [ ] iPhone SE (375px)
- [ ] iPhone 12 (390px)
- [ ] Pixel 6 (412px)

**Checklist**:
- [ ] Navbar: buttons clickable? responsive bien?
- [ ] UserMenu dropdown: positioning, z-index conflict?
- [ ] SettingsMenu burger: visible? clickable?
- [ ] Form inputs: keyboard appear correct?
- [ ] Modal: width 90% correct? keyboard input hidden?
- [ ] Footer: links stack correctly?
- [ ] Images: load? responsive sizes?

**DevTools Steps**:
```
1. F12 → DevTools
2. Ctrl+Shift+M → Device mode
3. Select "iPhone 12" preset
4. Test all pages: /tableau, /edition, /profil, /login, /signup
```

---

## PRIORITÉ 2 - HAUTE (Prochain sprint)

### 2.1 Audit Complètes Formulaires (Edition, Profil, Signup)

**Statut**: ⚠️ Non audité
**Effort**: 4-6 heures
**Fichiers clés**:
- `/src/components/features/taches/TachesEdition.tsx`
- `/src/components/shared/modal/ModalAjout.tsx`
- `/src/app/(public)/signup/page.tsx`
- `/src/app/(protected)/profil/page.tsx`

**À vérifier**:
- [ ] Form labels: tous les inputs ont `<label htmlFor={id}>`?
- [ ] Fieldsets: groupes radio/checkbox dans `<fieldset><legend>`?
- [ ] Error messages: aria-describedby correct?
- [ ] Placeholder vs label: pas de confusion?
- [ ] Required fields: aria-required + visual indicator?
- [ ] Autofocus: gestion appropriate (pas sur first input by default)?
- [ ] Submit button: type="submit" + accessible text?
- [ ] Multipart forms: step indication? aria-current?

**Exemple bon pattern**:
```typescript
<form>
  <fieldset>
    <legend>Informations personnelles</legend>

    <Input
      id="email"
      label="Email *"
      value={email}
      onChange={...}
      required
      aria-required="true"
      error={emailError}
    />

    <Input
      id="pseudo"
      label="Pseudo"
      value={pseudo}
      onChange={...}
      required
      aria-required="true"
    />
  </fieldset>

  <button type="submit">Enregistrer</button>
</form>
```

**Fichier à créer**:
- `docs/FORM_AUDIT.md` - Findings + recommendations

---

### 2.2 Test Drag & Drop Accessibility (TachesDnd)

**Statut**: ⚠️ Non audité
**Effort**: 3-4 heures
**Fichier**: `/src/components/features/taches/taches-dnd/TachesDnd.tsx`
**Library**: @dnd-kit (version 6.3.1)

**Questions**:
- [ ] Keyboard support: Arrow keys pour déplacer?
- [ ] Screen reader: annonce des changements?
- [ ] Focus visible: draggable items highlighted?
- [ ] Touch support: mobile drag-drop works?
- [ ] Undo/redo: possibilité annuler?

**Research**:
- Lire: https://docs.dnd-kit.com/api-reference/accessibility
- Lire: https://www.w3.org/WAI/ARIA/apg/patterns/dragdrop/

**Checklist dnd-kit patterns**:
- [ ] Sortable context: `<DndContext>`
- [ ] Sensors: Keyboard sensor loaded?
- [ ] Announcements: aria-live regions?
- [ ] Roles: role="region", aria-label?

---

### 2.3 Audit Modals Variants

**Statut**: ✅ Base good, ⚠️ Variants unclear
**Effort**: 2-3 heures
**Fichiers**:
- `/src/components/shared/modal/ModalConfirm.tsx`
- `/src/components/shared/modal/ModalAjout.tsx`
- `/src/components/shared/modal/ModalCategory.tsx`
- `/src/components/shared/modal/ModalRecompense.tsx`
- `/src/components/shared/modal/ModalQuota.tsx`
- `/src/components/shared/modal/PersonalizationModal.tsx`
- `/src/components/shared/modal/SignupPromptModal.tsx`

**À vérifier sur chacun**:
- [ ] Hérite Modal.tsx correctement?
- [ ] Focus management: auto-focus correct?
- [ ] Keyboard: Escape works?
- [ ] Overlay: clickable outside closes?
- [ ] Content: scrollable if tall?
- [ ] Actions: button order logical?

**Décision**:
- Si tous étendent Modal.tsx → ✅ Bon
- Si custom role="dialog" non-compliant → ⚠️ À fixer

---

## PRIORITÉ 3 - MOYENNE (Nice to have)

### 3.1 Documentation WCAG Compliance Matrix

**Statut**: ❌ Non documenté
**Effort**: 2-3 heures
**Output**: `/docs/WCAG_COMPLIANCE.md`

**Contenu**:
```markdown
# WCAG 2.2 AA Compliance Matrix

| Criterion | Status | Component | Notes |
|-----------|--------|-----------|-------|
| 1.1.1 Non-text Content | ✅ | Button, Input, Footer | Icons aria-hidden |
| 2.1.1 Keyboard | ✅ | UserMenu | Full nav + arrow keys |
| 2.1.1 Keyboard | ⚠️ | SettingsMenu | Escape ok, but no arrow nav |
| 2.4.3 Focus Order | ✅ | All | Linear, logical |
| 2.4.7 Focus Visible | ✅ | All | 2px outline + offset |
| 2.5.5 Target Size | ✅ | Buttons | 44px min-height |
| 2.5.5 Target Size | ⚠️ | Icons | Check actual width |
| 3.2.1 On Focus | ✅ | All | No unexpected changes |
| 4.1.3 Status Messages | ⚠️ | Modals | aria-live needed? |
```

---

### 3.2 Framer Motion → Prefers-Reduced-Motion Check

**Statut**: ✅ Button spinners respected, ⚠️ Navbar animations?
**Effort**: 1-2 heures

**À vérifier**:
- [ ] Navbar.tsx Framer Motion (L45-58, L77-91): respecte prefers-reduced-motion?
- [ ] UserMenu backdrop fade: est-ce Framer ou CSS?
- [ ] Modal scale animation: respecte prefers-reduced-motion?

**Fix pattern** (si besoin):
```typescript
// Déterminer préférence:
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// Conditional animation:
<motion.div
  initial={prefersReducedMotion ? {} : { opacity: 0 }}
  animate={prefersReducedMotion ? {} : { opacity: 1 }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
>
```

---

### 3.3 Skip Link Visibility Enhancement

**Statut**: ✅ Présent, ⚠️ Peut être amélioré
**Effort**: 0.5-1 heure
**Fichier**: `/src/components/shared/layout/Layout.scss` L14-31

**Amélioration**:
```scss
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  // NOUVEAU: meilleure visibilité au focus

  &:focus {
    top: 0;
    z-index: 9999;  // Assurer visible au-dessus tout
    outline: 3px solid $color-accent;  // Plus épais pour TSA
    outline-offset: 4px;
    animation: slide-down 0.2s ease-out;  // Subtile animation
  }
}

@keyframes slide-down {
  from { top: -40px; }
  to { top: 0; }
}
```

**Test**:
```
1. Ouvrir page
2. Appuyer Tab une fois
3. Skip link doit apparaître clairement
```

---

## PRIORITÉ 4 - BASSE (Documentation/Maintenance)

### 4.1 Create ACCESSIBILITY.md

**Contenu**: Guide d'accessibilité pour développeurs

```markdown
# Accessibility Guidelines - Appli-Picto

## Quick Start
- [ ] Lire: ACCESSIBILITY_PATTERNS.md (ce repo)
- [ ] Lire: https://www.w3.org/WAI/ARIA/apg/

## Checklist Composant Nouveau
- [ ] Input/Button: min-height 44px
- [ ] Labels: htmlFor={id}
- [ ] Error: aria-describedby
- [ ] Icons: aria-hidden="true"
- [ ] Dialog: role="dialog" + aria-modal
- [ ] Keyboard: Tab, Escape, Arrow support?
- [ ] Focus: @include focus-ring

## Testing
- [ ] axe DevTools (Chrome extension)
- [ ] NVDA (Windows) / VoiceOver (Mac)
- [ ] Keyboard-only navigation
- [ ] Color contrast: 4.5:1 min
```

---

### 4.2 Add E2E Accessibility Tests

**Effort**: 2-3 heures
**Tool**: Playwright + axe-playwright

**Tests à créer**:
```typescript
// tests/e2e/accessibility.spec.ts

test('Navbar keyboard navigation', async ({ page }) => {
  await page.goto('/tableau')
  await page.keyboard.press('Tab')
  // Assert focus on first nav button

  await page.keyboard.press('Tab')
  // Assert focus moves to next
})

test('Modal focus trap', async ({ page }) => {
  // Open modal
  // Tab to last button
  // Tab again → focus loops to first button
})
```

---

## PRIORITY 5 - BACKLOG (Future Improvements)

### 5.1 Dark Mode Enhancement
- [ ] Test contrast ratios in dark mode
- [ ] Ensure smooth transition (current OK)
- [ ] Add toggle animation control

### 5.2 Responsive Image Optimization
- [ ] Verify next/image usage
- [ ] Add responsive srcset
- [ ] Test WebP/AVIF fallbacks

### 5.3 Performance Audits
- [ ] Lighthouse scores (target 90+)
- [ ] Bundle size analysis (current: OK)
- [ ] Lazy-load modals

### 5.4 Internationalization Audit
- [ ] Test RTL languages (if future need)
- [ ] Verify all aria-labels translated
- [ ] Check form labels i18n

---

## TESTING & VERIFICATION

### Manual Testing Checklist

**Keyboard Navigation**:
```
Tab → Focus through navbar, forms
Shift+Tab → Reverse direction
Enter → Activate buttons
Escape → Close modals/menus
Arrow Up/Down → Menu navigation (UserMenu)
```

**Screen Reader (NVDA/VoiceOver)**:
```
Announce: All links, buttons, form labels
Announce: Modal title, description
Skip: Decorative icons (aria-hidden)
```

**Visual**:
```
Focus visible: 2px outline + offset (all states)
Color contrast: 4.5:1 minimum
Text size: readable at 200% zoom
Mobile: 320px viewport
```

---

## TIMELINE RECOMMENDATION

### Week 1 (Immediate)
- [ ] 1.1 Axe-core audit (2-4h)
- [ ] 1.2 Touch targets verification (3-4h)

### Week 2
- [ ] 1.3 Mobile device testing (2-3h)
- [ ] 2.1 Form audit (4-6h)

### Week 3
- [ ] 2.2 Drag & drop audit (3-4h)
- [ ] 2.3 Modal variants check (2-3h)

### Week 4+
- [ ] 3.x Documentation & polish
- [ ] Create WCAG compliance doc
- [ ] Setup automated E2E a11y tests

---

## RESOURCES

### Documentation
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Docs](https://www.radix-ui.com/docs/primitives/overview/introduction)
- [Next.js Accessibility](https://nextjs.org/docs/pages/building-your-application/optimizing/accessibility)

### Tools
- [axe DevTools (Chrome)](https://www.deque.com/axe/devtools/)
- [WAVE (Firefox)](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Contrast Ratio Checker](https://contrast-ratio.com/)

### Screen Readers
- NVDA (Windows) - Free: https://www.nvaccess.org/
- JAWS (Windows) - Commercial
- VoiceOver (macOS/iOS) - Built-in
- TalkBack (Android) - Built-in

---

## CONTACT & ESCALATION

**Questions sur accessibilité?**
- Refer to: `/docs/ACCESSIBILITY.md` (à créer)
- Check: WCAG_COMPLIANCE.md (à créer)
- Search: GitHub Issues avec tag `a11y`

**Found violation?**
1. Create GitHub issue: `[A11y] Component XYZ: ...`
2. Link to WCAG criterion
3. Provide: steps to reproduce, expected vs actual
4. Add to: PROJECT board

---

**Document Version**: 1.0
**Last Updated**: 28 novembre 2024
**Next Review**: After audit completion
