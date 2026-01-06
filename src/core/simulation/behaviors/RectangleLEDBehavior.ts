import { SmallLEDBehavior } from '@/core/simulation/behaviors/SmallLEDBehavior';
import { ComponentType } from '@/core/types/ComponentType';
import type { Component } from '@/core/Component';
import { ComponentState } from '@/core/simulation';
import { RectangleLEDState } from '@/core/simulation/states/RectangleLEDState';

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
