/**
 * Circuit Class
 *
 * Main container managing all circuit elements with automatic lifecycle.
 * Provides the primary API for creating and manipulating circuit topology.
 *
 * @module core/Circuit
 */

import type { UUID } from './types/Identifier.js';
import { Position } from './types/Position.js';
import { Rotation } from './types/Rotation.js';
import { Component } from './Component.js';
import { ENode } from './ENode.js';
import { ENodeType } from './types/ENodeType.js';
import { Wire } from './Wire.js';
import type { ComponentType } from './types/ComponentType.js';
import { getComponentTypeMetadata } from './types/ComponentType.js';

/**
 * Circuit container managing components, ENodes, and wires.
 *
 * The Circuit class provides:
 * - Component management (add/remove with automatic pin ENode creation)
 * - Topology queries (get by ID, enumerate all)
 * - Automatic lifecycle management (cascade deletion, orphan cleanup)
 * - JSON serialization for persistence
 *
 * **Key Principles**:
 * - Users manage Components and Wires; ENodes are managed automatically
 * - Removing a Component cascades to remove its pins and connected wires
 * - Orphaned branching ENodes (no wires) are automatically removed
 * - All operations maintain bidirectional consistency
 *
 * @example
 * ```typescript
 * const circuit = new Circuit();
 *
 * // Add a component at position (10, 20) with 2 pins
 * const lightbulb = circuit.addComponent(
 *   new Position(10, 20),
 *   new Rotation(90),
 *   2
 * );
 *
 * console.log(lightbulb.id);    // UUID
 * console.log(lightbulb.pins);  // [pin-uuid-1, pin-uuid-2]
 *
 * // Query components
 * const comp = circuit.getComponent(lightbulb.id);
 * const all = circuit.getAllComponents();
 *
 * // Remove component (cascade deletes pins and wires)
 * circuit.removeComponent(lightbulb.id);
 * ```
 */
export class Circuit {
  /**
   * Map of all components in the circuit (UUID → Component).
   * @private
   */
  private components: Map<UUID, Component>;

  /**
   * Map of all electrical nodes in the circuit (UUID → ENode).
   * Includes both pin nodes and branching point nodes.
   * @private
   */
  private enodes: Map<UUID, ENode>;

  /**
   * Map of all wires in the circuit (UUID → Wire).
   * @private
   */
  private wires: Map<UUID, Wire>;

  /**
   * Create a new empty circuit.
   */
  constructor() {
    this.components = new Map();
    this.enodes = new Map();
    this.wires = new Map();
  }

  /**
   * Add a new component to the circuit.
   *
   * Automatically creates pin ENodes for the component and links them
   * bidirectionally. Pin ENode UUIDs are stored in the component's pins array.
   * Pin labels are derived from the ComponentType metadata.
   *
   * @param type - Component type (Battery, Switch, LED, etc.)
   * @param position - Grid position (x, y integers)
   * @param rotation - Orientation angle (integer degrees)
   * @returns The created Component
   * @throws {TypeError} If position/rotation coordinates are not integers
   *
   * @example
   * ```typescript
   * const lightbulb = circuit.addComponent(
   *   new Position(10, 20),
   *   new Rotation(90),
   *   ComponentType.Lightbulb
   * );
   *
   * console.log(lightbulb.type);        // ComponentType.Lightbulb
   * console.log(lightbulb.pins.length); // 2
   * console.log(lightbulb.position.x);  // 10
   * ```
   */
  addComponent(type: ComponentType, position: Position, rotation: Rotation): Component {
    // Get component type metadata
    const metadata = getComponentTypeMetadata(type);

    // Create component first (to get its ID)
    const component = new Component(type, position, rotation, []);

    // Create pin ENodes for the component using metadata pin labels
    const pins: UUID[] = [];
    for (const pinLabel of metadata.pins) {
      const pinNode = new ENode(
        ENodeType.Pin,
        component.id,
        pinLabel,
        undefined // Pin position derived from component
      );

      // Add ENode to circuit
      this.enodes.set(pinNode.id, pinNode);

      // Store pin ID
      pins.push(pinNode.id);
    }

    // Update component with pin IDs using Object.defineProperty
    // (Component.pins is readonly, but we're in the trusted Circuit context)
    Object.defineProperty(component, 'pins', {
      value: pins,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    // Add component to circuit
    this.components.set(component.id, component);

    return component;
  }

  /**
   * Remove a component from the circuit.
   *
   * **Cascade deletion** removes:
   * - All pin ENodes belonging to the component
   * - All Wires connected to those pins
   * - Any orphaned branching ENodes after wire removal
   *
   * @param id - Component UUID
   * @throws {Error} If component does not exist
   *
   * @example
   * ```typescript
   * circuit.removeComponent(componentId);
   * // Component, its pins, and connected wires are all removed
   * ```
   */
  removeComponent(id: UUID): void {
    const component = this.components.get(id);

    if (!component) {
      throw new Error(`Component ${id} does not exist`);
    }

    // Remove all wires connected to this component's pins
    for (const pinId of component.pins) {
      const enode = this.enodes.get(pinId);
      if (enode) {
        // Remove all wires connected to this pin
        const wireIds = Array.from(enode.wires);
        for (const wireId of wireIds) {
          this.removeWire(wireId);
        }
      }

      // Remove the pin ENode
      this.enodes.delete(pinId);
    }

    // Remove component from map
    this.components.delete(id);
  }

  /**
   * Get a component by ID.
   *
   * @param id - Component UUID
   * @returns The Component or undefined if not found
   *
   * @example
   * ```typescript
   * const component = circuit.getComponent(componentId);
   * if (component) {
   *   console.log(component.position);
   * }
   * ```
   */
  getComponent(id: UUID): Component | undefined {
    return this.components.get(id);
  }

  /**
   * Get all components in the circuit.
   *
   * Returns a new array on each call (defensive copy).
   *
   * @returns Array of all Components
   *
   * @example
   * ```typescript
   * const components = circuit.getAllComponents();
   * console.log(`Circuit has ${components.length} components`);
   *
   * for (const comp of components) {
   *   console.log(comp.id, comp.position);
   * }
   * ```
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Get an electrical node by ID.
   *
   * Note: ENodes are automatically managed and not directly created
   * or removed by users.
   *
   * @param id - ENode UUID
   * @returns The ENode or undefined if not found
   *
   * @example
   * ```typescript
   * const component = circuit.addComponent(
   *   new Position(10, 20),
   *   new Rotation(0),
   *   2
   * );
   *
   * const pinId = component.pins[0];
   * const enode = circuit.getENode(pinId);
   * console.log(enode.type); // ENodeType.Pin
   * ```
   */
  getENode(id: UUID): ENode | undefined {
    return this.enodes.get(id);
  }

  /**
   * Get all electrical nodes in the circuit.
   *
   * Includes both pin nodes (from components) and branching point nodes
   * (from wire splits).
   *
   * Returns a new array on each call (defensive copy).
   *
   * @returns Array of all ENodes
   *
   * @example
   * ```typescript
   * const enodes = circuit.getAllENodes();
   * console.log(`Circuit has ${enodes.length} electrical nodes`);
   *
   * for (const enode of enodes) {
   *   console.log(enode.id, enode.type);
   * }
   * ```
   */
  getAllENodes(): ENode[] {
    return Array.from(this.enodes.values());
  }

  /**
   * Add a branching point electrical node at a specific position.
   *
   * Branching points are used to split wires and create junctions.
   * @param position
   */
  addBranchingPoint(position: Position): ENode {
    const branchingPoint = new ENode(ENodeType.BranchingPoint, undefined, undefined, position);

    // Add ENode to circuit
    this.enodes.set(branchingPoint.id, branchingPoint);

    return branchingPoint;
  }

  /**
   * Add a wire connecting two electrical nodes.
   *
   * Validates that both nodes exist, not a self-connection, and no duplicate.
   * Updates bidirectional references (Wire ↔ ENodes).
   *
   * @param node1 - First ENode UUID
   * @param node2 - Second ENode UUID
   * @param intermediatePositions - Optional path waypoints for rendering
   * @returns The created Wire, or Error if validation fails
   *
   * @example
   * ```typescript
   * const comp1 = circuit.addComponent(new Position(0, 0), new Rotation(0), 1);
   * const comp2 = circuit.addComponent(new Position(10, 10), new Rotation(0), 1);
   *
   * const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);
   * if (wire instanceof Error) {
   *   console.error('Failed:', wire.message);
   * }
   * ```
   */
  addWire(node1: UUID, node2: UUID, intermediatePositions?: Position[]): Wire | Error {
    // Validate self-connection
    if (node1 === node2) {
      return new Error('Cannot create wire connecting node to itself');
    }

    // Validate both nodes exist
    const enode1 = this.enodes.get(node1);
    const enode2 = this.enodes.get(node2);

    if (!enode1 || !enode2) {
      return new Error('Wire requires at least one existing ENode');
    }

    // Check for duplicate wire
    if (this.hasWireBetween(node1, node2)) {
      return new Error('Duplicate wire between same nodes');
    }

    // Create wire
    const wire = new Wire(node1, node2, intermediatePositions || []);

    // Add wire to circuit
    this.wires.set(wire.id, wire);

    // Update bidirectional references: ENode → Wire
    enode1.wires.add(wire.id);
    enode2.wires.add(wire.id);

    return wire;
  }

  /**
   * Remove a wire from the circuit.
   *
   * Automatically removes orphaned branching ENodes (nodes with no
   * remaining wire connections).
   *
   * @param id - Wire UUID
   * @throws {Error} If wire does not exist
   *
   * @example
   * ```typescript
   * circuit.removeWire(wireId);
   * // Wire and any orphaned branching points are removed
   * ```
   */
  removeWire(id: UUID): void {
    const wire = this.wires.get(id);

    if (!wire) {
      throw new Error(`Wire ${id} does not exist`);
    }

    // Get connected nodes
    const enode1 = this.enodes.get(wire.node1);
    const enode2 = this.enodes.get(wire.node2);

    // Remove wire from nodes' wire sets
    if (enode1) {
      enode1.wires.delete(id);
    }
    if (enode2) {
      enode2.wires.delete(id);
    }

    // Remove wire from circuit
    this.wires.delete(id);

    // Clean up orphaned branching points
    if (enode1 && enode1.type === ENodeType.BranchingPoint && enode1.wires.size === 0) {
      this.enodes.delete(enode1.id);
    }
    if (enode2 && enode2.type === ENodeType.BranchingPoint && enode2.wires.size === 0) {
      this.enodes.delete(enode2.id);
    }
  }

  /**
   * Split a wire in the circuit.
   *
   * It creates two new wires connected by a new branching point ENode at the specified position.
   * Returns 2 UUIDS of the new wires.
   *
   * @param id - Wire UUID
   * @param position
   * @throws {Error} If wire does not exist
   *
   * @example
   * ```typescript
   * circuit.splitWire(wireId);
   * // Wire and any orphaned branching points are removed
   * ```
   */
  splitWire(id: UUID, position: Position): Wire[] {
    const wire = this.wires.get(id);

    if (!wire) {
      throw new Error(`Wire ${id} does not exist`);
    }

    // Get connected nodes
    const enode1 = this.enodes.get(wire.node1);
    const enode2 = this.enodes.get(wire.node2);

    if (!enode1 || !enode2) {
      throw new Error(`Wire ${id} is connected to non-existent ENodes`);
    }

    // deleting and dereferencing the old wire
    this.wires.delete(id);
    enode1?.wires.delete(id);
    enode2?.wires.delete(id);

    // Create new branching point ENode at specified position
    const branchingPoint = this.addBranchingPoint(position);

    const newWire1 = this.addWire(enode1.id, branchingPoint.id);
    const newWire2 = this.addWire(branchingPoint.id, enode2.id);

    return [newWire1 as Wire, newWire2 as Wire];
  }

  /**
   * Get a wire by ID.
   *
   * @param id - Wire UUID
   * @returns The Wire or undefined if not found
   */
  getWire(id: UUID): Wire | undefined {
    return this.wires.get(id);
  }

  /**
   * Get all wires in the circuit.
   *
   * Returns a new array on each call (defensive copy).
   *
   * @returns Array of all Wires
   */
  getAllWires(): Wire[] {
    return Array.from(this.wires.values());
  }

  /**
   * Get all wires connected to a specific ENode.
   *
   * @param nodeId - ENode UUID
   * @returns Array of connected Wires, or empty array if node not found
   */
  getWiresByNode(nodeId: UUID): Wire[] {
    const enode = this.enodes.get(nodeId);
    if (!enode) {
      return [];
    }

    const wires: Wire[] = [];
    for (const wireId of enode.wires) {
      const wire = this.wires.get(wireId);
      if (wire) {
        wires.push(wire);
      }
    }

    return wires;
  }

  /**
   * Get both ENodes connected by a wire.
   *
   * @param wireId - Wire UUID
   * @returns Tuple [node1, node2] or undefined if wire not found
   */
  getNodesByWire(wireId: UUID): [ENode, ENode] | undefined {
    const wire = this.wires.get(wireId);
    if (!wire) {
      return undefined;
    }

    const node1 = this.enodes.get(wire.node1);
    const node2 = this.enodes.get(wire.node2);

    if (!node1 || !node2) {
      return undefined;
    }

    return [node1, node2];
  }

  /**
   * Check if a wire already exists between two nodes.
   *
   * Order-independent: returns true for (A, B) or (B, A).
   *
   * @param node1 - First ENode UUID
   * @param node2 - Second ENode UUID
   * @returns true if wire exists, false otherwise
   */
  hasWireBetween(node1: UUID, node2: UUID): boolean {
    const enode1 = this.enodes.get(node1);
    if (!enode1) {
      return false;
    }

    // Check if any wire from node1 connects to node2
    for (const wireId of enode1.wires) {
      const wire = this.wires.get(wireId);
      if (wire && (wire.node2 === node2 || wire.node1 === node2)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find all components connected to a specific component via wires.
   *
   * Traverses: Component → pins → wires → other pins → other components
   *
   * @param componentId - Component UUID
   * @returns Array of connected Components
   */
  getConnectedComponents(componentId: UUID): Component[] {
    const component = this.components.get(componentId);
    if (!component) {
      return [];
    }

    const connectedIds = new Set<UUID>();

    // For each pin of this component
    for (const pinId of component.pins) {
      const pinNode = this.enodes.get(pinId);
      if (!pinNode) continue;

      // For each wire connected to this pin
      for (const wireId of pinNode.wires) {
        const wire = this.wires.get(wireId);
        if (!wire) continue;

        // Get the other node on this wire
        const otherNodeId = wire.node1 === pinId ? wire.node2 : wire.node1;
        const otherNode = this.enodes.get(otherNodeId);

        // If it's a pin node, add its component
        if (otherNode && otherNode.type === ENodeType.Pin && otherNode.component) {
          if (otherNode.component !== componentId) {
            connectedIds.add(otherNode.component);
          }
        }
      }
    }

    // Convert component IDs to Component objects
    const connectedComponents: Component[] = [];
    for (const id of connectedIds) {
      const comp = this.components.get(id);
      if (comp) {
        connectedComponents.push(comp);
      }
    }

    return connectedComponents;
  }

  /**
   * Serialize circuit to JSON.
   *
   * @returns JSON-serializable object containing all components, enodes, and wires
   *
   * @example
   * ```typescript
   * const json = circuit.toJSON();
   * localStorage.setItem('my-circuit', JSON.stringify(json));
   * ```
   */
  toJSON(): {
    components: object[];
    enodes: object[];
    wires: object[];
  } {
    return {
      components: this.getAllComponents().map((c) => c.toJSON()),
      enodes: this.getAllENodes().map((e) => e.toJSON()),
      wires: this.getAllWires().map((w) => w.toJSON()),
    };
  }

  /**
   * Deserialize circuit from JSON.
   *
   * @param json - Circuit data
   * @returns Circuit instance
   * @throws {Error} If JSON is invalid or violates invariants
   *
   * @example
   * ```typescript
   * const jsonStr = localStorage.getItem('my-circuit');
   * const json = JSON.parse(jsonStr);
   * const circuit = Circuit.fromJSON(json);
   * ```
   */
  static fromJSON(json: { components: object[]; enodes: object[]; wires?: object[] }): Circuit {
    const circuit = new Circuit();

    // Restore components
    for (const compData of json.components) {
      const component = Component.fromJSON(
        compData as {
          id: UUID;
          type: ComponentType;
          position: { x: number; y: number };
          rotation: number;
          pins: UUID[];
        }
      );

      circuit.components.set(component.id, component);
    }

    // Restore ENodes
    for (const enodeData of json.enodes) {
      const enode = ENode.fromJSON(
        enodeData as {
          id: UUID;
          type: ENodeType;
          component?: UUID;
          pinLabel?: string;
          position?: { x: number; y: number };
        }
      );

      circuit.enodes.set(enode.id, enode);
    }

    // Restore wires (if present)
    if (json.wires) {
      for (const wireData of json.wires) {
        const wire = Wire.fromJSON(
          wireData as {
            id: UUID;
            node1: UUID;
            node2: UUID;
            intermediatePositions: { x: number; y: number }[];
          }
        );

        circuit.wires.set(wire.id, wire);

        // Restore bidirectional references
        const enode1 = circuit.enodes.get(wire.node1);
        const enode2 = circuit.enodes.get(wire.node2);
        if (enode1) {
          enode1.wires.add(wire.id);
        }
        if (enode2) {
          enode2.wires.add(wire.id);
        }
      }
    }

    return circuit;
  }
}
