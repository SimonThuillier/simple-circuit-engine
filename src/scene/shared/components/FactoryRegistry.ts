/**
 * Factory Registry Implementation
 * @module scene/shared/FactoryRegistry
 *
 * Manages registration and retrieval of component visual factories
 * with fallback support for unknown component types.
 */

import type { ComponentType } from 'simple-circuit-engine/core';
import type { IComponentVisualFactory, IFactoryRegistry } from './ComponentVisualFactory';

/**
 * Registry mapping ComponentType to ComponentVisualFactory
 *
 * Provides type-safe registration and retrieval with automatic fallback.
 * Supports both function-based (legacy) and class-based (new) factories.
 * Thread-safe for read operations (get/has), write operations should be
 * performed during initialization.
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(new DefaultVisualFactory());
 * registry.register(ComponentType.Battery, new BatteryVisualFactory());
 * registry.register(ComponentType.LED, new SmallLEDVisualFactory());
 *
 * const factory = registry.get(ComponentType.Battery); // Returns BatteryVisualFactory
 * const unknown = registry.get(ComponentType.Unknown); // Returns fallback
 * const mesh = factory.createVisual(component);
 * ```
 */
export class FactoryRegistry implements IFactoryRegistry {
  private factories: Map<ComponentType, IComponentVisualFactory> = new Map();
  private fallbackFactory: IComponentVisualFactory;

  /**
   * Create a new factory registry
   *
   * @param fallbackFactory - Factory to use for unregistered component types
   * @throws {TypeError} If fallbackFactory is null or undefined
   */
  constructor(fallbackFactory: IComponentVisualFactory) {
    if (!fallbackFactory) {
      throw new TypeError('FactoryRegistry requires a valid fallback factory');
    }
    this.fallbackFactory = fallbackFactory;
  }

  /**
   * Register a visual factory for a specific component type
   *
   * @param type - Component type identifier
   * @param factory - Factory (class instance or function) to create visuals for this type
   * @throws {TypeError} If type is empty/whitespace or factory is null/undefined
   * @returns This FactoryRegistry instance (for chaining)
   */
  register(type: ComponentType, factory: IComponentVisualFactory): FactoryRegistry {
    if (typeof type !== 'string' || type.trim() === '') {
      throw new TypeError('Component type must be a non-empty string');
    }
    if (!factory) {
      throw new TypeError(`Factory cannot be null or undefined for type: ${type}`);
    }
    // Accept both class instances (object with createVisual method) and functions
    if (typeof factory !== 'object' || typeof (factory as any).createVisual !== 'function') {
      throw new TypeError(`Factory must be a an object with createVisual method for type: ${type}`);
    }
    this.factories.set(type, factory);
    return this;
  }

  /**
   * Retrieve the factory for a component type
   *
   * @param type - Component type identifier
   * @returns Factory (fallback factory if type not registered)
   *
   * @remarks
   * This method NEVER returns null/undefined. If the type is not registered,
   * the fallback factory provided in the constructor is returned.
   */
  get(type: ComponentType): IComponentVisualFactory {
    return this.factories.get(type) ?? this.fallbackFactory;
  }

  /**
   * Check if a factory is registered for a component type
   *
   * @param type - Component type identifier
   * @returns true if explicitly registered, false if would use fallback
   */
  has(type: ComponentType): boolean {
    return this.factories.has(type);
  }

  /**
   * Get the fallback factory used for unregistered types
   */
  getFallbackFactory(): IComponentVisualFactory {
    return this.fallbackFactory;
  }

  /**
   * Unregister a factory for a component type
   *
   * @param type - Component type identifier
   * @returns true if factory was registered and removed, false otherwise
   *
   * @remarks
   * After unregistering, get() will return the fallback factory for this type.
   */
  unregister(type: ComponentType): boolean {
    return this.factories.delete(type);
  }

  /**
   * Get all registered component types
   *
   * @returns Array of ComponentType values that have registered factories
   */
  getRegisteredTypes(): ComponentType[] {
    return Array.from(this.factories.keys());
  }
}
