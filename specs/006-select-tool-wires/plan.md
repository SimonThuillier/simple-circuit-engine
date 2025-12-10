# Implementation Plan: Select Tool & Wire Visual Improvements

**Branch**: `006-select-tool-wires` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-select-tool-wires/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the first circuit editing tool (Select) enabling users to select, drag/move, and rotate components on the 3D scene. Concurrently improve wire visual management to target actual pin positions (not component centers), follow pins during component movement/rotation, and support multi-segment rendering via intermediatePositions waypoints.

## Technical Context

**Language/Version**: TypeScript (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed)
**Storage**: N/A (in-memory circuit model, no persistence changes)
**Testing**: Vitest 4.0+
**Target Platform**: ES2022+ environments (modern browsers)
**Project Type**: Single library project with demo
**Performance Goals**: 60 fps during drag operations, wire updates within same frame as component position changes
**Constraints**: No external dependencies beyond Three.js for scene module; core module remains dependency-free
**Scale/Scope**: Single-component selection, circuits with up to 100+ components and wires

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Check (Phase 0)

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | ✅ PASS | No UI framework dependencies; pure Three.js + event-driven API |
| Modular Separation | ✅ PASS | SelectTool lives in `scene/static/tools/`; wire rendering in `scene/`; no core/ contamination |
| Module Import Rules | ✅ PASS | scene/ imports only core/ and three; no playback/ dependencies |
| Public API Shape | ✅ PASS | Event-based communication (select/deselect events already defined) |
| Resource Management | ✅ PASS | Selection state scoped to scene manager instance |
| No `any` Types | ✅ PASS | Will use strict TypeScript throughout |
| Test Coverage | ✅ PASS | Scene module requires 60% minimum; will add tests for new functionality |

### Post-Design Check (Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | ✅ PASS | SelectionManager and WireVisualManager are pure TypeScript + Three.js |
| Modular Separation | ✅ PASS | New files in scene/shared/ follow existing patterns; core/ unchanged |
| Module Import Rules | ✅ PASS | Contracts reference core types appropriately; no circular dependencies |
| Public API Shape | ✅ PASS | New events (selectionChange, dragStart, etc.) follow existing EventEmitter pattern |
| Resource Management | ✅ PASS | SelectionManager.dispose() and WireVisualManager.dispose() defined in contracts |
| No `any` Types | ✅ PASS | All contracts use proper TypeScript types |
| Test Coverage | ✅ PASS | Test files specified for SelectionManager, WireVisualManager, SelectTool |

## Project Structure

### Documentation (this feature)

```text
specs/006-select-tool-wires/
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
├── core/                           # No changes (dependency-free domain model)
│   ├── Component.ts                # Existing - position/rotation already mutable
│   ├── Wire.ts                     # Existing - intermediatePositions already supported
│   └── ENode.ts                    # Existing - getPosition() already available
│
├── scene/
│   ├── shared/
│   │   ├── components/
│   │   │   └── ComponentVisualFactory.ts  # MODIFY: Implement applySelection/removeSelection
│   │   ├── SelectionManager.ts            # NEW: Centralized selection state management
│   │   ├── WireVisualManager.ts           # NEW: Wire rendering with pin positions & waypoints
│   │   └── GeometryUtils.ts               # MODIFY: Enhance wire path geometry if needed
│   │
│   └── static/
│       ├── CircuitSceneManager.ts         # MODIFY: Integrate SelectionManager, wire updates
│       └── tools/
│           └── SelectTool.ts              # MODIFY: Implement select/drag/rotate functionality
│
tests/
├── scene/
│   ├── shared/
│   │   ├── SelectionManager.test.ts           # NEW: SelectionManager unit tests
│   │   └── WireVisualManager.test.ts          # NEW: Wire rendering tests
│   └── static/
│       └── tools/     
              └── SelectTool.test.ts           # MODIFY: implement actual SelectTool unit tests
```

**Structure Decision**: Single library project following existing patterns. New functionality integrates into existing `scene/` module hierarchy. SelectionManager and WireVisualManager are new shared utilities. SelectTool extends the existing tool system in `scene/static/tools/`.

## Complexity Tracking

> No constitution violations detected. All gates pass.
