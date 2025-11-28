/**
 * Rotation Type for Component Orientation
 *
 * Represents orientation angle for components on the 2D grid.
 * Uses integer degrees for discrete rotation values.
 *
 * @module core/types/Rotation
 */

/**
 * Rotation angle for component orientation.
 *
 * Enforces integer constraint at construction time. Typically used with
 * values like 0, 90, 180, 270 degrees, but any integer is valid.
 * Rotations are immutable once created.
 *
 * @example
 * ```typescript
 * const rotation = new Rotation(90);
 * console.log(rotation.angle); // 90
 *
 * // Invalid: non-integer angle
 * const invalid = new Rotation(45.5); // TypeError
 * ```
 */
export class Rotation {
  /**
   * Create a new rotation with the specified angle.
   *
   * @param angle - Rotation angle in degrees (must be integer)
   * @throws {TypeError} If angle is not an integer
   */
  constructor(public readonly angle: number) {
    if (!Number.isInteger(angle)) {
      throw new TypeError(`Rotation angle must be an integer (got ${angle})`);
    }
  }

  /**
   * Serialize rotation to JSON.
   *
   * @returns The angle value as a number
   *
   * @example
   * ```typescript
   * const rotation = new Rotation(90);
   * const json = rotation.toJSON();
   * console.log(json); // 90
   * ```
   */
  toJSON(): number {
    return this.angle;
  }

  /**
   * Deserialize rotation from JSON.
   *
   * @param angle - Angle value
   * @returns Rotation instance
   * @throws {TypeError} If angle is not an integer
   *
   * @example
   * ```typescript
   * const rotation = Rotation.fromJSON(90);
   * console.log(rotation.angle); // 90
   * ```
   */
  static fromJSON(angle: number): Rotation {
    return new Rotation(angle);
  }

  /**
   * Check if this rotation equals another rotation.
   *
   * @param other - Rotation to compare with
   * @returns true if angles are equal
   *
   * @example
   * ```typescript
   * const r1 = new Rotation(90);
   * const r2 = new Rotation(90);
   * const r3 = new Rotation(180);
   *
   * console.log(r1.equals(r2)); // true
   * console.log(r1.equals(r3)); // false
   * ```
   */
  equals(other: Rotation): boolean {
    return this.angle === other.angle;
  }

  /**
   * String representation for debugging.
   *
   * @returns String in format "Rotation(angle°)"
   */
  toString(): string {
    return `Rotation(${this.angle}°)`;
  }
}
