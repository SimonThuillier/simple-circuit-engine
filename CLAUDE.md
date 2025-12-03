# simple-circuit-engine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-28

## Active Technologies
- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already in project) (003-threejs-rendering)
- N/A (renderers are stateless; state resides in Circuit/CircuitRunner instances) (003-threejs-rendering)

- TypeScript (strict mode), targeting ES2022 + None for core simulation module (dependency-free per constitution) (001-simulation-engine)
- N/A (simulation engine is stateless; history stored in-memory when enabled) (001-simulation-engine)

- File system - JSON files written to `output/sample-circuits/` directory (001-sample-circuit-scripts)
- TypeScript (strict mode), targeting ES2022 + d3-graphviz (Graphviz DOT rendering using D3), d3 (peer dependency) (002-topology-visualizer)
- N/A (client-side only, no persistence) (002-topology-visualizer)

- TypeScript (strict mode), targeting ES2022 + None (core module is dependency-free per constitution) (001-core-object-model)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript (strict mode), targeting ES2022: Follow standard conventions

## Recent Changes
- 003-threejs-rendering: Added TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already in project)

- 001-simulation-engine: Added TypeScript (strict mode), targeting ES2022 + None for core simulation module (dependency-free per constitution)

- 002-topology-visualizer: Added TypeScript (strict mode), targeting ES2022 + d3-graphviz (Graphviz DOT rendering using D3), d3 (peer dependency)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
