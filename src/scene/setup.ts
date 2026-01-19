import { ComponentType } from 'simple-circuit-engine/core';
import {
  type IFactoryRegistry,
  BatteryVisualFactory,
  LabelVisualFactory,
  LightbulbVisualFactory,
  RectangleLEDVisualFactory,
  RelayVisualFactory,
  SmallLEDVisualFactory,
  SwitchVisualFactory,
  TransistorVisualFactory,
} from './shared/components';

/**
 * Register all basic component visual factories in the given registry
 * Basic components are : Battery, Lightbulb, RectangleLED, Relay, SmallLED, Switch, Transistor
 * @public
 * @param registry
 * @return the input factory registry for chaining
 */
export function registerBasicComponentsFactories(registry: IFactoryRegistry): IFactoryRegistry {
  registry
    .register(ComponentType.Battery, new BatteryVisualFactory())
    .register(ComponentType.Label, new LabelVisualFactory())
    .register(ComponentType.Lightbulb, new LightbulbVisualFactory())
    .register(ComponentType.RectangleLED, new RectangleLEDVisualFactory())
    .register(ComponentType.Relay, new RelayVisualFactory())
    .register(ComponentType.SmallLED, new SmallLEDVisualFactory())
    .register(ComponentType.Switch, new SwitchVisualFactory())
    .register(ComponentType.Transistor, new TransistorVisualFactory());

  return registry;
}
