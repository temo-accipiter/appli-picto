# Phase 3: Testing Guide 🧪

**Objective**: Verify all three Phase 3 variants work correctly on mobile, tablet, and desktop
**Time**: 30-45 minutes for complete testing
**Tools Needed**: Chrome DevTools (browser built-in)

---

## 🚀 Quick Start: 5-Minute Test

If you just want to quickly verify Phase 3 works:

1. Open Chrome DevTools: `F12`
2. Toggle device toolbar: `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac)
3. Set viewport to **390px** (iPhone 12)
4. Test each variant below (takes 5 min total)

---

## 📱 Device Sizes to Test

Use Chrome DevTools "Toggle device toolbar" with these presets or custom sizes:

| Device           | Width  | Height | Use For          | Notes                 |
| ---------------- | ------ | ------ | ---------------- | --------------------- |
| iPhone SE        | 375px  | 667px  | Smallest phone   | Test tight spacing    |
| iPhone 12        | 390px  | 844px  | Standard phone   | Main mobile test      |
| iPhone 14 Pro    | 393px  | 852px  | Phone with notch | Test safe-area        |
| Tablet (custom)  | 576px  | 800px  | Small tablet     | Transition point      |
| iPad             | 768px  | 1024px | Standard tablet  | Drawer→centered modal |
| iPad Pro         | 1024px | 1366px | Large tablet     | Desktop-like          |
| Desktop (custom) | 1200px | 800px  | Desktop          | Standard desktop      |
| Desktop (custom) | 1920px | 1080px | Large desktop    | Max-width test        |

---

## ✅ Test Plan

### Test 1: Base Modal (Phase 1 & 2 Baseline)

**Test on**: 390px, 768px, 1200px

**Steps**:

1. Open any modal in the app
2. Check overlay is dark (opacity 75%)
3. Check close button is large (48px)
4. Check "Annuler" button is visible in footer
5. Check modal has 2px border

**Expected**:

- [ ] Overlay is significantly darker than before
- [ ] Close button is noticeably larger
- [ ] "Annuler" button always visible
- [ ] Border adds visual weight to modal

---

### Test 2: Fullscreen Variant

**CSS Class**: `.modal--fullscreen`

#### 2.1 Mobile (375px)

**Steps**:

1. Add `className="modal--fullscreen"` to a Modal
2. Set viewport to 375px width
3. Inspect the modal

**Expected**:

- [ ] Modal takes 100vw × 100vh (full screen)
- [ ] No rounded corners (sharp corners at 0px)
- [ ] Modal fills entire viewport
- [ ] Title is readable with padding
- [ ] Content scrolls if too tall
- [ ] Buttons are full-width

**Visual check**:

```
┌─────────────────────┐
│ Title          ✕    │ ← Header with padding
├─────────────────────┤
│                     │
│  Content fills      │
│  entire viewport    │
│  (100% height)      │
│                     │
│                     │
├─────────────────────┤
│ [Annuler]           │ ← Full-width buttons
│ [Confirm]           │
└─────────────────────┘
```

#### 2.2 Tablet (576px)

**Steps**:

1. Keep `className="modal--fullscreen"`
2. Change viewport to 576px width
3. Inspect the modal

**Expected**:

- [ ] Modal is NOT fullscreen anymore
- [ ] Width transitions to 95vw
- [ ] Max-width is 540px
- [ ] Modal is no longer fixed position
- [ ] Rounded corners appear on top

#### 2.3 Desktop (1200px)

**Steps**:

1. Keep `className="modal--fullscreen"`
2. Change viewport to 1200px width
3. Inspect the modal

**Expected**:

- [ ] Modal returns to normal centered modal
- [ ] Width is 90%
- [ ] Max-width is 600px (large desktop size)
- [ ] Rounded corners on all corners
- [ ] Modal is centered (not fullscreen)

---

### Test 3: Drawer Variant

**CSS Classes**: `.modal--drawer` on Modal + `.modal-overlay--drawer` on overlay

#### 3.1 Mobile (390px)

**Steps**:

1. Add `className="modal--drawer"` to Modal
2. Update overlay: `className="modal-overlay--drawer"`
3. Set viewport to 390px
4. Inspect the modal

**Expected**:

- [ ] Modal slides up from bottom (watch animation)
- [ ] Handle bar visible at top (40×4px gray bar)
- [ ] Modal width is 100% (full width)
- [ ] Max-height is 70vh (can scroll content)
- [ ] Rounded corners only at top (not bottom)
- [ ] Animation plays smoothly (slideUpIn)

**Visual check**:

```
┌────────────────────────┐
│    [Overlay dim]       │
│  ┌──────────────────┐  │
│  │ [==handle bar==] │  │ ← 40×4px handle
│  ├──────────────────┤  │
│  │ Title        ✕   │  │
│  ├──────────────────┤  │
│  │   Drawer         │  │
│  │   Content        │  │
│  │ (max 70vh high)  │  │
│  │                  │  │
│  ├──────────────────┤  │
│  │ [Annuler]        │  │ ← Full-width buttons
│  │ [Confirm]        │  │
│  └──────────────────┘  │
└────────────────────────┘
```

#### 3.2 Tablet (768px)

**Steps**:

1. Keep drawer classes
2. Change viewport to 768px
3. Watch what happens

**Expected**:

- [ ] Drawer animation stops (not slideUpIn)
- [ ] Modal becomes centered (not at bottom)
- [ ] Modal switches to scaleIn animation (zoom in)
- [ ] Handle bar disappears
- [ ] Modal has rounded corners all around
- [ ] Layout looks like normal centered modal

#### 3.3 Desktop (1200px)

**Steps**:

1. Keep drawer classes
2. Change viewport to 1200px
3. Inspect the modal

**Expected**:

- [ ] Modal is centered on screen
- [ ] Width is 90%, max-width 500px
- [ ] No handle bar
- [ ] Animation is scaleIn (center zoom)
- [ ] Layout identical to non-drawer modal

---

### Test 4: Safe-Area Support (iPhone Notches)

**Note**: Safe-area only visible on iOS or iOS simulator. Browser dev tools may not fully simulate.

#### 4.1 Mobile with Simulated Notch (390px)

**Steps**:

1. Use any modal (fullscreen, drawer, or default)
2. Set viewport to 390px
3. Assume left/right notch insets (iPhone 14 Pro has ~44px)

**Expected**:

- [ ] Modal respects safe-area on left/right
- [ ] Content doesn't overlap notch (responsive padding)
- [ ] Header, content, footer all have safe-area padding
- [ ] No horizontal scroll even with safe-area

**Note**: Safe-area is CSS only (`@supports (padding: max(0px))`). Full test requires real iPhone.

#### 4.2 Desktop (Safe-area should be 0)

**Steps**:

1. Check any modal on 1200px
2. Open DevTools console

**Expected**:

- [ ] No safe-area padding applied (env values = 0)
- [ ] Desktop layout unaffected
- [ ] No visual differences

---

### Test 5: Animations

#### 5.1 Drawer slideUpIn Animation

**Steps**:

1. Use drawer variant on 390px
2. Open the modal
3. Watch the animation

**Expected**:

- [ ] Modal slides up from bottom smoothly
- [ ] Opacity fades in (0→1)
- [ ] Transform translateY goes from 100%→0%
- [ ] Animation duration ~300ms (base transition time)
- [ ] No jank or stuttering

#### 5.2 Reduced Motion Support

**Steps**:

1. Open DevTools → Rendering tab
2. Enable "Emulate CSS media feature prefers-reduced-motion"
3. Set to "reduce"
4. Open drawer modal on 390px

**Expected**:

- [ ] Animation is DISABLED (no slideUpIn)
- [ ] Modal appears instantly (no animation)
- [ ] No transform or opacity animation
- [ ] Content is immediately visible

**Do NOT see**:

- ❌ Sliding animation
- ❌ Fade-in effect
- ❌ Any movement/transition

#### 5.3 fullscreen/centered Modal Animation

**Steps**:

1. Use fullscreen or default modal on 390px
2. Open the modal
3. Watch the animation

**Expected**:

- [ ] Modal scales in (scaleIn animation)
- [ ] Starts at scale(0.95) and grows to scale(1)
- [ ] Opacity fades in
- [ ] Smooth, gentle animation
- [ ] Duration ~150ms (fast transition)

---

### Test 6: Responsive Typography

**Test on**: 390px, 576px, 768px, 1200px

**Steps**:

1. Open any modal
2. Resize viewport to test each breakpoint
3. Check font sizes visually

**Expected**:

- [ ] **390px**: Smaller fonts (title 20px, message 16px)
- [ ] **576px**: Medium fonts
- [ ] **768px+**: Larger fonts (title 24px, message 20px)
- [ ] Text always readable
- [ ] No overflow or wrapping issues

---

### Test 7: Button Layout

**Test on**: 390px, 576px, 768px, 1200px

**Steps**:

1. Open modal with multiple action buttons
2. Check footer button layout at each breakpoint

**Expected**:

- [ ] **390px**: Buttons stack vertically (100% width)
- [ ] **576px+**: Buttons inline (Annuler on left, others on right)
- [ ] All buttons remain 44px tall (min-height)
- [ ] No overflow or layout issues

**Visual**:

```
390px (mobile)          768px+ (desktop)
[Annuler]               [Annuler] [OK]
[OK]
```

---

### Test 8: Dark Mode

**Steps**:

1. Enable dark mode in DevTools (Customize → Emulate CSS media feature prefers-color-scheme → dark)
2. Open all three variants

**Expected**:

- [ ] Modal background darkens
- [ ] Text color adjusts for readability
- [ ] Handle bar visible (gray(300) on dark)
- [ ] All colors adapt to dark mode
- [ ] No contrast issues

---

### Test 9: Keyboard Navigation

**Steps**:

1. Open modal on any size
2. Press Tab to navigate buttons
3. Press Escape to close modal
4. Press Enter to activate focused button

**Expected**:

- [ ] Tab cycles through buttons
- [ ] Visual focus ring appears
- [ ] Escape key closes modal
- [ ] Enter activates button
- [ ] No focus traps or keyboard issues

---

### Test 10: Content Overflow

#### 10.1 Long Title

**Steps**:

1. Use modal with very long title (30+ words)
2. Test on 390px

**Expected**:

- [ ] Title wraps to multiple lines
- [ ] No overflow or horizontal scroll
- [ ] Text remains readable

#### 10.2 Long Content

**Steps**:

1. Fill modal with lots of content (10+ paragraphs)
2. Test on all sizes

**Expected**:

- [ ] Content scrolls (not the whole modal)
- [ ] Scrollbar visible if needed
- [ ] Header and footer stay fixed
- [ ] No overflow

#### 10.3 Many Buttons

**Steps**:

1. Add 5+ action buttons to modal
2. Test on 390px and 1200px

**Expected**:

- [ ] **390px**: Buttons stack vertically
- [ ] **1200px**: Buttons fit inline
- [ ] No overflow in either case

---

## 🎬 Full Test Checklist

Print this checklist and check off as you test:

### Phase 3.1 Fullscreen

- [ ] Mobile (375px): Full 100vw × 100vh
- [ ] Tablet (576px): Transitions to 95vw
- [ ] Desktop (768px): Back to normal modal
- [ ] Large (1200px): 600px max-width
- [ ] No horizontal scroll on any size
- [ ] Animation plays (scaleIn)

### Phase 3.2 Drawer

- [ ] Mobile (390px): Slides up from bottom
- [ ] Handle bar visible (40×4px)
- [ ] Max-height 70vh (scrolls if needed)
- [ ] Rounded top corners only
- [ ] Tablet (768px): Reverts to centered
- [ ] Desktop (1200px): Normal centered modal
- [ ] Handle bar disappears at 768px+
- [ ] slideUpIn animation on mobile
- [ ] scaleIn animation on desktop

### Phase 3.3 Safe-Area

- [ ] Mobile (390px): Padding respects safe-area
- [ ] All sections (header/content/footer) have safe-area
- [ ] Desktop (1200px): No safe-area visible
- [ ] No visual issues
- [ ] Content readable everywhere

### General (All Phases)

- [ ] Dark mode works
- [ ] Reduced motion works
- [ ] Keyboard navigation works
- [ ] No console errors
- [ ] Responsive typography
- [ ] Button layout correct
- [ ] Content overflow handled
- [ ] All animations smooth

---

## 🐛 Troubleshooting

### Drawer not sliding from bottom?

**Check**:

1. Is `className="modal-overlay--drawer"` on overlay?
2. Is `className="modal--drawer"` on modal?
3. Is viewport width < 768px?
4. Check console for CSS errors

### Fullscreen taking normal size on mobile?

**Check**:

1. Is `className="modal--fullscreen"` applied?
2. Is viewport width < 576px?
3. Check browser DevTools styles (should show `width: 100vw`)

### Handle bar not visible?

**Check**:

1. Drawer variant applied?
2. Viewport < 768px?
3. Dark mode might make it hard to see
4. Check console for CSS errors

### Safe-area not working?

**Check**:

1. Safe-area only works on iOS or simulator
2. Browser DevTools may not fully simulate
3. Real device test is best (iPhone)
4. Check `@supports (padding: max(0px))` is working

### Animation not playing?

**Check**:

1. Is `prefers-reduced-motion` enabled? (Should be off for animation test)
2. Check browser DevTools animations tab
3. Try reopening modal
4. Check for CSS errors in console

---

## 📊 Performance Notes

**Modal.scss file size**: 489 lines (~15 KB with all styles)

**Performance impact**:

- All styles are CSS-only (no JavaScript)
- Animations are GPU-accelerated (transform + opacity)
- No layout thrashing
- Supports motion preferences (respects OS settings)
- Zero performance regression

**Build time**: No measurable change (CSS only)

---

## ✨ Success Criteria

✅ You've successfully tested Phase 3 when:

1. Fullscreen variant works on all screen sizes
2. Drawer variant slides up on mobile, centers on desktop
3. Handle bar visible and decorative
4. Safe-area padding respects notches (on iOS)
5. All animations play smoothly
6. Dark mode works on all variants
7. Keyboard navigation works
8. No console errors
9. No horizontal scrolling
10. Content readable on all sizes

---

## 📝 Test Report Template

Use this template to document your test results:

```
Date: ____________________
Tester: ____________________

FULLSCREEN VARIANT
□ 375px: ____  □ 576px: ____  □ 768px: ____  □ 1200px: ____
Notes: ________________________

DRAWER VARIANT
□ 390px: ____  □ 576px: ____  □ 768px: ____  □ 1200px: ____
Notes: ________________________

SAFE-AREA
□ Mobile: ____  □ Desktop: ____
Notes: ________________________

ANIMATIONS
□ slideUpIn (drawer): ____
□ scaleIn (fullscreen): ____
□ Reduced motion: ____
Notes: ________________________

DARK MODE
□ Works on all variants: ____
Notes: ________________________

ACCESSIBILITY
□ Keyboard nav: ____
□ Screen reader: ____
□ Focus visible: ____
Notes: ________________________

OVERALL STATUS: ✅ PASS / ⚠️ ISSUES

Issues found: ________________________
```

---

## 🎉 Next Steps After Testing

After successful testing:

1. **Document findings**: Use test report template above
2. **Fix any issues**: Use troubleshooting guide
3. **Deploy to production**: Phase 3 is production-ready
4. **Optional: Add TypeScript props** (Phase 4)
5. **Optional: Add unit tests** (Phase 4)
6. **Update team documentation**: Link to this guide

---

**Phase 3 testing complete! 🚀**

For detailed technical information, see `PHASE_3_IMPLEMENTATION_COMPLETE.md`
For quick reference, see `PHASE_3_QUICK_REFERENCE.md`
