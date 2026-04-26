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
  InverterBehavior,
  DoubleThrowSwitchBehavior,
  NandGateBehavior,
  Nand4GateBehavior,
  Nand8GateBehavior,
  NorGateBehavior,
  Nor4GateBehavior,
  Nor8GateBehavior,
  XorGateBehavior,
  Xor4GateBehavior,
  Xor8GateBehavior,
  ClockBehavior,
  HalfAdderBehavior,
  AdderBehavior,
  EightBitAdderBehavior,
  EightBitOnesComplementBehavior,
  OneInputBehavior,
  TwoInputBehavior,
  FourInputBehavior,
  EightInputBehavior,
  OneLightBehavior,
  TwoLightBehavior,
  FourLightBehavior,
  EightLightBehavior,
} from './simulation';

/**
 * Register all basic component behaviors in the given registry
 * Basic components are : Battery, Lightbulb, RectangleLED, Relay, SmallLED, Switch, double switch
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
    .register(new DoubleThrowSwitchBehavior())
    .register(new ClockBehavior());
  return registry;
}

/**
 * Register all gates component behaviors in the given registry
 * Gates components are : Inverter, NandGate (2,4,8), NorGate (2,4,8), XorGate (2,4,8)
 * @public
 * @param registry
 * @return the input behavior registry for chaining
 */
export function registerGatesComponentsBehaviors(registry: BehaviorRegistry): BehaviorRegistry {
  registry
    .register(new InverterBehavior())
    .register(new NandGateBehavior())
    .register(new Nand4GateBehavior())
    .register(new Nand8GateBehavior())
    .register(new NorGateBehavior())
    .register(new Nor4GateBehavior())
    .register(new Nor8GateBehavior())
    .register(new XorGateBehavior())
    .register(new Xor4GateBehavior())
    .register(new Xor8GateBehavior());
  return registry;
}

/**
 * Register all arithmetic component behaviors in the given registry
 * Arithmetic components are : HalfAdder, Adder, 8bit adder, 8bit one's complement
 * @public
 * @param registry
 * @return the input behavior registry for chaining
 */
export function registerArithmeticComponentsBehaviors(
  registry: BehaviorRegistry
): BehaviorRegistry {
  registry
      .register(new HalfAdderBehavior())
      .register(new AdderBehavior())
      .register(new EightBitAdderBehavior())
      .register(new EightBitOnesComplementBehavior());
  return registry;
}

/**
 * Register all interface component behaviors in the given registry.
 * Interface components are:
 *  - inputs: OneInput, TwoInput, FourInput, EightInput
 *  - lights: OneLight, TwoLight, FourLight, EightLight
 * @public
 * @param registry
 * @return the input behavior registry for chaining
 */
export function registerInterfaceComponentsBehaviors(
  registry: BehaviorRegistry
): BehaviorRegistry {
  registry
    .register(new OneInputBehavior())
    .register(new TwoInputBehavior())
    .register(new FourInputBehavior())
    .register(new EightInputBehavior())
    .register(new OneLightBehavior())
    .register(new TwoLightBehavior())
    .register(new FourLightBehavior())
    .register(new EightLightBehavior());
  return registry;
}
