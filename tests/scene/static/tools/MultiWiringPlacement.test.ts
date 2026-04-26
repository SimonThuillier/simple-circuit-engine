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

  it('output clamp: BP never crosses the pin (residual 1-cell wire preserved)', () => {
    // |W| = 2 along -z; with 4 follow-ups, step 2 lands on pin and step 3+ would cross.
    const pins: XZ[] = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
      { x: 4, z: 0 },
    ];
    const bp0: XZ = { x: 0, z: -2 };
    const out = computeRule2BpPositions(pins, bp0, -1);
    expect(out.length).toBe(4);
    // step 1: stepMag = -1, BP = pin1 + (0,-2) + (-1)*(0,-1) = (1, -1)
    expect(xzClose(out[0]!, { x: 1, z: -1 })).toBe(true);
    // steps 2..4: clamped to stepMag = -(|W|-1) = -1, BP = pin_j + (0,-2) + (-1)*(0,-1) = pin_j + (0,-1)
    expect(xzClose(out[1]!, { x: 2, z: -1 })).toBe(true);
    expect(xzClose(out[2]!, { x: 3, z: -1 })).toBe(true);
    expect(xzClose(out[3]!, { x: 4, z: -1 })).toBe(true);
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

  it('returns [] for a degenerate W ≈ 0 (bp0 equals source pin)', () => {
    const pins: XZ[] = [
      { x: 5, z: 5 },
      { x: 6, z: 5 },
    ];
    const bp0: XZ = { x: 5, z: 5 };
    expect(computeRule2BpPositions(pins, bp0, 1)).toEqual([]);
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
    // u = (0,-1); j=1 step = 1*2 = 2 on -z; BP_1 = (2,0)+(0,-10)+(0,-2) = (2,-12)
    expect(xzClose(out[0]!, { x: 2, z: -12 })).toBe(true);
    // j=2 Di between pin1 and pin2 = 3; step = 2*3 = 6 on -z; BP_2 = (5,0)+(0,-10)+(0,-6) = (5,-16)
    expect(xzClose(out[1]!, { x: 5, z: -16 })).toBe(true);
  });
});

describe('nudgeIfSameGridCell', () => {
  it('returns the input untouched when grid cells differ', () => {
    const bp: XZ = { x: 1.4, z: -3.4 };
    const parallel: XZ = { x: 0.4, z: -2.4 };
    const u: XZ = { x: 1, z: 0 };
    expect(nudgeIfSameGridCell(bp, parallel, u)).toEqual(bp);
  });

  it('nudges by u when bp would round to the same grid cell as parallel', () => {
    // Both round to (1, -2). Wire direction u = (1, 0) → nudge x by +1.
    const bp: XZ = { x: 1.1, z: -2.1 };
    const parallel: XZ = { x: 0.9, z: -1.9 };
    const u: XZ = { x: 1, z: 0 };
    const out = nudgeIfSameGridCell(bp, parallel, u);
    expect(close(out.x, 2.1)).toBe(true);
    expect(close(out.z, -2.1)).toBe(true);
  });

  it('nudge handles diagonal u', () => {
    const bp: XZ = { x: 1.1, z: -2.1 };
    const parallel: XZ = { x: 0.9, z: -1.9 };
    const u: XZ = { x: 0.6, z: -0.8 };
    const out = nudgeIfSameGridCell(bp, parallel, u);
    expect(close(out.x, 1.7)).toBe(true);
    expect(close(out.z, -2.9)).toBe(true);
  });
});
