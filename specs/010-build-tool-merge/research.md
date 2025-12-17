# Research: Build Tool Merge

**Feature**: 010-build-tool-merge
**Date**: 2025-12-17
**Purpose**: Document architectural decisions and patterns for consolidating 4 editing tools into a single BuildTool

## Overview

This research focuses on the best practices for merging multiple specialized tools (PositionTool, WireTool, DeleteTool, BranchingPointTool) into a unified BuildTool that maintains all existing functionality while improving code maintainability and user experience.

## Decision 1: State Machine Architecture

### Context
BuildTool must handle multiple interaction modes: wire creation, element dragging, wire point dragging, and branching point dragging. These modes have different event handlers and state requirements.

### Decision
Use a mode-based state machine with explicit state tracking and mode transitions.

### Rationale
1. **Clarity**: Each mode has clearly defined entry/exit conditions and allowed actions
2. **Safety**: Prevents invalid state combinations (e.g., dragging while creating wire)
3. **Existing Pattern**: WireTool already uses this pattern successfully with `WireToolMode` type
4. **Testability**: State machines are easy to test with state transition tables

### Implementation Approach
```typescript
type BuildToolMode =
  | 'idle'
  | 'wire_creation'
  | 'component_drag'
  | 'wire_point_dragging'
  | 'bp_drag';

class BuildTool implements IEditingTool {
  private mode: BuildToolMode = 'idle';
  // State-specific data stored in separate interface types
  private wireCreatingState: WireCreatingState | null = null;
  private elementDragState: DragState | null = null;
  // ... etc
}
```

### Alternatives Considered
- **Command Pattern**: Encapsulate each action as a command object
  - **Rejected**: Adds unnecessary abstraction for relatively simple tool logic
- **Behavior Delegation**: Separate handler classes for each mode
  - **Rejected**: Would split implementation across multiple files, losing cohesion

## Decision 2: Event Handler Consolidation Strategy

### Context
Four tools have overlapping event handlers (pointerdown, pointerup, pointermove, keydown, dblclick). BuildTool must decide which action to take based on context.

### Decision
Use a **disambiguation router pattern** in event handlers that checks mode and hover state to route to appropriate handler method.

### Rationale
1. **Single Entry Point**: All pointerdown events go through one handler that routes appropriately
2. **Priority System**: Clear priority order (e.g., enode > selected element > wire > empty)
3. **Maintainability**: All routing logic visible in one place
4. **Existing Pattern**: WireTool.handlePointerDown already demonstrates this successfully

### Implementation Approach
```typescript
handlePointerDown(event: MouseEvent): void {
  if (event.button !== 0) return; // Only left click

  const hoveredElement = this._sceneManager.getHoveredElement();
  const selection = this._sceneManager.getSelectionManager().getSelection();

  // Priority 1: Enode (start wire creation)
  if (hoveredElement?.type === 'enode') {
    this.startWireCreation(hoveredElement.id);
    return;
  }

  // Priority 2: Selected element (start drag)
  if (selection && hoveredElement && hoveredElement.id === selection.id) {
    this.startElementDrag(selection);
    return;
  }

  // Priority 3: Wire (drag intermediate point)
  if (hoveredElement?.type === 'wire') {
    this.handleWireClick(hoveredElement.id, event);
    return;
  }

  // Priority 4: Empty space (no action in build tool)
  // Future: Could add selection box here
}
```

### Alternatives Considered
- **Chain of Responsibility**: Pass event through chain of handlers
  - **Rejected**: Harder to debug, implicit execution order
- **Strategy Pattern**: Select strategy based on mode
  - **Rejected**: Overkill for event routing, better suited for complex algorithms

## Decision 3: Double-Click Conflict Resolution

### Context
Double-click on component should rotate it, but double-click on wire/empty creates branching point. Need to disambiguate.

### Decision
Use **target type priority** with component selection state check:
1. Component (selected or unselected) → rotate + select
2. Wire → create branching point on wire
3. Empty space → create standalone branching point

### Rationale
1. **User Intent**: User clicking on visible element clearly intends to act on that element
2. **Consistency**: Matches single-click priority (element under cursor takes precedence)
3. **Clarified in Spec**: Spec explicitly addresses unselected component case

### Implementation Approach
```typescript
handleDblClick(event: MouseEvent): void {
  const hoveredElement = this._sceneManager.getHoveredElement();

  // Priority 1: Component (rotate)
  if (hoveredElement?.type === 'component') {
    this.selectAndRotateComponent(hoveredElement.id);
    return;
  }

  // Priority 2: Wire (create branching point)
  if (hoveredElement?.type === 'wire') {
    this.createBranchingPointOnWire(hoveredElement.id, position);
    return;
  }

  // Priority 3: Empty space (create standalone branching point)
  this.createStandaloneBranchingPoint(position);
}
```

### Alternatives Considered
- **Mode-Dependent**: Change double-click behavior based on current mode
  - **Rejected**: Confusing for users (same action produces different results)
- **Modifier Keys**: Require Shift+DblClick for branching points
  - **Rejected**: Adds complexity, not requested in spec

## Decision 4: Deletion Scope Expansion

### Context
Original spec mentioned "wires, branching points, and other deletable elements" but was ambiguous. Clarification determined components should also be deletable via BuildTool.

### Decision
BuildTool handles deletion of **all circuit elements**: components, wires, branching points (and their cascading effects).

### Rationale
1. **Unified UX**: User doesn't need to switch tools to delete different element types
2. **Consistency**: If building circuits with one tool, deleting with same tool is intuitive
3. **Existing Logic**: AddComponentTool already has component deletion logic that can be reused/moved

### Implementation Approach
```typescript
handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const selection = this._sceneManager.getSelectionManager().getSelection();
    if (!selection) return;

    switch (selection.type) {
      case 'component':
        this._sceneManager.removeComponent(selection.id);
        break;
      case 'wire':
        this._sceneManager.removeWire(selection.id);
        break;
      case 'enode': // Branching point
        if (!selection.data.componentId) { // Only standalone branching points
          this._sceneManager.removeBranchingPoint(selection.id);
        }
        break;
    }
  }

  // Other keys (Escape, R) handled in same method
}
```

### Alternatives Considered
- **Keep Split**: Components deleted by AddComponentTool, wires/BPs by BuildTool
  - **Rejected**: Violates unified UX goal stated in clarification
- **Delete Confirmation**: Prompt before deletion
  - **Rejected**: Not in requirements, adds friction to common operation

## Decision 5: Code Migration Strategy

### Context
Need to merge ~900 lines from 4 tools into one cohesive BuildTool class without introducing bugs.

### Decision
Use **incremental merge with feature flags** approach:
1. Create BuildTool skeleton with IEditingTool interface
2. Copy wire creation logic from WireTool (largest, most complex)
3. Add positioning logic from PositionTool
4. Add rotation logic from PositionTool
5. Add deletion logic from DeleteTool (simplest) and AddComponentTool
6. Add branching point creation from WireTool (already present)
7. Update CircuitSceneManager to use BuildTool
8. Delete old tool files after tests pass

### Rationale
1. **Risk Reduction**: Each step can be tested independently
2. **Rollback Safety**: Can revert individual merge steps if issues found
3. **Test Migration**: Tests can be migrated in parallel with code
4. **Review Friendliness**: Small, focused commits easier to review

### Implementation Sequence
```text
Phase 1: Setup
- Create BuildTool.ts with IEditingTool interface
- Add mode enum and state interfaces
- Add event handler stubs

Phase 2: Wire Creation (from WireTool)
- Copy WireCreatingState interface
- Copy wire creation methods
- Copy wire preview logic
- Migrate WireTool tests

Phase 3: Element Dragging (from PositionTool)
- Copy DragState interface
- Copy drag handling methods
- Add selection check logic
- Migrate PositionTool drag tests

Phase 4: Rotation (from PositionTool)
- Copy rotation method
- Add double-click rotation
- Handle unselected component case
- Migrate PositionTool rotation tests

Phase 5: Deletion (from DeleteTool + AddComponentTool)
- Copy deletion methods for each element type
- Add cascade logic (component → wires)
- Migrate deletion tests

Phase 6: Branching Points (from WireTool)
- Already covered in wire creation
- Just ensure double-click works
- Migrate branching point tests

Phase 7: Integration
- Update CircuitSceneManager
- Update ToolType enum
- Delete old tool files
- Run full test suite
```

### Alternatives Considered
- **Big Bang**: Rewrite entire tool from scratch
  - **Rejected**: High risk, likely to introduce bugs, loses battle-tested code
- **Parallel Tracks**: Keep old tools, make BuildTool coexist
  - **Rejected**: Defeats purpose of consolidation, doubles maintenance burden

## Decision 6: Event Cleanup Pattern

### Context
BuildTool manages multiple event listeners that must be properly cleaned up to prevent memory leaks.

### Decision
Store bound handler references and use consistent cleanup in onDeactivate().

### Rationale
1. **Memory Safety**: Prevents leaked listeners
2. **Existing Pattern**: All current tools follow this pattern
3. **Debuggability**: Named references easier to debug than anonymous functions

### Implementation Approach
```typescript
class BuildTool {
  // Bind in constructor for stable references
  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    // ... etc
  }

  onActivate(): void {
    const container = this._sceneManager.getContainer();
    container.addEventListener('pointerdown', this.handlePointerDown);
    container.addEventListener('pointerup', this.handlePointerUp);
    // ... etc
  }

  onDeactivate(): void {
    const container = this._sceneManager.getContainer();
    container.removeEventListener('pointerdown', this.handlePointerDown);
    container.removeEventListener('pointerup', this.handlePointerUp);
    // ... etc

    // Also cleanup any active operations
    if (this.mode === 'wire_creation') {
      this.cancelWireCreation();
    }
    // ... etc
  }
}
```

### Alternatives Considered
- **AbortController**: Use signal-based cancellation
  - **Rejected**: Not compatible with Three.js event patterns, requires newer browser
- **Event Delegation**: Single listener on parent
  - **Rejected**: Doesn't work well with Three.js raycasting

## Best Practices Applied

### TypeScript Strict Mode
- All state types explicitly defined (no `any`)
- Null checks enforced via strict null checks
- All methods have return type annotations

### Event Handling
- Always check event.button for mouse events (ignore right/middle click)
- Lock camera controls during active operations
- Unlock controls on operation end (success or cancel)
- Re-enable controls in onDeactivate() as safety net

### State Management
- Clear mode transitions (idle → active → idle)
- Store rollback data for cancel operations
- Validate state before transitions
- Emit events at state transition boundaries

### Grid Snapping
- Apply consistent snapping via `nearestGridMagnetPosition()`
- Snap on visual update (during drag) for feedback
- Snap on commit (end drag) for model update

### Wire Visual Updates
- Real-time updates during drag (optimistic UI)
- Batch geometry updates where possible
- Use WireVisualManager for all wire rendering
- Refresh geometry on commit (corrects floating point errors)

## Testing Strategy

### Unit Tests
- State machine transitions (idle ↔ each mode)
- Event disambiguation logic (which handler for which hover state)
- Keyboard shortcut handling (Escape, Delete, R)
- Mode-specific state initialization/cleanup

### Integration Tests
- Full wire creation flow (click enode → drag → release)
- Full drag flow (click selected → drag → release)
- Rotation with selection state changes
- Deletion with cascade effects
- Cancel operations (Escape key)
- Tool activation/deactivation lifecycle

### Migration Tests
- Run old tool tests against BuildTool
- Verify identical behavior for each operation
- Test backward compatibility of ToolType enum

## Performance Considerations

### Real-time Interaction
- Target: <16ms per frame (60fps) during drag
- Minimize geometry recalculation
- Use dirty flags for selective updates
- Batch DOM updates (cursor changes)

### Memory Management
- Dispose preview objects when switching modes
- Clear state references when entering idle
- Reuse geometry buffers where possible
- Avoid creating closures in hot paths (event handlers)

## Risks and Mitigations

### Risk: Behavior Regression
- **Mitigation**: Migrate all existing tests before deleting old tools
- **Mitigation**: Manual testing of each user story before merge

### Risk: Event Handler Conflicts
- **Mitigation**: Clear priority order documented in code
- **Mitigation**: Unit tests for each conflict scenario

### Risk: State Machine Complexity
- **Mitigation**: State diagram in JSDoc
- **Mitigation**: Explicit mode checks before state access

### Risk: Integration Breakage
- **Mitigation**: Update CircuitSceneManager in same PR
- **Mitigation**: Feature flag for rollback if needed

## References

### Existing Code Patterns
- `WireTool.ts`: Mode-based state machine (lines 20-23, 66)
- `PositionTool.ts`: Drag state with position tracking (lines 23-31)
- `AddComponentTool.ts`: Event cleanup pattern (lines 36-39, 96-107)

### External Resources
- [Three.js Event Handling](https://threejs.org/docs/#manual/en/introduction/How-to-use-post-processing): Best practices
- [State Machine Design](https://refactoring.guru/design-patterns/state): Pattern overview
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict): Configuration guide
