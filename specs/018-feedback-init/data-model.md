# Data Model: Feedback Loop Initialization

**Feature**: 018-feedback-init
**Date**: 2026-01-03

## Entity Changes

### Existing Entity: Component.config

**Current State**: `Map<string, string>` storing component configuration parameters.

**Change**: Add `initializationPriority` key for Transistor and Relay component types.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `initializationPriority` | string (integer or empty) | `""` (empty = 0) | Higher values = processed first during initialization. Empty string treated as priority 0. |

### Existing Entity: ComponentTypeMetadata.config

**File**: `src/core/types/ComponentType.ts`

**Change**: Add default `initializationPriority` entry to Transistor and Relay metadata.

```typescript
// Before (Transistor)
config: new Map([
    ['activationLogic', 'positive']
]),

// After (Transistor)
config: new Map([
    ['activationLogic', 'positive'],
    ['initializationPriority', '']
]),
```

```typescript
// Before (Relay)
config: new Map([
    ['activationLogic', 'positive']
]),

// After (Relay)
config: new Map([
    ['activationLogic', 'positive'],
    ['initializationPriority', '']
]),
```

## No New Entities

This feature does not introduce new classes, interfaces, or data structures. All changes are additions to existing config parameters.

## State Transitions

No new state transitions are introduced. Transistors and Relays continue to use existing states:
- `open` → `closing` → `closed`
- `closed` → `opening` → `open`

The `initializationPriority` only affects the **order** in which components are processed during `initializeState()`, not their state machine.

## Validation Rules

| Rule | Enforcement Location |
|------|---------------------|
| Priority must be parseable as integer or empty | `CircuitRunner.initializeState()` helper function |
| Empty string defaults to 0 | `CircuitRunner.initializeState()` helper function |
| Invalid values (NaN) default to 0 | `CircuitRunner.initializeState()` helper function |

## JSON Serialization

No changes to serialization format. The `initializationPriority` is stored in the existing `config` object:

```json
{
  "id": "transistor-uuid",
  "type": "transistor",
  "position": { "x": 10, "y": 20 },
  "rotation": 0,
  "pins": ["pin1-uuid", "pin2-uuid", "pin3-uuid"],
  "config": {
    "activationLogic": "positive",
    "initializationPriority": "2"
  }
}
```

## Backward Compatibility

- Existing circuits without `initializationPriority` in their config will use the default value (empty string = 0)
- All components without explicit priority will be processed in the same group (priority 0), with UUID tie-breaking for determinism
- No migration required for existing circuit JSON files
