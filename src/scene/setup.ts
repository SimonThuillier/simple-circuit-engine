import { ComponentType } from 'simple-circuit-engine/core';
import {
  type IGroupedFactoryRegistry,
  BatteryVisualFactory,
  LabelVisualFactory,
  LightbulbVisualFactory,
  RectangleLEDVisualFactory,
  RelayVisualFactory,
  SmallLEDVisualFactory,
  SwitchVisualFactory,
  TransistorVisualFactory,
  BufferVisualFactory,
  AndGateVisualFactory,
  And4GateVisualFactory,
  And8GateVisualFactory,
  OrGateVisualFactory,
  Or4GateVisualFactory,
  Or8GateVisualFactory,
  XorGateVisualFactory,
} from './shared/components';

/**
 * Register all basic components visual factories in the basic group
 * Basic components are : Battery, Label, Switch, Lightbulb, RectangleLED, Relay, SmallLED, Transistor
 * @public
 * @param registry - A grouped factory registry to populate
 * @returns The input registry for chaining
 */
export function registerBasicComponentsFactories(
  registry: IGroupedFactoryRegistry
): IGroupedFactoryRegistry {
  return registry.addGroup('basic', 'Basic Components', (group) =>
    group
      .add(ComponentType.Battery, new BatteryVisualFactory())
      .add(ComponentType.Label, new LabelVisualFactory())
      .add(ComponentType.Switch, new SwitchVisualFactory())
      .add(ComponentType.Lightbulb, new LightbulbVisualFactory())
      .add(ComponentType.RectangleLED, new RectangleLEDVisualFactory())
      .add(ComponentType.Relay, new RelayVisualFactory())
      .add(ComponentType.SmallLED, new SmallLEDVisualFactory())
      .add(ComponentType.Transistor, new TransistorVisualFactory())
      .add(ComponentType.Buffer, new BufferVisualFactory())
  );
}

/**
 * Register all logic gates components visual factories in the gates group
 * gates are : AND (2,4,8,16 inputs), OR (2,4,8,16 inputs) and XOR
 * NAND and NOR are gotten by changing the activationLogic of AND and OR
 * @public
 * @param registry - A grouped factory registry to populate
 * @returns The input registry for chaining
 */
export function registerGatesComponentsFactories(
  registry: IGroupedFactoryRegistry
): IGroupedFactoryRegistry {
  return registry.addGroup('gates', 'Logic Gates', (group) =>
    group
      .add(ComponentType.AndGate, new AndGateVisualFactory())
      .add(ComponentType.And4Gate, new And4GateVisualFactory())
      .add(ComponentType.And8Gate, new And8GateVisualFactory())
      .add(ComponentType.OrGate, new OrGateVisualFactory())
      .add(ComponentType.Or4Gate, new Or4GateVisualFactory())
      .add(ComponentType.Or8Gate, new Or8GateVisualFactory())
      .add(ComponentType.XorGate, new XorGateVisualFactory())
  );
}
