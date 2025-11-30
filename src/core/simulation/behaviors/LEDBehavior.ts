/**
 * LED component behavior implementation
 * @module core/simulation/behaviors
 */

import type { ComponentBehavior, BehaviorContext, BehaviorResult } from './ComponentBehavior.js';
import type { Component } from '@/core/Component.js';
import { LEDState } from '../states/LEDState.js';
import type { ComponentState } from '../states/ComponentState.js';
import type { NodeElectricalState } from '../states/NodeElectricalState.js';

/**
 * Behavior implementation for LED components.
 * LEDs turn on when voltage is applied to the anode and current can flow to cathode.
 *
 * Pin configuration:
 * - Pin 0 (index 0): Anode (positive, input)
 * - Pin 1 (index 1): Cathode (negative, output to ground)
 *
 * @public
 */
export class LEDBehavior implements ComponentBehavior {
  readonly componentType: string;

  /**
   * Create LED behavior for a specific LED component type.
   *
   * @param componentType - LED type ('smallLED' or 'rectangleLED'), defaults to 'smallLED'
   */
  constructor(componentType: string = 'smallLED') {
    this.componentType = componentType;
  }

  /**
   * Evaluate LED behavior based on input voltage.
   * LED turns on if anode has voltage and can complete circuit to ground.
   *
   * @param component - The LED component
   * @param context - Simulation context (to read input pin states)
   * @returns Result with updated LED state and output pin states
   */
  evaluate(component: Component, context: BehaviorContext): BehaviorResult {
    if (component.pins.length < 2) {
      // Invalid LED configuration
      return {
        componentState: null,
        outputPinStates: new Map(),
        scheduledEvents: []
      };
    }

    const anodePin = component.pins[0];
    const cathodePin = component.pins[1];

    // Get current electrical state of anode
    const anodeState: NodeElectricalState = context.state.nodeStates.get(anodePin.id) || {
      hasVoltage: false,
      hasCurrent: false
    };

    // LED is on if anode has voltage
    const ledShouldBeOn = anodeState.hasVoltage;

    // Get current component state
    const currentState = context.state.componentStates.get(component.id) as LEDState | undefined;
    const currentLedState = currentState?.state || 'off';

    // Determine if state changed
    const newLedState = ledShouldBeOn ? 'on' : 'off';
    const stateChanged = newLedState !== currentLedState;

    // Create new component state if changed
    let componentState: ComponentState | null = null;
    if (stateChanged && currentState) {
      const newState = new LEDState(component.id, currentState.color, newLedState);
      componentState = newState;
    }

    // Set cathode pin state (passes current to ground when LED is on)
    const outputPinStates = new Map();
    outputPinStates.set(cathodePin.id, {
      hasVoltage: false, // Cathode connects to ground
      hasCurrent: ledShouldBeOn // Current flows when LED is on
    });

    return {
      componentState,
      outputPinStates,
      scheduledEvents: []
    };
  }

  /**
   * Create initial state for an LED.
   *
   * @param component - The LED component
   * @returns Initial LED state (off by default)
   */
  createInitialState(component: Component): ComponentState {
    // Extract color from component config if available
    const color = component.config.color
      ? String(component.config.color)
      : 'red';

    return new LEDState(component.id, color, 'off');
  }
}
