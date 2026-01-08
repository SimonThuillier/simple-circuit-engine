/**
 * Unit tests for Position class
 *
 * Tests integer validation, equality checking, and JSON serialization.
 */

import { describe, it, expect } from 'vitest';
import { Position, findPositionBestIndex, simplifyPositions } from 'simple-circuit-engine/core';

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

describe('findPositionBestIndex', () => {
  describe('edge cases', () => {
    it('should return 0 for empty positions array', () => {
      const target = new Position(5, 5);
      expect(findPositionBestIndex([], target)).toBe(0);
    });

    it('should return 1 for single position array', () => {
      const positions = [new Position(0, 0)];
      const target = new Position(5, 5);
      expect(findPositionBestIndex(positions, target)).toBe(1);
    });
  });

  describe('horizontal path', () => {
    it('should find correct index on first segment', () => {
      // Path: (0,0) -> (10,0) -> (20,0)
      const positions = [new Position(0, 0), new Position(10, 0), new Position(20, 0)];
      // Target at (5, 0) - on first segment
      expect(findPositionBestIndex(positions, new Position(5, 0))).toBe(1);
    });

    it('should find correct index on second segment', () => {
      // Path: (0,0) -> (10,0) -> (20,0)
      const positions = [new Position(0, 0), new Position(10, 0), new Position(20, 0)];
      // Target at (15, 0) - on second segment
      expect(findPositionBestIndex(positions, new Position(15, 0))).toBe(2);
    });
  });

  describe('L-shaped path', () => {
    it('should find correct index on horizontal segment', () => {
      // Path: (0,0) -> (10,0) -> (10,10)
      const positions = [new Position(0, 0), new Position(10, 0), new Position(10, 10)];
      // Target at (5, 0) - on horizontal segment
      expect(findPositionBestIndex(positions, new Position(5, 0))).toBe(1);
    });

    it('should find correct index on vertical segment', () => {
      // Path: (0,0) -> (10,0) -> (10,10)
      const positions = [new Position(0, 0), new Position(10, 0), new Position(10, 10)];
      // Target at (10, 5) - on vertical segment
      expect(findPositionBestIndex(positions, new Position(10, 5))).toBe(2);
    });
  });

  describe('complex path', () => {
    it('should find closest segment for off-path target', () => {
      // Path: (0,0) -> (10,0) -> (10,10) -> (20,10)
      const positions = [
        new Position(0, 0),
        new Position(10, 0),
        new Position(10, 10),
        new Position(20, 10),
      ];
      // Target at (5, 1) - closest to first horizontal segment
      expect(findPositionBestIndex(positions, new Position(5, 1))).toBe(1);
    });

    it('should find correct segment at corner', () => {
      // Path: (0,0) -> (10,0) -> (10,10) -> (20,10)
      const positions = [
        new Position(0, 0),
        new Position(10, 0),
        new Position(10, 10),
        new Position(20, 10),
      ];
      // Target at (11, 5) - closest to vertical segment (index 2)
      expect(findPositionBestIndex(positions, new Position(11, 5))).toBe(2);
    });

    it('should find correct segment for last segment', () => {
      // Path: (0,0) -> (10,0) -> (10,10) -> (20,10)
      const positions = [
        new Position(0, 0),
        new Position(10, 0),
        new Position(10, 10),
        new Position(20, 10),
      ];
      // Target at (15, 10) - on last horizontal segment
      expect(findPositionBestIndex(positions, new Position(15, 10))).toBe(3);
    });
  });

  describe('target exactly on positions', () => {
    it('should handle target at segment endpoint', () => {
      const positions = [new Position(0, 0), new Position(10, 0), new Position(20, 0)];
      // Target exactly at middle position - should be on either segment
      const index = findPositionBestIndex(positions, new Position(10, 0));
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(2);
    });
  });
});

describe('simplifyPositions', () => {
  describe('edge cases', () => {
    it('should return empty array for empty input', () => {
      expect(simplifyPositions([])).toEqual([]);
    });

    it('should return single position unchanged', () => {
      const positions = [new Position(5, 5)];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(1);
      expect(result[0]!.equals(new Position(5, 5))).toBe(true);
    });

    it('should return two positions unchanged', () => {
      const positions = [new Position(0, 0), new Position(10, 10)];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 10))).toBe(true);
    });
  });

  describe('horizontal collinear points', () => {
    it('should remove middle collinear point on horizontal line', () => {
      const positions = [
        new Position(0, 0),
        new Position(5, 0), // collinear - should be removed
        new Position(10, 0),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 0))).toBe(true);
    });

    it('should remove all middle collinear points on horizontal line', () => {
      const positions = [
        new Position(0, 0),
        new Position(3, 0), // collinear
        new Position(7, 0), // collinear
        new Position(12, 0), // collinear
        new Position(20, 0),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(20, 0))).toBe(true);
    });
  });

  describe('vertical collinear points', () => {
    it('should remove middle collinear point on vertical line', () => {
      const positions = [
        new Position(5, 0),
        new Position(5, 5), // collinear - should be removed
        new Position(5, 10),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(5, 0))).toBe(true);
      expect(result[1]!.equals(new Position(5, 10))).toBe(true);
    });
  });

  describe('diagonal collinear points', () => {
    it('should remove middle collinear point on diagonal line', () => {
      const positions = [
        new Position(0, 0),
        new Position(5, 5), // collinear - should be removed
        new Position(10, 10),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 10))).toBe(true);
    });

    it('should remove collinear points on steep diagonal', () => {
      const positions = [
        new Position(0, 0),
        new Position(2, 4), // collinear (slope 2)
        new Position(4, 8), // collinear
        new Position(6, 12),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(6, 12))).toBe(true);
    });
  });

  describe('L-shaped path (non-collinear)', () => {
    it('should keep corner point in L-shaped path', () => {
      const positions = [
        new Position(0, 0),
        new Position(10, 0), // corner - NOT collinear
        new Position(10, 10),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(3);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 0))).toBe(true);
      expect(result[2]!.equals(new Position(10, 10))).toBe(true);
    });
  });

  describe('complex paths', () => {
    it('should simplify path with mixed collinear and non-collinear segments', () => {
      // Path: horizontal -> corner -> vertical with redundant points
      const positions = [
        new Position(0, 0),
        new Position(5, 0), // collinear with prev and next horizontal
        new Position(10, 0), // corner - keep
        new Position(10, 5), // collinear with prev and next vertical
        new Position(10, 10),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(3);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 0))).toBe(true);
      expect(result[2]!.equals(new Position(10, 10))).toBe(true);
    });

    it('should preserve zigzag path with no collinear points', () => {
      const positions = [
        new Position(0, 0),
        new Position(5, 5),
        new Position(10, 0),
        new Position(15, 5),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(4);
    });

    it('should handle staircase pattern', () => {
      // Staircase: each segment is either horizontal or vertical, no collinear
      const positions = [
        new Position(0, 0),
        new Position(5, 0), // horizontal end, vertical start
        new Position(5, 5), // vertical end, horizontal start
        new Position(10, 5), // horizontal end, vertical start
        new Position(10, 10),
      ];
      const result = simplifyPositions(positions);
      // All corners should be kept
      expect(result).toHaveLength(5);
    });
  });

  describe('duplicate adjacent positions', () => {
    it('should handle duplicate positions (collinear with themselves)', () => {
      const positions = [
        new Position(0, 0),
        new Position(0, 0), // duplicate - collinear
        new Position(10, 0),
      ];
      const result = simplifyPositions(positions);
      expect(result).toHaveLength(2);
      expect(result[0]!.equals(new Position(0, 0))).toBe(true);
      expect(result[1]!.equals(new Position(10, 0))).toBe(true);
    });
  });
});
