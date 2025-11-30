/**
 * Unit tests for EventQueue
 * @module tests/core/simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventQueue } from '@/core/simulation/EventQueue.js';
import type { ScheduledEvent } from '@/core/simulation/types/ScheduledEvent.js';
import { generateUUID } from '@/core/types/Identifier.js';

describe('EventQueue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    queue = new EventQueue();
  });

  describe('constructor', () => {
    it('should create an empty queue', () => {
      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });
  });

  describe('schedule', () => {
    it('should schedule a single event', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: { state: 'on' }
      };

      queue.schedule(event);

      expect(queue.size()).toBe(1);
      expect(queue.hasEvents()).toBe(true);
    });

    it('should throw error if readyAtTick is before scheduledAtTick', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 10,
        readyAtTick: 5, // Invalid: before scheduledAtTick
        targetType: 'component',
        targetId: generateUUID(),
        newState: { state: 'on' }
      };

      expect(() => queue.schedule(event)).toThrow(RangeError);
      expect(() => queue.schedule(event)).toThrow('readyAtTick (5) cannot be before scheduledAtTick (10)');
    });

    it('should allow readyAtTick equal to scheduledAtTick', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 5,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: { state: 'on' }
      };

      expect(() => queue.schedule(event)).not.toThrow();
      expect(queue.size()).toBe(1);
    });

    it('should schedule multiple events', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: { state: 'on' }
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 1,
        readyAtTick: 10,
        targetType: 'enode',
        targetId: generateUUID(),
        newState: { hasVoltage: true }
      };

      queue.schedule(event1);
      queue.schedule(event2);

      expect(queue.size()).toBe(2);
    });

    it('should maintain min-heap property (earliest event at root)', () => {
      // Schedule events in reverse order
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event3: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 15,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);

      // getReadyEvents should return earliest first
      const ready = queue.getReadyEvents(10);
      expect(ready).toHaveLength(2);
      expect(ready[0].readyAtTick).toBe(5);
      expect(ready[1].readyAtTick).toBe(10);
    });
  });

  describe('getReadyEvents', () => {
    it('should return empty array when no events are ready', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);

      const ready = queue.getReadyEvents(5);
      expect(ready).toEqual([]);
      expect(queue.size()).toBe(1); // Event still in queue
    });

    it('should return events ready at exact tick', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);

      const ready = queue.getReadyEvents(5);
      expect(ready).toHaveLength(1);
      expect(ready[0]).toEqual(event);
    });

    it('should return events ready before current tick', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);

      const ready = queue.getReadyEvents(10);
      expect(ready).toHaveLength(1);
      expect(ready[0]).toEqual(event);
    });

    it('should remove returned events from queue', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);
      expect(queue.size()).toBe(1);

      queue.getReadyEvents(5);
      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });

    it('should return multiple ready events', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 1,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event3: ScheduledEvent = {
        scheduledAtTick: 2,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);

      const ready = queue.getReadyEvents(5);
      expect(ready).toHaveLength(2);
      expect(queue.size()).toBe(1); // One event remains
    });

    it('should return events in FIFO order for same readyAtTick', () => {
      // All ready at tick 5, scheduled at different times
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'first',
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 1,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'second',
        newState: {}
      };

      const event3: ScheduledEvent = {
        scheduledAtTick: 2,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'third',
        newState: {}
      };

      queue.schedule(event2);
      queue.schedule(event3);
      queue.schedule(event1);

      const ready = queue.getReadyEvents(5);

      expect(ready).toHaveLength(3);
      expect(ready[0].targetId).toBe('first');
      expect(ready[1].targetId).toBe('second');
      expect(ready[2].targetId).toBe('third');
    });

    it('should sort by readyAtTick first, then FIFO', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: 'tick10-first',
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 1,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'tick5-second',
        newState: {}
      };

      const event3: ScheduledEvent = {
        scheduledAtTick: 2,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'tick5-third',
        newState: {}
      };

      const event4: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: 'tick5-first',
        newState: {}
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);
      queue.schedule(event4);

      const ready = queue.getReadyEvents(10);

      expect(ready).toHaveLength(4);
      expect(ready[0].targetId).toBe('tick5-first');
      expect(ready[1].targetId).toBe('tick5-second');
      expect(ready[2].targetId).toBe('tick5-third');
      expect(ready[3].targetId).toBe('tick10-first');
    });

    it('should work correctly after multiple calls', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event1);
      queue.schedule(event2);

      const ready1 = queue.getReadyEvents(5);
      expect(ready1).toHaveLength(1);
      expect(queue.size()).toBe(1);

      const ready2 = queue.getReadyEvents(10);
      expect(ready2).toHaveLength(1);
      expect(queue.size()).toBe(0);
    });
  });

  describe('hasEvents', () => {
    it('should return false for empty queue', () => {
      expect(queue.hasEvents()).toBe(false);
    });

    it('should return true when events are scheduled', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);
      expect(queue.hasEvents()).toBe(true);
    });

    it('should return false after all events are retrieved', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);
      queue.getReadyEvents(5);

      expect(queue.hasEvents()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event1);
      queue.schedule(event2);
      expect(queue.size()).toBe(2);

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });

    it('should allow scheduling after clear', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);
      queue.clear();

      const newEvent: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(newEvent);

      expect(queue.size()).toBe(1);
      expect(queue.hasEvents()).toBe(true);
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('should return correct size after scheduling', () => {
      const event1: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      const event2: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 10,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event1);
      expect(queue.size()).toBe(1);

      queue.schedule(event2);
      expect(queue.size()).toBe(2);
    });

    it('should update after retrieving events', () => {
      const event: ScheduledEvent = {
        scheduledAtTick: 0,
        readyAtTick: 5,
        targetType: 'component',
        targetId: generateUUID(),
        newState: {}
      };

      queue.schedule(event);
      expect(queue.size()).toBe(1);

      queue.getReadyEvents(5);
      expect(queue.size()).toBe(0);
    });
  });

  describe('stress test', () => {
    it('should handle many events efficiently', () => {
      // Schedule 1000 events with random ready times
      const events: ScheduledEvent[] = [];
      for (let i = 0; i < 1000; i++) {
        const scheduledAt = Math.floor(i / 10); // 100 unique scheduled ticks
        const delay = Math.floor(Math.random() * 100);
        events.push({
          scheduledAtTick: scheduledAt,
          readyAtTick: scheduledAt + delay,
          targetType: 'component',
          targetId: generateUUID(),
          newState: {}
        });
      }

      // Schedule all events
      events.forEach(e => queue.schedule(e));
      expect(queue.size()).toBe(1000);

      // Retrieve events tick by tick
      let totalRetrieved = 0;
      for (let tick = 0; tick < 200; tick++) {
        const ready = queue.getReadyEvents(tick);
        totalRetrieved += ready.length;

        // Verify FIFO ordering for same tick
        for (let i = 1; i < ready.length; i++) {
          if (ready[i].readyAtTick === ready[i - 1].readyAtTick) {
            expect(ready[i].scheduledAtTick).toBeGreaterThanOrEqual(ready[i - 1].scheduledAtTick);
          }
        }
      }

      expect(totalRetrieved).toBe(1000);
      expect(queue.size()).toBe(0);
    });
  });
});
