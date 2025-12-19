# Implementation Plan: Visual Factory Classes

**Branch**: `005-visual-factory-classes` | **Date**: 2025-12-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-visual-factory-classes/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the ComponentVisualFactory system from function-based factories to class-based factories. Each component type class will encapsulate all visual behaviors (creation, hover, selection, animation) in one place, enabling clean separation of concerns and easy extension of visual behavior per component type. The existing `batteryFactory`, `switchFactory`, and `smallLedFactory` functions will be converted to equivalent class implementations (`BatteryVisualFactory`, `SwitchVisualFactory`, `SmallLEDVisualFactory`), with an abstract `ComponentVisualFactory` base class defining the contract.

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (already installed)
**Storage**: N/A (visual factories are stateless; state resides in Circuit/CircuitRunner instances)
**Testing**: Vitest 3.2+ (existing test suite in tests/scene/shared/)
**Target Platform**: ES2022+ environments (modern browsers, Node 18+)
**Project Type**: Single TypeScript library with modular architecture
**Performance Goals**: 60 fps rendering (must not degrade existing performance)
**Constraints**: No additional dependencies; maintain backward compatibility with IFactoryRegistry
**Scale/Scope**: 3 existing component types + default factory; extensible for future components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Framework Agnosticism | ✅ PASS | Visual factories remain framework-agnostic; only depend on Three.js |
| II. Modular Separation | ✅ PASS | Changes confined to `scene/` module; no contamination of `core/` |
| III. Discrete Boolean Model | ✅ PASS | N/A - visual layer only, no simulation logic changes |
| IV. Data-Driven Circuits | ✅ PASS | N/A - no changes to circuit JSON format |
| V. Specification-Driven Development | ✅ PASS | Will write tests first for new class interface |
| VI. Developer Experience First | ✅ PASS | Will maintain JSDoc documentation for new classes |

**Module Rules Check**:
| Rule | Status |
|------|--------|
| `scene/` may import `core/`, `three` | ✅ PASS |
| `scene/` may NOT import `playback/` | ✅ PASS |
| DOM access via Three.js only | ✅ PASS |

**Quality Standards Check**:
| Standard | Status |
|----------|--------|
| No `any` types | ✅ Will enforce |
| Public APIs have JSDoc | ✅ Will provide |
| Scene module: 60% test coverage minimum | ✅ Will maintain |

**Pre-Design Gate**: ✅ PASS - All constitution checks pass

### Post-Design Constitution Re-Check

_Verified after completing Phase 1 design artifacts._

| Principle | Status | Verification |
|-----------|--------|--------------|
| I. Framework Agnosticism | ✅ CONFIRMED | Design uses only Three.js types; no framework dependencies |
| II. Modular Separation | ✅ CONFIRMED | All changes in `scene/shared/`; `core/` untouched |
| III. Discrete Boolean Model | ✅ CONFIRMED | Animation uses `ComponentState` from core simulation |
| IV. Data-Driven Circuits | ✅ CONFIRMED | No JSON format changes; visuals are runtime-only |
| V. Specification-Driven | ✅ CONFIRMED | Contracts define interface before implementation |
| VI. Developer Experience | ✅ CONFIRMED | Full JSDoc in contracts; quickstart guide provided |

**Module Rules Re-Check**:
- `scene/` imports: `core/Component`, `core/types/ComponentType`, `core/simulation/states/*`, `three` ✅
- No `playback/` imports ✅
- DOM access: Three.js Object3D manipulation only ✅

**Post-Design Gate**: ✅ PASS - Design artifacts comply with all constitution principles

## Project Structure

### Documentation (this feature)

```text
specs/005-visual-factory-classes/
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
├── core/                           # Core simulation logic (NOT MODIFIED)
│   └── ...
├── scene/                          # Three.js visualization (MODIFIED)
│   ├── shared/
│   │   ├── components/                 # NEW: Component factory submodule
│   │   │   ├── ComponentVisualFactory.ts    # NEW: Interface + base class
│   │   │   ├── BatteryVisualFactory.ts      # NEW: Battery factory class
│   │   │   ├── SwitchVisualFactory.ts       # NEW: Switch factory class
│   │   │   └── SmallLEDVisualFactory.ts     # NEW: SmallLED factory class
│   │   ├── FactoryRegistry.ts          # MODIFY: Update to accept class instances
│   │   ├── HoverManager.ts             # UNCHANGED (hover detection)
│   │   ├── types.ts                    # MAY MODIFY: Add visual state types
│   │   └── ...
│   ├── static/
│   │   └── CircuitController.ts      # MAY MODIFY: Integrate visual state methods
│   └── simulation/
│       └── CircuitRunnerController.ts # MAY MODIFY: Integrate animation state methods
├── playback/                       # Scenario orchestration (NOT MODIFIED)
└── ...

tests/
└── scene/
    └── shared/
        ├── FactoryRegistry.test.ts     # MAY MODIFY: Update for class-based factories
        └── ComponentVisualFactory.test.ts  # NEW: Tests for class-based factories
```

**Structure Decision**: Single TypeScript library. All changes are confined to
`src/scene/shared/` for the factory classes, with potential integration updates
in Controllers. Follows existing project architecture.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations - all constitution checks pass._
