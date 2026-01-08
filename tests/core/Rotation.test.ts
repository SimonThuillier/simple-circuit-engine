/**
 * Unit tests for Rotation class
 *
 * Tests integer validation, equality checking, and JSON serialization.
 */

import { describe, it, expect } from 'vitest';
import { Rotation } from 'simple-circuit-engine/core';

describe('Rotation', () => {
  describe('constructor', () => {
    it('should create rotation with integer angle', () => {
      const rot = new Rotation(90);
      expect(rot.angle).toBe(90);
    });

    it('should accept negative angles', () => {
      const rot = new Rotation(-45);
      expect(rot.angle).toBe(-45);
    });

    it('should accept zero angle', () => {
      const rot = new Rotation(0);
      expect(rot.angle).toBe(0);
    });

    it('should accept angles > 360', () => {
      const rot = new Rotation(450);
      expect(rot.angle).toBe(450);
    });

    it('should throw TypeError for non-integer angle', () => {
      expect(() => new Rotation(45.5)).toThrow(TypeError);
      expect(() => new Rotation(45.5)).toThrow(/must be an integer/);
    });

    it('should throw TypeError for NaN', () => {
      expect(() => new Rotation(NaN)).toThrow(TypeError);
    });

    it('should throw TypeError for Infinity', () => {
      expect(() => new Rotation(Infinity)).toThrow(TypeError);
      expect(() => new Rotation(-Infinity)).toThrow(TypeError);
    });
  });

  describe('equals()', () => {
    it('should return true for equal angles', () => {
      const r1 = new Rotation(90);
      const r2 = new Rotation(90);
      expect(r1.equals(r2)).toBe(true);
    });

    it('should return false for different angles', () => {
      const r1 = new Rotation(90);
      const r2 = new Rotation(180);
      expect(r1.equals(r2)).toBe(false);
    });

    it('should work with negative angles', () => {
      const r1 = new Rotation(-45);
      const r2 = new Rotation(-45);
      expect(r1.equals(r2)).toBe(true);
    });

    it('should work with zero', () => {
      const r1 = new Rotation(0);
      const r2 = new Rotation(0);
      expect(r1.equals(r2)).toBe(true);
    });
  });

  describe('toJSON()', () => {
    it('should serialize to number', () => {
      const rot = new Rotation(90);
      const json = rot.toJSON();
      expect(json).toBe(90);
    });

    it('should serialize negative angles', () => {
      const rot = new Rotation(-45);
      expect(rot.toJSON()).toBe(-45);
    });

    it('should serialize zero', () => {
      const rot = new Rotation(0);
      expect(rot.toJSON()).toBe(0);
    });
  });

  describe('fromJSON()', () => {
    it('should deserialize from number', () => {
      const rot = Rotation.fromJSON(90);
      expect(rot.angle).toBe(90);
    });

    it('should throw for non-integer', () => {
      expect(() => Rotation.fromJSON(45.5)).toThrow(TypeError);
    });

    it('should roundtrip correctly', () => {
      const original = new Rotation(180);
      const json = original.toJSON();
      const restored = Rotation.fromJSON(json);
      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should return formatted string', () => {
      const rot = new Rotation(90);
      expect(rot.toString()).toBe('Rotation(90°)');
    });

    it('should format negative angles', () => {
      const rot = new Rotation(-45);
      expect(rot.toString()).toBe('Rotation(-45°)');
    });

    it('should format zero', () => {
      const rot = new Rotation(0);
      expect(rot.toString()).toBe('Rotation(0°)');
    });
  });

  describe('common angles', () => {
    it('should support 0, 90, 180, 270 degrees', () => {
      const angles = [0, 90, 180, 270];
      for (const angle of angles) {
        const rot = new Rotation(angle);
        expect(rot.angle).toBe(angle);
      }
    });

    it('should support 45-degree increments', () => {
      const angles = [45, 135, 225, 315];
      for (const angle of angles) {
        const rot = new Rotation(angle);
        expect(rot.angle).toBe(angle);
      }
    });
  });

  describe('immutability', () => {
    it('should have readonly angle', () => {
      const rot = new Rotation(90);
      // TypeScript compile-time check, runtime test just verifies value
      expect(rot.angle).toBe(90);
    });
  });
});
