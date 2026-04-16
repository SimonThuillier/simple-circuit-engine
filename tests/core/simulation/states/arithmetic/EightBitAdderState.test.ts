/**
 * Unit tests for EightBitAdderState
 * @module tests/core/simulation/states/arithmetic
 */

import { describe, it, expect } from 'vitest';
import { EightBitAdderState } from '../../../../../src/core/simulation/states/arithmetic/EightBitAdderState';

const ID = 'test-id' as any;

describe('EightBitAdderState', () => {
  describe('constructor defaults', () => {
    it('should initialise with all-low state', () => {
      const state = new EightBitAdderState(ID);
      expect(state.state).toBe('0000');
      expect(state.outputCount).toBe(16);
      expect(state.hexDigitCount).toBe(4);
      expect(state.allLowState).toBe('0000');
    });

    it('should accept a custom initial state', () => {
      const state = new EightBitAdderState(ID, 'aaaa');
      expect(state.state).toBe('aaaa');
    });
  });

  describe('isSumHigh', () => {
    it('should read sum bits at even positions', () => {
      // 0x5555 = 0101 0101 0101 0101 → all sums high, all carries low
      const state = new EightBitAdderState(ID, '5555');
      for (let i = 0; i < 8; i++) {
        expect(state.isSumHigh(i)).toBe(true);
      }
    });

    it('should return false for sums when all carries are high', () => {
      // 0xaaaa = 1010 1010 1010 1010 → all sums low, all carries high
      const state = new EightBitAdderState(ID, 'aaaa');
      for (let i = 0; i < 8; i++) {
        expect(state.isSumHigh(i)).toBe(false);
      }
    });

    it('should read individual sum bits correctly', () => {
      // 0x0001 = bit 0 set → S0 high only
      const state = new EightBitAdderState(ID, '0001');
      expect(state.isSumHigh(0)).toBe(true);
      expect(state.isSumHigh(1)).toBe(false);
    });
  });

  describe('isStageCarryHigh', () => {
    it('should read carry bits at odd positions', () => {
      // 0xaaaa → all carries high
      const state = new EightBitAdderState(ID, 'aaaa');
      for (let i = 0; i < 8; i++) {
        expect(state.isStageCarryHigh(i)).toBe(true);
      }
    });

    it('should return false when all sums are high', () => {
      // 0x5555 → all carries low
      const state = new EightBitAdderState(ID, '5555');
      for (let i = 0; i < 8; i++) {
        expect(state.isStageCarryHigh(i)).toBe(false);
      }
    });
  });

  describe('isCarryOutHigh', () => {
    it('should return true when C7 (bit 15) is set', () => {
      // 0x8000 = bit 15 only
      const state = new EightBitAdderState(ID, '8000');
      expect(state.isCarryOutHigh()).toBe(true);
    });

    it('should return false when C7 is not set', () => {
      const state = new EightBitAdderState(ID, '7fff');
      expect(state.isCarryOutHigh()).toBe(false);
    });
  });

  describe('effectiveState and transitions', () => {
    it('should return state directly when not in transition', () => {
      const state = new EightBitAdderState(ID, '1234');
      expect(state.effectiveState).toBe('1234');
      expect(state.isInTransition).toBe(false);
    });

    it('should return prevState when in transition', () => {
      const state = new EightBitAdderState(ID, '0000');
      state.setState('to5556', 10);
      state.parameters.set('prevState', '0000');
      expect(state.isInTransition).toBe(true);
      expect(state.effectiveState).toBe('0000');
    });

    it('should fall back to allLowState when prevState missing during transition', () => {
      const state = new EightBitAdderState(ID, '0000');
      state.setState('to5556', 10);
      expect(state.effectiveState).toBe('0000');
    });

    it('should return indeterminate as-is', () => {
      const state = new EightBitAdderState(ID, '0000');
      state.setState('indeterminate', 5);
      expect(state.effectiveState).toBe('indeterminate');
      expect(state.isSumHigh(0)).toBe(false);
      expect(state.isCarryOutHigh()).toBe(false);
    });
  });
});
