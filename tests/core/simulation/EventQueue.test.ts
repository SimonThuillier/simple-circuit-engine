/**
 * Unit tests for EventQueue class
 *
 * Tests the min-heap priority queue for scheduled events:
 * - Event scheduling and prioritization
 * - FIFO ordering for same readyAtTick
 * - Heap operations correctness
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { EventQueue } from '@/core/simulation/EventQueue';
import type { ScheduledEvent } from '@/core/simulation/types/ScheduledEvent';

describe('EventQueue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    queue = new EventQueue();
  });

  describe('constructor', () => {
    it('should create an empty event queue', () => {
      const queue = new EventQueue();
      expect(queue).toBeDefined();
      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });
  });

  describe('schedule()', () => {
    it('should schedule a single event', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);

      expect(queue.size()).toBe(1);
      expect(queue.hasEvents()).toBe(true);
    });

    it('should schedule multiple events', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);

      expect(queue.size()).toBe(2);
    });

    it('should throw when readyAtTick is before scheduledAtTick', () => {
      const invalidEvent: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 10,
        readyAtTick: 5,
        type: 'test',
      };

      expect(() => queue.schedule(invalidEvent)).toThrow(RangeError);
      expect(() => queue.schedule(invalidEvent)).toThrow(
        /readyAtTick .* cannot be before scheduledAtTick/
      );
    });

    it('should allow readyAtTick equal to scheduledAtTick', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 10,
        readyAtTick: 10,
        type: 'test',
      };

      expect(() => queue.schedule(event)).not.toThrow();
      expect(queue.size()).toBe(1);
    });
  });

  describe('getReadyEvents()', () => {
    it('should return empty array when no events are ready', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      const ready = queue.getReadyEvents(5);

      expect(ready).toEqual([]);
      expect(queue.size()).toBe(1);
    });

    it('should return events ready at current tick', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      const ready = queue.getReadyEvents(10);

      expect(ready.length).toBe(1);
      expect(ready[0]).toEqual(event);
      expect(queue.size()).toBe(0);
    });

    it('should return events ready before current tick', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      const ready = queue.getReadyEvents(15);

      expect(ready.length).toBe(1);
      expect(ready[0]).toEqual(event);
      expect(queue.size()).toBe(0);
    });

    it('should return all ready events and leave future events', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 5,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event3: ScheduledEvent = {
        targetId: 'comp-3',
        scheduledAtTick: 0,
        readyAtTick: 15,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);

      const ready = queue.getReadyEvents(10);

      expect(ready.length).toBe(2);
      expect(ready).toContainEqual(event1);
      expect(ready).toContainEqual(event2);
      expect(queue.size()).toBe(1);
    });

    it('should order events by readyAtTick (earliest first)', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 5,
        type: 'test',
      };
      const event3: ScheduledEvent = {
        targetId: 'comp-3',
        scheduledAtTick: 0,
        readyAtTick: 15,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);

      const ready = queue.getReadyEvents(20);

      expect(ready.length).toBe(3);
      expect(ready[0]?.readyAtTick).toBe(5);
      expect(ready[1]?.readyAtTick).toBe(10);
      expect(ready[2]?.readyAtTick).toBe(15);
    });

    it('should maintain FIFO order for events with same readyAtTick', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 5,
        readyAtTick: 10,
        type: 'test',
      };
      const event3: ScheduledEvent = {
        targetId: 'comp-3',
        scheduledAtTick: 8,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.schedule(event3);

      const ready = queue.getReadyEvents(10);

      expect(ready.length).toBe(3);
      // Should be ordered by scheduledAtTick when readyAtTick is the same
      expect(ready[0]?.scheduledAtTick).toBe(0);
      expect(ready[1]?.scheduledAtTick).toBe(5);
      expect(ready[2]?.scheduledAtTick).toBe(8);
    });

    it('should remove returned events from queue', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      queue.getReadyEvents(10);

      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });
  });

  describe('hasEvents()', () => {
    it('should return false for empty queue', () => {
      expect(queue.hasEvents()).toBe(false);
    });

    it('should return true when events are scheduled', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      expect(queue.hasEvents()).toBe(true);
    });

    it('should return false after all events are retrieved', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      queue.getReadyEvents(10);

      expect(queue.hasEvents()).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all events', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.hasEvents()).toBe(false);
    });

    it('should allow scheduling after clear', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'test',
      };

      queue.schedule(event1);
      queue.clear();
      queue.schedule(event2);

      expect(queue.size()).toBe(1);
    });
  });

  describe('size()', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size()).toBe(0);
    });

    it('should return correct size after scheduling events', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'test',
      };

      queue.schedule(event1);
      expect(queue.size()).toBe(1);

      queue.schedule(event2);
      expect(queue.size()).toBe(2);
    });

    it('should decrease after retrieving events', () => {
      const event1: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };
      const event2: ScheduledEvent = {
        targetId: 'comp-2',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'test',
      };

      queue.schedule(event1);
      queue.schedule(event2);
      queue.getReadyEvents(10);

      expect(queue.size()).toBe(1);
    });
  });

  describe('heap operations', () => {
    it('should maintain min-heap property with random insertions', () => {
      // Schedule events in random order
      const readyTimes = [50, 10, 30, 20, 40, 5, 15, 25];

      for (let i = 0; i < readyTimes.length; i++) {
        const event: ScheduledEvent = {
          targetId: `comp-${i}`,
          scheduledAtTick: 0,
          readyAtTick: readyTimes[i]!,
          type: 'test',
        };
        queue.schedule(event);
      }

      expect(queue.size()).toBe(8);

      // Retrieve events one by one - should come out in sorted order
      const ready = queue.getReadyEvents(100);
      const sortedTimes = [...readyTimes].sort((a, b) => a - b);

      expect(ready.length).toBe(8);
      for (let i = 0; i < ready.length; i++) {
        expect(ready[i]?.readyAtTick).toBe(sortedTimes[i]);
      }
    });

    it('should handle large number of events efficiently', () => {
      const startTime = Date.now();

      // Schedule 1000 events
      for (let i = 0; i < 1000; i++) {
        const event: ScheduledEvent = {
          targetId: `comp-${i}`,
          scheduledAtTick: 0,
          readyAtTick: Math.floor(Math.random() * 1000),
          type: 'test',
        };
        queue.schedule(event);
      }

      const scheduleTime = Date.now() - startTime;
      expect(queue.size()).toBe(1000);
      expect(scheduleTime).toBeLessThan(1000); // Should schedule in < 1 second

      // Retrieve all events
      const retrieveStartTime = Date.now();
      const ready = queue.getReadyEvents(1000);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(ready.length).toBe(1000);
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve in < 1 second

      // Verify sorted order
      for (let i = 1; i < ready.length; i++) {
        expect(ready[i]!.readyAtTick).toBeGreaterThanOrEqual(ready[i - 1]!.readyAtTick);
      }
    });
  });

  describe('event parameters', () => {
    it('should preserve event parameters', () => {
      const params = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
        parameters: params,
      };

      queue.schedule(event);
      const ready = queue.getReadyEvents(10);

      expect(ready[0]?.parameters).toBe(params);
      expect(ready[0]?.parameters?.get('key1')).toBe('value1');
    });

    it('should handle events without parameters', () => {
      const event: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 10,
        type: 'test',
      };

      queue.schedule(event);
      const ready = queue.getReadyEvents(10);

      expect(ready[0]?.parameters).toBeUndefined();
    });
  });
});
