# Implementation Plan: Multi-Select Tool

**Branch**: `011-multi-select-tool` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-multi-select-tool/spec.md`

## Summary

Implement a new MultiSelectTool that enables users to select multiple circuit elements (components, branching points, wires) via rectangle selection, then perform bulk operations including move, delete, copy/paste, and cut/paste. The tool follows the existing IEditingTool interface pattern established by BuildTool and integrates with the existing SelectionManager's MultiSelectionData type.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (for 3D scene interaction and selection rectangle rendering)
**Storage**: N/A (in-memory circuit model, clipboard is session-only)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+), library mode via Vite 7.2+
**Project Type**: Single library project with scene module for visualization
**Performance Goals**: 30+ FPS during bulk operations with 20 elements, <2s for rectangle selection
**Constraints**: No external state persistence, pure TypeScript library, framework-agnostic
**Scale/Scope**: Typical circuits with 10-50 components; clipboard holds selections up to 100 elements

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | ✅ PASS | Tool is pure TypeScript, no UI framework dependencies |
| II. Modular Separation | ✅ PASS | MultiSelectTool lives in `scene/static/tools/`, depends only on core types |
| III. Discrete Boolean Model | ✅ PASS | Feature is UI/interaction layer, doesn't affect simulation model |
| IV. Data-Driven Circuits | ✅ PASS | Clipboard uses serializable element data, no code generation |
| V. Specification-Driven Development | ✅ PASS | Tests defined per acceptance scenario before implementation |
| VI. Developer Experience First | ✅ PASS | Public APIs will have JSDoc, tool integrates via existing patterns |

**Module Rules Check**:
| Module | Imports | Status |
|--------|---------|--------|
| scene/ | core, three | ✅ PASS - MultiSelectTool imports from core/types and uses Three.js |

**No violations detected. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/011-multi-select-tool/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── types/           # UUID, ComponentType, etc. (existing)
└── scene/
    ├── shared/
    │   ├── types.ts           # ToolType, IEditingTool, MultiSelectionData (extend)
    │   ├── SelectionManager.ts # Add selectMultiple() method
    │   ├── GeometryUtils.ts    # Add bounding box utilities
    │   └── WireVisualManager.ts # Batch wire updates (existing)
    └── static/
        ├── CircuitSceneManager.ts  # Tool registration (existing)
        ├── CircuitEditionManager.ts # Bulk operations (extend)
        └── tools/
            ├── BuildTool.ts      # Reference implementation (existing)
            ├── AddComponentTool.ts # Reference implementation (existing)
            └── MultiSelectTool.ts  # NEW: Main implementation

tests/
└── scene/
    └── static/
        └── tools/
            └── MultiSelectTool.test.ts  # NEW: Test suite
```

**Structure Decision**: Single library project structure. New tool added to existing `scene/static/tools/` directory following BuildTool pattern. Extends existing shared types and managers.

## Complexity Tracking

> No constitution violations to justify.

---

## Phase 0: Research

See [research.md](./research.md) for detailed findings.

## Phase 1: Design

See [data-model.md](./data-model.md) for entity definitions.
See [contracts/](./contracts/) for internal API contracts.
See [quickstart.md](./quickstart.md) for integration guide.
