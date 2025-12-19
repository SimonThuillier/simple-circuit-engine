# Implementation Plan: Wire Tool & Branching Point Visual

**Branch**: `008-wire-tool-branching` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-wire-tool-branching/spec.md`

## Summary

Implement a unified WireTool that handles wire creation between enodes, branching point insertion via double-click on wires, intermediate point manipulation via single-click drag on wires, and branching point sourceType cycling via double-click on branching points. Add cone-shaped visual rendering for branching point enodes with color based on sourceType (white/red/blue).

## Technical Context

**Language/Version**: TypeScript 5.9+ (strict mode), targeting ES2022
**Primary Dependencies**: Three.js 0.181+ (Line2, LineGeometry, LineMaterial from addons)
**Storage**: N/A (in-memory circuit model, Wire.intermediatePositions already exists)
**Testing**: Vitest 4.0+
**Target Platform**: Modern browsers (ES2022+)
**Project Type**: Single library project
**Performance Goals**: 30fps minimum during wire preview updates
**Constraints**: Grid snapping for all positions, 10px screen-space proximity threshold
**Scale/Scope**: Single-user interactive circuit editor

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| Framework Agnosticism | ✅ PASS | WireTool is pure TypeScript, no framework deps |
| Modular Separation | ✅ PASS | WireTool in `scene/`, core model unchanged |
| Module Import Rules | ✅ PASS | scene → core only, no reverse imports |
| Discrete Boolean Model | ✅ PASS | sourceType (voltage/current) fits boolean model |
| Data-Driven Circuits | ✅ PASS | Wire.intermediatePositions persisted as JSON |
| Spec-Driven Development | ✅ PASS | Tests from acceptance scenarios |
| Developer Experience | ✅ PASS | Follows existing tool patterns |
| Public API Shape | ✅ PASS | Event-based communication |
| No `any` types | ✅ PASS | Strong typing throughout |

**All gates pass. Proceeding with implementation.**

## Project Structure

### Documentation (this feature)

```text
specs/008-wire-tool-branching/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal APIs)
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── ENode.ts                    # ENode class (already has sourceType)
│   ├── Wire.ts                     # Wire class (already has intermediatePositions)
│   ├── Circuit.ts                  # Circuit class (needs addBranchingPoint, splitWire)
│   └── types/
│       ├── ENodeType.ts            # ENodeType enum (BranchingPoint exists)
│       └── ENodeSourceType.ts      # ENodeSourceType enum (exists)
│
├── scene/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ComponentVisualFactory.ts     # Base factory (reference)
│   │   │   └── BranchingPointVisualFactory.ts # NEW: Cone visual for branching points
│   │   ├── HoverManager.ts                   # Hover detection (use existing)
│   │   ├── WireVisualManager.ts              # Wire rendering (extend for updates)
│   │   ├── SelectionManager.ts               # Selection handling (use existing)
│   │   └── GeometryUtils.ts                  # Grid snapping (use existing)
│   │
│   └── static/
│       ├── tools/
│       │   ├── WireTool.ts                   # EXTEND: Full implementation
│       │   └── BranchingPointTool.ts         # May merge into WireTool or keep separate
│       ├── CircuitController.ts            # Scene orchestration (minor updates)
│       └── CircuitWriter.ts          # Model persistence (extend for wires)

tests/
├── scene/
│   ├── tools/
│   │   └── WireTool.test.ts                  # NEW: Tool tests
│   ├── shared/
│   └── components/
│         └── BranchingPointVisualFactory.test.ts # NEW: Visual tests
```

**Structure Decision**: Single project structure per constitution. New code added to existing `scene/` module following established patterns (PositionTool as reference).

## Complexity Tracking

No constitution violations. All implementation fits within established patterns.

## Key Implementation Decisions

### 1. Tool Architecture

The spec mentions both WireTool and BranchingPointTool. Based on FR-002 ("unified WireTool"), we will:
- **Extend WireTool** to handle all wire and branching point operations
- **BranchingPointTool** becomes deprecated/removed (or kept as alias)
- Single tool reduces mode switching complexity

### 2. State Machine for WireTool

```
┌─────────────────────────────────────────────────────────────────┐
│                         IDLE                                     │
│   - single-click on enode → WIRE_CREATING (source selected)     │
│   - single-click on wire → DRAGGING (intermediate point)        │
│   - double-click on wire → create branching point               │
│   - double-click on branching point → cycle sourceType          │
│   - double-click on empty → create standalone branching point   │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  WIRE_CREATING  │  │    DRAGGING     │  │   (immediate)   │
│                 │  │                 │  │                 │
│ - click enode   │  │ - move cursor   │  │ No state change │
│   → create wire │  │   → update pos  │  │ (model updated) │
│ - click empty   │  │ - release       │  │                 │
│   → create BP   │  │   → commit      │  │                 │
│   + wire        │  │ - Escape        │  │                 │
│ - Escape → IDLE │  │   → revert      │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3. Visual Factory for Branching Points

Create `BranchingPointVisualFactory` following `ComponentVisualFactoryBase` pattern:
- Cone geometry (ConeGeometry from Three.js)
- Hitbox on `HitboxLayers.ENODE` (highest priority)
- Color based on `sourceType`: white (null), red ("voltage"), blue ("current")
- Hover/selection via brightness shift (emissive)

### 4. Wire Preview During Creation

Use existing WireVisualManager pattern:
- Create temporary Line2 for preview
- Update on `gridPositionMove` events
- Remove on commit or cancel

### 5. Intermediate Point Detection

Screen-space proximity (10px) requires:
- Project intermediate positions to screen coordinates
- Compare with mouse position
- Use `camera.project()` from Three.js

---

## Post-Design Constitution Re-Check

_Verified after Phase 1 design completion._

| Principle | Status | Verification |
|-----------|--------|--------------|
| Framework Agnosticism | ✅ PASS | No UI framework dependencies in design |
| Modular Separation | ✅ PASS | core/ extended with model methods only; scene/ handles all visuals |
| Module Import Rules | ✅ PASS | BranchingPointVisualFactory imports from core/; no reverse deps |
| Discrete Boolean Model | ✅ PASS | sourceType uses enum values, not analog |
| Data-Driven Circuits | ✅ PASS | All state persisted via existing JSON schemas |
| Spec-Driven Development | ✅ PASS | Tests defined in quickstart.md before implementation |
| Developer Experience | ✅ PASS | Follows PositionTool pattern exactly |
| Public API Shape | ✅ PASS | Events: wireCreated, branchingPointCreated, etc. |
| No `any` types | ✅ PASS | All types defined in contracts |

**Post-design verification: All gates pass. Ready for task generation.**
