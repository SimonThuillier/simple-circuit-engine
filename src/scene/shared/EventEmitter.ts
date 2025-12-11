/**
 * Type-safe Event Emitter
 * @module rendering/shared/EventEmitter
 *
 * Provides type-safe event handling without external dependencies.
 * Generic EventMap type ensures compile-time type safety for event payloads.
 */

/**
 * Generic event emitter with type-safe event emission and subscription
 *
 * @template EventMap - Map of event names to their payload types
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   click: { x: number; y: number };
 *   error: { message: string };
 * }
 *
 * const emitter = new EventEmitter<MyEvents>();
 * emitter.on('click', ({ x, y }) => console.log(x, y)); // Type-safe!
 * emitter.emit('click', { x: 10, y: 20 });
 * ```
 */
export class EventEmitter<EventMap extends Record<string, any>> {
  private listeners: Map<keyof EventMap, Function[]> = new Map();

  /**
   * Register an event listener
   *
   * @param event - Event name to listen for
   * @param callback - Function to call when event occurs
   *
   * @remarks
   * Same callback can be registered multiple times (will be called multiple times).
   * Callbacks are wrapped in try-catch to prevent errors from breaking emission.
   */
  on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unregister an event listener
   *
   * @param event - Event name
   * @param callback - Function to remove (must be same reference used in on())
   *
   * @remarks
   * If callback was registered multiple times, only removes one registration.
   */
  off<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   * This method is public so that tools may emit events directly on behalf of the EventEmitter owner (SceneManager).
   *
   * @param event - Event name to emit
   * @param payload - Event-specific payload
   *
   * @remarks
   * Listeners are called in registration order.
   * Errors in callbacks are caught and logged but do not stop other callbacks.
   */
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(payload);
        } catch (error) {
          // Prevent callback errors from breaking other callbacks
          console.error(`Error in event listener for '${String(event)}':`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for a specific event or all events
   *
   * @param event - Optional event name. If omitted, removes all listeners for all events.
   */
  removeAllListeners<K extends keyof EventMap>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get count of listeners for a specific event
   *
   * @param event - Event name
   * @returns Number of registered listeners
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}
