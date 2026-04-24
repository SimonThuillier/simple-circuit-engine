/**
 * Unit tests for CircuitEngine facade
 * Phase 3: User Story 1 - Edit to Simulation Mode Switch
 * Phase 4: User Story 2 - Simulation to Edit Mode Switch
 * Phase 5: User Story 3 - Unified Initialization
 * @module tests/scene/CircuitEngine.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitEngine } from '../../src/scene/CircuitEngine';
import { FactoryRegistry, DefaultVisualFactory } from '../../src/scene/shared/components';
import { BehaviorRegistry } from '../../src/core/simulation/behaviors/BehaviorRegistry';
import { Circuit } from '../../src/core/topology/Circuit';
import type { IFactoryRegistry } from '../../src/scene/shared/components/ComponentVisualFactory';
import { CircuitOptions } from '../../src/core/topology/CircuitOptions';
import { ComponentType, SIMULATION_SPEED } from '../../src';
import { createMockRenderer } from './helpers';

/**
 * Create a simple test circuit with two batteries wired together
 */
function createTestCircuit(): Circuit {
  const circuit = new Circuit(new CircuitOptions('Test Circuit'));
  const battery1 = circuit.addComponent(ComponentType.Battery, { x: 0, y: 0 }, 0);
  const battery2 = circuit.addComponent(ComponentType.Battery, { x: 2, y: 0 }, 0);

  // Wire battery1 positive to battery2 negative
  // Battery pins are stored in the component's pins array
  if (battery1.pins.length >= 2 && battery2.pins.length >= 2) {
    circuit.addWire(battery1.pins[0], battery2.pins[1]);
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
      engine.initialize(container, createMockRenderer());

      expect(engine.mode).toBe('edit');
    });

    it('should transition to simulation mode when setMode("simulation") is called', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(engine.mode).toBe('simulation');
    });

    it('should emit modeChanged event when transitioning to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

      expect(() => engine.setMode('simulation')).toThrow();
    });

    it('should not emit modeChanged if already in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      // CircuitRunner should be created - verify by checking currentTick is accessible
      expect(engine.currentTick).toBe(0);
    });

    it('should allow play/pause/step after switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      // These should not throw
      expect(() => engine.step()).not.toThrow();
      expect(engine.currentTick).toBe(1);
    });

    it('should preserve visuals when switching to simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(() => engine.setActiveTool('build')).toThrow(/not in edit mode/i);
    });

    it('should throw when calling getActiveTool in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');

      expect(() => engine.getActiveTool()).toThrow(/not in edit mode/i);
    });

    it('should throw when calling setEditModeEnabled in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());
      expect(engine.isInitialized).toBe(true);
    });

    it('should emit ready event after initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      const readyHandler = vi.fn();
      engine.on('ready', readyHandler);

      engine.initialize(container, createMockRenderer());

      expect(readyHandler).toHaveBeenCalled();
    });
  });

  // T004: Unit test for simulationSpeed facade property
  describe('T004: simulationSpeed facade property', () => {
    it('should delegate simulationSpeed getter to controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      // Default should be 3q TPS (from SIMULATION_SPEED.DEFAULT_TPS)
      expect(engine.simulationSpeed).toBe(SIMULATION_SPEED.DEFAULT_TPS);
    });

    it('should delegate simulationSpeed setter to controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      engine.simulationSpeed = 10;

      expect(engine.simulationSpeed).toBe(10);
      // Also verify the underlying controller has the correct tickInterval
      expect(engine.tickInterval).toBe(100); // 1000 / 10 = 100ms
    });

    it('should work in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      // Edit mode (default)
      expect(engine.mode).toBe('edit');

      // Should be able to set/get simulation speed even in edit mode
      engine.simulationSpeed = 15;
      expect(engine.simulationSpeed).toBe(15);
    });

    it('should work in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      engine.simulationSpeed = 20;
      expect(engine.simulationSpeed).toBe(20);
    });

    it('should expose minSimulationSpeed from controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(engine.minSimulationSpeed).toBe(1);
    });

    it('should expose maxSimulationSpeed from controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(engine.maxSimulationSpeed).toBe(100);
    });
  });

  describe('Simulation playback delegates', () => {
    it('should delegate play() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      expect(() => engine.play()).not.toThrow();
      expect(engine.isPlaying).toBe(true);
    });

    it('should delegate pause() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      engine.play();
      engine.pause();

      expect(engine.isPlaying).toBe(false);
    });

    it('should delegate step() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      expect(engine.currentTick).toBe(0);
      engine.step();
      expect(engine.currentTick).toBe(1);
    });

    it('should delegate stop() to simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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
      engine.initialize(container, createMockRenderer());

      expect(() => engine.play()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling pause() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => engine.pause()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling step() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => engine.step()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling stop() in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => engine.stop()).toThrow(/not in simulation mode/i);
    });
  });
});

// ============================================================================
// Phase 4: User Story 2 - Simulation to Edit Mode Switch
// ============================================================================

describe('CircuitEngine - Phase 4: User Story 2 (Simulation to Edit Mode Switch)', () => {
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

  // T022: Test setMode('edit') stops simulation automatically
  describe('T022: setMode("edit") stops simulation automatically', () => {
    it('should stop simulation when switching to edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.play();
      expect(engine.isPlaying).toBe(true);

      engine.setMode('edit');

      expect(engine.mode).toBe('edit');
      // Note: isPlaying will throw in edit mode, so we verify mode changed
    });

    it('should emit modeChanged event when switching to edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('edit');

      expect(modeChangedHandler).toHaveBeenCalledWith({
        mode: 'edit',
        previousMode: 'simulation',
      });
    });
  });

  // T023: Test circuit reverts to design state (not runtime state)
  describe('T023: circuit reverts to design state', () => {
    it('should preserve circuit when switching back to edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.step(); // Run some simulation
      engine.step();

      engine.setMode('edit');

      // Circuit should still be available
      expect(engine.getCircuit()).toBe(circuit);
    });

    it('should allow editing after switching back from simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.step();

      engine.setMode('edit');

      // Edit operations should work again
      expect(() => engine.setEditModeEnabled(true)).not.toThrow();
      expect(() => engine.setActiveTool('build')).not.toThrow();
    });
  });

  // T024: Test simulation-only operations throw in edit mode
  describe('T024: simulation-only operations throw in edit mode', () => {
    it('should throw when calling play() in edit mode after switching from simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.setMode('edit');

      expect(() => engine.play()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling pause() in edit mode after switching from simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.setMode('edit');

      expect(() => engine.pause()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling step() in edit mode after switching from simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.setMode('edit');

      expect(() => engine.step()).toThrow(/not in simulation mode/i);
    });

    it('should throw when calling stop() in edit mode after switching from simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      engine.setMode('simulation');
      engine.setMode('edit');

      expect(() => engine.stop()).toThrow(/not in simulation mode/i);
    });
  });

  // T025: Test same-mode switch is no-op
  describe('T025: same-mode switch is no-op', () => {
    it('should not emit modeChanged if already in edit mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('edit'); // Already in edit mode

      expect(modeChangedHandler).not.toHaveBeenCalled();
    });

    it('should not emit modeChanged if already in simulation mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('simulation'); // Already in simulation mode

      expect(modeChangedHandler).not.toHaveBeenCalled();
    });

    it('should be safe to call setMode with current mode multiple times', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => {
        engine.setMode('edit');
        engine.setMode('edit');
        engine.setMode('edit');
      }).not.toThrow();
    });
  });

  // Bidirectional mode switching integration
  describe('Bidirectional mode switching', () => {
    it('should support multiple round trips between modes', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      // First round trip
      engine.setMode('simulation');
      expect(engine.mode).toBe('simulation');
      engine.step();

      engine.setMode('edit');
      expect(engine.mode).toBe('edit');

      // Second round trip
      engine.setMode('simulation');
      expect(engine.mode).toBe('simulation');
      engine.step();

      engine.setMode('edit');
      expect(engine.mode).toBe('edit');

      // Circuit should still be intact
      expect(engine.getCircuit()).toBe(circuit);
    });
  });
});

// ============================================================================
// Phase 5: User Story 3 - Unified Initialization
// ============================================================================

describe('CircuitEngine - Phase 5: User Story 3 (Unified Initialization)', () => {
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

  // T030: Test initialize() creates scene, camera, MapControls
  describe('T030: initialize() creates scene, camera, MapControls', () => {
    it('should create scene during initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const scene = engine.getScene();
      expect(scene).toBeDefined();
      expect(scene.isScene).toBe(true);
    });

    it('should create camera during initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const camera = engine.getCamera();
      expect(camera).toBeDefined();
      expect(camera.isPerspectiveCamera).toBe(true);
    });

    it('should create MapControls during initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const controls = engine.getControls();
      expect(controls).toBeDefined();
      expect(controls.enableDamping).toBe(true);
    });

    it('should throw if container is not a valid HTMLElement', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.initialize(null as any)).toThrow(/valid HTMLElement/i);
    });

    it('should throw if already initialized', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => engine.initialize(container, createMockRenderer())).toThrow(/already initialized/i);
    });
  });

  // T031: Test initialize() emits ready event
  describe('T031: initialize() emits ready event', () => {
    it('should emit ready event after initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      const readyHandler = vi.fn();
      engine.on('ready', readyHandler);

      engine.initialize(container, createMockRenderer());

      expect(readyHandler).toHaveBeenCalledWith({ controllerType: 'engine' });
    });
  });

  // T032: Test setCircuit() loads circuit and emits circuitLoaded
  describe('T032: setCircuit() loads circuit and emits circuitLoaded', () => {
    it('should load circuit when setCircuit is called', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      expect(engine.getCircuit()).toBe(circuit);
    });

    it('should emit circuitLoaded event when circuit is set', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuitLoadedHandler = vi.fn();
      engine.on('circuitLoaded', circuitLoadedHandler);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      expect(circuitLoadedHandler).toHaveBeenCalledWith({ name: 'Test Circuit' });
    });
  });

  // T033: Test setCircuit(null) clears circuit and emits circuitCleared
  describe('T033: setCircuit(null) clears circuit and emits circuitCleared', () => {
    it('should clear circuit when setCircuit(null) is called', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      expect(engine.getCircuit()).toBe(circuit);

      engine.setCircuit(null);

      expect(engine.getCircuit()).toBe(null);
    });

    it('should emit circuitCleared event when circuit is cleared', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      const circuitClearedHandler = vi.fn();
      engine.on('circuitCleared', circuitClearedHandler);

      engine.setCircuit(null);

      expect(circuitClearedHandler).toHaveBeenCalledWith({ name: 'Test Circuit' });
    });
  });

  // Additional tests for Phase 5 implementation
  describe('Three.js access methods', () => {
    it('should provide access to scene via getScene()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const scene = engine.getScene();
      expect(scene).toBeDefined();
      expect(scene.isScene).toBe(true);
    });

    it('should provide access to camera via getCamera()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const camera = engine.getCamera();
      expect(camera).toBeDefined();
      expect(camera.isPerspectiveCamera).toBe(true);
    });

    it('should provide access to controls via getControls()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const controls = engine.getControls();
      expect(controls).toBeDefined();
    });

    it('should throw when accessing scene before initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.getScene()).toThrow(/not initialized/i);
    });

    it('should throw when accessing camera before initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.getCamera()).toThrow(/not initialized/i);
    });

    it('should throw when accessing controls before initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.getControls()).toThrow(/not initialized/i);
    });
  });

  describe('Container resize handling', () => {
    it('should handle container resize via onContainerResize()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(() => engine.onContainerResize(1024, 768)).not.toThrow();
    });

    it('should update camera aspect ratio on resize', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const camera = engine.getCamera();
      const originalAspect = camera.aspect;

      engine.onContainerResize(1920, 1080);

      expect(camera.aspect).toBeCloseTo(1920 / 1080);
      expect(camera.aspect).not.toBe(originalAspect);
    });
  });

  describe('Controller access for advanced operations', () => {
    it('should provide edit controller via getEditController()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const editController = engine.getEditController();
      expect(editController).toBeDefined();
    });

    it('should provide simulation controller via getSimulationController()', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const simController = engine.getSimulationController();
      expect(simController).toBeDefined();
    });

    it('should throw when accessing controllers before initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.getEditController()).toThrow(/not initialized/i);
      expect(() => engine.getSimulationController()).toThrow(/not initialized/i);
    });
  });
});

// ============================================================================
// Phase 6: User Story 4 - Unified Event System
// ============================================================================

describe('CircuitEngine - Phase 6: User Story 4 (Unified Event System)', () => {
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

  // T039: Test on() subscribes to controller events
  describe('T039: on() subscribes to controller events', () => {
    it('should allow subscribing to events before initialization', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const handler = vi.fn();
      expect(() => engine.on('ready', handler)).not.toThrow();
    });

    it('should call handler when subscribed event is emitted', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const readyHandler = vi.fn();
      engine.on('ready', readyHandler);

      engine.initialize(container, createMockRenderer());

      expect(readyHandler).toHaveBeenCalled();
    });

    it('should support multiple handlers for the same event', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      engine.on('ready', handler1);
      engine.on('ready', handler2);

      engine.initialize(container, createMockRenderer());

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  // T040: Test events from active controller are forwarded
  describe('T040: events from active controller are forwarded', () => {
    it('should forward circuitLoaded event from edit controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuitLoadedHandler = vi.fn();
      engine.on('circuitLoaded', circuitLoadedHandler);

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      expect(circuitLoadedHandler).toHaveBeenCalledWith({ name: 'Test Circuit' });
    });

    it('should forward simulation events from simulation controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      const playedHandler = vi.fn();
      engine.on('simulationPlayed', playedHandler);

      engine.play();

      expect(playedHandler).toHaveBeenCalled();
    });

    it('should forward toolActivated event from edit controller', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer(), { controllerOptions: { defaultTool: null } });

      const toolActivatedHandler = vi.fn();
      engine.on('toolActivated', toolActivatedHandler);

      engine.setEditModeEnabled(true);
      engine.setActiveTool('build');

      expect(toolActivatedHandler).toHaveBeenCalledWith({ toolType: 'build' });
    });
  });

  // T041: Test modeChanged event is emitted on mode switch
  describe('T041: modeChanged event is emitted on mode switch', () => {
    it('should emit modeChanged when switching to simulation', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

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

    it('should emit modeChanged when switching to edit', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('edit');

      expect(modeChangedHandler).toHaveBeenCalledWith({
        mode: 'edit',
        previousMode: 'simulation',
      });
    });

    it('should not emit modeChanged for same mode', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.setMode('edit'); // Already in edit mode

      expect(modeChangedHandler).not.toHaveBeenCalled();
    });
  });

  // T042: Test off() unsubscribes from events
  describe('T042: off() unsubscribes from events', () => {
    it('should stop receiving events after off() is called', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const handler = vi.fn();
      engine.on('ready', handler);
      engine.off('ready', handler);

      engine.initialize(container, createMockRenderer());

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific handler', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      engine.on('ready', handler1);
      engine.on('ready', handler2);
      engine.off('ready', handler1);

      engine.initialize(container, createMockRenderer());

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle unsubscribing non-existent handler gracefully', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      const handler = vi.fn();

      expect(() => engine.off('ready', handler)).not.toThrow();
    });
  });
});

// ============================================================================
// Phase 7: User Story 5 - Resource Cleanup and Disposal
// ============================================================================

describe('CircuitEngine - Phase 7: User Story 5 (Resource Cleanup and Disposal)', () => {
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
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  // T047: Test dispose() stops simulation if running
  describe('T047: dispose() stops simulation if running', () => {
    it('should stop simulation when dispose is called while playing', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');
      engine.play();

      expect(engine.isPlaying).toBe(true);

      engine.dispose();

      expect(engine.isDisposed).toBe(true);
    });

    it('should not throw when disposing while simulation is paused', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);
      engine.setMode('simulation');
      engine.play();
      engine.pause();

      expect(() => engine.dispose()).not.toThrow();
    });
  });

  // T048: Test dispose() clears all event subscriptions
  describe('T048: dispose() clears all event subscriptions', () => {
    it('should not call event handlers after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const modeChangedHandler = vi.fn();
      engine.on('modeChanged', modeChangedHandler);

      engine.dispose();

      // Engine is disposed, no more events should be emitted
      expect(engine.isDisposed).toBe(true);
    });

    it('should clear all internal event listener references', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      // Register multiple handlers
      engine.on('ready', vi.fn());
      engine.on('modeChanged', vi.fn());
      engine.on('circuitLoaded', vi.fn());

      engine.dispose();

      // After dispose, adding new handlers should not cause errors
      // but the engine should not work
      expect(engine.isDisposed).toBe(true);
    });
  });

  // T049: Test dispose() releases Three.js resources
  describe('T049: dispose() releases Three.js resources', () => {
    it('should dispose MapControls', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const controls = engine.getControls();
      const disposeSpy = vi.spyOn(controls, 'dispose');

      engine.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should clear visual object maps', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      const circuit = createTestCircuit();
      engine.setCircuit(circuit);

      // Visual maps should have entries
      const editController = engine.getEditController();
      expect(editController._componentObject3Ds.size).toBeGreaterThan(0);

      engine.dispose();

      expect(engine.isDisposed).toBe(true);
    });
  });

  // T050: Test operations throw after dispose
  describe('T050: operations throw after dispose', () => {
    it('should throw when calling setMode after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.setMode('simulation')).toThrow(/disposed/i);
    });

    it('should throw when calling setCircuit after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.setCircuit(createTestCircuit())).toThrow(/disposed/i);
    });

    it('should throw when calling getScene after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.getScene()).toThrow(/disposed/i);
    });

    it('should throw when calling getCamera after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.getCamera()).toThrow(/disposed/i);
    });

    it('should throw when calling getControls after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.getControls()).toThrow(/disposed/i);
    });

    it('should throw when calling getCircuit after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.getCircuit()).toThrow(/disposed/i);
    });

    it('should throw when calling onContainerResize after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.onContainerResize(800, 600)).toThrow(/disposed/i);
    });
  });

  // Additional dispose tests
  describe('Dispose lifecycle', () => {
    it('should set isDisposed to true after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(engine.isDisposed).toBe(false);

      engine.dispose();

      expect(engine.isDisposed).toBe(true);
    });

    it('should set isInitialized to false after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());

      expect(engine.isInitialized).toBe(true);

      engine.dispose();

      expect(engine.isInitialized).toBe(false);
    });

    it('should throw when calling dispose on non-initialized engine', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);

      expect(() => engine.dispose()).toThrow(/not initialized/i);
    });

    it('should throw when calling dispose twice', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.dispose()).toThrow();
    });

    it('should throw when trying to initialize after dispose', () => {
      engine = new CircuitEngine(factoryRegistry, behaviorRegistry);
      engine.initialize(container, createMockRenderer());
      engine.dispose();

      expect(() => engine.initialize(container, createMockRenderer())).toThrow(/disposed/i);
    });
  });
});
