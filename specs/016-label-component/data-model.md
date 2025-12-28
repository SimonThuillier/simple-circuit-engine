# Data Model: Label Component

**Feature**: 016-label-component
**Date**: 2025-12-28

## Entities

### Label Component

The Label component extends the existing `Component` entity with specific configuration for text display.

#### Core Entity (extends Component)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | UUID | Unique identifier | Generated, immutable |
| type | ComponentType | `ComponentType.Label` | Literal `'label'` |
| position | Position | Grid position (x, y) | Integer coordinates |
| rotation | Rotation | Angle in degrees | 0, 90, 180, 270 |
| pins | UUID[] | Empty array | Always `[]` (no pins) |
| config | Map<string, string> | Configuration values | See below |

#### Configuration Properties

| Key | Type | Default | Constraints | Description |
|-----|------|---------|-------------|-------------|
| `text` | string | `"Label"` | Max 64 characters | Display text content |
| `size` | string | `"1"` | `"1"`, `"2"`, `"3"`, `"4"` | Scale multiplier |

### ComponentType Metadata

Extension to `COMPONENT_TYPE_METADATA` in `src/core/types/ComponentType.ts`:

```typescript
[ComponentType.Label]: {
  id: 'label',
  name: 'Label',
  pins: new Map([]),  // No pins - decorative only
  config: new Map([
    ['text', 'Label'],
    ['size', '1']
  ]),
}
```

## State Transitions

Label components are **stateless** in the simulation context. They do not participate in circuit simulation and have no state machine.

| State | Description |
|-------|-------------|
| N/A | Labels are purely visual; no simulation state |

## Validation Rules

### Text Property
- **V-001**: Text length MUST be ≤ 64 characters
- **V-002**: Empty text MUST be replaced with default `"Label"`
- **V-003**: Text MAY contain alphanumeric, punctuation, and whitespace characters

### Size Property
- **V-004**: Size MUST be one of: `"1"`, `"2"`, `"3"`, `"4"`
- **V-005**: Invalid size values MUST default to `"1"`

### Component Invariants
- **V-006**: Label component MUST have zero pins (`pins.length === 0`)
- **V-007**: Label component MUST NOT participate in circuit simulation

## Relationships

```
Circuit 1───* Component
                 ▲
                 │
            Label Component (type='label')
                 │
                 └── config: {text, size}
```

The Label component has no relationships with:
- ENodes (no pins)
- Wires (cannot connect)
- Simulation states (purely decorative)

## JSON Serialization

Labels serialize/deserialize using the existing Component JSON format:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "label",
  "position": { "x": 10, "y": 20 },
  "rotation": 0,
  "pins": [],
  "config": {
    "text": "Power Supply Section",
    "size": "2"
  }
}
```

## Integration Points

### Circuit Model
- Added via `Circuit.addComponent()` with `ComponentType.Label`
- Removed via `Circuit.removeComponent()` (standard cascade behavior, but no pins/wires to clean up)

### Visual Factory Registry
- Registered: `registry.register(ComponentType.Label, new LabelVisualFactory())`
- Creates Three.js mesh with CanvasTexture text rendering

### Config Panel (lil-gui)
- Form definition provided by `LabelVisualFactory.getConfigFormDefinition()`
- Fields: text (text input), size (number selector 1-4)
