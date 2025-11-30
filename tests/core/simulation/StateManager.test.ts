/**
 * Unit tests for StateManager
 * @module tests/core/simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '@/core/simulation/StateManager.js';
import { SimulationState } from '@/core/simulation/SimulationState.js';

describe('StateManager', () => {
  describe('constructor', () => {
    it('should create manager with history disabled by default', () => {
      const manager = new StateManager();

      expect(manager.isHistoryEnabled()).toBe(false);
      expect(manager.getCurrentTick()).toBe(0);
      expect(manager.getHistorySize()).toBe(0);
    });

    it('should create manager with history enabled', () => {
      const manager = new StateManager(true);

      expect(manager.isHistoryEnabled()).toBe(true);
      expect(manager.getHistoryLimit()).toBe(1000); // Default limit
    });

    it('should create manager with custom history limit', () => {
      const manager = new StateManager(true, 500);

      expect(manager.isHistoryEnabled()).toBe(true);
      expect(manager.getHistoryLimit()).toBe(500);
    });

    it('should throw error for invalid history limit', () => {
      expect(() => new StateManager(true, 0)).toThrow(RangeError);
      expect(() => new StateManager(true, -1)).toThrow(RangeError);
    });

    it('should allow history limit of 1', () => {
      const manager = new StateManager(true, 1);

      expect(manager.getHistoryLimit()).toBe(1);
    });
  });

  describe('getCurrentState', () => {
    it('should return current state', () => {
      const manager = new StateManager();
      const state = manager.getCurrentState();

      expect(state).toBeInstanceOf(SimulationState);
      expect(state.tick).toBe(0);
    });

    it('should return mutable state reference', () => {
      const manager = new StateManager();
      const state1 = manager.getCurrentState();
      const state2 = manager.getCurrentState();

      expect(state1).toBe(state2); // Same reference
    });
  });

  describe('getCurrentTick', () => {
    it('should return 0 initially', () => {
      const manager = new StateManager();

      expect(manager.getCurrentTick()).toBe(0);
    });

    it('should return correct tick after advances', () => {
      const manager = new StateManager();

      manager.advanceToNextTick();
      expect(manager.getCurrentTick()).toBe(1);

      manager.advanceToNextTick();
      expect(manager.getCurrentTick()).toBe(2);
    });
  });

  describe('advanceToNextTick', () => {
    it('should increment tick number', () => {
      const manager = new StateManager();

      expect(manager.getCurrentTick()).toBe(0);

      manager.advanceToNextTick();
      expect(manager.getCurrentTick()).toBe(1);

      manager.advanceToNextTick();
      expect(manager.getCurrentTick()).toBe(2);
    });

    it('should create new state for next tick', () => {
      const manager = new StateManager();
      const state0 = manager.getCurrentState();

      manager.advanceToNextTick();
      const state1 = manager.getCurrentState();

      expect(state1).not.toBe(state0);
      expect(state1.tick).toBe(1);
    });

    it('should save previous state to history when enabled', () => {
      const manager = new StateManager(true);

      expect(manager.getHistorySize()).toBe(0);

      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(1);
      expect(manager.getStateAtTick(0)).toBeDefined();
    });

    it('should not save to history when disabled', () => {
      const manager = new StateManager(false);

      manager.advanceToNextTick();
      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(0);
      expect(manager.getHistory()).toEqual([]);
    });

    it('should return new current state', () => {
      const manager = new StateManager();

      const newState = manager.advanceToNextTick();

      expect(newState).toBe(manager.getCurrentState());
      expect(newState.tick).toBe(1);
    });
  });

  describe('getStateAtTick', () => {
    it('should return undefined when history is disabled', () => {
      const manager = new StateManager(false);

      manager.advanceToNextTick();

      expect(manager.getStateAtTick(0)).toBeUndefined();
    });

    it('should return historical state by tick', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick(); // Save tick 0
      manager.advanceToNextTick(); // Save tick 1

      const state0 = manager.getStateAtTick(0);
      const state1 = manager.getStateAtTick(1);

      expect(state0?.tick).toBe(0);
      expect(state1?.tick).toBe(1);
    });

    it('should return undefined for non-existent tick', () => {
      const manager = new StateManager(true);

      expect(manager.getStateAtTick(100)).toBeUndefined();
    });

    it('should return undefined for current tick (not in history yet)', () => {
      const manager = new StateManager(true);

      expect(manager.getStateAtTick(0)).toBeUndefined();

      manager.advanceToNextTick();

      expect(manager.getStateAtTick(1)).toBeUndefined(); // Current tick
      expect(manager.getStateAtTick(0)).toBeDefined(); // Historical tick
    });
  });

  describe('getHistory', () => {
    it('should return empty array when history disabled', () => {
      const manager = new StateManager(false);

      manager.advanceToNextTick();

      expect(manager.getHistory()).toEqual([]);
    });

    it('should return all historical states', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick(); // Save tick 0
      manager.advanceToNextTick(); // Save tick 1
      manager.advanceToNextTick(); // Save tick 2

      const history = manager.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].tick).toBe(0);
      expect(history[1].tick).toBe(1);
      expect(history[2].tick).toBe(2);
    });

    it('should return sorted history (oldest first)', () => {
      const manager = new StateManager(true);

      // Advance multiple ticks
      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      const history = manager.getHistory();

      expect(history).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(history[i].tick).toBe(i);
      }
    });

    it('should return readonly array', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();

      const history = manager.getHistory();

      // TypeScript type is ReadonlyArray
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('circular buffer behavior', () => {
    it('should respect history limit', () => {
      const manager = new StateManager(true, 3);

      // Advance 5 times (limit is 3)
      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      expect(manager.getHistorySize()).toBe(3); // Limited to 3
    });

    it('should keep most recent states when limit exceeded', () => {
      const manager = new StateManager(true, 3);

      // Advance 5 times
      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      // Should have ticks 2, 3, 4 (most recent 3)
      const history = manager.getHistory();

      expect(history).toHaveLength(3);
      expect(history.map(s => s.tick).sort((a, b) => a - b)).toEqual([2, 3, 4]);
    });

    it('should handle exactly filling buffer', () => {
      const manager = new StateManager(true, 3);

      // Advance exactly 3 times
      for (let i = 0; i < 3; i++) {
        manager.advanceToNextTick();
      }

      expect(manager.getHistorySize()).toBe(3);
      expect(manager.getStateAtTick(0)).toBeDefined();
      expect(manager.getStateAtTick(1)).toBeDefined();
      expect(manager.getStateAtTick(2)).toBeDefined();
    });

    it('should wrap correctly in circular buffer', () => {
      const manager = new StateManager(true, 2);

      // Advance 4 times
      for (let i = 0; i < 4; i++) {
        manager.advanceToNextTick();
      }

      // Should have ticks 2 and 3 (wrapped around)
      expect(manager.getHistorySize()).toBe(2);
      expect(manager.getStateAtTick(0)).toBeUndefined(); // Overwritten
      expect(manager.getStateAtTick(1)).toBeUndefined(); // Overwritten
      expect(manager.getStateAtTick(2)).toBeDefined();
      expect(manager.getStateAtTick(3)).toBeDefined();
    });
  });

  describe('getOldestTick', () => {
    it('should return undefined when history is empty', () => {
      const manager = new StateManager(true);

      expect(manager.getOldestTick()).toBeUndefined();
    });

    it('should return oldest tick in history', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick(); // Save tick 0
      manager.advanceToNextTick(); // Save tick 1
      manager.advanceToNextTick(); // Save tick 2

      expect(manager.getOldestTick()).toBe(0);
    });

    it('should update when circular buffer wraps', () => {
      const manager = new StateManager(true, 2);

      for (let i = 0; i < 4; i++) {
        manager.advanceToNextTick();
      }

      // Oldest should be tick 2 (ticks 0-1 overwritten)
      expect(manager.getOldestTick()).toBe(2);
    });

    it('should return undefined when history disabled', () => {
      const manager = new StateManager(false);

      manager.advanceToNextTick();

      expect(manager.getOldestTick()).toBeUndefined();
    });
  });

  describe('getNewestHistoricalTick', () => {
    it('should return undefined when history is empty', () => {
      const manager = new StateManager(true);

      expect(manager.getNewestHistoricalTick()).toBeUndefined();
    });

    it('should return newest historical tick (not current)', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick(); // Save tick 0, now at 1
      manager.advanceToNextTick(); // Save tick 1, now at 2

      expect(manager.getCurrentTick()).toBe(2);
      expect(manager.getNewestHistoricalTick()).toBe(1);
    });

    it('should update as simulation progresses', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();
      expect(manager.getNewestHistoricalTick()).toBe(0);

      manager.advanceToNextTick();
      expect(manager.getNewestHistoricalTick()).toBe(1);

      manager.advanceToNextTick();
      expect(manager.getNewestHistoricalTick()).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const manager = new StateManager(true);

      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      expect(manager.getHistorySize()).toBe(5);

      manager.clearHistory();

      expect(manager.getHistorySize()).toBe(0);
      expect(manager.getHistory()).toEqual([]);
    });

    it('should not affect current state', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();
      manager.advanceToNextTick();

      manager.clearHistory();

      expect(manager.getCurrentTick()).toBe(2);
    });

    it('should allow new history after clear', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();
      manager.clearHistory();

      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset to tick 0', () => {
      const manager = new StateManager(true);

      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      manager.reset();

      expect(manager.getCurrentTick()).toBe(0);
    });

    it('should clear all history', () => {
      const manager = new StateManager(true);

      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
      }

      manager.reset();

      expect(manager.getHistorySize()).toBe(0);
    });

    it('should create new initial state', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();
      const oldState = manager.getCurrentState();

      manager.reset();
      const newState = manager.getCurrentState();

      expect(newState).not.toBe(oldState);
      expect(newState.tick).toBe(0);
    });
  });

  describe('isHistoryEnabled', () => {
    it('should return correct value', () => {
      const manager1 = new StateManager(false);
      const manager2 = new StateManager(true);

      expect(manager1.isHistoryEnabled()).toBe(false);
      expect(manager2.isHistoryEnabled()).toBe(true);
    });

    it('should not change after construction', () => {
      const manager = new StateManager(true);

      expect(manager.isHistoryEnabled()).toBe(true);

      manager.advanceToNextTick();

      expect(manager.isHistoryEnabled()).toBe(true);
    });
  });

  describe('getHistoryLimit', () => {
    it('should return configured limit', () => {
      const manager1 = new StateManager(true, 1000);
      const manager2 = new StateManager(true, 500);

      expect(manager1.getHistoryLimit()).toBe(1000);
      expect(manager2.getHistoryLimit()).toBe(500);
    });

    it('should return default when not specified', () => {
      const manager = new StateManager(true);

      expect(manager.getHistoryLimit()).toBe(1000);
    });
  });

  describe('getHistorySize', () => {
    it('should return 0 initially', () => {
      const manager = new StateManager(true);

      expect(manager.getHistorySize()).toBe(0);
    });

    it('should increase as states are saved', () => {
      const manager = new StateManager(true, 10);

      for (let i = 0; i < 5; i++) {
        manager.advanceToNextTick();
        expect(manager.getHistorySize()).toBe(i + 1);
      }
    });

    it('should not exceed limit', () => {
      const manager = new StateManager(true, 3);

      for (let i = 0; i < 10; i++) {
        manager.advanceToNextTick();
      }

      expect(manager.getHistorySize()).toBe(3);
    });

    it('should return 0 when history disabled', () => {
      const manager = new StateManager(false);

      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(0);
    });
  });

  describe('stress test', () => {
    it('should handle many ticks efficiently', () => {
      const manager = new StateManager(true, 100);

      // Advance 1000 ticks
      for (let i = 0; i < 1000; i++) {
        manager.advanceToNextTick();
      }

      expect(manager.getCurrentTick()).toBe(1000);
      expect(manager.getHistorySize()).toBe(100); // Limited to 100

      // Should have ticks 900-999
      const history = manager.getHistory();
      const ticks = history.map(s => s.tick).sort((a, b) => a - b);

      expect(ticks[0]).toBe(900);
      expect(ticks[99]).toBe(999);
    });

    it('should maintain history integrity over many operations', () => {
      const manager = new StateManager(true, 10);

      for (let i = 0; i < 100; i++) {
        manager.advanceToNextTick();

        // Verify history is valid at each step
        const history = manager.getHistory();
        expect(history.length).toBeLessThanOrEqual(10);

        // All ticks in history should be unique
        const ticks = history.map(s => s.tick);
        const uniqueTicks = new Set(ticks);
        expect(uniqueTicks.size).toBe(ticks.length);
      }
    });
  });
});
