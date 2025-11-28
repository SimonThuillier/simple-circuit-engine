/**
 * Circuit API Contract
 *
 * Public interface for the Circuit class - the primary entry point for
 * managing circuit topology. This contract defines all public methods
 * available to consumers.
 *
 * @module core/Circuit
 */

import { UUID, Position, Rotation } from '../types';
import { Component } from './Component';
import { ENode } from './ENode';
import { Wire } from './Wire';

/**
 * Main container managing all circuit elements with automatic lifecycle.
 *
 * The Circuit class provides:
 * - Component and Wire management (users add/remove these)
 * - Automatic ENode lifecycle (created/removed automatically)
 * - Cascade deletion (removing components removes pins + wires)
 * - Orphaned ENode cleanup (branching points with no wires)
 * - Wire splitting (automatic branching point creation)
 *
 * @example
 * ```typescript
 * const circuit = new Circuit();
 *
 * // Add a component at position (10, 20) with 90° rotation and 2 pins
 * const comp = circuit.addComponent(
 *   new Position(10, 20),
 *   new Rotation(90),
 *   2
 * );
 *
 * // Add a wire between two nodes
 * const wire = circuit.addWire(pin1Id, pin2Id);
 * if (wire instanceof Error) {
 *   console.error('Failed to create wire:', wire.message);
 * }
 * ```
 */
export interface ICircuit {
  // ==================== Component Management ====================

  /**
   * Add a new component to the circuit.
   *
   * Automatically creates pin ENodes for the component and links them
   * bidirectionally.
   *
   * @param position - Grid position (x, y integers)
   * @param rotation - Orientation angle (integer degrees)
   * @param pinCount - Number of pins (0+, typically <50)
   * @returns The created Component
   * @throws {TypeError} If position/rotation coordinates are not integers
   * @throws {RangeError} If pinCount is negative
   *
   * @see FR-011, FR-013, FR-014, FR-015, FR-017
   */
  addComponent(
    position: Position,
    rotation: Rotation,
    pinCount: number
  ): Component;

  /**
   * Remove a component from the circuit.
   *
   * Cascade deletes:
   * - All pin ENodes belonging to the component
   * - All Wires connected to those pins
   * - Any orphaned branching ENodes after wire removal
   *
   * @param id - Component UUID
   * @returns void
   * @throws {Error} If component does not exist
   *
   * @see FR-015, FR-016, FR-042
   */
  removeComponent(id: UUID): void;

  /**
   * Get a component by ID.
   *
   * @param id - Component UUID
   * @returns The Component or undefined if not found
   *
   * @see FR-005
   */
  getComponent(id: UUID): Component | undefined;

  /**
   * Get all components in the circuit.
   *
   * @returns Array of all Components
   *
   * @see FR-006
   */
  getAllComponents(): Component[];

  // ==================== Wire Management ====================

  /**
   * Add a wire connecting two electrical nodes.
   *
   * Validates:
   * - Both nodes exist
   * - Not a self-connection (node1 !== node2)
   * - No duplicate wire already exists
   *
   * Updates bidirectional references:
   * - Wire → ENodes
   * - Each ENode → Wire
   *
   * @param node1 - First ENode UUID
   * @param node2 - Second ENode UUID
   * @param intermediatePositions - Optional path waypoints for rendering
   * @returns The created Wire, or Error if validation fails
   *
   * @see FR-025, FR-026, FR-027, FR-030, FR-031, FR-032
   */
  addWire(
    node1: UUID,
    node2: UUID,
    intermediatePositions?: Position[]
  ): Wire | Error;

  /**
   * Remove a wire from the circuit.
   *
   * Automatically removes orphaned branching ENodes (nodes with no
   * remaining wire connections).
   *
   * @param id - Wire UUID
   * @returns void
   * @throws {Error} If wire does not exist
   *
   * @see FR-034, FR-035, FR-036, FR-042
   */
  removeWire(id: UUID): void;

  /**
   * Split an existing wire by creating a branching point.
   *
   * Given wire (A → B), split at position P to connect to node C:
   * - Creates branching ENode at position P
   * - Replaces original wire with three wires:
   *   - Wire1: A → P
   *   - Wire2: P → B
   *   - Wire3: P → C
   *
   * @param wireId - Wire to split
   * @param position - Position for new branching ENode (integers)
   * @param targetENodeId - ENode to connect to from branch point
   * @returns void
   * @throws {Error} If wire or target node doesn't exist
   * @throws {TypeError} If position coordinates are not integers
   *
   * @see FR-024, FR-025, FR-028, FR-029
   */
  splitWire(
    wireId: UUID,
    position: Position,
    targetENodeId: UUID
  ): void;

  /**
   * Get a wire by ID.
   *
   * @param id - Wire UUID
   * @returns The Wire or undefined if not found
   *
   * @see FR-005
   */
  getWire(id: UUID): Wire | undefined;

  /**
   * Get all wires in the circuit.
   *
   * @returns Array of all Wires
   *
   * @see FR-008
   */
  getAllWires(): Wire[];

  // ==================== ENode Queries ====================

  /**
   * Get an electrical node by ID.
   *
   * Note: ENodes are automatically managed and not directly created
   * or removed by users.
   *
   * @param id - ENode UUID
   * @returns The ENode or undefined if not found
   *
   * @see FR-005
   */
  getENode(id: UUID): ENode | undefined;

  /**
   * Get all electrical nodes in the circuit.
   *
   * Includes both pin nodes (from components) and branching point nodes
   * (from wire splits).
   *
   * @returns Array of all ENodes
   *
   * @see FR-007
   */
  getAllENodes(): ENode[];

  /**
   * Get all wires connected to a specific ENode.
   *
   * Efficient O(1) lookup using bidirectional references.
   *
   * @param nodeId - ENode UUID
   * @returns Array of connected Wires, or empty array if node not found
   *
   * @see FR-033, FR-037
   */
  getWiresByNode(nodeId: UUID): Wire[];

  /**
   * Get both ENodes connected by a wire.
   *
   * @param wireId - Wire UUID
   * @returns Tuple [node1, node2] or undefined if wire not found
   *
   * @see FR-034, FR-038
   */
  getNodesByWire(wireId: UUID): [ENode, ENode] | undefined;

  // ==================== Relationship Queries ====================

  /**
   * Find all components connected to a specific component via wires.
   *
   * Traverses: Component → pins → wires → other pins → other components
   *
   * @param componentId - Component UUID
   * @returns Array of connected Components
   *
   * @see FR-009
   */
  getConnectedComponents(componentId: UUID): Component[];

  /**
   * Check if a wire already exists between two nodes.
   *
   * Order-independent: returns true for (A, B) or (B, A).
   *
   * @param node1 - First ENode UUID
   * @param node2 - Second ENode UUID
   * @returns true if wire exists, false otherwise
   *
   * @see FR-031 (duplicate detection)
   */
  hasWireBetween(node1: UUID, node2: UUID): boolean;

  // ==================== Serialization ====================

  /**
   * Serialize circuit to JSON.
   *
   * @returns JSON-serializable object containing all components, enodes, wires
   */
  toJSON(): {
    components: object[];
    enodes: object[];
    wires: object[];
  };

  /**
   * Deserialize circuit from JSON.
   *
   * @param json - Circuit data
   * @returns Circuit instance
   * @throws {Error} If JSON is invalid or violates invariants
   */
  static fromJSON(json: object): ICircuit;
}
