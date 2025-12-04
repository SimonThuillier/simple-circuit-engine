/**
 * Factory Registry Implementation
 * @module rendering/shared/FactoryRegistry
 *
 * Manages registration and retrieval of component visual factories
 * with fallback support for unknown component types.
 */

import type { ComponentType } from '../../core/types/ComponentType';
import type { ComponentVisualFactory, IFactoryRegistry } from './ComponentVisualFactory';

/**
 * Registry mapping ComponentType to ComponentVisualFactory
 *
 * Provides type-safe registration and retrieval with automatic fallback.
 * Thread-safe for read operations (get/has), write operations should be
 * performed during initialization.
 *
 * @example
 * ```typescript
 * const registry = new FactoryRegistry(createDefaultFactory());
 * registry.register(ComponentType.Battery, batteryFactory);
 * registry.register(ComponentType.LED, ledFactory);
 *
 * const factory = registry.get(ComponentType.Battery); // Returns batteryFactory
 * const unknown = registry.get(ComponentType.Unknown); // Returns fallback
 * ```
 */
export class FactoryRegistry implements IFactoryRegistry {
  private factories: Map<ComponentType, ComponentVisualFactory> = new Map();
  private fallbackFactory: ComponentVisualFactory;

  /**
   * Create a new factory registry
   *
   * @param fallbackFactory - Factory to use for unregistered component types
   * @throws {TypeError} If fallbackFactory is null or undefined
   */
  constructor(fallbackFactory: ComponentVisualFactory) {
    if (!fallbackFactory) {
      throw new TypeError('FactoryRegistry requires a valid fallback factory');
    }
    this.fallbackFactory = fallbackFactory;
  }

  /**
   * Register a visual factory for a specific component type
   *
   * @param type - Component type identifier
   * @param factory - Factory function to create visuals for this type
   * @throws {TypeError} If type is empty/whitespace or factory is null/undefined/not a function
   */
  register(type: ComponentType, factory: ComponentVisualFactory): void {
    if (typeof type !== 'string' || type.trim() === '') {
      throw new TypeError('Component type must be a non-empty string');
    }
    if (!factory || typeof factory !== 'function') {
      throw new TypeError(`Factory must be a function for type: ${type}`);
    }
    this.factories.set(type, factory);
  }

  /**
   * Retrieve the factory for a component type
   *
   * @param type - Component type identifier
   * @returns Factory function (fallback factory if type not registered)
   *
   * @remarks
   * This method NEVER returns null/undefined. If the type is not registered,
   * the fallback factory provided in the constructor is returned.
   */
  get(type: ComponentType): ComponentVisualFactory {
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
