/**
 * Unit tests for EventQueue class
 *
 * Tests the min-heap priority queue for scheduled events:
 * - Event scheduling and prioritization
 * - FIFO ordering for same readyAtTick
 * - Heap operations correctness
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { ScheduledEvent } from 'simple-circuit-engine/core';
import { EventQueue } from 'simple-circuit-engine/core';

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

    it('should not remove events for target when exclusive parameter is present', () => {
      const existing: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 0,
        readyAtTick: 20,
        type: 'existing',
      };
      const exclusive: ScheduledEvent = {
        targetId: 'comp-1',
        scheduledAtTick: 5,
        readyAtTick: 15,
        type: 'exclusive',
        parameters: new Map([['exclusive', 'true']]),
      };

      queue.schedule(existing);
      queue.schedule(exclusive);

      // Both events should remain — schedule() no longer handles exclusive
      expect(queue.size()).toBe(2);
      const ready = queue.getReadyEvents(20);
      expect(ready.length).toBe(2);
    });
  });

  describe('removeEventsForTarget()', () => {
    it('should remove all events for a specific target', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' });
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 1, readyAtTick: 20, type: 'b' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 15, type: 'c' });

      const removed = queue.removeEventsForTarget('comp-1');

      expect(removed).toBe(2);
      expect(queue.size()).toBe(1);
      const ready = queue.getReadyEvents(100);
      expect(ready.length).toBe(1);
      expect(ready[0]!.targetId).toBe('comp-2');
    });

    it('should return 0 when no events match the target', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' });

      const removed = queue.removeEventsForTarget('comp-2');

      expect(removed).toBe(0);
      expect(queue.size()).toBe(1);
    });

    it('should return 0 on empty queue', () => {
      const removed = queue.removeEventsForTarget('comp-1');
      expect(removed).toBe(0);
    });

    it('should maintain heap order after removal', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 5, type: 'a' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 10, type: 'b' });
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 15, type: 'c' });
      queue.schedule({ targetId: 'comp-3', scheduledAtTick: 0, readyAtTick: 20, type: 'd' });

      queue.removeEventsForTarget('comp-1');

      const ready = queue.getReadyEvents(100);
      expect(ready.length).toBe(2);
      expect(ready[0]!.readyAtTick).toBe(10);
      expect(ready[1]!.readyAtTick).toBe(20);
    });
  });

  describe('scheduleMany()', () => {
    it('should schedule multiple events at once', () => {
      const events: ScheduledEvent[] = [
        { targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' },
        { targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 5, type: 'b' },
        { targetId: 'comp-3', scheduledAtTick: 0, readyAtTick: 15, type: 'c' },
      ];

      queue.scheduleMany(events);

      expect(queue.size()).toBe(3);
      const ready = queue.getReadyEvents(20);
      expect(ready[0]!.readyAtTick).toBe(5);
      expect(ready[1]!.readyAtTick).toBe(10);
      expect(ready[2]!.readyAtTick).toBe(15);
    });

    it('should cancel targets before inserting new events', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'old' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 20, type: 'keep' });

      const newEvents: ScheduledEvent[] = [
        { targetId: 'comp-1', scheduledAtTick: 5, readyAtTick: 15, type: 'new' },
      ];

      queue.scheduleMany(newEvents, new Set(['comp-1']));

      expect(queue.size()).toBe(2); // old comp-1 removed, new comp-1 + comp-2
      const ready = queue.getReadyEvents(100);
      expect(ready[0]!.type).toBe('new');
      expect(ready[1]!.type).toBe('keep');
    });

    it('should cancel targets even when no new events are provided', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 20, type: 'b' });

      queue.scheduleMany([], new Set(['comp-1']));

      expect(queue.size()).toBe(1);
      const ready = queue.getReadyEvents(100);
      expect(ready[0]!.targetId).toBe('comp-2');
    });

    it('should cancel multiple targets in a single pass', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 20, type: 'b' });
      queue.schedule({ targetId: 'comp-3', scheduledAtTick: 0, readyAtTick: 30, type: 'c' });

      queue.scheduleMany([], new Set(['comp-1', 'comp-3']));

      expect(queue.size()).toBe(1);
      const ready = queue.getReadyEvents(100);
      expect(ready[0]!.targetId).toBe('comp-2');
    });

    it('should throw when any event has invalid ticks', () => {
      const events: ScheduledEvent[] = [
        { targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'valid' },
        { targetId: 'comp-2', scheduledAtTick: 10, readyAtTick: 5, type: 'invalid' },
      ];

      expect(() => queue.scheduleMany(events)).toThrow(RangeError);
      // Queue should not be modified on validation failure
      expect(queue.size()).toBe(0);
    });

    it('should be a no-op when called with empty events and no cancel targets', () => {
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 10, type: 'a' });

      queue.scheduleMany([]);

      expect(queue.size()).toBe(1);
    });

    it('should maintain heap order with mixed cancel and insert', () => {
      // Pre-populate with events at various ticks
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 5, type: 'a' });
      queue.schedule({ targetId: 'comp-2', scheduledAtTick: 0, readyAtTick: 10, type: 'b' });
      queue.schedule({ targetId: 'comp-3', scheduledAtTick: 0, readyAtTick: 15, type: 'c' });
      queue.schedule({ targetId: 'comp-1', scheduledAtTick: 0, readyAtTick: 25, type: 'd' });

      // Cancel comp-1 (ticks 5, 25) and insert new events
      const newEvents: ScheduledEvent[] = [
        { targetId: 'comp-4', scheduledAtTick: 3, readyAtTick: 8, type: 'e' },
        { targetId: 'comp-1', scheduledAtTick: 3, readyAtTick: 20, type: 'f' },
      ];

      queue.scheduleMany(newEvents, new Set(['comp-1']));

      expect(queue.size()).toBe(4); // comp-2(10), comp-3(15), comp-4(8), comp-1(20)
      const ready = queue.getReadyEvents(100);
      expect(ready.map(e => e.readyAtTick)).toEqual([8, 10, 15, 20]);
    });
  });
});
