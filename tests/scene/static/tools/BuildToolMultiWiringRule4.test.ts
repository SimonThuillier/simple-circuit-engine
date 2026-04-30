/**
 * Unit tests for BuildTool multi-wiring rule 4 (docs/multi-wiring.md).
 * @vitest-environment jsdom
 *
 * Rule 4 fires after a dbl-click wire split: backward-explore newBP for the
 * closest logic pin AA-i, identify the AA-side and beyond wires, compute
 * v3Delta = beyondEnode - newBP, and for each follow-up pin AA-(i+j) split
 * the sibling's wire-to-predecessor at sibling - v3Delta (if within
 * threshold). Iteration stops on threshold break or empty candidates.
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
  Wire,
  Position,
  Rotation,
  type UUID,
} from 'simple-circuit-engine/core';
import type { CircuitController } from '../../../../src/scene/static/CircuitController';

type Rule4Result = { addedWires: UUID[]; addedEnodes: UUID[] };

type MockController = {
  factoryRegistry: Record<string, unknown>;
  multiWiring: boolean;
  getCircuit(): Circuit;
  addWire: (a: UUID, b: UUID) => ReturnType<Circuit['addWire']>;
  addBranchingPoint: (worldPos: THREE.Vector3) => ENode;
  splitWire: (
    wireId: UUID,
    worldPos: THREE.Vector3
  ) => { branchingPoint: ENode; wires: Wire[] };
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

/** Default splitWire mock: forwards to circuit.splitWire after rounding world to grid. */
function defaultSplitWire(
  circuit: Circuit
): MockController['splitWire'] {
  return (wireId: UUID, worldPos: THREE.Vector3) => {
    const gridPos = new Position(Math.round(worldPos.x), Math.round(-worldPos.z));
    return circuit.splitWire(wireId, gridPos);
  };
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
    splitWire: defaultSplitWire(circuit),
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

function runRule4(tool: BuildTool, newBpId: UUID): Rule4Result {
  return (
    tool as unknown as {
      createMultiWiringRule4Followups: (a: UUID) => Rule4Result;
    }
  ).createMultiWiringRule4Followups(newBpId);
}

/**
 * "Beyond" fan-out fixture for rule 4.
 *
 * Each interface index k in [0..maxK] of `compA.AA` has its own chain:
 *   AA-(iAA+k) ─ BP_a_k ─ BP_b_k    (AA-(iAA+k) at distance Dl=1 from BP_a_k)
 * For the user's gesture we then split the wire BP_a_0 ↔ BP_b_0 at a midpoint,
 * creating newBP. After split:
 *   newBP wires: { newBP↔BP_a_0 (AA side), newBP↔BP_b_0 (beyond) }
 *   - reach: AA-(iAA+0) at Dl=2, predecessor = BP_a_0
 *   - beyondEnode = BP_b_0
 *   - For each j in 1..count, sibling at Dl=2 from AA-(iAA+j) is BP_b_j; its
 *     predecessor is BP_a_j; the wire BP_a_j ↔ BP_b_j is split at
 *     candidate_pos = BP_b_j.world − v3Delta.
 */
function buildBeyondFixture(
  circuit: Circuit,
  compA: Component,
  iAA: number,
  pinLabel: (k: number) => string,
  maxK: number
): {
  pinPositions: Map<UUID, { x: number; z: number }>;
  bpA: UUID[];
  bpB: UUID[];
  bridgeWire: Wire; // wire BP_a_0 ↔ BP_b_0
} {
  const pinPositions = new Map<UUID, { x: number; z: number }>();
  // place AA pins along +x at z=0
  const interfaceMax = compA.getInterfaceMaxIndex(
    compA.getPinMetadata(pinId(compA, pinLabel(iAA)))!.logicPinData!.interface
  );
  for (let k = 0; k <= interfaceMax; k++) {
    pinPositions.set(pinId(compA, pinLabel(k)), { x: k, z: 0 });
  }
  const bpA: UUID[] = [];
  const bpB: UUID[] = [];
  let bridgeWire: Wire | null = null;
  for (let k = 0; k <= maxK; k++) {
    const a = circuit.addBranchingPoint(new Position(iAA + k, 4)); // world z = -4
    const b = circuit.addBranchingPoint(new Position(iAA + k, 8)); // world z = -8
    addWireOrThrow(circuit, pinId(compA, pinLabel(iAA + k)), a.id);
    const w = addWireOrThrow(circuit, a.id, b.id);
    if (k === 0) bridgeWire = w;
    bpA.push(a.id);
    bpB.push(b.id);
  }
  if (!bridgeWire) throw new Error('bridge wire not created');
  return { pinPositions, bpA, bpB, bridgeWire };
}

describe('BuildTool multi-wiring rule 4', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
  });

  it('returns empty when multiWiring is disabled', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const { pinPositions, bridgeWire } = buildBeyondFixture(circuit, adder, 0, (k) => `inputA-${k}`, 2);
    // Split the bridge wire at the midpoint (grid 0,6) to create newBP.
    const splitResult = circuit.splitWire(bridgeWire.id, new Position(0, 6));
    const newBpId = splitResult.branchingPoint.id;
    const { tool } = buildTool(circuit, false, pinPositions, [adder.id]);

    const out = runRule4(tool, newBpId);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when newBP has only one wire (degenerate)', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const bp = circuit.addBranchingPoint(new Position(0, 4));
    addWireOrThrow(circuit, pinId(adder, 'inputA-0'), bp.id);
    const pinPositions = new Map<UUID, { x: number; z: number }>([
      [pinId(adder, 'inputA-0'), { x: 0, z: 0 }],
      [pinId(adder, 'inputA-1'), { x: 1, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule4(tool, bp.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when no logic pin is reachable from newBP', () => {
    // BP between two BPs only — no logic pin in the network.
    const bpA = circuit.addBranchingPoint(new Position(1, 1));
    const bpB = circuit.addBranchingPoint(new Position(5, 5));
    const w = addWireOrThrow(circuit, bpA.id, bpB.id);
    const splitResult = circuit.splitWire(w.id, new Position(3, 3));
    const { tool } = buildTool(circuit, true, new Map(), []);

    const out = runRule4(tool, splitResult.branchingPoint.id);
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('happy path: 2-level fan-out with single sibling per index → 2 splits', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const { pinPositions, bridgeWire, bpA, bpB } = buildBeyondFixture(
      circuit,
      adder,
      0,
      (k) => `inputA-${k}`,
      2
    );
    // Split bridge at midpoint to obtain newBP (grid 0, 6, world z=-6).
    const splitResult = circuit.splitWire(bridgeWire.id, new Position(0, 6));
    const newBpId = splitResult.branchingPoint.id;
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule4(tool, newBpId);
    // Each successful per-j split produces 1 BP and 2 wires.
    expect(out.addedEnodes.length).toBe(2);
    expect(out.addedWires.length).toBe(4);
    // Verify connectivity: each chosen sibling BP_b_j now has its wire to
    // BP_a_j replaced by 2 wires going through a brand-new BP_split_j.
    for (let j = 1; j <= 2; j++) {
      // bpA[j] ↔ bpB[j] direct wire is gone; both are now connected via the new BP.
      expect(circuit.hasWireBetween(bpA[j]!, bpB[j]!)).toBe(false);
    }
  });

  it('threshold break: stops at first sibling whose candidate_pos is too far from prev', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMax = adder.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMax; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    // Build chains for k=0..2 but place BP_b_2 way off so its candidate_pos
    // (= BP_b_2 - v3Delta) is far from prevRefXZ.
    const a0 = circuit.addBranchingPoint(new Position(0, 4));
    const a1 = circuit.addBranchingPoint(new Position(1, 4));
    const a2 = circuit.addBranchingPoint(new Position(2, 4));
    const b0 = circuit.addBranchingPoint(new Position(0, 8));
    const b1 = circuit.addBranchingPoint(new Position(1, 8));
    const b2 = circuit.addBranchingPoint(new Position(20, 8)); // far
    addWireOrThrow(circuit, pinId(adder, 'inputA-0'), a0.id);
    const w0 = addWireOrThrow(circuit, a0.id, b0.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-1'), a1.id);
    addWireOrThrow(circuit, a1.id, b1.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-2'), a2.id);
    addWireOrThrow(circuit, a2.id, b2.id);
    const splitResult = circuit.splitWire(w0.id, new Position(0, 6));
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule4(tool, splitResult.branchingPoint.id);
    // Only j=1 succeeds; j=2 breaks on threshold.
    expect(out.addedEnodes.length).toBe(1);
  });

  it('beyond enode is a Pin (Dl=1): split the wire from sibling directly to its AA-(i+j) pin', () => {
    // Put pin↔pin wires in place using a BP wired only to a pin via 1 edge to make Dl=1.
    // Simplest setup: AA-i ↔ BP, then split that wire so newBP's reach to AA-i has Dl=1
    // and the "beyondEnode" must be a Pin (the OTHER endpoint of the original wire).
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMax = adder.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMax; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    // AA-0 pin → BP_b_0 single direct wire; sibling for j=1 is BP_b_1 wired direct from AA-1.
    const b0 = circuit.addBranchingPoint(new Position(0, 4));
    const b1 = circuit.addBranchingPoint(new Position(1, 4));
    const w0 = addWireOrThrow(circuit, pinId(adder, 'inputA-0'), b0.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-1'), b1.id);
    // Split the AA-0↔b0 wire at midpoint (grid 0,2). NewBp's two wires:
    //   newBP↔AA-0 (AA-side) and newBP↔b0 (beyond).
    const splitResult = circuit.splitWire(w0.id, new Position(0, 2));
    const newBpId = splitResult.branchingPoint.id;
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule4(tool, newBpId);
    // For j=1: sibling is b1 (Dl=1), its predecessor is AA-1 (a Pin); its
    // wire-to-predecessor is the AA-1↔b1 wire. v3Delta = b0.world - newBp.world
    // = (0,-4) - (0,-2) = (0,-2). candidate_pos = (1,-4) - (0,-2) = (1,-2).
    // |candidate - prev=(0,-2)| = 1 ≤ threshold (3). Split should happen.
    expect(out.addedEnodes.length).toBe(1);
    expect(out.addedWires.length).toBe(2);
  });

  it('best-effort: a per-j splitWire failure breaks the chain (downstream geometry untrusted)', () => {
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const { pinPositions, bridgeWire } = buildBeyondFixture(circuit, adder, 0, (k) => `inputA-${k}`, 3);
    const splitResult = circuit.splitWire(bridgeWire.id, new Position(0, 6));
    const newBpId = splitResult.branchingPoint.id;
    const realSplit = defaultSplitWire(circuit);
    let calls = 0;
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id], {
      splitWire(wireId: UUID, worldPos: THREE.Vector3) {
        calls++;
        // After the initial test split (already done outside), per-j splits start now.
        // Throw on the first per-j split to simulate failure.
        if (calls === 1) throw new Error('mock failure on first follow-up split');
        return realSplit(wireId, worldPos);
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = runRule4(tool, newBpId);
    warnSpy.mockRestore();

    // Failure on j=1 → chain breaks; nothing added.
    expect(out.addedEnodes.length).toBe(0);
  });

  it('iterates with prev-sibling reference (chain extends as siblings are chosen)', () => {
    // 3 follow-up indices, each with a single sibling at the natural position.
    const adder = circuit.addComponent(ComponentType.EightBitAdder, new Position(0, 0), new Rotation(0));
    const { pinPositions, bridgeWire } = buildBeyondFixture(circuit, adder, 0, (k) => `inputA-${k}`, 3);
    const splitResult = circuit.splitWire(bridgeWire.id, new Position(0, 6));
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule4(tool, splitResult.branchingPoint.id);
    // 3 splits: j=1, 2, 3. Each adds 1 BP + 2 wires.
    expect(out.addedEnodes.length).toBe(3);
    expect(out.addedWires.length).toBe(6);
  });
});
