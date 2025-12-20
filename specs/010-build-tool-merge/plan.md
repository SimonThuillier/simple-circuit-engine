# Implementation Plan: Build Tool Merge

**Branch**: `010-build-tool-merge` | **Date**: 2025-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-build-tool-merge/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Consolidate four existing tools (PositionTool, WireTool, DeleteTool, BranchingPointTool) into a single BuildTool that unifies all circuit editing operations: wire creation, element positioning/rotation, deletion, and branching point management. This refactoring simplifies the tool architecture while maintaining all existing functionality and improving user experience through unified interaction patterns.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (for 3D scene interaction)
**Storage**: N/A (in-memory circuit model, no persistence changes)
**Testing**: Vitest 4.0+
**Target Platform**: ES2022+ browsers with WebGL support
**Project Type**: Single library project (simple-circuit-engine)
**Performance Goals**: Real-time interaction (maintain <16ms frame budget for 60fps during drag operations)
**Constraints**: Must preserve all existing tool functionality; no breaking changes to CircuitController API
**Scale/Scope**: Single BuildTool class replacing 4 tool classes (~900 lines total → ~1200 lines consolidated)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### ✅ Framework Agnosticism
- **Status**: PASS
- **Rationale**: BuildTool is a pure TypeScript class within the scene/ module. No UI framework dependencies.

### ✅ Modular Separation
- **Status**: PASS
- **Rationale**: BuildTool resides in `src/scene/static/tools/` and depends only on core/ (Circuit, Component, Wire models) and Three.js. No playback/ dependencies.

### ✅ Discrete Boolean Model
- **Status**: N/A
- **Rationale**: This feature does not modify the electrical simulation model.

### ✅ Data-Driven Circuits
- **Status**: PASS
- **Rationale**: Tool refactoring does not change circuit JSON format or serialization.

### ✅ Specification-Driven Development
- **Status**: PASS
- **Rationale**: Spec-first approach followed. Tests will be updated to cover BuildTool before implementation.

### ✅ Developer Experience First
- **Status**: PASS
- **Rationale**: Consolidated tool simplifies API surface. JSDoc will document all public methods. Tool switching becomes simpler (only 'build' vs 'addComponent').

### ✅ Module Rules
- **Status**: PASS
- **Rationale**: BuildTool in scene/ may import from core/ and three. Does not import playback/.

### ✅ Public API Shape
- **Status**: PASS
- **Rationale**: IEditingTool interface maintained. Event-based communication preserved. ToolType enum updated but remains backward compatible with CircuitController.

### ✅ Resource Management
- **Status**: PASS
- **Rationale**: BuildTool follows same lifecycle as existing tools (onActivate/onDeactivate cleanup).

### ✅ Quality Standards
- **Status**: PASS
- **Rationale**: Strict TypeScript enforced. JSDoc required. Test coverage target: 60% for scene/ module (tool integration tests + unit tests for complex state transitions).

## Project Structure

### Documentation (this feature)

```text
specs/010-build-tool-merge/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (tool consolidation patterns)
├── data-model.md        # Phase 1 output (BuildToolMode state machine)
├── quickstart.md        # Phase 1 output (migration guide for tool users)
├── contracts/           # Phase 1 output (IEditingTool contract validation)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
src/
├── core/                           # No changes (Circuit, Component, Wire models)
├── scene/
│   ├── shared/
│   │   └── types.ts                # UPDATE: ToolType = 'build' | 'addComponent'
│   └── static/
│       ├── CircuitController.ts  # UPDATE: Tool registration and factory
│       └── tools/
│           ├── BuildTool.ts        # NEW: Consolidated tool
│           ├── AddComponentTool.ts # KEEP: Unchanged
│           ├── PositionTool.ts     # DELETE: Merged into BuildTool
│           ├── WireTool.ts         # DELETE: Merged into BuildTool
│           ├── DeleteTool.ts       # DELETE: Merged into BuildTool
│           └── BranchingPointTool.ts # DELETE: Merged into BuildTool

tests/
├── scene/
│   └── tools/
│       ├── BuildTool.test.ts       # NEW: Comprehensive tests
│       ├── PositionTool.test.ts    # DELETE: Migrate to BuildTool.test.ts
│       ├── WireTool.test.ts        # DELETE: Migrate to BuildTool.test.ts
│       ├── DeleteTool.test.ts      # DELETE: Migrate to BuildTool.test.ts
│       └── BranchingPointTool.test.ts # DELETE: Migrate to BuildTool.test.ts
```

**Structure Decision**: Single project structure maintained. This is a refactoring within the scene/ module, consolidating 4 tool implementations into 1 unified BuildTool class. No new modules or architectural layers introduced.

## Complexity Tracking

> **Not applicable**: No constitution violations. This refactoring simplifies the codebase by reducing 4 tool classes to 1, with no new dependencies or architectural complexity.
