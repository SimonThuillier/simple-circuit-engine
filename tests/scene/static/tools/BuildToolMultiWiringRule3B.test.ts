/**
 * Unit tests for BuildTool multi-wiring rule 3B (docs/multi-wiring.md).
 * @vitest-environment jsdom
 */

import * as THREE from 'three';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuildTool } from '../../../../src/scene/static/tools/BuildTool';
import { Circuit } from '../../../../src/core/topology/Circuit';
import { CircuitOptions } from '../../../../src/core/topology/CircuitOptions';
import {
  Component,
  ComponentType,
  ENode,
  Position,
  Rotation,
  type UUID,
} from 'simple-circuit-engine/core';
import type { CircuitController } from '../../../../src/scene/static/CircuitController';

type Rule3BResult = { addedWires: UUID[]; addedEnodes: UUID[] };

type MockController = {
  factoryRegistry: Record<string, unknown>;
  multiWiring: boolean;
  getCircuit(): Circuit;
  addWire: (a: UUID, b: UUID) => ReturnType<Circuit['addWire']>;
  addBranchingPoint: (worldPos: THREE.Vector3) => ENode;
  componentObject3Ds: Map<UUID, THREE.Object3D>;
  wireVisualManager: {
    getPinWorldPositionFromGroup: (
      pinId: UUID,
      group: THREE.Object3D
    ) => THREE.Vector3 | null;
  };
};

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

function buildTool(
  circuit: Circuit,
  multiWiring: boolean,
  pinPositions: Map<UUID, { x: number; z: number }>,
  componentIds: UUID[],
  overrides: Partial<MockController> = {}
): { tool: BuildTool; controller: MockController } {
  const fakeGroup = new THREE.Object3D();
  const componentObject3Ds = new Map<UUID, THREE.Object3D>();
  for (const id of componentIds) componentObject3Ds.set(id, fakeGroup);

  const controller: MockController = {
    factoryRegistry: {},
    multiWiring,
    getCircuit: () => circuit,
    addWire(a, b) {
      const result = circuit.addWire(a, b);
      if (result instanceof Error) throw result;
      return result;
    },
    addBranchingPoint(worldPos: THREE.Vector3): ENode {
      const gridPos = new Position(Math.round(worldPos.x), Math.round(-worldPos.z));
      return circuit.addBranchingPoint(gridPos);
    },
    componentObject3Ds,
    wireVisualManager: {
      getPinWorldPositionFromGroup(pid: UUID): THREE.Vector3 | null {
        const p = pinPositions.get(pid);
        if (!p) return null;
        return new THREE.Vector3(p.x, 0, p.z);
      },
    },
    ...overrides,
  };
  const tool = new BuildTool(controller as unknown as CircuitController);
  return { tool, controller };
}

function runRule3B(
  tool: BuildTool,
  sourceEnodeId: UUID,
  targetEnodeId: UUID
): Rule3BResult {
  return (
    tool as unknown as {
      createMultiWiringRule3BFollowups: (a: UUID, t: UUID) => Rule3BResult;
    }
  ).createMultiWiringRule3BFollowups(sourceEnodeId, targetEnodeId);
}

/**
 * Two-component fixture for the rule 3B happy path.
 *
 * Component A (target side): an EightBitAdder; we wire to its `inputA-iAA` (logicInput).
 * Component B (source side): an EightBitAdder used as the "BB" interface via its `sum-jBB` (logicOutput).
 *
 * The BP network bridges them: for each k = 0..maxK,
 *   sum-(jBB+k) ─ BP_b_k ─ BP_s_k     (BP_s_k at logic distance Dl=2 from sum-(jBB+k))
 *
 * The user creates a wire BP_s_0 → inputA-iAA after placing fixture above.
 * Pin positions are mocked so AA's pins are at (k, 0) and BB's pins are at
 * (k, -10) (so BB's network does not collide with AA-side coordinate space).
 */
function buildBridgeFixture(
  circuit: Circuit,
  compA: Component,
  compB: Component,
  iAA: number,
  jBB: number,
  maxK: number
): {
  pinPositions: Map<UUID, { x: number; z: number }>;
  bpB: UUID[]; // BB-side intermediate BPs
  bpS: UUID[]; // BB-side "sibling" BPs (chosen to be wired to AA pins)
} {
  const pinPositions = new Map<UUID, { x: number; z: number }>();
  // AA-side pins (target component): row at z=0
  const interfaceMaxA = compA.getInterfaceMaxIndex('inputA');
  for (let k = 0; k <= interfaceMaxA; k++) {
    pinPositions.set(pinId(compA, `inputA-${k}`), { x: k, z: 0 });
  }
  // BB-side pins (source component): row at z=-10
  const interfaceMaxB = compB.getInterfaceMaxIndex('sum');
  for (let k = 0; k <= interfaceMaxB; k++) {
    pinPositions.set(pinId(compB, `sum-${k}`), { x: k, z: -10 });
  }
  const bpB: UUID[] = [];
  const bpS: UUID[] = [];
  for (let k = 0; k <= maxK; k++) {
    // BP_b_k near the BB pin row (z grid = 8 → world z=-8); BP_s_k near AA row (z grid = 4 → world z=-4)
    const b = circuit.addBranchingPoint(new Position(jBB + k, 8));
    const s = circuit.addBranchingPoint(new Position(jBB + k, 4));
    addWireOrThrow(circuit, pinId(compB, `sum-${jBB + k}`), b.id);
    addWireOrThrow(circuit, b.id, s.id);
    bpB.push(b.id);
    bpS.push(s.id);
  }
  // adjust source BPs into AA's xz plane
  void iAA;
  return { pinPositions, bpB, bpS };
}

describe('BuildTool multi-wiring rule 3B', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
  });

  it('returns empty when multiWiring is disabled', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    // Primary wire BP_s_0 → inputA-0 (replicating BuildTool's call site).
    addWireOrThrow(circuit, bpS[0]!, pinId(compA, 'inputA-0'));
    const { tool } = buildTool(circuit, false, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, bpS[0]!, pinId(compA, 'inputA-0'));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when source is a pin (rule 1 territory)', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const srcPin = pinId(compB, 'sum-0');
    const tgtPin = pinId(compA, 'inputA-0');
    const pinPositions = new Map<UUID, { x: number; z: number }>([
      [srcPin, { x: 0, z: -10 }],
      [tgtPin, { x: 0, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, srcPin, tgtPin);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when target is a BP (3A territory)', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const bpA = circuit.addBranchingPoint(new Position(5, 5));
    const bpB = circuit.addBranchingPoint(new Position(7, 7));
    addWireOrThrow(circuit, bpA.id, bpB.id);
    void adder;
    const { tool } = buildTool(circuit, true, new Map(), [adder.id]);

    const out = runRule3B(tool, bpA.id, bpB.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when target pin has no logicMetadata (e.g. battery cathode)', () => {
    const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    const tgt = pinId(battery, 'cathode');
    addWireOrThrow(circuit, bp.id, tgt);
    const { tool } = buildTool(circuit, true, new Map(), [battery.id]);

    const out = runRule3B(tool, bp.id, tgt);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when no opposite-type pin is reachable through the BP network', () => {
    // Source BP wired to another logicInput pin (same type as target inputA-0)
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const tgtPin = pinId(compA, 'inputA-0');
    const sameTypePin = pinId(compB, 'inputA-0'); // also a logicInput
    const bpSrc = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bpSrc.id, sameTypePin);
    addWireOrThrow(circuit, bpSrc.id, tgtPin);
    const pinPositions = new Map<UUID, { x: number; z: number }>([
      [tgtPin, { x: 0, z: 0 }],
      [pinId(compA, 'inputA-1'), { x: 1, z: 0 }],
      [sameTypePin, { x: 20, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, bpSrc.id, tgtPin);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('happy path: 2 follow-up wires from BB-side siblings to AA follow-up pins', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    // Primary wire (gesture): user wired BP_s_0 to inputA-0. Replicate.
    addWireOrThrow(circuit, bpS[0]!, pinId(compA, 'inputA-0'));
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, bpS[0]!, pinId(compA, 'inputA-0'));
    expect(out.addedEnodes).toEqual([]);
    expect(out.addedWires.length).toBe(2);
    // Each new wire must connect BB-side sibling BP_s_k to inputA-k for k=1..2.
    for (let k = 1; k <= 2; k++) {
      expect(circuit.hasWireBetween(bpS[k]!, pinId(compA, `inputA-${k}`))).toBe(true);
    }
  });

  it('threshold break: stops at the first sibling outside threshold from previous', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMaxA = compA.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMaxA; k++) {
      pinPositions.set(pinId(compA, `inputA-${k}`), { x: k, z: 0 });
    }
    const interfaceMaxB = compB.getInterfaceMaxIndex('sum');
    for (let k = 0; k <= interfaceMaxB; k++) {
      pinPositions.set(pinId(compB, `sum-${k}`), { x: k, z: -10 });
    }
    // BP_b_k at grid (k, 8); BP_s_0 at (0,4), BP_s_1 at (1,4), BP_s_2 at (10, 4) (far)
    const b0 = circuit.addBranchingPoint(new Position(0, 8));
    const b1 = circuit.addBranchingPoint(new Position(1, 8));
    const b2 = circuit.addBranchingPoint(new Position(2, 8));
    const s0 = circuit.addBranchingPoint(new Position(0, 4));
    const s1 = circuit.addBranchingPoint(new Position(1, 4));
    const s2 = circuit.addBranchingPoint(new Position(10, 4)); // far → over threshold from s1
    addWireOrThrow(circuit, pinId(compB, 'sum-0'), b0.id);
    addWireOrThrow(circuit, b0.id, s0.id);
    addWireOrThrow(circuit, pinId(compB, 'sum-1'), b1.id);
    addWireOrThrow(circuit, b1.id, s1.id);
    addWireOrThrow(circuit, pinId(compB, 'sum-2'), b2.id);
    addWireOrThrow(circuit, b2.id, s2.id);
    addWireOrThrow(circuit, s0.id, pinId(compA, 'inputA-0'));
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, s0.id, pinId(compA, 'inputA-0'));
    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(s1.id, pinId(compA, 'inputA-1'))).toBe(true);
  });

  it('ambiguity break: 2 candidates within threshold for j=1 → 0 wires', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMaxA = compA.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMaxA; k++) {
      pinPositions.set(pinId(compA, `inputA-${k}`), { x: k, z: 0 });
    }
    const interfaceMaxB = compB.getInterfaceMaxIndex('sum');
    for (let k = 0; k <= interfaceMaxB; k++) {
      pinPositions.set(pinId(compB, `sum-${k}`), { x: k, z: -10 });
    }
    const b0 = circuit.addBranchingPoint(new Position(0, 8));
    const b1 = circuit.addBranchingPoint(new Position(1, 8));
    const s0 = circuit.addBranchingPoint(new Position(0, 4));
    const s1a = circuit.addBranchingPoint(new Position(1, 4));
    const s1b = circuit.addBranchingPoint(new Position(2, 4));
    addWireOrThrow(circuit, pinId(compB, 'sum-0'), b0.id);
    addWireOrThrow(circuit, b0.id, s0.id);
    addWireOrThrow(circuit, pinId(compB, 'sum-1'), b1.id);
    addWireOrThrow(circuit, b1.id, s1a.id);
    addWireOrThrow(circuit, b1.id, s1b.id);
    addWireOrThrow(circuit, s0.id, pinId(compA, 'inputA-0'));
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, s0.id, pinId(compA, 'inputA-0'));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('best-effort: a per-j addWire failure is logged and the chain continues', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    addWireOrThrow(circuit, bpS[0]!, pinId(compA, 'inputA-0'));
    let addCalls = 0;
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id], {
      addWire(a, b) {
        addCalls++;
        if (addCalls === 1) throw new Error('mock failure on first follow-up wire');
        const result = circuit.addWire(a, b);
        if (result instanceof Error) throw result;
        return result;
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = runRule3B(tool, bpS[0]!, pinId(compA, 'inputA-0'));
    warnSpy.mockRestore();

    // 1st addWire throws → that follow-up was skipped; 2nd succeeds.
    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(bpS[2]!, pinId(compA, 'inputA-2'))).toBe(true);
  });

  it('count clamped by min(maxBB-jBB, maxAA-iAA): stops at last AA pin', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    // Build BB chain for k=0..3 (so 3 follow-ups available), but iAA = 6 → only 1 AA follow-up.
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 6, 0, 3);
    addWireOrThrow(circuit, bpS[0]!, pinId(compA, 'inputA-6'));
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3B(tool, bpS[0]!, pinId(compA, 'inputA-6'));
    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(bpS[1]!, pinId(compA, 'inputA-7'))).toBe(true);
  });
});
