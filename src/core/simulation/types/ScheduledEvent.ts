/**
 * Represents a future state transition scheduled to occur at a specific tick
 * @module core/simulation/types
 */

import type { UUID } from '@/core/types/Identifier.js';

/**
 * Scheduled event for delayed component transitions.
 * Events are ordered by readyAtTick in a min-heap priority queue.
 * Events with same readyAtTick are processed in FIFO order (by scheduledAtTick).
 *
 * @public
 */
export interface ScheduledEvent {
  /**
   * UUID of target component.
   */
  readonly targetId: UUID;

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
   * Indicates the type of this event, eg 'ClosingEnd', 'OpeningEnd', etc.
   */
  readonly type: string;

  /**
   * extra parameters associated with this event.
   */
  readonly parameters?: Map<string, string> | undefined;
}
