/**
 * Component Type Definitions
 *
 * Defines the available component types with their metadata including
 * unique identifiers, display names, and pin counts.
 *
 * @module core/types/ComponentType
 */

import { ENodeSourceType } from '@/core/types/ENodeSourceType';

/**
 * Enumeration of available component types.
 *
 * Each component type represents a specific electrical element that can be
 * placed in a circuit (battery, LED, transistor, etc.).
 *
 * @example
 * ```typescript
 * const type = ComponentType.Battery;
 * const metadata = COMPONENT_TYPE_METADATA[type];
 * console.log(metadata.name);      // "Battery"
 * console.log(metadata.pins);  // Map([["cathode", ENodeSourceType.Voltage], ["anode", ENodeSourceType.Current]])
 * ```
 */
export enum ComponentType {
  Battery = 'battery',
  Switch = 'switch',
  Lightbulb = 'lightbulb',
  Relay = 'relay',
  Transistor = 'transistor',
  SmallLED = 'smallLED',
  RectangleLED = 'rectangleLED',
  Cube = 'cube', // no pins component for testing purposes mainly
  Label = 'label', // decorative text label with no pins
}

/**
 * Metadata for a component type.
 *
 * @property id - Unique string identifier matching the enum value
 * @property name - Human-readable display name
 * @property pins - Array of pin labels (order-significant)
 * @property config - Default configuration parameters (depends on the component, e.g., initialState, activationLogic, color...)
 */
export interface ComponentTypeMetadata {
  readonly id: string;
  readonly name: string;
  readonly pins: Map<string, ENodeSourceType | undefined>;
  readonly config: Map<string, string>;
}

/**
 * Component type metadata lookup table.
 *
 * Maps each ComponentType enum value to its associated metadata
 * (id, display name, pins, and default configuration arguments).
 *
 * @example
 * ```typescript
 * const metadata = COMPONENT_TYPE_METADATA[ComponentType.Battery];
 * console.log(metadata);
 * // {
 * //   id: 'battery',
 * //   name: 'Battery',
 * //   pins: ['cathode', 'anode'],
 * //   config: Map { 'voltage' => '9', 'unit' => 'V' }
 * // }
 *
 * // Access component type default configuration
 * const voltage = metadata.config.get('voltage'); // '9'
 * ```
 */
export const COMPONENT_TYPE_METADATA: Readonly<Record<ComponentType, ComponentTypeMetadata>> = {
  [ComponentType.Switch]: {
    id: ComponentType.Switch,
    name: 'Switch',
    pins: new Map([
      ['input', undefined],
      ['output', undefined],
    ]),
    config: new Map([
        ['initialState', 'open'],
        ['size', '1']
    ]),
  },
  [ComponentType.Battery]: {
    id: ComponentType.Battery,
    name: 'Battery',
    pins: new Map([
      ['cathode', ENodeSourceType.Voltage],
      ['anode', ENodeSourceType.Current],
    ]),
    config: new Map([]),
  },
  [ComponentType.Lightbulb]: {
    id: ComponentType.Lightbulb,
    name: 'Lightbulb',
    pins: new Map([
      ['pin1', undefined],
      ['pin2', undefined],
    ]),
    config: new Map([
      ['size', '1']
    ]),
  },
  [ComponentType.Relay]: {
    id: ComponentType.Relay,
    name: 'Relay',
    pins: new Map([
      ['cmd_in', undefined],
      ['cmd_out', undefined],
      ['power_in', undefined],
      ['power_out', undefined],
    ]),
    config: new Map([
        ['activationLogic', 'positive'],
        ['initializationPriority', '']
    ]),
  },
  [ComponentType.Transistor]: {
    id: ComponentType.Transistor,
    name: 'Transistor',
    pins: new Map([
      ['collector', undefined],
      ['base', undefined],
      ['emitter', undefined],
    ]),
    config: new Map([
        ['activationLogic', 'positive'],
        ['initializationPriority', '']
    ]),
  },
  [ComponentType.SmallLED]: {
    id: ComponentType.SmallLED,
    name: 'SmallLED',
    pins: new Map([
      ['cathode', undefined],
      ['anode', undefined],
    ]),
    config: new Map([
      ['mode', 'symmetric'],
      ['activeColor', 'red'],
      ['idleColor', 'black'],
      ['size', '1']
    ]),
  },
  [ComponentType.RectangleLED]: {
    id: ComponentType.RectangleLED,
    name: 'RectangleLED',
    pins: new Map([
      ['cathode', undefined],
      ['anode', undefined],
    ]),
    config: new Map([
      ['mode', 'symmetric'],
      ['activeColor', 'red'],
      ['idleColor', 'black'],
      ['size', '1']
    ]),
  },
  [ComponentType.Cube]: {
    id: ComponentType.Cube,
    name: 'Cube',
    pins: new Map([]),
    config: new Map([['color', 'red']]),
  },
  [ComponentType.Label]: {
    id: ComponentType.Label,
    name: 'Label',
    pins: new Map([]),
    config: new Map([
      ['text', 'Label'],
      ['size', '1'],
    ]),
  },
};

/**
 * Get all available component types.
 *
 * @returns Array of all ComponentType enum values
 *
 * @example
 * ```typescript
 * const types = getAllComponentTypes();
 * console.log(types); // [ComponentType.Resistor, ComponentType.Capacitor, ...]
 * ```
 */
export function getAllComponentTypes(): ComponentType[] {
  return Object.values(ComponentType);
}

/**
 * Get metadata for a specific component type.
 *
 * @param type - The component type
 * @returns Component metadata (id, name, pinCount)
 *
 * @example
 * ```typescript
 * const metadata = getComponentTypeMetadata(ComponentType.Transistor);
 * console.log(metadata.pinCount); // 3
 * ```
 */
export function getComponentTypeMetadata(type: ComponentType): ComponentTypeMetadata {
  return COMPONENT_TYPE_METADATA[type];
}
