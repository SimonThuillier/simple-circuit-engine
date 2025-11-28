# Quickstart: Core Object Model

**Feature**: 001-core-object-model
**For**: Developers implementing or using the core object model
**Date**: 2025-11-28

## Overview

The core object model provides the foundational data structures for representing circuit topology:
- **Circuit**: Container managing all elements
- **Component**: Base class for electrical components (lightbulbs, transistors, etc.)
- **ENode**: Electrical connection points (component pins or wire branching points)
- **Wire**: Connections between two ENodes

Key principles:
- **Automatic ENode management**: You add/remove Components and Wires; ENodes are created/removed automatically
- **Cascade deletion**: Removing a Component removes its pins and connected Wires
- **Orphaned cleanup**: Branching ENodes with no wires are automatically removed
- **Wire splitting**: Creating branches automatically creates new ENodes and splits wires

---

## Installation

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run type-check
```

---

## Basic Usage

### Creating a Circuit

```typescript
import { Circuit, Position, Rotation } from '@/core';

// Create an empty circuit
const circuit = new Circuit();
```

### Adding Components

```typescript
// Add a component at position (10, 20) with 90° rotation and 2 pins
const lightbulb = circuit.addComponent(
  new Position(10, 20),
  new Rotation(90),
  2  // pin count
);

console.log(lightbulb.id);        // UUID
console.log(lightbulb.position);  // Position { x: 10, y: 20 }
console.log(lightbulb.rotation);  // Rotation { angle: 90 }
console.log(lightbulb.pins);      // [uuid1, uuid2] - automatically created
```

### Adding Wires

```typescript
// Get pin ENode IDs from two components
const [pin1, pin2] = lightbulb1.pins;
const [pin3, pin4] = lightbulb2.pins;

// Connect pin2 of lightbulb1 to pin3 of lightbulb2
const wire = circuit.addWire(pin2, pin3);

if (wire instanceof Error) {
  console.error('Failed to create wire:', wire.message);
} else {
  console.log('Wire created:', wire.id);
}
```

### Wires with Custom Paths

```typescript
// Create a wire with intermediate positions for rendering
const curvedWire = circuit.addWire(
  pin1,
  pin2,
  [
    new Position(12, 15),  // waypoint 1
    new Position(15, 18),  // waypoint 2
  ]
);

// Check if wire is straight or curved
if (curvedWire instanceof Wire) {
  console.log('Straight line?', curvedWire.isStraightLine()); // false
}
```

---

## Advanced Usage

### Splitting Wires (Creating Branches)

```typescript
// Split an existing wire to create a branch
const targetNode = circuit.getENode(someNodeId);
if (targetNode) {
  circuit.splitWire(
    wireId,                      // wire to split
    new Position(15, 15),        // position for branching ENode
    targetNode.id                // node to connect to
  );
}

// Result:
// - Original wire (A → B) is deleted
// - New branching ENode created at (15, 15)
// - Three new wires created:
//   - A → branch
//   - branch → B
//   - branch → target
```

### Querying Relationships

```typescript
// Get all wires connected to a node
const wires = circuit.getWiresByNode(nodeId);
console.log(`Node has ${wires.length} connections`);

// Get nodes connected by a wire
const nodes = circuit.getNodesByWire(wireId);
if (nodes) {
  const [node1, node2] = nodes;
  console.log('Wire connects:', node1.id, '→', node2.id);
}

// Check if wire already exists between two nodes
if (circuit.hasWireBetween(nodeA, nodeB)) {
  console.log('Wire already exists');
}

// Find components connected to a component
const connected = circuit.getConnectedComponents(componentId);
console.log(`Component has ${connected.length} neighbors`);
```

### Removing Elements

```typescript
// Remove a wire (automatically cleans up orphaned branching nodes)
circuit.removeWire(wireId);

// Remove a component (cascade deletes pins and connected wires)
circuit.removeComponent(componentId);
// After this:
// - Component is removed
// - All its pin ENodes are removed
// - All wires connected to those pins are removed
// - Any orphaned branching ENodes are removed
```

---

## Working with ENodes

ENodes are automatically managed - you query them but don't create/delete them directly.

```typescript
// Get an ENode
const node = circuit.getENode(nodeId);

if (node) {
  // Check if it's a pin or branching point
  if (node.type === ENodeType.Pin) {
    console.log('Pin node');
    console.log('  Component:', node.component);
    console.log('  Pin index:', node.pinIndex);
    // Position derived from component
    console.log('  Position:', node.getPosition(circuit));
  } else {
    console.log('Branching point');
    // Position stored directly
    console.log('  Position:', node.position);
  }

  // Get connected wires
  const wires = circuit.getWiresByNode(node.id);
  console.log(`Node has ${wires.length} wires`);
}
```

---

## Enumeration

```typescript
// Get all components
const components = circuit.getAllComponents();
console.log(`Circuit has ${components.length} components`);

// Get all ENodes (pins + branching points)
const enodes = circuit.getAllENodes();
console.log(`Circuit has ${enodes.length} electrical nodes`);

// Get all wires
const wires = circuit.getAllWires();
console.log(`Circuit has ${wires.length} wires`);
```

---

## Serialization

```typescript
// Serialize circuit to JSON
const json = circuit.toJSON();
localStorage.setItem('my-circuit', JSON.stringify(json));

// Deserialize from JSON
const loadedJson = JSON.parse(localStorage.getItem('my-circuit'));
const loadedCircuit = Circuit.fromJSON(loadedJson);
```

---

## Error Handling

The API returns Errors (not throws) for invalid user operations:

```typescript
// Self-connection (invalid)
const result = circuit.addWire(nodeA, nodeA);
if (result instanceof Error) {
  console.error(result.message);
  // "Cannot create wire connecting node to itself"
}

// Duplicate wire (invalid)
circuit.addWire(nodeA, nodeB);  // OK
const dup = circuit.addWire(nodeA, nodeB);  // Error
if (dup instanceof Error) {
  console.error(dup.message);
  // "Duplicate wire between same nodes"
}

// Non-existent node (invalid)
const bad = circuit.addWire(nodeA, 'fake-uuid');
if (bad instanceof Error) {
  console.error(bad.message);
  // "Wire requires at least one existing ENode"
}
```

Programming errors (type mismatches, null) throw TypeError:

```typescript
try {
  circuit.addComponent(
    new Position(10.5, 20),  // Non-integer!
    new Rotation(90),
    2
  );
} catch (e) {
  console.error(e);  // TypeError: Position coordinates must be integers
}
```

---

## Testing Examples

### Unit Test: Component Creation

```typescript
import { describe, it, expect } from 'vitest';
import { Circuit, Position, Rotation } from '@/core';

describe('Circuit - Component Management', () => {
  it('should create component with pins', () => {
    const circuit = new Circuit();
    const comp = circuit.addComponent(
      new Position(10, 20),
      new Rotation(0),
      3
    );

    expect(comp.pins.length).toBe(3);
    expect(circuit.getAllComponents().length).toBe(1);
    expect(circuit.getAllENodes().length).toBe(3); // 3 pin nodes
  });
});
```

### Integration Test: Cascade Deletion

```typescript
describe('Circuit - Cascade Deletion', () => {
  it('should remove component, pins, and wires', () => {
    const circuit = new Circuit();

    // Create two components
    const comp1 = circuit.addComponent(new Position(0, 0), new Rotation(0), 2);
    const comp2 = circuit.addComponent(new Position(10, 0), new Rotation(0), 2);

    // Connect them with a wire
    circuit.addWire(comp1.pins[0], comp2.pins[0]);

    expect(circuit.getAllWires().length).toBe(1);
    expect(circuit.getAllENodes().length).toBe(4); // 2 + 2 pins

    // Remove comp1 - should cascade delete pins and wire
    circuit.removeComponent(comp1.id);

    expect(circuit.getAllComponents().length).toBe(1);
    expect(circuit.getAllENodes().length).toBe(2); // only comp2 pins remain
    expect(circuit.getAllWires().length).toBe(0);  // wire removed
  });
});
```

### Integration Test: Wire Splitting

```typescript
describe('Circuit - Wire Splitting', () => {
  it('should split wire and create branching node', () => {
    const circuit = new Circuit();

    const comp1 = circuit.addComponent(new Position(0, 0), new Rotation(0), 1);
    const comp2 = circuit.addComponent(new Position(20, 0), new Rotation(0), 1);
    const comp3 = circuit.addComponent(new Position(10, 10), new Rotation(0), 1);

    // Create wire: comp1 → comp2
    const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]) as Wire;

    expect(circuit.getAllWires().length).toBe(1);
    expect(circuit.getAllENodes().length).toBe(3); // 3 pins

    // Split wire to connect comp3
    circuit.splitWire(wire.id, new Position(10, 0), comp3.pins[0]);

    expect(circuit.getAllWires().length).toBe(3); // original deleted, 3 new
    expect(circuit.getAllENodes().length).toBe(4); // 3 pins + 1 branch
  });
});
```

---

## Common Patterns

### Building a Simple Circuit

```typescript
const circuit = new Circuit();

// Create components
const battery = circuit.addComponent(new Position(0, 0), new Rotation(0), 2);
const lightbulb = circuit.addComponent(new Position(10, 0), new Rotation(0), 2);
const led = circuit.addComponent(new Position(20, 0), new Rotation(0), 2);

// Connect in series
circuit.addWire(battery.pins[1], lightbulb.pins[0]);
circuit.addWire(lightbulb.pins[1], led.pins[0]);
circuit.addWire(led.pins[1], battery.pins[0]);  // complete the loop
```

### Validating Before Operations

```typescript
function safeAddWire(circuit: Circuit, n1: UUID, n2: UUID): Wire | null {
  // Check nodes exist
  if (!circuit.getENode(n1) || !circuit.getENode(n2)) {
    console.error('One or both nodes not found');
    return null;
  }

  // Check for duplicate
  if (circuit.hasWireBetween(n1, n2)) {
    console.warn('Wire already exists');
    return null;
  }

  // Add wire
  const result = circuit.addWire(n1, n2);
  return result instanceof Error ? null : result;
}
```

---

## Performance Tips

1. **Use bulk operations**: Add all components first, then wires
2. **Cache queries**: Store frequently accessed components/nodes
3. **Avoid repeated enumeration**: `getAllX()` returns new arrays each time
4. **Leverage O(1) lookups**: Use `getX(id)` instead of iterating

```typescript
// ❌ Slow: Repeated enumeration
for (let i = 0; i < 1000; i++) {
  const comps = circuit.getAllComponents();
  // ...
}

// ✅ Fast: Cache the array
const comps = circuit.getAllComponents();
for (const comp of comps) {
  // ...
}
```

---

## Debugging

```typescript
// Log circuit state
function debugCircuit(circuit: Circuit) {
  console.log('=== Circuit State ===');
  console.log('Components:', circuit.getAllComponents().length);
  console.log('ENodes:', circuit.getAllENodes().length);
  console.log('Wires:', circuit.getAllWires().length);

  // Check for orphaned branching nodes (should be none)
  const orphans = circuit.getAllENodes().filter(
    node => node.type === ENodeType.BranchingPoint && node.wires.size === 0
  );
  if (orphans.length > 0) {
    console.warn('ORPHANED NODES:', orphans);
  }
}
```

---

## Next Steps

1. **Implement**: Follow the contracts in `/contracts/`
2. **Test**: Write tests following the examples above
3. **Integrate**: Use Circuit in rendering/playback modules
4. **Document**: Add JSDoc to all public methods

See [data-model.md](./data-model.md) for detailed entity specifications.
See [research.md](./research.md) for technical decisions and rationale.
