# Quickstart: Feedback Loop Initialization

**Feature**: 018-feedback-init
**Date**: 2026-01-03

## Overview

This feature allows circuits with feedback loops (like RS flip-flops) to initialize to a deterministic stable state. You can control which stable state the circuit settles into by setting `initializationPriority` on transistors and relays.

## Usage

### Basic: Automatic Initialization

For most circuits with feedback loops, no configuration is needed. The system will automatically resolve to one of the valid stable states:

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry } from 'simple-circuit-engine';

// Load a circuit with feedback loops (e.g., RS flip-flop)
const circuit = Circuit.fromJSON(rsFlipFlopCircuitData);

// Create runner - initialization happens automatically
const registry = BehaviorRegistry.createDefault();
const runner = new CircuitRunner(circuit, registry);

// Circuit is now in a valid stable state
const state = runner.getCurrentState();
```

### Advanced: Controlling Initial State

To control which stable state a feedback circuit settles into, set `initializationPriority` on the components:

```typescript
// Get the transistor that should "win" the race
const transistorQ = circuit.getComponent(transistorQId);

// Higher priority = processed first
// This transistor will establish its state before others react
transistorQ.setParameter('initializationPriority', '10');

// Lower priority transistor will adapt to Q's state
const transistorQBar = circuit.getComponent(transistorQBarId);
transistorQBar.setParameter('initializationPriority', '1');

// Now create runner - Q will be processed first
const runner = new CircuitRunner(circuit, registry);
```

### Priority Rules

| Priority Value | Behavior |
|---------------|----------|
| Higher number (e.g., 10) | Processed **first** |
| Lower number (e.g., 1) | Processed **later** |
| 0 or empty string | Default priority |
| Negative numbers | Valid, processed after 0 |
| Same priority | Tie-broken by component UUID (alphabetical) |

### Example: RS Flip-Flop with Deterministic Q=HIGH

```typescript
// RS flip-flop with two transistors in feedback
// T_Q controls Q output, T_Qbar controls Q' output

// We want Q=HIGH, Q'=LOW on startup
// Give T_Q higher priority so it closes first
circuit.getComponent(tQId).setParameter('initializationPriority', '2');
circuit.getComponent(tQBarId).setParameter('initializationPriority', '1');

// Also set T_Q to start closed (if using activationLogic)
circuit.getComponent(tQId).setParameter('activationLogic', 'negative');

const runner = new CircuitRunner(circuit, registry);
// Result: Q=HIGH, Q'=LOW
```

## API Reference

### Component Config Parameters

#### `initializationPriority` (Transistor, Relay)

- **Type**: String (integer value or empty)
- **Default**: `""` (empty string, treated as 0)
- **Purpose**: Controls order of component initialization in feedback circuits
- **Higher values**: Processed first, establish state before other components
- **Lower values**: Processed later, react to already-established states

## Troubleshooting

### Circuit doesn't initialize to expected state

1. Check that `initializationPriority` values create a clear ordering
2. Ensure the higher-priority component has the right `activationLogic` setting
3. Verify no other components are interfering with the feedback path

### Non-deterministic behavior

This shouldn't happen after this feature. If you see different states on repeated initialization:
1. Ensure all feedback components have distinct `initializationPriority` values
2. If priorities are equal, results will be deterministic but based on UUID order
