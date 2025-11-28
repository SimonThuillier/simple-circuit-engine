# Simple Circuit Engine

A standalone, framework-agnostic boolean circuit simulation engine with 3D visualization, designed for educational purposes.

## Features

- **Framework Agnostic**: Pure TypeScript library that works with any UI framework (React, Vue, Angular, etc.)
- **3D Visualization**: Beautiful, interactive circuit visualization using Three.js
- **Educational Focus**: Simplified boolean model for teaching digital electronics fundamentals
- **Data-Driven**: Circuits and scenarios defined as JSON files
- **Modular Architecture**: Use just the core simulation engine, or add visualization and playback
- **Type-Safe**: Written in strict TypeScript with comprehensive type definitions

## Quick Start

### Installation

```bash
npm install simple-circuit-engine
```

### Basic Usage

```typescript
import { CircuitEngine } from 'simple-circuit-engine';

// Create engine with 3D visualization
const container = document.getElementById('canvas');
const engine = new CircuitEngine(container);

// Load a circuit
const circuit = await fetch('/circuits/and-gate.json').then((r) => r.json());
engine.loadCircuit(circuit);

// Load and play a scenario
const scenario = await fetch('/scenarios/truth-table.json').then((r) => r.json());
engine.loadScenario(scenario).play();

// Listen to events
engine.on('tick', (state) => {
  console.log('Simulation step:', state.tick);
});

// Clean up when done
engine.dispose();
```

### Headless Mode (No Visualization)

```typescript
// Use core module only (Node.js compatible)
import { CircuitEngine } from 'simple-circuit-engine/core';

const engine = new CircuitEngine(); // No container needed
```

## Running the Demo

The quickest way to see the engine in action:

```bash
# Clone the repository
git clone https://github.com/yourusername/simple-circuit-engine.git
cd simple-circuit-engine

# Install dependencies
npm install

# Run the demo
npm run dev:demo
```

The demo will open in your browser at `http://localhost:3000`.

## Development

### Prerequisites

- Node.js 18+
- npm 11.6+

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:ui

# Type checking
npm run typecheck

# Build the library
npm run build
```

### Project Structure

```
src/
  core/           # Pure TypeScript simulation engine (zero dependencies)
  rendering/      # Three.js 3D visualization (depends on core)
  playback/       # Scenario orchestration (depends on core + rendering)
  CircuitEngine.ts  # Main facade class
  index.ts        # Library entry point

demo/             # Standalone demo application
samples/          # Example circuits and scenarios (JSON)
tests/            # Test suites
  core/           # Core module tests
  rendering/      # Rendering module tests
  playback/       # Playback module tests
docs/             # Documentation
```

## Architecture

The engine follows a **hexagonal architecture** with strict dependency rules:

```
┌─────────────────────────────────────┐
│         Your Application            │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       CircuitEngine (Facade)         │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │   Playback (orchestration)     │  │
│  └─────────────┬──────────────────┘  │
│                │                      │
│  ┌─────────────▼──────────────────┐  │
│  │  Rendering (Three.js visuals)  │  │
│  └─────────────┬──────────────────┘  │
│                │                      │
│  ┌─────────────▼──────────────────┐  │
│  │    Core (simulation logic)     │  │
│  │   Pure TypeScript, no deps     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Dependencies point inward. The `core` module is publishable separately for headless use.

## Circuit Model

This is **not** a SPICE simulator. The electrical model is intentionally simplified for educational clarity:

- Boolean states only (no analog voltages/currents)
- Discrete time steps (tick-based)
- Zero resistance wires
- DC only (no capacitance or inductance)
- Component delays as integer tick counts
- Deterministic propagation

## API Reference

### CircuitEngine

Main entry point for the library.

#### Constructor

```typescript
new CircuitEngine(container?: HTMLElement | null)
```

- `container`: HTMLElement for 3D visualization. Pass `null` for headless mode.

#### Methods

All methods return `this` for chaining (except `dispose()`).

- `loadCircuit(circuitData: object): this` - Load a circuit definition
- `loadScenario(scenarioData: object): this` - Load a scenario (test sequence)
- `play(): this` - Start scenario playback
- `pause(): this` - Pause playback
- `step(): this` - Execute one simulation tick
- `reset(): this` - Reset to initial state
- `on(event: string, handler: Function): this` - Register event listener
- `off(event: string, handler: Function): this` - Remove event listener
- `dispose(): void` - Clean up all resources

#### Events

- `tick` - Emitted on each simulation step
- `play` - Emitted when playback starts
- `pause` - Emitted when playback pauses
- `reset` - Emitted when simulation resets
- `error` - Emitted on errors

## Circuit JSON Format

Circuits are defined as JSON files:

```json
{
  "version": "1.0.0",
  "name": "Simple AND Gate",
  "components": [
    {
      "id": "and1",
      "type": "and",
      "position": { "x": 0, "y": 0, "z": 0 },
      "delay": 2
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

See `samples/` directory for complete examples.

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read the [constitution](.specify/memory/constitution.md) for project principles and architectural constraints.

## Roadmap

This is an early-stage project. Current status:

- [x] Project scaffolding
- [ ] Core simulation engine
- [ ] Component library (AND, OR, NOT, etc.)
- [ ] Wire propagation logic
- [ ] Three.js rendering
- [ ] Camera controls
- [ ] Playback controller
- [ ] Circuit validation
- [ ] Comprehensive test coverage
- [ ] Documentation
- [ ] Framework integration examples

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/simple-circuit-engine/issues)
- Documentation: [Full docs](./docs/)
