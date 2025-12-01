/**
 * Unit tests for StateManager class
 *
 * Tests state management and history tracking:
 * - Current state management
 * - Tick advancement
 * - History tracking and circular buffer
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { StateManager } from '@/core/simulation/StateManager';
import { SimulationState } from '@/core/simulation/SimulationState';

describe('StateManager', () => {
  describe('constructor', () => {
    it('should create a state manager with history disabled by default', () => {
      const manager = new StateManager();

      expect(manager).toBeDefined();
      expect(manager.isHistoryEnabled()).toBe(false);
      expect(manager.getCurrentTick()).toBe(0);
      expect(manager.getHistory()).toEqual([]);
    });

    it('should create a state manager with history enabled', () => {
      const manager = new StateManager(true);

      expect(manager.isHistoryEnabled()).toBe(true);
      expect(manager.getHistoryLimit()).toBe(1000);
    });

    it('should create a state manager with custom history limit', () => {
      const manager = new StateManager(true, 500);

      expect(manager.isHistoryEnabled()).toBe(true);
      expect(manager.getHistoryLimit()).toBe(500);
    });

    it('should throw for invalid history limit', () => {
      expect(() => new StateManager(true, 0)).toThrow(RangeError);
      expect(() => new StateManager(true, -1)).toThrow(RangeError);
      expect(() => new StateManager(true, 0)).toThrow(/at least 1/);
    });

    it('should allow history limit of 1', () => {
      const manager = new StateManager(true, 1);

      expect(manager.getHistoryLimit()).toBe(1);
    });
  });

  describe('getCurrentState()', () => {
    it('should return the current simulation state', () => {
      const manager = new StateManager();
      const state = manager.getCurrentState();

      expect(state).toBeInstanceOf(SimulationState);
      expect(state.tick).toBe(0);
    });

    it('should return same state object on multiple calls', () => {
      const manager = new StateManager();
      const state1 = manager.getCurrentState();
      const state2 = manager.getCurrentState();

      expect(state1).toBe(state2);
    });
  });

  describe('getCurrentTick()', () => {
    it('should return 0 for initial state', () => {
      const manager = new StateManager();

      expect(manager.getCurrentTick()).toBe(0);
    });

    it('should return current tick after advancement', () => {
      const manager = new StateManager();
      manager.advanceToNextTick();

      expect(manager.getCurrentTick()).toBe(1);
    });
  });

  describe('advanceToNextTick()', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = new StateManager();
    });

    it('should advance to next tick', () => {
      manager.advanceToNextTick();

      expect(manager.getCurrentTick()).toBe(1);
    });

    it('should advance multiple ticks', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      expect(manager.getCurrentTick()).toBe(3);
    });

    it('should return updated current state', () => {
      const state = manager.advanceToNextTick();

      expect(state).toBeInstanceOf(SimulationState);
      expect(state.tick).toBe(1);
      expect(state).toBe(manager.getCurrentState());
    });

    it('should update tick on current state object', () => {
      const stateBefore = manager.getCurrentState();
      manager.advanceToNextTick();
      const stateAfter = manager.getCurrentState();

      expect(stateAfter.tick).toBe(1);
      // Should reuse same state object
      expect(stateAfter).toBe(stateBefore);
    });
  });

  describe('history tracking - disabled', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = new StateManager(false);
    });

    it('should not store history when disabled', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      expect(manager.getHistory()).toEqual([]);
      expect(manager.getHistorySize()).toBe(0);
    });

    it('should return undefined for getStateAtTick when disabled', () => {
      manager.advanceToNextTick();

      expect(manager.getStateAtTick(0)).toBeUndefined();
    });

    it('should return undefined for oldest/newest tick when disabled', () => {
      manager.advanceToNextTick();

      expect(manager.getOldestTick()).toBeUndefined();
      expect(manager.getNewestHistoricalTick()).toBeUndefined();
    });
  });

  describe('history tracking - enabled', () => {
    let manager: StateManager;

    beforeEach(() => {
      manager = new StateManager(true, 10);
    });

    it('should save state to history when advancing tick', () => {
      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(1);
      const history = manager.getHistory();
      expect(history.length).toBe(1);
      expect(history[0]?.tick).toBe(0);
    });

    it('should save multiple states to history', () => {
      manager.advanceToNextTick(); // tick 0 -> 1, saves tick 0
      manager.advanceToNextTick(); // tick 1 -> 2, saves tick 1
      manager.advanceToNextTick(); // tick 2 -> 3, saves tick 2

      const history = manager.getHistory();
      expect(history.length).toBe(3);
      expect(history[0]?.tick).toBe(0);
      expect(history[1]?.tick).toBe(1);
      expect(history[2]?.tick).toBe(2);
    });

    it('should retrieve state at specific tick', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      const state = manager.getStateAtTick(1);
      expect(state).toBeDefined();
      expect(state?.tick).toBe(1);
    });

    it('should return undefined for non-existent tick', () => {
      manager.advanceToNextTick();

      expect(manager.getStateAtTick(99)).toBeUndefined();
    });

    it('should return history sorted by tick', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      const history = manager.getHistory();
      expect(history.length).toBe(3);
      expect(history[0]?.tick).toBeLessThan(history[1]!.tick);
      expect(history[1]?.tick).toBeLessThan(history[2]!.tick);
    });

    it('should track oldest tick', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      expect(manager.getOldestTick()).toBe(0);
    });

    it('should track newest historical tick', () => {
      manager.advanceToNextTick(); // saves tick 0
      manager.advanceToNextTick(); // saves tick 1
      manager.advanceToNextTick(); // saves tick 2

      expect(manager.getNewestHistoricalTick()).toBe(2);
    });

    it('should not include current tick in history', () => {
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      // Current tick is 2, history should only have 0 and 1
      expect(manager.getCurrentTick()).toBe(2);
      expect(manager.getStateAtTick(2)).toBeUndefined();
    });

    it('should save cloned states to history', () => {
      const currentState = manager.getCurrentState();
      manager.advanceToNextTick();

      const historicalState = manager.getStateAtTick(0);
      expect(historicalState).toBeDefined();
      expect(historicalState).not.toBe(currentState);
    });
  });

  describe('circular buffer history', () => {
    it('should limit history to configured size', () => {
      const manager = new StateManager(true, 3);

      // Advance 5 ticks - should only keep last 3 in history
      manager.advanceToNextTick(); // saves tick 0
      manager.advanceToNextTick(); // saves tick 1
      manager.advanceToNextTick(); // saves tick 2
      manager.advanceToNextTick(); // saves tick 3, overwrites tick 0
      manager.advanceToNextTick(); // saves tick 4, overwrites tick 1

      expect(manager.getHistorySize()).toBe(3);
      const history = manager.getHistory();
      expect(history.map((s) => s.tick)).toEqual([2, 3, 4]);
    });

    it('should overwrite oldest entries when limit reached', () => {
      const manager = new StateManager(true, 2);

      manager.advanceToNextTick(); // saves tick 0
      manager.advanceToNextTick(); // saves tick 1
      manager.advanceToNextTick(); // saves tick 2, overwrites tick 0

      expect(manager.getStateAtTick(0)).toBeUndefined();
      expect(manager.getStateAtTick(1)).toBeDefined();
      expect(manager.getStateAtTick(2)).toBeDefined();
    });

    it('should update oldest tick after circular wrap', () => {
      const manager = new StateManager(true, 3);

      manager.advanceToNextTick();
      manager.advanceToNextTick();
      manager.advanceToNextTick();
      expect(manager.getOldestTick()).toBe(0);

      manager.advanceToNextTick(); // overwrites tick 0
      expect(manager.getOldestTick()).toBe(1);
    });

    it('should handle history limit of 1', () => {
      const manager = new StateManager(true, 1);

      manager.advanceToNextTick(); // saves tick 0
      manager.advanceToNextTick(); // saves tick 1, overwrites tick 0

      expect(manager.getHistorySize()).toBe(1);
      expect(manager.getStateAtTick(1)).toBeDefined();
      expect(manager.getStateAtTick(0)).toBeUndefined();
    });
  });

  describe('clearHistory()', () => {
    it('should clear all historical states', () => {
      const manager = new StateManager(true);
      manager.advanceToNextTick();
      manager.advanceToNextTick();
      manager.advanceToNextTick();

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

    it('should allow adding new history after clear', () => {
      const manager = new StateManager(true);
      manager.advanceToNextTick();
      manager.clearHistory();
      manager.advanceToNextTick();

      expect(manager.getHistorySize()).toBe(1);
    });
  });

  describe('reset()', () => {
    it('should reset to tick 0', () => {
      const manager = new StateManager();
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      manager.reset();

      expect(manager.getCurrentTick()).toBe(0);
    });

    it('should clear all history', () => {
      const manager = new StateManager(true);
      manager.advanceToNextTick();
      manager.advanceToNextTick();

      manager.reset();

      expect(manager.getHistorySize()).toBe(0);
      expect(manager.getHistory()).toEqual([]);
    });

    it('should create new current state', () => {
      const manager = new StateManager();
      const stateBefore = manager.getCurrentState();
      manager.advanceToNextTick();

      manager.reset();

      const stateAfter = manager.getCurrentState();
      expect(stateAfter.tick).toBe(0);
    });
  });

  describe('configuration getters', () => {
    it('should return correct history enabled status', () => {
      const manager1 = new StateManager(true);
      const manager2 = new StateManager(false);

      expect(manager1.isHistoryEnabled()).toBe(true);
      expect(manager2.isHistoryEnabled()).toBe(false);
    });

    it('should return correct history limit', () => {
      const manager1 = new StateManager(true, 100);
      const manager2 = new StateManager(true, 500);

      expect(manager1.getHistoryLimit()).toBe(100);
      expect(manager2.getHistoryLimit()).toBe(500);
    });

    it('should return history size', () => {
      const manager = new StateManager(true);

      expect(manager.getHistorySize()).toBe(0);
      manager.advanceToNextTick();
      expect(manager.getHistorySize()).toBe(1);
      manager.advanceToNextTick();
      expect(manager.getHistorySize()).toBe(2);
    });
  });

  describe('performance', () => {
    it('should advance many ticks efficiently without history', () => {
      const manager = new StateManager(false);
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        manager.advanceToNextTick();
      }

      const elapsedTime = Date.now() - startTime;
      expect(manager.getCurrentTick()).toBe(1000);
      expect(elapsedTime).toBeLessThan(1000); // Should advance in < 1 second
    });

    it('should advance many ticks efficiently with history', () => {
      const manager = new StateManager(true, 100);
      const startTime = Date.now();

      for (let i = 0; i < 200; i++) {
        manager.advanceToNextTick();
      }

      const elapsedTime = Date.now() - startTime;
      expect(manager.getCurrentTick()).toBe(200);
      expect(manager.getHistorySize()).toBe(100); // Limited by circular buffer
      expect(elapsedTime).toBeLessThan(2000); // Should advance in < 2 seconds
    });

    it('should retrieve history efficiently', () => {
      const manager = new StateManager(true, 100);

      for (let i = 0; i < 100; i++) {
        manager.advanceToNextTick();
      }

      const startTime = Date.now();
      const history = manager.getHistory();
      const elapsedTime = Date.now() - startTime;

      expect(history.length).toBe(100);
      expect(elapsedTime).toBeLessThan(100); // Should retrieve in < 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle advancing from tick 0', () => {
      const manager = new StateManager();

      expect(manager.getCurrentTick()).toBe(0);
      manager.advanceToNextTick();
      expect(manager.getCurrentTick()).toBe(1);
    });

    it('should handle multiple resets', () => {
      const manager = new StateManager(true);

      manager.advanceToNextTick();
      manager.reset();
      manager.advanceToNextTick();
      manager.reset();

      expect(manager.getCurrentTick()).toBe(0);
      expect(manager.getHistorySize()).toBe(0);
    });

    it('should handle clearing empty history', () => {
      const manager = new StateManager(true);

      expect(() => manager.clearHistory()).not.toThrow();
      expect(manager.getHistorySize()).toBe(0);
    });

    it('should handle getting state at tick with no history', () => {
      const manager = new StateManager(true);

      expect(manager.getStateAtTick(0)).toBeUndefined();
    });

    it('should return empty array for history when empty', () => {
      const manager = new StateManager(true);

      expect(manager.getHistory()).toEqual([]);
    });
  });
});
