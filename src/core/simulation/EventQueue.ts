/**
 * Min-heap priority queue for scheduled events
 * @module core/simulation
 */


import type {IScheduledEvent} from "./types";

/**
 * Min-heap priority queue for scheduling future component transitions.
 * Events are ordered by readyAtTick (earliest first).
 * Events with same readyAtTick are returned in FIFO order (by scheduledAtTick).
 *
 * @public
 */
export class EventQueue {
  private heap: IScheduledEvent[];

  /**
   * Create a new empty event queue.
   */
  constructor() {
    this.heap = [];
  }

  /**
   * Schedule a future event.
   * Inserted with O(log N) complexity using heap operations.
   *
   * @param event - Event to schedule
   */
  schedule(event: IScheduledEvent): void {
    if (event.readyAtTick < event.scheduledAtTick) {
      throw new RangeError(
        `readyAtTick (${event.readyAtTick}) cannot be before scheduledAtTick (${event.scheduledAtTick})`
      );
    }
    if(!!event.parameters && event.parameters.has('exclusive')){
      this.removeEventsForTarget(event.targetId);
    }
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Get all events ready to fire at or before current tick.
   * Returns events in FIFO order for same readyAtTick.
   * Removes returned events from the queue.
   *
   * @param currentTick - Current simulation tick
   * @returns Array of ready events (removed from queue)
   */
  getReadyEvents(currentTick: number): IScheduledEvent[] {
    const ready: IScheduledEvent[] = [];

    while (this.heap.length > 0 && this.heap[0]!.readyAtTick <= currentTick) {
      const event = this.extractMin();
      if (event) {
        ready.push(event);
      }
    }

    // Sort by scheduledAtTick for FIFO within same readyAtTick
    ready.sort((a, b) => {
      if (a.readyAtTick === b.readyAtTick) {
        return a.scheduledAtTick - b.scheduledAtTick;
      }
      return a.readyAtTick - b.readyAtTick;
    });

    return ready;
  }

  /**
   * Check if any events are pending.
   *
   * @returns True if queue contains events
   */
  hasEvents(): boolean {
    return this.heap.length > 0;
  }

  /**
   * Clear all pending events.
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Remove all pending events targeting a specific component.
   * Used when a behavior signals shouldCancelPending (e.g., Vcc loss, input change during transition).
   * Or when an event is flagged exclusive
   *
   * @param targetId - UUID of the component whose events should be removed
   * @returns Number of events removed
   */
  removeEventsForTarget(targetId: string): number {
    const initialLength = this.heap.length;
    this.heap = this.heap.filter((event) => event.targetId !== targetId);

    // Rebuild heap if events were removed
    if (this.heap.length !== initialLength) {
      this.rebuildHeap();
    }
    return initialLength - this.heap.length;
  }

  /**
   * Get number of pending events.
   *
   * @returns Event count
   */
  size(): number {
    return this.heap.length;
  }

  private rebuildHeap(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.bubbleDown(i);
    }
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index]!.readyAtTick < this.heap[parentIndex]!.readyAtTick) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex]!, this.heap[index]!];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (
        leftChild < length &&
        this.heap[leftChild]!.readyAtTick < this.heap[smallest]!.readyAtTick
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < length &&
        this.heap[rightChild]!.readyAtTick < this.heap[smallest]!.readyAtTick
      ) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest]!, this.heap[index]!];
        index = smallest;
      } else {
        break;
      }
    }
  }

  private extractMin(): IScheduledEvent | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return min;
  }
}
