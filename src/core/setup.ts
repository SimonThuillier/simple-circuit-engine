/**
 * Core setup helper methods
 * @module core/setup
 */

import {
    BehaviorRegistry,
    BatteryBehavior,
    LightbulbBehavior,
    RectangleLEDBehavior,
    RelayBehavior,
    SmallLEDBehavior,
    SwitchBehavior,
    TransistorBehavior
} from './simulation/behaviors';

/**
 * Register all basic component behaviors in the given registry
 * Basic components are : Battery, Lightbulb, RectangleLED, Relay, SmallLED, Switch, Transistor
 * @public
 * @param registry
 */
export function registerBasicComponentsBehaviors (registry: BehaviorRegistry): void {
    registry
        .register(new BatteryBehavior())
        .register(new LightbulbBehavior())
        .register(new RectangleLEDBehavior())
        .register(new RelayBehavior())
        .register(new SmallLEDBehavior())
        .register(new SwitchBehavior())
        .register(new TransistorBehavior());
}