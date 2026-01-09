/**
 * RectangleLED component behavior implementation (just an extension of SmallLEDBehavior)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../Component.js';
import type { ComponentState } from '../states/ComponentState.js';
import { ComponentType } from '../../types/ComponentType.js';
import { SmallLEDBehavior } from './SmallLEDBehavior.js';
import { RectangleLEDState } from '../states/RectangleLEDState';

export class RectangleLEDBehavior extends SmallLEDBehavior {
  override readonly componentType = ComponentType.RectangleLED;

  /**
   * Create initial state for a RectangleLED.
   *
   * @param component - The smallLED component
   * @returns LED Initial state (always active and delivering voltage)
   */
  override createInitialState(component: Component): ComponentState {
    if (component.type !== ComponentType.RectangleLED) {
      throw new Error(`Invalid component type for RectangleLEDBehavior: ${component.type}`);
    }
    return new RectangleLEDState(component.id);
  }
}
