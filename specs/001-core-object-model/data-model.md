# Data Model: Core Object Model

**Feature**: 001-core-object-model
**Date**: 2025-11-28
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the core entities, their relationships, and state transitions for the circuit object model.

---

## Entity Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        Circuit                          │
│  - components: Map<UUID, Component>                     │
│  - enodes: Map<UUID, ENode>                             │
│  - wires: Map<UUID, Wire>                               │
│                                                          │
│  + addComponent(position, rotation): Component          │
│  + removeComponent(id): void                            │
│  + addWire(node1, node2, positions?): Wire | Error      │
│  + removeWire(id): void                                 │
│  + splitWire(wireId, pos, targetNode): void             │
│  + getComponent(id): Component                          │
│  + getENode(id): ENode                                  │
│  + getWire(id): Wire                                    │
│  + getAllComponents(): Component[]                      │
│  + getAllENodes(): ENode[]                              │
│  + getAllWires(): Wire[]                                │
└────────┬────────────────────────────────┬───────────────┘
         │ manages                        │ manages
         │ 1                              │ 1
         │                                │
         │ *                              │ *
    ┌────▼──────────┐              ┌─────▼─────────┐
    │   Component   │              │     Wire      │
    │  - id: UUID   │              │  - id: UUID   │
    │  - position   │              │  - node1: UUID│
    │  - rotation   │              │  - node2: UUID│
    │  - pins: UUID[]│─────────┐   │  - positions[]│
    │               │         │   │               │
    │  + getPins()  │         │   │  + getNodes() │
    └───────────────┘         │   └───────┬───────┘
                              │           │ connects
                              │           │ 2
                              │           │
                              │ has pin   │
                              │ *         │ *
                        ┌─────▼───────────▼───┐
                        │       ENode         │
                        │  - id: UUID         │
                        │  - type: enum       │
                        │  - component?: UUID │ (if pin)
                        │  - pinIndex?: int   │ (if pin)
                        │  - position?: Pos   │ (if branch)
                        │  - wires: Set<UUID> │
                        │                     │
                        │  + getPosition()    │
                        │  + getWires()       │
                        └─────────────────────┘

Legend:
  1, *, 2 = cardinality
  ─── = association
  ◄── = aggregation/composition
```

---

## Entities

### 1. Circuit

**Purpose**: Foundational container managing all circuit elements with automatic lifecycle.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| components | Map<UUID, Component> | All components in circuit |
| enodes | Map<UUID, ENode> | All electrical nodes (pins + branches) |
| wires | Map<UUID, Wire> | All wires connecting nodes |

**Relationships**:
- Owns all Components (1:many composition)
- Owns all ENodes (1:many composition)
- Owns all Wires (1:many composition)

**Invariants**:
- Every ENode.component (if pin) references existing Component
- Every Wire.node1/node2 references existing ENode
- Every ENode.wires references existing Wire
- No orphaned branching ENodes (all connected to at least one wire)
- Bidirectional consistency: Wire → ENode and ENode → Wire agree

**State Transitions**: None (Circuit is always valid)

---

### 2. Component

**Purpose**: Base class for electrical components placed on the circuit.

**Fields**:
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Unique identifier | Immutable, non-null |
| position | Position | Location on 2D grid | Integer x, y |
| rotation | Rotation | Orientation angle | Integer degrees |
| pins | UUID[] | Pin ENode IDs | Immutable array, 0+ elements |

**Relationships**:
- Owned by Circuit (many:1 composition)
- Has pin ENodes (1:many aggregation)

**Invariants**:
- All pins[i] reference existing ENodes with type=Pin
- Each pin ENode references this component
- Position coordinates are integers
- Rotation angle is integer

**State Transitions**:
```
[Created] ──addComponent()──> [Active in Circuit]
                                      │
                            removeComponent()
                                      │
                                      ▼
                              [Deleted + Cascade]
                              (pins + wires removed)
```

**Validation Rules**:
- Position must have integer coordinates
- Rotation must be integer angle
- Pins array length typically <50 (per assumptions)

---

### 3. ENode (Electrical Node)

**Purpose**: Atomic electrical connection point (component pin or wire branch).

**Fields**:
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Unique identifier | Immutable, non-null |
| type | ENodeType | Pin or BranchingPoint | Immutable enum |
| component | UUID? | Parent component (if pin) | Null for branches |
| pinIndex | number? | Pin index (if pin) | Null for branches, >=0 |
| position | Position? | Grid location (if branch) | Null for pins, integers |
| wires | Set<UUID> | Connected wire IDs | Mutable set |

**Relationships**:
- Owned by Circuit (many:1 composition)
- Belongs to Component if type=Pin (many:1 aggregation)
- Connected to Wires (many:many via Set)

**Invariants**:
- If type=Pin: component and pinIndex are non-null, position is null
- If type=BranchingPoint: position is non-null, component and pinIndex are null
- All wires in Set reference existing Wires
- Branching points with empty wires Set are orphaned (automatically removed)

**State Transitions**:
```
[Pin Node]
  Created automatically when component added
  Deleted automatically when component removed

[Branching Point Node]
  Created automatically when wire split (FR-024, FR-028)
  Deleted automatically when last wire removed (FR-035, FR-036)
```

**Validation Rules**:
- Position (if present) must have integer coordinates
- pinIndex (if present) must be non-negative
- wires Set cannot contain self-reference

**Methods**:
- `getPosition(circuit)`: Returns position (derived from component for pins, direct for branches)
- `getWires()`: Returns array of connected Wire objects

---

### 4. Wire

**Purpose**: Electrical connection between exactly two ENodes.

**Fields**:
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Unique identifier | Immutable, non-null |
| node1 | UUID | First connected node | Immutable, non-null |
| node2 | UUID | Second connected node | Immutable, non-null |
| intermediatePositions | Position[] | Rendering path points | Immutable array, 0+ elements |

**Relationships**:
- Owned by Circuit (many:1 composition)
- Connects to exactly 2 ENodes (many:2)

**Invariants**:
- node1 !== node2 (no self-connections)
- node1 and node2 reference existing ENodes
- No duplicate wires between same two nodes (regardless of order)
- All intermediatePositions have integer coordinates

**State Transitions**:
```
[Created] ──addWire()──> [Active in Circuit]
                                 │
                      removeWire()│  splitWire()
                                 │  │
                                 ▼  ▼
                          [Deleted] [Replaced by 2+ wires]
                          (orphan    (original wire deleted,
                           cleanup)   new wires + branch created)
```

**Validation Rules**:
- Cannot connect node to itself (FR-030)
- Cannot duplicate existing wire (FR-031)
- Both nodes must exist (FR-027)
- Intermediate positions (if any) must have integer coordinates

**Methods**:
- `getNodes()`: Returns [node1, node2] as ENode objects
- `isStraightLine()`: Returns true if intermediatePositions is empty

---

## Type Definitions

### Position

```typescript
export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError('Position coordinates must be integers');
    }
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
```

### Rotation

```typescript
export class Rotation {
  constructor(public readonly angle: number) {
    if (!Number.isInteger(angle)) {
      throw new TypeError('Rotation angle must be an integer');
    }
  }

  toJSON(): number {
    return this.angle;
  }
}
```

### ENodeType

```typescript
export enum ENodeType {
  Pin = 'Pin',                  // Component pin
  BranchingPoint = 'BranchingPoint'  // Wire junction
}
```

### UUID

```typescript
export type UUID = string; // RFC 4122 UUID v4

export function generateUUID(): UUID {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Node.js
  const { v4 } = require('uuid');
  return v4();
}
```

---

## Lifecycle Rules

### Component Lifecycle

1. **Creation** (FR-015):
   ```
   Circuit.addComponent(position, rotation, pinCount)
   → Create Component with UUID
   → Create pinCount Pin ENodes
   → Link Component ← → ENodes bidirectionally
   → Add to circuit.components and circuit.enodes
   ```

2. **Deletion** (FR-016 - Cascade):
   ```
   Circuit.removeComponent(id)
   → Get all pin ENodes for component
   → For each pin ENode:
       → Get all connected Wires
       → Remove each Wire (triggers orphan cleanup)
       → Remove ENode
   → Remove Component
   ```

### Wire Lifecycle

1. **Creation** (FR-027):
   ```
   Circuit.addWire(node1, node2, positions?)
   → Validate: nodes exist, not self-connection, no duplicate
   → Create Wire with UUID
   → Add Wire to both ENode.wires Sets
   → Add to circuit.wires
   ```

2. **Deletion** (FR-031, FR-035, FR-036):
   ```
   Circuit.removeWire(id)
   → Get Wire
   → Remove Wire from both ENode.wires Sets
   → Remove Wire from circuit.wires
   → For each connected ENode:
       → If type=BranchingPoint AND wires.size=0:
           → Remove orphaned ENode
   ```

3. **Splitting** (FR-024, FR-025, FR-028, FR-029):
   ```
   Circuit.splitWire(wireId, position, targetENodeId)
   → Get original Wire (start → end)
   → Create branching ENode at position
   → Create Wire1 (start → branch)
   → Create Wire2 (branch → end)
   → Create Wire3 (branch → target)
   → Remove original Wire
   → Add 3 new wires
   → Update all bidirectional references
   ```

---

## Validation Matrix

| Operation | Validates | Error Condition | Error Message |
|-----------|-----------|-----------------|---------------|
| addComponent | position, rotation | Non-integer coordinates | "Position coordinates must be integers" |
| addWire | node existence | Node(s) not found | "Wire requires at least one existing ENode" |
| addWire | self-connection | node1 === node2 | "Cannot create wire connecting node to itself" |
| addWire | duplicate | Wire already exists | "Duplicate wire between same nodes" |
| removeComponent | existence | Component not found | "Component does not exist" |
| removeWire | existence | Wire not found | "Wire does not exist" |
| splitWire | wire existence | Wire not found | "Wire does not exist" |
| splitWire | target existence | Target ENode not found | "Target ENode does not exist" |

---

## JSON Serialization Format

### Circuit

```json
{
  "components": [
    {
      "id": "uuid-1",
      "position": { "x": 10, "y": 20 },
      "rotation": 90,
      "pins": ["uuid-pin1", "uuid-pin2"]
    }
  ],
  "enodes": [
    {
      "id": "uuid-pin1",
      "type": "Pin",
      "component": "uuid-1",
      "pinIndex": 0
    },
    {
      "id": "uuid-branch1",
      "type": "BranchingPoint",
      "position": { "x": 15, "y": 25 }
    }
  ],
  "wires": [
    {
      "id": "uuid-wire1",
      "node1": "uuid-pin1",
      "node2": "uuid-branch1",
      "intermediatePositions": [
        { "x": 12, "y": 22 },
        { "x": 14, "y": 24 }
      ]
    }
  ]
}
```

---

## Performance Characteristics

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| Add Component | O(p) | O(p) | p = pin count |
| Remove Component | O(p + w) | O(p + w) | p = pins, w = connected wires |
| Add Wire | O(1) | O(1) | Constant time map operations |
| Remove Wire | O(1) | O(1) | Includes orphan check |
| Split Wire | O(1) | O(1) | Creates 3 wires + 1 ENode |
| Get Component | O(1) | - | Map lookup |
| Get Wires by ENode | O(1) | - | Set lookup |
| Enumerate all | O(n) | O(n) | n = entity count |

**Meets SC-002**: All relationship queries are O(1) or near-constant time.
**Meets SC-003**: 1000 ENode + 1000 Wire circuit: ~2000 map lookups < 100ms.
