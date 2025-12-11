# Data Model: Line2 Wire Refactor

**Feature**: 007-line2-wire-refactor
**Date**: 2025-12-11

## Overview

This feature is a rendering refactor. The core data model (Wire, WirePath, Circuit) remains unchanged. This document describes the visual/rendering model changes within WireVisualManager.

---

## Unchanged Entities (Core Module)

### Wire
```typescript
// From src/core/Wire.ts - NO CHANGES
interface Wire {
  id: UUID;
  node1: UUID;           // ENode reference (pin or branching point)
  node2: UUID;           // ENode reference (pin or branching point)
  intermediatePositions: Position[];  // Grid coordinates for wire routing
}
```

### WirePath (Scene Module)
```typescript
// From src/scene/shared/WireVisualManager.ts - NO CHANGES
interface WirePath {
  wireId: UUID;
  points: THREE.Vector3[];  // World-space coordinates
}
```

---

## Changed Entities (Scene Module)

### WireVisualManager Internal State

**Before (Current)**:
```typescript
class WireVisualManager {
  private wireLines: Map<UUID, THREE.Line>;  // One Line per wire
  private scene: THREE.Scene | null;
  private componentGroups: Map<UUID, THREE.Object3D>;
}
```

**After (Refactored)**:
```typescript
class WireVisualManager {
  private wireLines: Map<UUID, Line2>;       // One Line2 per wire
  private wireMaterial: LineMaterial;        // Shared material for all wires
  private scene: THREE.Scene | null;
  private componentGroups: Map<UUID, THREE.Object3D>;
}
```

### Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| Line Type | `THREE.Line` | `Line2` (from three/addons) |
| Geometry | `THREE.BufferGeometry` | `LineGeometry` |
| Material | `THREE.LineBasicMaterial` (per wire) | `LineMaterial` (shared) |
| Line Width | Ignored by WebGL (always 1px) | Configurable, consistent width |
| Resolution | N/A | Required on LineMaterial |

---

## New Internal Types

### LineMaterial Configuration
```typescript
// Initialized once in WireVisualManager constructor
interface LineMaterialConfig {
  color: number;     // Default: 0xffffff (white)
  linewidth: number; // Default: 2 (pixels)
}
```

### Resolution Update
```typescript
// New method signature
setResolution(width: number, height: number): void
```

---

## Three.js Object Graph

### Before
```
THREE.Scene
├── [Component Groups...]
└── THREE.Line (wire-1)
    ├── geometry: THREE.BufferGeometry
    │   └── positions: Float32BufferAttribute
    └── material: THREE.LineBasicMaterial
└── THREE.Line (wire-2)
    ├── geometry: THREE.BufferGeometry
    └── material: THREE.LineBasicMaterial
└── ... (N Lines for N wires, each with own material)
```

### After
```
THREE.Scene
├── [Component Groups...]
└── Line2 (wire-1)
    ├── geometry: LineGeometry (extends InstancedBufferGeometry)
    │   ├── instanceStart: InstancedInterleavedBufferAttribute
    │   └── instanceEnd: InstancedInterleavedBufferAttribute
    └── material: LineMaterial (SHARED)
└── Line2 (wire-2)
    ├── geometry: LineGeometry
    └── material: LineMaterial (SHARED - same instance)
└── ... (N Line2 for N wires, all sharing one LineMaterial)
```

---

## Wire Visual Lifecycle

### Creation Flow
1. `createOrUpdateWire(wire, circuit, scene, componentGroups)` called
2. `computeWirePath()` returns `WirePath` with `points: Vector3[]`
3. New `LineGeometry` created
4. `geometry.setFromPoints(wirePath.points)` populates geometry
5. New `Line2(geometry, this.wireMaterial)` created with shared material
6. `userData` set with `{ type: 'wire', wireId: wire.id }`
7. Line2 added to scene and stored in `wireLines` map

### Update Flow
1. `createOrUpdateWire()` called for existing wire
2. Existing Line2 retrieved from `wireLines` map
3. `computeWirePath()` returns updated points
4. Old geometry disposed
5. New `LineGeometry` created and populated with `setFromPoints()`
6. `line.geometry = newGeometry` replaces geometry

### Removal Flow
1. `removeWire(wireId)` called
2. Line2 retrieved from map
3. `line.geometry.dispose()` called (material NOT disposed - shared)
4. Line2 removed from scene
5. Entry removed from `wireLines` map

### Full Disposal Flow
1. `dispose()` called
2. All Line2 geometries disposed
3. All Line2s removed from scene
4. `wireLines` map cleared
5. **Shared `wireMaterial` disposed** (only in full disposal)

---

## Invariants

1. **One Line2 per wire**: `wireLines.size === circuit.wires.size` (for rendered wires)
2. **Shared material**: All Line2 objects reference same LineMaterial instance
3. **Resolution sync**: `wireMaterial.resolution` always matches renderer viewport
4. **UserData consistency**: Every Line2 has `userData.type === 'wire'` and `userData.wireId`
