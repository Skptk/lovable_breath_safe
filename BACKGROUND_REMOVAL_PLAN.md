# Background & Smoke Animation Removal Plan

## Overview
Systematically remove all smoke animation and dynamic background features from the codebase, replacing with a modern static gradient background inspired by MetaMask's design aesthetic.

## MetaMask Design Reference
- **Color Scheme**: Deep dark backgrounds with subtle gradients
- **Style**: Clean, modern, professional
- **Gradient**: Subtle radial/linear gradients with brand colors
- **Aesthetic**: Minimal, focused, not distracting

## Phase 1: Inventory and Analysis ✅

### Files to DELETE:
1. `src/components/backgrounds/InteractiveSmokeOverlay.tsx` - Smoke animation component
2. `src/components/SmokeEffect.tsx` - Alternative smoke effect component
3. `src/components/BackgroundManager.tsx` - Dynamic background manager
4. `src/lib/weatherBackgrounds.ts` - Weather-based background logic
5. `tests/backgroundManager.test.tsx` - Background manager tests (if exists)

### Files to UPDATE:
1. `src/pages/Index.tsx` - Remove `<BackgroundManager>` wrapper
2. `src/pages/Demo.tsx` - Remove `<BackgroundManager>` wrapper
3. `src/components/index.ts` - Remove smoke/background exports
4. `src/index.css` - Add MetaMask-style gradient, remove animation CSS
5. `src/pages/Landing.tsx` - Keep aura effects (they're separate decorative elements)

### Dependencies to Check:
- No external libraries used for smoke/background (all custom code)
- No database dependencies
- No API dependencies

## Phase 2: Remove Smoke Components

**Files to Delete:**
- `src/components/backgrounds/InteractiveSmokeOverlay.tsx`
- `src/components/SmokeEffect.tsx`

**Actions:**
1. Delete both files
2. Verify no imports exist (already checked - only exported, not imported)

## Phase 3: Remove BackgroundManager

**Files to Delete:**
- `src/components/BackgroundManager.tsx`
- `src/lib/weatherBackgrounds.ts`

**Dependencies to Remove:**
- Weather store hooks (only used for background)
- Time-of-day calculations (only used for background)
- Background image assets (if any in public folder)

## Phase 4: Update Page Components

**Files to Update:**

### `src/pages/Index.tsx`
- Remove: `import BackgroundManager from "@/components/BackgroundManager";`
- Remove: `<BackgroundManager>` wrapper
- Keep: Existing gradient classes on main div
- Add: New MetaMask-style gradient classes

### `src/pages/Demo.tsx`
- Remove: `import BackgroundManager from "@/components/BackgroundManager";`
- Remove: `<BackgroundManager>` wrapper
- Add: New MetaMask-style gradient classes

## Phase 5: Clean Up Exports

**File: `src/components/index.ts`**
- Remove: `export { default as BackgroundManager } from './BackgroundManager';`
- Remove: `export { default as SmokeEffect } from './SmokeEffect';`

## Phase 6: Create Modern Gradient Background

**File: `src/index.css`**

**Design Specifications (MetaMask-inspired):**
- Base: Deep dark blue/black (`#0a0e27` or similar)
- Gradient: Subtle radial gradient from center
- Accent: Teal/cyan highlights (`#2dd4bf` - matches primary color)
- Style: Smooth, professional, non-distracting

**CSS to Add:**
```css
/* Modern gradient background - MetaMask inspired */
.app-background {
  background: 
    radial-gradient(circle at 20% 30%, rgba(45, 212, 191, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.06) 0%, transparent 50%),
    linear-gradient(135deg, hsl(var(--background)) 0%, hsl(222 47% 9%) 100%);
  background-attachment: fixed;
  min-height: 100vh;
}
```

## Phase 7: Remove Animation CSS

**File: `src/index.css`**
- Remove any smoke-related keyframes
- Remove background transition animations
- Keep: Essential UI animations (transitions, etc.)

**CSS to Remove:**
- Any `@keyframes` related to smoke
- Any background-specific animations
- Any particle-related styles

## Phase 8: Remove Test Files

**Files to Delete:**
- `tests/backgroundManager.test.tsx` (if exists)

## Phase 9: Verification and Testing

**Checklist:**
- [ ] No broken imports
- [ ] All pages render correctly
- [ ] No console errors
- [ ] Background displays correctly on all pages
- [ ] Performance improved (no animation overhead)
- [ ] No unused dependencies remain

## Implementation Order

1. **Phase 2** - Remove smoke components (lowest risk)
2. **Phase 5** - Clean up exports
3. **Phase 6** - Create new gradient CSS
4. **Phase 4** - Update page components (use new gradient)
5. **Phase 3** - Remove BackgroundManager
6. **Phase 7** - Clean up animation CSS
7. **Phase 8** - Remove test files
8. **Phase 9** - Final verification

## Risk Assessment

**Low Risk:**
- Smoke components (not actively imported)
- CSS cleanup
- Export removal

**Medium Risk:**
- BackgroundManager removal (used in 2 pages)
- Page component updates

**Mitigation:**
- Test each phase independently
- Keep git commits per phase for easy rollback
- Verify after each major change

## Expected Benefits

1. **Performance**: Remove animation overhead (RAF loops, particle calculations)
2. **Simplicity**: Cleaner codebase, easier to maintain
3. **Consistency**: Single gradient background across all pages
4. **Modern Look**: MetaMask-inspired professional aesthetic
5. **Reduced Bundle Size**: Less code to bundle

## Notes

- Landing page aura effects are kept (they're decorative, not dynamic backgrounds)
- Color scheme variables remain unchanged (they're used throughout the app)
- Only background-specific logic is removed

