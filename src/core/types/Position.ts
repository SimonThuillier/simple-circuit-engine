/**
 * Position Type for 2D Discrete Grid
 *
 * Represents a position on a 2D discrete (integer) grid. Used for:
 * - Component placement
 * - Branching point ENode positions
 * - Wire intermediate waypoints
 *
 * @module core/types/Position
 */

/**
 * Position on a 2D discrete grid with integer coordinates.
 *
 * Enforces integer constraint at construction time to ensure all positions
 * align with the discrete grid model. Positions are immutable once created.
 *
 * @example
 * ```typescript
 * const pos = new Position(10, 20);
 * console.log(pos.x); // 10
 * console.log(pos.y); // 20
 *
 * // Invalid: non-integer coordinates
 * const invalid = new Position(10.5, 20); // TypeError
 * ```
 */
export class Position {
  /**
   * Create a new position on the discrete grid.
   *
   * @param x - X coordinate (must be integer)
   * @param y - Y coordinate (must be integer)
   * @throws {TypeError} If x or y are not integers
   */
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError(`Position coordinates must be integers (got x=${x}, y=${y})`);
    }
  }

  /**
   * Check if this position equals another position.
   *
   * @param other - Position to compare with
   * @returns true if both x and y coordinates are equal
   *
   * @example
   * ```typescript
   * const p1 = new Position(10, 20);
   * const p2 = new Position(10, 20);
   * const p3 = new Position(15, 20);
   *
   * console.log(p1.equals(p2)); // true
   * console.log(p1.equals(p3)); // false
   * ```
   */
  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Serialize position to JSON.
   *
   * @returns Plain object with x and y properties
   *
   * @example
   * ```typescript
   * const pos = new Position(10, 20);
   * const json = pos.toJSON();
   * console.log(json); // { x: 10, y: 20 }
   * ```
   */
  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Deserialize position from JSON.
   *
   * @param json - Plain object with x and y properties
   * @returns Position instance
   * @throws {TypeError} If coordinates are not integers
   *
   * @example
   * ```typescript
   * const json = { x: 10, y: 20 };
   * const pos = Position.fromJSON(json);
   * console.log(pos.x); // 10
   * ```
   */
  static fromJSON(json: { x: number; y: number }): Position {
    return new Position(json.x, json.y);
  }

  /**
   * String representation for debugging.
   *
   * @returns String in format "Position(x, y)"
   */
  toString(): string {
    return `Position(${this.x}, ${this.y})`;
  }
}
