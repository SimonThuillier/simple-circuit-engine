/**
 * Factory Registry Interface Contract
 * @module scene/shared/FactoryRegistry
 *
 * This file defines the updated contract for the factory registry
 * that manages class-based component visual factories.
 *
 * Feature: 005-visual-factory-classes
 * Date: 2025-12-09
 */

import type { ComponentType } from '../../../src/core/types/ComponentType';
import type { IComponentVisualFactory } from './IComponentVisualFactory';

/**
 * Registry interface for managing component visual factories
 *
 * Provides type-safe registration and retrieval of component factories.
 * Falls back to a default factory for unregistered component types.
 *
 * @remarks
 * This interface is updated from the original to work with
 * `IComponentVisualFactory` class instances instead of functions.
 *
 * @example
 * ```typescript
 * const defaultFactory = new DefaultVisualFactory();
 * const registry = new FactoryRegistry(defaultFactory);
 *
 * // Register class instances
 * registry.register(ComponentType.Battery, new BatteryVisualFactory());
 * registry.register(ComponentType.Switch, new SwitchVisualFactory());
 * registry.register(ComponentType.SmallLED, new SmallLEDVisualFactory());
 *
 * // Retrieve and use
 * const factory = registry.get(ComponentType.Battery);
 * const visual = factory.createVisual(batteryComponent);
 *
 * // Apply hover
 * factory.applyHover(visual);
 * ```
 */
export interface IFactoryRegistry {
  /**
   * Register a visual factory for a specific component type
   *
   * @param type - Component type identifier (non-empty string)
   * @param factory - Factory instance to create visuals for this type
   * @throws {TypeError} If type is empty/whitespace
   * @throws {TypeError} If factory is null or undefined
   *
   * @remarks
   * - Registration overwrites any existing factory for the same type
   * - Factories should be registered during initialization
   */
  register(type: ComponentType, factory: IComponentVisualFactory): void;

  /**
   * Retrieve the factory for a component type
   *
   * @param type - Component type identifier
   * @returns Factory instance (fallback factory if type not registered)
   *
   * @remarks
   * This method NEVER returns null/undefined. If the type is not registered,
   * the fallback factory provided in the constructor is returned.
   *
   * @example
   * ```typescript
   * const factory = registry.get(component.type);
   * const visual = factory.createVisual(component);
   * ```
   */
  get(type: ComponentType): IComponentVisualFactory;

  /**
   * Check if a factory is registered for a component type
   *
   * @param type - Component type identifier
   * @returns true if explicitly registered, false if would use fallback
   *
   * @example
   * ```typescript
   * if (registry.has(ComponentType.Battery)) {
   *   console.log('Battery factory registered');
   * }
   * ```
   */
  has(type: ComponentType): boolean;

  /**
   * Unregister a factory for a component type
   *
   * @param type - Component type identifier
   * @returns true if factory was registered and removed, false otherwise
   *
   * @remarks
   * After unregistering, get() will return the fallback factory for this type.
   */
  unregister(type: ComponentType): boolean;

  /**
   * Get all registered component types
   *
   * @returns Array of ComponentType values that have registered factories
   *
   * @example
   * ```typescript
   * const types = registry.getRegisteredTypes();
   * console.log(`Registered: ${types.join(', ')}`);
   * ```
   */
  getRegisteredTypes(): ComponentType[];
}
