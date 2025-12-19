# Data Model: Ctrl+Click Source Type Cycling

**Feature**: 012-ctrl-click-source-cycle
**Date**: 2025-12-19

## Entities

### ENodeSourceType (Existing - No Changes)

```typescript
// src/core/types/ENodeSourceType.ts
export enum ENodeSourceType {
  Voltage = 'Voltage',
  Current = 'Current',
}
```

**States**:
| Value | Visual Color | Description |
|-------|--------------|-------------|
| `undefined` | White (0xffffff) | No source designation |
| `Voltage` | Red (0xff0000) | Voltage source point |
| `Current` | Blue (0x0000ff) | Current source point |

### ENode (Existing - No Changes)

```typescript
// src/core/ENode.ts (relevant fields only)
class ENode {
  readonly id: UUID;
  readonly type: ENodeType;  // Pin | BranchingPoint
  source: ENodeSourceType | undefined;  // Mutable

  // Existing methods
  setSourceType(sourceType?: ENodeSourceType | undefined): void;
}
```

**Relationships**:
- ENode → Component (optional, for Pin type)
- ENode → Wire[] (connected wires)

### SourceType Cycle State Machine

```
┌──────────────────────────────────────────────────────────────┐
│                    SourceType Cycle                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐    Ctrl+click    ┌─────────────┐          │
│   │  undefined  │ ───────────────► │   Voltage   │          │
│   │   (white)   │                  │    (red)    │          │
│   └─────────────┘                  └─────────────┘          │
│         ▲                                │                   │
│         │                                │ Ctrl+click        │
│         │ Ctrl+click                     ▼                   │
│         │                          ┌─────────────┐          │
│         └────────────────────────  │   Current   │          │
│                                    │   (blue)    │          │
│                                    └─────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Transitions**:
| Current State | Trigger | Next State |
|---------------|---------|------------|
| `undefined` | Ctrl+click | `Voltage` |
| `Voltage` | Ctrl+click | `Current` |
| `Current` | Ctrl+click | `undefined` |

## Validation Rules

### Pre-conditions for SourceType Cycling

| Rule | Description | Error Handling |
|------|-------------|----------------|
| V1 | Target must be an ENode (branching point or pin) | Silently ignored |
| V2 | Ctrl key must be held during click | Normal click behavior |
| V3 | BuildTool mode must be `idle` | Silently ignored |
| V4 | Not during active wire creation | Silently ignored |
| V5 | Left mouse button only | Silently ignored |

### Post-conditions

| Rule | Description |
|------|-------------|
| P1 | `enode.source` updated to next cycle state |
| P2 | Visual color updated immediately |
| P3 | `enodeSourceTypeChanged` event emitted |
| P4 | Model persisted via CircuitEditionManager |

## Event Contracts

### enodeSourceTypeChanged (Existing - No Changes)

```typescript
// src/scene/shared/types.ts
interface SceneManagerEventMap {
  enodeSourceTypeChanged: {
    enodeId: UUID;
    sourceType: string | null;  // 'Voltage' | 'Current' | null
  };
}
```

**Emitted by**: `CircuitEditionManager.saveENodeSourceTypeAction()`
**Consumers**: External listeners (undo/redo, UI updates)

## Color Mapping (Existing Constants)

### BranchingPointVisualFactory.COLORS

```typescript
// src/scene/shared/components/BranchingPointVisualFactory.ts
private static readonly COLORS = {
  null: 0xffffff,    // white
  Voltage: 0xff0000, // red
  Current: 0x0000ff, // blue
};
```

### ComponentVisualFactory (New Constant)

```typescript
// src/scene/shared/components/ComponentVisualFactory.ts (to be added)
protected static readonly SOURCE_TYPE_COLORS = {
  null: 0xffffff,    // white
  Voltage: 0xff0000, // red
  Current: 0x0000ff, // blue
};

// Default pin color when no sourceType
protected static readonly DEFAULT_PIN_COLOR = 0xb87333; // bronze
```

**Note**: When `sourceType` is `null/undefined`, pins should use `DEFAULT_PIN_COLOR` (bronze) rather than white to maintain visual distinction between pins and branching points.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Ctrl+Click Data Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User Ctrl+clicks on enode                                          │
│     │                                                                   │
│     ▼                                                                   │
│  2. BuildTool.handlePointerDown()                                      │
│     ├── Check: event.ctrlKey === true                                  │
│     ├── Check: mode === 'idle'                                         │
│     └── Get: hoveredEnodeId from HoverManager                          │
│         │                                                               │
│         ▼                                                               │
│  3. getNextSourceType(currentSourceType)                               │
│     └── Returns: next ENodeSourceType | undefined                      │
│         │                                                               │
│         ▼                                                               │
│  4. CircuitEditionManager.saveENodeSourceTypeAction(enodeId, newType)  │
│     ├── circuit.updateENodeSourceType(enodeId, newType)                │
│     └── emit('enodeSourceTypeChanged', { enodeId, sourceType })        │
│         │                                                               │
│         ▼                                                               │
│  5. Update Visual                                                       │
│     ├── BranchingPoint: BranchingPointVisualFactory.updateSourceType() │
│     └── Pin: ComponentVisualFactory.updatePinSourceType()              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
