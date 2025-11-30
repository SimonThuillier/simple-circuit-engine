# Research: Sample Circuit Generation Scripts

**Date**: 2025-11-29
**Feature**: Sample Circuit Generation Scripts
**Branch**: `001-sample-circuit-scripts`

## Overview

This document consolidates research findings for implementing TypeScript scripts that generate sample circuits using the existing `Circuit` API. Since the project uses well-established APIs and patterns, research focuses on circuit construction patterns, file organization, and testing strategies.

## Research Areas

### 1. Circuit Construction API Patterns

**Research Question**: What is the correct pattern for programmatically building circuits using the existing Circuit API?

**Findings**:

From `Circuit.ts` and `Circuit.test.ts` analysis:

1. **Component Addition**:
   ```typescript
   const component = circuit.addComponent(
     ComponentType.Battery,
     new Position(x, y),  // integers only
     new Rotation(angle)  // integer degrees only
   );
   ```
   - Returns Component with auto-generated `id` and `pins[]`
   - Pins are automatically created based on ComponentType metadata
   - Position and Rotation must use integer values (throws TypeError otherwise)

2. **Wire Connection**:
   ```typescript
   const wire = circuit.addWire(pin1Id, pin2Id);
   if (wire instanceof Error) {
     // Handle connection error
   }
   ```
   - Connects two ENode UUIDs (typically component pins)
   - Returns Wire or Error (validation)
   - Cannot connect node to itself
   - Both nodes must exist

3. **Circuit Metadata**:
   ```typescript
   const circuit = new Circuit('Circuit Name');
   circuit.metadata = new CircuitMetadata(
     name: string,
     size: number,        // grid size (integer)
     divisions: number,   // grid divisions (integer)
     cameraStartup: Position3D
   );
   ```
   - Default: size=30, divisions=10, camera at (0, 0, 50)
   - Size and divisions must be integers

4. **JSON Serialization**:
   - Circuit has `toJSON()` method for serialization
   - Circuit has static `fromJSON()` method for deserialization
   - All nested objects (Component, ENode, Wire, Position, Rotation, etc.) support JSON round-trip

**Decision**: Use the standard Circuit API pattern: create circuit → add components → connect wires via pins → serialize to JSON.

**Rationale**: This is the officially supported API with full test coverage and JSON serialization support.

**Alternatives Considered**: None - this is the only API for circuit construction.

---

### 2. ComponentType Usage and Pin Access

**Research Question**: How do we access component pins for wiring, and which ComponentTypes are available?

**Findings**:

From `ComponentType.ts`:

**Available ComponentTypes** (8 total):
- `Battery` (2 pins: cathode, anode)
- `Switch` (2 pins: input, output)
- `Lightbulb` (2 pins: pin1, pin2)
- `Relay` (4 pins: cmd_in, cmd_out, power_in, power_out)
- `Transistor` (3 pins: collector, base, emitter)
- `SmallLED` (2 pins: anode, cathode)
- `RectangleLED` (2 pins: anode, cathode)
- `Cube` (0 pins - test component)

**Pin Access Pattern**:
```typescript
const battery = circuit.addComponent(ComponentType.Battery, pos, rot);
const led = circuit.addComponent(ComponentType.SmallLED, pos, rot);

// Connect battery anode (pin index 1) to LED anode (pin index 0)
circuit.addWire(battery.pins[1], led.pins[0]);
```

**Decision**: Use pin array indices to connect components. Document pin order assumptions in circuit builder comments.

**Rationale**: Pin order is defined by ComponentType metadata and is stable. Index-based access is the standard pattern shown in tests.

**Alternatives Considered**:
- Pin label lookup (e.g., component.getPinByLabel('anode')) - not implemented in current API
- Manual ENode creation - violates Circuit design principle (ENodes managed automatically)

---

### 3. File System Operations and Output Format

**Research Question**: How should scripts write JSON files and handle file system operations?

**Findings**:

**Standard Node.js Patterns**:
1. **Directory Creation**:
   ```typescript
   import { mkdir } from 'fs/promises';
   await mkdir(outputDir, { recursive: true });
   ```
   - `recursive: true` creates parent directories if needed
   - Idempotent - no error if directory already exists

2. **File Writing**:
   ```typescript
   import { writeFile } from 'fs/promises';
   const json = JSON.stringify(circuit.toJSON(), null, 2);
   await writeFile(filePath, json, 'utf-8');
   ```
   - 2-space indentation for readability
   - UTF-8 encoding (standard for JSON)
   - Overwrites existing file (matches spec requirement)

3. **Error Handling**:
   ```typescript
   try {
     await writeFile(path, data);
   } catch (error) {
     throw new Error(`Failed to write ${path}: ${error.message}`);
   }
   ```
   - Catch low-level errors, rethrow with context
   - Matches spec requirement for clear error messages

**Decision**: Use Node.js `fs/promises` API with async/await pattern. Create output directory with `mkdir(..., {recursive: true})`, write formatted JSON with 2-space indentation.

**Rationale**: Standard Node.js patterns, no external dependencies needed, aligns with constitution (minimal dependencies).

**Alternatives Considered**:
- Third-party file libraries (fs-extra) - unnecessary dependency
- Synchronous fs operations - async is modern standard
- Custom file writer abstraction - premature abstraction for simple operation

---

### 4. Script Organization and Execution Model

**Research Question**: How should scripts be organized for maintainability and execution?

**Findings**:

**Organization Pattern**:
1. **Separate Circuit Definitions**: Each circuit in its own file exports a factory function
   ```typescript
   // circuits/simple-led-circuit.ts
   export function createSimpleLedCircuit(): Circuit {
     const circuit = new Circuit('Simple LED Circuit');
     // ... build circuit
     return circuit;
   }
   ```

2. **Main Orchestrator Script**: Imports all circuit factories and handles file I/O
   ```typescript
   // generate-sample-circuits.ts
   import { createSimpleLedCircuit } from './circuits/simple-led-circuit.js';

   const circuits = [
     { factory: createSimpleLedCircuit, filename: 'simple-led-circuit.json' },
     // ...
   ];

   for (const { factory, filename } of circuits) {
     const circuit = factory();
     await writeCircuitToFile(circuit, filename);
   }
   ```

3. **Shared Utilities**: File I/O and common helpers in utils/
   ```typescript
   // utils/file-writer.ts
   export async function writeCircuitToFile(circuit: Circuit, filename: string)
   ```

**Execution Model**:
- Script runs via `tsx` (TypeScript executor) or compiled JS
- Add npm script: `"generate:samples": "tsx scripts/samples/generate-sample-circuits.ts"`
- Script is standalone (not part of library exports)

**Decision**: Use modular structure with separate circuit definition files, main orchestrator, and shared utilities. Execute via npm script using tsx.

**Rationale**:
- Maintainability: Each circuit is independently editable
- Testability: Can test individual circuit factories
- Execution simplicity: Single command to generate all
- Constitution compliance: Scripts separate from core library code

**Alternatives Considered**:
- Single monolithic script - harder to maintain and test
- CLI with arguments - over-engineered for fixed 4 circuits (out of scope per spec)
- Build-time generation - unnecessary complexity, manual execution is fine

---

### 5. Circuit Design Patterns and Topologies

**Research Question**: What circuit topologies should the 4 samples demonstrate?

**Findings**:

**Educational Circuit Patterns** (from electrical engineering education):

1. **Simple Series Circuit** (2-3 components):
   - Battery → LED (most basic functional circuit)
   - Demonstrates: Power source, load, complete loop

2. **Switch-Controlled Circuit** (3-4 components):
   - Battery → Switch → LED
   - Demonstrates: Control element, open/closed circuit

3. **Relay-Based Control** (5-7 components):
   - Control circuit: Battery → Switch → Relay command pins
   - Power circuit: Battery → Relay power pins → LED
   - Demonstrates: Isolation, relay switching, dual circuits

4. **Transistor Logic** (6-10 components):
   - Control: Battery → Switch → Transistor base
   - Load: Battery → Transistor collector/emitter → LED
   - Demonstrates: Amplification/switching, more complex topology

**Topology Variety**:
- Simple series (linear)
- Branch with switch (conditional path)
- Isolated circuits with relay (multi-circuit)
- Transistor control (hierarchical)

**Decision**: Implement these 4 circuit patterns with increasing complexity (2-3, 3-4, 5-7, 6-10 components).

**Rationale**:
- Covers educational progression from simple to complex
- Demonstrates different topologies (series, switched, isolated, hierarchical)
- Uses diverse ComponentTypes (meets SC-003: at least 5 types)
- Each circuit has unique component count (meets SC-004)

**Alternatives Considered**:
- Random circuit generation - not deterministic (violates FR-008)
- Only simple circuits - doesn't demonstrate engine capabilities
- Complex digital logic - exceeds 10 component constraint

---

### 6. Testing Strategy

**Research Question**: How should we test the sample generation scripts?

**Findings**:

**Test Layers**:

1. **Script Execution Tests** (`circuit-generation.test.ts`):
   ```typescript
   it('should generate all 4 circuit files', async () => {
     await generateSampleCircuits();

     expect(existsSync('output/sample-circuits/simple-led-circuit.json')).toBe(true);
     // ... check all 4 files exist
   });
   ```

2. **JSON Validation Tests** (`json-validation.test.ts`):
   ```typescript
   it('should generate valid JSON loadable by Circuit.fromJSON()', async () => {
     const json = JSON.parse(readFileSync('output/sample-circuits/simple-led-circuit.json'));
     const circuit = Circuit.fromJSON(json);

     expect(circuit).toBeDefined();
     expect(circuit.getAllComponents().length).toBeGreaterThan(0);
   });
   ```

3. **Circuit Factory Unit Tests**:
   ```typescript
   it('should create simple LED circuit with 2-3 components', () => {
     const circuit = createSimpleLedCircuit();
     const components = circuit.getAllComponents();

     expect(components.length).toBeGreaterThanOrEqual(2);
     expect(components.length).toBeLessThanOrEqual(3);
   });
   ```

**Decision**: Implement all three test layers - execution tests, JSON validation tests, and unit tests for circuit factories.

**Rationale**:
- Comprehensive coverage matches constitution quality standards (80% minimum)
- Tests verify both process (generation works) and output (JSON is valid)
- Unit tests enable TDD workflow (define → test → implement)

**Alternatives Considered**:
- Manual validation only - doesn't meet "tests are non-negotiable" principle
- Integration tests only - misses unit-level failures
- Visual inspection of JSON - not automated, not repeatable

---

## Summary of Decisions

| Decision Area | Choice | Key Rationale |
|--------------|--------|---------------|
| **Circuit API** | Standard Circuit.addComponent() + addWire() pattern | Official API, full test coverage, JSON support |
| **Pin Access** | Array index-based (battery.pins[0]) | Standard pattern, documented in metadata |
| **File I/O** | Node.js fs/promises with async/await | Standard, no dependencies, constitution-compliant |
| **Organization** | Modular (separate circuit files + orchestrator + utils) | Maintainable, testable, clear separation |
| **Execution** | npm script with tsx | Simple, developer-friendly |
| **Circuit Patterns** | 4 educational patterns (simple → transistor) | Educational progression, topology diversity |
| **Testing** | 3 layers (execution, validation, unit) | Comprehensive, meets quality standards |

## Open Questions

None - all technical decisions resolved through codebase analysis.

## Next Steps

Proceed to Phase 1: Design artifacts (data-model.md, contracts/, quickstart.md)
