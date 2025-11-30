/**
 * Registry for component behavior implementations
 * @module core/simulation/behaviors
 */

import type { ComponentBehavior } from './ComponentBehavior.js';

/**
 * Registry for component behavior implementations.
 * Maps component types to their behavior handlers.
 *
 * This allows the simulation engine to be extended with new component types
 * without modifying core simulation logic.
 *
 * @public
 */
export class BehaviorRegistry {
  private behaviors: Map<string, ComponentBehavior>;

  /**
   * Create a new empty behavior registry.
   */
  constructor() {
    this.behaviors = new Map();
  }

  /**
   * Register a behavior for a component type.
   * Overwrites any existing behavior for the same type.
   *
   * @param behavior - The component behavior to register
   * @throws TypeError if behavior is null/undefined or componentType is empty
   */
  register(behavior: ComponentBehavior): void {
    if (!behavior) {
      throw new TypeError('Behavior cannot be null or undefined');
    }

    if (!behavior.componentType || behavior.componentType.trim() === '') {
      throw new TypeError('Behavior componentType cannot be empty');
    }

    this.behaviors.set(behavior.componentType, behavior);
  }

  /**
   * Register multiple behaviors at once.
   * Convenience method for bulk registration.
   *
   * @param behaviors - Array of behaviors to register
   */
  registerAll(behaviors: ComponentBehavior[]): void {
    behaviors.forEach(behavior => this.register(behavior));
  }

  /**
   * Get the behavior for a component type.
   *
   * @param componentType - Type identifier (e.g., "battery", "led")
   * @returns The registered behavior, or undefined if not found
   */
  get(componentType: string): ComponentBehavior | undefined {
    return this.behaviors.get(componentType);
  }

  /**
   * Check if a behavior is registered for a component type.
   *
   * @param componentType - Type identifier to check
   * @returns True if behavior is registered
   */
  has(componentType: string): boolean {
    return this.behaviors.has(componentType);
  }

  /**
   * Unregister a behavior for a component type.
   *
   * @param componentType - Type identifier to unregister
   * @returns True if behavior was found and removed
   */
  unregister(componentType: string): boolean {
    return this.behaviors.delete(componentType);
  }

  /**
   * Clear all registered behaviors.
   */
  clear(): void {
    this.behaviors.clear();
  }

  /**
   * Get all registered component types.
   *
   * @returns Array of component type identifiers
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.behaviors.keys());
  }

  /**
   * Get count of registered behaviors.
   *
   * @returns Number of registered behaviors
   */
  size(): number {
    return this.behaviors.size;
  }
}
