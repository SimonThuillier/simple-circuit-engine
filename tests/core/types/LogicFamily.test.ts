/**
 * Unit tests for LogicFamily module
 *
 * Tests computeGateDelay and classifyGate functions for all
 * supported logic families and gate types.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_LOGIC_FAMILIES,
  DEFAULT_LOGIC_FAMILY,
  classifyGate,
  computeGateDelay,
} from 'simple-circuit-engine/core';
import { ComponentType } from 'simple-circuit-engine/core';

describe('LogicFamily constants', () => {
  it('ALL_LOGIC_FAMILIES includes CMOS1, TTL1, Sandbox', () => {
    expect(ALL_LOGIC_FAMILIES).toContain('CMOS1');
    expect(ALL_LOGIC_FAMILIES).toContain('TTL1');
    expect(ALL_LOGIC_FAMILIES).toContain('Sandbox');
  });

  it('DEFAULT_LOGIC_FAMILY is CMOS1', () => {
    expect(DEFAULT_LOGIC_FAMILY).toBe('CMOS1');
  });
});

describe('computeGateDelay()', () => {
  describe('Sandbox throws', () => {
    it('throws when called with Sandbox', () => {
      expect(() => computeGateDelay('Sandbox', 'NOT', 1)).toThrow();
    });
  });

  describe('CMOS1', () => {
    it('NOT = 1 (constant, input count does not matter)', () => {
      expect(computeGateDelay('CMOS1', 'NOT', 1)).toBe(1);
    });

    it('Buffer = 2 (constant)', () => {
      expect(computeGateDelay('CMOS1', 'Buffer', 1)).toBe(2);
    });

    it('NAND: log2(n)', () => {
      expect(computeGateDelay('CMOS1', 'NAND', 2)).toBe(1);
      expect(computeGateDelay('CMOS1', 'NAND', 4)).toBe(2);
      expect(computeGateDelay('CMOS1', 'NAND', 8)).toBe(3);
      expect(computeGateDelay('CMOS1', 'NAND', 16)).toBe(4);
    });

    it('NOR: log2(n)', () => {
      expect(computeGateDelay('CMOS1', 'NOR', 2)).toBe(1);
      expect(computeGateDelay('CMOS1', 'NOR', 4)).toBe(2);
      expect(computeGateDelay('CMOS1', 'NOR', 8)).toBe(3);
      expect(computeGateDelay('CMOS1', 'NOR', 16)).toBe(4);
    });

    it('AND: log2(n) + 1', () => {
      expect(computeGateDelay('CMOS1', 'AND', 2)).toBe(2);
      expect(computeGateDelay('CMOS1', 'AND', 4)).toBe(3);
      expect(computeGateDelay('CMOS1', 'AND', 8)).toBe(4);
      expect(computeGateDelay('CMOS1', 'AND', 16)).toBe(5);
    });

    it('OR: log2(n) + 1', () => {
      expect(computeGateDelay('CMOS1', 'OR', 2)).toBe(2);
      expect(computeGateDelay('CMOS1', 'OR', 4)).toBe(3);
      expect(computeGateDelay('CMOS1', 'OR', 8)).toBe(4);
      expect(computeGateDelay('CMOS1', 'OR', 16)).toBe(5);
    });

    it('XOR: log2(n) * 2', () => {
      expect(computeGateDelay('CMOS1', 'XOR', 2)).toBe(2);
      expect(computeGateDelay('CMOS1', 'XOR', 4)).toBe(4);
      expect(computeGateDelay('CMOS1', 'XOR', 8)).toBe(6);
      expect(computeGateDelay('CMOS1', 'XOR', 16)).toBe(8);
    });

    it('XNOR: log2(n) * 2 + 1', () => {
      expect(computeGateDelay('CMOS1', 'XNOR', 2)).toBe(3);
      expect(computeGateDelay('CMOS1', 'XNOR', 4)).toBe(5);
      expect(computeGateDelay('CMOS1', 'XNOR', 8)).toBe(7);
      expect(computeGateDelay('CMOS1', 'XNOR', 16)).toBe(9);
    });
  });

  describe('TTL1', () => {
    it('NOT = 1 (same as CMOS1)', () => {
      expect(computeGateDelay('TTL1', 'NOT', 1)).toBe(1);
    });

    it('Buffer = 2 (same as CMOS1)', () => {
      expect(computeGateDelay('TTL1', 'Buffer', 1)).toBe(2);
    });

    it('NAND: multi-emitter scales well', () => {
      expect(computeGateDelay('TTL1', 'NAND', 2)).toBe(1);
      expect(computeGateDelay('TTL1', 'NAND', 4)).toBe(1);
      expect(computeGateDelay('TTL1', 'NAND', 8)).toBe(2);
      expect(computeGateDelay('TTL1', 'NAND', 16)).toBe(2);
    });

    it('AND: NAND + inverter stage', () => {
      expect(computeGateDelay('TTL1', 'AND', 2)).toBe(2);
      expect(computeGateDelay('TTL1', 'AND', 4)).toBe(2);
      expect(computeGateDelay('TTL1', 'AND', 8)).toBe(3);
      expect(computeGateDelay('TTL1', 'AND', 16)).toBe(3);
    });

    it('NOR: disadvantaged in TTL', () => {
      expect(computeGateDelay('TTL1', 'NOR', 2)).toBe(1);
      expect(computeGateDelay('TTL1', 'NOR', 4)).toBe(2);
      expect(computeGateDelay('TTL1', 'NOR', 8)).toBe(2);
      expect(computeGateDelay('TTL1', 'NOR', 16)).toBe(3);
    });

    it('OR: NOR + inverter stage', () => {
      expect(computeGateDelay('TTL1', 'OR', 2)).toBe(2);
      expect(computeGateDelay('TTL1', 'OR', 4)).toBe(3);
      expect(computeGateDelay('TTL1', 'OR', 8)).toBe(3);
      expect(computeGateDelay('TTL1', 'OR', 16)).toBe(4);
    });

    it('XOR: same as CMOS1 (log2(n) * 2)', () => {
      expect(computeGateDelay('TTL1', 'XOR', 2)).toBe(2);
      expect(computeGateDelay('TTL1', 'XOR', 4)).toBe(4);
      expect(computeGateDelay('TTL1', 'XOR', 8)).toBe(6);
    });

    it('XNOR: same as CMOS1 (log2(n) * 2 + 1)', () => {
      expect(computeGateDelay('TTL1', 'XNOR', 2)).toBe(3);
      expect(computeGateDelay('TTL1', 'XNOR', 4)).toBe(5);
      expect(computeGateDelay('TTL1', 'XNOR', 8)).toBe(7);
    });

    it('throws for unsupported TTL1 input count', () => {
      expect(() => computeGateDelay('TTL1', 'NAND', 3)).toThrow();
    });
  });
});

describe('classifyGate()', () => {
  describe('Inverter', () => {
    it('negative activationLogic → NOT with 1 input', () => {
      const result = classifyGate(ComponentType.Inverter, 'negative');
      expect(result).toEqual({ gateFamily: 'NOT', inputCount: 1 });
    });

    it('positive activationLogic → Buffer with 1 input', () => {
      const result = classifyGate(ComponentType.Inverter, 'positive');
      expect(result).toEqual({ gateFamily: 'Buffer', inputCount: 1 });
    });
  });

  describe('NandGate (2-input)', () => {
    it('negative → NAND(2)', () => {
      expect(classifyGate(ComponentType.NandGate, 'negative')).toEqual({
        gateFamily: 'NAND',
        inputCount: 2,
      });
    });

    it('positive → AND(2)', () => {
      expect(classifyGate(ComponentType.NandGate, 'positive')).toEqual({
        gateFamily: 'AND',
        inputCount: 2,
      });
    });
  });

  describe('Nand4Gate', () => {
    it('negative → NAND(4)', () => {
      expect(classifyGate(ComponentType.Nand4Gate, 'negative')).toEqual({
        gateFamily: 'NAND',
        inputCount: 4,
      });
    });

    it('positive → AND(4)', () => {
      expect(classifyGate(ComponentType.Nand4Gate, 'positive')).toEqual({
        gateFamily: 'AND',
        inputCount: 4,
      });
    });
  });

  describe('Nand8Gate', () => {
    it('negative → NAND(8)', () => {
      expect(classifyGate(ComponentType.Nand8Gate, 'negative')).toEqual({
        gateFamily: 'NAND',
        inputCount: 8,
      });
    });

    it('positive → AND(8)', () => {
      expect(classifyGate(ComponentType.Nand8Gate, 'positive')).toEqual({
        gateFamily: 'AND',
        inputCount: 8,
      });
    });
  });

  describe('NorGate (2-input)', () => {
    it('negative → NOR(2)', () => {
      expect(classifyGate(ComponentType.NorGate, 'negative')).toEqual({
        gateFamily: 'NOR',
        inputCount: 2,
      });
    });

    it('positive → OR(2)', () => {
      expect(classifyGate(ComponentType.NorGate, 'positive')).toEqual({
        gateFamily: 'OR',
        inputCount: 2,
      });
    });
  });

  describe('Nor4Gate', () => {
    it('negative → NOR(4)', () => {
      expect(classifyGate(ComponentType.Nor4Gate, 'negative')).toEqual({
        gateFamily: 'NOR',
        inputCount: 4,
      });
    });
  });

  describe('Nor8Gate', () => {
    it('negative → NOR(8)', () => {
      expect(classifyGate(ComponentType.Nor8Gate, 'negative')).toEqual({
        gateFamily: 'NOR',
        inputCount: 8,
      });
    });
  });

  describe('XorGate', () => {
    it('positive → XOR(2)', () => {
      expect(classifyGate(ComponentType.XorGate, 'positive')).toEqual({
        gateFamily: 'XOR',
        inputCount: 2,
      });
    });

    it('negative → XNOR(2)', () => {
      expect(classifyGate(ComponentType.XorGate, 'negative')).toEqual({
        gateFamily: 'XNOR',
        inputCount: 2,
      });
    });
  });

  describe('non-gate components return null', () => {
    it('Battery returns null', () => {
      expect(classifyGate(ComponentType.Battery, 'positive')).toBeNull();
    });

    it('Switch returns null', () => {
      expect(classifyGate(ComponentType.Switch, 'negative')).toBeNull();
    });

    it('Lightbulb returns null', () => {
      expect(classifyGate(ComponentType.Lightbulb, 'positive')).toBeNull();
    });

    it('Relay returns null', () => {
      expect(classifyGate(ComponentType.Relay, 'positive')).toBeNull();
    });

    it('SmallLED returns null', () => {
      expect(classifyGate(ComponentType.SmallLED, 'positive')).toBeNull();
    });
  });
});
