/**
 * Battery component behavior implementation
 * @module core/simulation/behaviors
 */

import type { ComponentBehavior, BehaviorContext, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import { BatteryState } from '../states/BatteryState.js';
import type { ComponentState } from '../states/ComponentState.js';

/**
 * Behavior implementation for Battery components.
 * Batteries are always-on voltage sources that provide voltage to their positive pin.
 *
 * Pin configuration:
 * - Pin 0 (index 0): Positive terminal (outputs voltage)
 * - Pin 1 (index 1): Negative terminal (ground reference)
 *
 * @public
 */
export class BatteryBehavior implements ComponentBehavior {
  readonly componentType = 'battery';

  /**
   * Evaluate battery behavior.
   * Batteries always output voltage on the positive pin.
   *
   * @param component - The battery component
   * @param _context - Simulation context (unused for batteries)
   * @returns Result with positive pin set to hasVoltage=true
   */
  evaluate(component: Component, _context: BehaviorContext): BehaviorResult {
    // Battery is always on, providing voltage to positive pin
    const outputPinStates = new Map();

    if (component.pins.length >= 2) {
      const positivePin = component.pins[0]; // First pin is positive
      outputPinStates.set(positivePin.id, {
        hasVoltage: true,
        hasCurrent: false // Current determined by circuit topology
      });
    }

    return {
      componentState: null, // Battery state never changes
      outputPinStates,
      scheduledEvents: []
    };
  }

  /**
   * Create initial state for a battery.
   *
   * @param component - The battery component
   * @returns Initial battery state (always "on")
   */
  createInitialState(component: Component): ComponentState {
    // Extract voltage from component config if available
    const voltage = component.config.voltage
      ? Number(component.config.voltage)
      : 9;

    return new BatteryState(component.id, voltage);
  }
}
