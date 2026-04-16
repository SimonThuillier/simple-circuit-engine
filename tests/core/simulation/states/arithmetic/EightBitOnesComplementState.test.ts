/**
 * Unit tests for EightBitOnesComplementState
 * @module tests/core/simulation/states/arithmetic
 */

import { describe, it, expect } from 'vitest';
import { EightBitOnesComplementState } from '../../../../../src/core/simulation/states/arithmetic/EightBitOnesComplementState';

const ID = 'test-id' as any;

describe('EightBitOnesComplementState', () => {
  describe('constructor defaults', () => {
    it('should initialise with all-low state', () => {
      const state = new EightBitOnesComplementState(ID);
      expect(state.state).toBe('000');
      expect(state.outputCount).toBe(9);
      expect(state.hexDigitCount).toBe(3);
      expect(state.allLowState).toBe('000');
    });

    it('should accept a custom initial state', () => {
      const state = new EightBitOnesComplementState(ID, '1ff');
      expect(state.state).toBe('1ff');
    });
  });

  describe('isOutputBitHigh', () => {
    it('should read all output bits high when outputs are 0xff', () => {
      const state = new EightBitOnesComplementState(ID, '0ff');
      for (let i = 0; i < 8; i++) {
        expect(state.isOutputBitHigh(i)).toBe(true);
      }
    });

    it('should read all output bits low when outputs are 0x00', () => {
      const state = new EightBitOnesComplementState(ID, '000');
      for (let i = 0; i < 8; i++) {
        expect(state.isOutputBitHigh(i)).toBe(false);
      }
    });

    it('should read individual output bits correctly', () => {
      // 0x055 = 0000 0101 0101 → bits 0,2,4,6 high
      const state = new EightBitOnesComplementState(ID, '055');
      expect(state.isOutputBitHigh(0)).toBe(true);
      expect(state.isOutputBitHigh(1)).toBe(false);
      expect(state.isOutputBitHigh(2)).toBe(true);
      expect(state.isOutputBitHigh(3)).toBe(false);
      expect(state.isOutputBitHigh(4)).toBe(true);
      expect(state.isOutputBitHigh(5)).toBe(false);
      expect(state.isOutputBitHigh(6)).toBe(true);
      expect(state.isOutputBitHigh(7)).toBe(false);
    });
  });

  describe('isInvertHigh', () => {
    it('should return true when bit 8 is set', () => {
      const state = new EightBitOnesComplementState(ID, '1ff');
      expect(state.isInvertHigh()).toBe(true);
    });

    it('should return false when bit 8 is not set', () => {
      const state = new EightBitOnesComplementState(ID, '0ff');
      expect(state.isInvertHigh()).toBe(false);
    });

    it('should be independent of output bits', () => {
      const state = new EightBitOnesComplementState(ID, '100');
      expect(state.isInvertHigh()).toBe(true);
      expect(state.isOutputBitHigh(0)).toBe(false);
    });
  });

  describe('effectiveState and transitions', () => {
    it('should return state directly when not in transition', () => {
      const state = new EightBitOnesComplementState(ID, '0ff');
      expect(state.effectiveState).toBe('0ff');
      expect(state.isInTransition).toBe(false);
    });

    it('should return prevState when in transition', () => {
      const state = new EightBitOnesComplementState(ID, '000');
      state.setState('to1ff', 10);
      state.parameters.set('prevState', '000');
      expect(state.isInTransition).toBe(true);
      expect(state.effectiveState).toBe('000');
    });

    it('should fall back to allLowState when prevState missing during transition', () => {
      const state = new EightBitOnesComplementState(ID, '000');
      state.setState('to1ff', 10);
      expect(state.effectiveState).toBe('000');
    });

    it('should return indeterminate as-is', () => {
      const state = new EightBitOnesComplementState(ID, '000');
      state.setState('indeterminate', 5);
      expect(state.effectiveState).toBe('indeterminate');
      expect(state.isOutputBitHigh(0)).toBe(false);
      expect(state.isInvertHigh()).toBe(false);
    });
  });
});
