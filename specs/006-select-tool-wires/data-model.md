# Data Model: Position Tool & Wire Visual Improvements

**Feature**: 006-position-tool-wires
**Date**: 2025-12-09
**Updated**: 2025-12-11

## Overview

This feature primarily operates at the scene/visualization layer, not the core data model. The core `Circuit`, `Component`, `Wire`, and `ENode` classes already support all required data. This document focuses on the new state and structures needed in the scene module.

**Key Architecture**: Selection behavior is centralized in CircuitSceneManager (via SelectionManager), while the PositionTool handles drag/move operations on selected elements.

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

### HoverableType

Defines the types of circuit elements that can be hovered or selected.

```typescript
type HoverableType = 'enode' | 'component' | 'wire';
```

### SelectionData (Discriminated Union)

Represents the current selection in the scene. Supports both single and multi-selection patterns.

```typescript
/** Represents the Selection of one Hoverable Element of the scene */
interface MonoSelectionData {
  kind: 'mono';
  type: HoverableType;
  id: UUID;
  data?: string | null; // optional extra data
}

/** Represents the Selection of multiple Hoverable Elements of the scene */
interface MultiSelectionData {
  kind: 'multi';
  components?: Map<UUID, string | null>;
  enodes?: Map<UUID, string | null>;
  wires?: Map<UUID, string | null>;
}

type SelectionData = MonoSelectionData | MultiSelectionData;
```

**Note**: Multi-selection (`MultiSelectionData`) is prepared for future implementation but not actively used in this feature.

**Lifecycle** (managed by SelectionManager):
- Initial: `null` (nothing selected)
- On selectOne(): `{ kind: 'mono', type: <type>, id: <uuid>, data: null }`
- On deselect(): `null`

### DragState

Represents an active drag operation in PositionTool.

```typescript
interface DragState {
  /** The current selection being dragged */
  selection: SelectionData;

  /** Map of object IDs to their type and starting position */
  positionsAtStart: Map<UUID, { type: HoverableType; position: THREE.Vector3 }>;

  /** Cursor position when drag started (grid-snapped) */
  startPosition: THREE.Vector3;

  /** Current cursor position during drag (grid-snapped) */
  currentPosition: THREE.Vector3;
}
```

**Lifecycle**:
- Initial: `null` (no drag in progress)
- On pointerdown with selection: Populate from current selection and cursor position
- On gridPositionMove: Update currentPosition, move objects by delta
- On pointerup: Commit positions to circuit model, reset to null
- On Escape: Restore objects to positionsAtStart, reset to null

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
  cursorGroundPlanePosition: THREE.Vector3;
}
```

**Derivation**: Read from Three.js Object3D hierarchy via `pinGroup.getWorldPosition(target)`

## State Transitions

### Selection State Machine (CircuitSceneManager)

```
[Nothing Selected]
    │
    ├── click on element ─────► [Element Selected]
    │                               │
    │                               ├── click empty space ──► [Nothing Selected]
    │                               ├── click other element ► [Element Selected] (different)
    │                               └── start drag ──────────► [Dragging] (selection preserved)
    │
    └── click empty space ────► [Nothing Selected] (no change)

[Dragging] (PositionTool active)
    │
    ├── release mouse ───► [Element Selected] (position committed)
    └── press Escape ────► [Element Selected] (position reverted, selection preserved)
```

**Note**: Selection is managed by CircuitSceneManager.handlePointerDown(), not by individual tools. The PositionTool only handles drag operations on already-selected elements.

### Drag State Machine (PositionTool)

```
[Idle] (dragState = null)
    │
    └── pointerdown with selection ──► [Dragging]
                                           │
                                           ├── gridPositionMove ──► [Dragging] (update positions)
                                           ├── pointerup ──────────► [Idle] (commit to model)
                                           └── Escape ─────────────► [Idle] (restore original)
```

## Visual State Management

### Component Visual States

Each component can be in one of these visual states:

| State | Emissive Color | Intensity | Trigger |
|-------|---------------|-----------|---------|
| Normal | none (original) | original | default |
| Hovered | Blue (#4488ff) | 0.6 | mouse over |
| Selected | Orange (#ff8800) | 0.8 | click to position |
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
