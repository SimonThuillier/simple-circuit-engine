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
  TransistorBehavior,
  BufferBehavior,
  AndGateBehavior,
  And4GateBehavior,
  And8GateBehavior,
  OrGateBehavior,
  Or4GateBehavior,
  Or8GateBehavior,
  XorGateBehavior,
} from './simulation/behaviors';

/**
 * Register all basic component behaviors in the given registry
 * Basic components are : Battery, Lightbulb, RectangleLED, Relay, SmallLED, Switch, Transistor, Buffer
 * @public
 * @param registry
 * @return the input behavior registry for chaining
 */
export function registerBasicComponentsBehaviors(registry: BehaviorRegistry): BehaviorRegistry {
  registry
    .register(new BatteryBehavior())
    .register(new LightbulbBehavior())
    .register(new RectangleLEDBehavior())
    .register(new RelayBehavior())
    .register(new SmallLEDBehavior())
    .register(new SwitchBehavior())
    .register(new TransistorBehavior())
    .register(new BufferBehavior());
  return registry;
}

/**
 * Register all gates component behaviors in the given registry
 * Gates components are : AndGate (2,4,8), OrGate (2,4,8), XorGate
 * @public
 * @param registry
 * @return the input behavior registry for chaining
 */
export function registerGatesComponentsBehaviors(registry: BehaviorRegistry): BehaviorRegistry {
  registry
    .register(new AndGateBehavior())
    .register(new And4GateBehavior())
    .register(new And8GateBehavior())
    .register(new OrGateBehavior())
    .register(new Or4GateBehavior())
    .register(new Or8GateBehavior())
    .register(new XorGateBehavior());
  return registry;
}
