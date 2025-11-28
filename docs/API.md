# API Reference

## CircuitEngine

Main facade class providing the public API for the Simple Circuit Engine.

### Constructor

```typescript
new CircuitEngine(container?: HTMLElement | null)
```

Creates a new CircuitEngine instance.

**Parameters:**
- `container` (optional): HTMLElement where 3D visualization will be mounted. Pass `null` or omit for headless mode.

**Example:**
```typescript
// With visualization
const engine = new CircuitEngine(document.getElementById('canvas'));

// Headless mode (no rendering)
const engine = new CircuitEngine();
```

---

### Methods

All methods return `this` for method chaining, except `dispose()`.

#### `loadCircuit(circuitData: object): this`

Loads a circuit definition from JSON data.

**Parameters:**
- `circuitData`: Circuit definition object (see [Circuit Format](#circuit-format))

**Returns:** `this` for chaining

**Throws:** Error if circuit data is invalid

**Example:**
```typescript
const circuit = await fetch('/circuits/and-gate.json').then(r => r.json());
engine.loadCircuit(circuit);
```

---

#### `loadScenario(scenarioData: object): this`

Loads a test scenario from JSON data.

**Parameters:**
- `scenarioData`: Scenario definition object (see [Scenario Format](#scenario-format))

**Returns:** `this` for chaining

**Throws:** Error if scenario data is invalid or no circuit is loaded

**Example:**
```typescript
const scenario = await fetch('/scenarios/truth-table.json').then(r => r.json());
engine.loadScenario(scenario);
```

---

#### `play(): this`

Starts or resumes scenario playback.

**Returns:** `this` for chaining

**Emits:** `play` event

**Example:**
```typescript
engine.play();
```

---

#### `pause(): this`

Pauses the current playback.

**Returns:** `this` for chaining

**Emits:** `pause` event

**Example:**
```typescript
engine.pause();
```

---

#### `step(): this`

Executes exactly one simulation tick.

**Returns:** `this` for chaining

**Emits:** `tick` event

**Example:**
```typescript
// Single-step debugging
engine.step();
```

---

#### `reset(): this`

Resets the simulation to its initial state.

**Returns:** `this` for chaining

**Emits:** `reset` event

**Example:**
```typescript
engine.reset();
```

---

#### `on(event: string, handler: Function): this`

Registers an event listener.

**Parameters:**
- `event`: Event name (see [Events](#events))
- `handler`: Callback function

**Returns:** `this` for chaining

**Example:**
```typescript
engine.on('tick', (state) => {
  console.log('Current tick:', state.tick);
});
```

---

#### `off(event: string, handler: Function): this`

Removes an event listener.

**Parameters:**
- `event`: Event name
- `handler`: The same function reference passed to `on()`

**Returns:** `this` for chaining

**Example:**
```typescript
const handler = (state) => console.log(state);
engine.on('tick', handler);
// Later...
engine.off('tick', handler);
```

---

#### `dispose(): void`

Cleans up all resources including WebGL context, event listeners, and timers.

**IMPORTANT:** Always call this when the engine is no longer needed to prevent memory leaks.

**Returns:** `void`

**Example:**
```typescript
// React
useEffect(() => {
  const engine = new CircuitEngine(containerRef.current);
  return () => engine.dispose();
}, []);

// Vanilla JS
window.addEventListener('beforeunload', () => {
  engine.dispose();
});
```

---

## Events

Subscribe to events using `engine.on(eventName, handler)`.

### `tick`

Emitted after each simulation step.

**Payload:**
```typescript
{
  tick: number;           // Current tick number
  components: object;     // Component states (id → state)
  wires: object;          // Wire states (id → boolean)
}
```

**Example:**
```typescript
engine.on('tick', (state) => {
  console.log(`Tick ${state.tick}:`, state.components);
});
```

---

### `play`

Emitted when playback starts or resumes.

**Payload:** none

---

### `pause`

Emitted when playback pauses.

**Payload:** none

---

### `reset`

Emitted when simulation resets.

**Payload:** none

---

### `error`

Emitted when an error occurs.

**Payload:**
```typescript
{
  message: string;
  code?: string;
  details?: any;
}
```

**Example:**
```typescript
engine.on('error', (error) => {
  console.error('Engine error:', error.message);
});
```

---

## Circuit Format

Circuits are defined as JSON objects:

```typescript
interface Circuit {
  version: string;
  name: string;
  description?: string;
  components: Component[];
  wires: Wire[];
}

interface Component {
  id: string;
  type: string;  // 'switch', 'and', 'or', 'not', 'led', etc.
  position: { x: number; y: number; z: number };
  delay?: number;  // Propagation delay in ticks (default: 0)
  state?: any;     // Initial state (type-specific)
}

interface Wire {
  from: { component: string; pin: string };
  to: { component: string; pin: string };
}
```

**Example:**
```json
{
  "version": "1.0.0",
  "name": "Simple AND Gate",
  "components": [
    {
      "id": "input_a",
      "type": "switch",
      "position": { "x": -2, "y": 1, "z": 0 },
      "state": "off"
    },
    {
      "id": "and1",
      "type": "and",
      "position": { "x": 0, "y": 0, "z": 0 },
      "delay": 2
    },
    {
      "id": "output",
      "type": "led",
      "position": { "x": 2, "y": 0, "z": 0 }
    }
  ],
  "wires": [
    {
      "from": { "component": "input_a", "pin": "out" },
      "to": { "component": "and1", "pin": "in_a" }
    }
  ]
}
```

---

## Scenario Format

Scenarios define test sequences:

```typescript
interface Scenario {
  version: string;
  name: string;
  description?: string;
  circuitFile?: string;  // Reference to circuit file
  steps: ScenarioStep[];
}

interface ScenarioStep {
  tick: number;
  description?: string;
  actions: Action[];
  expect?: Expectations;
}

interface Action {
  component: string;  // Component ID
  action: string;     // 'toggle', 'set', etc.
  value?: any;        // Action-specific value
}

interface Expectations {
  [componentId: string]: {
    state?: any;
    pins?: { [pinName: string]: boolean };
  };
}
```

**Example:**
```json
{
  "version": "1.0.0",
  "name": "AND Gate Truth Table",
  "steps": [
    {
      "tick": 0,
      "description": "Both inputs OFF",
      "actions": [],
      "expect": {
        "output": { "state": "off" }
      }
    },
    {
      "tick": 5,
      "description": "Turn input A ON",
      "actions": [
        { "component": "input_a", "action": "toggle" }
      ],
      "expect": {
        "output": { "state": "off" }
      }
    }
  ]
}
```

---

## Type Exports

The library exports TypeScript types for better IDE support:

```typescript
import type { Circuit, Component, Wire, Scenario } from 'simple-circuit-engine';
```

---

## Error Handling

All errors are emitted via the `error` event. Synchronous errors during initialization may also throw.

**Best Practice:**
```typescript
const engine = new CircuitEngine(container);

engine.on('error', (error) => {
  console.error('Runtime error:', error);
});

try {
  engine.loadCircuit(circuitData);
} catch (error) {
  console.error('Load error:', error);
}
```
