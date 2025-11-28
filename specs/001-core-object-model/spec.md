# Feature Specification: Core Object Model

**Feature Branch**: `001-core-object-model`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "create first core object model classes with Component the base class for components placed on the circuit, ENodes representing the electrical atomic points (either component pins or branching points in wires) and Wires representing the wires connecting ENodes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Circuit with Components (Priority: P1)

As a circuit designer, I need to create a circuit container and place electrical components within it so that I can build a functional circuit design.

**Why this priority**: This is the foundational capability - the Circuit container and Component entities are the essential building blocks. Without these, no circuit design system can exist. This delivers immediate value by establishing the container and basic circuit elements.

**Independent Test**: Can be fully tested by creating a Circuit instance, adding component instances to it, and verifying they can be tracked and queried through the circuit's APIs. Delivers the ability to represent any electrical component within a managed circuit.

**Acceptance Scenarios**:

1. **Given** no existing circuit, **When** a Circuit is created, **Then** an empty circuit container exists ready to hold components
2. **Given** an empty circuit, **When** a component is created and placed with position (x, y) and rotation, **Then** the component exists in the circuit with a unique identifier, position, and rotation
3. **Given** multiple components, **When** they are placed on the circuit at different positions, **Then** each component maintains its distinct identity, position, rotation, and properties
4. **Given** a circuit with components, **When** the circuit is queried for all components, **Then** all placed components are returned with their positions and rotations
5. **Given** a placed component, **When** its properties are queried through the circuit, **Then** the correct component type, position, rotation, and attributes are returned

---

### User Story 2 - Define Electrical Connection Points (Priority: P2)

As a circuit designer, I need to identify connection points on components and within the circuit so that I can understand where electrical connections can be made.

**Why this priority**: After having components (P1), we need connection points to enable actual circuit connectivity. This is the second essential building block that enables wiring.

**Independent Test**: Can be tested by creating components with pins, verifying each pin has a unique electrical node, and confirming that branching points can be established in the circuit space. Delivers the ability to identify all potential connection locations.

**Acceptance Scenarios**:

1. **Given** a component with multiple pins, **When** the component is created, **Then** each pin has a corresponding electrical node (ENode)
2. **Given** two wire segments meeting, **When** a branching point is needed at position (x, y), **Then** an electrical node (ENode) is created at the junction with the specified position
3. **Given** an electrical node, **When** queried, **Then** it reports whether it's a component pin or a branching point
4. **Given** a branching point ENode, **When** queried, **Then** it returns its position (x, y) on the grid
5. **Given** multiple nodes, **When** they are created, **Then** each node has a unique identifier within the circuit

---

### User Story 3 - Connect Components with Wires (Priority: P3)

As a circuit designer, I need to connect electrical nodes with wires so that I can create complete electrical pathways in my circuit.

**Why this priority**: With components (P1) and connection points (P2) established, wiring is the final piece that creates functional circuits. This completes the basic object model.

**Independent Test**: Can be tested by creating wires between existing electrical nodes and verifying the connections are maintained and queryable. Delivers complete circuit connectivity capability.

**Acceptance Scenarios**:

1. **Given** two electrical nodes, **When** a wire is created connecting them, **Then** the wire establishes a bidirectional connection between the nodes
2. **Given** two electrical nodes, **When** a wire is created with intermediate positions for rendering, **Then** the wire stores the intermediate positions for ad-hoc path rendering
3. **Given** a wire connecting two nodes, **When** the wire is queried, **Then** it reports both connected nodes and any intermediate positions
4. **Given** an electrical node, **When** queried for connected wires, **Then** all wires connected to that node are returned
5. **Given** multiple wires, **When** they share a common node, **Then** the node reports all connected wires

---

### Edge Cases

- Attempting to create a wire between the same node (self-connection) is rejected with an error message and circuit state remains unchanged
- the system should allow components with no pins (zero electrical nodes), although such components cannot be wired and are not the primary goal of this model
- A wire can be rendered as a straight line (no intermediate positions) or with intermediate positions for ad-hoc paths
- System should refuse to create wire without at least one previously existing enode
- If a wire has to be created from an existing wire to an existing enode, a new enode is created and the existing wire is **split** into two wires connected to the new enode and the other end enodes of the original wire
- System handle should always remove orphaned enodes (nodes not connected to any component or wire)
- Attempting to create duplicate wires between the same two nodes is rejected with an error message and circuit state remains unchanged
- System should typically handle small components (<50 pins). No need to foresee handling components with a very large number of pins (e.g., integrated circuits with hundreds of pins)
- When a component is removed, its pin ENodes and all connected wires are automatically cascade deleted
- When a wire is removed, its enodes not pins of components and not connected to any other wire are automatically removed as orphaned enodes
- Removing the same element twice is a no-op : a check of existence should be done before attempting removal : if the element does not exist, return a message indicating so and leave circuit state unchanged
- Component positions and rotations must be valid integers on a 2D discrete grid
- Branching point ENode positions must be valid integers on a 2D discrete grid
- Wire intermediate positions (if specified) must be valid integer coordinates

## Clarifications

### Session 2025-11-28

- Q: Should the Circuit class be part of the core object model? → A: Yes, Circuit is the foundational container that binds together all components, enodes and wires. It will provide critical APIs to the rendering and playback modules.
- Q: Should the Circuit support removing/deleting components, wires, and enodes after they're created, or is creation-only sufficient for this iteration? → A: Full lifecycle support (create and delete for all elements)
- Q: When a component is removed, what should happen to its associated wires and enodes? → A: Cascade deletion (removing component automatically removes its wires and pin nodes)
- Q: How should component pins be identified and accessed? → A: Both index and optional name (pins always have index, optionally have semantic name)
- Q: What core query operations must the Circuit provide for rendering modules to visualize the circuit? → A: Basic enumeration (get all components, get all wires, get all nodes) and relationship queries
- Q: What additional operations (beyond enumeration and relationships) must the Circuit provide specifically for playback/simulation modules? → A: Same basic queries
- Q: What happens when attempting to create a wire between the same node (self-connection)? → A: This is a no-op - return a message saying it's impossible and circuit state remains untouched
- Q: Should the system allow multiple wires between the same two nodes, or should duplicates be rejected? → A: Reject duplicates (attempting to create a duplicate wire returns error, state unchanged)
- Q: What is the management philosophy for ENodes in relation to Components and Wires? → A: ENodes are automatically managed - created/removed following component and wire operations. Users primarily add/remove components and wires; ENodes maintain electrical topology consistency automatically.
- Q: Should the core model include positioning information for rendering? → A: Yes, core model must persist minimal position information for rendering on a 2D discrete grid. Components have position (x, y integers) and rotation (integer). Branching point ENodes have position (x, y integers). Wires support an array of intermediate positions for rendering ad-hoc paths (not only straight lines).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Circuit container that manages all circuit elements
- **FR-002**: System MUST allow the Circuit to maintain collections of all Components, ENodes, and Wires
- **FR-003**: System MUST provide Circuit APIs for adding and removing components and wires
- **FR-004**: System MUST automatically manage ENode lifecycle based on component and wire operations
- **FR-005**: System MUST provide Circuit APIs for querying components, nodes, and wires
- **FR-006**: System MUST provide Circuit APIs to enumerate all components
- **FR-007**: System MUST provide Circuit APIs to enumerate all ENodes
- **FR-008**: System MUST provide Circuit APIs to enumerate all Wires
- **FR-009**: System MUST provide Circuit APIs to query relationships (which wires connect to which nodes, which nodes belong to which components or is a branching point enode)
- **FR-010**: System MUST provide the same enumeration and relationship query APIs for use by playback/simulation modules
- **FR-011**: System MUST provide a base Component representation that can be placed on a circuit
- **FR-012**: System MUST allow Components to have a unique identifier within a circuit
- **FR-013**: System MUST allow Components to have a position on a 2D discrete grid (x, y integer coordinates)
- **FR-014**: System MUST allow Components to have a rotation (integer value representing rotation angle)
- **FR-015**: System MUST allow Components to be removed from the circuit
- **FR-016**: System MUST cascade delete all associated pin ENodes and connected Wires when a Component is removed
- **FR-017**: System MUST automatically create pin ENodes when a Component is added to the circuit
- **FR-018**: System MUST provide ENode (electrical node) entities representing atomic electrical connection points
- **FR-019**: System MUST distinguish between ENodes that represent component pins versus circuit branching points
- **FR-020**: System MUST allow ENodes to be associated with their parent Component (for pin nodes)
- **FR-021**: System MUST allow branching point ENodes to have a position on a 2D discrete grid (x, y integer coordinates)
- **FR-022**: System MUST allow component pins (ENodes) to be accessed by numeric index
- **FR-023**: System MUST allow component pins (ENodes) to have optional semantic names
- **FR-024**: System MUST allow component pins to be accessed by name when a name is assigned
- **FR-025**: System MUST provide Wire entities that connect exactly two ENodes
- **FR-026**: System MUST allow Wires to support an array of intermediate positions (x, y integer coordinates) for rendering ad-hoc paths
- **FR-027**: System MUST require at least one existing ENode when creating a wire
- **FR-028**: System MUST automatically create a branching point ENode when connecting a wire from an existing wire to an existing ENode
- **FR-029**: System MUST split an existing wire into two wires when a branching point ENode is created on it
- **FR-030**: System MUST reject attempts to create a wire connecting a node to itself (self-connection) with an error message
- **FR-031**: System MUST reject attempts to create duplicate wires between the same two nodes with an error message
- **FR-032**: System MUST ensure the circuit state remains unchanged when invalid wire creation is attempted
- **FR-033**: System MUST maintain bidirectional references between Wires and their connected ENodes
- **FR-034**: System MUST allow Wires to be removed from the circuit
- **FR-035**: System MUST automatically remove orphaned branching point ENodes (not connected to any wire) when a wire is removed
- **FR-036**: System MUST automatically remove orphaned branching point ENodes during all circuit operations
- **FR-037**: System MUST allow querying which Wires are connected to a given ENode
- **FR-038**: System MUST allow querying which ENodes are connected by a given Wire
- **FR-039**: System MUST ensure each ENode has a unique identifier within a circuit
- **FR-040**: System MUST ensure each Wire has a unique identifier within a circuit
- **FR-041**: System MUST allow Components to have zero or more pins (zero or more associated ENodes)
- **FR-042**: System MUST check for element existence before removal and return an error message if element doesn't exist

### Key Entities

- **Circuit**: The foundational container that binds together all circuit elements. Manages collections of Components, ENodes, and Wires. Provides APIs for:
  - Adding and removing components and wires (ENodes are automatically managed)
  - Enumerating all components, enodes, and wires
  - Querying relationships between elements
  - Forecasting rendering operations (visual display via enumeration and relationship queries)
  - Forecasting playback/simulation operations (electrical behavior analysis)

  Maintains the integrity and relationships between all circuit elements, including automatic ENode lifecycle management, cascade deletion, orphaned ENode cleanup, and wire splitting when needed.

- **Component**: Represents an electrical component that can be placed on a circuit. Has a unique identifier, position on a 2D discrete grid (x, y integer coordinates), rotation (integer angle), and can have zero or more pins. Component pins are indexed numerically (0, 1, 2, ...) and may optionally have semantic names (e.g., "anode", "cathode", "base", "collector"). This is the base class for all circuit components (resistors, capacitors, transistors, etc.).

- **ENode (Electrical Node)**: Represents an atomic electrical connection point. Automatically managed by the Circuit - users do not directly create or remove ENodes. Can be either:
  - A component pin (automatically created when component is added, belongs to a specific Component, has an index and optional name, position derived from component)
  - A branching point (automatically created when wires are split or connected, has a position on a 2D discrete grid (x, y integer coordinates), automatically removed when orphaned)

  Has a unique identifier and maintains references to all connected Wires. When representing a component pin, stores both the pin index and optional semantic name. Branching point ENodes have explicit positions for rendering wire junction points and are automatically cleaned up when they become orphaned (not connected to any wire).

- **Wire**: Represents a symmetrical end-to-end electrical connection between exactly two ENodes. Has a unique identifier, maintains references to both connected nodes, and supports an array of intermediate positions (x, y integer coordinates) for rendering ad-hoc paths (not only straight lines). Enables electrical current flow between connection points. Can be split into two wires when a branching point is created along its path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A circuit can be created containing at least 100 components without performance degradation
- **SC-002**: All relationships between Components, ENodes, and Wires can be queried in constant or near-constant time
- **SC-003**: A circuit with 1000 ENodes and 1000 Wires can be traversed to find all connections from any given node in under 100 milliseconds
- **SC-004**: The object model correctly represents circuits with varying complexity (from simple 2-component circuits to complex circuits with 100+ components and 500+ connections)
- **SC-005**: 100% of valid component-wire-node relationships can be created and queried without errors
- **SC-006**: All invalid relationships (e.g., wire connecting non-existent nodes) are prevented or clearly identified as errors

## Assumptions

- All components exist in a single circuit context (no multi-circuit scenarios)
- Unique identifiers within circuit are UUIDs
- The system is single-threaded (no concurrent modification requirements)
- Wires support intermediate positions for ad-hoc path rendering on a 2D discrete grid (integer coordinates)
- Positions are stored as minimal data (x, y integers) for rendering on a 2D discrete grid
- Element modification (changing properties after creation) is out of scope - only creation and deletion are supported
- Electrical behavior simulation (voltage, current, resistance calculations) is out of scope for the core object model - the Circuit provides only structural/topological data
- System is designed for small to medium components (typically <50 pins) - no specific optimization for very large components (e.g., integrated circuits with hundreds of pins)
