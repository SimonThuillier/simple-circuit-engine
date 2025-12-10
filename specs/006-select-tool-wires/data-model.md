# Data Model: Select Tool & Wire Visual Improvements

**Feature**: 006-select-tool-wires
**Date**: 2025-12-09

## Overview

This feature primarily operates at the scene/visualization layer, not the core data model. The core `Circuit`, `Component`, `Wire`, and `ENode` classes already support all required data. This document focuses on the new state and structures needed in the scene module.

## Existing Core Entities (No Changes Required)

### Component (src/core/Component.ts)
Already supports:
- `position: Position` - mutable, can be updated via `setPosition()`
- `rotation: Rotation` - mutable, can be updated via `setRotation()`
- `pins: ReadonlyArray<UUID>` - references to ENode IDs

### Wire (src/core/Wire.ts)
Already supports:
- `node1: UUID` - first endpoint ENode
- `node2: UUID` - second endpoint ENode
- `intermediatePositions: ReadonlyArray<Position>` - waypoints for routing

### ENode (src/core/ENode.ts)
Already supports:
- `getPosition(circuit: Circuit): Position` - derives position from parent component for pins
- `type: ENodeType` - Pin or BranchingPoint
- `wires: Set<UUID>` - connected wire IDs

### Position (src/core/types/Position.ts)
- `x: number` - integer grid coordinate
- `y: number` - integer grid coordinate (maps to -z in 3D)

### Rotation (src/core/types/Rotation.ts)
- `value: number` - integer degrees (0, 90, 180, 270)

## New Scene Layer Entities

### SelectionState

Represents the current selection in the scene.

```typescript
interface SelectionState {
  /** Currently selected component ID, or null if nothing selected */
  selectedComponentId: UUID | null;

  /** Timestamp of selection for potential future use (e.g., double-click detection) */
  selectedAt: number | null;
}
```

**Lifecycle**:
- Initial: `{ selectedComponentId: null, selectedAt: null }`
- On select: `{ selectedComponentId: <uuid>, selectedAt: Date.now() }`
- On deselect: `{ selectedComponentId: null, selectedAt: null }`

### DragState

Represents an active drag operation.

```typescript
interface DragState {
  /** Whether a drag is currently in progress */
  isDragging: boolean;

  /** Component being dragged */
  componentId: UUID | null;

  /** Starting grid position before drag began */
  startPosition: Position | null;

  /** Current preview position during drag (may not be snapped) */
  currentWorldPosition: { x: number; z: number } | null;

  /** Snapped grid position for preview/commit */
  snappedPosition: Position | null;
}
```

**Lifecycle**:
- Initial: `{ isDragging: false, componentId: null, ... }`
- On drag start: Populate all fields from selected component
- On drag move: Update currentWorldPosition and snappedPosition
- On drag end: Commit snappedPosition to component, reset to initial
- On drag cancel: Reset to initial without committing

### WirePath

Represents the complete visual path for a wire.

```typescript
interface WirePath {
  /** Wire ID */
  wireId: UUID;

  /** World coordinates for rendering (in Three.js space) */
  points: THREE.Vector3[];
}
```

**Derivation**:
```typescript
function computeWirePath(wire: Wire, circuit: Circuit): WirePath {
  const node1 = circuit.getENode(wire.node1);
  const node2 = circuit.getENode(wire.node2);

  const startPos = node1.getPosition(circuit);
  const endPos = node2.getPosition(circuit);

  const points = [
    new THREE.Vector3(startPos.x, 0, -startPos.y),
    ...wire.intermediatePositions.map(p => new THREE.Vector3(p.x, 0, -p.y)),
    new THREE.Vector3(endPos.x, 0, -endPos.y)
  ];

  return { wireId: wire.id, points };
}
```

### PinWorldPosition

Lookup structure for pin positions in world space.

```typescript
interface PinWorldPosition {
  /** ENode (pin) ID */
  pinId: UUID;

  /** Parent component ID */
  componentId: UUID;

  /** World position from visual hierarchy */
  worldPosition: THREE.Vector3;
}
```

**Derivation**: Read from Three.js Object3D hierarchy via `pinGroup.getWorldPosition(target)`

## State Transitions

### Selection State Machine

```
[Nothing Selected]
    │
    ├── click component ──────► [Component Selected]
    │                               │
    │                               ├── click empty space ──► [Nothing Selected]
    │                               ├── press Escape ────────► [Nothing Selected]
    │                               ├── click other component ► [Component Selected] (different)
    │                               └── start drag ──────────► [Dragging]
    │
    └── click empty space ────► [Nothing Selected] (no change)

[Dragging]
    │
    ├── release mouse ───► [Component Selected] (position committed)
    └── press Escape ────► [Component Selected] (position reverted)
```

### Drag State Machine

```
[Idle]
    │
    └── mousedown on selected component ──► [Drag Started]
                                                │
                                                └── mousemove ──► [Dragging]
                                                                    │
                                                                    ├── mousemove ──► [Dragging] (update position)
                                                                    ├── mouseup ────► [Idle] (commit)
                                                                    └── Escape ─────► [Idle] (cancel)
```

## Visual State Management

### Component Visual States

Each component can be in one of these visual states:

| State | Emissive Color | Intensity | Trigger |
|-------|---------------|-----------|---------|
| Normal | none (original) | original | default |
| Hovered | Blue (#4488ff) | 0.6 | mouse over |
| Selected | Orange (#ff8800) | 0.8 | click to select |
| Selected + Hovered | Orange (#ff8800) | 0.8 | selected and mouse over |

**Priority**: Selected > Hovered > Normal

When a component is both selected and hovered, selection visual takes precedence.

### Wire Visual States

| State | Color | Notes |
|-------|-------|-------|
| Normal | White (#ffffff) | Default rendering |
| Connected to selected | White (#ffffff) | Updates position dynamically during drag |

Wire hover/selection is out of scope for this feature.

## Relationships

```
Circuit (1) ─────────► Component (*)
    │                      │
    │                      └── pins ──► ENode (*)
    │                                      │
    └───────────────────────────────────── wires ──► Wire (*)
                                              │
                                              └── intermediatePositions ──► Position (*)

SelectionState ─── references ──► Component (0..1)
DragState ─── references ──► Component (0..1)
WirePath ─── derived from ──► Wire + ENode positions
```

## Validation Rules

1. **Selection**: Only one component can be selected at a time
2. **Drag**: Can only drag a selected component
3. **Position**: Components snap to integer grid positions (x, y both integers)
4. **Rotation**: Only 0, 90, 180, 270 degrees allowed (enforced by Rotation type)
5. **Wire endpoints**: Must reference valid ENode IDs in the circuit
