# Implementation Plan: Add Component Tool

**Branch**: `009-add-component-tool` | **Date**: 2025-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-add-component-tool/spec.md`

## Summary

Implement the AddComponentTool to enable circuit designers to place components on the canvas. The tool provides component type selection from FactoryRegistry, semi-transparent ghost preview with grid snapping, scroll-to-rotate functionality, bounding box overlap detection, and click-to-place workflow. Includes convenience features for selecting and deleting existing components via keyboard.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed)
**Storage**: N/A (in-memory circuit model)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: Ghost preview updates at 30+ fps, component placement < 100ms
**Constraints**: Must follow IEditingTool interface pattern, integrate with existing CircuitSceneManager and CircuitEditionManager

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | PASS | Tool is pure TypeScript, no UI framework dependencies |
| Modular Separation | PASS | Tool lives in `scene/static/tools/`, uses core Circuit via CircuitSceneManager |
| Module Import Rules | PASS | Tool imports only from core/ and three, not from playback/ |
| No `any` types | PASS | Will use strict typing throughout |
| Public APIs have JSDoc | PASS | Will document all public methods |
| Event-based communication | PASS | Uses existing SceneManagerEvent system (toolOperationCompleted, etc.) |

**Post-Phase 1 Re-check**: All gates still PASS. Design artifacts (data-model.md, quickstart.md) confirm:
- No framework dependencies introduced
- All new methods follow existing patterns (CircuitEditionManager, CircuitSceneManager)
- Events use established SceneManagerEventMap types
- Data model uses existing core types (Position, Rotation, ComponentType)

## Project Structure

### Documentation (this feature)

```text
specs/009-add-component-tool/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── scene/
│   ├── static/
│   │   ├── tools/
│   │   │   └── AddComponentTool.ts    # Main tool implementation (UPDATE)
│   │   ├── CircuitSceneManager.ts     # Add addComponent() method (UPDATE)
│   │   └── CircuitEditionManager.ts   # Add saveAddComponent() method (UPDATE)
│   └── shared/
│       ├── FactoryRegistry.ts         # Already exists (READ ONLY)
│       ├── types.ts                   # May need updates for new events (UPDATE)
│       └── components/
│           └── ComponentVisualFactory.ts  # Use for ghost preview (READ ONLY)
└── core/
    └── Circuit.ts                     # Use addComponent() method (READ ONLY)

tests/
├── scene/
│   └── static/
│       └── tools/
│           └── AddComponentTool.test.ts  # Unit tests (CREATE)
```

**Structure Decision**: Single project structure. AddComponentTool extends existing tool system in `src/scene/static/tools/`. No new directories needed.

## Complexity Tracking

No constitution violations. Implementation uses existing patterns.
