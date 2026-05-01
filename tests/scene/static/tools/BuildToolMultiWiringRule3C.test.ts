/**
 * Unit tests for BuildTool multi-wiring rule 3C (docs/multi-wiring.md).
 * @vitest-environment jsdom
 *
 * 3C is the symmetric counterpart of 3B: source = logic pin, target =
 * existing BP. The user's wire is created from a pin to a BP; rule 3C
 * searches the TARGET BP's network for an opposite-type anchor pin BB-jBB
 * and wires sibling BPs (in BB's interface chain) to AA's follow-up pins.
 * No new BPs are created.
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

type Rule3CResult = { addedWires: UUID[]; addedEnodes: UUID[] };

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

function runRule3C(
  tool: BuildTool,
  sourceEnodeId: UUID,
  targetEnodeId: UUID
): Rule3CResult {
  return (
    tool as unknown as {
      createMultiWiringRule3CFollowups: (a: UUID, t: UUID) => Rule3CResult;
    }
  ).createMultiWiringRule3CFollowups(sourceEnodeId, targetEnodeId);
}

/**
 * Symmetric bridge fixture for 3C.
 *   - Component A (source side, pin user wires from): EightBitAdder, AA = inputA.
 *   - Component B (BB-side network the target BP belongs to): EightBitAdder, BB = sum.
 *   - For each k = 0..maxK: sum-k ─ BP_b_k ─ BP_s_k.
 *   - User's gesture: AA-i (= inputA-i) → BP_s_0.  BP_s_0 is target BP.
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
  bpB: UUID[];
  bpS: UUID[];
} {
  const pinPositions = new Map<UUID, { x: number; z: number }>();
  const interfaceMaxA = compA.getInterfaceMaxIndex('inputA');
  for (let k = 0; k <= interfaceMaxA; k++) {
    pinPositions.set(pinId(compA, `inputA-${k}`), { x: k, z: 0 });
  }
  const interfaceMaxB = compB.getInterfaceMaxIndex('sum');
  for (let k = 0; k <= interfaceMaxB; k++) {
    pinPositions.set(pinId(compB, `sum-${k}`), { x: k, z: -10 });
  }
  const bpB: UUID[] = [];
  const bpS: UUID[] = [];
  for (let k = 0; k <= maxK; k++) {
    const b = circuit.addBranchingPoint(new Position(jBB + k, 8));
    const s = circuit.addBranchingPoint(new Position(jBB + k, 4));
    addWireOrThrow(circuit, pinId(compB, `sum-${jBB + k}`), b.id);
    addWireOrThrow(circuit, b.id, s.id);
    bpB.push(b.id);
    bpS.push(s.id);
  }
  void iAA;
  return { pinPositions, bpB, bpS };
}

describe('BuildTool multi-wiring rule 3C', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
  });

  it('returns empty when multiWiring is disabled', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), bpS[0]!);
    const { tool } = buildTool(circuit, false, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-0'), bpS[0]!);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when source is a BP (3A territory)', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const bpA = circuit.addBranchingPoint(new Position(5, 5));
    const bpB = circuit.addBranchingPoint(new Position(7, 7));
    addWireOrThrow(circuit, bpA.id, bpB.id);
    void adder;
    const { tool } = buildTool(circuit, true, new Map(), [adder.id]);

    const out = runRule3C(tool, bpA.id, bpB.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when target is a pin (3B territory)', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const tgtPin = pinId(adder, 'inputB-0');
    const srcPin = pinId(adder, 'inputA-0');
    const pinPositions = new Map<UUID, { x: number; z: number }>([
      [srcPin, { x: 0, z: 0 }],
      [tgtPin, { x: 1, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule3C(tool, srcPin, tgtPin);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when source pin has no logicMetadata (e.g. battery cathode)', () => {
    const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    const src = pinId(battery, 'cathode');
    addWireOrThrow(circuit, src, bp.id);
    const { tool } = buildTool(circuit, true, new Map(), [battery.id]);

    const out = runRule3C(tool, src, bp.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('the just-created src→tgt wire does not poison the anchor pick (same-type filter)', () => {
    // BB-side fixture exists, so the only "logicOutput" pin reachable through tgt's network
    // should be sum-jBB. The just-created wire from inputA-0 (logicInput) to tgt is also reachable
    // (Dl=1) but is filtered out by the opposite-type filter (logicOutput searched, not logicInput).
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), bpS[0]!);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-0'), bpS[0]!);
    expect(out.addedWires.length).toBe(2);
  });

  it('happy path: 2 follow-up wires from BB-side siblings to AA follow-up pins', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), bpS[0]!);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-0'), bpS[0]!);
    expect(out.addedEnodes).toEqual([]);
    expect(out.addedWires.length).toBe(2);
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
    const b0 = circuit.addBranchingPoint(new Position(0, 8));
    const b1 = circuit.addBranchingPoint(new Position(1, 8));
    const b2 = circuit.addBranchingPoint(new Position(2, 8));
    const s0 = circuit.addBranchingPoint(new Position(0, 4));
    const s1 = circuit.addBranchingPoint(new Position(1, 4));
    const s2 = circuit.addBranchingPoint(new Position(10, 4));
    addWireOrThrow(circuit, pinId(compB, 'sum-0'), b0.id);
    addWireOrThrow(circuit, b0.id, s0.id);
    addWireOrThrow(circuit, pinId(compB, 'sum-1'), b1.id);
    addWireOrThrow(circuit, b1.id, s1.id);
    addWireOrThrow(circuit, pinId(compB, 'sum-2'), b2.id);
    addWireOrThrow(circuit, b2.id, s2.id);
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), s0.id);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-0'), s0.id);
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
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), s0.id);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-0'), s0.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('best-effort: a per-j addWire failure is logged and the chain continues', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 0, 0, 2);
    addWireOrThrow(circuit, pinId(compA, 'inputA-0'), bpS[0]!);
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
    const out = runRule3C(tool, pinId(compA, 'inputA-0'), bpS[0]!);
    warnSpy.mockRestore();

    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(bpS[2]!, pinId(compA, 'inputA-2'))).toBe(true);
  });

  it('count clamped by min(maxBB-jBB, maxAA-iAA): stops at last AA pin', () => {
    const compA = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const compB = circuit.addComponent(ComponentType.EightBitAdder, new Position(20, 0), new Rotation(0));
    const { pinPositions, bpS } = buildBridgeFixture(circuit, compA, compB, 6, 0, 3);
    addWireOrThrow(circuit, pinId(compA, 'inputA-6'), bpS[0]!);
    const { tool } = buildTool(circuit, true, pinPositions, [compA.id, compB.id]);

    const out = runRule3C(tool, pinId(compA, 'inputA-6'), bpS[0]!);
    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(bpS[1]!, pinId(compA, 'inputA-7'))).toBe(true);
  });
});
