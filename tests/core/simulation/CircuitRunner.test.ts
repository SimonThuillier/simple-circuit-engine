/**
 * Integration tests for CircuitRunner
 * @module tests/core/simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitRunner } from '@/core/simulation/CircuitRunner.js';
import { BehaviorRegistry } from '@/core/simulation/behaviors/BehaviorRegistry.js';
import { BatteryBehavior } from '@/core/simulation/behaviors/BatteryBehavior.js';
import { LEDBehavior } from '@/core/simulation/behaviors/LEDBehavior.js';
import { Circuit } from '@/core/Circuit.js';
import { Component } from '@/core/Component.js';
import { Position } from '@/core/types/Position.js';
import { Rotation } from '@/core/types/Rotation.js';
import { ComponentType } from '@/core/types/ComponentType.js';
import type { LEDState } from '@/core/simulation/states/LEDState.js';
import type { BatteryState } from '@/core/simulation/states/BatteryState.js';

describe('CircuitRunner', () => {
  let circuit: Circuit;
  let registry: BehaviorRegistry;

  beforeEach(() => {
    circuit = new Circuit('test-circuit');
    registry = new BehaviorRegistry();
    registry.register(new BatteryBehavior());
    registry.register(new LEDBehavior('smallLED'));
    registry.register(new LEDBehavior('rectangleLED'));
  });

  describe('constructor', () => {
    it('should create runner with default options', () => {
      const runner = new CircuitRunner(circuit, registry);

      expect(runner.getCurrentTick()).toBe(0);
      expect(runner.getCurrentState()).toBeDefined();
    });

    it('should create runner with history enabled', () => {
      const runner = new CircuitRunner(circuit, registry, {
        enableHistory: true,
        historyLimit: 100
      });

      expect(runner.getCurrentTick()).toBe(0);
    });

    it('should initialize component states when circuit has components', () => {
      const battery = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
      );

      const runner = new CircuitRunner(circuit, registry);
      const batteryState = runner.getComponentState(battery.id);

      expect(batteryState).toBeDefined();
      expect(batteryState?.state).toBe('on');
    });

    it('should warn about missing behaviors', () => {
      // Create component with unknown type by constructing directly
      const unknownComp = new Component(
        'unknown-type' as ComponentType,
        new Position(0, 0),
        new Rotation(0),
        []
      );

      // Add to circuit's internal components array
      (circuit as any).components.set(unknownComp.id, unknownComp);

      // Should not throw, but will warn
      expect(() => new CircuitRunner(circuit, registry)).not.toThrow();
    });
  });

  describe('tick and tickN', () => {
    let runner: CircuitRunner;

    beforeEach(() => {
      runner = new CircuitRunner(circuit, registry);
    });

    it('should increment tick with each call', () => {
      expect(runner.getCurrentTick()).toBe(0);

      runner.tick();
      expect(runner.getCurrentTick()).toBe(1);

      runner.tick();
      expect(runner.getCurrentTick()).toBe(2);
    });

    it('should execute multiple ticks with tickN', () => {
      runner.tickN(10);

      expect(runner.getCurrentTick()).toBe(10);
    });

    it('should throw error for invalid tickN count', () => {
      expect(() => runner.tickN(0)).toThrow(RangeError);
      expect(() => runner.tickN(-1)).toThrow(RangeError);
    });
  });

  describe('reset', () => {
    let runner: CircuitRunner;

    beforeEach(() => {
      circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      runner = new CircuitRunner(circuit, registry, { enableHistory: true });
    });

    it('should reset to tick 0', () => {
      runner.tickN(10);
      expect(runner.getCurrentTick()).toBe(10);

      runner.reset();

      expect(runner.getCurrentTick()).toBe(0);
    });

    it('should clear history', () => {
      runner.tickN(5);

      runner.reset();

      expect(runner.getStateAtTick(1)).toBeUndefined();
    });

    it('should reinitialize component states', () => {
      runner.tickN(5);

      runner.reset();

      const state = runner.getCurrentState();
      expect(state.tick).toBe(0);
    });
  });

  describe('state queries', () => {
    let battery: Component;
    let led: Component;
    let runner: CircuitRunner;

    beforeEach(() => {
      battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      led = circuit.addComponent(ComponentType.SmallLED, new Position(1, 0), new Rotation(0));

      runner = new CircuitRunner(circuit, registry);
    });

    it('should get current state', () => {
      const state = runner.getCurrentState();

      expect(state.tick).toBe(0);
      expect(state.componentStates).toBeDefined();
      expect(state.nodeStates).toBeDefined();
      expect(state.wireStates).toBeDefined();
    });

    it('should get component state by ID', () => {
      const batteryState = runner.getComponentState(battery.id);
      const ledState = runner.getComponentState(led.id);

      expect(batteryState).toBeDefined();
      expect(ledState).toBeDefined();
      expect(batteryState?.componentId).toBe(battery.id);
      expect(ledState?.componentId).toBe(led.id);
    });

    it('should return undefined for non-existent component', () => {
      const state = runner.getComponentState('non-existent-id');

      expect(state).toBeUndefined();
    });

    it('should get enode state by ID when enodes exist', () => {
      const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));

      const runner = new CircuitRunner(circuit, registry);
      runner.tick();

      if (battery.pins.length > 0) {
        const pinId = battery.pins[0];
        const pinState = runner.getEnodeState(pinId);
        expect(pinState).toBeDefined();
      }
    });
  });

  describe('history tracking', () => {
    let runner: CircuitRunner;

    beforeEach(() => {
      circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
    });

    it('should not track history when disabled', () => {
      runner = new CircuitRunner(circuit, registry, { enableHistory: false });

      runner.tickN(5);

      expect(runner.getStateAtTick(0)).toBeUndefined();
      expect(runner.getStateAtTick(1)).toBeUndefined();
    });

    it('should track history when enabled', () => {
      runner = new CircuitRunner(circuit, registry, { enableHistory: true });

      runner.tick(); // Move from tick 0 to 1
      runner.tick(); // Move from tick 1 to 2

      const state0 = runner.getStateAtTick(0);
      const state1 = runner.getStateAtTick(1);

      expect(state0).toBeDefined();
      expect(state1).toBeDefined();
      expect(state0?.tick).toBe(0);
      expect(state1?.tick).toBe(1);
    });

    it('should respect history limit', () => {
      runner = new CircuitRunner(circuit, registry, {
        enableHistory: true,
        historyLimit: 3
      });

      runner.tickN(10);

      // Should only have last 3 states (ticks 7, 8, 9)
      expect(runner.getStateAtTick(0)).toBeUndefined();
      expect(runner.getStateAtTick(6)).toBeUndefined();
      expect(runner.getStateAtTick(7)).toBeDefined();
      expect(runner.getStateAtTick(8)).toBeDefined();
      expect(runner.getStateAtTick(9)).toBeDefined();
    });
  });

  describe('behavior registry integration', () => {
    it('should check for registered behaviors', () => {
      const runner = new CircuitRunner(circuit, registry);

      expect(runner.hasBehavior('battery')).toBe(true);
      expect(runner.hasBehavior('smallLED')).toBe(true);
      expect(runner.hasBehavior('unknown')).toBe(false);
    });
  });

  describe('user commands', () => {
    let runner: CircuitRunner;

    beforeEach(() => {
      runner = new CircuitRunner(circuit, registry);
    });

    it('should throw error for unimplemented user commands', () => {
      expect(() =>
        runner.scheduleCommand({
          commandType: 'toggle_switch',
          targetComponentId: 'test-id',
          tick: null
        })
      ).toThrow('User commands not yet implemented');
    });
  });

  describe('simulation with multiple components', () => {
    it('should simulate multiple components simultaneously', () => {
      const battery1 = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      const battery2 = circuit.addComponent(ComponentType.Battery, new Position(1, 0), new Rotation(0));
      const led1 = circuit.addComponent(ComponentType.SmallLED, new Position(2, 0), new Rotation(0));
      const led2 = circuit.addComponent(ComponentType.SmallLED, new Position(3, 0), new Rotation(0));

      const runner = new CircuitRunner(circuit, registry);

      // All batteries should be on
      expect((runner.getComponentState(battery1.id) as BatteryState)?.state).toBe('on');
      expect((runner.getComponentState(battery2.id) as BatteryState)?.state).toBe('on');

      // LEDs should be off initially
      expect((runner.getComponentState(led1.id) as LEDState)?.state).toBe('off');
      expect((runner.getComponentState(led2.id) as LEDState)?.state).toBe('off');

      runner.tick();

      // After tick, verify states are maintained
      expect(runner.getCurrentTick()).toBe(1);
      expect(runner.getComponentState(battery1.id)).toBeDefined();
      expect(runner.getComponentState(led1.id)).toBeDefined();
    });

    it('should maintain component states across multiple ticks', () => {
      const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));
      const led = circuit.addComponent(ComponentType.SmallLED, new Position(1, 0), new Rotation(0));

      const runner = new CircuitRunner(circuit, registry);

      // Initial states
      expect((runner.getComponentState(battery.id) as BatteryState)?.state).toBe('on');
      expect((runner.getComponentState(led.id) as LEDState)?.state).toBe('off');

      // Tick several times
      runner.tickN(5);

      // Battery should still be on
      expect((runner.getComponentState(battery.id) as BatteryState)?.state).toBe('on');
      expect(runner.getCurrentTick()).toBe(5);
    });
  });
});
