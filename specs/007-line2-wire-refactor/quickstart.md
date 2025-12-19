# Quickstart: Line2 Wire Refactor

**Feature**: 007-line2-wire-refactor
**Date**: 2025-12-11

## Prerequisites

- Node.js 18+
- npm 11.6+
- Familiarity with Three.js and the existing WireVisualManager

## Development Setup

```bash
# Ensure you're on the feature branch
git checkout 007-line2-wire-refactor

# Install dependencies (if needed)
npm install

# Run tests in watch mode
npm test

# Start demo for visual verification
npm run dev:demo
```

---

## Implementation Steps

### Step 1: Add Line2 Material Helper

**File**: `src/scene/shared/MaterialUtils.ts`

Add a new helper function for creating LineMaterial:

```typescript
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export function createLine2Material(
  color: number = 0xffffff,
  linewidth: number = 2
): LineMaterial {
  return new LineMaterial({
    color,
    linewidth,
  });
}
```

### Step 2: Refactor WireVisualManager

**File**: `src/scene/shared/WireVisualManager.ts`

Key changes:

1. **Update imports**:
```typescript
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
```

2. **Change Map type**:
```typescript
private wireLines: Map<UUID, Line2> = new Map();
```

3. **Add shared material**:
```typescript
private wireMaterial: LineMaterial;

constructor() {
  this.wireMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: 2,
  });
}
```

4. **Add resolution method**:
```typescript
setResolution(width: number, height: number): void {
  this.wireMaterial.resolution.set(width, height);
}
```

5. **Update createOrUpdateWire()**:
```typescript
// Replace BufferGeometry with LineGeometry
const geometry = new LineGeometry();
geometry.setFromPoints(wirePath.points);

// Replace THREE.Line with Line2
line = new Line2(geometry, this.wireMaterial);
```

6. **Update dispose()**:
```typescript
// Also dispose the shared material
this.wireMaterial.dispose();
```

### Step 3: Update CircuitController

**File**: `src/scene/static/CircuitController.ts`

1. Call `setResolution()` after initializing WireVisualManager:
```typescript
this.wireVisualManager.setResolution(
  this.renderer.domElement.width,
  this.renderer.domElement.height
);
```

2. Update resolution on resize (if resize handling exists):
```typescript
onResize(width: number, height: number): void {
  // ... existing resize code ...
  this.wireVisualManager.setResolution(width, height);
}
```

### Step 4: Update Tests

**File**: `tests/scene/shared/WireVisualManager.test.ts`

1. **Add import**:
```typescript
import { Line2 } from 'three/addons/lines/Line2.js';
```

2. **Update type checks**:
```typescript
// Before:
expect(line).toBeInstanceOf(THREE.Line);

// After:
expect(line.isLine2).toBe(true);
```

3. **Add resolution setup in beforeEach** (if testing rendering):
```typescript
wireManager.setResolution(800, 600);
```

---

## Verification Checklist

After implementation, verify:

- [ ] `npm test` passes with updated tests
- [ ] `npm run lint` passes
- [ ] Demo renders wires correctly (`npm run dev:demo`)
- [ ] Wire width is consistent when zooming
- [ ] Wires with intermediate points render as single connected line
- [ ] Adding/removing wires updates scene correctly
- [ ] Moving components updates connected wires
- [ ] Browser console shows no WebGL warnings

---

## Common Issues

### Lines Not Rendering
**Cause**: LineMaterial resolution not set
**Fix**: Ensure `setResolution()` is called with actual viewport dimensions

### Lines Disappear on Resize
**Cause**: Resolution not updated on window resize
**Fix**: Call `setResolution()` in resize handler

### Type Errors with Line2
**Cause**: Missing @types/three update or incorrect import
**Fix**: Ensure three is 0.181+ and use correct import path:
```typescript
import { Line2 } from 'three/addons/lines/Line2.js';
```

### Tests Failing with "Line2 is not defined"
**Cause**: Missing import in test file
**Fix**: Add Line2 import at top of test file

---

## API Reference

### New WireVisualManager Methods

```typescript
/**
 * Update the LineMaterial resolution for proper line width rendering.
 * Must be called on init and whenever the viewport size changes.
 *
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 */
setResolution(width: number, height: number): void
```

### Return Type Changes

```typescript
// Before
getWireLine(wireId: UUID): THREE.Line | undefined

// After
getWireLine(wireId: UUID): Line2 | undefined
```

---

## Next Steps

After completing implementation:

1. Run full test suite: `npm test`
2. Visual verification with demo
3. Proceed to `/speckit.tasks` for task breakdown
