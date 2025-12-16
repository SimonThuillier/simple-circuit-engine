# Data Model: Wire Tool & Branching Point Visual

**Feature**: 008-wire-tool-branching
**Date**: 2025-12-15

## Entity Overview

This feature primarily uses existing entities from `core/`. The data model is already complete - this document describes how existing entities support the feature requirements.

---

## Existing Entities (No Changes Required)

### ENode

**Location**: `src/core/ENode.ts`

```typescript
class ENode {
  readonly id: UUID;
  readonly type: ENodeType;           // Pin | BranchingPoint
  readonly component: UUID | undefined; // Only for Pin type
  readonly pinLabel: string | undefined; // Only for Pin type
  readonly position: Position | undefined; // Only for BranchingPoint type
  readonly wires: Set<UUID>;
  source: ENodeSourceType | undefined;  // null | 'voltage' | 'current'

  getPosition(circuit: Circuit): Position;
  toJSON(): object;
  static fromJSON(json: object): ENode;
}
```

**Relationships**:
- BranchingPoint ENode → many Wires (via `wires` set)
- Pin ENode → one Component (via `component` UUID)

**State Transitions** (for BranchingPoint):
```
Created (sourceType: null)
    → [double-click] → sourceType: 'voltage'
    → [double-click] → sourceType: 'current'
    → [double-click] → sourceType: null
```

**Validation Rules**:
- BranchingPoint must have `position` defined
- BranchingPoint must have `component` undefined
- sourceType cycles: null → voltage → current → null

---

### Wire

**Location**: `src/core/Wire.ts`

```typescript
class Wire {
  readonly id: UUID;
  readonly node1: UUID;  // First ENode
  readonly node2: UUID;  // Second ENode
  readonly intermediatePositions: ReadonlyArray<Position>;

  isStraightLine(): boolean;
  toJSON(): object;
  static fromJSON(json: object): Wire;
}
```

**Relationships**:
- Wire → exactly 2 ENodes (node1, node2)
- ENode → many Wires (bidirectional via ENode.wires set)

**Validation Rules**:
- node1 and node2 must be different (no self-loops)
- No duplicate wires between same two endpoints
- intermediatePositions must be valid grid positions

---

### Position

**Location**: `src/core/types/Position.ts`

```typescript
class Position {
  readonly x: number;  // Grid X coordinate
  readonly y: number;  // Grid Y coordinate (maps to Z in 3D)

  toJSON(): { x: number; y: number };
  static fromJSON(json: { x: number; y: number }): Position;
}
```

**Usage**:
- BranchingPoint.position - Grid location of branching point
- Wire.intermediatePositions - Waypoints for wire routing

---

### ENodeType

**Location**: `src/core/types/ENodeType.ts`

```typescript
enum ENodeType {
  Pin = 'Pin',
  BranchingPoint = 'BranchingPoint'
}
```

---

### ENodeSourceType

**Location**: `src/core/types/ENodeSourceType.ts`

```typescript
type ENodeSourceType = 'voltage' | 'current';
```

---

## Circuit Class Extensions

**Location**: `src/core/Circuit.ts`

The Circuit class needs new methods to support WireTool operations:

### New Methods Required

```typescript
class Circuit {
  // Existing methods...

  /**
   * Create a branching point ENode at the specified grid position.
   * @param position - Grid position for the branching point
   * @param sourceType - Optional source type (voltage/current)
   * @returns The created ENode
   */
  addBranchingPoint(position: Position, sourceType?: ENodeSourceType): ENode;

  /**
   * Split an existing wire at a position, creating a branching point.
   * The original wire is removed and replaced with two new wires
   * connecting through the new branching point.
   *
   * @param wireId - Wire to split
   * @param position - Position for the new branching point
   * @returns Object containing the new branching point and two wires
   */
  splitWire(wireId: UUID, position: Position): {
    branchingPoint: ENode;
    wire1: Wire;
    wire2: Wire;
  };

  /**
   * Update the intermediate positions of a wire.
   * Creates a new Wire instance (immutability) and updates references.
   *
   * @param wireId - Wire to update
   * @param intermediatePositions - New intermediate positions
   * @returns The updated Wire
   */
  updateWireIntermediatePositions(
    wireId: UUID,
    intermediatePositions: Position[]
  ): Wire;

  /**
   * Update the source type of an ENode (branching point).
   * @param enodeId - ENode to update
   * @param sourceType - New source type (null to clear)
   */
  updateENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void;

  /**
   * Remove a branching point and optionally merge connected wires.
   * If the branching point connects exactly 2 wires, they can be merged.
   * @param enodeId - Branching point to remove
   */
  removeBranchingPoint(enodeId: UUID): void;
}
```

---

## Visual State (Scene Layer)

These are runtime-only states, not persisted in the model.

### WireTool State

```typescript
type WireToolMode = 'idle' | 'wire_creating' | 'wire_dragging' | 'bp_dragging';

interface WireCreatingState {
  sourceEnodeId: UUID;
  sourcePosition: THREE.Vector3;
  previewWire: Line2 | null;
  ts: number; // Timestamp for double-click detection
}

interface WireDragState {
  wireId: UUID;
  pointIndex: number; // Index in intermediatePositions array
  initialPosition: THREE.Vector3;
  originalPositions: { x: number; y: number }[]; // For cancellation
  targetType: 'intermediate' | 'new_intermediate'; // Drag target type
}

interface BPDragState {
  enodeId: UUID; // Branching point being dragged
  initialPosition: THREE.Vector3; // For cancellation
}
```

### WireTool Operations

The WireTool supports three main categories of operations:

#### 1. Wire Creation
- **Single-click on enode**: Start wire creation from source enode
- **Single-click on another enode**: Complete wire to target enode
- **Single-click on wire**: Create branching point on wire and complete wire connection
- **Single-click on empty space**: Create standalone branching point and complete wire
- **Escape key**: Cancel wire creation

#### 2. Wire Dragging (Intermediate Points)
- **Single-click on wire**: Start dragging (creates new intermediate point or drags existing)
- **Drag to new position**: Update intermediate positions in real-time
- **Release**: Commit changes (with auto-merge/delete if point is near endpoint/other point)
- **Escape key**: Cancel drag and revert to original positions

#### 3. Branching Point Dragging
- **Double-click-hold on branching point**: Start dragging branching point
- **Drag to new position**: Move branching point and all connected wires
- **Release**: Commit changes (simplifies connected wire paths)
- **Escape key**: Cancel drag and revert to original position

#### 4. Creation Operations
- **Double-click on wire**: Create branching point, splitting wire into two
- **Double-click on empty space**: Create standalone branching point

#### 5. Deletion Operations
- **Delete/Backspace key with wire selected**: Remove wire from circuit
- **Delete/Backspace key with branching point selected**: Remove branching point and connected wires

### Visual Factory State

```typescript
// BranchingPoint visual colors (not persisted)
const BRANCHING_POINT_COLORS = {
  idle: {
    null: 0xffffff,      // white - no source
    voltage: 0xff0000,   // red - voltage source
    current: 0x0000ff    // blue - current source
  },
  hoverEmissive: 0x222222,    // Added to base color on hover
  selectedEmissive: 0x444444  // Added to base color on selection
};
```

---

## Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│    Component    │         │     Circuit     │
│─────────────────│         │─────────────────│
│ id: UUID        │◄────────│ components      │
│ position        │         │ enodes          │
│ rotation        │         │ wires           │
│ pinCount        │         │                 │
│ pins: UUID[]    │         │ addWire()       │
└────────┬────────┘         │ addBranchingPt()│
         │                  │ splitWire()     │
         │ pins             │ updateWire...() │
         ▼                  └─────────────────┘
┌─────────────────┐
│      ENode      │
│─────────────────│
│ id: UUID        │
│ type: Pin|BP    │──────────────────────────┐
│ component?: UUID│                          │
│ position?: Pos  │◄────────────────────┐    │
│ source?: Type   │                     │    │
│ wires: Set<UUID>│                     │    │
└────────┬────────┘                     │    │
         │                              │    │
         │ wires                        │    │
         ▼                              │    │
┌─────────────────┐                     │    │
│      Wire       │                     │    │
│─────────────────│                     │    │
│ id: UUID        │                     │    │
│ node1: UUID     │─────────────────────┘    │
│ node2: UUID     │──────────────────────────┘
│ intermediate    │
│   Positions[]   │──────┐
└─────────────────┘      │
                         │
                         ▼
                ┌─────────────────┐
                │    Position     │
                │─────────────────│
                │ x: number       │
                │ y: number       │
                └─────────────────┘
```

---

## JSON Schema (Persistence)

Existing schemas support all feature requirements:

### ENode JSON (BranchingPoint)

```json
{
  "id": "uuid-string",
  "type": "BranchingPoint",
  "position": { "x": 10, "y": 15 },
  "source": "voltage"
}
```

### Wire JSON

```json
{
  "id": "uuid-string",
  "node1": "enode-uuid-1",
  "node2": "enode-uuid-2",
  "intermediatePositions": [
    { "x": 5, "y": 10 },
    { "x": 8, "y": 12 }
  ]
}
```

---

## Migration Notes

No migration required. Existing circuits without branching points will work unchanged. New circuits can include branching points using the existing JSON schema.
