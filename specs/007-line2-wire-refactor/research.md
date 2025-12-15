# Research: Line2 Wire Refactor

**Feature**: 007-line2-wire-refactor
**Date**: 2025-12-11
**Status**: Complete

## Research Summary

This document captures findings for refactoring WireVisualManager from THREE.Line to Line2 (three/addons).

---

## 1. Line2 Import Paths

**Decision**: Use ES module imports from `three/addons/lines/`

**Rationale**: Three.js 0.181+ bundles addons as ES modules. The project already uses this pattern (e.g., MapControls).

**Import Statements**:
```typescript
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
```

**Alternatives considered**:
- `three-fatline` package - Rejected: unnecessary extra dependency when three/addons provides same functionality
- Direct file imports from node_modules - Rejected: less maintainable, addons path is canonical

---

## 2. Line2 API Usage

**Decision**: Use Line2 constructor with explicit LineGeometry and LineMaterial

**Class Hierarchy**:
```
THREE.Mesh
  └── LineSegments2 (handles instanced rendering)
        └── Line2 (polyline convenience wrapper)
```

**Constructor Pattern**:
```typescript
const geometry = new LineGeometry();
const material = new LineMaterial({ color: 0xffffff, linewidth: 2 });
const line = new Line2(geometry, material);
```

**Type Identification**:
- `line.isLine2 = true` (runtime check)
- `line.type = 'Line2'` (string identifier)

---

## 3. LineGeometry: Setting Positions

**Decision**: Use `setFromPoints()` method with Vector3 array

**Rationale**: The existing `WirePath.points` is already a `THREE.Vector3[]`, so `setFromPoints()` is the perfect fit - no conversion needed.

**Usage**:
```typescript
const geometry = new LineGeometry();
geometry.setFromPoints(wirePath.points); // Vector3[]
```

**Alternatives considered**:
- `setPositions(float[])` - Rejected: requires flattening Vector3 array to [x1,y1,z1,x2,y2,z2,...] format
- Direct attribute manipulation - Rejected: more complex, only beneficial for frame-by-frame animation

**Internal behavior**: `setFromPoints()` extracts x, y, z from each Vector3 and builds the instanced buffer geometry.

---

## 4. LineMaterial Configuration

**Decision**: Create LineMaterial with color, linewidth, and resolution

**Required Properties**:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| color | number/string | random | Line color |
| linewidth | number | 1 | Width in pixels (or world units if worldUnits=true) |
| resolution | Vector2 | required | Viewport size in pixels - MUST be set |
| worldUnits | boolean | false | If true, linewidth is in world units |

**Critical Requirement**: `resolution` must be set to the renderer viewport size. Without it, lines may not render correctly.

**Implementation Pattern**:
```typescript
const material = new LineMaterial({
  color: 0xffffff,
  linewidth: 2,
});
material.resolution.set(window.innerWidth, window.innerHeight);
```

**Resolution Updates**: Must update on window/container resize:
```typescript
window.addEventListener('resize', () => {
  material.resolution.set(window.innerWidth, window.innerHeight);
});
```

---

## 5. Dynamic Geometry Updates

**Decision**: Call `setFromPoints()` on geometry when wire path changes

**Rationale**: For our use case (wire endpoints change during component drag), rebuilding geometry is acceptable since updates are infrequent (user interaction rate, not every frame).

**Update Pattern**:
```typescript
// When wire path changes:
const newPath = this.computeWirePath(wire, circuit, componentGroups);
line.geometry.setFromPoints(newPath.points);
line.computeLineDistances(); // Required for accurate length calculations
```

**Performance Note**: If animation-rate updates were needed, direct attribute manipulation would be more efficient:
```typescript
geometry.attributes.instanceStart.setXYZ(index, x, y, z);
geometry.attributes.instanceStart.needsUpdate = true;
```

However, wire updates happen on drag events (max ~60/sec during interaction), which is well within `setFromPoints()` performance budget.

---

## 6. Memory Management

**Decision**: Dispose geometry and material explicitly, similar to current THREE.Line disposal

**Disposal Pattern**:
```typescript
line.geometry.dispose();
line.material.dispose();
scene.remove(line);
```

**Note**: LineMaterial extends ShaderMaterial, so standard material disposal applies.

---

## 7. UserData for Wire Identification

**Decision**: Continue using `userData` to store wire metadata, same pattern as current implementation

**Pattern**:
```typescript
line.userData = {
  type: 'wire',
  wireId: wire.id,
};
```

This maintains compatibility with HoverManager and SelectionManager which query `userData.type`.

---

## 8. Type Definitions

**Decision**: Use type imports from three/addons with TypeScript

**Type Import**:
```typescript
import type { Line2 } from 'three/addons/lines/Line2.js';
import type { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
```

**Note**: @types/three includes type definitions for addons as of recent versions.

---

## 9. Test Adaptation Strategy

**Decision**: Update existing tests to check for Line2 instead of THREE.Line

**Changes Required**:
1. Import Line2 in test file
2. Change `instanceof THREE.Line` checks to `instanceof Line2` or `line.isLine2`
3. Verify geometry has correct point count via `geometry.attributes.instanceStart.count`

**Example Test Adaptation**:
```typescript
// Before:
expect(line).toBeInstanceOf(THREE.Line);

// After:
expect(line.isLine2).toBe(true);
// or
import { Line2 } from 'three/addons/lines/Line2.js';
expect(line).toBeInstanceOf(Line2);
```

---

## 10. Integration with CircuitSceneManager

**Decision**: CircuitSceneManager must provide renderer resolution to WireVisualManager

**Options Evaluated**:

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Pass resolution to each createOrUpdateWire call | Simple | Repetitive |
| B | Set resolution via dedicated method | Clean API | Extra method call |
| C | Share LineMaterial across all wires | Memory efficient | Coupling |

**Selected**: Option C - Each wire has a shared LineMaterial accross few variants (idle, hovered, selected ...) to handle user actions visual feedbacks.

**Rationale**:
- All wires use same visual style (white, 2px)
- Reduces memory footprint
- Single place to update resolution ony once on resize
- Allows easy future extension for different visual states

**Implementation**:
```typescript
class WireVisualManager {
  private wireMaterials: Map<WireVisualState, LineMaterial>

  constructor() {
      // Create shared LineMaterial with default white color and 2px width
      this.wireMaterials = new Map([
          ['idle', createLine2Material(0xffffff, 2)]
      ]);
  }

  setResolution(width: number, height: number): void {
      for(const material of this.wireMaterials.values()) {
          material.resolution.set(width, height);
      }
  }
}
```

CircuitSceneManager calls `wireVisualManager.setResolution()` on init and resize.

---

## Sources

- [Three.js Line2 Documentation](https://threejs.org/docs/examples/en/lines/Line2.html)
- [Three.js LineMaterial Documentation](https://threejs.org/docs/examples/en/lines/LineMaterial.html)
- [Three.js Forum: How to update Line2 dynamically](https://discourse.threejs.org/t/how-to-update-line2-dynamically/37913)
- [Three.js Forum: Import Line2, LineGeometry and LineMaterial](https://discourse.threejs.org/t/import-line2-linegeometry-and-linematerial/13570)
- [Three.js GitHub: Line2.js source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/Line2.js)
- [Three.js GitHub: LineGeometry.js source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineGeometry.js)
- [Three.js GitHub: LineMaterial.js source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineMaterial.js)
