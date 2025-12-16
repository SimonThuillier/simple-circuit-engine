/**
 * Wire Class
 *
 * Represents electrical connection between exactly two ENodes.
 * Wires can have intermediate positions for custom routing paths.
 *
 * @module core/Wire
 */

import type { UUID } from './types/Identifier.js';
import { generateUUID } from './types/Identifier.js';
import { Position } from './types/Position.js';

/**
 * Electrical connection between two ENodes.
 *
 * Wires connect exactly two electrical nodes (component pins or branching points).
 * They support intermediate positions for ad-hoc routing paths in rendering.
 *
 * **Lifecycle**: Wires are created and removed via the Circuit class.
 * - Creating a wire updates bidirectional references (Wire ↔ ENodes)
 * - Removing a wire triggers orphaned branching point cleanup
 * - Splitting a wire creates new branching ENode and multiple wires
 *
 * @example
 * ```typescript
 * const circuit = new Circuit();
 * const comp1 = circuit.addComponent(new Position(0, 0), new Rotation(0), 1);
 * const comp2 = circuit.addComponent(new Position(10, 10), new Rotation(0), 1);
 *
 * // Straight wire
 * const wire = circuit.addWire(comp1.pins[0], comp2.pins[0]);
 *
 * // Wire with custom path
 * const curvedWire = circuit.addWire(
 *   comp1.pins[0],
 *   comp2.pins[0],
 *   [new Position(5, 5), new Position(8, 7)]
 * );
 * ```
 */
export class Wire {
  /**
   * Unique identifier for this wire.
   * @readonly
   */
  public readonly id: UUID;

  /**
   * First connected ENode UUID.
   * @readonly
   */
  public readonly node1: UUID;

  /**
   * Second connected ENode UUID.
   * @readonly
   */
  public readonly node2: UUID;

  /**
   * Optional intermediate positions for wire routing.
   * Empty array indicates straight-line connection.
   * @readonly
   */
  public intermediatePositions: Array<Position>;

  /**
   * Create a new wire.
   *
   * **Note**: Typically wires are created via `Circuit.addWire()` which
   * handles validation and bidirectional reference updates. This constructor
   * is used internally by Circuit.
   *
   * @param node1 - First ENode UUID
   * @param node2 - Second ENode UUID
   * @param intermediatePositions - Optional waypoints for rendering
   *
   * @example
   * ```typescript
   * // Usually created via Circuit:
   * const wire = circuit.addWire(nodeId1, nodeId2);
   *
   * // With intermediate positions:
   * const wire = circuit.addWire(
   *   nodeId1,
   *   nodeId2,
   *   [new Position(5, 10), new Position(15, 10)]
   * );
   * ```
   */
  constructor(node1: UUID, node2: UUID, intermediatePositions: Array<Position> = []) {
    this.id = generateUUID();
    this.node1 = node1;
    this.node2 = node2;
    this.intermediatePositions = intermediatePositions;
  }

  /**
   * Check if this is a straight-line wire.
   *
   * @returns true if no intermediate positions, false otherwise
   *
   * @example
   * ```typescript
   * const straightWire = new Wire(node1, node2);
   * console.log(straightWire.isStraightLine()); // true
   *
   * const curvedWire = new Wire(node1, node2, [new Position(5, 5)]);
   * console.log(curvedWire.isStraightLine()); // false
   * ```
   */
  isStraightLine(): boolean {
    return this.intermediatePositions.length === 0;
  }

  /**
   * Serialize wire to JSON.
   *
   * @returns Plain object representation
   *
   * @example
   * ```typescript
   * const json = wire.toJSON();
   * console.log(json);
   * // {
   * //   id: "uuid",
   * //   node1: "node-uuid-1",
   * //   node2: "node-uuid-2",
   * //   intermediatePositions: [{ x: 5, y: 10 }]
   * // }
   * ```
   */
  toJSON(): {
    id: UUID;
    node1: UUID;
    node2: UUID;
    intermediatePositions: { x: number; y: number }[];
  } {
    return {
      id: this.id,
      node1: this.node1,
      node2: this.node2,
      intermediatePositions: this.intermediatePositions.map((p) => p.toJSON()),
    };
  }

  /**
   * Deserialize wire from JSON.
   *
   * @param json - Wire data
   * @returns Wire instance
   *
   * @example
   * ```typescript
   * const json = {
   *   id: "uuid",
   *   node1: "node-uuid-1",
   *   node2: "node-uuid-2",
   *   intermediatePositions: [{ x: 5, y: 10 }]
   * };
   *
   * const wire = Wire.fromJSON(json);
   * ```
   */
  static fromJSON(json: {
    id: UUID;
    node1: UUID;
    node2: UUID;
    intermediatePositions: { x: number; y: number }[];
  }): Wire {
    const positions = json.intermediatePositions.map((p) => Position.fromJSON(p));

    const wire = new Wire(json.node1, json.node2, positions);

    // Override generated ID with the one from JSON
    Object.defineProperty(wire, 'id', {
      value: json.id,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    return wire;
  }
}
