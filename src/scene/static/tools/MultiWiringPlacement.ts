/**
 * Pure geometry helpers for the multi-wiring rule 2 fan-out (direct injection
 * from a logic interface to a branching point).
 *
 * Kept free of Three.js so it can be unit-tested without jsdom or a renderer.
 * Operates on the XZ plane only (Y is dropped because branching points persist
 * as 2-D grid cells via `worldToGridPosition`).
 *
 * @module scene/static/tools/MultiWiringPlacement
 */

export interface XZ {
  x: number;
  z: number;
}

const EPSILON = 1e-9;

/** Compute follow-up branching point positions for rule 2.
 *
 * Algorithm (linear step in wire direction):
 *   W      = bp0 - pinPositions[0]
 *   u      = W / |W|
 *   bp_j   = pinPositions[j] + W + sign * j * |s_j| * u   (s_j = pin spacing j-1 -> j)
 *
 * For `sign === -1` (logicOutput) the cumulative offset is clamped so the BP
 * never reaches or passes its pin (a residual 1-cell wire is preserved).
 *
 * @param pinPositions Pin world XZ positions in interface-index order
 *   (length = count + 1; index 0 is the source pin).
 * @param bp0          User-clicked BP world position.
 * @param sign         +1 for logicInput (extend), -1 for logicOutput (shrink).
 * @returns Array of `count` follow-up BP positions (XZ), or `[]` if the wire
 *   vector is degenerate.
 */
export function computeRule2BpPositions(
  pinPositions: XZ[],
  bp0: XZ,
  sign: 1 | -1
): XZ[] {
  if (pinPositions.length <= 1) return [];
  const pin0 = pinPositions[0]!;
  const Wx = bp0.x - pin0.x;
  const Wz = bp0.z - pin0.z;
  const wireLength = Math.hypot(Wx, Wz);
  const angle = Math.abs(Wx) > Math.abs(Wz) ? Math.acos(Wx/wireLength) : Math.asin(Wz/wireLength);

  let currentPos = {...bp0};

  const result: XZ[] = [];
  for (let j = 1; j < pinPositions.length; j++) {
    const pinPrev = pinPositions[j - 1]!;
    const pinJ = pinPositions[j]!;
    const sx = pinJ.x - pinPrev.x;
    const sz = pinJ.z - pinPrev.z;

    const Di = Math.hypot(sx, sz);

    currentPos = {x: currentPos.x + sx + sign * Di*Math.cos(angle), z: currentPos.z + sz + sign * Math.sin(angle)};

    result.push({
      ...currentPos
    });
  }
  return result;
}

/** If the float BP would round to the same integer grid cell as the parallel
 * placement (i.e. step rounds away), nudge it by 1 unit along `u` so the
 * fan-out remains visually perceptible at 1-cell pin spacings.
 *
 * Snapping uses the same convention as `worldToGridPosition`:
 * `(round(x), round(-z))`.
 */
export function nudgeIfSameGridCell(bp: XZ, parallelBp: XZ, u: XZ): XZ {
  // deactivated for now
  return bp;
  const sameCell =
    Math.round(bp.x) === Math.round(parallelBp.x) &&
    Math.round(-bp.z) === Math.round(-parallelBp.z);
  if (!sameCell) return bp;
  return { x: bp.x + u.x, z: bp.z + u.z };
}
