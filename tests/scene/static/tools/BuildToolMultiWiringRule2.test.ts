/**
 * Unit tests for BuildTool multi-wiring rule 2 (docs/multi-wiring.md).
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
} from 'simple-circuit-engine/core';
import type { CircuitController } from '../../../../src/scene/static/CircuitController';

type Rule2Result = { addedWires: string[]; addedEnodes: string[] };

type MockController = {
  factoryRegistry: Record<string, unknown>;
  multiWiring: boolean;
  getCircuit(): Circuit;
  addWire: (a: string, b: string) => ReturnType<Circuit['addWire']>;
  addBranchingPoint: (worldPos: THREE.Vector3) => ENode;
  componentObject3Ds: Map<string, THREE.Object3D>;
  wireVisualManager: {
    getPinWorldPositionFromGroup: (
      pinId: string,
      group: THREE.Object3D
    ) => THREE.Vector3 | null;
  };
};

function pinId(component: Component, label: string): string {
  for (const id of component.pins) {
    if (component.getPinLabel(id) === label) return id;
  }
  throw new Error(`pin ${label} not found`);
}

function buildTool(
  circuit: Circuit,
  multiWiring: boolean,
  pinPositions: Map<string, { x: number; z: number }>,
  componentIds: string[],
  overrides: Partial<MockController> = {}
): { tool: BuildTool; controller: MockController } {
  const fakeGroup = new THREE.Object3D();
  const componentObject3Ds = new Map<string, THREE.Object3D>();
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
      getPinWorldPositionFromGroup(pid: string): THREE.Vector3 | null {
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

function runRule2(
  tool: BuildTool,
  sourceEnodeId: string,
  bp: THREE.Vector3
): Rule2Result {
  return (
    tool as unknown as {
      createMultiWiringRule2Followups: (a: string, p: THREE.Vector3) => Rule2Result;
    }
  ).createMultiWiringRule2Followups(sourceEnodeId, bp);
}

describe('BuildTool multi-wiring rule 2', () => {
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
    const src = pinId(adder, 'inputA-0');
    const pinPositions = new Map<string, { x: number; z: number }>();
    for (let k = 0; k <= 7; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    const { tool } = buildTool(circuit, false, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -10));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('no fan-out from a non-logic pin (free / battery)', () => {
    const battery = circuit.addComponent(
      ComponentType.Battery,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(battery, 'cathode');
    const pinPositions = new Map<string, { x: number; z: number }>([
      [src, { x: 0, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [battery.id]);

    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -10));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('logicInput source: 7 follow-up BPs + 7 follow-up wires (current convention: shrinks toward pin)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-0');
    // Pins along +x at integer spacing; primary wire 8 units along -z (perpendicular).
    const pinPositions = new Map<string, { x: number; z: number }>();
    for (let k = 0; k <= 7; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    // Primary wire from inputA-0 to a fresh BP at (0, 0, -8) — emulate that
    // the BP and wire already exist (BuildTool.completeWireCreation does both
    // before calling rule 2).
    const bp0Enode = circuit.addBranchingPoint(new Position(0, 8));
    circuit.addWire(src, bp0Enode.id);

    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -8));
    expect(out.addedEnodes.length).toBe(7);
    expect(out.addedWires.length).toBe(7);

    // Each follow-up BP should be wired to inputA-k (k = 1..7).
    // Under the current sign convention (logicInput → sign=-1), each step adds
    // a unit-length offset along the wire's reverse direction, so BP_k walks
    // back toward the pin row. Grid Y = 8 - k.
    for (let k = 1; k <= 7; k++) {
      const followUpPin = pinId(adder, `inputA-${k}`);
      const bpEnode = circuit.getENode(out.addedEnodes[k - 1]!)!;
      expect(circuit.hasWireBetween(followUpPin, bpEnode.id)).toBe(true);
      expect(bpEnode.position.x).toBe(k);
      expect(bpEnode.position.y).toBe(8 - k);
    }
  });

  it('logicOutput source: 7 follow-up BPs + 7 follow-up wires (current convention: extends away from pin)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'sum-0');
    const pinPositions = new Map<string, { x: number; z: number }>();
    for (let k = 0; k <= 7; k++) {
      pinPositions.set(pinId(adder, `sum-${k}`), { x: k, z: 0 });
    }
    // Primary wire 10 along -z; under sign=+1 (logicOutput) BP_k extends further.
    circuit.addWire(src, circuit.addBranchingPoint(new Position(0, 10)).id);

    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -10));
    expect(out.addedEnodes.length).toBe(7);
    expect(out.addedWires.length).toBe(7);

    for (let k = 1; k <= 7; k++) {
      const followUpPin = pinId(adder, `sum-${k}`);
      const bpEnode = circuit.getENode(out.addedEnodes[k - 1]!)!;
      expect(circuit.hasWireBetween(followUpPin, bpEnode.id)).toBe(true);
      // logicOutput extends: BP_k z = -10 - k → grid y = 10 + k.
      expect(bpEnode.position.x).toBe(k);
      expect(bpEnode.position.y).toBe(10 + k);
    }
  });

  it('mid-interface source (inputA-5): only 2 follow-ups (count = 7 - 5)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-5');
    const pinPositions = new Map<string, { x: number; z: number }>();
    for (let k = 0; k <= 7; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(5, 0, -5));
    expect(out.addedEnodes.length).toBe(2);
    expect(out.addedWires.length).toBe(2);
    // First follow-up should be wired to inputA-6, second to inputA-7.
    expect(
      circuit.hasWireBetween(pinId(adder, 'inputA-6'), out.addedEnodes[0]!)
    ).toBe(true);
    expect(
      circuit.hasWireBetween(pinId(adder, 'inputA-7'), out.addedEnodes[1]!)
    ).toBe(true);
  });

  it('source at the last index: zero follow-ups (no error)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-7');
    const pinPositions = new Map<string, { x: number; z: number }>([
      [src, { x: 7, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(7, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('aborts fan-out when a pin world-position lookup returns null', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-0');
    // Only the source pin has a world position; the lookup for inputA-1.. is null.
    const pinPositions = new Map<string, { x: number; z: number }>([
      [src, { x: 0, z: 0 }],
    ]);
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id]);

    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -5));
    expect(out).toEqual({ addedWires: [], addedEnodes: [] });
  });

  it('best-effort: a per-step addBranchingPoint failure is logged and skipped', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-0');
    const pinPositions = new Map<string, { x: number; z: number }>();
    for (let k = 0; k <= 7; k++) {
      pinPositions.set(pinId(adder, `inputA-${k}`), { x: k, z: 0 });
    }
    let calls = 0;
    const { tool } = buildTool(circuit, true, pinPositions, [adder.id], {
      addBranchingPoint(worldPos: THREE.Vector3): ENode {
        calls++;
        if (calls === 3) throw new Error('mock failure on 3rd step');
        const gridPos = new Position(Math.round(worldPos.x), Math.round(-worldPos.z));
        return circuit.addBranchingPoint(gridPos);
      },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = runRule2(tool, src, new THREE.Vector3(0, 0, -5));
    warnSpy.mockRestore();

    // 3rd step throws → 6 successful BPs / wires, the failed step contributes nothing.
    expect(out.addedEnodes.length).toBe(6);
    expect(out.addedWires.length).toBe(6);
  });
});
