# Feature Specification: Circuit Topology Visualizer

**Feature Branch**: `002-topology-visualizer`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Create a logical visualizer to debug future, more complex circuits. The project should be able to build a script output/circuit-topology-visualizer.js that circuit-topology-visualizer.html. User will input a sample circuit json in this page and it will display the logical representation of the circuit. Positions and beautiful graphics doesnt matter : it will display components as nodes, enodes as connectors and wires as links using DOT language and viz lite."

## Clarifications

### Session 2025-11-29

- Q: How should pins be visually grouped with their components? → A: Represent pins as sub-elements within component nodes, visually nested/grouped
- Q: What UUID format should be used for display? → A: Display shortened UUIDs (first 8 characters) directly on nodes/edges
- Q: How should branching-point enodes be visualized? → A: Show branching points as small intermediate nodes on wire paths with their shortened UUID
- Q: What information should be displayed for each pin? → A: Display both semantic label and shortened UUID (e.g., "anode [a1b2c3d4]")
- Q: How should wire UUIDs be presented on edges? → A: Display shortened UUID as a label at the edge midpoint

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualize Circuit Topology from JSON (Priority: P1)

As a developer debugging circuit logic, I need to load a circuit JSON file and see its topology as a graph so that I can quickly understand how enodes (and their components in the case of pins) are connected without reading raw JSON.

**Why this priority**: This is the core functionality - visualizing circuit structure is the primary value. Without this, developers must mentally parse JSON to understand connections, which is error-prone and time-consuming for complex circuits.

**Independent Test**: Can be fully tested by loading a circuit JSON file, clicking visualize, and verifying that a graph appears showing components and their connections, delivering immediate debugging value.

**Acceptance Scenarios**:

1. **Given** I have a circuit JSON file, **When** I paste it into the visualizer input, **Then** a topology graph is displayed
2. **Given** a circuit with 5 components and 8 wires, **When** I visualize it, **Then** I see 5 component nodes and 8 connection links
3. **Given** I load the same circuit JSON twice, **When** I compare the graphs, **Then** the visualizations are identical (deterministic rendering)

---

### User Story 2 - Identify Components and Connection Types (Priority: P2)

As a developer troubleshooting wiring errors, I need to see component types (Battery, LED, Switch, etc.) and ENode identifiers in the graph so that I can trace signal flow and spot incorrect connections.

**Why this priority**: While visualization (P1) shows structure, this adds semantic information needed for actual debugging. Knowing which node is a Battery vs LED is essential for understanding circuit behavior, but the basic graph structure is more fundamental.

**Independent Test**: Can be tested by loading a circuit with multiple component types and verifying that each node displays its type label and ENodes are distinguishable from components, enabling targeted debugging.

**Acceptance Scenarios**:

1. **Given** a circuit with different component types, **When** I view the graph, **Then** each node shows its component type (e.g., "Battery", "LED", "Switch")
2. **Given** a component with multiple pins, **When** I examine its node in the graph, **Then** I can see all its ENode connections
3. **Given** two wires connecting different component pins, **When** I view the topology, **Then** the connections are distinct and labeled with pin identifiers

---

### User Story 3 - Use Standalone HTML Page (Priority: P3)

As a developer without a running dev server, I need to open a single HTML file in my browser to use the visualizer so that I can debug circuits without build tooling or dependencies.

**Why this priority**: Convenience feature that improves accessibility but assumes the visualizer already works (P1, P2). A standalone HTML file is valuable for quick debugging sessions, but the visualization capability itself is more critical.

**Independent Test**: Can be tested by opening the HTML file directly in a browser (file:// protocol), loading a circuit JSON, and verifying the visualizer works without external dependencies or servers.

**Acceptance Scenarios**:

1. **Given** I have the HTML file, **When** I open it in a browser without a server, **Then** the visualizer loads and is fully functional
2. **Given** I'm on a machine without internet, **When** I use the visualizer, **Then** all required libraries are bundled and the tool works offline
3. **Given** I share the HTML file with a colleague, **When** they open it, **Then** they can visualize circuits without any setup

---

### Edge Cases

- Q : What happens when the circuit JSON is invalid or malformed? A : The visualizer should display an error message indicating the issue. No effort should be made to recover from malformed input.
- Q: What happens when a circuit has no components (empty circuit)? A: Only display the name of the circuit and nothing else.
- Q: What happens when a circuit has hundreds of components (very large graph)? A: no special treatment, assume tested circuits are small (under 30 components)
- Q: What happens when ENodes are disconnected (no wires connected to some pins)? A: model ensures it only happens for component pins which must always be visible with their components, even if no wires connect to them.
- Q: What happens when the DOT graph generation fails or produces invalid output? A: display an error message indicating the failure.
- Q: What happens if the user's browser doesn't support required features? A: display a message indicating the browser is unsupported.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST accept circuit JSON as input (paste or file upload)
- **FR-002**: System MUST parse circuit JSON to extract components, ENodes, and wires
- **FR-003**: System MUST represent components as graph nodes in the visualization
- **FR-004**: System MUST represent pin-type ENodes as sub-elements visually grouped within their parent component nodes, and branching-point-type ENodes as small intermediate nodes on wire paths
- **FR-005**: System MUST represent wires as graph edges connecting ENodes
- **FR-006**: System MUST generate a graph representation of the circuit topology
- **FR-007**: System MUST render the graph representation visually
- **FR-008**: System MUST display component types (Battery, LED, Switch, etc.) on component nodes
- **FR-009**: System MUST display shortened UUIDs (first 8 characters) for all components, ENodes, and wires
- **FR-010**: System MUST handle circuit JSON from the sample circuits (generated by feature 001)
- **FR-011**: Visualizer MUST be accessible via an HTML page that can open in browsers
- **FR-012**: System MUST provide error messages when circuit JSON is invalid
- **FR-013**: System MUST package all visualizer functionality into distributable output files
- **FR-014**: HTML page MUST load all required visualizer code and render the interface
- **FR-015**: System MUST work without requiring external network requests (offline-capable)
- **FR-016**: System MUST display both semantic pin labels and shortened UUIDs for pin-type ENodes (format: "label [uuid]", e.g., "anode [a1b2c3d4]")
- **FR-017**: System MUST display wire shortened UUIDs as labels at edge midpoints

### Key Entities

- **Circuit JSON**: Input data containing circuit definition (components, ENodes, wires, metadata)
- **Component Node**: Visual representation of a circuit component with type label, shortened UUID, and nested pin sub-elements
- **Pin ENode**: Visual representation of a component pin, displayed as a sub-element within the component node, showing semantic label and shortened UUID (e.g., "anode [a1b2c3d4]")
- **Branching Point ENode**: Visual representation of a wire junction point (not attached to any component), displayed as a small intermediate node with shortened UUID
- **Wire Edge**: Visual representation of a wire connecting two ENodes, with shortened UUID displayed as a label at the edge midpoint
- **DOT Graph**: Text-based graph description in DOT language format
- **Visualizer HTML Page**: Standalone page hosting the visualization tool
- **Bundled Script**: Compiled JavaScript file containing all visualizer logic

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Circuit JSON files load successfully without errors in 95% of attempts
- **SC-002**: Visualizer displays all components present in the circuit JSON (100% node coverage)
- **SC-003**: Visualizer displays all wires present in the circuit JSON (100% edge coverage)
- **SC-004**: Graph renders in under 3 seconds for circuits with up to 50 components
- **SC-005**: Users can identify component types, pin labels, and entity UUIDs without referring to the JSON
- **SC-006**: Visualizer HTML page opens and functions in modern browsers (Chrome, Firefox, Safari, Edge) without server
- **SC-007**: Developers can successfully debug wiring issues using the topology view with UUID traceability
- **SC-008**: All ENode types (pins and branching points) are visually distinguishable and properly displayed

## Assumptions _(optional)_

- Circuit JSON format matches the structure produced by the Circuit.toJSON() method (feature 001)
- Users have modern web browsers with standard JavaScript support
- Graph representation format can adequately describe circuit topology structure
- Visualization library can render graphs within browser environment
- Users understand basic circuit concepts (components, pins, wires)
- Visual positioning of nodes is not critical (automatic layout is acceptable)
- Color coding or advanced styling is not required for MVP
- User prefers DOT language and viz-lite library (as mentioned in original request) but spec remains technology-agnostic

## Dependencies _(optional)_

- Circuit JSON format from existing Circuit class (feature 001)
- Sample circuit JSON files generated by feature 001
- Graph visualization capability for rendering circuit topology
- Build process capable of creating bundled output
- Browser support for file input operations (if file upload is implemented)

## Out of Scope _(optional)_

- Interactive editing of circuits within the visualizer
- Saving modified circuits back to JSON
- Real-time circuit simulation or state visualization
- 3D rendering or spatial layout based on circuit positions
- Advanced graph layout algorithms or customization
- Circuit validation or error detection logic
- Integration with other debugging tools or IDEs
- Support for circuit formats other than the project's JSON schema
- Performance optimization for circuits with thousands of components
- Mobile device support or responsive design
- Accessibility features (ARIA labels, keyboard navigation)
