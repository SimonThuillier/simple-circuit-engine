/**
 * Unit tests for input component states (One/Two/Four/EightInputState)
 * @module tests/core/simulation/states/interface
 */

import { describe, it, expect } from 'vitest';
import { OneInputState } from '../../../../../src/core/simulation/states/interface/OneInputState';
import { TwoInputState } from '../../../../../src/core/simulation/states/interface/TwoInputState';
import { FourInputState } from '../../../../../src/core/simulation/states/interface/FourInputState';
import { EightInputState } from '../../../../../src/core/simulation/states/interface/EightInputState';

const ID = 'test-id' as any;

describe('OneInputState', () => {
  it('should initialise with output count 1, single hex digit', () => {
    const s = new OneInputState(ID);
    expect(s.outputCount).toBe(1);
    expect(s.hexDigitCount).toBe(1);
    expect(s.allLowState).toBe('0');
    expect(s.state).toBe('0');
  });

  it('should report bit 0 high in state "1"', () => {
    const s = new OneInputState(ID, '1');
    expect(s.isOutputHigh(0)).toBe(true);
    expect(s.isInTransition).toBe(false);
    expect(s.effectiveState).toBe('1');
  });
});

describe('TwoInputState', () => {
  it('should expose both bits in state "3"', () => {
    const s = new TwoInputState(ID, '3');
    expect(s.outputCount).toBe(2);
    expect(s.hexDigitCount).toBe(1);
    expect(s.allLowState).toBe('0');
    expect(s.isOutputHigh(0)).toBe(true);
    expect(s.isOutputHigh(1)).toBe(true);
  });
});

describe('FourInputState', () => {
  it('should report bit 2 high in state "4"', () => {
    const s = new FourInputState(ID, '4');
    expect(s.outputCount).toBe(4);
    expect(s.allLowState).toBe('0');
    expect(s.isOutputHigh(0)).toBe(false);
    expect(s.isOutputHigh(1)).toBe(false);
    expect(s.isOutputHigh(2)).toBe(true);
    expect(s.isOutputHigh(3)).toBe(false);
  });
});

describe('EightInputState', () => {
  it('should use two hex digits and allLowState "00"', () => {
    const s = new EightInputState(ID);
    expect(s.outputCount).toBe(8);
    expect(s.hexDigitCount).toBe(2);
    expect(s.allLowState).toBe('00');
    expect(s.state).toBe('00');
  });

  it('should expose individual output bits in state "55"', () => {
    const s = new EightInputState(ID, '55');
    // 0x55 = 0101 0101 → bits 0,2,4,6 high
    for (let i = 0; i < 8; i++) {
      expect(s.isOutputHigh(i)).toBe(i % 2 === 0);
    }
  });
});

describe('InputState transition tracking', () => {
  it('should treat the literal "moving" as in-transition', () => {
    const s = new EightInputState(ID, 'aa');
    s.setState('moving', 10);
    s.parameters.set('prevState', 'aa');
    expect(s.isInTransition).toBe(true);
    expect(s.effectiveState).toBe('aa');
  });

  it('should fall back to allLowState when prevState missing during moving', () => {
    const s = new EightInputState(ID, '00');
    s.setState('moving', 5);
    expect(s.effectiveState).toBe('00');
  });

  it('should parse pending move parameters', () => {
    const s = new FourInputState(ID, '0');
    s.setState('moving', 7);
    s.parameters.set('prevState', '0');
    s.parameters.set('2', '1-7-9');
    const pending = s.getPendingMove(2);
    expect(pending).not.toBeNull();
    expect(pending!.target).toBe(1);
    expect(pending!.startTick).toBe(7);
    expect(pending!.endTick).toBe(9);
  });

  it('should return null when no pending move for the index', () => {
    const s = new FourInputState(ID, 'f');
    expect(s.getPendingMove(0)).toBeNull();
  });
});
