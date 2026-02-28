/**
 * RectangleLED component behavior implementation (just an extension of SmallLEDBehavior)
 * @module core/simulation/behaviors
 */

import type { Component } from '../../../Component';
import type { ComponentState } from '../../states/ComponentState';
import { ComponentType } from '../../../types/ComponentType';
import { SmallLEDBehavior } from './SmallLEDBehavior';
import { RectangleLEDState } from '../../states/basic/RectangleLEDState';

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
