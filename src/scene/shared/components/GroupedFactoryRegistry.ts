/**
 * Grouped Factory Registry Implementation
 * @module scene/shared/GroupedFactoryRegistry
 *
 * Extends the basic factory registry with named group support for UI/UX-oriented
 * component palette organization. Components can only be added inside a group
 * context via addGroup(), enforcing the "no floating components" invariant.
 */

import type { ComponentType } from 'simple-circuit-engine/core';
import type { IComponentVisualFactory, IFactoryRegistry } from './ComponentVisualFactory.js';

/**
 * Describes a named group of component types
 */
export interface ComponentGroup {
  readonly id: string;
  readonly label: string;
}

/**
 * Builder interface for adding components to a group.
 * Used as the callback parameter type in addGroup().
 *
 * @example
 * ```typescript
 * registry.addGroup('basic', 'Basic Components', (group: IComponentGroupBuilder) => {
 *   group
 *     .add(ComponentType.Battery, new BatteryVisualFactory())
 *     .add(ComponentType.Switch, new SwitchVisualFactory());
 * });
 * ```
 */
export interface IComponentGroupBuilder {
  add(type: ComponentType, factory: IComponentVisualFactory): IComponentGroupBuilder;
}

/**
 * Extended registry interface with grouping support.
 *
 * Adds group management on top of the basic factory retrieval,
 * allowing client UIs to build organized component palettes.
 */
export interface IGroupedFactoryRegistry {
  addGroup(
    id: string,
    label: string,
    builderCallback: (group: IComponentGroupBuilder) => void
  ): IGroupedFactoryRegistry;
  get(type: ComponentType): IComponentVisualFactory;
  has(type: ComponentType): boolean;
  getFallbackFactory(): IComponentVisualFactory;
  getGroups(): ComponentGroup[];
  getGroupOf(type: ComponentType): ComponentGroup | undefined;
  getRegisteredTypes(groupId?: string): ComponentType[];
  unregister(type: ComponentType): boolean;
}

/** Internal mutable group record */
interface GroupRecord {
  readonly id: string;
  readonly label: string;
  types: ComponentType[];
}

/**
 * Internal builder for adding components within a named group.
 * Handles factory registration and cross-group type movement.
 */
class ComponentGroupBuilder implements IComponentGroupBuilder {
  constructor(
    private readonly _groupRecord: GroupRecord,
    private readonly _factories: Map<ComponentType, IComponentVisualFactory>,
    private readonly _typeToGroupId: Map<ComponentType, string>,
    private readonly _groups: Map<string, GroupRecord>
  ) {}

  add(type: ComponentType, factory: IComponentVisualFactory): IComponentGroupBuilder {
    if (typeof type !== 'string' || type.trim() === '') {
      throw new TypeError('Component type must be a non-empty string');
    }
    if (!factory) {
      throw new TypeError(`Factory cannot be null or undefined for type: ${type}`);
    }
    if (typeof factory !== 'object' || typeof (factory as any).createVisual !== 'function') {
      throw new TypeError(`Factory must be an object with createVisual method for type: ${type}`);
    }

    // If type is already registered in a different group, remove it from that group's list
    const existingGroupId = this._typeToGroupId.get(type);
    if (existingGroupId !== undefined && existingGroupId !== this._groupRecord.id) {
      const oldGroup = this._groups.get(existingGroupId);
      if (oldGroup) {
        oldGroup.types = oldGroup.types.filter((t) => t !== type);
      }
    }

    this._factories.set(type, factory);
    this._typeToGroupId.set(type, this._groupRecord.id);

    if (!this._groupRecord.types.includes(type)) {
      this._groupRecord.types.push(type);
    }

    return this;
  }
}

/**
 * Factory registry with named group support.
 *
 * Implements both IFactoryRegistry (backward compat) and IGroupedFactoryRegistry.
 * Components may only be registered inside a group context via addGroup().
 *
 * Group insertion order is preserved (Map maintains insertion order).
 * Duplicate group ids merge their components; the label from the first
 * registration is preserved.
 *
 * @example
 * ```typescript
 * const registry = new GroupedFactoryRegistry(new DefaultVisualFactory())
 *   .addGroup('basic', 'Basic Components', group => group
 *     .add(ComponentType.Battery, new BatteryVisualFactory())
 *     .add(ComponentType.Switch, new SwitchVisualFactory())
 *   )
 *   .addGroup('outputs', 'Output Components', group => group
 *     .add(ComponentType.Lightbulb, new LightbulbVisualFactory())
 *   );
 *
 * registry.getGroups();                        // [{ id: 'basic', ... }, { id: 'outputs', ... }]
 * registry.getGroupOf(ComponentType.Battery);  // { id: 'basic', label: 'Basic Components' }
 * registry.getRegisteredTypes('basic');        // [ComponentType.Battery, ComponentType.Switch]
 * registry.get(ComponentType.Battery);         // BatteryVisualFactory instance
 * ```
 */
export class GroupedFactoryRegistry implements IFactoryRegistry, IGroupedFactoryRegistry {
  private readonly _factories: Map<ComponentType, IComponentVisualFactory> = new Map();
  private readonly _fallbackFactory: IComponentVisualFactory;
  private readonly _groups: Map<string, GroupRecord> = new Map();
  private readonly _typeToGroupId: Map<ComponentType, string> = new Map();

  /**
   * Create a new grouped factory registry.
   *
   * @param fallbackFactory - Factory to use for unregistered component types
   * @throws {TypeError} If fallbackFactory is null or undefined
   */
  constructor(fallbackFactory: IComponentVisualFactory) {
    if (!fallbackFactory) {
      throw new TypeError('GroupedFactoryRegistry requires a valid fallback factory');
    }
    this._fallbackFactory = fallbackFactory;
  }

  /**
   * Add a named group and register component factories within it.
   *
   * If a group with the same id already exists, the new components are merged
   * into it and the original label is preserved.
   *
   * @param id - Unique group identifier
   * @param label - Human-readable group display name
   * @param builderCallback - Callback receiving a builder for adding components
   * @throws {TypeError} If id or label is empty/whitespace
   * @returns this (for chaining)
   */
  addGroup(
    id: string,
    label: string,
    builderCallback: (group: IComponentGroupBuilder) => void
  ): this {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('Group id must be a non-empty string');
    }
    if (typeof label !== 'string' || label.trim() === '') {
      throw new TypeError('Group label must be a non-empty string');
    }

    let groupRecord = this._groups.get(id);
    if (!groupRecord) {
      groupRecord = { id, label, types: [] };
      this._groups.set(id, groupRecord);
    }
    // If group already exists: merge components, label preserved from first registration

    const builder = new ComponentGroupBuilder(
      groupRecord,
      this._factories,
      this._typeToGroupId,
      this._groups
    );
    builderCallback(builder);

    return this;
  }

  /**
   * Retrieve the factory for a component type.
   *
   * @returns Factory, or the fallback factory if type not registered.
   * Never returns null or undefined.
   */
  get(type: ComponentType): IComponentVisualFactory {
    return this._factories.get(type) ?? this._fallbackFactory;
  }

  /**
   * Check if a factory is registered for a component type.
   *
   * @returns true if explicitly registered, false if would use fallback
   */
  has(type: ComponentType): boolean {
    return this._factories.has(type);
  }

  /**
   * Get the fallback factory used for unregistered types.
   */
  getFallbackFactory(): IComponentVisualFactory {
    return this._fallbackFactory;
  }

  /**
   * Get all defined groups in insertion order.
   *
   * @returns New array of ComponentGroup objects (safe to mutate)
   */
  getGroups(): ComponentGroup[] {
    return Array.from(this._groups.values()).map((g) => ({ id: g.id, label: g.label }));
  }

  /**
   * Get the group a component type belongs to.
   *
   * @param type - Component type to look up
   * @returns ComponentGroup, or undefined if type is not registered
   */
  getGroupOf(type: ComponentType): ComponentGroup | undefined {
    const groupId = this._typeToGroupId.get(type);
    if (!groupId) return undefined;
    const group = this._groups.get(groupId);
    if (!group) return undefined;
    return { id: group.id, label: group.label };
  }

  /**
   * Get registered component types, optionally filtered by group.
   *
   * @param groupId - If provided, returns only types in that group
   * @returns New array of ComponentType values (safe to mutate).
   *          Returns empty array if groupId is unknown.
   */
  getRegisteredTypes(groupId?: string): ComponentType[] {
    if (groupId === undefined) {
      return Array.from(this._factories.keys());
    }
    const group = this._groups.get(groupId);
    if (!group) return [];
    return [...group.types];
  }

  /**
   * Unregister a factory for a component type.
   *
   * The type is removed from its group's list and from the reverse lookup.
   * The group record itself is preserved even if it becomes empty.
   *
   * @param type - Component type to remove
   * @returns true if factory was registered and removed, false otherwise
   */
  unregister(type: ComponentType): boolean {
    if (!this._factories.has(type)) return false;

    this._factories.delete(type);

    const groupId = this._typeToGroupId.get(type);
    if (groupId) {
      const group = this._groups.get(groupId);
      if (group) {
        group.types = group.types.filter((t) => t !== type);
      }
      this._typeToGroupId.delete(type);
    }

    return true;
  }

  /**
   * Not supported. Use addGroup() to register components within a named group.
   *
   * @throws {Error} Always throws
   */
  register(_type: ComponentType, _factory: IComponentVisualFactory): IFactoryRegistry {
    throw new Error(
      'GroupedFactoryRegistry does not support register(). Use addGroup() to add components within a named group.'
    );
  }
}
