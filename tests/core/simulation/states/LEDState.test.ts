/**
 * Unit tests for LEDState
 * @module tests/core/simulation/states
 */

import { describe, it, expect } from 'vitest';
import { LEDState } from '@/core/simulation/states/LEDState.js';
import { generateUUID } from '@/core/types/Identifier.js';

describe('LEDState', () => {
  describe('constructor', () => {
    it('should create LED state with defaults', () => {
      const componentId = generateUUID();
      const state = new LEDState(componentId);

      expect(state.componentId).toBe(componentId);
      expect(state.state).toBe('off');
      expect(state.color).toBe('red');
      expect(state.transitionStartTick).toBeNull();
      expect(state.delayCounter).toBe(0);
    });

    it('should create LED state with custom color', () => {
      const componentId = generateUUID();
      const state = new LEDState(componentId, 'blue');

      expect(state.color).toBe('blue');
      expect(state.state).toBe('off');
    });

    it('should create LED state with custom initial state', () => {
      const componentId = generateUUID();
      const state = new LEDState(componentId, 'green', 'on');

      expect(state.color).toBe('green');
      expect(state.state).toBe('on');
    });

    it('should accept all parameters', () => {
      const componentId = generateUUID();
      const state = new LEDState(componentId, 'yellow', 'off');

      expect(state.componentId).toBe(componentId);
      expect(state.color).toBe('yellow');
      expect(state.state).toBe('off');
    });
  });

  describe('properties', () => {
    it('should have readonly color', () => {
      const state = new LEDState(generateUUID(), 'red');

      // TypeScript enforces readonly at compile time
      expect(state.color).toBe('red');
    });

    it('should inherit ComponentState properties', () => {
      const componentId = generateUUID();
      const state = new LEDState(componentId, 'red', 'off');

      expect(state.componentId).toBe(componentId);
      expect(state.state).toBeDefined();
      expect(state.transitionStartTick).toBeDefined();
      expect(state.delayCounter).toBeDefined();
    });
  });

  describe('color values', () => {
    it('should accept various color names', () => {
      expect(new LEDState(generateUUID(), 'red').color).toBe('red');
      expect(new LEDState(generateUUID(), 'green').color).toBe('green');
      expect(new LEDState(generateUUID(), 'blue').color).toBe('blue');
      expect(new LEDState(generateUUID(), 'yellow').color).toBe('yellow');
      expect(new LEDState(generateUUID(), 'white').color).toBe('white');
    });

    it('should accept hex color codes', () => {
      const state = new LEDState(generateUUID(), '#FF0000');

      expect(state.color).toBe('#FF0000');
    });
  });

  describe('state values', () => {
    it('should accept "on" state', () => {
      const state = new LEDState(generateUUID(), 'red', 'on');

      expect(state.state).toBe('on');
    });

    it('should accept "off" state', () => {
      const state = new LEDState(generateUUID(), 'red', 'off');

      expect(state.state).toBe('off');
    });

    it('should default to "off" when not specified', () => {
      const state = new LEDState(generateUUID(), 'red');

      expect(state.state).toBe('off');
    });
  });
});
