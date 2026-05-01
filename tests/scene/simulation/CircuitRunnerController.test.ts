/**
 * Unit tests for CircuitRunnerController simulation speed feature
 * Feature: 017-simulation-speed
 * @module tests/scene/simulation/CircuitRunnerController.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitRunnerController } from '../../../src/scene/simulation/CircuitRunnerController';
import { FactoryRegistry, DefaultVisualFactory } from '../../../src/scene/shared/components';
import { BehaviorRegistry } from '../../../src/core/simulation/behaviors/BehaviorRegistry';
import { Circuit } from '../../../src/core/topology/Circuit';
import { CircuitOptions } from '../../../src/core/topology/CircuitOptions';
import type { IFactoryRegistry } from '../../../src/scene/shared/components/ComponentVisualFactory';

import { ComponentType, SIMULATION_SPEED } from '../../../src';
import { createMockRenderer } from '../helpers';

/**
 * Create a simple test circuit with a battery and switch
 */
function createTestCircuit(): Circuit {
  const circuit = new Circuit(new CircuitOptions('Test Circuit'));
  const battery = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
  const switchComp = circuit.addComponent(ComponentType.Switch, { x: 2, y: 0 }, 0);

  // Wire battery positive to switch in
  if (battery.pins.length >= 2 && switchComp.pins.length >= 2) {
    circuit.addWire(battery.pins[0], switchComp.pins[0]);
  }

  return circuit;
}

describe('CircuitRunnerController - Simulation Speed (017-simulation-speed)', () => {
  let factoryRegistry: IFactoryRegistry;
  let behaviorRegistry: BehaviorRegistry;
  let container: HTMLDivElement;
  let controller: CircuitRunnerController;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
    behaviorRegistry = new BehaviorRegistry();
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);

    controller = new CircuitRunnerController(factoryRegistry, behaviorRegistry);
    controller.initialize(container, createMockRenderer());
  });

  afterEach(() => {
    if (controller) {
      controller.dispose();
    }
    document.body.removeChild(container);
  });

  // T003: Unit test for simulationSpeed getter/setter
  describe('T003: simulationSpeed getter/setter', () => {
    it('should return default simulation speed', () => {
      expect(controller.simulationSpeed).toBe(SIMULATION_SPEED.DEFAULT_TPS);
    });

    it('should convert between TPS and tickIntervalMs correctly', () => {
      // 2 TPS = 500ms interval
      controller.simulationSpeed = 2;
      expect(controller.tickInterval).toBe(500);

      // 10 TPS = 100ms interval
      controller.simulationSpeed = 10;
      expect(controller.tickInterval).toBe(100);

      // 20 TPS = 50ms interval
      controller.simulationSpeed = 20;
      expect(controller.tickInterval).toBe(50);

      // 1 TPS = 1000ms interval
      controller.simulationSpeed = 1;
      expect(controller.tickInterval).toBe(1000);
    });

    it('should clamp speed to minimum (1 TPS)', () => {
      controller.simulationSpeed = 0;
      expect(controller.simulationSpeed).toBe(SIMULATION_SPEED.MIN_TPS);

      controller.simulationSpeed = -5;
      expect(controller.simulationSpeed).toBe(SIMULATION_SPEED.MIN_TPS);
    });

    it('should clamp speed to maximum (100 TPS)', () => {
      controller.simulationSpeed = 100;
      expect(controller.simulationSpeed).toBe(SIMULATION_SPEED.MAX_TPS);
      controller.simulationSpeed = 1000;
      expect(controller.simulationSpeed).toBe(SIMULATION_SPEED.MAX_TPS);
    });

    it('should take effect immediately during playback', async () => {
      const circuit = createTestCircuit();
      controller.setCircuit(circuit);
      controller.setActive(true);

      // Start playing at default speed
      controller.play();
      expect(controller.isPlaying).toBe(true);

      // Change speed mid-playback
      controller.simulationSpeed = 10;

      // Verify new interval is applied
      expect(controller.tickInterval).toBe(100);
      expect(controller.isPlaying).toBe(true);

      controller.pause();
    });

    it('should not restart interval when not playing', () => {
      const circuit = createTestCircuit();
      controller.setCircuit(circuit);
      controller.setActive(true);

      // Not playing
      expect(controller.isPlaying).toBe(false);

      // Change speed
      controller.simulationSpeed = 15;

      // Should still not be playing
      expect(controller.isPlaying).toBe(false);
      expect(controller.tickInterval).toBeCloseTo(1000 / 15, 0);
    });
  });

  describe('minSimulationSpeed and maxSimulationSpeed properties', () => {
    it('should expose minSimulationSpeed as 1', () => {
      expect(controller.minSimulationSpeed).toBe(SIMULATION_SPEED.MIN_TPS);
    });

    it('should expose maxSimulationSpeed as 20', () => {
      expect(controller.maxSimulationSpeed).toBe(SIMULATION_SPEED.MAX_TPS);
    });
  });

  describe('simulationSpeedChanged event', () => {
    it('should emit simulationSpeedChanged when speed changes', () => {
      const handler = vi.fn();
      controller.on('simulationSpeedChanged', handler);

      controller.simulationSpeed = 10;

      expect(handler).toHaveBeenCalledWith({
        previousSpeed: SIMULATION_SPEED.DEFAULT_TPS,
        newSpeed: 10,
      });
    });

    it('should not emit event when speed is unchanged', () => {
      // First set to a known value
      controller.simulationSpeed = 10;

      const handler = vi.fn();
      controller.on('simulationSpeedChanged', handler);

      // Set to same value
      controller.simulationSpeed = 10;

      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit event with clamped value when out of range', () => {
      const handler = vi.fn();
      controller.on('simulationSpeedChanged', handler);

      controller.simulationSpeed = 100; // Will be clamped to 100

      expect(handler).toHaveBeenCalledWith({
        previousSpeed: SIMULATION_SPEED.DEFAULT_TPS,
        newSpeed: SIMULATION_SPEED.MAX_TPS,
      });
    });
  });

  // T021: Unit test for tickCount computation (US3 dependency on US1)
  describe('T021: tickCount computation helper', () => {
    it('should compute tickCount using formula ceil(transitionUserSpan × simulationSpeed / 1000)', () => {
      const circuit = createTestCircuit();
      controller.setCircuit(circuit);
      controller.setActive(true);

      // Test at 10 TPS with 500ms transition
      controller.simulationSpeed = 10;
      // tickCount = ceil(500 * 10 / 1000) = ceil(5) = 5
      expect(controller.computeTickCount(500)).toBe(5);

      // Test at 20 TPS with 500ms transition
      controller.simulationSpeed = 20;
      // tickCount = ceil(500 * 20 / 1000) = ceil(10) = 10
      expect(controller.computeTickCount(500)).toBe(10);

      // Test at 5 TPS with 200ms transition
      controller.simulationSpeed = 5;
      // tickCount = ceil(200 * 5 / 1000) = ceil(1) = 1
      expect(controller.computeTickCount(200)).toBe(1);
    });

    it('should return minimum of 1 tick', () => {
      controller.simulationSpeed = 1; // Slowest

      // Even with very short transition, should be at least 1
      expect(controller.computeTickCount(0)).toBe(1);
      expect(controller.computeTickCount(50)).toBe(1);
    });

    it('should handle fractional results by ceiling', () => {
      controller.simulationSpeed = 10;
      // tickCount = ceil(150 * 10 / 1000) = ceil(1.5) = 2
      expect(controller.computeTickCount(150)).toBe(2);
    });
  });
});
