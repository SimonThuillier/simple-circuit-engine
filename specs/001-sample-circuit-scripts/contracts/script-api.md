# Script API Contract: Sample Circuit Generation

**Feature**: Sample Circuit Generation Scripts
**Date**: 2025-11-29

## Overview

This document defines the programmatic API contracts for the sample circuit generation scripts. Since this feature creates executable scripts rather than a public API, the contracts describe the TypeScript function signatures and expected behaviors.

## Circuit Factory Functions

Each circuit is built by a dedicated factory function that returns a complete Circuit instance.

### Simple LED Circuit Factory

**Function**: `createSimpleLedCircuit()`

**Signature**:
```typescript
function createSimpleLedCircuit(): Circuit
```

**Behavior**:
- Creates a circuit with 2-3 components
- Includes: Battery, SmallLED (minimum viable circuit)
- Optional: Additional component for variety (e.g., second LED)
- Returns: Fully connected Circuit ready for JSON export

**Postconditions**:
- Circuit name is "Simple LED Circuit"
- Component count: 2 ≤ count ≤ 3
- All components are properly wired (complete electrical loop)
- Circuit is valid (loadable via fromJSON after serialization)

---

### Switch-Controlled LED Circuit Factory

**Function**: `createSwitchControlledLedCircuit()`

**Signature**:
```typescript
function createSwitchControlledLedCircuit(): Circuit
```

**Behavior**:
- Creates a circuit with 3-4 components
- Includes: Battery, Switch, SmallLED (basic control circuit)
- Optional: Additional load component
- Returns: Fully connected Circuit with switch in series

**Postconditions**:
- Circuit name is "Switch-Controlled LED Circuit"
- Component count: 3 ≤ count ≤ 4
- Switch component present and wired in series
- Circuit demonstrates open/close control pattern

---

### Relay Circuit Factory

**Function**: `createRelayCircuit()`

**Signature**:
```typescript
function createRelayCircuit(): Circuit
```

**Behavior**:
- Creates a circuit with 5-7 components
- Includes: Relay, multiple Batteries (control + power), Switch, LED
- Demonstrates isolated circuit control via relay
- Returns: Circuit with dual power domains connected via relay

**Postconditions**:
- Circuit name is "Relay Circuit"
- Component count: 5 ≤ count ≤ 7
- Relay component present with both control and power circuits
- Control circuit isolated from power circuit

---

### Transistor Circuit Factory

**Function**: `createTransistorCircuit()`

**Signature**:
```typescript
function createTransistorCircuit(): Circuit
```

**Behavior**:
- Creates a circuit with 6-10 components
- Includes: Transistor, multiple components for base/collector/emitter control
- Demonstrates transistor switching or amplification
- Returns: Most complex sample circuit

**Postconditions**:
- Circuit name is "Transistor Circuit"
- Component count: 6 ≤ count ≤ 10
- Transistor component present with proper base/collector/emitter connections
- Demonstrates hierarchical circuit control

---

## Utility Functions

### Write Circuit to File

**Function**: `writeCircuitToFile()`

**Signature**:
```typescript
async function writeCircuitToFile(
  circuit: Circuit,
  filename: string,
  outputDir?: string
): Promise<void>
```

**Parameters**:
- `circuit` - Circuit instance to serialize
- `filename` - Output file name (e.g., 'simple-led-circuit.json')
- `outputDir` - Optional output directory (default: 'output/sample-circuits')

**Behavior**:
- Creates output directory if it doesn't exist (recursive)
- Serializes circuit to JSON with 2-space indentation
- Writes to `{outputDir}/{filename}`
- Overwrites existing file if present
- Logs operation (e.g., "Written: output/sample-circuits/simple-led-circuit.json")

**Error Handling**:
- Throws Error if directory creation fails (with clear message)
- Throws Error if file write fails (with file path and cause)
- Does NOT catch EACCES (permission denied) - lets it propagate with context

**Example Usage**:
```typescript
const circuit = createSimpleLedCircuit();
await writeCircuitToFile(circuit, 'simple-led-circuit.json');
// Writes to: output/sample-circuits/simple-led-circuit.json
```

---

### Main Generation Function

**Function**: `generateSampleCircuits()`

**Signature**:
```typescript
async function generateSampleCircuits(outputDir?: string): Promise<void>
```

**Parameters**:
- `outputDir` - Optional custom output directory (default: 'output/sample-circuits')

**Behavior**:
- Calls all 4 circuit factory functions
- Writes each circuit to JSON file with corresponding filename
- Creates output directory if needed
- Logs progress for each circuit
- Deterministic execution order (simple → switch → relay → transistor)

**Postconditions**:
- 4 JSON files created in output directory
- All files are valid Circuit JSON (loadable via fromJSON)
- Files use descriptive naming convention

**Error Handling**:
- Continues generating remaining circuits if one fails (best effort)
- Logs errors for failed circuits
- Throws if output directory cannot be created

**Example Usage**:
```typescript
// Generate to default location
await generateSampleCircuits();

// Generate to custom location
await generateSampleCircuits('custom/output/dir');
```

---

## Script Entry Point

**File**: `scripts/samples/generate-sample-circuits.ts`

**Execution**:
```bash
npm run generate:samples
# or
tsx scripts/samples/generate-sample-circuits.ts
```

**Behavior**:
- Calls `generateSampleCircuits()` with default output directory
- Logs summary: "Generated 4 sample circuits to output/sample-circuits/"
- Exit code 0 on success, 1 on error

**Output**:
```
Generating sample circuits...
Written: output/sample-circuits/simple-led-circuit.json
Written: output/sample-circuits/switch-controlled-led.json
Written: output/sample-circuits/relay-circuit.json
Written: output/sample-circuits/transistor-circuit.json
Generated 4 sample circuits to output/sample-circuits/
```

---

## Type Definitions

### Circuit Definition Record

**Type**: `CircuitDefinition`

**Definition**:
```typescript
interface CircuitDefinition {
  factory: () => Circuit;
  filename: string;
}
```

**Usage**: Internal type for organizing circuit factory functions and their output filenames.

---

## Testing Contracts

### Circuit Factory Tests

**Each factory function must satisfy**:
```typescript
describe('createXxxCircuit()', () => {
  it('should return a Circuit instance', () => {
    const circuit = createXxxCircuit();
    expect(circuit).toBeInstanceOf(Circuit);
  });

  it('should have correct component count range', () => {
    const circuit = createXxxCircuit();
    const count = circuit.getAllComponents().length;
    expect(count).toBeGreaterThanOrEqual(MIN);
    expect(count).toBeLessThanOrEqual(MAX);
  });

  it('should be serializable to JSON', () => {
    const circuit = createXxxCircuit();
    const json = circuit.toJSON();
    expect(json).toBeDefined();
  });

  it('should round-trip through JSON serialization', () => {
    const circuit = createXxxCircuit();
    const json = circuit.toJSON();
    const loaded = Circuit.fromJSON(json);
    expect(loaded.getAllComponents().length).toBe(circuit.getAllComponents().length);
  });
});
```

### File Writing Tests

**File writer must satisfy**:
```typescript
describe('writeCircuitToFile()', () => {
  it('should create output directory if missing', async () => {
    await writeCircuitToFile(circuit, 'test.json', 'temp/test/dir');
    expect(existsSync('temp/test/dir')).toBe(true);
  });

  it('should write valid JSON file', async () => {
    await writeCircuitToFile(circuit, 'test.json', tempDir);
    const content = readFileSync(`${tempDir}/test.json`, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('should overwrite existing file', async () => {
    await writeCircuitToFile(circuit1, 'test.json', tempDir);
    await writeCircuitToFile(circuit2, 'test.json', tempDir);
    // Second write succeeds, file contains circuit2
  });
});
```

---

## Dependencies

All contracts depend on:
- `Circuit` class from `src/core/Circuit.ts`
- `Component`, `ENode`, `Wire` classes from `src/core/`
- `ComponentType` enum from `src/core/types/ComponentType.ts`
- `Position`, `Rotation` types from `src/core/types/`
- Node.js `fs/promises` for file operations

No external dependencies required (aligns with constitution).

---

## Notes

- All functions are pure (no side effects except file I/O)
- Factory functions are deterministic (same output every time)
- File operations are async to follow modern Node.js patterns
- Error messages include context (file paths, operation details)
- Logging uses console.log (no logging framework needed for scripts)
