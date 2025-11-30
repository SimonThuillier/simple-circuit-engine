# Implementation Plan: Sample Circuit Generation Scripts

**Branch**: `001-sample-circuit-scripts` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sample-circuit-scripts/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create executable TypeScript scripts that programmatically build 4 distinct sample circuits (2-10 components each) using existing ComponentTypes, then export them as JSON files to a test output directory. The scripts will demonstrate different circuit topologies and provide reusable test data for circuit loading, rendering, and simulation features.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: None (core module is dependency-free per constitution)
**Storage**: File system - JSON files written to `output/sample-circuits/` directory
**Testing**: Vitest 4.0+ (existing project test framework)
**Target Platform**: Node.js 18+ (for script execution)
**Project Type**: Single project (library with sample generation scripts)
**Performance Goals**: Script execution < 1 second for all 4 circuits
**Constraints**: Must use only existing Circuit, Component, ENode, Wire APIs; no external circuit definition libraries
**Scale/Scope**: 4 sample circuits, 2-10 components each, using 8 available ComponentTypes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Framework Agnosticism
✅ **PASS** - Scripts are pure TypeScript using only core module APIs. No UI framework dependencies.

### Modular Separation
✅ **PASS** - Scripts will only use `core/` module (Circuit, Component, ENode, Wire). No rendering or playback dependencies required.

### Discrete Boolean Model
✅ **PASS** - Scripts create circuits using existing ComponentTypes that follow the boolean model. No new electrical behavior introduced.

### Data-Driven Circuits
✅ **PASS** - Primary output is JSON files representing circuits. Aligns perfectly with constitution's data-driven principle.

### Specification-Driven Development
✅ **PASS** - Following spec → plan → tasks workflow. Scripts will be testable (verify JSON output validity).

### Developer Experience First
✅ **PASS** - Sample circuits directly improve DX by providing test data. Scripts should include JSDoc and be easily runnable.

### Module Rules
✅ **PASS** - Scripts will import only from `core/` module which has no dependencies.

### Technology Stack
✅ **PASS** - TypeScript (strict mode), ES2022, npm, Vitest - all align with constitution.

### Quality Standards
✅ **PASS** - Scripts will follow no `any` types, include JSDoc, and have test coverage for validation.

**Result**: ALL GATES PASSED - No constitution violations. Proceed to Phase 0.

---

**Re-evaluation after Phase 1 Design** (2025-11-29):

After completing design artifacts (data-model.md, contracts/, quickstart.md), re-checking constitution compliance:

### Framework Agnosticism
✅ **PASS** - Design confirms scripts are pure TypeScript using only core module APIs. No UI framework dependencies introduced in design.

### Modular Separation
✅ **PASS** - Design confirms scripts only use `core/` module. File structure separates scripts in `scripts/samples/` from core library code.

### Discrete Boolean Model
✅ **PASS** - Design uses existing ComponentTypes with no modifications to electrical model.

### Data-Driven Circuits
✅ **PASS** - Design outputs JSON files as specified. Quickstart demonstrates JSON loading pattern.

### Specification-Driven Development
✅ **PASS** - Design includes comprehensive test contracts (execution, validation, unit tests).

### Developer Experience First
✅ **PASS** - Quickstart provides copy-paste examples, clear file locations, and troubleshooting. API contracts include JSDoc examples.

### Module Rules
✅ **PASS** - Design shows imports only from `core/` and Node.js built-ins (fs/promises). No violations.

### Technology Stack
✅ **PASS** - Design uses TypeScript (strict), ES2022, npm script execution, Vitest for testing.

### Quality Standards
✅ **PASS** - Design includes test contracts ensuring testability, no `any` types, JSDoc documentation.

**Post-Design Result**: ALL GATES PASSED - Design maintains full constitution compliance.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
scripts/
└── samples/
    ├── generate-sample-circuits.ts    # Main script orchestrating generation
    ├── circuits/
    │   ├── simple-led-circuit.ts      # Circuit 1: Basic LED with battery (2-3 components)
    │   ├── switch-controlled-led.ts   # Circuit 2: Switch + LED + Battery (3-4 components)
    │   ├── relay-circuit.ts           # Circuit 3: Relay-based control (5-7 components)
    │   └── transistor-circuit.ts      # Circuit 4: Transistor logic (6-10 components)
    └── utils/
        ├── circuit-builder.ts         # Helper functions for circuit construction
        └── file-writer.ts             # JSON file writing utilities

output/
└── sample-circuits/                   # Generated JSON output directory
    ├── simple-led-circuit.json
    ├── switch-controlled-led.json
    ├── relay-circuit.json
    └── transistor-circuit.json

tests/
└── samples/
    ├── circuit-generation.test.ts     # Test script execution and output
    └── json-validation.test.ts        # Test JSON format and loadability
```

**Structure Decision**: Single project structure using existing `src/core/` module. Scripts live in `scripts/samples/` directory to separate them from core library code while maintaining accessibility. Generated JSON files go to `output/sample-circuits/` (excluded from version control). Tests validate both generation process and output quality.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. This section is not applicable.
