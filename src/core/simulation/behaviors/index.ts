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

// arithmetic
export { HalfAdderBehavior } from './arithmetic/HalfAdderBehavior';
export { AdderBehavior } from './arithmetic/AdderBehavior';
export { EightBitAdderBehavior } from './arithmetic/EightBitAdderBehavior';
export { EightBitOnesComplementBehavior } from './arithmetic/EightBitOnesComplementBehavior';

// interface
export { InputBehaviorMixin } from './interface/InputBehaviorMixin';
export { OneInputBehavior } from './interface/OneInputBehavior';
export { TwoInputBehavior } from './interface/TwoInputBehavior';
export { FourInputBehavior } from './interface/FourInputBehavior';
export { EightInputBehavior } from './interface/EightInputBehavior';
export { LightBehaviorMixin } from './interface/LightBehaviorMixin';
export { OneLightBehavior } from './interface/OneLightBehavior';
export { TwoLightBehavior } from './interface/TwoLightBehavior';
export { FourLightBehavior } from './interface/FourLightBehavior';
export { EightLightBehavior } from './interface/EightLightBehavior';
