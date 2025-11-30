/**
 * Represents a future state transition scheduled to occur at a specific tick
 * @module core/simulation/types
 */

import type { UUID } from '@/core/types/Identifier.js';
import type { ComponentState } from '../states/ComponentState.js';
import type { NodeElectricalState } from '../states/NodeElectricalState.js';

/**
 * Scheduled event for delayed component transitions.
 * Events are ordered by readyAtTick in a min-heap priority queue.
 * Events with same readyAtTick are processed in FIFO order (by scheduledAtTick).
 *
 * @public
 */
export interface ScheduledEvent {
  /**
   * Tick when this event was scheduled (for FIFO ordering).
   * @readonly
   */
  readonly scheduledAtTick: number;

  /**
   * Tick when this event should be processed.
   * @readonly
   */
  readonly readyAtTick: number;

  /**
   * Type of target element.
   */
  readonly targetType: 'component' | 'enode' | 'wire';

  /**
   * UUID of target element.
   */
  readonly targetId: UUID;

  /**
   * New state to apply when event fires.
   * Structure depends on targetType.
   */
  readonly newState: Partial<ComponentState> | Partial<NodeElectricalState>;
}
