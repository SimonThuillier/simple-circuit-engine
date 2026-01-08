# Simple Circuit Engine Constitution

## Project Identity

**Name**: simple-circuit-engine
**Purpose**: A standalone, framework-agnostic boolean circuit simulation engine with 3D visualization, designed for educational purposes.
**License**: MIT (open source, usable by everyone)

### Vision Statement

Enable anyone to understand digital electronics by visualizing how electricity propagates through circuits step-by-step. The engine must be reusable across different projects and frameworks while providing beautiful, interactive 3D visualization.

## Core Principles

### I. Framework Agnosticism

The engine MUST NOT depend on any UI framework (React, Vue, Angular, etc.). It is a pure TypeScript library that:

- Accepts an HTMLElement for mounting
- Manages its own rendering lifecycle
- Communicates through an event-driven API
- Can be wrapped by any framework's binding layer

### II. Modular Separation

Two distinct layers with strict dependency rules:
```
core/       → Pure TypeScript, minimal dependencies, works in Node.js, no dependencies on Three.js, DOM or scene/
scene/      → Manage Three.js scenes for visualization and interaction, depends only on core/
```

The `core/` module is publishable separately for headless/server use.

**Architectural View**:
The `core/` module is the innermost hexagon—pure domain logic with no knowledge of how it will be rendered or consumed.
It would be the model in an MVC architecture.
`scene/` handles all Three.js specifics and user interactions, adapting core concepts to visual representations.
It would be the Controller in MVC. The View of the scene is then produced by Three.js/WebGLRenderer .
Zooming out, the entire `simple-circuit-engine` library is itself a core that client applications should be able to adapt easily to their own UI frameworks and needs.
Dependencies point inward, not outward.

### III. Discrete Boolean Model

This is NOT a SPICE simulator. The electrical model is intentionally very simplified:

- No analog voltages or currents. Electrical states are boolean (is there tension or not, is there current flow or not)
- Wires have zero resistance and ideal conductivity
- Only Direct Current (DC) No capacitance or inductance
- Time is discrete (step-by-step ticks)
- Components have transitional delays (e.g., a transistor take N (integer only) ticks to change output after input changes)
- the _ground_ is the 0V source of electrons and the _power_ is a positive voltage source
- In a circuit there can be several _grounds_, and they will always be at the same potential. The same goes for _powers_
- Propagation is deterministic

Educational clarity over physical accuracy.

### IV. Data-Driven Circuits

Circuits and scenarios are saved as JSON files, not code. They are loadable, savable, and validatable without recompilation.

### V. Specification-Driven Development

Define interfaces → Write tests → Implement. Tests are non-negotiable.

### VI. Developer Experience First

This library is open source and must be welcoming to external developers.
Every public interface, class, and function must have clear JSDoc documentation explaining purpose, parameters, and usage.
The README.md must enable a developer to install and see a working example within minutes.
The demo application must be runnable with a single command. Sample circuits must showcase real capabilities, not just toy examples.
Integration examples must be copy-paste ready.
If a developer needs to read source code to understand how to use the library, the documentation has failed.

---

## Architectural Constraints

### Module Rules

| Module      | May Import  | May NOT Import | DOM Access             |
|-------------|-------------|----------------| ---------------------- |
| `core/`     | nothing     | three, scene   | ❌                     |
| `scene/`    | core, three | playback       | ✅ mainly via Three.js |

### Public API Shape

- Single `CircuitEngine` facade class as main entry point
- Event-based communication (no callbacks in method signatures)
- Chainable methods where it makes sense (`engine.loadCircuit(c).play()`)
- Public rendering and playback APIs can use Three.js public types (e.g., `THREE.Object3D`). 

### Resource Management

- `dispose()` must clean up all WebGL resources
- No global state - everything scoped to engine instance
- Circuits are immutable after loading

---

## Technology Stack

- **Language**: TypeScript (strict mode), targeting ES2022
- **Runtime**: ES2022+ environments (modern browsers, Node 18+)
- **3D**: Three.js 0.181+ (optional for core-only use but heavily used for rendering and playback)
- **Build**: Vite 7.2+ (library mode)
- **Test**: Vitest 4.0+
- **Package Manager**: npm 11.6+

**Version Source of Truth**: All dependency versions are defined in `package.json`. Always read it to determine current versions before suggesting upgrades or checking compatibility.

---

## Quality Standards

- No `any` types
- Public APIs have JSDoc
- Core module: 80% test coverage minimum
- Scene & playback module: 60% test coverage minimum 
- All tests pass before merge
- Linting with strict tsc, formatting with Prettier

---

## Repository Structure

```
src/
  core/           # Simulation logic, types
  scene/          # Three.js scene management and interactivity
  CircuitEngine.ts
  index.ts

demo/             # demo page for manual testing and showcase
samples/          # Sample circuits and scenarios (JSON)
scripts/          # pages and samples generation scripts
tests/
    core/           # Core module tests
    scene/          # Scene module tests
docs/
```

---

## What This Constitution Does NOT Define

- Exact type shapes (define in code, evolve with implementation)
- Detailed API signatures (emerge from TDD)
- Implementation phases (track in issues/roadmap)
- Component visual designs (discover during rendering work)

These details belong in code and working documents, not constitutional law.

---

## Governance

This constitution defines boundaries and principles. Implementation details are decided during development.

Amendments require documented rationale.

**Version**: 1.0.0 | **Ratified**: 2025-11-XX
