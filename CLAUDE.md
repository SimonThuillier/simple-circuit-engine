# simple-circuit-engine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-28

## Active Technologies
- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already installed) (006-select-tool-wires)
- N/A (in-memory circuit model, no persistence changes) (006-select-tool-wires)

- N/A (visual factories are stateless; state resides in Circuit/CircuitRunner instances) (005-visual-factory-classes)

- TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already in project) (003-threejs-rendering)
- N/A (renderers are stateless; state resides in Circuit/CircuitRunner instances) (003-threejs-rendering)
- TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (already installed), three/addons/controls/MapControls.js (004-map-controls-hovering)
- N/A (stateless managers, no persistence) (004-map-controls-hovering)

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
When possible level of nested conditional structures should be minimized by using guard clauses and early returns. Example below:
```typescript
/**
 * Example of GOOD practice for minimizing nested conditionals
 * DO that
 * @param input
 */
function goodExample(input: number | null): string {
    if (input === null) {
        return "No input provided";
    }
    // process securized input
    // Main logic (possibily big) continues here without additional nesting : more readable, clearer
    let output = input * 2;
    
    return `Output is ${output}`;
}
/**
 * Example of BAD practice that increases nested conditionals
 * DONT DO that !
 * @param input
 */
function badExample(input: number | null): string {
    if (input !== null) {
        // Main logic (possibily big) embedded under an if : less readable, less clear
        let output = input * 2;
        return `Output is ${output}`;
    }
    return "No input provided";
}
```

## Recent Changes
- 006-select-tool-wires: Added TypeScript (strict mode), targeting ES2022 + Three.js 0.181+ (already installed)

- 005-visual-factory-classes: Added TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (already installed)

- 004-map-controls-hovering: Added TypeScript 5.9+ (strict mode), targeting ES2022 + Three.js 0.181+ (already installed), three/addons/controls/MapControls.js (already installed)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
