import {ComponentType} from 'simple-circuit-engine/core';
import {
  AdderVisualFactory,
  BatteryVisualFactory,
  ClockVisualFactory,
  DoubleThrowSwitchVisualFactory,
  EightBitAdderVisualFactory, EightBitOnesComplementVisualFactory,
  HalfAdderVisualFactory,
  type IGroupedFactoryRegistry,
  InverterVisualFactory,
  LabelVisualFactory,
  LightbulbVisualFactory,
  Nand4GateVisualFactory,
  Nand8GateVisualFactory,
  NandGateVisualFactory,
  Nor4GateVisualFactory,
  Nor8GateVisualFactory,
  NorGateVisualFactory,
  RectangleLEDVisualFactory,
  RelayVisualFactory,
  SmallLEDVisualFactory,
  SwitchVisualFactory,
  Xor4GateVisualFactory,
  Xor8GateVisualFactory,
  XorGateVisualFactory,
} from './shared/components';

/**
 * Register all basic components visual factories in the basic group
 * Basic components are : Battery, Clock, Label, Switches, Lightbulb, RectangleLED, Relay, SmallLED
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
      .add(ComponentType.Clock, new ClockVisualFactory())
      .add(ComponentType.Label, new LabelVisualFactory())
      .add(ComponentType.Switch, new SwitchVisualFactory())
      .add(ComponentType.DoubleThrowSwitch, new DoubleThrowSwitchVisualFactory())
      .add(ComponentType.Lightbulb, new LightbulbVisualFactory())
      .add(ComponentType.RectangleLED, new RectangleLEDVisualFactory())
      .add(ComponentType.Relay, new RelayVisualFactory())
      .add(ComponentType.SmallLED, new SmallLEDVisualFactory())
  );
}

/**
 * Register all logic gates components visual factories in the gates group
 * gates are : Inverter, NAND (2,4,8 inputs), NOR (2,4,8 inputs) and XOR (2,4,8 inputs)
 * AND/OR are gotten by changing the activationLogic of NAND/NOR
 * @public
 * @param registry - A grouped factory registry to populate
 * @returns The input registry for chaining
 */
export function registerGatesComponentsFactories(
  registry: IGroupedFactoryRegistry
): IGroupedFactoryRegistry {
  return registry.addGroup('gates', 'Logic Gates', (group) =>
    group
      .add(ComponentType.Inverter, new InverterVisualFactory())
      .add(ComponentType.NandGate, new NandGateVisualFactory())
      .add(ComponentType.Nand4Gate, new Nand4GateVisualFactory())
      .add(ComponentType.Nand8Gate, new Nand8GateVisualFactory())
      .add(ComponentType.NorGate, new NorGateVisualFactory())
      .add(ComponentType.Nor4Gate, new Nor4GateVisualFactory())
      .add(ComponentType.Nor8Gate, new Nor8GateVisualFactory())
      .add(ComponentType.XorGate, new XorGateVisualFactory())
      .add(ComponentType.Xor4Gate, new Xor4GateVisualFactory())
      .add(ComponentType.Xor8Gate, new Xor8GateVisualFactory())
  );
}

/**
 * Register all arithmetic components visual factories in the arithmetic group
 * Arithmetic components are : HalfAdder
 * @public
 * @param registry - A grouped factory registry to populate
 * @returns The input registry for chaining
 */
export function registerArithmeticComponentsFactories(
  registry: IGroupedFactoryRegistry
): IGroupedFactoryRegistry {
  return registry.addGroup('arithmetic', 'Arithmetic', (group) =>
    group
        .add(ComponentType.HalfAdder, new HalfAdderVisualFactory())
        .add(ComponentType.Adder, new AdderVisualFactory())
        .add(ComponentType.EightBitAdder, new EightBitAdderVisualFactory())
        .add(ComponentType.EightBitOnesComplement, new EightBitOnesComplementVisualFactory())
  );
}
