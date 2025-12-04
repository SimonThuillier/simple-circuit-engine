# Specification Changelog - Tool System Integration

**Date**: 2025-12-02
**Trigger**: User added detailed tool-based acceptance scenarios to US2

---

## Summary of Changes

Updated `spec.md` to incorporate comprehensive tool system requirements based on the detailed US2 acceptance scenarios. Added 13 new functional requirements (FR-025 to FR-037) and updated existing requirements to clarify the tool architecture.

---

## Functional Requirements Changes

### Updated Requirements

**FR-006** (Updated)
- **Before**: "Static renderer MUST support read-only view AND edit mode through a editMode flag: edit mode will activate manipulation of circuit topology"
- **After**: Added clarification about tool system activation and deactivation when edit mode is toggled

**FR-007** (Updated)
- **Before**: Generic validation statement without tool context
- **After**: Clarified separation between tool-specific validation (renderer) and circuit-specific validation (core)

**FR-019** (Expanded)
- **Before**: Listed 7 core public API methods
- **After**: Added 7 tool-related methods for CircuitSceneManager: setEditMode(), setActiveTool(), getActiveTool(), cancelCurrentToolOperation(), handleToolClick(), handleToolHover(), handleToolScroll()

**FR-021** (Clarified)
- **Before**: Stated renderers MUST NOT implement event listeners
- **After**: Added clarifying note explaining consumer-renderer interaction pattern for tool system

### New Requirements

#### Tool System Architecture (FR-025 to FR-029)

**FR-025**: Tool Registry Interface
- Defines common tool interface: onActivate(), onDeactivate(), getCursorType(), getPreviewState()
- Allows consumer registration of tool implementations

**FR-026**: Single Active Tool Constraint
- Enforces only one tool active at a time
- Auto-deactivates previous tool when new tool activated

**FR-027**: Tool State Management
- Maintains active tool reference and tool-specific operation state
- Provides query methods for current tool state
- Resets tool state when edit mode disabled

**FR-028**: Tool Activation API
- Exposes setActiveTool(toolType) method
- Emits 'toolActivated' event on successful activation
- Allows tool switching when active tool is idle (no operation in progress)

**FR-029**: Standard Tool Set
- Defines 5 core editing tools with their interaction patterns:
  - **Select**: click to select, drag to move, double-click to rotate
  - **PlaceComponent**: palette choose type, click to place, scroll to rotate before placement
  - **Wire**: click source pin/branching point, click target, Escape to cancel
  - **BranchingPoint**: click on wire to split and insert branching point
  - **Delete**: click component/wire/branching point to delete

#### Tool Operations (FR-030 to FR-033)

**FR-030**: Tool Preview Rendering
- PlaceComponent: ghost preview with rotation
- Wire: path preview from source to cursor
- Previews must be visually distinct (semi-transparent, different color)

**FR-031**: Tool Operation Cancellation
- Multi-step tools (Wire) support cancellation
- Exposes cancelCurrentToolOperation() method
- Wire tool cancels mid-wire operations

**FR-032**: Tool-Specific Validation
- PlaceComponent: bounding box overlap check on X/Y axis
- Wire: endpoint must be valid pin or branching point
- BranchingPoint: target must be valid wire
- Delete: component deletion cascades to pins
- Validation failures emit 'toolValidationError' event (no exceptions)

**FR-033**: Tool-Circuit Integration
- Tools delegate all circuit topology modifications to core Circuit API
- SceneManager MUST NOT implement circuit logic
- After successful operation, calls update(changedData) with delta

#### Tool Events and Feedback (FR-034 to FR-037)

**FR-034**: Tool Event Emission
- New events: 'toolActivated', 'toolDeactivated', 'toolOperationStarted', 'toolOperationCompleted', 'toolOperationCancelled', 'toolValidationError'
- Each event includes relevant payload (toolType, operationData, changedData, errorMessage)

**FR-035**: Tool Cursor Communication
- Emits 'cursorChangeRequested' event on tool activation
- Updates cursor during tool operations (e.g., 'not-allowed' for invalid placement)

**FR-036**: Validation Feedback Mechanism
- Visual feedback for validation failures:
  - Briefly highlights conflicting elements
  - Shows preview in error state (red tint)
  - Emits 'toolValidationError' event for UI messaging

**FR-037**: Tool-Triggered Circuit Updates
- Defines 4-step update process after successful tool operation
- Updates MUST complete within 100ms (SC-005 performance target)

---

## Testing Strategy Changes

### New Testing Requirements

**TS-007**: Tool System Functionality Tests
- Tool activation/deactivation (FR-026)
- Single-active-tool constraint (FR-026)
- Tool state management (FR-027)
- Tool preview rendering (FR-030)
- Tool operation cancellation (FR-031)
- Tool-specific validation (FR-032)
- Tool event emission (FR-034)

**TS-008**: Individual Tool Tests
- Select tool: selection, drag, rotation
- PlaceComponent tool: preview, rotation, placement, overlap validation
- Wire tool: source selection, path preview, target selection, cancellation
- BranchingPoint tool: wire targeting, insertion
- Delete tool: component cascade, wire, branching point deletion

**TS-004** (Updated)
- Added verification of CircuitSceneManager tool-related methods (per FR-019)

---

## Key Entities Changes

### New Entities

**Editing Tool**
- Abstraction for circuit editing operations (Select, PlaceComponent, Wire, BranchingPoint, Delete)
- Implements common interface (onActivate, onDeactivate, getCursorType, getPreviewState)
- Manages tool-specific operation state
- Delegates circuit modifications to core Circuit API

**Tool State**
- Runtime state for active tool
- Tracks operation-in-progress
- Stores preview objects
- Contains tool-specific data (wire source endpoint, component placement rotation)
- Reset when edit mode disabled

**Tool Preview**
- Visual representation of tool operations in progress
- PlaceComponent ghost preview
- Wire path preview
- Rendered semi-transparently
- Visually distinct from actual circuit elements
- Updated on tool hover interactions

### Updated Entities

**Circuit SceneManager (Static)**
- Added note: "Manages tool system for editing operations (FR-025 to FR-037)"

---

## Impact on Contracts

The following contract files will need updates (per analysis.md):

### types.ts
- Extend `RenderEvent` type with 6 new tool-related events
- Add to `RenderEventMap` with proper payloads
- Add new types: `ToolType`, `CursorType`, `IEditingTool` interface

### CircuitSceneManager.ts
- Add 7 new method signatures:
  - `setEditMode(enabled: boolean): void`
  - `setActiveTool(toolType: ToolType): void`
  - `getActiveTool(): ToolType | null`
  - `cancelCurrentToolOperation(): void`
  - `handleToolClick(worldPosition: THREE.Vector3): void`
  - `handleToolHover(worldPosition: THREE.Vector3): void`
  - `handleToolScroll(delta: number): void`

---

## Impact on Tasks

### Phase 5: US2 Editing (T055-T063) Requires Regeneration

**Current tasks** (9 tasks):
- Generic interaction handler tasks that conflict with FR-021 (renderer doesn't implement event listeners)
- Missing tool system architecture tasks
- Missing individual tool implementation tasks

**Required updates** (~18 new tasks):
- Tool system architecture tests and implementation (3-4 tasks)
- Individual tool tests (5 tasks, one per tool)
- Individual tool implementations (5 tasks, one per tool)
- Tool preview rendering tests and implementation (2 tasks)
- Tool validation and feedback tests and implementation (2 tasks)
- Tool-circuit integration tests and implementation (1-2 tasks)

**Note**: Phase 6 tasks (T064-T072) will need renumbering to avoid conflicts

---

## Scope Clarifications

Based on updated analysis.md:

**IN SCOPE**:
- Tool state management during active operations
- Tool cancellation (e.g., Escape during wire placement) - AS2.4
- Switching tools when the active tool is idle (no operation in progress)
- Tool preview rendering
- Tool-specific validation

**OUT OF SCOPE**:
- Rollback/undo of completed actions
- Interrupting one tool at the middle of one operation to switch to another
- Component palette UI (consumer responsibility)
- Tool selection UI (consumer responsibility - calls setActiveTool())

---

## Constitution Compliance

All 5 gates PASS with tool system additions:

✅ **Gate 1: Framework Agnosticism** - Tool system maintains separation: consumer implements event listeners, renderer exposes tool APIs. Three.js remains only rendering dependency.

✅ **Gate 2: Modular Separation** - Tools are part of CircuitSceneManager module, not core. Clear boundary: tools handle UI interaction, core handles circuit validation.

✅ **Gate 3: Public API Shape** - FR-019 updated with complete tool API surface

✅ **Gate 4: Resource Management** - Tool state cleanup handled by dispose() and edit mode disable. Preview objects disposed with tool deactivation.

✅ **Gate 5: Quality Standards** - TS-007 and TS-008 ensure tool system testable with TDD approach

---

## Next Steps

1. ✅ **Spec Updated** - spec.md now includes FR-025 to FR-037
2. ⏭️ **Update Contracts** - Update types.ts and CircuitSceneManager.ts with tool APIs
3. ⏭️ **Regenerate Tasks** - Replace Phase 5 tasks (T055-T063) with ~18 new tool-focused tasks
4. ⏭️ **Update Plan** - Update plan.md to include tool system in implementation approach
5. ⏭️ **Update Quickstart** - Add tool system usage examples to quickstart.md

---

## Files Modified

- ✅ `specs/003-threejs-rendering/spec.md` - Added FR-025 to FR-037, updated FR-006, FR-007, FR-019, FR-021, added TS-007, TS-008, added 3 new key entities
- ✅ `specs/003-threejs-rendering/analysis.md` - User updated scope clarifications
- ✅ `specs/003-threejs-rendering/CHANGELOG.md` - This file (created)

## Files Pending Updates

- ⏭️ `specs/003-threejs-rendering/contracts/types.ts` - Add tool-related types and events
- ⏭️ `specs/003-threejs-rendering/contracts/CircuitSceneManager.ts` - Add tool-related method signatures
- ⏭️ `specs/003-threejs-rendering/tasks.md` - Regenerate Phase 5 tasks
- ⏭️ `specs/003-threejs-rendering/plan.md` - Add tool system to implementation approach
- ⏭️ `specs/003-threejs-rendering/quickstart.md` - Add tool system usage examples
