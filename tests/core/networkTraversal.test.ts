/**
 * Unit tests for the BP-only sub-graph traversal helpers used by
 * multi-wiring rule 3A.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Circuit } from '../../src/core/topology/Circuit';
import { CircuitOptions } from '../../src/core/topology/CircuitOptions';
import {
  ComponentType,
  Position,
  Rotation,
  Component,
  type UUID,
} from 'simple-circuit-engine/core';
import {
  findPinsReachableFromBp,
  findBpsAtLogicDistance,
} from '../../src/core/topology/networkTraversal';

function pinId(component: Component, label: string): UUID {
  for (const id of component.pins) {
    if (component.getPinLabel(id) === label) return id;
  }
  throw new Error(`pin ${label} not found`);
}

function addWireOrThrow(circuit: Circuit, a: UUID, b: UUID) {
  const result = circuit.addWire(a, b);
  if (result instanceof Error) throw result;
  return result;
}

describe('findPinsReachableFromBp', () => {
  let circuit: Circuit;
  let adder: Component;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
    adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
  });

  it('returns Dl = 0 for a BP wired directly to a pin', () => {
    const pin = pinId(adder, 'inputA-0');
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bp.id, pin);

    const reached = findPinsReachableFromBp(circuit, bp.id);

    expect(reached.size).toBe(1);
    expect(reached.get(pin)).toBe(0);
  });

  it('returns Dl = 1 for a single intermediate BP between start BP and pin', () => {
    const pin = pinId(adder, 'inputA-0');
    const bpMid = circuit.addBranchingPoint(new Position(3, 3));
    const bpStart = circuit.addBranchingPoint(new Position(6, 6));
    addWireOrThrow(circuit, pin, bpMid.id);
    addWireOrThrow(circuit, bpMid.id, bpStart.id);

    const reached = findPinsReachableFromBp(circuit, bpStart.id);

    expect(reached.size).toBe(1);
    expect(reached.get(pin)).toBe(1);
  });

  it('keeps the minimum Dl when the same pin is reachable via multiple paths', () => {
    const pin = pinId(adder, 'inputA-0');
    const bpA = circuit.addBranchingPoint(new Position(2, 2));
    const bpB = circuit.addBranchingPoint(new Position(2, 4));
    const bpStart = circuit.addBranchingPoint(new Position(5, 3));
    // Direct: bpStart - pin (Dl=0)
    addWireOrThrow(circuit, bpStart.id, pin);
    // Indirect: bpStart - bpA - bpB - pin (Dl=2) — should be ignored.
    addWireOrThrow(circuit, bpStart.id, bpA.id);
    addWireOrThrow(circuit, bpA.id, bpB.id);
    addWireOrThrow(circuit, bpB.id, pin);

    const reached = findPinsReachableFromBp(circuit, bpStart.id);

    expect(reached.size).toBe(1);
    expect(reached.get(pin)).toBe(0);
  });

  it('returns an empty map for an isolated BP cluster', () => {
    const bpA = circuit.addBranchingPoint(new Position(1, 1));
    const bpB = circuit.addBranchingPoint(new Position(2, 2));
    addWireOrThrow(circuit, bpA.id, bpB.id);

    const reached = findPinsReachableFromBp(circuit, bpA.id);
    expect(reached.size).toBe(0);
  });

  it('reports multiple terminal pins with their respective Dl', () => {
    const pinA = pinId(adder, 'inputA-0');
    const pinB = pinId(adder, 'inputB-0');
    const bpStart = circuit.addBranchingPoint(new Position(5, 5));
    const bpMid = circuit.addBranchingPoint(new Position(3, 3));
    addWireOrThrow(circuit, bpStart.id, pinA); // direct, Dl=0
    addWireOrThrow(circuit, bpStart.id, bpMid.id);
    addWireOrThrow(circuit, bpMid.id, pinB); // via bpMid, Dl=1

    const reached = findPinsReachableFromBp(circuit, bpStart.id);
    expect(reached.size).toBe(2);
    expect(reached.get(pinA)).toBe(0);
    expect(reached.get(pinB)).toBe(1);
  });

  it('does not traverse through pins (pins are terminal)', () => {
    const pinNear = pinId(adder, 'inputA-0');
    const pinFar = pinId(adder, 'inputA-1');
    const bpStart = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bpStart.id, pinNear);
    addWireOrThrow(circuit, pinNear, pinFar); // a wire between two pins

    const reached = findPinsReachableFromBp(circuit, bpStart.id);
    expect(reached.size).toBe(1);
    expect(reached.has(pinNear)).toBe(true);
    expect(reached.has(pinFar)).toBe(false);
  });

  it('returns empty when the start ENode is not a BranchingPoint', () => {
    const pin = pinId(adder, 'inputA-0');
    const reached = findPinsReachableFromBp(circuit, pin);
    expect(reached.size).toBe(0);
  });
});

describe('findBpsAtLogicDistance', () => {
  let circuit: Circuit;
  let adder: Component;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
    adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
  });

  it('returns the directly-wired BP for Dl = 0', () => {
    const pin = pinId(adder, 'inputA-0');
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bp.id, pin);

    expect(findBpsAtLogicDistance(circuit, pin, 0)).toEqual([bp.id]);
  });

  it('returns BPs at exactly Dl = 1 (one intermediate BP) and not at Dl = 0', () => {
    const pin = pinId(adder, 'inputA-0');
    const bpA = circuit.addBranchingPoint(new Position(3, 3));
    const bpB = circuit.addBranchingPoint(new Position(6, 6));
    addWireOrThrow(circuit, pin, bpA.id);
    addWireOrThrow(circuit, bpA.id, bpB.id);

    expect(findBpsAtLogicDistance(circuit, pin, 0)).toEqual([bpA.id]);
    expect(findBpsAtLogicDistance(circuit, pin, 1)).toEqual([bpB.id]);
    expect(findBpsAtLogicDistance(circuit, pin, 2)).toEqual([]);
  });

  it('returns all sibling BPs when multiple branches share the same logic distance', () => {
    const pin = pinId(adder, 'inputA-0');
    const root = circuit.addBranchingPoint(new Position(1, 1));
    const sibA = circuit.addBranchingPoint(new Position(2, 2));
    const sibB = circuit.addBranchingPoint(new Position(3, 3));
    addWireOrThrow(circuit, pin, root.id);
    addWireOrThrow(circuit, root.id, sibA.id);
    addWireOrThrow(circuit, root.id, sibB.id);

    const out = findBpsAtLogicDistance(circuit, pin, 1);
    expect(out.length).toBe(2);
    expect(new Set(out)).toEqual(new Set([sibA.id, sibB.id]));
  });

  it('cuts branches that hit a pin before reaching the target depth', () => {
    const pinSrc = pinId(adder, 'inputA-0');
    const pinMid = pinId(adder, 'inputA-1');
    const bpA = circuit.addBranchingPoint(new Position(2, 2));
    const bpFar = circuit.addBranchingPoint(new Position(4, 4));
    addWireOrThrow(circuit, pinSrc, bpA.id);
    addWireOrThrow(circuit, bpA.id, pinMid); // branch terminates at pinMid
    addWireOrThrow(circuit, pinMid, bpFar.id); // bpFar is on the far side of pinMid

    // pinMid is a pin and must not be traversed; bpFar must NOT appear.
    const out = findBpsAtLogicDistance(circuit, pinSrc, 2);
    expect(out).toEqual([]);
    // sanity: Dl=0 returns bpA
    expect(findBpsAtLogicDistance(circuit, pinSrc, 0)).toEqual([bpA.id]);
  });

  it('returns empty for a non-pin start ENode', () => {
    const bp = circuit.addBranchingPoint(new Position(0, 0));
    expect(findBpsAtLogicDistance(circuit, bp.id, 0)).toEqual([]);
  });

  it('returns empty when Dl is negative', () => {
    const pin = pinId(adder, 'inputA-0');
    expect(findBpsAtLogicDistance(circuit, pin, -1)).toEqual([]);
  });
});
