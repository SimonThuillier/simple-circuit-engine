# Implementation Plan: Circuit Topology Visualizer

**Branch**: `002-topology-visualizer` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-topology-visualizer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a standalone HTML-based circuit topology visualizer that accepts circuit JSON input and displays components, enodes (pins and branching points), and wires as a graph visualization. The visualizer must show shortened UUIDs for all entities, group pins within components, and display branching points as intermediate nodes. Output will be bundled to `output/circuit-topology-visualizer.js` for use with `circuit-topology-visualizer.html`.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: d3-graphviz (Graphviz DOT rendering using D3), d3 (peer dependency)
**Storage**: N/A (client-side only, no persistence)
**Testing**: Vitest 4.0+ (per constitution)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), offline-capable
**Project Type**: Single project (visualization script + HTML page, compiled by project build)
**Performance Goals**: Graph renders in under 3 seconds for circuits with up to 50 components
**Constraints**: Must work offline (all dependencies bundled), file:// protocol compatible, no server required
**Scale/Scope**: Circuits with up to 50 components, 8-character UUID display, DOT-based graph rendering
**Build Note**: Visualizer is complex and will be compiled by this project with its own dependencies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Framework Agnosticism
**Status**: PASS
**Analysis**: Visualizer is a standalone HTML/JS tool with no framework dependencies. Uses vanilla TypeScript/JavaScript for logic and bundled visualization library for rendering.

### ✅ Modular Separation
**Status**: PASS
**Analysis**: This is a separate utility tool, not part of the core/scene/playback modules. Lives in `output/` directory as a standalone debugging tool. Does not violate module boundaries.

### ✅ Discrete Boolean Model
**Status**: N/A
**Analysis**: Visualizer displays circuit topology but does not perform simulation. Reads existing circuit data only.

### ✅ Data-Driven Circuits
**Status**: PASS
**Analysis**: Consumes circuit JSON files produced by Circuit.toJSON() (feature 001). Validates that circuits remain loadable and inspectable without code.

### ✅ Specification-Driven Development
**Status**: PASS
**Analysis**: Test strategy defined in research.md and data-model.md:
- Unit tests: Parser tests (JSON validation, enode classification)
- Unit tests: Graph builder tests (DOT syntax generation)
- Integration tests: End-to-end (JSON → DOT → SVG rendering)
- Test data: Sample circuits from feature 001

### ✅ Developer Experience First
**Status**: PASS
**Analysis**: Tool enhances developer experience by enabling circuit debugging without reading raw JSON. Standalone HTML file makes it immediately usable.

### ✅ Technology Stack
**Status**: PASS
**Analysis**:
- Language: TypeScript (strict mode), ES2022 ✅
- Build: Vite (per constitution) ✅
- Test: Vitest 4.0+ ✅
- Visualization library: d3-graphviz (DOT renderer for browsers) ✅

**Gate Status**: PASS - All technology choices align with constitution.

## Project Structure

### Documentation (this feature)

```text
specs/002-topology-visualizer/
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
└── visualizer/
    ├── src/
    │   ├── parser.ts           # Circuit JSON parsing
    │   ├── graph-builder.ts    # DOT graph generation
    │   ├── renderer.ts          # Graph rendering logic
    │   ├── ui.ts                # Input handling, error display
    │   └── main.ts              # Entry point
    └── circuit-topology-visualizer.html

output/
└── circuit-topology-visualizer.js   # Bundled script

tests/
└── visualizer/
    ├── parser.test.ts
    ├── graph-builder.test.ts
    └── integration.test.ts
```

**Structure Decision**: Single project structure with visualizer code in `scripts/visualizer/` and bundled output in `output/`. Tests follow existing `tests/` structure. Visualizer is a development tool separate from the main library modules (core/scene/playback).

## Complexity Tracking

No constitution violations requiring justification. All gates passed or pending research/verification.

---

## Phase Completion Summary

### Phase 0: Research ✅ COMPLETE

**Deliverables**:
- ✅ research.md - Technology decisions and DOT graph strategy documented

**Key Decisions**:
- Visualization library: d3-graphviz (Graphviz DOT rendering with D3)
- DOT generation: Programmatic from circuit JSON
- Pin grouping: DOT subgraphs with `cluster_` prefix
- UUID display: First 8 characters for all entities
- Build: Vite library mode, IIFE bundle format

### Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables**:
- ✅ data-model.md - Data structures and transformation pipeline
- ✅ contracts/visualizer-api.md - Public API and error handling
- ✅ quickstart.md - User guide and examples
- ✅ CLAUDE.md - Agent context updated with d3-graphviz dependency

**Key Designs**:
- ParsedCircuit structure with component/enode/wire maps
- DOT graph generation pipeline (JSON → Parsed → DOT → SVG)
- CircuitVisualizer class API with error types
- State management (idle/loading/scene/success/error)
- Performance targets validated (<3s for 50 components)

### Constitution Re-Check (Post-Design) ✅ PASS

All constitution gates verified after design phase:
- ✅ Framework Agnosticism: Standalone tool, no framework dependencies
- ✅ Modular Separation: Separate from core/scene/playback modules
- ✅ Specification-Driven Development: Test strategy defined
- ✅ Developer Experience: Enhances debugging workflow
- ✅ Technology Stack: TypeScript + Vite + Vitest + d3-graphviz

**Gate Status**: ALL CLEAR - Ready for Phase 2 (Tasks)

### Next Phase: Tasks (Not Completed by /speckit.plan)

Phase 2 will be executed by `/speckit.tasks` command to generate:
- tasks.md - Implementation task breakdown
- Task dependencies and execution order
- Test requirements for each task

**Ready to proceed**: ✅ Yes - Run `/speckit.tasks` to continue
