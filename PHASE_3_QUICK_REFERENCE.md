# Phase 3: Quick Reference Guide

## 🎯 Three Variants at a Glance

### 1️⃣ Fullscreen Variant

**Class**: `.modal--fullscreen`

**When to use**: Large forms, important decisions, immersive content

**Mobile behavior**: 100vw × 100vh fullscreen, no corners
**Desktop behavior**: Normal 90% × 500px modal

```tsx
<Modal className="modal--fullscreen" isOpen={true} title="Full Screen">
  {/* Content */}
</Modal>
```

**Visual**:
```
Mobile (390px)          Desktop (1200px)
┌─────────────────────┐ ┌───────────────────────┐
│ Title           ✕   │ │      Title      ✕     │
├─────────────────────┤ ├───────────────────────┤
│                     │ │                       │
│                     │ │    Modal content      │
│   Content here      │ │    (normal size)      │
│   (fullscreen)      │ │                       │
│                     │ │                       │
│                     │ ├───────────────────────┤
├─────────────────────┤ │ [Annuler] [Confirm]  │
│ [Annuler]           │ └───────────────────────┘
│ [Confirm]           │
└─────────────────────┘
```

---

### 2️⃣ Drawer Variant

**Classes**: `.modal--drawer` + `.modal-overlay--drawer`

**When to use**: Mobile menus, filters, bottom sheets, Material Design patterns

**Mobile behavior**: Bottom sheet sliding up, 40×4px handle bar, max 70vh height
**Desktop behavior**: Returns to normal centered modal

```tsx
<div className="modal-overlay modal-overlay--drawer">
  <Modal className="modal--drawer" isOpen={true} title="Filter">
    {/* Content */}
  </Modal>
</div>
```

**Visual**:
```
Mobile (390px)          Desktop (1200px)
┌─────────────────────┐ ┌───────────────────────┐
│  [Overlay dim]      │ │      Title      ✕     │
│  ┌────────────────┐ │ ├───────────────────────┤
│  │  [handle bar]  │ │ │    Drawer content     │
│  ├────────────────┤ │ │  (centered like this) │
│  │   Drawer       │ │ │                       │
│  │   Content      │ │ ├───────────────────────┤
│  │   (70vh max)   │ │ │ [Annuler] [Confirm]  │
│  │                │ │ └───────────────────────┘
│  │[Annuler]       │ │
│  │[Confirm]       │ │
│  └────────────────┘ │
└─────────────────────┘
```

---

### 3️⃣ Safe-Area Support (Automatic ✅)

**No code needed!** Safe-area support is automatic on mobile.

**What it does**:
- iPhone with notch: Content padding shifts right
- iPhone with Dynamic Island: Smart spacing
- iPad with home indicator: Bottom padding increases
- Android with gesture nav: No visible effect (safe-areas = 0)

**Visual**:
```
iPhone 14 Pro (393px with notch)
    |‾‾‾‾|
    | ◯ |
┌───────────────────┐
│ [safe-area] Title │ ← Respects notch
├───────────────────┤
│  Modal Content    │
├───────────────────┤
│  [Button 1]       │
│  [Button 2]       │
└───────────────────┘
  [safe-area]       ← Home indicator
```

---

## 🔧 Code Examples

### Example 1: Use Fullscreen for Account Setup

```tsx
// src/components/modals/SetupModal.tsx
export default function SetupModal({ isOpen, onClose }) {
  return (
    <Modal
      className="modal--fullscreen"
      isOpen={isOpen}
      onClose={onClose}
      title="Account Setup"
    >
      {/* Large form with many fields */}
      <form>
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
        {/* More fields... */}
      </form>
    </Modal>
  )
}
```

### Example 2: Use Drawer for Mobile Menu

```tsx
// src/components/navigation/MobileMenu.tsx
export default function MobileMenu({ isOpen, onClose }) {
  return (
    <div className="modal-overlay modal-overlay--drawer">
      <Modal
        className="modal--drawer"
        isOpen={isOpen}
        onClose={onClose}
        title="Menu"
      >
        <nav>
          <a href="/">Home</a>
          <a href="/tasks">Tasks</a>
          <a href="/rewards">Rewards</a>
        </nav>
      </Modal>
    </div>
  )
}
```

### Example 3: Safe-Area is Automatic

```tsx
// No changes needed! Just use normal Modal
export default function SettingsModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
    >
      {/* Content is automatically safe-area aware */}
    </Modal>
  )
}
```

---

## 📱 Breakpoints Reference

| Breakpoint | Device | Behavior |
|-----------|--------|----------|
| 320px | iPhone SE | Fullscreen/Drawer full width |
| 390px | iPhone 12-14 | Fullscreen/Drawer perfect fit |
| 576px | Tablet (small) | Transition point |
| 768px | iPad | Drawer switches to centered modal |
| 1024px | iPad Pro | Large desktop sizing |
| 1200px | Desktop | max-width increases to 600px |
| 1920px | Full desktop | Large screen optimization |

---

## 🎬 Animation Behavior

### Fullscreen Modal

- **Mobile**: `scaleIn` (scale 0.95→1, fade in)
- **Desktop**: `scaleIn` (same as base)
- **Reduced motion**: Instant, no animation

### Drawer Modal

- **Mobile (< 768px)**: `slideUpIn` (translateY 100%→0%, fade in)
- **Desktop (768px+)**: `scaleIn` (reverts to centered modal)
- **Reduced motion**: Instant, no animation

### Transition Speed

- `slideUpIn`: Uses `$transition-base` (~300ms, smoother)
- `scaleIn`: Uses `$transition-fast` (~150ms, quicker)

---

## ✅ Testing on Your Device

### Chrome DevTools (Easy Way)

1. **Open DevTools**: F12 or right-click → Inspect
2. **Toggle device toolbar**: Ctrl+Shift+M (Cmd+Shift+M on Mac)
3. **Test sizes**:
   - iPhone SE (375px)
   - iPhone 12 (390px)
   - iPad (768px)
   - Desktop (1200px)
4. **Test drawer**:
   - Open with `className="modal--drawer"`
   - Watch it slide up from bottom on 390px
   - Watch it revert to centered modal on 768px+

### Real Device Testing (Best)

1. Open your app on iPhone/Android
2. Test fullscreen modal on small screen
3. Test drawer modal - notice the handle bar
4. Test notch support (iPhone 12+) - content respects notch

---

## 🎨 Customization

### Change Drawer Height

In `Modal.scss`, line 329:

```scss
.modal--drawer {
  @media (max-width: 767px) {
    max-height: 70vh;  // ← Change this (70vh, 80vh, 90vh, etc.)
  }
}
```

### Change Handle Bar Size

In `Modal.scss`, lines 336-344:

```scss
&::before {
  width: 40px;    // ← Change width
  height: 4px;    // ← Change height
  margin: $spacing-sm auto;
}
```

### Change Fullscreen Corners

In `Modal.scss`, line 274:

```scss
border-radius: 0;  // ← Change to $radius-lg for rounded corners
```

### Change Safe-Area Padding

In `Modal.scss`, line 412:

```scss
padding-left: max($spacing-md, calc(env(safe-area-inset-left) + $spacing-sm));
//                   ^^^^^^^^^^                                 ^^^^^^^^^^
//                   Minimum padding      +      Additional safe-area padding
```

---

## 🐛 Troubleshooting

### Drawer not sliding from bottom on mobile?

**Check**: Is `className="modal--drawer"` on the Modal?
**Check**: Is overlay also using `className="modal-overlay--drawer"`?
**Check**: MediaQuery browser dev tools shows correct viewport width?

### Fullscreen taking normal size on mobile?

**Check**: Is `className="modal--fullscreen"` applied?
**Check**: Is viewport width actually < 576px?
**Check**: Check browser console for CSS errors

### Safe-area not working on iPhone?

**Check**: Is device actually showing a notch/safe-area?
**Check**: Browser DevTools may not fully simulate notches
**Check**: Test on real device or iOS simulator

### Handle bar not visible?

**Check**: Drawer variant applied?
**Check**: Dark mode - handle bar is `gray(300)` (should be visible)
**Check**: Content height - handle bar only shows on mobile

---

## 🚀 Deployment Checklist

Before deploying Phase 3 to production:

- [ ] Tested on real mobile device (iPhone or Android)
- [ ] Tested on tablet (iPad or Android tablet)
- [ ] Tested responsive breakpoints (375px, 390px, 576px, 768px, 1200px)
- [ ] Tested drawer drawer bottom sheet animation
- [ ] Tested fullscreen takes full viewport
- [ ] Tested safe-area on iPhone with notch
- [ ] Tested with `prefers-reduced-motion: reduce`
- [ ] Tested in dark mode
- [ ] Tested keyboard navigation (Tab, Escape, Enter)
- [ ] Tested screen reader (VoiceOver, TalkBack)
- [ ] No visual glitches or overflow
- [ ] Build succeeds (`pnpm build`)
- [ ] Tests pass (`pnpm test`)

---

## 📊 Phase Summary

| Aspect | Details |
|--------|---------|
| **Total Lines Added** | 195 lines to Modal.scss |
| **File Size** | 489 lines (was 294 after Phase 2.0) |
| **CSS Classes** | `.modal--fullscreen`, `.modal--drawer`, `.modal-overlay--drawer` |
| **Animations** | 1 new (slideUpIn) |
| **Safe-area** | Automatic, no changes needed |
| **Breaking Changes** | None |
| **Browser Support** | All modern browsers (IE 11+ with fallback) |
| **Mobile Support** | iOS 10+, Android 5+ |
| **Accessibility** | WCAG AAA maintained |

---

## 🎯 Common Use Cases

### Use Fullscreen When:
- ✅ Creating a new task with many fields
- ✅ Large form with long list of items
- ✅ Image preview or gallery
- ✅ Important confirmation (delete account)

### Use Drawer When:
- ✅ Mobile navigation menu
- ✅ Filter options
- ✅ Sort/order options
- ✅ Quick settings panel
- ✅ Share/export options

### Use Default When:
- ✅ Simple confirmation dialog
- ✅ Short message or alert
- ✅ Quick action (few buttons)
- ✅ Inline form (login, signup)

---

## 📞 Questions?

All variants are CSS-only and fully documented in:
- `PHASE_3_IMPLEMENTATION_COMPLETE.md` - Full technical details
- `PHASE_2_MODAL_IMPLEMENTATION.md` - Code examples from exploration
- `Modal.scss` - Inline comments in the actual code

All code follows existing patterns in the codebase and maintains full accessibility! 🎉
