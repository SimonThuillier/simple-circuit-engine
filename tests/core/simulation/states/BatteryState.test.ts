/**
 * Unit tests for BatteryState
 * @module tests/core/simulation/states
 */

import { describe, it, expect } from 'vitest';
import { BatteryState } from '@/core/simulation/states/BatteryState.js';
import { generateUUID } from '@/core/types/Identifier.js';

describe('BatteryState', () => {
  describe('constructor', () => {
    it('should create battery state with default voltage', () => {
      const componentId = generateUUID();
      const state = new BatteryState(componentId);

      expect(state.componentId).toBe(componentId);
      expect(state.state).toBe('on');
      expect(state.voltage).toBe(9);
      expect(state.transitionStartTick).toBeNull();
      expect(state.delayCounter).toBe(0);
    });

    it('should create battery state with custom voltage', () => {
      const componentId = generateUUID();
      const state = new BatteryState(componentId, 12);

      expect(state.voltage).toBe(12);
      expect(state.state).toBe('on');
    });

    it('should always initialize state as "on"', () => {
      const state = new BatteryState(generateUUID(), 5);

      expect(state.state).toBe('on');
    });
  });

  describe('properties', () => {
    it('should have readonly voltage', () => {
      const state = new BatteryState(generateUUID(), 9);

      // TypeScript enforces readonly at compile time
      expect(state.voltage).toBe(9);
    });

    it('should inherit ComponentState properties', () => {
      const componentId = generateUUID();
      const state = new BatteryState(componentId, 9);

      expect(state.componentId).toBe(componentId);
      expect(state.state).toBeDefined();
      expect(state.transitionStartTick).toBeDefined();
      expect(state.delayCounter).toBeDefined();
    });
  });

  describe('voltage values', () => {
    it('should accept various voltage values', () => {
      expect(new BatteryState(generateUUID(), 1.5).voltage).toBe(1.5);
      expect(new BatteryState(generateUUID(), 3).voltage).toBe(3);
      expect(new BatteryState(generateUUID(), 5).voltage).toBe(5);
      expect(new BatteryState(generateUUID(), 9).voltage).toBe(9);
      expect(new BatteryState(generateUUID(), 12).voltage).toBe(12);
    });

    it('should accept decimal voltage values', () => {
      const state = new BatteryState(generateUUID(), 3.7);

      expect(state.voltage).toBe(3.7);
    });

    it('should accept zero voltage', () => {
      const state = new BatteryState(generateUUID(), 0);

      expect(state.voltage).toBe(0);
    });
  });
});
