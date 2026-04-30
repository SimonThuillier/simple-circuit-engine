/**
 * Unit tests for BuildTool multi-wiring rule 3A (docs/multi-wiring.md).
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

type Rule3AResult = { addedWires: UUID[]; addedEnodes: UUID[] };

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

/** Build a mock controller wired against a real Circuit. */
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

function runRule3A(
  tool: BuildTool,
  sourceEnodeId: UUID,
  bp: THREE.Vector3
): Rule3AResult {
  return (
    tool as unknown as {
      createMultiWiringRule3AFollowups: (a: UUID, p: THREE.Vector3) => Rule3AResult;
    }
  ).createMultiWiringRule3AFollowups(sourceEnodeId, bp);
}

/**
 * Build the canonical happy-path fixture for rule 3A.
 *
 * Pre-existing network for indices 0..maxK of `interfaceName` on `component`:
 *   pin_(i+k) ─── BP_a_k ─── BP_b_k     (each BP_b_k is at logic distance Dl=1 from pin_(i+k))
 *
 * Pin positions are uniformly spaced 1 unit apart along +x at z=0.
 * BP_a_k is placed 2 units along -z from pin_k.
 * BP_b_k is placed 4 units along -z from pin_k (same x as pin_k).
 *
 * Returns ids + the chosen "start BP" (BP_b_0) + a Map of pin world positions.
 */
function buildLayeredNetwork(
  circuit: Circuit,
  component: Component,
  interfaceName: string,
  pinLabel: (k: number) => string,
  maxK: number
): {
  pinPositions: Map<UUID, { x: number; z: number }>;
  bpA: UUID[];
  bpB: UUID[];
  startBp: UUID;
} {
  const pinPositions = new Map<UUID, { x: number; z: number }>();
  // Map all pins of this interface to deterministic XZ positions. Use the
  // interface's max index from the component metadata to cover all of them
  // (so the rule's pin-spacing lookup for i+1 always succeeds).
  const interfaceMax = component.getInterfaceMaxIndex(interfaceName);
  for (let k = 0; k <= interfaceMax; k++) {
    pinPositions.set(pinId(component, pinLabel(k)), { x: k, z: 0 });
  }
  const bpA: UUID[] = [];
  const bpB: UUID[] = [];
  for (let k = 0; k <= maxK; k++) {
    const a = circuit.addBranchingPoint(new Position(k, 2)); // world z = -2
    const b = circuit.addBranchingPoint(new Position(k, 4)); // world z = -4
    addWireOrThrow(circuit, pinId(component, pinLabel(k)), a.id);
    addWireOrThrow(circuit, a.id, b.id);
    bpA.push(a.id);
    bpB.push(b.id);
  }
  return { pinPositions, bpA, bpB, startBp: bpB[0]! };
}

describe('BuildTool multi-wiring rule 3A', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
  });

  it('no fan-out when multiWiring is disabled', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const { pinPositions, startBp } = buildLayeredNetwork(circuit, adder, 'inputA', (k) => `inputA-${k}`, 2);
    const { tool } = buildTool(circuit, false, pinPositions, [adder.id]);

    const out = runRule3A(tool, startBp, new THREE.Vector3(0, 0, -8));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when source is a pin (rule 2 territory)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-0');
    const pinPositions = new Map<UUID, { x: number; z: number }>([[src, { x: 0, z: 0 }]]);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule3A(tool, src, new THREE.Vector3(0, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when backward exploration finds no pin (orphan BP)', () => {
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    const { tool } = buildTool(circuit, true, new Map(), []);

    const out = runRule3A(tool, bp.id, new THREE.Vector3(0, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when backward exploration reaches multiple pins (ambiguous root)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bp.id, pinId(adder, 'inputA-0'));
    addWireOrThrow(circuit, bp.id, pinId(adder, 'inputB-0'));
    const { tool } = buildTool(circuit, true, new Map(), [adder.id]);

    const out = runRule3A(tool, bp.id, new THREE.Vector3(0, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when Dl = 0 (start BP wired straight to the pin)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    addWireOrThrow(circuit, bp.id, pinId(adder, 'inputA-0'));
    const { tool } = buildTool(circuit, true, new Map(), [adder.id]);

    const out = runRule3A(tool, bp.id, new THREE.Vector3(0, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when the source pin is at the last interface index (no follow-ups)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const a = circuit.addBranchingPoint(new Position(7, 2));
    const b = circuit.addBranchingPoint(new Position(7, 4));
    addWireOrThrow(circuit, pinId(adder, 'inputA-7'), a.id);
    addWireOrThrow(circuit, a.id, b.id);
    const { tool } = buildTool(circuit, true, new Map(), [adder.id]);

    const out = runRule3A(tool, b.id, new THREE.Vector3(7, 0, -8));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('happy path logicInput: 2 follow-up BPs + 2 follow-up wires through layered network', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const { pinPositions, bpB, startBp } = buildLayeredNetwork(
      circuit,
      adder,
      'inputA',
      (k) => `inputA-${k}`,
      2
    );
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    // start BP world position = (0, 0, -4); user clicks new target BP at (0, 0, -8).
    const out = runRule3A(tool, startBp, new THREE.Vector3(0, 0, -8));
    expect(out.addedEnodes.length).toBe(2);
    expect(out.addedWires.length).toBe(2);
    // Each new target BP must be wired to the corresponding sibling start BP (BP_b_k).
    for (let j = 1; j <= 2; j++) {
      expect(circuit.hasWireBetween(bpB[j]!, out.addedEnodes[j - 1]!)).toBe(true);
    }
  });

  it('happy path logicOutput: 2 follow-up BPs + 2 follow-up wires through layered network', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const { pinPositions, bpB, startBp } = buildLayeredNetwork(
      circuit,
      adder,
      'sum',
      (k) => `sum-${k}`,
      2
    );
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule3A(tool, startBp, new THREE.Vector3(0, 0, -8));
    expect(out.addedEnodes.length).toBe(2);
    expect(out.addedWires.length).toBe(2);
    // Each new target BP must be wired to the corresponding sibling start BP.
    for (let j = 1; j <= 2; j++) {
      expect(circuit.hasWireBetween(bpB[j]!, out.addedEnodes[j - 1]!)).toBe(true);
    }
  });

  it('threshold break: stops at first index whose sibling is too far from previous sibling', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    // Build 3 layers but place BP_b_2 far away (> 3 * pinSpacing = 3 from BP_b_1 at x=1).
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMax = adder.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMax; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    const a0 = circuit.addBranchingPoint(new Position(0, 2));
    const a1 = circuit.addBranchingPoint(new Position(1, 2));
    const a2 = circuit.addBranchingPoint(new Position(2, 2));
    const b0 = circuit.addBranchingPoint(new Position(0, 4));
    const b1 = circuit.addBranchingPoint(new Position(1, 4));
    // b2 placed > 3 away from b1 (at x=1). Place it at x=10.
    const b2 = circuit.addBranchingPoint(new Position(10, 4));
    addWireOrThrow(circuit, pinId(adder, 'inputA-0'), a0.id);
    addWireOrThrow(circuit, a0.id, b0.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-1'), a1.id);
    addWireOrThrow(circuit, a1.id, b1.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-2'), a2.id);
    addWireOrThrow(circuit, a2.id, b2.id);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule3A(tool, b0.id, new THREE.Vector3(0, 0, -8));
    expect(out.addedEnodes.length).toBe(1);
    expect(out.addedWires.length).toBe(1);
    expect(circuit.hasWireBetween(b1.id, out.addedEnodes[0]!)).toBe(true);
  });

  it('ambiguity break: 2 candidates within threshold for index i+1 → 0 follow-ups', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const pinPositions = new Map<UUID, { x: number; z: number }>();
    const interfaceMax = adder.getInterfaceMaxIndex('inputA');
    for (let k = 0; k <= interfaceMax; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    const a0 = circuit.addBranchingPoint(new Position(0, 2));
    const a1 = circuit.addBranchingPoint(new Position(1, 2));
    const b0 = circuit.addBranchingPoint(new Position(0, 4));
    // Two candidates at logic distance Dl=1 from inputA-1, both within threshold of b0:
    const b1 = circuit.addBranchingPoint(new Position(1, 4));
    const c1 = circuit.addBranchingPoint(new Position(2, 4));
    addWireOrThrow(circuit, pinId(adder, 'inputA-0'), a0.id);
    addWireOrThrow(circuit, a0.id, b0.id);
    addWireOrThrow(circuit, pinId(adder, 'inputA-1'), a1.id);
    addWireOrThrow(circuit, a1.id, b1.id);
    addWireOrThrow(circuit, a1.id, c1.id);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule3A(tool, b0.id, new THREE.Vector3(0, 0, -8));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('returns empty when start BP is rooted on a non-logic pin (battery)', () => {
    const battery = circuit.addComponent(
      ComponentType.Battery,
      new Position(0, 0),
      new Rotation(0)
    );
    const a = circuit.addBranchingPoint(new Position(0, 2));
    const b = circuit.addBranchingPoint(new Position(0, 4));
    addWireOrThrow(circuit, pinId(battery, 'cathode'), a.id);
    addWireOrThrow(circuit, a.id, b.id);
    const { tool } = buildTool(circuit, true, new Map(), [battery.id]);

    const out = runRule3A(tool, b.id, new THREE.Vector3(0, 0, -8));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('best-effort: a per-step addBranchingPoint failure is logged and skipped', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const { pinPositions, startBp } = buildLayeredNetwork(
      circuit,
      adder,
      'inputA',
      (k) => `inputA-${k}`,
      2
    );
    let calls = 0;
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id], {
      addBranchingPoint(worldPos: THREE.Vector3): ENode {
        calls++;
        if (calls === 1) throw new Error('mock failure on 1st step');
        const gridPos = new Position(Math.round(worldPos.x), Math.round(-worldPos.z));
        return circuit.addBranchingPoint(gridPos);
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = runRule3A(tool, startBp, new THREE.Vector3(0, 0, -8));
    warnSpy.mockRestore();

    // 1st BP creation throws → that step is skipped; 2nd succeeds.
    expect(out.addedEnodes.length).toBe(1);
    expect(out.addedWires.length).toBe(1);
  });
});
