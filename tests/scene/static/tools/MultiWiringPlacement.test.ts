/**
 * Unit tests for the pure rule 2 placement helper.
 */
import { describe, it, expect } from 'vitest';
import {
  computeRule2BpPositions,
  nudgeIfSameGridCell,
  type XZ,
} from '../../../../src/scene/static/tools/MultiWiringPlacement';

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const xzClose = (a: XZ, b: XZ, eps = 1e-6) => close(a.x, b.x, eps) && close(a.z, b.z, eps);

describe('computeRule2BpPositions', () => {
  it('returns [] when only the source pin is provided (count = 0)', () => {
    expect(computeRule2BpPositions([{ x: 0, z: 0 }], { x: 0, z: -3 }, 1)).toEqual([]);
  });

  it('perpendicular wire, logicInput: each follow-up grows by 1*Di in wire direction', () => {
    // pins along +x at unit spacing; bp0 3 units along -z (perpendicular).
    const pins: XZ[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ];
    const bp0: XZ = { x: 0, z: -3 };
    const out = computeRule2BpPositions(pins, bp0, 1);
    expect(out.length).toBe(3);
    expect(xzClose(out[0]!, { x: 1, z: -4 })).toBe(true); // pin1 + W + 1*1*u
    expect(xzClose(out[1]!, { x: 2, z: -5 })).toBe(true);
    expect(xzClose(out[2]!, { x: 3, z: -6 })).toBe(true);
  });

  it('perpendicular wire, logicOutput: each follow-up shrinks by 1*Di in wire direction', () => {
    const pins: XZ[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ];
    const bp0: XZ = { x: 0, z: -5 };
    const out = computeRule2BpPositions(pins, bp0, -1);
    expect(out.length).toBe(3);
    // BP_j = pin_j + W - j*Di*u  (W = (0,-5), u = (0,-1) so -j*1*u = +j on z)
    expect(xzClose(out[0]!, { x: 1, z: -4 })).toBe(true);
    expect(xzClose(out[1]!, { x: 2, z: -3 })).toBe(true);
    expect(xzClose(out[2]!, { x: 3, z: -2 })).toBe(true);
  });

  it('diagonal wire, logicInput: offset along the diagonal direction', () => {
    // 3-4-5 right triangle: |W| = 5, u = (3/5, -4/5)
    const pins: XZ[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
    ];
    const bp0: XZ = { x: 3, z: -4 };
    const out = computeRule2BpPositions(pins, bp0, 1);
    expect(out.length).toBe(2);
    // BP_1 = pin_1 + W + 1*1*u = (1,0) + (3,-4) + (3/5, -4/5) = (4.6, -4.8)
    expect(xzClose(out[0]!, { x: 4.6, z: -4.8 })).toBe(true);
    // BP_2 = pin_2 + W + 2*1*u = (2,0) + (3,-4) + (6/5, -8/5) = (6.2, -5.6)
    expect(xzClose(out[1]!, { x: 6.2, z: -5.6 })).toBe(true);
  });

  it('handles non-uniform pin spacing per pair', () => {
    const pins: XZ[] = [
      { x: 0, z: 0 },
      { x: 2, z: 0 }, // spacing 2 between 0 and 1
      { x: 5, z: 0 }, // spacing 3 between 1 and 2
    ];
    const bp0: XZ = { x: 0, z: -10 };
    const out = computeRule2BpPositions(pins, bp0, 1);
    expect(out.length).toBe(2);
    // angle = asin(-1) = -π/2 → cos≈0, sin=-1.
    // j=1: pinPrev→pinJ = (+2,0); step = sign*(Di*cos, sin) = (0, -1).
    //      currentPos = bp0 + (2,0) + (0,-1) = (2, -11).
    expect(xzClose(out[0]!, { x: 2, z: -11 })).toBe(true);
    // j=2: pinPrev→pinJ = (+3,0); step = (0,-1) again (sin not scaled by Di).
    //      currentPos = (2,-11) + (3,0) + (0,-1) = (5, -12).
    expect(xzClose(out[1]!, { x: 5, z: -12 })).toBe(true);
  });
});

describe('nudgeIfSameGridCell', () => {
  it('currently deactivated: returns its input untouched even when grid cells match', () => {
    // Behaviour disabled at the source (early return). Keep this test pinned so a
    // re-activation forces the original nudge expectations to come back.
    const bp: XZ = { x: 1.1, z: -2.1 };
    const parallel: XZ = { x: 0.9, z: -1.9 }; // same rounded cell as bp
    const u: XZ = { x: 1, z: 0 };
    expect(nudgeIfSameGridCell(bp, parallel, u)).toEqual(bp);
  });

  it('returns the input untouched when grid cells differ', () => {
    const bp: XZ = { x: 1.4, z: -3.4 };
    const parallel: XZ = { x: 0.4, z: -2.4 };
    const u: XZ = { x: 1, z: 0 };
    expect(nudgeIfSameGridCell(bp, parallel, u)).toEqual(bp);
  });
});
