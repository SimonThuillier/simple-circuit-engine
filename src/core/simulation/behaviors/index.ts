/**
 * Component behavior implementations
 * @module core/simulation/behaviors
 */

export type { ComponentBehavior, BehaviorResult } from './ComponentBehavior.js';
export { BehaviorRegistry } from './BehaviorRegistry.js';

// Components

// basic
export { BatteryBehavior } from './basic/BatteryBehavior';
export { LightbulbBehavior } from './basic/LightbulbBehavior';
export { RectangleLEDBehavior } from './basic/RectangleLEDBehavior';
export { RelayBehavior } from './basic/RelayBehavior';
export { SmallLEDBehavior } from './basic/SmallLEDBehavior';
export { SwitchBehavior } from './basic/SwitchBehavior';
export { TransistorBehavior } from './basic/TransistorBehavior';
export { BufferBehavior } from './basic/BufferBehavior';

// gates
export { AndGateBehavior } from './gates/AndGateBehavior';
export { And4GateBehavior } from './gates/And4GateBehavior';
export { And8GateBehavior } from './gates/And8GateBehavior';
export { OrGateBehavior } from './gates/OrGateBehavior';
export { Or4GateBehavior } from './gates/Or4GateBehavior';
export { Or8GateBehavior } from './gates/Or8GateBehavior';
export { XorGateBehavior } from './gates/XorGateBehavior';
