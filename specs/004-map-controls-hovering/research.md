# Research: Map Controls and Hovering Detection

**Feature**: 004-map-controls-hovering
**Date**: 2025-12-08
**Status**: Complete

## Executive Summary

All technical questions have been resolved. The existing codebase already has foundational work for the hitbox layer system (LAYERS enum, hitbox creation patterns in ComponentVisuals.ts). MapControls is already imported in the viewer script. This feature extends existing patterns rather than introducing new architectural concepts.

---

## Research Topics

### 1. Three.js MapControls Integration

**Question**: How to properly integrate MapControls with existing scene managers?

**Decision**: Use MapControls from `three/addons/controls/MapControls.js`

**Rationale**:
- Already imported in `scripts/viewer/src/main.ts` and verified working
- MapControls is specifically designed for 2D map-style navigation (appropriate for circuit viewing)
- Provides built-in damping, zoom limits, and rotation around a center point
- Attaches to camera and domElement, integrates with render loop via `update()` call

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| OrbitControls | More suited for 3D object inspection; MapControls better for top-down circuit view |
| Custom controls | Unnecessary complexity; MapControls already provides all needed features |
| TrackballControls | Overly flexible; doesn't constrain to map-style interaction |

**Implementation Notes**:
```typescript
import { MapControls } from 'three/addons/controls/MapControls.js';

// In initialize():
this.mapControls = new MapControls(this.camera, container);
this.mapControls.enableDamping = true;
this.mapControls.dampingFactor = 0.05;
this.mapControls.screenSpacePanning = true;  // Pan parallel to screen
this.mapControls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation

// In render loop:
this.mapControls.update();
```

---

### 2. Three.js Layer System for Hitbox Priority

**Question**: How to implement priority-based raycasting (enode > component > wire)?

**Decision**: Use Three.js Layers with sequential raycasting

**Rationale**:
- Three.js Layers are a built-in mechanism for organizing objects
- Raycaster can be configured to only intersect objects on specific layers
- By raycasting layers sequentially (1, then 2, then 3), priority is achieved naturally
- Already partially implemented: `ComponentVisuals.ts` defines `LAYERS` enum and assigns hitboxes

**Existing Code** (from `src/scene/shared/ComponentVisuals.ts`):
```typescript
enum LAYERS {
    ENODE_HITBOX = 1,
    COMPONENT_HITBOX = 2,
    WIRE_HITBOX = 3,
}

// Usage:
hitbox.layers.set(LAYERS.COMPONENT_HITBOX);
```

**Implementation Pattern**:
```typescript
// Priority-based raycasting
const raycaster = new THREE.Raycaster();
raycaster.layers.set(LAYERS.ENODE_HITBOX);
let hits = raycaster.intersectObjects(scene.children, true);
if (hits.length === 0) {
    raycaster.layers.set(LAYERS.COMPONENT_HITBOX);
    hits = raycaster.intersectObjects(scene.children, true);
}
if (hits.length === 0) {
    raycaster.layers.set(LAYERS.WIRE_HITBOX);
    hits = raycaster.intersectObjects(scene.children, true);
}
```

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Single raycast + sort by type | Less efficient; must check all objects every time |
| Separate scenes per type | Overly complex; layers are simpler |
| userData priority values | Manual sorting required; layers are native optimization |

---

### 3. Hover State Management

**Question**: How to track hover state and emit events correctly?

**Decision**: Dedicated HoverManager class with state tracking

**Rationale**:
- Centralizes hover logic for reuse by both scene managers
- Tracks `currentlyHovered` to prevent duplicate events
- Handles edge cases (cursor leave, element removal)
- Follows existing EventEmitter pattern

**State Machine**:
```
Initial: null (nothing hovered)

On mouse move:
  1. Perform priority raycast
  2. If hit.elementId !== currentlyHovered?.id:
     a. If currentlyHovered exists: emit 'unhover'
     b. If hit exists: emit 'hover', set currentlyHovered
     c. If no hit: set currentlyHovered = null
```

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Inline in scene managers | Code duplication; harder to test |
| RxJS observables | Adds dependency; EventEmitter already exists |
| DOM events only | Loses Three.js object references |

---

### 4. Wire Hitbox Strategy

**Question**: How to make thin wire lines hoverable?

**Decision**: Invisible tube/cylinder meshes alongside wire lines (already implemented)

**Rationale**:
- Wire lines are rendered as THREE.Line with minimal thickness
- Lines are nearly impossible to hover with raycasting
- Invisible cylindrical or flat meshes provide larger hit targets
- Pattern already established in ComponentVisuals.ts

**Implementation**:
```typescript
// For wire creation (to be added):
const wireHitboxGeometry = new THREE.CylinderGeometry(0.2, 0.2, wireLength);
const wireHitbox = new THREE.Mesh(wireHitboxGeometry, invisibleMaterial);
wireHitbox.layers.set(LAYERS.WIRE_HITBOX);
wireHitbox.userData = { type: 'wireHitbox', wireId: wire.id };
```

---

### 5. MapControls Configuration Options

**Question**: What configuration should be exposed to consumers?

**Decision**: Optional config object in `initialize()` with sensible defaults

**Configuration Interface**:
```typescript
interface MapControlsOptions {
    enablePan?: boolean;      // default: true
    enableZoom?: boolean;     // default: true
    enableRotate?: boolean;   // default: true
    enableDamping?: boolean;  // default: true
    dampingFactor?: number;   // default: 0.05
    minZoom?: number;         // default: 0.5
    maxZoom?: number;         // default: 10
}
```

**Rationale**:
- FR-004 requires configuration options
- Damping is universally desired for smooth UX
- Zoom limits prevent getting lost in the scene
- All options have sensible defaults

---

### 6. Event Listener Lifecycle

**Question**: How to properly manage mouse event listeners?

**Decision**: Attach to container element, clean up in dispose()

**Rationale**:
- Container element is passed to `initialize()`
- Mouse events (mousemove) needed for hover detection
- Must remove listeners on dispose() to prevent memory leaks
- MapControls manages its own listeners internally

**Implementation**:
```typescript
// In initialize():
this.onMouseMove = this.handleMouseMove.bind(this);
this.container.addEventListener('mousemove', this.onMouseMove);
this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

// In dispose():
this.container.removeEventListener('mousemove', this.onMouseMove);
this.mapControls.dispose();
```

---

## Key Findings Summary

| Topic | Decision | Confidence |
|-------|----------|------------|
| Camera controls | MapControls (already imported) | High |
| Priority system | Three.js Layers (already implemented) | High |
| Hover tracking | HoverManager class with state | High |
| Wire hitboxes | Invisible cylinder meshes | High |
| Configuration | Optional config with defaults | High |
| Lifecycle | Container event listeners + dispose() | High |

---

## Impact on Existing Code

### Files to Modify
1. `src/scene/shared/types.ts` - Add HoveredElement type, MapControlsOptions
2. `src/scene/static/CircuitSceneManager.ts` - Add MapControls, HoverManager
3. `src/scene/simulation/CircuitRunnerSceneManager.ts` - Add MapControls, HoverManager
4. `src/scene/shared/ComponentVisuals.ts` - Extract LAYERS to shared file

### Files to Create
1. `src/scene/shared/HoverManager.ts` - New hover detection class
2. `src/scene/shared/LayerConstants.ts` - Extracted LAYERS enum
3. Wire hitbox creation utility (in GeometryUtils or new file)

### No Changes Needed
- `src/core/*` - Core module untouched
- `src/playback/*` - Playback module untouched
- Existing component visual factories - Already have hitboxes

---

## Next Steps

Proceed to Phase 1:
1. Create data-model.md with HoveredElement and configuration types
2. Create contracts/ with TypeScript interfaces
3. Create quickstart.md with usage examples
