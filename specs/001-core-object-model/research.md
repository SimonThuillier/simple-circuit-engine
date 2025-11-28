# Research: Core Object Model

**Feature**: 001-core-object-model
**Date**: 2025-11-28
**Phase**: 0 (Outline & Research)

## Purpose

This document consolidates research findings and technical decisions for implementing the core object model. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved.

---

## Key Decisions

### 1. Data Structure Choice for Entity Storage

**Decision**: Use Map<UUID, Entity> for primary storage with auxiliary index structures

**Rationale**:
- O(1) lookup by ID meets performance requirement (<100ms for 1000 entities)
- Map provides better ergonomics than plain objects for iteration
- TypeScript Map is well-optimized in modern runtimes
- Allows efficient enumeration (FR-005, FR-006, FR-007)

**Alternatives Considered**:
- Plain object storage: Less type-safe, awkward iteration
- Array storage: O(n) lookup, inefficient for relationship queries
- Tree structures: Overkill for flat entity collections

**Implementation Notes**:
- Circuit maintains three Maps: components, enodes, wires
- Bidirectional relationships stored redundantly for O(1) queries
- Example: Wire stores both ENode IDs, each ENode stores Set of Wire IDs

---

### 2. UUID Generation Strategy

**Decision**: Use crypto.randomUUID() for browsers, fallback to uuid package for Node.js

**Rationale**:
- Native crypto.randomUUID() available in ES2022+ browsers
- No dependencies for browser use (aligns with constitution)
- uuid package provides Node.js compatibility for testing
- UUIDs provide guaranteed uniqueness without coordination

**Alternatives Considered**:
- Sequential integers: Simple but not globally unique, complicates merging
- Timestamp + random: Custom implementation, potential collisions
- nanoid: Additional dependency, shorter IDs not required

**Implementation Notes**:
```typescript
// types/Identifier.ts
export type UUID = string; // RFC 4122 UUID

export function generateUUID(): UUID {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Node.js testing
  return require('uuid').v4();
}
```

---

### 3. Automatic ENode Lifecycle Management

**Decision**: Implement observer pattern with Circuit as lifecycle coordinator

**Rationale**:
- Circuit mediates all add/remove operations (FR-004)
- Component add → Circuit auto-creates pin ENodes (FR-017)
- Component remove → Circuit cascade deletes pins + wires (FR-016)
- Wire remove → Circuit checks and removes orphaned branching ENodes (FR-035, FR-036)
- Wire split → Circuit auto-creates branching ENode at split point (FR-028, FR-029)

**Alternatives Considered**:
- Direct entity manipulation: Users could orphan entities, violates automatic management
- Reference counting: Complex, still requires Circuit coordination
- Event system: Overkill for single-instance lifecycle management

**Implementation Notes**:
- Circuit exposes: `addComponent()`, `removeComponent()`, `addWire()`, `removeWire()`
- ENode creation/deletion is private, not exposed to users
- After each operation, Circuit runs orphan cleanup for branching ENodes
- Cascade deletion implemented as depth-first traversal (Component → pins → wires)

---

### 4. Wire Splitting Algorithm

**Decision**: Replace-and-create approach with automatic branching ENode

**Rationale**:
- When connecting wire from existing wire to existing ENode (FR-024):
  1. Create new branching ENode at connection point with position
  2. Split original wire into two: (oldStart → newBranch) and (newBranch → oldEnd)
  3. Create third wire from newBranch to target ENode
- Preserves original wire IDs in split (maintains references if needed)
- Automatic position assignment for branching ENode

**Alternatives Considered**:
- Delete and recreate: Loses wire identity, breaks external references
- Modify wire in-place: Violates immutability principle
- Manual branching ENode creation: Violates automatic management (FR-004)

**Implementation Notes**:
```typescript
// Pseudocode for wire splitting
Circuit.splitWire(wireId: UUID, position: Position, targetENode: UUID) {
  const wire = this.wires.get(wireId);
  const [start, end] = wire.getNodes();

  const branch = new ENode(position, ENodeType.BranchingPoint);
  this.enodes.set(branch.id, branch);

  const wire1 = new Wire(start, branch.id);
  const wire2 = new Wire(branch.id, end);
  const wire3 = new Wire(branch.id, targetENode);

  this.wires.delete(wireId);
  [wire1, wire2, wire3].forEach(w => this.wires.set(w.id, w));
}
```

---

### 5. Position and Rotation Representation

**Decision**: Dedicated Position and Rotation types wrapping integers

**Rationale**:
- Type safety prevents mixing positions with other integers
- Encapsulates validation (grid boundaries, rotation angles)
- Enables future enhancements (coordinate transformations) without API changes
- Clear intent in type signatures

**Alternatives Considered**:
- Plain `{x: number, y: number}`: No type safety, validation scattered
- Tuple `[number, number]`: Unclear which is x vs y
- Single number (packed coordinates): Premature optimization, confusing

**Implementation Notes**:
```typescript
// types/Position.ts
export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error('Position coordinates must be integers');
    }
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

// types/Rotation.ts
export class Rotation {
  constructor(public readonly angle: number) {
    if (!Number.isInteger(angle)) {
      throw new Error('Rotation angle must be an integer');
    }
  }
}
```

---

### 6. Wire Intermediate Positions Storage

**Decision**: Optional array of Position objects, empty array = straight line

**Rationale**:
- Flexible: supports both straight lines and complex paths (FR-026)
- Empty array clearly indicates straight-line rendering
- Immutable positions prevent accidental modification
- JSON-serializable for circuit persistence

**Alternatives Considered**:
- null vs empty array: Empty array more consistent for iteration
- Single path string (SVG-like): Harder to manipulate, less type-safe
- Required positions: Wasteful for straight lines (majority case)

**Implementation Notes**:
```typescript
// Wire.ts
export class Wire {
  constructor(
    public readonly id: UUID,
    private node1: UUID,
    private node2: UUID,
    public readonly intermediatePositions: ReadonlyArray<Position> = []
  ) {}

  isStraightLine(): boolean {
    return this.intermediatePositions.length === 0;
  }
}
```

---

### 7. Bidirectional Relationship Maintenance

**Decision**: Redundant storage with invariant enforcement in Circuit

**Rationale**:
- Wire stores two ENode IDs (FR-029)
- ENode stores Set<UUID> of connected wires (FR-033)
- Circuit enforces consistency on all mutations
- Enables O(1) relationship queries in both directions

**Alternatives Considered**:
- Single direction only: Requires graph traversal for reverse queries (violates performance requirement)
- Weak references: Complex, not supported consistently across runtimes
- Centralized relationship table: Additional indirection, slower queries

**Implementation Notes**:
- Circuit.addWire() updates both wire.nodes and enode.connectedWires
- Circuit.removeWire() cleans up both sides
- Private methods ensure users cannot create inconsistent state

---

### 8. Component Pin ENode Position Derivation

**Decision**: Pin ENodes inherit position from parent Component, do not store independent position

**Rationale**:
- Component position + rotation + pin offset = pin ENode position
- Single source of truth (component position)
- Moving component automatically moves all pins
- Saves storage (no redundant position data)

**Alternatives Considered**:
- Independent pin positions: Allows pins to drift from component, violates physical model
- Cached computed positions: Premature optimization, complicates invalidation

**Implementation Notes**:
```typescript
// ENode.ts
export class ENode {
  // Pin nodes reference parent component
  constructor(
    public readonly id: UUID,
    public readonly type: ENodeType,
    private component?: Component, // Set for pin nodes
    private pinIndex?: number,     // Set for pin nodes
    private position?: Position    // Set only for branching points
  ) {}

  getPosition(circuit: Circuit): Position {
    if (this.type === ENodeType.Pin) {
      // Derive from component position + pin offset
      return this.component.calculatePinPosition(this.pinIndex);
    }
    return this.position!;
  }
}
```

---

### 9. Validation Strategy

**Decision**: Fail-fast validation at Circuit API boundaries, return descriptive errors

**Rationale**:
- Validates before mutation (FR-028)
- Returns error messages for invalid operations (FR-023, FR-026, FR-027, FR-030, FR-031, FR-038, FR-042)
- Throws TypeError for programming errors (null/undefined, type mismatches)
- Validation includes: self-connections, duplicates, non-existent entities, invalid positions

**Alternatives Considered**:
- Silent failures: Hides bugs, violates specification
- Exceptions for all errors: Too aggressive for user errors
- Result type (Ok/Error): Functional style, but adds complexity for TS consumers

**Implementation Notes**:
```typescript
// Circuit.ts
addWire(node1: UUID, node2: UUID): Wire | Error {
  // Validation
  if (node1 === node2) {
    return new Error('Cannot create wire connecting node to itself');
  }
  if (!this.enodes.has(node1) || !this.enodes.has(node2)) {
    return new Error('Wire requires at least one existing ENode');
  }
  if (this.findWireBetween(node1, node2)) {
    return new Error('Duplicate wire between same nodes');
  }

  // Mutation
  const wire = new Wire(generateUUID(), node1, node2);
  this.wires.set(wire.id, wire);
  this.updateBidirectionalReferences(wire);
  return wire;
}
```

---

### 10. Test Strategy

**Decision**: Three-layer testing: unit (entities), integration (Circuit operations), property (invariants)

**Rationale**:
- Unit tests: Verify individual entity behavior (Component, ENode, Wire)
- Integration tests: Verify Circuit orchestration (lifecycle, cascade, cleanup)
- Property tests: Verify invariants hold (no orphans after operations, bidirectional consistency)
- Achieves 80%+ coverage target while testing behavior, not implementation

**Alternatives Considered**:
- Only unit tests: Misses lifecycle orchestration bugs
- Only integration tests: Slower, harder to debug
- Snapshot tests: Brittle, doesn't test behavior

**Implementation Notes**:
```
tests/core/
├── Circuit.test.ts          # Unit: Circuit methods
├── Component.test.ts        # Unit: Component creation, pins
├── ENode.test.ts            # Unit: ENode types, positions
├── Wire.test.ts             # Unit: Wire creation, intermediate positions
└── integration/
    ├── lifecycle.test.ts    # Cascade deletion scenarios
    ├── wire-splitting.test.ts # Wire split with branching ENode
    └── orphaned-cleanup.test.ts # Orphaned ENode cleanup
```

---

## Dependencies

**Direct Dependencies**: None (core module is dependency-free per constitution)

**Dev Dependencies**:
- Vitest 4.0+: Testing framework (already in constitution)
- @types/node: TypeScript types for Node.js (UUID fallback)
- uuid: UUID generation for Node.js testing environments

**Rationale**:
- Zero runtime dependencies maintains "pure core" architecture principle
- Dev dependencies support testing only
- Browser runtime uses native crypto.randomUUID()

---

## Performance Analysis

### Expected Complexity

| Operation | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| Add Component | O(1) + O(p) pin creation | O(p) where p = pin count |
| Remove Component | O(1) + O(p + w) cascade | O(p + w) where w = connected wires |
| Add Wire | O(1) | O(1) |
| Remove Wire | O(1) + O(1) orphan check | O(1) |
| Split Wire | O(1) | O(1) |
| Query component by ID | O(1) | - |
| Query wires by ENode | O(1) | - |
| Enumerate all entities | O(n) | O(n) |

**Meets Performance Goals**:
- ✅ All queries O(1) or near-constant (satisfies SC-002)
- ✅ Circuit with 1000 entities: ~1000 map lookups < 100ms (satisfies SC-003)
- ✅ 100+ components without degradation (satisfies SC-001)

### Memory Estimates

- Component: ~100 bytes (id, position, rotation, pin refs)
- ENode: ~80 bytes (id, type, component ref OR position, wire refs)
- Wire: ~120 bytes (id, 2 node refs, intermediate positions array)

**100 component circuit with 500 connections**:
- ~100 components × 100B = 10KB
- ~500 wires × 120B = 60KB
- ~600 enodes (500 pins + 100 branches) × 80B = 48KB
- **Total: ~118KB** (negligible for modern systems)

---

## Risks and Mitigations

### Risk 1: Orphaned ENode Detection Performance
**Concern**: Orphan cleanup on every wire removal could be expensive
**Mitigation**: Only check orphans for branching points (pins cannot be orphaned), O(1) check per wire removal
**Validation**: Performance tests for circuits with 1000+ wire removals

### Risk 2: Wire Splitting Complexity
**Concern**: Complex wire split scenarios (multiple splits on same wire)
**Mitigation**: Wire split replaces original, subsequent splits work on new wires independently
**Validation**: Integration tests for chained splits

### Risk 3: Pin Position Calculation Cost
**Concern**: Deriving pin positions from components on every query
**Mitigation**: Calculate on-demand, add caching only if profiling shows hotspot
**Validation**: Benchmark pin position queries in typical scenarios

---

## Open Questions for Implementation

None. All NEEDS CLARIFICATION items resolved. Ready for Phase 1 (Design & Contracts).
