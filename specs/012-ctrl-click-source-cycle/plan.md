# Implementation Plan: Ctrl+Click Source Type Cycling

**Branch**: `012-ctrl-click-source-cycle` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-ctrl-click-source-cycle/spec.md`

## Summary

Add Ctrl+click interaction to cycle enode sourceType (none → Voltage → Current → none) on branching points and component pins in BuildTool. Visual feedback via color change (white/red/blue) updates immediately. Leverages existing `ENode.source` attribute, `CircuitWriter.saveEditENodeSourceType()`, and `BranchingPointVisualFactory.updateSourceType()`. Requires extending `ComponentVisualFactory` with pin color updates and relaxing `Circuit.updateENodeSourceType()` to support component pins.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed)
**Storage**: N/A (in-memory circuit model, no persistence changes)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: Instant visual feedback (<16ms frame time)
**Constraints**: Must preserve existing click behaviors when Ctrl not held
**Scale/Scope**: Small feature - 4 files modified, ~100 lines added

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Framework Agnosticism | ✅ PASS | Feature is pure TypeScript + Three.js, no UI framework dependencies |
| II. Modular Separation | ✅ PASS | Changes in `scene/` layer only (BuildTool, visual factories), `core/` only for model update |
| III. Discrete Boolean Model | ✅ PASS | sourceType is enum-based (Voltage/Current), not analog |
| IV. Data-Driven Circuits | ✅ PASS | sourceType persisted via existing circuit model |
| V. Specification-Driven Development | ✅ PASS | Spec complete with acceptance scenarios for testing |
| VI. Developer Experience First | ✅ PASS | Extends existing pattern, JSDoc will be added |
| Module Rules (core/) | ✅ PASS | core/Circuit.ts only updates model, no Three.js imports |
| Module Rules (scene/) | ✅ PASS | scene/ imports core/ and Three.js as allowed |
| No `any` types | ✅ PASS | All types are defined (ENodeSourceType, UUID, etc.) |
| Public APIs have JSDoc | ✅ PASS | New methods will include JSDoc |

**Constitution Check Result**: All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/012-ctrl-click-source-cycle/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── Circuit.ts                    # UPDATE: Relax updateENodeSourceType() constraint
│   ├── ENode.ts                      # NO CHANGE: source attribute already exists
│   └── types/ENodeSourceType.ts      # NO CHANGE: enum already defined
│
└── scene/
    ├── shared/
    │   └── components/
    │       ├── BranchingPointVisualFactory.ts   # NO CHANGE: updateSourceType() exists
    │       └── ComponentVisualFactory.ts        # UPDATE: Add updatePinSourceType()
    │
    └── static/
        ├── tools/
        │   └── BuildTool.ts                     # UPDATE: Add Ctrl+click handler
        └── CircuitWriter.ts             # NO CHANGE: saveEditENodeSourceType() exists

tests/
└── scene/
    └── tools/
        └── BuildTool.test.ts                    # UPDATE: Add Ctrl+click tests
```

**Structure Decision**: Single project structure. Changes are localized to existing files following established patterns. No new files required.

## Complexity Tracking

> No Constitution Check violations. Table not applicable.

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design artifacts (research.md, data-model.md, quickstart.md) completed._

| Principle | Status | Post-Design Evidence |
|-----------|--------|----------------------|
| I. Framework Agnosticism | ✅ CONFIRMED | No React/Vue/Angular imports in design |
| II. Modular Separation | ✅ CONFIRMED | core/ changes (Circuit.ts) don't import Three.js; scene/ handles visuals |
| III. Discrete Boolean Model | ✅ CONFIRMED | sourceType cycles through discrete enum values |
| IV. Data-Driven Circuits | ✅ CONFIRMED | Uses existing model persistence path |
| V. Specification-Driven | ✅ CONFIRMED | Tests specified in quickstart.md before implementation |
| VI. Developer Experience | ✅ CONFIRMED | JSDoc specified for all new public methods |
| Module Rules | ✅ CONFIRMED | No cross-layer imports in design |
| No `any` types | ✅ CONFIRMED | All types explicit in data-model.md |
| Public APIs have JSDoc | ✅ CONFIRMED | JSDoc templates in quickstart.md |

**Post-Design Result**: All gates pass. Ready for task generation.
