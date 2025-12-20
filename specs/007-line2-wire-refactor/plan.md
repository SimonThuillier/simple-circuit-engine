# Implementation Plan: Line2 Wire Refactor

**Branch**: `007-line2-wire-refactor` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-line2-wire-refactor/spec.md`

## Summary

Refactor WireVisualManager to render each wire as a single Line2 object (from three/addons) instead of using THREE.Line with LineBasicMaterial. This provides consistent line width rendering that doesn't change with camera zoom. Each wire (N wires = N Line2 objects) will use LineGeometry for path data and LineMaterial for styling. The change maintains the existing Map<UUID, ...> architecture but changes the value type from THREE.Line to Line2.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed), three/addons/lines/Line2.js, three/addons/lines/LineGeometry.js, three/addons/lines/LineMaterial.js
**Storage**: N/A (in-memory scene state only)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: 60fps rendering, <16ms per wire add/remove operation
**Constraints**: No additional dependencies beyond three.js addons (already bundled with three)
**Scale/Scope**: Typical circuits with 10-100 wires

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | PASS | No framework dependencies; Line2 is a Three.js addon |
| II. Modular Separation | PASS | Changes limited to scene/ module; core/ unchanged |
| III. Discrete Boolean Model | N/A | Rendering-only change, no simulation impact |
| IV. Data-Driven Circuits | PASS | Wire data model unchanged; only visual representation changes |
| V. Specification-Driven Development | PASS | Tests exist and will be updated |
| VI. Developer Experience First | PASS | API remains consistent (Map<UUID, Line2> vs Map<UUID, Line>) |

**Module Rules Check**:
- scene/ importing from three/addons → ALLOWED (three.js is permitted)
- scene/ importing from core/ → ALLOWED (existing pattern)
- No changes to core/ module → COMPLIANT

**No gate violations.** Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/007-line2-wire-refactor/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── scene/
│   ├── shared/
│   │   ├── WireVisualManager.ts    # PRIMARY: Refactor to use Line2
│   │   ├── MaterialUtils.ts        # ADD: createLine2Material helper
│   │   └── types.ts                # UPDATE: Add Line2 type exports if needed
│   └── static/
│       └── CircuitController.ts  # UPDATE: Handle LineMaterial resolution updates

tests/
└── scene/
    └── shared/
        └── WireVisualManager.test.ts  # UPDATE: Adapt tests for Line2
```

**Structure Decision**: Single project structure. Changes affect only the scene/ module, specifically WireVisualManager and related utilities. No new directories needed.
