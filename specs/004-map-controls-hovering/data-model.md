# Data Model: Map Controls and Hovering Detection

**Feature**: 004-map-controls-hovering
**Date**: 2025-12-08

## Overview

This feature introduces types for hover detection and MapControls configuration. No persistent data storage is involved - all entities represent runtime state.

---

## Entities

### 1. HoveredElement

Represents the currently hovered circuit element.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `UUID` | Unique identifier of the hovered element |
| `type` | `HoverableType` | Discriminated type: 'enode', 'component', or 'wire' |
| `objectType` | `RenderObjectType` | Three.js object classification (from existing types.ts) |
| `object3D` | `THREE.Object3D` | Reference to the actual Three.js hitbox mesh |

**Relationships**:
- References existing Circuit elements via `id`
- Contains Three.js object reference for visual feedback

**Validation Rules**:
- `id` must be a valid UUID
- `type` must be one of: 'enode', 'component', 'wire'
- `object3D` must not be null when HoveredElement is returned

**State Transitions**:
```
null → HoveredElement  (on hover)
HoveredElement → null  (on unhover to empty)
HoveredElement → HoveredElement (on hover change to different element)
```

---

### 2. HoverableType

Discriminated union of element types that can be hovered.

| Value | Description |
|-------|-------------|
| `'enode'` | Electrical node (pin or branching point) |
| `'component'` | Circuit component (battery, switch, LED, etc.) |
| `'wire'` | Wire connection between nodes |

**Priority Order**: enode (1) > component (2) > wire (3)

---

### 3. MapControlsOptions

Configuration for MapControls behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enablePan` | `boolean` | `true` | Allow click-drag panning |
| `enableZoom` | `boolean` | `true` | Allow scroll wheel zooming |
| `enableRotate` | `boolean` | `true` | Allow right-click rotation |
| `enableDamping` | `boolean` | `true` | Smooth deceleration on release |
| `dampingFactor` | `number` | `0.05` | Damping strength (0-1) |
| `minDistance` | `number` | `1` | Minimum zoom distance |
| `maxDistance` | `number` | `100` | Maximum zoom distance |
| `panSpeed` | `number` | `1.0` | Pan sensitivity multiplier |
| `zoomSpeed` | `number` | `1.0` | Zoom sensitivity multiplier |
| `rotateSpeed` | `number` | `1.0` | Rotation sensitivity multiplier |

**Validation Rules**:
- `dampingFactor` must be in range [0, 1]
- `minDistance` must be positive
- `maxDistance` must be > `minDistance`
- Speed values must be positive

---

### 4. HoverManagerState (Internal)

Internal state managed by HoverManager.

| Field | Type | Description |
|-------|------|-------------|
| `currentlyHovered` | `HoveredElement \| null` | Currently hovered element or null |
| `lastMousePosition` | `{ x: number, y: number }` | Last known normalized mouse position |
| `isEnabled` | `boolean` | Whether hover detection is active |

**State Invariants**:
- If `isEnabled` is false, `currentlyHovered` must be null
- `lastMousePosition` coordinates are normalized to [-1, 1] range

---

### 5. HitboxLayer (Constants)

Layer assignments for Three.js raycasting.

| Constant | Value | Description |
|----------|-------|-------------|
| `LAYER_DEFAULT` | `0` | Default layer for visual rendering |
| `LAYER_ENODE_HITBOX` | `1` | Enode hitboxes (highest priority) |
| `LAYER_COMPONENT_HITBOX` | `2` | Component hitboxes (medium priority) |
| `LAYER_WIRE_HITBOX` | `3` | Wire hitboxes (lowest priority) |

**Note**: Already partially defined in `ComponentVisuals.ts` as `LAYERS` enum.

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  CircuitSceneManager                     │
│  ┌──────────────┐       ┌────────────────┐              │
│  │  MapControls │       │  HoverManager  │              │
│  │  (Three.js)  │       │    (new)       │              │
│  └──────────────┘       └───────┬────────┘              │
│         │                       │                        │
│         │                       ▼                        │
│         │              ┌────────────────┐               │
│         │              │ HoveredElement │               │
│         │              │  or null       │               │
│         │              └───────┬────────┘               │
│         │                      │                        │
│         ▼                      ▼                        │
│  ┌──────────────────────────────────────────┐          │
│  │              THREE.Scene                  │          │
│  │  ┌─────────────────────────────────────┐ │          │
│  │  │  Layer 0: Visual meshes (rendered)  │ │          │
│  │  ├─────────────────────────────────────┤ │          │
│  │  │  Layer 1: Enode hitboxes (invisible)│ │◄─────────┤
│  │  ├─────────────────────────────────────┤ │  Raycast │
│  │  │  Layer 2: Component hitboxes (inv.) │ │  Priority│
│  │  ├─────────────────────────────────────┤ │          │
│  │  │  Layer 3: Wire hitboxes(invisible)  │ │          │
│  │  └─────────────────────────────────────┘ │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

---

## Event Payloads (Existing Types)

The following types are already defined in `types.ts` and will be reused:

```typescript
// Already exists in RenderEventMap
hover: { objectId: UUID; objectType: RenderObjectType };
unhover: { objectId: UUID; objectType: RenderObjectType };
```

**RenderObjectType** (existing, includes hitbox types):
```typescript
type RenderObjectType =
  | 'componentGroup' | 'component' | 'componentHitbox'
  | 'wireGroup' | 'wire' | 'wireHitbox'
  | 'enodeGroup' | 'enode' | 'enodeHitbox';
```

---

## Hitbox UserData Structure

Each hitbox mesh stores identifying information in `userData`:

### Enode Hitbox
```typescript
{
  type: 'enodeHitbox',
  componentId: string,  // Parent component ID
  pinId: string,        // Pin/enode UUID
  label: string         // Human-readable label
}
```

### Component Hitbox
```typescript
{
  type: 'componentHitbox',
  componentId: string   // Component UUID
}
```

### Wire Hitbox (to be implemented)
```typescript
{
  type: 'wireHitbox',
  wireId: string        // Wire UUID
}
```

---

## Notes

- All types use existing `UUID` from `core/types/Identifier.ts`
- HoverManager is stateless between frames except for `currentlyHovered`
- MapControls state is managed internally by Three.js
- No database or persistent storage involved
