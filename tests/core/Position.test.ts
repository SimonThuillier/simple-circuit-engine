/**
 * Unit tests for Position class
 *
 * Tests integer validation, equality checking, and JSON serialization.
 */

import { describe, it, expect } from 'vitest';
import { Position } from '@/core/types/Position';

describe('Position', () => {
  describe('constructor', () => {
    it('should create position with integer coordinates', () => {
      const pos = new Position(10, 20);
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
    });

    it('should accept negative integers', () => {
      const pos = new Position(-5, -10);
      expect(pos.x).toBe(-5);
      expect(pos.y).toBe(-10);
    });

    it('should accept zero coordinates', () => {
      const pos = new Position(0, 0);
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('should throw TypeError for non-integer x coordinate', () => {
      expect(() => new Position(10.5, 20)).toThrow(TypeError);
      expect(() => new Position(10.5, 20)).toThrow(/must be integers/);
    });

    it('should throw TypeError for non-integer y coordinate', () => {
      expect(() => new Position(10, 20.7)).toThrow(TypeError);
      expect(() => new Position(10, 20.7)).toThrow(/must be integers/);
    });

    it('should throw TypeError for both non-integer coordinates', () => {
      expect(() => new Position(10.5, 20.7)).toThrow(TypeError);
    });

    it('should throw TypeError for NaN coordinates', () => {
      expect(() => new Position(NaN, 20)).toThrow(TypeError);
      expect(() => new Position(10, NaN)).toThrow(TypeError);
    });

    it('should throw TypeError for Infinity coordinates', () => {
      expect(() => new Position(Infinity, 20)).toThrow(TypeError);
      expect(() => new Position(10, -Infinity)).toThrow(TypeError);
    });
  });

  describe('equals()', () => {
    it('should return true for equal positions', () => {
      const p1 = new Position(10, 20);
      const p2 = new Position(10, 20);
      expect(p1.equals(p2)).toBe(true);
    });

    it('should return false for different x coordinates', () => {
      const p1 = new Position(10, 20);
      const p2 = new Position(15, 20);
      expect(p1.equals(p2)).toBe(false);
    });

    it('should return false for different y coordinates', () => {
      const p1 = new Position(10, 20);
      const p2 = new Position(10, 25);
      expect(p1.equals(p2)).toBe(false);
    });

    it('should return false for different coordinates', () => {
      const p1 = new Position(10, 20);
      const p2 = new Position(15, 25);
      expect(p1.equals(p2)).toBe(false);
    });

    it('should work with negative coordinates', () => {
      const p1 = new Position(-10, -20);
      const p2 = new Position(-10, -20);
      expect(p1.equals(p2)).toBe(true);
    });
  });

  describe('toJSON()', () => {
    it('should serialize to plain object', () => {
      const pos = new Position(10, 20);
      const json = pos.toJSON();
      expect(json).toEqual({ x: 10, y: 20 });
    });

    it('should serialize negative coordinates', () => {
      const pos = new Position(-5, -10);
      const json = pos.toJSON();
      expect(json).toEqual({ x: -5, y: -10 });
    });

    it('should serialize zero coordinates', () => {
      const pos = new Position(0, 0);
      const json = pos.toJSON();
      expect(json).toEqual({ x: 0, y: 0 });
    });
  });

  describe('fromJSON()', () => {
    it('should deserialize from plain object', () => {
      const json = { x: 10, y: 20 };
      const pos = Position.fromJSON(json);
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
    });

    it('should throw for non-integer coordinates in JSON', () => {
      expect(() => Position.fromJSON({ x: 10.5, y: 20 })).toThrow(TypeError);
    });

    it('should roundtrip correctly', () => {
      const original = new Position(15, 25);
      const json = original.toJSON();
      const restored = Position.fromJSON(json);
      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return formatted string', () => {
      const pos = new Position(10, 20);
      expect(pos.toString()).toBe('Position(10, 20)');
    });

    it('should format negative coordinates', () => {
      const pos = new Position(-5, -10);
      expect(pos.toString()).toBe('Position(-5, -10)');
    });
  });

  describe('immutability', () => {
    it('should have readonly x coordinate', () => {
      const pos = new Position(10, 20);
      // TypeScript compile-time check, runtime test just verifies value
      expect(pos.x).toBe(10);
    });

    it('should have readonly y coordinate', () => {
      const pos = new Position(10, 20);
      expect(pos.y).toBe(20);
    });
  });
});
