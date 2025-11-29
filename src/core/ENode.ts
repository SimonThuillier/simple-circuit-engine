/**
 * ENode Class (Electrical Node)
 *
 * Represents atomic electrical connection points in the circuit.
 * ENodes come in two types: component pins and wire branching points.
 *
 * @module core/ENode
 */

import type { UUID } from './types/Identifier.js';
import { generateUUID } from './types/Identifier.js';
import { ENodeType } from './types/ENodeType.js';
import { Position } from './types/Position.js';
import type { Circuit } from './Circuit.js';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';

/**
 * Electrical connection point (component pin or wire branching point).
 *
 * ENodes are automatically managed by the Circuit:
 * - **Pin nodes**: Created when components are added, deleted when components removed
 * - **Branching nodes**: Created when wires split, deleted when orphaned (no wires)
 *
 * **Position Handling**:
 * - Pin nodes: Position derived from parent component
 * - Branching nodes: Independent position stored directly
 *
 * @example
 * ```typescript
 * // Pin node (created automatically by Circuit)
 * const circuit = new Circuit();
 * const component = circuit.addComponent(new Position(10, 20), new Rotation(0), 2);
 * const pinNode = circuit.getENode(component.pins[0]);
 *
 * console.log(pinNode.type);       // ENodeType.Pin
 * console.log(pinNode.component);  // component UUID
 * console.log(pinNode.pinLabel);   // '0'
 *
 * // Branching node (created during wire split)
 * const branchNode = new ENode(
 *   ENodeType.BranchingPoint,
 *   undefined,
 *   undefined,
 *   new Position(15, 25)
 * );
 * console.log(branchNode.position); // Position { x: 15, y: 25 }
 * ```
 */
export class ENode {
  /**
   * Unique identifier for this ENode.
   * @readonly
   */
  public readonly id: UUID;

  /**
   * Type of electrical node (Pin or BranchingPoint).
   * @readonly
   */
  public readonly type: ENodeType;

  /**
   * Parent component UUID (only for pin nodes).
   * Undefined for branching point nodes.
   * @readonly
   */
  public readonly component: UUID | undefined;

  /**
   * Pin label within component (only for pin nodes).
   * Undefined for branching point nodes.
   * @readonly
   */
  public readonly pinLabel: string | undefined;

  /**
   * Grid position (only for branching point nodes).
   * Undefined for pin nodes (position derived from component).
   * @readonly
   */
  public readonly position: Position | undefined;

  /**
   * Set of wire UUIDs connected to this node.
   * Mutable to allow wire connections/disconnections.
   */
  public readonly wires: Set<UUID>;

  /**
   * Is the ENode a source of voltage or current?
   */
  public source: ENodeSourceType | undefined;

  /**
   * Create a new electrical node.
   *
   * **Note**: Typically ENodes are created automatically by Circuit.
   * This constructor is used internally.
   *
   * @param type - Node type (Pin or BranchingPoint)
   * @param component - Parent component UUID (pin nodes only)
   * @param pinLabel - Pin label (pin nodes only)
   * @param position - Grid position (branching points only)
   * @param source - Source type (Voltage/Current) or undefined
   *
   * @example
   * ```typescript
   * // Pin node (internal to Circuit)
   * const pinNode = new ENode(
   *   ENodeType.Pin,
   *   componentId,
   *   '0',  // first pin
   *   undefined,
   *   undefined
   * );
   *
   * // Branching point node
   * const branchNode = new ENode(
   *   ENodeType.BranchingPoint,
   *   undefined,
   *   undefined,
   *   new Position(15, 25),
   *   undefined
   * );
   * ```
   */
  constructor(
    type: ENodeType,
    component: UUID | undefined,
    pinLabel: string | undefined,
    position: Position | undefined,
    source: ENodeSourceType | undefined = undefined
  ) {
    this.id = generateUUID();
    this.type = type;
    this.component = component;
    this.pinLabel = pinLabel;
    this.position = position;
    this.wires = new Set();
    this.source = source;
  }

  /**
   * Get the position of this electrical node.
   *
   * **Pin nodes**: Derives position from parent component.
   * **Branching nodes**: Returns stored position directly.
   *
   * @param circuit - Circuit instance (needed to look up component for pin nodes)
   * @returns Position on the grid
   *
   * @example
   * ```typescript
   * const circuit = new Circuit();
   * const component = circuit.addComponent(
   *   new Position(10, 20),
   *   new Rotation(0),
   *   1
   * );
   *
   * const pinNode = circuit.getENode(component.pins[0]);
   * const position = pinNode.getPosition(circuit);
   * console.log(position.x); // 10 (derived from component)
   * ```
   */
  getPosition(circuit: Circuit): Position {
    if (this.type === ENodeType.Pin) {
      // Derive position from parent component
      if (!this.component) {
        throw new Error('Pin node missing component reference');
      }

      const component = circuit.getComponent(this.component);
      if (!component) {
        throw new Error(`Component ${this.component} not found for pin node ${this.id}`);
      }

      // For now, return component position directly
      // Future enhancement: could calculate pin offset based on pinLabel
      return component.position;
    }

    // Branching point: return stored position
    if (!this.position) {
      throw new Error('Branching point node missing position');
    }

    return this.position;
  }

  /**
   * Serialize ENode to JSON.
   *
   * @returns Plain object representation
   *
   * @example
   * ```typescript
   * const json = enode.toJSON();
   * console.log(json);
   * // Pin node:
   * // {
   * //   id: "uuid",
   * //   type: "Pin",
   * //   component: "component-uuid",
   * //   pinLabel: "0"
   * // }
   *
   * // Branching node:
   * // {
   * //   id: "uuid",
   * //   type: "BranchingPoint",
   * //   position: { x: 15, y: 25 }
   * // }
   * ```
   */
  toJSON(): {
    id: UUID;
    type: ENodeType;
    component?: UUID | null;
    pinLabel?: string | null;
    position?: { x: number; y: number } | null;
    source?: ENodeSourceType | null;
  } {
    const json: {
      id: UUID;
      type: ENodeType;
      component?: UUID | null;
      pinLabel?: string | null;
      position?: { x: number; y: number } | null;
      source?: ENodeSourceType | null;
    } = {
      id: this.id,
      type: this.type,
      source: this.source || null,
    };

    if (this.type === ENodeType.Pin) {
      json.component = this.component || null;
      json.pinLabel = this.pinLabel || null;
    } else {
      json.position = this.position?.toJSON() || null;
    }

    return json;
  }

  /**
   * Deserialize ENode from JSON.
   *
   * @param json - ENode data
   * @returns ENode instance
   *
   * @example
   * ```typescript
   * const json = {
   *   id: "uuid",
   *   type: "Pin",
   *   component: "component-uuid",
   *   pinLabel: "0"
   * };
   *
   * const enode = ENode.fromJSON(json);
   * ```
   */
  static fromJSON(json: {
    id: UUID;
    type: ENodeType;
    component?: UUID;
    pinLabel?: string;
    position?: { x: number; y: number };
    source?: ENodeSourceType;
  }): ENode {
    const position = json.position ? Position.fromJSON(json.position) : undefined;

    const enode = new ENode(json.type, json.component, json.pinLabel, position, json.source);

    // Override generated ID with the one from JSON
    Object.defineProperty(enode, 'id', {
      value: json.id,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    return enode;
  }
}
