/**
 * Unit tests for Circuit logic family support (US-3 & US-4)
 *
 * Tests:
 * - CircuitMetadata defaultLogicFamily serialization/deserialization
 * - resolveTransitionSpan() computes correct delays per gate type
 * - addComponent() inherits grid default logic family
 * - Changing grid default does NOT retroactively affect existing gates
 * - Sandbox family leaves transitionSpan unchanged
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CIRCUIT_FILE_VERSION,
  Circuit,
  CircuitMetadata,
  ComponentType,
  Position,
  Rotation,
} from 'simple-circuit-engine/core';
import { CircuitOptions } from '../../src/core/topology/CircuitOptions.js';
import { CameraOptions } from '../../src/core/utils/CameraOptions.js';

describe('CircuitMetadata — defaultLogicFamily', () => {
  it('defaults to CMOS1', () => {
    const meta = new CircuitMetadata(
      CIRCUIT_FILE_VERSION,
      new CircuitOptions('Test'),
      10,
      10,
      new CameraOptions()
    );
    expect(meta.options.defaultLogicFamily).toBe('CMOS1');
  });

  it('accepts custom defaultLogicFamily', () => {
    const meta = new CircuitMetadata(
      CIRCUIT_FILE_VERSION,
      new CircuitOptions('Test', 'TTL1'),
      10,
      10,
      new CameraOptions()
    );
    expect(meta.options.defaultLogicFamily).toBe('TTL1');
  });

  it('toJSON() includes defaultLogicFamily', () => {
    const circuit = new Circuit(new CircuitOptions());
    circuit.metadata.options.defaultLogicFamily = 'TTL1';
    const json = circuit.toJSON();
    expect((json.metadata as any).options.defaultLogicFamily).toBe('TTL1');
  });

  it('fromJSON() restores defaultLogicFamily', () => {
    const circuit = new Circuit(new CircuitOptions());
    circuit.metadata.options.defaultLogicFamily = 'TTL1';
    const json = circuit.toJSON();
    const restored = Circuit.fromJSON(json as any);
    expect(restored.metadata.options.defaultLogicFamily).toBe('TTL1');
  });

  it('fromJSON() falls back to CMOS1 for old files without defaultLogicFamily', () => {
    const circuit = new Circuit(new CircuitOptions());
    const json = circuit.toJSON() as any;
    delete json.metadata.options.defaultLogicFamily;
    const restored = Circuit.fromJSON(json);
    expect(restored.metadata.options.defaultLogicFamily).toBe('CMOS1');
  });
});

describe('Circuit.resolveTransitionSpan()', () => {
  let circuit: Circuit;

  beforeEach(() => {
    circuit = new Circuit(new CircuitOptions());
  });

  describe('CMOS1 delays', () => {
    it('Inverter (NOT, negative) → 1 tick', () => {
      const inverter = circuit.addComponent(
        ComponentType.Inverter,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(inverter.config.get('transitionSpan')).toBe('1');
    });

    it('NandGate (NAND2, negative) → 1 tick', () => {
      const gate = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(gate.config.get('transitionSpan')).toBe('1');
    });

    it('Nand4Gate (NAND4, negative) → 2 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.Nand4Gate,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(gate.config.get('transitionSpan')).toBe('2');
    });

    it('Nand8Gate (NAND8, negative) → 3 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.Nand8Gate,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(gate.config.get('transitionSpan')).toBe('3');
    });

    it('NorGate (NOR2, negative) → 1 tick', () => {
      const gate = circuit.addComponent(ComponentType.NorGate, new Position(0, 0), new Rotation(0));
      expect(gate.config.get('transitionSpan')).toBe('1');
    });

    it('Nor4Gate (NOR4, negative) → 2 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.Nor4Gate,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(gate.config.get('transitionSpan')).toBe('2');
    });

    it('Nor8Gate (NOR8, negative) → 3 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.Nor8Gate,
        new Position(0, 0),
        new Rotation(0)
      );
      expect(gate.config.get('transitionSpan')).toBe('3');
    });

    it('XorGate (XOR2, positive) → 2 ticks', () => {
      const gate = circuit.addComponent(ComponentType.XorGate, new Position(0, 0), new Rotation(0));
      expect(gate.config.get('transitionSpan')).toBe('2');
    });

    it('Inverter as Buffer (positive activationLogic) → 2 ticks', () => {
      const inverter = circuit.addComponent(
        ComponentType.Inverter,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'CMOS1'],
          ['activationLogic', 'positive'],
        ])
      );
      expect(inverter.config.get('transitionSpan')).toBe('2');
    });

    it('NandGate as AND (positive activationLogic) → 2 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'CMOS1'],
          ['activationLogic', 'positive'],
        ])
      );
      expect(gate.config.get('transitionSpan')).toBe('2');
    });
  });

  describe('TTL1 delays', () => {
    it('NandGate TTL1 (NAND2) → 1 tick', () => {
      const gate = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'TTL1'],
          ['activationLogic', 'negative'],
        ])
      );
      expect(gate.config.get('transitionSpan')).toBe('1');
    });

    it('Nand4Gate TTL1 (NAND4) → 1 tick', () => {
      const gate = circuit.addComponent(
        ComponentType.Nand4Gate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'TTL1'],
          ['activationLogic', 'negative'],
        ])
      );
      expect(gate.config.get('transitionSpan')).toBe('1');
    });

    it('Nand8Gate TTL1 (NAND8) → 2 ticks', () => {
      const gate = circuit.addComponent(
        ComponentType.Nand8Gate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'TTL1'],
          ['activationLogic', 'negative'],
        ])
      );
      expect(gate.config.get('transitionSpan')).toBe('2');
    });
  });

  describe('Sandbox family', () => {
    it('Sandbox leaves transitionSpan unchanged (user-defined)', () => {
      const gate = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'Sandbox'],
          ['activationLogic', 'negative'],
          ['transitionSpan', '42'],
        ])
      );
      expect(gate.config.get('transitionSpan')).toBe('42');
    });

    it('Sandbox: resolveTransitionSpan is no-op', () => {
      const gate = circuit.addComponent(
        ComponentType.NandGate,
        new Position(0, 0),
        new Rotation(0),
        new Map([
          ['defaultLogicFamily', 'Sandbox'],
          ['transitionSpan', '7'],
        ])
      );
      gate.config.set('transitionSpan', '99');
      circuit.resolveTransitionSpan(gate);
      expect(gate.config.get('transitionSpan')).toBe('99');
    });
  });

  describe('non-gate components', () => {
    it('resolveTransitionSpan is no-op for Battery', () => {
      const battery = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );
      // Battery has no transitionSpan in config
      const before = battery.config.get('transitionSpan');
      circuit.resolveTransitionSpan(battery);
      expect(battery.config.get('transitionSpan')).toBe(before);
    });
  });
});

describe('Circuit.addComponent() — grid default logic family (US-4)', () => {
  it('new gate inherits grid defaultLogicFamily when defaultLogicFamily config is empty', () => {
    const circuit = new Circuit(new CircuitOptions());
    circuit.metadata.options.defaultLogicFamily = 'TTL1';

    // Add gate without specifying defaultLogicFamily in config
    const gate = circuit.addComponent(
      ComponentType.NandGate,
      new Position(0, 0),
      new Rotation(0),
      new Map([
        ['defaultLogicFamily', ''],
        ['activationLogic', 'negative'],
      ])
    );

    expect(gate.config.get('defaultLogicFamily')).toBe('TTL1');
    // TTL1 NAND2 = 1 tick
    expect(gate.config.get('transitionSpan')).toBe('1');
  });

  it('explicit defaultLogicFamily in config overrides grid default', () => {
    const circuit = new Circuit(new CircuitOptions());
    circuit.metadata.options.defaultLogicFamily = 'TTL1';

    const gate = circuit.addComponent(
      ComponentType.NandGate,
      new Position(0, 0),
      new Rotation(0),
      new Map([
        ['defaultLogicFamily', 'CMOS1'],
        ['activationLogic', 'negative'],
      ])
    );

    expect(gate.config.get('defaultLogicFamily')).toBe('CMOS1');
    expect(gate.config.get('transitionSpan')).toBe('1'); // CMOS1 NAND2 = 1
  });

  it('changing grid default does NOT retroactively affect existing gates', () => {
    const circuit = new Circuit(new CircuitOptions());
    circuit.metadata.options.defaultLogicFamily = 'CMOS1';

    const gate = circuit.addComponent(ComponentType.Nand8Gate, new Position(0, 0), new Rotation(0));

    // CMOS1 NAND8 = 3
    expect(gate.config.get('transitionSpan')).toBe('3');

    // Change grid default
    circuit.metadata.options.defaultLogicFamily = 'TTL1';

    // Existing gate is unchanged
    expect(gate.config.get('defaultLogicFamily')).toBe('CMOS1');
    expect(gate.config.get('transitionSpan')).toBe('3');
  });
});
