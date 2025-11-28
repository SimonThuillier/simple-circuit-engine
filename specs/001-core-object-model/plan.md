# Implementation Plan: Core Object Model

**Branch**: `001-core-object-model` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-object-model/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create the foundational object model for the circuit engine: Circuit container, Component base class, ENode (electrical nodes for pins and branching points), and Wire entities. This provides the core data structures for representing circuit topology with automatic ENode lifecycle management, cascade deletion, orphaned cleanup, and wire splitting. Includes minimal position information (x, y integers, rotation) for 2D discrete grid rendering.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: None (core module is dependency-free per constitution)
**Storage**: In-memory data structures (JSON serialization for persistence)
**Testing**: Vitest 4.0+
**Target Platform**: ES2022+ environments (modern browsers, Node 18+)
**Project Type**: Single library (modular with core/, rendering/, playback/)
**Performance Goals**: <100ms query time for circuits with 1000 ENodes and 1000 Wires
**Constraints**: 100+ components without degradation, constant/near-constant time relationship queries
**Scale/Scope**: Support circuits with 100+ components, 500+ connections, typically small components (<50 pins per component)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Framework Agnosticism
- Core object model has zero UI dependencies
- Pure TypeScript data structures and logic
- No DOM access required

### ✅ Modular Separation
- Object model belongs entirely in `core/` module
- Circuit, Component, ENode, Wire are pure domain logic
- Rendering module will consume these via clean interfaces

### ✅ Discrete Boolean Model
- Object model represents topology only (electrical states handled separately)
- Positions stored as integers (discrete grid)
- No analog voltages or complex electrical properties

### ✅ Data-Driven Circuits
- All entities (Circuit, Component, ENode, Wire) are data structures
- Designed to be JSON-serializable
- Position/rotation stored as simple integers

### ✅ Specification-Driven Development
- 42 functional requirements defined
- User stories with acceptance scenarios
- Test coverage target: 80% minimum for core module

### ✅ Developer Experience First
- Public API: Circuit class as primary interface
- Clear entity relationships (Component → ENodes → Wires)
- JSDoc required for all public methods

**Status**: ✅ All gates pass. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-object-model/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── Circuit.ts           # Main container class
│   ├── Component.ts         # Base component class
│   ├── ENode.ts             # Electrical node (pins + branching points)
│   ├── Wire.ts              # Wire connecting two ENodes
│   ├── types/
│   │   ├── Position.ts      # Position (x, y) type
│   │   ├── Rotation.ts      # Rotation type
│   │   └── Identifier.ts    # UUID type
│   └── index.ts             # Core module exports
│
tests/
├── core/
│   ├── Circuit.test.ts
│   ├── Component.test.ts
│   ├── ENode.test.ts
│   ├── Wire.test.ts
│   └── integration/
│       ├── lifecycle.test.ts        # Cascade deletion tests
│       ├── wire-splitting.test.ts   # Wire split scenarios
│       └── orphaned-cleanup.test.ts # Orphaned ENode cleanup
│
```

**Structure Decision**: Single project structure using `src/core/` module as per constitution. All object model code lives in the core module since it's pure domain logic with no dependencies. Tests follow the same structure for clarity.

## Complexity Tracking

No constitution violations. All requirements align with established principles.
