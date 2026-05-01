/**
 * Unit tests for BuildTool multi-wiring rule 1 (docs/multi-wiring.md).
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BuildTool } from '../../../../src/scene/static/tools/BuildTool';
import { Circuit } from '../../../../src/core/topology/Circuit';
import { CircuitOptions } from '../../../../src/core/topology/CircuitOptions';
import { Component, ComponentType, Position, Rotation } from 'simple-circuit-engine/core';
import type { CircuitController } from '../../../../src/scene/static/CircuitController';

type MockController = {
  factoryRegistry: Record<string, unknown>;
  multiWiring: boolean;
  getCircuit(): Circuit;
  addWire: (a: string, b: string) => ReturnType<Circuit['addWire']>;
};

function buildTool(circuit: Circuit, multiWiring: boolean): {
  tool: BuildTool;
  controller: MockController;
} {
  const controller: MockController = {
    factoryRegistry: {},
    multiWiring,
    getCircuit: () => circuit,
    addWire(a, b) {
      const result = circuit.addWire(a, b);
      if (result instanceof Error) throw result;
      return result;
    },
  };
  const tool = new BuildTool(controller as unknown as CircuitController);
  return { tool, controller };
}

function runFollowUp(tool: BuildTool, a: string, b: string): string[] {
  return (tool as unknown as {
    createMultiWiringFollowUpWires(a: string, b: string): string[];
  }).createMultiWiringFollowUpWires(a, b);
}

function pinId(component: Component, label: string): string {
  for (const id of component.pins) {
    if (component.getPinLabel(id) === label) return id;
  }
  throw new Error(`pin ${label} not found`);
}

describe('BuildTool multi-wiring rule 1', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions('test'));
  });

  it('no fan-out when multiWiring is disabled', () => {
    const comp = circuit.addComponent(
      ComponentType.EightBitOnesComplement,
      new Position(0, 0),
      new Rotation(0)
    );
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(20, 0),
      new Rotation(0)
    );
    const src = pinId(comp, 'output-0');
    const tgt = pinId(adder, 'inputB-0');

    const { tool } = buildTool(circuit, false);
    const added = runFollowUp(tool, src, tgt);

    expect(added).toEqual([]);
  });

  it('fans out 8 wires between two full 8-bit interfaces', () => {
    const comp = circuit.addComponent(
      ComponentType.EightBitOnesComplement,
      new Position(0, 0),
      new Rotation(0)
    );
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(20, 0),
      new Rotation(0)
    );
    const src = pinId(comp, 'output-0');
    const tgt = pinId(adder, 'inputB-0');
    // create the primary wire (mimics BuildTool.completeWireCreation doing it first)
    circuit.addWire(src, tgt);

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, tgt);

    expect(added.length).toBe(7); // indices 1..7
    // Verify every output-k / inputB-k (k = 1..7) now has a wire
    for (let k = 1; k <= 7; k++) {
      const s = pinId(comp, `output-${k}`);
      const t = pinId(adder, `inputB-${k}`);
      expect(circuit.hasWireBetween(s, t)).toBe(true);
    }
  });

  it('fans out against a narrower interface (4 wires sum-0..3 -> input1..4)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const nand = circuit.addComponent(
      ComponentType.Nand4Gate,
      new Position(20, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'sum-0');
    const tgt = pinId(nand, 'input1');
    circuit.addWire(src, tgt);

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, tgt);

    expect(added.length).toBe(3); // offsets 1..3
    for (let k = 1; k <= 3; k++) {
      expect(circuit.hasWireBetween(pinId(adder, `sum-${k}`), pinId(nand, `input${k + 1}`))).toBe(
        true
      );
    }
  });

  it('partial overlap: sum-4 -> input1 fans out 3 extra wires (sum-5..7 -> input2..4)', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const nand = circuit.addComponent(
      ComponentType.Nand4Gate,
      new Position(20, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'sum-4');
    const tgt = pinId(nand, 'input1');
    circuit.addWire(src, tgt);

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, tgt);

    expect(added.length).toBe(3);
    for (let k = 1; k <= 3; k++) {
      expect(
        circuit.hasWireBetween(pinId(adder, `sum-${4 + k}`), pinId(nand, `input${1 + k}`))
      ).toBe(true);
    }
  });

  it('does not fan out when both pins belong to the same interface of the same component', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'sum-0');
    const tgt = pinId(adder, 'sum-1');

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, tgt);

    expect(added).toEqual([]);
  });

  it('does not fan out when one endpoint is a non-logic pin', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const bp = circuit.addBranchingPoint(new Position(5, 5));
    const src = pinId(adder, 'sum-0');

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, bp.id);

    expect(added).toEqual([]);
  });

  it('fan-out across two distinct interfaces of the same component', () => {
    const adder = circuit.addComponent(
      ComponentType.EightBitAdder,
      new Position(0, 0),
      new Rotation(0)
    );
    const src = pinId(adder, 'inputA-0');
    const tgt = pinId(adder, 'inputB-0');
    circuit.addWire(src, tgt);

    const { tool } = buildTool(circuit, true);
    const added = runFollowUp(tool, src, tgt);

    expect(added.length).toBe(7);
    for (let k = 1; k <= 7; k++) {
      expect(
        circuit.hasWireBetween(pinId(adder, `inputA-${k}`), pinId(adder, `inputB-${k}`))
      ).toBe(true);
    }
  });
});
