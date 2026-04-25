/**
 * Component Class
 *
 * Base class for electrical components in the circuit.
 * Components have a position, rotation, and collection of pin ENodes.
 *
 * @module core/topology
 */
import type { UUID } from '../utils';
import { generateUUID, Position, Rotation } from '../utils';
import {
  COMPONENT_TYPE_METADATA,
  ComponentType,
  type IComponent,
  type IPinMetadata
} from './types';

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
   * The available configuration keys depend on the component type see IComponentTypeMetadata for details.
   *
   */
  public config: Map<string, string>;

  /**
   * allow to flag a component as non editable (feature to implement)
   */
  public editable: boolean;

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
   * @param editable
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
    pins: ReadonlyArray<UUID>,
    editable: boolean = true
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
    this.editable = editable;
  }

  getPinLabel(pinId: UUID): string | undefined {
    const pinIndex = this.pins.indexOf(pinId);
    if (pinIndex === -1) {
      return undefined;
    }
    //console.log(pinIndex);
    const pinLabels = COMPONENT_TYPE_METADATA[this.type].pins.keys();
    //console.log(pinLabels);
    // convert to array to access by index
    return Array.from(pinLabels)[pinIndex] || undefined;
  }

  getPinMetadata(pinId: UUID): IPinMetadata | undefined {
    const pinLabel = this.getPinLabel(pinId);
    if (!pinLabel) return undefined;
    return COMPONENT_TYPE_METADATA[this.type].pins.get(pinLabel);
  }

  /** Resolve the ENode UUID of the logic pin at `index` within `interfaceName`, or undefined. */
  getPinIdByInterface(interfaceName: string, index: number): UUID | undefined {
    let position = 0;
    for (const pinMeta of COMPONENT_TYPE_METADATA[this.type].pins.values()) {
      const logicData = pinMeta.logicPinData;
      if (logicData && logicData.interface === interfaceName && logicData.index === index) {
        return this.pins[position];
      }
      position++;
    }
    return undefined;
  }

  /** Largest index found across pins of the given logic interface, or -1 if none. */
  getInterfaceMaxIndex(interfaceName: string): number {
    let max = -1;
    for (const pinMeta of COMPONENT_TYPE_METADATA[this.type].pins.values()) {
      const logicData = pinMeta.logicPinData;
      if (logicData?.interface === interfaceName && logicData.index > max) {
        max = logicData.index;
      }
    }
    return max;
  }

  setAllParameters(config: Map<string, string>): void {
    this.config = new Map<string, string>(config);
  }

  setParameter(key: string, value: string): void {
    this.config.set(key, value);
  }

  /**
   * Update the component's position.
   *
   * @param newPosition - The new position for the component
   *
   * @example
   * ```typescript
   * const component = circuit.getComponent(componentId);
   * component.setPosition(new Position(15, 25));
   * ```
   */
  setPosition(newPosition: Position): void {
    Object.defineProperty(this, 'position', {
      value: newPosition,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Update the component's rotation.
   *
   * @param newRotation - The new rotation for the component
   *
   * @example
   * ```typescript
   * const component = circuit.getComponent(componentId);
   * component.setRotation(new Rotation(90));
   * ```
   */
  setRotation(newRotation: Rotation): void {
    Object.defineProperty(this, 'rotation', {
      value: newRotation,
      writable: false,
      enumerable: true,
      configurable: true,
    });
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
  toJSON(): IComponent {
    return {
      id: this.id,
      type: this.type,
      position: this.position.toJSON(),
      rotation: this.rotation.toJSON(),
      pins: [...this.pins],
      config: Object.fromEntries(this.config),
      editable: this.editable,
    };
  }

  /**
   * Deserialize component from JSON.
   *
   * @param json - Component data
   * @returns Component instance
   *
   */
  static fromJSON(json: IComponent): Component {
    // Create temporary component to get position/rotation instances
    const component = new Component(
      json.type,
      Position.fromJSON(json.position),
      Rotation.fromJSON(json.rotation),
      json.pins,
      json.editable
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
