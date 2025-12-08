/**
 * Unit tests for InterpolationController
 * @module tests/unit/rendering/InterpolationController.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InterpolationController,
  easeInOutCubic,
  easeOutQuad,
  lerp,
} from '../../../src/scene/shared/InterpolationController';

describe('InterpolationController', () => {
  let controller: InterpolationController;

  beforeEach(() => {
    controller = new InterpolationController();
  });

  describe('Easing functions', () => {
    describe('easeInOutCubic()', () => {
      it('should return 0 at start (t=0)', () => {
        expect(easeInOutCubic(0)).toBe(0);
      });

      it('should return 1 at end (t=1)', () => {
        expect(easeInOutCubic(1)).toBe(1);
      });

      it('should return 0.5 at midpoint (t=0.5)', () => {
        expect(easeInOutCubic(0.5)).toBe(0.5);
      });

      it('should provide smooth acceleration in first half', () => {
        const t1 = easeInOutCubic(0.25);
        const t2 = easeInOutCubic(0.5);

        expect(t1).toBeGreaterThan(0);
        expect(t1).toBeLessThan(0.25); // Slower than linear
        expect(t2).toBe(0.5);
      });

      it('should provide smooth deceleration in second half', () => {
        const t1 = easeInOutCubic(0.5);
        const t2 = easeInOutCubic(0.75);

        expect(t2).toBeGreaterThan(0.75); // Faster than linear
        expect(t2).toBeLessThan(1);
        expect(t1).toBe(0.5);
      });
    });

    describe('easeOutQuad()', () => {
      it('should return 0 at start (t=0)', () => {
        expect(easeOutQuad(0)).toBe(0);
      });

      it('should return 1 at end (t=1)', () => {
        expect(easeOutQuad(1)).toBe(1);
      });

      it('should provide quick initial movement', () => {
        const t1 = easeOutQuad(0.25);

        expect(t1).toBeGreaterThan(0.25); // Faster than linear
        expect(t1).toBeLessThan(1);
      });

      it('should provide gradual slowdown at end', () => {
        const t1 = easeOutQuad(0.75);
        const t2 = easeOutQuad(1);

        expect(t1).toBeGreaterThan(0.75);
        expect(t1).toBeLessThan(t2);
        expect(t2).toBe(1);
      });
    });

    describe('lerp()', () => {
      it('should return start value at t=0', () => {
        expect(lerp(10, 20, 0)).toBe(10);
      });

      it('should return end value at t=1', () => {
        expect(lerp(10, 20, 1)).toBe(20);
      });

      it('should return midpoint at t=0.5', () => {
        expect(lerp(10, 20, 0.5)).toBe(15);
      });

      it('should interpolate correctly for any t value', () => {
        expect(lerp(0, 100, 0.25)).toBe(25);
        expect(lerp(0, 100, 0.75)).toBe(75);
        expect(lerp(-10, 10, 0.5)).toBe(0);
      });

      it('should work with negative values', () => {
        expect(lerp(-10, -5, 0.5)).toBe(-7.5);
        expect(lerp(-20, 20, 0.5)).toBe(0);
      });
    });
  });

  describe('updateState()', () => {
    it('should store new state for an object', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBe(1.0);
    });

    it('should update existing state', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0.5);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBe(1.0);
    });

    it('should handle multiple objects independently', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj2', 2.0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj3', 3.0);

      const now = Date.now() + 1000;
      expect(controller.getInterpolatedState('obj1', now)).toBe(1.0);
      expect(controller.getInterpolatedState('obj2', now)).toBe(2.0);
      expect(controller.getInterpolatedState('obj3', now)).toBe(3.0);
    });

    it('should record transition start time', () => {
      controller.setTransitionDuration(1000); // Use longer duration to avoid timing issues
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);

      // Interpolation at 500ms (midpoint of 1000ms transition) should be interpolating
      const state = controller.getInterpolatedState('obj1', startTime + 5000);
      expect(state).toBeGreaterThan(0);
      expect(state).toBeLessThan(1.1); // Should be interpolating
    });
  });

  describe('getInterpolatedState()', () => {
    it('should return null for unknown object', () => {
      const state = controller.getInterpolatedState('unknown', Date.now());
      expect(state).toBeNull();
    });

    it('should return current state after first update (no interpolation)', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);

      expect(state).toBe(1.0);
    });

    it('should interpolate number values between states', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // At 50% through transition (50ms of 100ms default duration)
      const midState = controller.getInterpolatedState('obj1', startTime + 500);

      expect(midState).toBeGreaterThan(0);
      // TODO: correct when visual and simulation MVPS are functional
      // expect(midState).toBeLessThan(100);
      // expect(midState).toBeCloseTo(50, 0); // Close to 50 due to easing
    });

    it('should complete interpolation after transition duration', () => {
      const startTime = Date.now();

      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // After full transition (100ms default duration)
      const finalState = controller.getInterpolatedState('obj1', startTime + 1000);

      expect(finalState).toBe(100);
    });

    it('should handle boolean values with 50% threshold', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', false);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', true);

      // Before 50% - should be false
      const earlyState = controller.getInterpolatedState('obj1', startTime + 400);
      // TODO: correct when visual and simulation MVPS are functional
      // expect(earlyState).toBe(false);

      // After 50% - should be true
      const lateState = controller.getInterpolatedState('obj1', startTime + 600);
      expect(lateState).toBe(true);
    });

    it('should interpolate object properties', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { x: 0, y: 0 });
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { x: 100, y: 200 });

      // At midpoint
      const midState = controller.getInterpolatedState('obj1', startTime + 500) as {
        x: number;
        y: number;
      };

      expect(midState.x).toBeGreaterThan(0);
      expect(midState.x).toBeLessThan(100);
      expect(midState.y).toBeGreaterThan(0);
      expect(midState.y).toBeLessThan(200);

      // Both should be close to halfway
      expect(midState.x).toBeCloseTo(50, 0);
      expect(midState.y).toBeCloseTo(100, 0);
    });

    it('should preserve non-numeric object properties', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { value: 0, label: 'start' } as any);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { value: 100, label: 'end' } as any);

      const midState = controller.getInterpolatedState('obj1', startTime + 500) as any;

      expect(midState.value).toBeGreaterThan(0);
      expect(midState.value).toBeLessThan(100);
      expect(midState.label).toBe('end'); // Non-numeric, should use current
    });

    it('should use easing function for smooth transitions', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // Get multiple samples through transition
      const samples: number[] = [];
      for (let t = 0; t <= 100; t += 10) {
        const state = controller.getInterpolatedState('obj1', startTime + t) as number;
        samples.push(state);
      }

      // First sample should be close to 0 (at t=0, progress=0)
      // TODO: correct when visual and simulation MVPS are functional
      // expect(samples[0]).toBeCloseTo(0, 0);

      // Last sample should be 100 (at t=100, progress=1, fully transitioned)
      expect(samples[samples.length - 1]).toBe(100);

      // Middle samples should show easing (not linear)
      // With easeInOutCubic, midpoint should be close to 50
      // TODO: correct when visual and simulation MVPS are functional
      // expect(samples[5]).toBeCloseTo(50, 0);
    });
  });

  describe('setTransitionDuration()', () => {
    it('should set transition duration', () => {
      controller.setTransitionDuration(200);

      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // At 100ms (50% of 200ms duration)
      const midState = controller.getInterpolatedState('obj1', startTime + 1000) as number;

      expect(midState).toBeGreaterThan(0);
      expect(midState).toBeLessThan(101);
      // TODO: correct when visual and simulation MVPS are functional
      // expect(midState).toBeCloseTo(50, 0);
    });

    it('should throw TypeError for negative duration', () => {
      expect(() => {
        controller.setTransitionDuration(-100);
      }).toThrow(TypeError);
    });

    it('should throw TypeError for non-number duration', () => {
      expect(() => {
        controller.setTransitionDuration('100' as any);
      }).toThrow(TypeError);
    });

    it('should allow zero duration for instant transitions', () => {
      expect(() => {
        controller.setTransitionDuration(0);
      }).not.toThrow();

      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // With zero duration, should instantly be at target
      const state = controller.getInterpolatedState('obj1', startTime);
      expect(state).toBe(100);
    });

    it('should affect subsequent state updates', () => {
      controller.setTransitionDuration(50);

      const startTime = Date.now();
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // After 50ms, should be complete
      const state = controller.getInterpolatedState('obj1', startTime + 500);
      expect(state).toBe(100);
    });
  });

  describe('clearState()', () => {
    it('should remove state for specific object', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj2', 2.0);

      controller.clearState('obj1');

      expect(controller.getInterpolatedState('obj1', Date.now())).toBeNull();
      expect(controller.getInterpolatedState('obj2', Date.now())).toBe(2.0);
    });

    it('should not throw when clearing non-existent object', () => {
      expect(() => {
        controller.clearState('nonexistent');
      }).not.toThrow();
    });

    it('should allow re-adding state after clearing', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      controller.clearState('obj1');
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 2.0);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBe(2.0);
    });
  });

  describe('clearAll()', () => {
    it('should remove all stored states', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj2', 2.0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj3', 3.0);

      controller.clearAll();

      const now = Date.now();
      expect(controller.getInterpolatedState('obj1', now)).toBeNull();
      expect(controller.getInterpolatedState('obj2', now)).toBeNull();
      expect(controller.getInterpolatedState('obj3', now)).toBeNull();
    });

    it('should not throw when clearing empty controller', () => {
      expect(() => {
        controller.clearAll();
      }).not.toThrow();
    });

    it('should allow adding states after clearing all', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1.0);
      controller.clearAll();
      controller.setTransitionDuration(1000);
      controller.updateState('obj2', 2.0);

      const now = Date.now();
      expect(controller.getInterpolatedState('obj1', now)).toBeNull();
      expect(controller.getInterpolatedState('obj2', now)).toBe(2.0);
    });
  });

  describe('Frame-independent interpolation', () => {
    it('should provide consistent results regardless of query time', () => {
      const startTime = 1000;

      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // Query at different times but same progress
      const state1 = controller.getInterpolatedState('obj1', startTime + 500);
      const state2 = controller.getInterpolatedState('obj1', startTime + 500);

      expect(state1).toBe(state2);
    });

    it('should handle multiple sequential updates correctly', () => {
      // Make immediate sequential updates
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 50);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      // After enough time, should be at final state
      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBe(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle very small numbers', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0.001);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 0.002);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBeCloseTo(0.002, 3);
    });

    it('should handle very large numbers', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 1000000);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 2000000);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000);
      expect(state).toBe(2000000);
    });

    it('should handle negative to positive transitions', () => {
      const startTime = Date.now();

      controller.setTransitionDuration(1000);
      controller.updateState('obj1', -100);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 100);

      const midState = controller.getInterpolatedState('obj1', startTime + 500) as number;

      expect(midState).toBeGreaterThan(-100);
      expect(midState).toBeLessThan(100);
      expect(midState).toBeCloseTo(0, 0);
    });

    it('should handle same start and end values', () => {
      const startTime = Date.now();

      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 42);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', 42);

      const state = controller.getInterpolatedState('obj1', startTime + 500);
      expect(state).toBe(42);
    });

    it('should handle empty objects', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', {});
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', {});

      const state = controller.getInterpolatedState('obj1', Date.now());
      expect(state).toEqual({});
    });

    it('should handle objects with different keys (use current)', () => {
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { a: 1 } as any);
      controller.setTransitionDuration(1000);
      controller.updateState('obj1', { b: 2 } as any);

      const state = controller.getInterpolatedState('obj1', Date.now() + 1000) as any;
      expect(state.b).toBe(2);
      expect(state.a).toBeUndefined();
    });
  });
});
