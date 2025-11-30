# Quickstart: Sample Circuit Generation Scripts

**Feature**: Sample Circuit Generation Scripts
**Branch**: `001-sample-circuit-scripts`
**Date**: 2025-11-29

## Overview

This quickstart guide shows developers how to generate sample circuits and use the generated JSON files in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Project dependencies installed (`npm install`)
- Basic TypeScript knowledge

## Generate Sample Circuits

### Option 1: Using npm script (Recommended)

```bash
npm run generate:samples
```

**Expected Output**:
```
Generating sample circuits...
Written: output/sample-circuits/simple-led-circuit.json
Written: output/sample-circuits/switch-controlled-led.json
Written: output/sample-circuits/relay-circuit.json
Written: output/sample-circuits/transistor-circuit.json
Generated 4 sample circuits to output/sample-circuits/
```

### Option 2: Direct execution

```bash
tsx scripts/samples/generate-sample-circuits.ts
```

### Generated Files

After running the script, you'll find 4 JSON files in `output/sample-circuits/`:

1. **simple-led-circuit.json** - Basic LED with battery (2-3 components)
2. **switch-controlled-led.json** - Switch controlling LED (3-4 components)
3. **relay-circuit.json** - Relay-based control circuit (5-7 components)
4. **transistor-circuit.json** - Transistor logic circuit (6-10 components)

## Using Generated Circuits

### Load a Sample Circuit

```typescript
import { Circuit } from './src/core/Circuit.js';
import { readFile } from 'fs/promises';

// Load circuit from JSON file
const json = await readFile('output/sample-circuits/simple-led-circuit.json', 'utf-8');
const circuit = Circuit.fromJSON(JSON.parse(json));

// Inspect circuit
console.log(`Loaded: ${circuit.name}`);
console.log(`Components: ${circuit.getAllComponents().length}`);
console.log(`Wires: ${circuit.getAllWires().length}`);
```

### Example: Testing Circuit Loading

```typescript
import { describe, it, expect } from 'vitest';
import { Circuit } from '@/core/Circuit';
import { readFile } from 'fs/promises';

describe('Sample Circuits', () => {
  it('should load simple LED circuit', async () => {
    const json = await readFile('output/sample-circuits/simple-led-circuit.json', 'utf-8');
    const circuit = Circuit.fromJSON(JSON.parse(json));

    expect(circuit).toBeDefined();
    expect(circuit.name).toBe('Simple LED Circuit');
    expect(circuit.getAllComponents().length).toBeGreaterThanOrEqual(2);
    expect(circuit.getAllComponents().length).toBeLessThanOrEqual(3);
  });
});
```

### Example: Using in Demo Application

```typescript
import { CircuitEngine } from './src/CircuitEngine.js';
import { readFile } from 'fs/promises';

// Load and visualize sample circuit
async function loadSampleCircuit(filename: string) {
  const json = await readFile(`output/sample-circuits/${filename}`, 'utf-8');
  const circuit = Circuit.fromJSON(JSON.parse(json));

  const engine = new CircuitEngine(document.getElementById('canvas'));
  engine.loadCircuit(circuit);
  engine.play();
}

// Usage
await loadSampleCircuit('relay-circuit.json');
```

## Available Sample Circuits

### 1. Simple LED Circuit
- **Components**: Battery, SmallLED
- **Complexity**: Beginner
- **Demonstrates**: Basic series circuit, complete electrical loop
- **Use Case**: Testing basic circuit loading and rendering

### 2. Switch-Controlled LED Circuit
- **Components**: Battery, Switch, SmallLED
- **Complexity**: Beginner
- **Demonstrates**: Control element, open/close circuit states
- **Use Case**: Testing interactive components and state changes

### 3. Relay Circuit
- **Components**: Batteries, Relay, Switch, LED
- **Complexity**: Intermediate
- **Demonstrates**: Isolated circuits, relay switching, dual power domains
- **Use Case**: Testing complex component interactions and circuit isolation

### 4. Transistor Circuit
- **Components**: Transistors, Batteries, Switches, LEDs
- **Complexity**: Advanced
- **Demonstrates**: Transistor switching/amplification, hierarchical control
- **Use Case**: Testing most complex topology and component variety

## Creating Custom Circuits (Programmatically)

Want to create your own circuits? Use the same pattern as the sample scripts:

```typescript
import { Circuit } from './src/core/Circuit.js';
import { ComponentType } from './src/core/types/ComponentType.js';
import { Position } from './src/core/types/Position.js';
import { Rotation } from './src/core/types/Rotation.js';

// Create new circuit
const circuit = new Circuit('My Custom Circuit');

// Add components
const battery = circuit.addComponent(
  ComponentType.Battery,
  new Position(0, 0),
  new Rotation(0)
);

const led = circuit.addComponent(
  ComponentType.SmallLED,
  new Position(10, 0),
  new Rotation(0)
);

// Connect components (battery anode to LED anode)
circuit.addWire(battery.pins[1], led.pins[0]);

// Connect LED cathode to battery cathode (complete loop)
circuit.addWire(led.pins[1], battery.pins[0]);

// Export to JSON
const json = circuit.toJSON();
console.log(JSON.stringify(json, null, 2));
```

## Troubleshooting

### Output directory doesn't exist
**Solution**: The script creates it automatically. If permissions fail, create manually:
```bash
mkdir -p output/sample-circuits
```

### JSON file fails to load
**Solution**: Verify JSON is valid and uses correct Circuit format:
```bash
cat output/sample-circuits/simple-led-circuit.json | jq .
```

### Script execution error
**Solution**: Ensure dependencies are installed and TypeScript is compiled:
```bash
npm install
npm run build  # if needed
npm run generate:samples
```

### Cannot find tsx
**Solution**: Install tsx globally or use via npx:
```bash
npm install -g tsx
# or
npx tsx scripts/samples/generate-sample-circuits.ts
```

## File Locations

```
project-root/
├── scripts/
│   └── samples/
│       ├── generate-sample-circuits.ts    # Main script
│       ├── circuits/                      # Individual circuit factories
│       └── utils/                         # Helper functions
├── output/
│   └── sample-circuits/                   # Generated JSON files (gitignored)
│       ├── simple-led-circuit.json
│       ├── switch-controlled-led.json
│       ├── relay-circuit.json
│       └── transistor-circuit.json
└── tests/
    └── samples/                           # Tests for generation scripts
        ├── circuit-generation.test.ts
        └── json-validation.test.ts
```

## Next Steps

1. **Explore Circuit Structure**: Open generated JSON files to see circuit format
2. **Load in Tests**: Use sample circuits as test fixtures
3. **Visualize**: Load circuits in demo application to see 3D rendering
4. **Customize**: Modify circuit factory functions to create variations
5. **Add More**: Create additional circuit patterns following the same structure

## Additional Resources

- [Circuit API Documentation](../../../docs/ARCHITECTURE.md)
- [ComponentType Reference](../../../src/core/types/ComponentType.ts)
- [Circuit Class Source](../../../src/core/Circuit.ts)
- [Feature Specification](./spec.md)
- [API Contracts](./contracts/script-api.md)

## Quick Reference

**Generate all samples**:
```bash
npm run generate:samples
```

**Load a circuit**:
```typescript
const circuit = Circuit.fromJSON(JSON.parse(jsonString));
```

**Create a circuit**:
```typescript
const circuit = new Circuit('Name');
const comp = circuit.addComponent(type, pos, rot);
circuit.addWire(comp.pins[0], otherComp.pins[1]);
```

**Export to JSON**:
```typescript
const json = circuit.toJSON();
await writeFile('output.json', JSON.stringify(json, null, 2));
```

---

**That's it!** You're now ready to generate and use sample circuits. For implementation details, see the [feature specification](./spec.md) or [API contracts](./contracts/script-api.md).
