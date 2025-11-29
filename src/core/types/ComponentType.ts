/**
 * Component Type Definitions
 *
 * Defines the available component types with their metadata including
 * unique identifiers, display names, and pin counts.
 *
 * @module core/types/ComponentType
 */

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
 * console.log(metadata.pins);  // ["cathode", "anode"]
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
}

/**
 * Metadata for a component type.
 *
 * @property id - Unique string identifier matching the enum value
 * @property name - Human-readable display name
 * @property pins - Array of pin labels (order-significant)
 * @property extraArgs - Default configuration parameters (e.g., initialState, activationLogic, color...)
 */
export interface ComponentTypeMetadata {
  readonly id: string;
  readonly name: string;
  readonly pins: string[];
  readonly extraArgs: Map<string, string>;
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
 * //   extraArgs: Map { 'voltage' => '9', 'unit' => 'V' }
 * // }
 *
 * // Access default configuration
 * const voltage = metadata.extraArgs.get('voltage'); // '9'
 * ```
 */
export const COMPONENT_TYPE_METADATA: Readonly<Record<ComponentType, ComponentTypeMetadata>> = {
  [ComponentType.Switch]: {
    id: ComponentType.Switch,
    name: 'Switch',
    pins: ['input', 'output'],
    extraArgs: new Map([['initialState', 'open']]),
  },
  [ComponentType.Battery]: {
    id: ComponentType.Battery,
    name: 'Battery',
    pins: ['cathode', 'anode'],
    extraArgs: new Map([]),
  },
  [ComponentType.Lightbulb]: {
    id: ComponentType.Lightbulb,
    name: 'Lightbulb',
    pins: ['pin1', 'pin2'],
    extraArgs: new Map([]),
  },
  [ComponentType.Relay]: {
    id: ComponentType.Relay,
    name: 'Relay',
    pins: ['cmd_in', 'cmd_out', 'power_in', 'power_out'],
    extraArgs: new Map([['activationLogic', 'positive']]),
  },
  [ComponentType.Transistor]: {
    id: ComponentType.Transistor,
    name: 'Transistor',
    pins: ['collector', 'base', 'emitter'],
    extraArgs: new Map([['activationLogic', 'positive']]),
  },
  [ComponentType.SmallLED]: {
    id: ComponentType.SmallLED,
    name: 'SmallLED',
    pins: ['anode', 'cathode'],
    extraArgs: new Map([
      ['mode', 'symmetric'],
      ['activeColor', 'red'],
      ['idleColor', 'black'],
    ]),
  },
  [ComponentType.RectangleLED]: {
    id: ComponentType.RectangleLED,
    name: 'RectangleLED',
    pins: ['anode', 'cathode'],
    extraArgs: new Map([
      ['mode', 'symmetric'],
      ['activeColor', 'red'],
      ['idleColor', 'black'],
    ]),
  },
  [ComponentType.Cube]: {
    id: ComponentType.Cube,
    name: 'Cube',
    pins: [],
    extraArgs: new Map([['color', 'red']]),
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
