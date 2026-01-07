/**
 * Circuit Class
 *
 * Main container managing all circuit elements with automatic lifecycle.
 * Provides the primary API for creating and manipulating circuit topology.
 *
 * @module core/Circuit
 */

import type { UUID } from './types/Identifier.js';
import { findPositionBestIndex, Position, simplifyPositions } from './types/Position.js';
import { Rotation } from './types/Rotation.js';
import { Component } from './Component.js';
import { ENode } from './ENode.js';
import { ENodeType } from './types/ENodeType.js';
import { Wire } from './Wire.js';
import { COMPONENT_TYPE_METADATA, type ComponentType } from './types/ComponentType.js';
import { getComponentTypeMetadata } from './types/ComponentType.js';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import { CameraOptions, type ICameraOptions } from '@/core/types/CameraOptions';

export type ICircuitMetadata = {
  name: string;
  size: number;
  divisions: number;
  cameraOptions: ICameraOptions;
};

/**
 * Circuit metadata placeholder
 */
export class CircuitMetadata {
  /**
   * Create a new CircuitMetadata holding general information about the Circuit.
   *
   * @param name - Name of the circuit
   * @param size - Size of the circuit grid
   * @param divisions - Divisions in the circuit grid
   * @param cameraOptions - Camera Options at startup
   * @throws {TypeError} If size or divisions are not integers
   */
  constructor(
    public name: string,
    public size: number,
    public divisions: number,
    public cameraOptions: CameraOptions
  ) {
    if (!Number.isInteger(size) || !Number.isInteger(divisions)) {
      throw new TypeError(
        `Size and divisions must be integers (got size=${size}, divisions=${divisions})`
      );
    }
  }

  toJSON(): {
    name: string;
    size: number;
    divisions: number;
    cameraOptions: ICameraOptions;
  } {
    return {
      name: this.name,
      size: this.size,
      divisions: this.divisions,
      cameraOptions: this.cameraOptions.toJSON(),
    };
  }

  static fromJSON(json: {
    name: string;
    size: number;
    divisions: number;
    cameraOptions: ICameraOptions;
  }): CircuitMetadata {
    return new CircuitMetadata(
      json.name,
      json.size,
      json.divisions,
      CameraOptions.fromJSON(json.cameraOptions)
    );
  }

  toString(): string {
    return `CircuitMetadata(${this.name}, ${this.size}, ${this.divisions}, ${this.cameraOptions.toString()})`;
  }
}

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
   * Circuit metadata holding general information.
   * @private
   */
  public metadata: CircuitMetadata;

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
  constructor(name: string = 'Untitled Circuit') {
    this.metadata = new CircuitMetadata(name, 10, 10, new CameraOptions());

    this.components = new Map();
    this.enodes = new Map();
    this.wires = new Map();
  }

  get name(): string {
    return this.metadata.name;
  }

  set name(value: string) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError('Circuit name must be a non-empty string');
    }
    this.metadata.name = value;
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
   * @param config - Optional configuration map for component-specific settings
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
  addComponent(
    type: ComponentType,
    position: Position,
    rotation: Rotation,
    config?: Map<string, string> | undefined
  ): Component {
    // Get component type metadata
    const metadata = getComponentTypeMetadata(type);

    // Create component first (to get its ID)
    const component = new Component(type, position, rotation, []);
    if (config) {
      component.config = new Map(config);
    }

    // Create pin ENodes for the component using metadata pin labels
    const pins: UUID[] = [];
    for (const [pinLabel, source] of metadata.pins) {
      const pinNode = new ENode(
        ENodeType.Pin,
        component.id,
        pinLabel,
        undefined, // Pin position derived from component,
        source
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
   *
   * @param id - Component UUID
   * @throws {Error} If component does not exist
   * @returns Object containing arrays of deleted Wires and ENodes IDs
   *
   * @example
   * ```typescript
   * circuit.removeComponent(componentId);
   * // Component, its pins, and connected wires are all removed
   * ```
   */
  removeComponent(id: UUID): {
    deletedWires: UUID[];
    deletedENodes: UUID[];
  } {
    const component = this.components.get(id);

    if (!component) {
      throw new Error(`Component ${id} does not exist`);
    }

    const deletedWires: UUID[] = [];
    const deletedENodes: UUID[] = [];

    // Remove all wires connected to this component's pins
    for (const pinId of component.pins) {
      const enode = this.enodes.get(pinId);
      if (enode) {
        // Remove all wires connected to this pin
        const wireIds = Array.from(enode.wires);
        for (const wireId of wireIds) {
          this.removeWire(wireId);
          deletedWires.push(wireId);
        }
      }
      // Remove the pin ENode
      this.enodes.delete(pinId);
      deletedENodes.push(pinId);
    }

    // Remove component from map
    this.components.delete(id);
    return { deletedWires, deletedENodes };
  }

  hasComponent(id: UUID): boolean {
    return this.components.has(id);
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

  getAllComponentsByType(type: ComponentType): Component[] {
    const result: Component[] = [];
    for (const component of this.components.values()) {
      if (component.type === type) {
        result.push(component);
      }
    }
    return result;
  }

  getFirstComponentOfType(type: ComponentType): Component | undefined {
    for (const component of this.components.values()) {
      if (component.type === type) {
        return component;
      }
    }
    return undefined;
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
   * @param position - Grid position for the branching point
   * @param sourceType - Optional source type (voltage/current)
   * @returns The created ENode
   */
  addBranchingPoint(position: Position, sourceType?: ENodeSourceType): ENode {
    const branchingPoint = new ENode(
      ENodeType.BranchingPoint,
      undefined,
      undefined,
      position,
      sourceType
    );

    // Add ENode to circuit
    this.enodes.set(branchingPoint.id, branchingPoint);

    return branchingPoint;
  }

  /**
   * Remove a branching point electrical node from the circuit.
   * Also removes all wires connected to this branching point if there are ony one or more than 2.
   * In the case there are exactly two wires, they will be merged before removing the branching point.
   *
   * @param id - Branching point ENode UUID
   * @throws {Error} If ENode does not exist or is not a branching point
   */
  removeBranchingPoint(id: UUID): {
    deletedWires?: UUID[] | undefined;
    mergedWires?: UUID[] | undefined;
    newWire?: Wire | undefined;
  } {
    const enode = this.enodes.get(id);

    if (!enode) {
      throw new Error(`Enode ${id} does not exist`);
    }
    if (enode.type !== ENodeType.BranchingPoint) {
      throw new Error(
        `Enode ${id} is not a branching point, it must be removed with its component.`
      );
    }

    const result = {};

    // Remove all wires connected to this branching point
    const wires = this.getWiresByNode(id);

    if (wires.length === 1 || wires.length > 2) {
      const deletedWires: UUID[] = [];
      for (const wire of wires) {
        this.removeWire(wire.id);
        deletedWires.push(wire.id);
      }
      Object.assign(result, { deletedWires });
    } else if (wires.length === 2) {
      // Merge the two wires into one
      const wire1 = wires[0]!;
      const wire2 = wires[1]!;

      // Determine the two nodes to connect
      const otherNode1 = wire1.node1 === id ? wire1.node2 : wire1.node1;
      const otherNode2 = wire2.node1 === id ? wire2.node2 : wire2.node1;

      // compute intermediate positions for the new wire
      const intermediatePositions: Position[] = [];
      if (otherNode1 === wire1.node1) {
        intermediatePositions.push(...wire1.intermediatePositions);
      } else if (otherNode1 === wire1.node2) {
        intermediatePositions.push(...[...wire1.intermediatePositions].reverse());
      }
      intermediatePositions.push(enode.getPosition(this));
      if (otherNode2 === wire2.node1) {
        intermediatePositions.push(...[...wire2.intermediatePositions].reverse());
      } else if (otherNode2 === wire2.node2) {
        intermediatePositions.push(...wire2.intermediatePositions);
      }

      // Remove the old wires
      this.removeWire(wire1.id);
      this.removeWire(wire2.id);

      // Create new wire connecting the two other nodes
      const newWire = this.addWire(otherNode1, otherNode2, intermediatePositions);
      if (newWire instanceof Error) {
        throw new Error(`Failed to merge wires at branching point ${id}: ${newWire.message}`);
      }
      Object.assign(result, { mergedWires: [wire1.id, wire2.id] });
      Object.assign(result, { newWire: newWire });
    }

    // Remove the branching point ENode
    this.enodes.delete(id);
    return result;
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
   * @param id - Wire UUID
   * @throws {Error} If wire does not exist
   *
   * @example
   * ```typescript
   * circuit.removeWire(wireId);
   * // Wire is removed
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
  }

  /**
   * Split a wire in the circuit.
   *
   * It creates two new wires connected by either the target enode or a new branching point ENode at the specified position.
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
  /**
   * Split an existing wire at a position, creating a branching point.
   * The original wire is removed and replaced with two new wires
   * connecting through the new branching point.
   * NB : in the special case where targetEnode belongs to a component where the wire is already connected
   * only one new wire will be created as this method don't allow a wire directly connecting two pins of the same component.
   *
   * @param wireId - Wire to split
   * @param position - Position for the new branching point : no effect if targetEnodeId provided
   * @param targetEnodeId - if provided, the existing enode to split the wire at
   * @returns Object containing the new branching point and an array of the two new wires
   * @throws Error if wireId not found
   */
  splitWire(
    wireId: UUID,
    position: Position,
    targetEnodeId: UUID | null = null
  ): {
    branchingPoint: ENode;
    wires: Array<Wire>;
  } {
    const wire = this.wires.get(wireId);

    if (!wire) {
      throw new Error(`Wire ${wireId} does not exist`);
    }

    // Get connected nodes
    const enode1 = this.enodes.get(wire.node1);
    const enode2 = this.enodes.get(wire.node2);

    if (!enode1 || !enode2) {
      throw new Error(`Wire ${wireId} is connected to non-existent ENodes`);
    }

    // computing best intermediate positions for the two new wires
    const fullPositions = [
      enode1.getPosition(this),
      ...wire.intermediatePositions,
      enode2.getPosition(this),
    ];
    const index = findPositionBestIndex(fullPositions, position);
    const positionsWire1 = fullPositions.slice(1, index);
    const positionsWire2 = fullPositions.slice(index, fullPositions.length - 1);

    // deleting and dereferencing the old wire
    this.wires.delete(wireId);
    enode1.wires.delete(wireId);
    enode2.wires.delete(wireId);

    let eNode: ENode;
    if (targetEnodeId) {
      if (!this.enodes.get(targetEnodeId)) {
        throw new Error(`Target ENode ${targetEnodeId} does not exist`);
      } else {
        eNode = this.enodes.get(targetEnodeId)!;
      }
    } else {
      // Create new branching point ENode at specified position
      eNode = this.addBranchingPoint(position);
    }

    const newWires = [];

    if (
      (!eNode.component || enode1.component !== eNode.component) &&
      !this.hasWireBetween(enode1.id, eNode.id)
    ) {
      const result = this.addWire(enode1.id, eNode.id, positionsWire1);
      if (result instanceof Wire) {
        this.simplifyWireIntermediatePositions(result.id);
        newWires.push(result);
      } else {
        console.warn(`Failure to create wire at split : ${result.message}`);
      }
    }
    if (
      (!eNode.component || enode2.component !== eNode.component) &&
      !this.hasWireBetween(enode2.id, eNode.id)
    ) {
      const result = this.addWire(eNode.id, enode2.id, positionsWire2);
      if (result instanceof Wire) {
        this.simplifyWireIntermediatePositions(result.id);
        newWires.push(result);
      } else {
        console.warn(`Failure to create wire at split : ${result.message}`);
      }
    }

    return {
      branchingPoint: eNode,
      wires: newWires,
    };
  }

  getWireBetweenNodes(node1: UUID, node2: UUID): Wire | undefined {
    const enode1 = this.enodes.get(node1);
    if (!enode1) {
      return undefined;
    }
    // Check if any wire from node1 connects to node2
    for (const wireId of enode1.wires) {
      const wire = this.wires.get(wireId);
      if (wire && (wire.node2 === node2 || wire.node1 === node2)) {
        return wire;
      }
    }
    return undefined;
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
   * Get all wires connected to a component, e.g to any pin enode of the component.
   *
   * @param componentId - Component UUID
   * @returns Array of connected Wires, or empty array if component not found
   */
  getWiresByComponent(componentId: UUID): Wire[] {
    const component = this.components.get(componentId);
    if (!component) {
      return [];
    }
    const wires: Wire[] = [];

    for (const pinId of component.pins) {
      wires.push(...this.getWiresByNode(pinId));
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
   * Find all components with pins among the provided enode IDs set.
   *
   * @param pinIds - Set of pins UUIDs
   * @returns Set of components UUIDs
   */
  getComponentsOfPins(pinIds: Set<UUID>): Set<UUID> {
    const componentIds = new Set<UUID>();

    for (const enodeId of pinIds) {
      const enode = this.enodes.get(enodeId);
      if (!!enode?.component) {
        componentIds.add(enode.component);
      }
    }
    return componentIds;
  }

  /**
   * Get a component's pin ENode by its label.
   * @param component
   * @param pinLabel
   */
  getComponentPinByLabel(component: Component, pinLabel: string): ENode | undefined {
    let pinIndex = 0;
    const typeMetadata = COMPONENT_TYPE_METADATA[component.type];
    const pinLabels = Array.from(typeMetadata.pins.keys());
    for (const pinId of component.pins) {
      const enode = this.enodes.get(pinId);
      const label = pinLabels[pinIndex];
      if (!label) continue;
      if (enode && label === pinLabel) {
        return enode;
      }
      pinIndex++;
    }
    return undefined;
  }

  /**
   * Update the intermediate positions of a wire.
   * Update the wire in place.
   *
   * @param wireId - Wire to update
   * @param intermediatePositions - New intermediate positions
   * @param simplify - Whether to simplify positions by removing collinear points : useful when finalizing wire routing
   * @returns The updated Wire
   * @throws Error if wireId not found
   */
  updateWireIntermediatePositions(
    wireId: UUID,
    intermediatePositions: Position[],
    simplify: boolean = false
  ): Wire {
    const wire = this.wires.get(wireId);

    if (!wire) {
      throw new Error(`Wire ${wireId} does not exist`);
    }
    if (simplify) {
      // remove collinear positions if simplify
      const fullPositions = [
        this.enodes.get(wire.node1)!.getPosition(this),
        ...intermediatePositions,
        this.enodes.get(wire.node2)!.getPosition(this),
      ];
      const simplifiedFullPositions = simplifyPositions(fullPositions, 10);
      // remove first and last positions (they are the positions of the nodes)
      wire.intermediatePositions = simplifiedFullPositions.slice(
        1,
        simplifiedFullPositions.length - 1
      );
    } else {
      wire.intermediatePositions = intermediatePositions;
    }

    return wire;
  }

  /**
   * Simplify intermediate positions of a wire.
   * Update the wire in place.
   * @param wireId - Wire to simplify
   * @returns The updated Wire
   * @throws Error if wireId not found
   */
  simplifyWireIntermediatePositions(wireId: UUID): Wire {
    const wire = this.wires.get(wireId);
    if (!wire) {
      throw new Error(`Wire ${wireId} does not exist`);
    }

    // remove collinear positions if simplify
    const fullPositions = [
      this.enodes.get(wire.node1)!.getPosition(this),
      ...wire.intermediatePositions,
      this.enodes.get(wire.node2)!.getPosition(this),
    ];
    const simplifiedFullPositions = simplifyPositions(fullPositions, 5);
    // remove first and last positions (they are the positions of the nodes)
    wire.intermediatePositions = simplifiedFullPositions.slice(
      1,
      simplifiedFullPositions.length - 1
    );

    wire.intermediatePositions = simplifyPositions(wire.intermediatePositions);
    return wire;
  }

  /**
   * Update the source type of an ENode (branching point or component pin).
   * @param enodeId - ENode to update
   * @param sourceType - New source type (null to clear)
   * @throws Error if enodeId not found
   */
  updateENodeSourceType(enodeId: UUID, sourceType: ENodeSourceType | null): void {
    const enode = this.enodes.get(enodeId);

    if (!enode) {
      throw new Error(`ENode ${enodeId} does not exist`);
    }

    // Update sourceType (ENode.source is mutable)
    enode.source = sourceType || undefined;
  }

  /**
   * iterate through all components, enodes and wires positions to get the size that allows to enclose all elements.
   * @param margin - optional margin to add to the size
   * @returns size that allows to enclose all elements plus margin
   */
  getEnclosingSize(margin: number = 0): number {
    let maxPos = 0;
    for (const component of this.components.values()) {
      maxPos = Math.max(maxPos, Math.abs(component.position.x), Math.abs(component.position.y));
    }
    for (const enode of this.enodes.values()) {
      if (enode.type === ENodeType.Pin) continue; // handled with components
      const pos = enode.position;
      if (!pos) continue;
      maxPos = Math.max(maxPos, Math.abs(pos.x), Math.abs(pos.y));
    }
    for (const wire of this.wires.values()) {
      for (const pos of wire.intermediatePositions) {
        maxPos = Math.max(maxPos, Math.abs(pos.x), Math.abs(pos.y));
      }
    }
    return Math.ceil(maxPos * 2 + Math.max(margin, 0));
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
    metadata: object;
    components: object[];
    enodes: object[];
    wires: object[];
  } {
    return {
      metadata: this.metadata.toJSON(),
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
  static fromJSON(json: {
    metadata: ICircuitMetadata;
    components: object[];
    enodes: object[];
    wires?: object[];
  }): Circuit {
    const circuit = new Circuit();
    circuit.metadata = CircuitMetadata.fromJSON(json.metadata);

    // Restore components
    for (const compData of json.components) {
      const component = Component.fromJSON(
        compData as {
          id: UUID;
          type: ComponentType;
          position: { x: number; y: number };
          rotation: number;
          pins: UUID[];
          config: { [key: string]: string };
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
          source?: ENodeSourceType;
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
