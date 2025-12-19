# Research: Ctrl+Click Source Type Cycling

**Feature**: 012-ctrl-click-source-cycle
**Date**: 2025-12-19

## Research Tasks

### 1. Existing ENode Source Type Infrastructure

**Question**: How is sourceType currently managed in the codebase?

**Findings**:

| Component | Location | Status |
|-----------|----------|--------|
| `ENodeSourceType` enum | `src/core/types/ENodeSourceType.ts` | ✅ Ready - Values: `Voltage`, `Current` |
| `ENode.source` attribute | `src/core/ENode.ts:92` | ✅ Ready - Type: `ENodeSourceType \| undefined` |
| `ENode.setSourceType()` | `src/core/ENode.ts:215-222` | ✅ Ready - Setter method exists |
| `Circuit.updateENodeSourceType()` | `src/core/Circuit.ts:924-942` | ⚠️ Partial - Only allows BranchingPoints |

**Decision**: Use existing infrastructure. Modify `Circuit.updateENodeSourceType()` to also support component pins.

**Rationale**: Minimal changes, maximum reuse. The core ENode model already supports sourceType for any enode type; only the Circuit update method has an unnecessary restriction.

**Alternatives Considered**:
- Create separate method for pins → Rejected: Inconsistent API, duplicated logic
- Modify ENode structure → Rejected: Already supports sourceType

---

### 2. Visual Factory Update Patterns

**Question**: How do visual factories update enode appearance based on sourceType?

**Findings**:

**BranchingPointVisualFactory** (`src/scene/shared/components/BranchingPointVisualFactory.ts`):
```typescript
// Color mapping (lines 29-33)
private static readonly COLORS = {
  null: 0xffffff,    // white - no source
  Voltage: 0xff0000, // red - voltage source
  Current: 0x0000ff, // blue - current source
};

// Update method exists (line 120)
updateSourceType(object3D: THREE.Object3D, sourceType: ENodeSourceType | null): void
```

**ComponentVisualFactory** (`src/scene/shared/components/ComponentVisualFactory.ts`):
- Pin creation uses `DEFAULT_PIN_COLOR` (0xb87333 - bronze)
- Pin visual stored in `userData.type === 'enode'`
- **No `updateSourceType()` method exists**

**Decision**: Add `updatePinSourceType()` method to `ComponentVisualFactory` following `BranchingPointVisualFactory` pattern.

**Rationale**: Consistent API across visual factories. Reuse same color scheme (white/red/blue) for visual consistency.

**Alternatives Considered**:
- Add indicator ring instead of color change → Rejected: More complex, inconsistent with BP behavior
- No visual feedback on pins → Rejected: Violates spec requirement FR-003

---

### 3. BuildTool Event Handling Pattern

**Question**: How does BuildTool handle modifier keys and pointer events?

**Findings**:

**Ctrl/Meta key detection** (lines 489, 498):
```typescript
if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
  // Copy component
}
```

**Pointer down routing** (lines 332-401):
1. Guard: `if (event.button !== 0) return;` (left-click only)
2. Check hover state via `HoverManager`
3. Route based on hovered element type:
   - Enode → `startWireCreation()`
   - Selected element → Start drag
   - Wire → Handle wire point

**State machine modes**: `idle`, `wire_creation`, `wire_drag`, `component_drag`, `bp_drag`

**Decision**: Add Ctrl+click check early in `handlePointerDown()`, before wire creation initiation. Only process when mode is `idle`.

**Rationale**: Follows existing guard clause pattern. Early exit prevents conflicting behaviors.

**Alternatives Considered**:
- Handle in `handleKeyDown()` → Rejected: Need click position to identify target enode
- Handle in `handlePointerUp()` → Rejected: Less responsive, inconsistent with click semantics

---

### 4. Persistence and Event Emission

**Question**: How are sourceType changes persisted and communicated?

**Findings**:

**CircuitEditionManager** (`src/scene/static/CircuitEditionManager.ts:340-356`):
```typescript
saveEditENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void {
  const circuit = this._sceneManager.getCircuit();
  circuit.updateENodeSourceType(enodeId, sourceType);

  this._sceneManager.emit('enodeSourceTypeChanged', {
    enodeId,
    sourceType,
  });
}
```

**Event type** (`src/scene/shared/types.ts:117-120`):
```typescript
enodeSourceTypeChanged: {
  enodeId: UUID;
  sourceType: string | null;
};
```

**Decision**: Use existing `saveEditENodeSourceType()` for persistence. Method already handles model update and event emission.

**Rationale**: Zero new code needed for persistence layer. Event already defined and emitted.

**Alternatives Considered**:
- Create new event type → Rejected: Existing event sufficient
- Direct Circuit mutation → Rejected: Bypasses event emission, breaks undo/redo

---

### 5. SourceType Cycling Logic

**Question**: What is the best pattern for cycling through sourceType values?

**Findings**:

Current sourceType states:
- `undefined` / `null` → No source (white visual)
- `ENodeSourceType.Voltage` → Voltage source (red visual)
- `ENodeSourceType.Current` → Current source (blue visual)

Cycle order per spec: `null → Voltage → Current → null`

**Decision**: Implement helper function `getNextSourceType()`:
```typescript
function getNextSourceType(current: ENodeSourceType | undefined): ENodeSourceType | undefined {
  if (!current) return ENodeSourceType.Voltage;
  if (current === ENodeSourceType.Voltage) return ENodeSourceType.Current;
  return undefined; // Current → null
}
```

**Rationale**: Pure function, easily testable, encapsulates cycling logic.

**Alternatives Considered**:
- Array-based cycling with modulo → Rejected: More complex for 3-state cycle
- Switch statement inline → Rejected: Less reusable, harder to test

---

## Summary

| Research Area | Decision | Impact |
|---------------|----------|--------|
| ENode infrastructure | Use existing, relax Circuit constraint | 1 file change (Circuit.ts) |
| Visual factory pattern | Add updatePinSourceType() | 1 file change (ComponentVisualFactory.ts) |
| Event handling | Early guard in handlePointerDown() | 1 file change (BuildTool.ts) |
| Persistence | Use existing saveEditENodeSourceType() | No changes |
| Cycling logic | Pure helper function | ~10 lines in BuildTool.ts |

**All NEEDS CLARIFICATION items resolved.** Ready for Phase 1 design.
