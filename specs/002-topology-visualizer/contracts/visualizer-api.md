# Visualizer API Contract

**Feature**: 002-topology-visualizer
**Date**: 2025-11-29
**Type**: Browser-based standalone application

## Overview

The Circuit Topology Visualizer is a client-side application bundled as a single JavaScript file. It provides a programmatic API for parsing circuit JSON and rendering topology graphs.

## Public API

### CircuitVisualizer Class

Main interface for circuit visualization functionality.

```typescript
class CircuitVisualizer {
  /**
   * Creates a new circuit visualizer instance
   * @param containerElement - DOM element where graph will be rendered
   */
  constructor(containerElement: HTMLElement);

  /**
   * Visualizes a circuit from JSON string
   * @param circuitJson - Circuit JSON string (from Circuit.toJSON())
   * @returns Promise that resolves when rendering is complete
   * @throws VisualizerError if parsing or rendering fails
   */
  visualize(circuitJson: string): Promise<void>;

  /**
   * Clears the current visualization
   */
  clear(): void;

  /**
   * Destroys the visualizer and cleans up resources
   */
  destroy(): void;
}
```

### Error Types

```typescript
/**
 * Base error class for all visualizer errors
 */
class VisualizerError extends Error {
  readonly type: "validation" | "integrity" | "render";
  readonly details?: unknown;
}

/**
 * Thrown when circuit JSON is malformed or invalid
 */
class ValidationError extends VisualizerError {
  readonly type: "validation";
  readonly field?: string;
}

/**
 * Thrown when circuit data has referential integrity issues
 */
class IntegrityError extends VisualizerError {
  readonly type: "integrity";
  readonly entityId: string;
  readonly referenceId: string;
}

/**
 * Thrown when DOT graph generation or rendering fails
 */
class RenderError extends VisualizerError {
  readonly type: "render";
  readonly dotSnippet?: string;
}
```

## HTML Application Interface

### User Interactions

**Input Circuit JSON**:
```html
<textarea id="circuit-input" placeholder="Paste circuit JSON here..."></textarea>
<button id="visualize-btn">Visualize</button>
```

**Display Graph**:
```html
<div id="graph-container"></div>
```

**Error Display**:
```html
<div id="error-display" class="error hidden">
  <span id="error-message"></span>
  <button id="clear-error-btn">×</button>
</div>
```

### Event Flow

1. **User Input**:
   - User pastes circuit JSON into textarea
   - User clicks "Visualize" button

2. **Validation**:
   - Application validates JSON syntax
   - Application validates circuit structure
   - Displays validation errors if invalid

3. **Rendering**:
   - Application generates DOT graph string
   - d3-graphviz renders DOT to SVG
   - SVG displayed in graph container

4. **Error Handling**:
   - Validation errors: Show error message, keep input visible
   - Integrity errors: Show error with entity/reference details
   - Render errors: Show error with DOT snippet (if available)

## Data Contracts

### Input: Circuit JSON

**Format**: JSON string matching Circuit.toJSON() schema

**Required Fields**:
```json
{
  "metadata": {
    "name": "string",
    "size": "number",
    "divisions": "number",
    "cameraStartup": { "x": "number", "y": "number", "z": "number" }
  },
  "components": [
    {
      "id": "string (UUID)",
      "type": "string",
      "position": { "x": "number", "y": "number" },
      "rotation": "number",
      "pins": ["string (UUID)"]
    }
  ],
  "enodes": [
    {
      "id": "string (UUID)",
      "type": "string",
      "source": "string | null",
      "component": "string (UUID) | undefined",
      "pinLabel": "string | undefined"
    }
  ],
  "wires": [
    {
      "id": "string (UUID)",
      "node1": "string (UUID)",
      "node2": "string (UUID)",
      "intermediatePositions": "array"
    }
  ]
}
```

**Validation Rules**:
1. All UUIDs must be valid UUID format (36 chars with dashes)
2. `components[].pins[]` must reference existing enode IDs
3. `wires[].node1` and `wires[].node2` must reference existing enode IDs
4. Pin-type enodes (with `component` field) must have `pinLabel`
5. `enodes[].component` must reference existing component ID

### Output: Rendered Graph

**Format**: SVG element inserted into DOM

**Visual Elements**:

**Component Nodes** (subgraphs):
- Label: `"<ComponentType> [<8-char-uuid>]"`
- Style: Filled rectangle with light grey background
- Contains: Pin nodes as children

**Pin Nodes** (within component subgraphs):
- Label: `"<pinLabel> [<8-char-uuid>]"`
- Style: Standard node (box or ellipse)
- Example: `"anode [9f9fa2b5]"`

**Branching Point Nodes** (standalone):
- Label: `"[<8-char-uuid>]"`
- Shape: Point (small dot)
- Example: `"[b18ebe07]"`

**Wire Edges**:
- Label: `"[<8-char-uuid>]"`
- Style: Directed arrow
- Example: `"[62d38c6c]"` as edge label

## Error Responses

### Validation Error Example

**Scenario**: Invalid JSON syntax

```typescript
{
  type: "validation",
  message: "Invalid JSON: Unexpected token } at position 152",
  field: undefined
}
```

**UI Display**: "❌ Invalid JSON: Unexpected token } at position 152"

### Integrity Error Example

**Scenario**: Wire references non-existent enode

```typescript
{
  type: "integrity",
  message: "Wire references non-existent enode",
  entityId: "62d38c6c-c50e-472c-838b-99566240c246",  // wire UUID
  referenceId: "invalid-enode-id"
}
```

**UI Display**: "❌ Wire 62d38c6c references non-existent enode invalid-enode-id"

### Render Error Example

**Scenario**: DOT syntax error or layout failure

```typescript
{
  type: "render",
  message: "Failed to render DOT graph: syntax error near line 15",
  dotSnippet: "subgraph cluster_abc { ... }"
}
```

**UI Display**: "❌ Failed to render graph: syntax error near line 15"

## Performance Contracts

### Rendering Time

**Target**: <3 seconds for circuits with up to 50 components

**Measurement Points**:
1. JSON parse start → parse complete
2. Parse complete → DOT generation complete
3. DOT generation complete → SVG rendered

**Success Criteria**: Total time <3000ms for 50-component circuit

### Browser Compatibility

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features**:
- ES2022 JavaScript support
- SVG rendering
- d3-graphviz WASM (if used)
- File input API (optional for file upload feature)

## Usage Example

### Programmatic Usage

```typescript
// Initialize visualizer
const container = document.getElementById('graph-container');
const visualizer = new CircuitVisualizer(container);

// Load and visualize circuit
const circuitJson = '{"metadata": {...}, "components": [...], ...}';

try {
  await visualizer.visualize(circuitJson);
  console.log('Visualization complete');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid circuit JSON:', error.message);
  } else if (error instanceof IntegrityError) {
    console.error('Integrity error:', error.message, error.entityId);
  } else if (error instanceof RenderError) {
    console.error('Render error:', error.message);
  }
}

// Clean up
visualizer.destroy();
```

### HTML Page Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>Circuit Topology Visualizer</title>
  <script src="circuit-topology-visualizer.js"></script>
</head>
<body>
  <h1>Circuit Topology Visualizer</h1>

  <textarea id="circuit-input" rows="10" cols="80"
            placeholder="Paste circuit JSON here..."></textarea>
  <br>
  <button id="visualize-btn">Visualize Circuit</button>
  <button id="clear-btn">Clear</button>

  <div id="error-display" class="error hidden"></div>
  <div id="graph-container"></div>

  <script>
    const visualizer = new window.CircuitVisualizer(
      document.getElementById('graph-container')
    );

    document.getElementById('visualize-btn').addEventListener('click', async () => {
      const json = document.getElementById('circuit-input').value;
      try {
        await visualizer.visualize(json);
        document.getElementById('error-display').classList.add('hidden');
      } catch (error) {
        document.getElementById('error-display').textContent = error.message;
        document.getElementById('error-display').classList.remove('hidden');
      }
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
      visualizer.clear();
      document.getElementById('circuit-input').value = '';
    });
  </script>
</body>
</html>
```

## Security Considerations

### Input Validation

**JSON Parsing**:
- Use `JSON.parse()` within try-catch
- Validate all required fields exist
- Validate all UUIDs match expected format
- Reject circuits with >1000 components (DoS prevention)

**XSS Prevention**:
- DOT labels are escaped before rendering
- No `eval()` or dynamic code execution
- All user input treated as data, not code

### No Server Communication

**Offline Operation**:
- All processing happens client-side
- No circuit data sent to external servers
- No analytics or tracking
- No network requests after page load

## Extensibility

### Future Enhancements (Out of Scope for MVP)

**Not Implemented**:
- Export graph as PNG/SVG file
- Zoom/pan controls
- Node filtering (hide/show component types)
- Layout algorithm selection (dot, neato, fdp, etc.)
- Custom styling/themes
- Interactive node selection
- Diff visualization (compare two circuits)

**API Reserved for Future**:
```typescript
// Not implemented in MVP
interface CircuitVisualizerOptions {
  layout?: "dot" | "neato" | "fdp" | "circo";
  theme?: "light" | "dark";
  onNodeClick?: (nodeId: string) => void;
}
```
