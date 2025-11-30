# Quickstart: Circuit Topology Visualizer

**Feature**: 002-topology-visualizer
**Audience**: Developers debugging circuits

## What is the Circuit Topology Visualizer?

A standalone HTML tool that displays circuit topology as a graph, showing:
- Components (Battery, LED, Switch, Relay, Transistor) with shortened UUIDs
- Pins grouped within their parent components with semantic labels and UUIDs
- Branching points as small intermediate nodes
- Wires as labeled edges connecting enodes

Perfect for debugging complex circuits without reading raw JSON.

## Quick Start (3 steps)

### 1. Build the Visualizer

```bash
npm run build:visualizer
```

This generates:
- `output/circuit-topology-visualizer.js` (bundled script)
- `output/circuit-topology-visualizer.html` (standalone page)

### 2. Open the HTML File

```bash
# Option A: Direct file open
open output/circuit-topology-visualizer.html

# Option B: Simple HTTP server (if file:// has issues)
npx http-server output -p 8080
# Then visit: http://localhost:8080/circuit-topology-visualizer.html
```

### 3. Visualize a Circuit

1. Generate sample circuits (if not already done):
   ```bash
   npm run generate:samples
   ```

2. Copy circuit JSON:
   ```bash
   cat output/sample-circuits/transistor-circuit.json
   ```

3. Paste JSON into the textarea on the visualizer page

4. Click **"Visualize Circuit"**

5. View the rendered topology graph!

## Example: Transistor Circuit

**Input** (`output/sample-circuits/transistor-circuit.json`):
```json
{
  "metadata": { "name": "Transistor Circuit", ... },
  "components": [
    { "id": "9f9fa2b5-...", "type": "battery", "pins": [...] },
    { "id": "d38eed5c-...", "type": "switch", "pins": [...] },
    { "id": "9cfa7a69-...", "type": "transistor", "pins": [...] },
    ...
  ],
  "enodes": [...],
  "wires": [...]
}
```

**Output** (rendered graph):
```
┌─────────────────────────────┐
│ Battery [9f9fa2b5]          │
│ ┌───────────────────────┐   │
│ │ cathode [0e44b236]    │   │
│ │ anode [251e2666] ─────┼───┼──[62d38c6c]──► Switch [d38eed5c]
│ └───────────────────────┘   │                 │ input [b4c4d...]
└─────────────────────────────┘                 │ output [b0eb3...] ──► ...
```

_(Actual output is an interactive SVG graph with automatic layout)_

## Understanding the Graph

### Component Nodes (Subgraphs)

Components appear as boxes containing their pins:

```
┌─────────────────────────────┐
│ ComponentType [uuid]        │  ← Component label
│ ┌─────────────────────┐     │
│ │ pin1Label [uuid]    │     │  ← Pin nodes
│ │ pin2Label [uuid]    │     │
│ └─────────────────────┘     │
└─────────────────────────────┘
```

Example:
```
┌──────────────────────────────┐
│ Transistor [9cfa7a69]        │
│ ┌──────────────────────┐     │
│ │ collector [e2c8e9cc] │     │
│ │ base [fa0220b3]      │     │
│ │ emitter [0dad7d64]   │     │
│ └──────────────────────┘     │
└──────────────────────────────┘
```

### Pin Nodes

Pins display semantic label + short UUID:
- `"anode [fea3e8dd]"`
- `"cathode [6fd01822]"`
- `"collector [e2c8e9cc]"`

### Branching Point Nodes

Standalone junction points (if any):
- `"[b18ebe07]"` (just UUID, small dot node)

### Wire Edges

Arrows labeled with wire UUID:
- `─[62d38c6c]─►` (connects two enodes)

## Common Use Cases

### Debug Wiring Errors

**Problem**: LED not lighting up in simulation

**Solution**:
1. Load circuit JSON in visualizer
2. Trace path from battery anode → LED → battery cathode
3. Check for:
   - Missing wires (disconnected pins)
   - Reversed polarity (anode ↔ cathode swap)
   - Incorrect component connections

### Verify Circuit Structure

**Problem**: Unsure if relay circuit is wired correctly

**Solution**:
1. Visualize circuit
2. Verify isolated circuits:
   - Control circuit (battery → switch → relay coil)
   - Power circuit (battery → relay contacts → LED)
3. Confirm relay pins connected properly:
   - cmd_in, cmd_out (control)
   - power_in, power_out (switched)

### Trace Signal Flow

**Problem**: Understanding transistor switching logic

**Solution**:
1. Visualize transistor circuit
2. Identify control path:
   - Battery → Switch → Transistor base
3. Identify switched path:
   - Battery → Transistor collector → LED (when base active)

## Sample Circuits

### Simple LED Circuit
**File**: `output/sample-circuits/simple-led-circuit.json`

**Topology**: Battery → LED (series connection)

**Expected Graph**:
- 2 components (Battery, SmallLED)
- 4 pins total
- 2 wires

### Switch-Controlled LED
**File**: `output/sample-circuits/switch-controlled-led.json`

**Topology**: Battery → Switch → LED

**Expected Graph**:
- 3 components (Battery, Switch, SmallLED)
- 6 pins total
- 3 wires

### Relay Circuit
**File**: `output/sample-circuits/relay-circuit.json`

**Topology**: Two isolated circuits (control + power)

**Expected Graph**:
- 6 components (2 Batteries, Switch, Relay, 2 LEDs)
- Relay with 4 pins (cmd_in, cmd_out, power_in, power_out)
- 7 wires

### Transistor Circuit
**File**: `output/sample-circuits/transistor-circuit.json`

**Topology**: Transistor switching multiple circuits

**Expected Graph**:
- 8 components (2 Batteries, 2 Switches, Transistor, 2 LEDs, Lightbulb)
- Transistor with 3 pins (collector, base, emitter)
- 9 wires

## Error Messages

### Invalid JSON

**Error**: `❌ Invalid JSON: Unexpected token } at position 152`

**Cause**: Malformed JSON syntax (missing comma, bracket, etc.)

**Fix**: Validate JSON syntax (use JSON validator or linter)

### Referential Integrity Error

**Error**: `❌ Wire 62d38c6c references non-existent enode abc123`

**Cause**: Circuit data has broken references

**Fix**: Ensure circuit JSON was generated by Circuit.toJSON() (feature 001)

### Render Error

**Error**: `❌ Failed to render graph: layout timeout`

**Cause**: Circuit too large or complex for automatic layout

**Fix**: Reduce circuit size (visualizer supports up to 50 components)

## Tips & Tricks

### Viewing Large Circuits

If graph is too large to see clearly:
1. Use browser zoom (Cmd/Ctrl + scroll)
2. Right-click SVG → "Save Image As..." → View in image viewer with zoom
3. Consider splitting circuit into smaller sub-circuits for debugging

### Comparing Circuits

To compare two circuit topologies:
1. Visualize circuit A, take screenshot
2. Clear and visualize circuit B, take screenshot
3. Compare screenshots side-by-side

### Exporting Graphs

To save graph for documentation:
1. Right-click on rendered SVG
2. Select "Save Image As..."
3. Save as SVG or PNG (if browser supports)

### Performance

**Slow rendering?**
- Check circuit size (component count)
- Try simpler layout (if future versions support layout selection)
- Use smaller UUID display (already optimized to 8 chars)

## Troubleshooting

### Graph Not Rendering

**Symptom**: Empty graph container after clicking "Visualize"

**Checks**:
1. Browser console for errors (F12 → Console)
2. Circuit JSON validity (paste into JSON validator)
3. Browser compatibility (use modern Chrome/Firefox/Safari/Edge)

### File:// Protocol Issues

**Symptom**: CORS errors or WASM loading failures

**Fix**: Use a local HTTP server instead:
```bash
npx http-server output -p 8080
```

### Missing Dependencies

**Symptom**: "CircuitVisualizer is not defined"

**Fix**: Rebuild the visualizer:
```bash
npm run build:visualizer
```

## Integration with Development Workflow

### During Circuit Development

1. Create circuit using core API
2. Export to JSON: `circuit.toJSON()`
3. Save to file: `output/my-circuit.json`
4. Visualize in topology visualizer
5. Iterate on circuit design based on visual feedback

### Debugging Simulation Issues

1. Circuit not behaving as expected in simulation?
2. Export circuit JSON
3. Visualize topology to verify wiring
4. Fix wiring errors in code
5. Re-test simulation

### Documentation & Communication

1. Generate circuit diagrams for documentation
2. Share circuit topology screenshots with team
3. Use visual representation in bug reports
4. Include topology diagrams in design reviews

## Next Steps

After mastering the basics:
1. Explore different circuit topologies (relay, transistor)
2. Use visualizer to validate your own circuits
3. Integrate visualizer into debugging workflow
4. Provide feedback for future enhancements

## Related Documentation

- [Feature Specification](./spec.md) - Requirements and user stories
- [Data Model](./data-model.md) - Circuit JSON schema and transformations
- [API Contract](./contracts/visualizer-api.md) - Programmatic usage
- [Implementation Plan](./plan.md) - Technical architecture

## Support

**Issues?**
- Check browser console for errors
- Verify circuit JSON structure
- Ensure using supported browser (Chrome/Firefox/Safari/Edge 90+)

**Feature Requests?**
- See [Out of Scope](./spec.md#out-of-scope-optional) for planned future features
- Submit ideas as project issues
