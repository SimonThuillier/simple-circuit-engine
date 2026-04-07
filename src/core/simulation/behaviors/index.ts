/**
 * Component behavior implementations
 * @module core/simulation/behaviors
 */

export type { IComponentBehavior, IBehaviorResult } from './types';

export { BehaviorRegistry } from './BehaviorRegistry.js';

// Components
// basic
export { BatteryBehavior } from './basic/BatteryBehavior';
export { LightbulbBehavior } from './basic/LightbulbBehavior';
export { RectangleLEDBehavior } from './basic/RectangleLEDBehavior';
export { RelayBehavior } from './basic/RelayBehavior';
export { SmallLEDBehavior } from './basic/SmallLEDBehavior';
export { SwitchBehavior } from './basic/SwitchBehavior';
export { DoubleThrowSwitchBehavior } from './basic/DoubleThrowSwitchBehavior';
export { ClockBehavior } from './basic/ClockBehavior';

// gates
export { InverterBehavior } from './gates/InverterBehavior';
export { NandGateBehavior } from './gates/NandGateBehavior';
export { Nand4GateBehavior } from './gates/Nand4GateBehavior';
export { Nand8GateBehavior } from './gates/Nand8GateBehavior';
export { NorGateBehavior } from './gates/NorGateBehavior';
export { Nor4GateBehavior } from './gates/Nor4GateBehavior';
export { Nor8GateBehavior } from './gates/Nor8GateBehavior';
export { XorGateBehavior } from './gates/XorGateBehavior';
export { Xor4GateBehavior } from './gates/Xor4GateBehavior';
export { Xor8GateBehavior } from './gates/Xor8GateBehavior';
