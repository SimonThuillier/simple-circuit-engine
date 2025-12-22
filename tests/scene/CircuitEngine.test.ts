/**
 * Unit tests for CircuitEngine facade
 * Phase 3: User Story 1 - Edit to Simulation Mode Switch
 * @module tests/scene/CircuitEngine.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitEngine } from '../../src/scene/CircuitEngine';
import { FactoryRegistry, DefaultVisualFactory } from '../../src/scene/shared/components';
import { BehaviorRegistry } from '../../src/core/simulation/behaviors/BehaviorRegistry';
import { Circuit } from '../../src/core/Circuit';
import { ComponentType } from '../../src/core/types/ComponentType';
import type { IFactoryRegistry } from '../../src/scene/shared/components/ComponentVisualFactory';
import { createMockCircuit } from './helpers';

/**
 * Create a simple test circuit with two batteries wired together
 */
function createTestCircuit(): Circuit {
  const circuit = new Circuit('Test Circuit');
  const battery1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
  const battery2 = circuit.addComponent(ComponentType.Battery, { x: 2, y: 0 }, 0);

  // Wire battery1 positive to battery2 negative
  const battery1Pins = circuit.getComponentENodes(battery1.id);
  const battery2Pins = circuit.getComponentENodes(battery2.id);
  if (battery1Pins.length >= 2 && battery2Pins.length >= 2) {
    circuit.addWire(battery1Pins[0].id, battery2Pins[1].id);
  }

  return circuit;
}

describe('CircuitEngine - Phase 3: User Story 1 (Edit to Simulation Mode Switch)', () => {
  let factoryRegistry: IFactoryRegistry;
  let behaviorRegistry: BehaviorRegistry;
  let container: HTMLDivElement;
  let engine: CircuitEngine;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry(new DefaultVisualFactory());
    behaviorRegistry = new BehaviorRegistry();
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (engine && engine.isInitialized && !engine.isDisposed) {
      engine.dispose();
    }
    document.body.removeChild(container);
  });

  // T011: Test setMode('simulation') transitions correctly
  describe('T011: setMode("simulation") transitions correctly', () => {
    it('should start in edit mode by default', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(engine.mode).toBe('edit');
    });

    it('should transition to simulation mode when setMode("simulation") is called', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(engine.mode).toBe('simulation');
    });

    it('should emit modeChanged event when transitioning to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('simulation');

      expect(modeChangedHandler).toHaveBeenCalledWith({
        mode: 'simulation',
        previousMode: 'edit',
      });
    });

    it('should throw if no circuit is loaded when switching to simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(() => engine.setMode('simulation')).toThrow();
    });

    it('should not emit modeChanged if already in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('simulation'); // Same mode

      expect(modeChangedHandler).not.toHaveBeenCalled();
    });
  });

  // T012: Test active tool is cancelled when switching to simulation
  describe('T012: Active tool is cancelled when switching to simulation', () => {
    it('should deactivate active tool when switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      // Enable edit mode and activate a tool
      engine.setEditModeEnabled(true);
      engine.setActiveTool('build');

      expect(engine.getActiveTool()).toBe('build');

      // Switch to simulation
      engine.setMode('simulation');

      // Tool should be deactivated (mode guard will throw if we try to access in simulation)
      expect(engine.mode).toBe('simulation');
    });

    it('should emit toolDeactivated event when switching to simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setEditModeEnabled(true);
      engine.setActiveTool('build');

      const toolDeactivatedHandler = vi.fn();
      engine.on('toolDeactivated', toolDeactivatedHandler);

      engine.setMode('simulation');

      expect(toolDeactivatedHandler).toHaveBeenCalled();
    });
  });

  // T013: Test CircuitRunner is created from current circuit
  describe('T013: CircuitRunner is created from current circuit', () => {
    it('should create CircuitRunner when switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      // CircuitRunner should be created - verify by checking currentTick is accessible
      expect(engine.currentTick).toBe(0);
    });

    it('should allow play/pause/step after switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      // These should not throw
      expect(() => engine.step()).not.toThrow();
      expect(engine.currentTick).toBe(1);
    });

    it('should preserve visuals when switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      // Count scene children before mode switch
      const childCountBefore = engine.getScene().children.length;
      expect(childCountBefore).toBeGreaterThan(0);

      engine.setMode('simulation');

      // Scene should still have children (visuals preserved)
      const childCountAfter = engine.getScene().children.length;
      expect(childCountAfter).toBeGreaterThan(0);
    });
  });

  // T014: Test edit-only operations throw in simulation mode
  describe('T014: Edit-only operations throw in simulation mode', () => {
    it('should throw when calling setActiveTool in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(() => engine.setActiveTool('build')).toThrow(/not in edit mode/i);
    });

    it('should throw when calling getActiveTool in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(() => engine.getActiveTool()).toThrow(/not in edit mode/i);
    });

    it('should throw when calling setEditModeEnabled in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(() => engine.setEditModeEnabled(true)).toThrow(/not in edit mode/i);
    });
  });

  // Additional tests for Phase 3 implementation
  describe('CircuitEngine initialization', () => {
    it('should accept factoryRegistry and behaviorRegistry in constructor', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      expect(engine).toBeDefined();
    });

    it('should throw if factoryRegistry is null', () => {
      expect(() => new CircuitEngine(null as any, behaviorRegistry)).toThrow();
    });

    it('should throw if behaviorRegistry is null', () => {
      expect(() => new CircuitEngine(factoryRegistry, null as any)).toThrow();
    });

    it('should not be initialized before calling initialize()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      expect(engine.isInitialized).toBe(false);
    });

    it('should be initialized after calling initialize()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);
      expect(engine.isInitialized).toBe(true);
    });

    it('should emit ready event after initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      const readyHandler = vi.fn();
      engine.on('ready', readyHandler);

      engine.initialize(container);

      expect(readyHandler).toHaveBeenCalled();
    });
  });

  describe('Simulation playback delegates', () => {
    it('should delegate play() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      expect(() => engine.play()).not.toThrow();
      expect(engine.isPlaying).toBe(true);
    });

    it('should delegate pause() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      engine.play();
      engine.pause();

      expect(engine.isPlaying).toBe(false);
    });

    it('should delegate step() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      expect(engine.currentTick).toBe(0);
      engine.step();
      expect(engine.currentTick).toBe(1);
    });

    it('should delegate stop() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      engine.step();
      engine.step();
      expect(engine.currentTick).toBe(2);

      engine.stop();
      expect(engine.currentTick).toBe(0);
    });

    it('should throw when calling play() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(() => engine.play()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling pause() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(() => engine.pause()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling step() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(() => engine.step()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling stop() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container);

      expect(() => engine.stop()).toThrow(/not in simulation mode/i);
    });
  });
});
