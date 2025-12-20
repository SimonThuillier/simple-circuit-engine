# Data Model: Add Component Tool

**Feature**: 009-add-component-tool
**Date**: 2025-12-17

## Entities

### AddComponentTool State

The tool maintains internal state for the placement workflow:

```typescript
interface AddComponentToolState {
  /** Currently selected component type from FactoryRegistry */
  componentType: ComponentType | null;

  /** Current rotation angle in degrees (0, 90, 180, 270) */
  previewRotation: number;

  /** Current grid-snapped preview position */
  previewPosition: THREE.Vector3;

  /** Whether current position overlaps existing components */
  hasOverlap: boolean;

  /** Ghost preview Three.js object (semi-transparent) */
  ghostPreview: THREE.Object3D | null;
}
```

### State Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tool Lifecycle                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Tool Inactive] ──onActivate()──> [Idle - No Type Selected]    │
│         ▲                                   │                    │
│         │                                   │ setComponentType() │
│         │                                   ▼                    │
│         │                          [Ready - Type Selected]       │
│         │                                   │                    │
│         │                                   │ handleGridPositionMove()      │
│         │                                   ▼                    │
│         │                          [Previewing]                  │
│         │                            │     │                     │
│         │              ┌─────────────┴─────┴─────────────┐       │
│         │              │                                 │       │
│         │        hasOverlap=false                 hasOverlap=true│
│         │              │                                 │       │
│         │              ▼                                 ▼       │
│         │        [Valid Position]               [Invalid Position]│
│         │              │                                 │       │
│         │              │ click()                   click()│       │
│         │              ▼                                 │       │
│         │        Place Component                    No Action    │
│         │              │                                 │       │
│         │              └────────────┬────────────────────┘       │
│         │                           │                            │
│         │                           ▼                            │
│         │                    [Previewing]                        │
│         │                           │                            │
│         │                           │ onDeactivate()             │
│         └───────────────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rotation State Machine

```
        scroll up (+90°)
    ┌──────────────────────┐
    │                      │
    ▼                      │
  [0°] ──scroll up──> [90°] ──scroll up──> [180°] ──scroll up──> [270°]
    ▲                                                               │
    │                                                               │
    └───────────────────────scroll up (+90°)────────────────────────┘

    (scroll down reverses direction: -90° each)
```

## Existing Entities Used

### Component (from core/Component.ts)

```typescript
interface Component {
  readonly id: UUID;
  readonly type: ComponentType;
  position: Position;
  rotation: Rotation;
  readonly pins: UUID[];  // ENode IDs for component pins
}
```

### ComponentType (from core/types/ComponentType.ts)

```typescript
enum ComponentType {
  Battery = 'battery',
  Switch = 'switch',
  Lightbulb = 'lightbulb',
  Relay = 'relay',
  Transistor = 'transistor',
  SmallLED = 'smallLED',
  RectangleLED = 'rectangleLED',
  Cube = 'cube',
}
```

### Position & Rotation (from core/types/)

```typescript
class Position {
  readonly x: number;
  readonly y: number;
}

class Rotation {
  readonly degrees: number;  // 0-360
}
```

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     Entity Relationships                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AddComponentTool                                                │
│        │                                                         │
│        │ uses                                                    │
│        ▼                                                         │
│  FactoryRegistry ──────────────> IComponentVisualFactory         │
│        │                                │                        │
│        │ getRegisteredTypes()           │ createVisual()         │
│        │                                ▼                        │
│        ▼                          THREE.Object3D                 │
│  ComponentType[]                   (ghost preview)               │
│                                                                  │
│  CircuitController                                             │
│        │                                                         │
│        │ addComponent()                                          │
│        ▼                                                         │
│  CircuitWriter                                           │
│        │                                                         │
│        │ saveAddComponent()                                      │
│        ▼                                                         │
│  Circuit.addComponent()                                          │
│        │                                                         │
│        │ creates                                                 │
│        ▼                                                         │
│  Component + ENodes (pins)                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Component Placement

| Rule | Validation | Error Response |
|------|------------|----------------|
| Component type must be selected | `componentType !== null` | Show warning, prevent placement |
| Position must be empty | `!hasOverlap` | Red tint + not-allowed cursor, prevent placement |
| Position must be on grid | Auto-snapped | N/A (always valid) |
| Rotation must be valid | `degrees % 90 === 0` | N/A (enforced by scroll handler) |

### Overlap Detection

```typescript
// Pseudo-code for overlap validation
function isValidPlacement(position: Vector3, rotation: number): boolean {
  const previewBox = computeBoundingBox(ghostPreview, position, rotation);

  for (const existingComponent of circuit.components) {
    const componentBox = computeBoundingBox(existingComponent);
    if (previewBox.intersectsBox(componentBox)) {
      return false;  // Overlap detected
    }
  }
  return true;
}
```

## Event Payloads

### Component Added Event

```typescript
// toolOperationCompleted payload for component placement
{
  toolType: 'addComponent',
  operationData: {
    componentId: UUID,
    componentType: ComponentType,
    position: { x: number, y: number },
    rotation: number,
  },
  changedData: {
    addedComponents: [UUID],
    addedENodes: UUID[],  // Pin ENodes created with component
  }
}
```

### Component Deleted Event

```typescript
// toolOperationCompleted payload for component deletion
{
  toolType: 'addComponent',
  operationData: {
    componentId: UUID,
    action: 'delete',
  },
  changedData: {
    removedComponents: [UUID],
    removedENodes: UUID[],
    removedWires: UUID[],  // Wires connected to deleted component's pins
  }
}
```

### Validation Error Event

```typescript
// toolValidationError payload
{
  toolType: 'addComponent',
  errorMessage: 'Cannot place component: position occupied' | 'No component type selected',
}
```
