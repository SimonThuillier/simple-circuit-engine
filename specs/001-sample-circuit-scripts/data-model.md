# Data Model: Sample Circuit Generation Scripts

**Feature**: Sample Circuit Generation Scripts
**Branch**: `001-sample-circuit-scripts`
**Date**: 2025-11-29

## Overview

This feature uses existing data models from the `core/` module. No new entities are introduced. This document describes how existing entities are used and the structure of generated output files.

## Existing Entities (Used by Scripts)

### Circuit

**Source**: `src/core/Circuit.ts`

**Description**: Main container managing all circuit elements with automatic lifecycle. Provides the primary API for creating and manipulating circuit topology.

**Key Attributes**:
- `metadata: CircuitMetadata` - Circuit metadata (name, size, divisions, camera position)
- `components: Map<UUID, Component>` - All components in the circuit
- `enodes: Map<UUID, ENode>` - All electrical nodes (pins and branching points)
- `wires: Map<UUID, Wire>` - All wires connecting nodes

**Relationships**:
- Contains 0..N Components
- Contains 0..N ENodes (automatically managed)
- Contains 0..N Wires

**Validation Rules**:
- Circuit name must be non-empty string
- Metadata size and divisions must be integers

**State Transitions**: N/A - Circuits are mutable during construction, immutable after JSON export

### CircuitMetadata

**Source**: `src/core/Circuit.ts`

**Description**: Holds general information about a circuit including grid configuration and camera setup.

**Key Attributes**:
- `name: string` - Human-readable circuit name
- `size: number` - Grid size (integer)
- `divisions: number` - Grid divisions (integer)
- `cameraStartup: Position3D` - Initial camera position for rendering

**Validation Rules**:
- `size` must be integer
- `divisions` must be integer
- All values required (no optional fields)

### Component

**Source**: `src/core/Component.ts`

**Description**: Represents an electrical component (battery, LED, switch, etc.) in a circuit.

**Key Attributes**:
- `id: UUID` - Unique identifier (auto-generated)
- `type: ComponentType` - Component type (Battery, Switch, LED, etc.)
- `position: Position` - Grid position (x, y integers)
- `rotation: Rotation` - Orientation angle (integer degrees)
- `pins: UUID[]` - Array of pin ENode UUIDs (auto-generated based on type)

**Relationships**:
- Belongs to one Circuit
- Has 0..N pin ENodes (defined by ComponentType metadata)

**Validation Rules**:
- Position coordinates must be integers
- Rotation angle must be integer
- Type must be valid ComponentType enum value
- Pins array length must match ComponentType metadata

### ENode (Electrical Node)

**Source**: `src/core/ENode.ts`

**Description**: Represents an electrical connection point (component pin or wire branching point).

**Key Attributes**:
- `id: UUID` - Unique identifier (auto-generated)
- `type: ENodeType` - Pin or BranchingPoint
- `position: Position` - Grid position (x, y integers)
- `componentId: UUID | undefined` - Parent component (for pin nodes only)
- `pinLabel: string | undefined` - Pin name (e.g., 'anode', 'cathode')

**Relationships**:
- May belong to one Component (if type is Pin)
- Connected to 0..N Wires

**Validation Rules**:
- Pin nodes must have componentId and pinLabel
- BranchingPoint nodes must not have componentId or pinLabel

### Wire

**Source**: `src/core/Wire.ts`

**Description**: Represents electrical connection between two ENodes.

**Key Attributes**:
- `id: UUID` - Unique identifier (auto-generated)
- `node1: UUID` - First connected ENode
- `node2: UUID` - Second connected ENode
- `intermediatePositions: Position[]` - Visual path points (optional)

**Relationships**:
- Connects exactly 2 ENodes

**Validation Rules**:
- node1 and node2 must be different (no self-connection)
- Both nodes must exist in circuit
- Intermediate positions must have integer coordinates

### ComponentType (Enum)

**Source**: `src/core/types/ComponentType.ts`

**Description**: Enumeration of available component types with associated metadata.

**Values Used in Sample Circuits**:
- `Battery` - Power source (2 pins: cathode, anode)
- `Switch` - Control element (2 pins: input, output)
- `Lightbulb` - Load (2 pins: pin1, pin2)
- `SmallLED` - Light-emitting diode (2 pins: anode, cathode)
- `RectangleLED` - LED variant (2 pins: anode, cathode)
- `Relay` - Switching component (4 pins: cmd_in, cmd_out, power_in, power_out)
- `Transistor` - Amplification/switching (3 pins: collector, base, emitter)
- `Cube` - Test component with no pins (0 pins)

**Note**: Not all types will be used in every sample circuit.

## Output File Format

### Sample Circuit JSON Files

**Location**: `output/sample-circuits/*.json`

**File Naming Convention**: `{circuit-purpose}.json`
- Examples: `simple-led-circuit.json`, `switch-controlled-led.json`, `relay-circuit.json`, `transistor-circuit.json`

**Format**: Standard Circuit JSON serialization (via `Circuit.toJSON()`)

**Structure**:
```json
{
  "metadata": {
    "name": "Simple LED Circuit",
    "size": 30,
    "divisions": 10,
    "cameraStartup": { "x": 0, "y": 0, "z": 50 }
  },
  "components": [
    {
      "id": "uuid-here",
      "type": "battery",
      "position": { "x": 0, "y": 0 },
      "rotation": { "angle": 0 },
      "pins": ["pin-uuid-1", "pin-uuid-2"]
    }
  ],
  "enodes": [
    {
      "id": "pin-uuid-1",
      "type": "pin",
      "position": { "x": 0, "y": 0 },
      "componentId": "uuid-here",
      "pinLabel": "cathode"
    }
  ],
  "wires": [
    {
      "id": "wire-uuid",
      "node1": "pin-uuid-1",
      "node2": "pin-uuid-2",
      "intermediatePositions": []
    }
  ]
}
```

**Validation**: JSON must be loadable via `Circuit.fromJSON()` without errors.

## Data Flow

1. **Script Execution** → Circuit factory functions called
2. **Circuit Construction** → Circuit API methods create Components, ENodes, Wires
3. **Serialization** → `circuit.toJSON()` converts to JSON object
4. **File Writing** → `JSON.stringify()` + `writeFile()` creates output files
5. **Validation** (test phase) → `Circuit.fromJSON()` verifies round-trip integrity

## Entity Relationships Diagram (Conceptual)

```
Circuit (1)
  ├─── metadata: CircuitMetadata (1)
  ├─── components: Component (0..N)
  │     └─── pins: ENode (0..N) [type=Pin]
  ├─── enodes: ENode (0..N) [type=Pin | BranchingPoint]
  └─── wires: Wire (0..N)
         ├─── node1: ENode (1)
         └─── node2: ENode (1)
```

## Notes

- All UUIDs are auto-generated by the Circuit API
- ENodes (pins and branching points) are automatically managed by Circuit class
- Scripts only directly create Components and Wires; ENodes are created implicitly
- Position coordinates and rotation angles must be integers (enforced by constructors)
- JSON serialization is built into all core entities (no custom serialization needed)
