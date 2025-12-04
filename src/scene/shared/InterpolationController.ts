/**
 * Interpolation Controller
 * @module rendering/shared/InterpolationController
 *
 * Manages smooth animation between discrete simulation states using
 * frame-independent interpolation with easing functions.
 */

import type { UUID } from '../../core/types/Identifier';

/**
 * Easing function: Cubic ease-in-out
 * Provides smooth acceleration and deceleration
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value (0-1)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Easing function: Quadratic ease-out
 * Provides quick initial movement with gradual slowdown
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value (0-1)
 */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Linear interpolation between two values
 *
 * @param start - Start value
 * @param end - End value
 * @param t - Progress (0-1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * State value that can be interpolated
 */
type InterpolableValue = number | boolean | { [key: string]: number };

/**
 * Controller for managing state interpolation
 *
 * Provides smooth transitions between discrete simulation states.
 * Uses frame-independent timing for consistent animation across different frame rates.
 *
 * @example
 * ```typescript
 * const controller = new InterpolationController();
 *
 * // Update state when simulation ticks
 * controller.updateState('led-1', { brightness: 1.0, isOn: true });
 *
 * // In render loop, get interpolated state
 * const state = controller.getInterpolatedState('led-1', Date.now());
 * // state.brightness will smoothly transition from previous to current value
 * ```
 */
export class InterpolationController {
  private previousStates: Map<UUID, InterpolableValue> = new Map();
  private currentStates: Map<UUID, InterpolableValue> = new Map();
  private transitionStartTimes: Map<UUID, number> = new Map();
  private transitionDuration: number = 100; // milliseconds

  /**
   * Update the target state for an object
   *
   * @param objectId - Unique identifier for the object
   * @param newState - New state to transition to
   */
  updateState(objectId: UUID, newState: InterpolableValue): void {
    // Store current state as previous
    if (this.currentStates.has(objectId)) {
      this.previousStates.set(objectId, this.currentStates.get(objectId)!);
    } else {
      // First state update - no previous state
      this.previousStates.set(objectId, newState);
    }

    // Set new state as current
    this.currentStates.set(objectId, newState);

    // Record transition start time
    this.transitionStartTimes.set(objectId, Date.now());
  }

  /**
   * Get interpolated state for an object at current time
   *
   * @param objectId - Unique identifier for the object
   * @param currentTime - Current timestamp (milliseconds)
   * @returns Interpolated state value
   */
  getInterpolatedState(objectId: UUID, currentTime: number): InterpolableValue | null {
    const current = this.currentStates.get(objectId);
    if (!current) {
      return null;
    }

    const previous = this.previousStates.get(objectId);
    if (!previous) {
      return current;
    }

    const startTime = this.transitionStartTimes.get(objectId);
    if (!startTime) {
      return current;
    }

    // Calculate progress
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1.0);

    // Apply easing
    const easedProgress = easeInOutCubic(progress);

    // Interpolate based on value type
    return this.interpolateValue(previous, current, easedProgress);
  }

  /**
   * Interpolate between two values based on their type
   *
   * @param previous - Previous state value
   * @param current - Current state value
   * @param progress - Interpolation progress (0-1)
   * @returns Interpolated value
   */
  private interpolateValue(
    previous: InterpolableValue,
    current: InterpolableValue,
    progress: number
  ): InterpolableValue {
    // Boolean: No interpolation, switch at 50% progress
    if (typeof current === 'boolean') {
      return progress >= 0.5 ? current : previous;
    }

    // Number: Linear interpolation
    if (typeof current === 'number' && typeof previous === 'number') {
      return lerp(previous, current, progress);
    }

    // Object: Interpolate each numeric property
    if (typeof current === 'object' && typeof previous === 'object') {
      const result: { [key: string]: number } = {};
      for (const key in current) {
        if (typeof current[key] === 'number' && typeof previous[key] === 'number') {
          result[key] = lerp(previous[key] as number, current[key] as number, progress);
        } else {
          result[key] = current[key];
        }
      }
      return result;
    }

    // Fallback: Return current state
    return current;
  }

  /**
   * Set the transition duration for all interpolations
   *
   * @param durationMs - Transition duration in milliseconds
   * @throws {TypeError} If duration is negative or not a number
   */
  setTransitionDuration(durationMs: number): void {
    if (typeof durationMs !== 'number' || durationMs < 0) {
      throw new TypeError('Transition duration must be a non-negative number');
    }
    this.transitionDuration = durationMs;
  }

  /**
   * Clear all stored states for an object
   *
   * @param objectId - Unique identifier for the object
   */
  clearState(objectId: UUID): void {
    this.previousStates.delete(objectId);
    this.currentStates.delete(objectId);
    this.transitionStartTimes.delete(objectId);
  }

  /**
   * Clear all stored states
   */
  clearAll(): void {
    this.previousStates.clear();
    this.currentStates.clear();
    this.transitionStartTimes.clear();
  }
}
