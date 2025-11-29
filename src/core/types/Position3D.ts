/**
 * 3D Position Type
 *
 * Represents a 3D position. Used for:
 * - Camera placement
 *
 * @module core/types/Position3D
 */

/**
 * 3D position.
 * Positions are immutable once created.
 *
 * @example
 * ```typescript
 * const pos3 = new Position3D(10, 20, 40);
 * console.log(pos.x); // 10
 * console.log(pos.y); // 20
 * console.log(pos.y); // 40
 *
 * ```
 */
export class Position3D {
  /**
   * Create a new 3D position.
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number
  ) {}

  /**
   * Check if this position equals another position.
   *
   * @param other - Position to compare with
   * @returns true if x,y and z coordinates are equal
   *
   * @example
   * ```typescript
   * const p1 = new Position(10, 20, 40);
   * const p2 = new Position(10, 20, 40);
   * const p3 = new Position(15, 20, 40);
   *
   * console.log(p1.equals(p2)); // true
   * console.log(p1.equals(p3)); // false
   * ```
   */
  equals(other: Position3D): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * Serialize position to JSON.
   *
   * @returns Plain object with x, y and z properties
   *
   * @example
   * ```typescript
   * const pos = new Position(10, 20, 40);
   * const json = pos.toJSON();
   * console.log(json); // { x: 10, y: 20, z: 40 }
   * ```
   */
  toJSON(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  /**
   * Deserialize position from JSON.
   *
   * @param json - Plain object with x, y and z properties
   * @returns Position instance
   *
   * @example
   * ```typescript
   * const json = { x: 10, y: 20, z: 40 };
   * const pos = Position.fromJSON(json);
   * console.log(pos.x); // 10
   * ```
   */
  static fromJSON(json: { x: number; y: number; z: number }): Position3D {
    return new Position3D(json.x, json.y, json.z);
  }

  /**
   * String representation for debugging.
   *
   * @returns String in format "Position(x, y, z)"
   */
  toString(): string {
    return `Position(${this.x}, ${this.y}, ${this.z})`;
  }
}
