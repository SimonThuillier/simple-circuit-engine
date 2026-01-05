# Research: Feedback Loop Initialization

**Feature**: 018-feedback-init
**Date**: 2026-01-03

## Research Questions

### 1. How does the current initializeState() work?

**Finding**: CircuitRunner.initializeState() (lines 270-318) performs these steps:
1. Iterates all components, calls `behavior.createInitialState(component)` for each
2. Stores initial ComponentState in SimulationState.componentStates map
3. Marks all components as dirty for initial evaluation
4. Initializes ENode states (voltage/current from topology source type)
5. Initializes Wire states (unlocked, no voltage/current)
6. Calls `updateState(0)` once at the end which runs propagateConductivity()

**Issue**: Components are processed in Map iteration order (insertion order), which is non-deterministic for feedback loops. The single propagateConductivity() call at the end doesn't allow early components to influence later ones.

### 2. How do Transistor/Relay behaviors determine initial state?

**Finding**: Both `TransistorBehavior.createInitialState()` and `RelayBehavior.createInitialState()` check for `activationLogic` config:
- If `activationLogic === 'negative'`: initial state is `'closed'`
- Otherwise: initial state is `'open'`

**Gap**: There's no `initializationPriority` config parameter yet. It needs to be added to:
- `COMPONENT_TYPE_METADATA[ComponentType.Transistor].config`
- `COMPONENT_TYPE_METADATA[ComponentType.Relay].config`

### 3. How does propagateConductivity() work?

**Finding**: CircuitRunner.propagateConductivity() (lines 382-468):
1. Runs BFS from voltage sources to find all reachable nodes/wires
2. Runs BFS from current sources similarly
3. Updates nodeStates/wireStates based on reachability
4. Returns sets of updated nodes and wires

**Key insight**: propagateConductivity() uses current ComponentState to determine conductivity via `behavior.allowConductivity()`. So if a transistor is already `closed`, it will conduct; if `open`, it won't.

### 4. What's the best approach for sequential initialization?

**Decision**: Group-based sequential processing with inter-group propagation

**Rationale**:
- Processing components one-at-a-time with propagation after each would be expensive (O(n) propagations)
- Grouping by priority level reduces propagations to O(k) where k = number of distinct priority levels
- For typical circuits with 2-3 distinct priorities, this is 2-3 propagations vs potentially dozens

**Algorithm**:
```
1. Create all component initial states (existing code)
2. Initialize all ENode/Wire states (existing code)
3. Group components by initializationPriority (descending order)
4. For each priority group (highest to lowest):
   a. Sort components within group by UUID (ascending) for determinism
   b. For each component in group:
      - If has behavior.onPinsChange that can update state, call it
   c. Run propagateConductivity() after processing the group
5. Mark all dirty (existing code)
```

**Alternative considered**: Per-component propagation
- Rejected because: Too expensive for large circuits; grouping achieves same determinism with better performance

### 5. How to parse initializationPriority from config?

**Decision**: Parse as integer, treat empty string/null as priority 0

**Rationale**:
- Component config is `Map<string, string>`, so priority stored as string
- Empty string means "use default" = priority 0
- Integer values (including negative) are valid
- Higher number = higher priority = processed first

**Implementation**:
```typescript
function getInitializationPriority(config: Map<string, string>): number {
  const value = config.get('initializationPriority');
  if (!value || value === '') return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}
```

## Decisions Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Processing strategy | Group by priority, propagate after each group | Balance between determinism and performance |
| Priority ordering | Higher number = higher priority (processed first) | Per spec clarification |
| Tie-breaking | UUID alphabetical ascending | Per spec (FR-007) |
| Default priority | 0 (when null or empty string) | Per spec edge case |
| Config storage | String in component.config Map | Existing pattern, JSON-serializable |

## Open Questions (None)

All technical questions resolved through codebase analysis.
