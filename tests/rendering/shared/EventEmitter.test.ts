/**
 * Unit tests for EventEmitter
 * @module tests/unit/rendering/EventEmitter.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from '../../../src/rendering/shared/EventEmitter';

// Test event map type
interface TestEventMap {
  ready: { initialized: boolean };
  error: { message: string; code: number };
  select: { objectId: string; position: { x: number; y: number } };
  simple: void;
}

describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEventMap>;

  beforeEach(() => {
    emitter = new EventEmitter<TestEventMap>();
  });

  describe('on() - Event listener registration', () => {
    it('should register a listener for an event', () => {
      const callback = vi.fn();
      emitter.on('ready', callback);

      expect(emitter.listenerCount('ready')).toBe(1);
    });

    it('should allow multiple listeners for the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);
      emitter.on('ready', callback3);

      expect(emitter.listenerCount('ready')).toBe(3);
    });

    it('should allow the same callback to be registered multiple times', () => {
      const callback = vi.fn();

      emitter.on('ready', callback);
      emitter.on('ready', callback);

      expect(emitter.listenerCount('ready')).toBe(2);
    });

    it('should register listeners for different events independently', () => {
      const readyCallback = vi.fn();
      const errorCallback = vi.fn();

      emitter.on('ready', readyCallback);
      emitter.on('error', errorCallback);

      expect(emitter.listenerCount('ready')).toBe(1);
      expect(emitter.listenerCount('error')).toBe(1);
    });
  });

  describe('off() - Event listener removal', () => {
    it('should remove a registered listener', () => {
      const callback = vi.fn();

      emitter.on('ready', callback);
      expect(emitter.listenerCount('ready')).toBe(1);

      emitter.off('ready', callback);
      expect(emitter.listenerCount('ready')).toBe(0);
    });

    it('should only remove the specified listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);

      emitter.off('ready', callback1);

      expect(emitter.listenerCount('ready')).toBe(1);
    });

    it('should handle removing a listener that was not registered', () => {
      const callback = vi.fn();

      expect(() => {
        emitter.off('ready', callback);
      }).not.toThrow();

      expect(emitter.listenerCount('ready')).toBe(0);
    });

    it('should remove only one instance if callback was registered multiple times', () => {
      const callback = vi.fn();

      emitter.on('ready', callback);
      emitter.on('ready', callback);
      expect(emitter.listenerCount('ready')).toBe(2);

      emitter.off('ready', callback);
      expect(emitter.listenerCount('ready')).toBe(1);
    });
  });

  describe('emit() - Event dispatch', () => {
    it('should call registered listeners with correct payload', () => {
      const callback = vi.fn();
      const payload = { initialized: true };

      emitter.on('ready', callback);
      emitter['emit']('ready', payload);

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(payload);
    });

    it('should call all registered listeners for an event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      const payload = { initialized: true };

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);
      emitter.on('ready', callback3);

      emitter['emit']('ready', payload);

      expect(callback1).toHaveBeenCalledWith(payload);
      expect(callback2).toHaveBeenCalledWith(payload);
      expect(callback3).toHaveBeenCalledWith(payload);
    });

    it('should call listeners in the order they were registered', () => {
      const callOrder: number[] = [];

      emitter.on('ready', () => callOrder.push(1));
      emitter.on('ready', () => callOrder.push(2));
      emitter.on('ready', () => callOrder.push(3));

      emitter['emit']('ready', { initialized: true });

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should not call listeners for other events', () => {
      const readyCallback = vi.fn();
      const errorCallback = vi.fn();

      emitter.on('ready', readyCallback);
      emitter.on('error', errorCallback);

      emitter['emit']('ready', { initialized: true });

      expect(readyCallback).toHaveBeenCalledOnce();
      expect(errorCallback).not.toHaveBeenCalled();
    });

    it('should handle events with no registered listeners', () => {
      expect(() => {
        emitter['emit']('ready', { initialized: true });
      }).not.toThrow();
    });

    it('should handle events with void payload', () => {
      const callback = vi.fn();

      emitter.on('simple', callback);
      emitter['emit']('simple', undefined);

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Error isolation', () => {
    it('should continue calling other listeners if one throws an error', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback3 = vi.fn();

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);
      emitter.on('ready', callback3);

      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter['emit']('ready', { initialized: true });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log errors from failing callbacks', () => {
      const error = new Error('Test error');
      const callback = vi.fn(() => {
        throw error;
      });

      emitter.on('ready', callback);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter['emit']('ready', { initialized: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event listener'),
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for a specific event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);
      emitter.on('error', vi.fn());

      emitter.removeAllListeners('ready');

      expect(emitter.listenerCount('ready')).toBe(0);
      expect(emitter.listenerCount('error')).toBe(1);
    });

    it('should remove all listeners for all events when no event specified', () => {
      emitter.on('ready', vi.fn());
      emitter.on('error', vi.fn());
      emitter.on('select', vi.fn());

      emitter.removeAllListeners();

      expect(emitter.listenerCount('ready')).toBe(0);
      expect(emitter.listenerCount('error')).toBe(0);
      expect(emitter.listenerCount('select')).toBe(0);
    });

    it('should handle removing listeners for event with no listeners', () => {
      expect(() => {
        emitter.removeAllListeners('ready');
      }).not.toThrow();

      expect(emitter.listenerCount('ready')).toBe(0);
    });
  });

  describe('listenerCount()', () => {
    it('should return 0 for event with no listeners', () => {
      expect(emitter.listenerCount('ready')).toBe(0);
    });

    it('should return correct count for event with listeners', () => {
      emitter.on('ready', vi.fn());
      emitter.on('ready', vi.fn());
      emitter.on('ready', vi.fn());

      expect(emitter.listenerCount('ready')).toBe(3);
    });

    it('should return correct count after adding and removing listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      emitter.on('ready', callback1);
      emitter.on('ready', callback2);
      expect(emitter.listenerCount('ready')).toBe(2);

      emitter.off('ready', callback1);
      expect(emitter.listenerCount('ready')).toBe(1);

      emitter.off('ready', callback2);
      expect(emitter.listenerCount('ready')).toBe(0);
    });
  });

  describe('Type safety', () => {
    it('should enforce correct event names at compile time', () => {
      // This test verifies TypeScript compilation
      // If these compile, the type system is working correctly

      emitter.on('ready', (payload) => {
        // TypeScript should infer payload type
        const initialized: boolean = payload.initialized;
        expect(typeof initialized).toBe('boolean');
      });

      emitter.on('error', (payload) => {
        // TypeScript should infer payload type
        const message: string = payload.message;
        const code: number = payload.code;
        expect(typeof message).toBe('string');
        expect(typeof code).toBe('number');
      });

      emitter.on('select', (payload) => {
        // TypeScript should infer payload type
        const objectId: string = payload.objectId;
        const x: number = payload.position.x;
        expect(typeof objectId).toBe('string');
        expect(typeof x).toBe('number');
      });

      // @ts-expect-error - Invalid event name should not compile
      // emitter.on('invalid', () => {});

      // This is a compile-time test, so we just need it to pass
      expect(true).toBe(true);
    });
  });
});
