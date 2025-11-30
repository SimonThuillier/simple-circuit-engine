/**
 * Component Class
 *
 * Base class for electrical components in the circuit.
 * Components have a position, rotation, and collection of pin ENodes.
 *
 * @module core/Component
 */

import type { UUID } from './types/Identifier.js';
import { generateUUID } from './types/Identifier.js';
import { Position } from './types/Position.js';
import { Rotation } from './types/Rotation.js';
import { COMPONENT_TYPE_METADATA, type ComponentType } from './types/ComponentType.js';

/**
 * Electrical component placed on the circuit grid.
 *
 * Components represent physical circuit elements (lightbulbs, transistors, etc.)
 * with a specific position, orientation, and set of electrical connection pins.
 *
 * **Lifecycle**: Components are created and removed via the Circuit class.
 * When a component is added to a circuit, pin ENodes are automatically created
 * for each pin. When removed, pins and connected wires are cascade-deleted.
 *
 * @example
 * ```typescript
 * const position = new Position(10, 20);
 * const rotation = new Rotation(90);
 * const pins = ['pin-uuid-1', 'pin-uuid-2'];
 *
 * const component = new Component(position, rotation, pins);
 *
 * console.log(component.id);        // "550e8400-..."
 * console.log(component.position);  // Position { x: 10, y: 20 }
 * console.log(component.rotation);  // Rotation { angle: 90 }
 * console.log(component.pins);      // ['pin-uuid-1', 'pin-uuid-2']
 * ```
 */
export class Component {
  /**
   * Unique identifier for this component.
   * @readonly
   */
  public readonly id: UUID;

  /**
   * Component type (Battery, Switch, LED, etc.).
   * @readonly
   */
  public readonly type: ComponentType;

  /**
   * Position on the 2D discrete grid.
   * @readonly
   */
  public readonly position: Position;

  /**
   * Orientation angle in degrees.
   * @readonly
   */
  public readonly rotation: Rotation;

  /**
   * Array of pin ENode UUIDs.
   * Pin order is significant (index 0 is first pin, etc.).
   * @readonly
   */
  public readonly pins: ReadonlyArray<UUID>;

  /**
   * Configuration parameters for this component instance.
   *
   * This map holds key-value pairs representing configurable settings
   * The available configuration keys depend on the component type see ComponentTypeMetadata for details.
   *
   */
  public config: Map<string, string>;

  /**
   * Create a new component.
   *
   * **Note**: Typically components are created via `Circuit.addComponent()`
   * which handles pin ENode creation automatically. This constructor is used
   * internally by Circuit.
   *
   * @param type - Component type (Battery, Switch, LED, etc.)
   * @param position - Grid position (integer x, y)
   * @param rotation - Orientation angle (integer degrees)
   * @param pins - Array of pin ENode UUIDs
   *
   * @example
   * ```typescript
   * // Usually created via Circuit:
   * const component = circuit.addComponent(
   *   new Position(10, 20),
   *   new Rotation(90),
   *   ComponentType.Battery
   * );
   *
   * // Direct construction (for deserialization):
   * const component = new Component(
   *   ComponentType.Battery,
   *   new Position(10, 20),
   *   new Rotation(90),
   *   ['pin-id-1', 'pin-id-2']
   * );
   * ```
   */
  constructor(
    type: ComponentType,
    position: Position,
    rotation: Rotation,
    pins: ReadonlyArray<UUID>
  ) {
    this.id = generateUUID();
    this.type = type;
    this.position = position;
    this.rotation = rotation;

    // add a check on the unicity of pins
    if (new Set(pins).size !== pins.length) {
      const duplicates = pins.filter((item, index) => pins.indexOf(item) !== index);
      throw new Error(
        `Duplicate pin names are not allowed: ${[...new Set(duplicates)].join(', ')}`
      );
    }

    this.pins = pins;
    // instanciate component config from metadata's default config
    this.config = new Map<string, string>(COMPONENT_TYPE_METADATA[type].config);
  }

  /**
   * Serialize component to JSON.
   *
   * @returns Plain object representation
   *
   * @example
   * ```typescript
   * const json = component.toJSON();
   * console.log(json);
   * // {
   * //   id: "550e8400-...",
   * //   type: "battery",
   * //   position: { x: 10, y: 20 },
   * //   rotation: 90,
   * //   pins: ['pin-uuid-1', 'pin-uuid-2']
   * // }
   * ```
   */
  toJSON(): {
    id: UUID;
    type: ComponentType;
    position: { x: number; y: number };
    rotation: number;
    pins: UUID[];
    config: { [key: string]: string };
  } {
    return {
      id: this.id,
      type: this.type,
      position: this.position.toJSON(),
      rotation: this.rotation.toJSON(),
      pins: [...this.pins],
      config: Object.fromEntries(this.config),
    };
  }

  /**
   * Deserialize component from JSON.
   *
   * @param json - Component data
   * @returns Component instance
   *
   * @example
   * ```typescript
   * const json = {
   *   id: "550e8400-...",
   *   type: "battery",
   *   position: { x: 10, y: 20 },
   *   rotation: 90,
   *   pins: ['1b4f6f3c-ce ....', '2c5e7g4d-df ...'],
   *   config: { "voltage": "5V" }
   * };
   *
   * const component = Component.fromJSON(json);
   * console.log(component.position.x); // 10
   * ```
   */
  static fromJSON(json: {
    id: UUID;
    type: ComponentType;
    position: { x: number; y: number };
    rotation: number;
    pins: UUID[];
    config: { [key: string]: string };
  }): Component {
    // Create temporary component to get position/rotation instances
    const component = new Component(
      json.type,
      Position.fromJSON(json.position),
      Rotation.fromJSON(json.rotation),
      json.pins
    );
    component.config = new Map<string, string>(Object.entries(json.config));

    // Override the generated ID with the one from JSON
    // Using Object.defineProperty to bypass readonly
    Object.defineProperty(component, 'id', {
      value: json.id,
      writable: false,
      enumerable: true,
      configurable: false,
    });

    return component;
  }
}
