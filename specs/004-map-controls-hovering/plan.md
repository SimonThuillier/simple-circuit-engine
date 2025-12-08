# Implementation Plan: Map Controls and Hovering Detection

**Branch**: `004-map-controls-hovering` | **Date**: 2025-12-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-map-controls-hovering/spec.md`

## Summary

Integrate Three.js MapControls for camera navigation (pan, zoom, rotate) and implement priority-based hover detection using dedicated hitbox layers. Both CircuitSceneManager and CircuitRunnerSceneManager will gain these capabilities. Hover detection uses Three.js Raycaster against invisible hitbox meshes organized by layers (enode > component > wire priority).

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed), three/addons/controls/MapControls.js
**Storage**: N/A (stateless managers, no persistence)
**Testing**: Vitest 3.2+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: 60fps rendering, <5ms hover detection for 500 elements
**Constraints**: <16ms frame budget, must not block rendering loop
**Scale/Scope**: Circuits up to 200 elements (target), designed for educational use

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | ✅ PASS | MapControls attaches to HTMLElement via domElement param; event-driven API preserved |
| II. Modular Separation | ✅ PASS | Changes confined to `scene/` module; no core/ modifications needed |
| III. Discrete Boolean Model | ✅ PASS | N/A - this feature is UI/interaction, not simulation |
| IV. Data-Driven Circuits | ✅ PASS | N/A - no circuit data changes |
| V. Specification-Driven Dev | ✅ PASS | Tests will be written alongside implementation |
| VI. Developer Experience | ✅ PASS | Event-based hover API matches existing patterns |

**Module Rules Check**:
| Rule | Status |
|------|--------|
| scene/ may import core, three | ✅ Using existing core types (UUID) and three |
| scene/ may NOT import playback | ✅ No playback imports |
| Resource Management | ✅ dispose() will clean up MapControls and event listeners |
| No global state | ✅ All state scoped to manager instances |

**No violations - proceeding to Phase 0.**

### Post-Design Re-check (Phase 1 Complete)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | ✅ PASS | HoverManager uses callback pattern; no framework coupling |
| II. Modular Separation | ✅ PASS | All new code in scene/shared; imports only core types |
| III. Discrete Boolean Model | ✅ PASS | N/A |
| IV. Data-Driven Circuits | ✅ PASS | N/A |
| V. Specification-Driven Dev | ✅ PASS | Contracts defined before implementation |
| VI. Developer Experience | ✅ PASS | Quickstart guide created; API is intuitive |

**All gates pass post-design.**

## Project Structure

### Documentation (this feature)

```text
specs/004-map-controls-hovering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── HoverManager.ts  # HoverManager interface
│   ├── types.ts         # HoveredElement, layer constants
│   └── MapControlsOptions.ts  # Configuration interface
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── scene/
│   ├── shared/
│   │   ├── types.ts              # [MODIFY] Add HoveredElement type
│   │   ├── HoverManager.ts       # [NEW] Raycasting and hover state
│   │   ├── LayerConstants.ts     # [NEW] Layer definitions (extract from ComponentVisuals.ts)
│   │   └── ComponentVisuals.ts   # [EXISTS] Already has LAYERS enum and hitboxes
│   ├── static/
│   │   └── CircuitSceneManager.ts    # [MODIFY] Add MapControls and HoverManager
│   └── simulation/
│       └── CircuitRunnerSceneManager.ts  # [MODIFY] Add MapControls and HoverManager

tests/
├── scene/
│   ├── shared/
│   │   └── HoverManager.test.ts  # [NEW] Unit tests for hover detection
│   ├── static/
│   │   └── CircuitSceneManager.test.ts  # [MODIFY] Add MapControls/hover tests
│   └── simulation/
│       └── CircuitRunnerSceneManager.test.ts  # [MODIFY] Add tests
```

**Structure Decision**: Single library project. New code goes in `src/scene/shared/` for reuse by both static and simulation managers. The existing LAYERS enum in ComponentVisuals.ts will be extracted to a shared LayerConstants.ts file.

## Complexity Tracking

> No violations to justify - all gates passed.

_No complexity tracking needed._
