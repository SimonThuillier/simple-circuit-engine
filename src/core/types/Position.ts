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

/**
 * Given a path defined by an array of 2D positions, find the best index to insert
 * a target position so that the path shape is preserved as much as possible.
 *
 * This is used when splitting a wire at a position: we need to determine which
 * segment of the path the target falls on, and return the insertion index.
 *
 * Algorithm:
 * 1. For each consecutive pair of positions (segment), calculate the perpendicular
 *    distance from target to that segment
 * 2. Return the index after the start of the closest segment
 *
 * @param positions - Array of positions defining the path (typically includes
 *                    start endpoint, intermediate positions, and end endpoint)
 * @param target - Position to insert
 * @param minDistance - Optional maximum distance to consider (default: Infinity)
 * @returns Index where target should be inserted (0 to positions.length)
 *
 * @example
 * ```typescript
 * // Path: (0,0) -> (10,0) -> (10,10) -> (20,10)
 * const path = [
 *   new Position(0, 0),
 *   new Position(10, 0),
 *   new Position(10, 10),
 *   new Position(20, 10)
 * ];
 * // Target at (5, 0) - on first segment
 * findPositionBestIndex(path, new Position(5, 0)); // Returns 1
 * // Target at (10, 5) - on second segment
 * findPositionBestIndex(path, new Position(10, 5)); // Returns 2
 * ```
 */
export function findPositionBestIndex(
  positions: Position[],
  target: Position,
  minDistance = Infinity
): number {
  // Edge case: empty array - insert at beginning
  if (positions.length === 0) {
    return 0;
  }

  // Edge case: single position - insert after it
  if (positions.length === 1) {
    return 1;
  }

  let bestIndex = 1; // Default: insert after first position

  // Iterate through all segments
  for (let i = 0; i < positions.length - 1; i++) {
    const segmentStart = positions[i]!;
    const segmentEnd = positions[i + 1]!;

    const distance = pointToSegmentDistance(target, segmentStart, segmentEnd);

    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = i + 1; // Insert after the segment start
    }
  }

  return bestIndex;
}

/**
 * Calculate the shortest distance from a point to a line segment.
 *
 * @param point - The point to measure from
 * @param segmentStart - Start of the line segment
 * @param segmentEnd - End of the line segment
 * @returns The shortest distance from point to the segment
 */
function pointToSegmentDistance(
  point: Position,
  segmentStart: Position,
  segmentEnd: Position
): number {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;

  // If segment is a point, return distance to that point
  const segmentLengthSquared = dx * dx + dy * dy;
  if (segmentLengthSquared === 0) {
    return Math.sqrt((point.x - segmentStart.x) ** 2 + (point.y - segmentStart.y) ** 2);
  }

  // Calculate projection of point onto the line (as parameter t)
  // t = 0 means closest point is segmentStart, t = 1 means segmentEnd
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / segmentLengthSquared
    )
  );

  // Calculate closest point on segment
  const closestX = segmentStart.x + t * dx;
  const closestY = segmentStart.y + t * dy;

  // Return distance to closest point
  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
}

/**
 * Simplify a path by removing collinear intermediate positions.
 *
 * Given an ordered array of positions representing a line path, this function
 * removes positions that lie on the same line as their neighbors (collinear points).
 * The resulting path is visually identical but with fewer redundant points.
 *
 * Three points A, B, C are collinear if B lies on the line from A to C.
 * When collinear, B is redundant and can be removed without changing the path shape.
 *
 * @param positions - Ordered array of positions representing the path
 * @param tolerance - Optional tolerance for collinearity check (default: 5)
 * @returns Simplified array with collinear intermediate points removed
 *
 * @example
 * ```typescript
 * // Horizontal line with redundant middle points
 * const path = [
 *   new Position(0, 0),
 *   new Position(5, 0),   // collinear - will be removed
 *   new Position(10, 0),  // collinear - will be removed
 *   new Position(15, 0)
 * ];
 * simplifyPositions(path);
 * // Returns: [Position(0, 0), Position(15, 0)]
 *
 * // L-shaped path - corner point is NOT collinear
 * const lPath = [
 *   new Position(0, 0),
 *   new Position(10, 0),  // corner - kept
 *   new Position(10, 10)
 * ];
 * simplifyPositions(lPath);
 * // Returns: [Position(0, 0), Position(10, 0), Position(10, 10)]
 * ```
 */
export function simplifyPositions(positions: Position[], tolerance: number = 5): Position[] {
  // Edge cases: 0, 1, or 2 points can't be simplified
  if (positions.length <= 2) {
    return [...positions];
  }

  // Start with the first point
  const result: Position[] = [positions[0]!];

  // Check each intermediate point
  for (let i = 1; i < positions.length - 1; i++) {
    const prev = result[result.length - 1]!;
    const current = positions[i]!;
    const next = positions[i + 1]!;

    // Keep the point only if it's NOT collinear with prev and next
    if (!areCollinear(prev, current, next, tolerance)) {
      result.push(current);
    }
    // If collinear, skip current (it's redundant)
  }

  // Always add the last point
  result.push(positions[positions.length - 1]!);

  return result;
}

/**
 * Check if three points are collinear (lie on the same line).
 *
 * Uses the cross product of vectors AB and AC. If the cross product
 * is zero, the points are collinear.
 *
 * @param a - First point
 * @param b - Second point (middle)
 * @param c - Third point
 * @param tolerance - Optional tolerance for collinearity check (default: 5)
 * @returns true if the three points are collinear
 */
function areCollinear(a: Position, b: Position, c: Position, tolerance: number = 5): boolean {
  // Cross product of vectors AB and AC
  // crossProduct = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)
  // If zero, points are collinear
  const crossProduct = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(crossProduct) <= tolerance;
}
