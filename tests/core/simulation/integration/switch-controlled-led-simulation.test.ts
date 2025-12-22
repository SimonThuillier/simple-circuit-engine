/**
 * Integration tests simulating a switch controlled LED circuit.
 *
 * Tests the complete lifecycle of CircuitRunner in that simple case
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { Circuit, CircuitMetadata } from '@/core/Circuit';
import { ComponentType } from '@/core/types/ComponentType';
import { Position } from '@/core/types/Position';
import { Rotation } from '@/core/types/Rotation';
import { Position3D } from '@/core/types/Position3D';
import { CircuitRunner } from '@/core/simulation/CircuitRunner';
import {
  BehaviorRegistry,
  BatteryBehavior,
  SmallLEDBehavior,
  SwitchBehavior} from '@/core/simulation/behaviors';
import type { Component } from '@/core/Component';

function createBehaviorRegistry(): BehaviorRegistry {
  const registry = new BehaviorRegistry();

  // Register behaviors for battery, switch, and LED
  registry.register(new BatteryBehavior());
  registry.register(new SwitchBehavior());
  registry.register(new SmallLEDBehavior());

  return registry;
}

function createSwitchControlledLedCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit('Switch-Controlled LED Circuit');
  circuit.metadata = new CircuitMetadata(
    'Switch-Controlled LED Circuit',
    30,
    10,
    new Position3D(0, 0, 50)
  );

  // Add components
  const battery = circuit.addComponent(ComponentType.Battery, new Position(0, 0), new Rotation(0));

  const switch1 = circuit.addComponent(ComponentType.Switch, new Position(7, 0), new Rotation(0));
  switch1.setParameter('toggleTicks', '2'); // Takes 2 ticks to toggle

  const led = circuit.addComponent(ComponentType.SmallLED, new Position(14, 0), new Rotation(0));

  // Wire the circuit: Battery cathode → Switch input
  circuit.addWire(battery.pins[0]!, switch1.pins[0]!);

  // Switch output → LED anode
  circuit.addWire(switch1.pins[1]!, led.pins[0]!);

  // Complete the loop: LED cathode → Battery anode
  circuit.addWire(led.pins[1]!, battery.pins[1]!);

  return circuit;
}

describe('Switch Controlled LED Circuit Simulation', () => {
  let circuit: Circuit;
  let runner: CircuitRunner;
  let battery: Component;
  let cSwitch: Component;
  let led: Component;

  beforeEach(() => {
    circuit = createSwitchControlledLedCircuit();
    runner = new CircuitRunner(circuit, createBehaviorRegistry());
    battery = circuit.getFirstComponentOfType(ComponentType.Battery)!;
    cSwitch = circuit.getFirstComponentOfType(ComponentType.Switch)!;
    led = circuit.getFirstComponentOfType(ComponentType.SmallLED)!;
  });

  it('should initialize the circuit runner successfully', () => {
    expect(runner).toBeDefined();
    expect(runner.circuit).toBe(circuit);
  });

  describe('Initial State Verification', () => {
    it('Initial state OK for components', () => {
      const initState = runner.getCurrentState();

      expect(initState.componentStates.size).toBe(3); // battery, switch, led

      expect(initState.componentStates.get(battery.id)).toBeDefined();
      expect(initState.componentStates.get(battery.id)!.state).toBe('on');

      expect(initState.componentStates.get(cSwitch.id)).toBeDefined();
      expect(initState.componentStates.get(cSwitch.id)!.state).toBe('open');

      expect(initState.componentStates.get(led.id)).toBeDefined();
      expect(initState.componentStates.get(led.id)!.state).toBe('off');
    });

    it('Initial state OK for enodes', () => {
      const initState = runner.getCurrentState();

      expect(initState.nodeStates.size).toBe(6); // 2 + 2 + 2
      const cathodeId = battery.pins[0]!;
      const anodeId = battery.pins[1]!;
      const cSwitchInputId = cSwitch.pins[0]!;
      const cSwitchOutputId = cSwitch.pins[1]!;
      const ledCathodeId = led.pins[0]!;
      const ledAnodeId = led.pins[1]!;

      for (const [id, nodeState] of initState.nodeStates.entries()) {
        if (id === cathodeId) {
          expect(nodeState.hasVoltage).toBe(true);
          expect(nodeState.hasCurrent).toBe(false);
          expect(nodeState.locked).toBe(true);
        } else if (id === anodeId) {
          expect(nodeState.hasVoltage).toBe(false);
          expect(nodeState.hasCurrent).toBe(true);
          expect(nodeState.locked).toBe(true);
        } else if (id === cSwitchInputId) {
          expect(nodeState.hasVoltage).toBe(true);
          expect(nodeState.hasCurrent).toBe(false);
          expect(nodeState.locked).toBe(false);
        } else if (id === cSwitchOutputId) {
          expect(nodeState.hasVoltage).toBe(false);
          expect(nodeState.hasCurrent).toBe(true);
          expect(nodeState.locked).toBe(false);
        } else if (id === ledCathodeId) {
          expect(nodeState.hasVoltage).toBe(false);
          expect(nodeState.hasCurrent).toBe(true);
          expect(nodeState.locked).toBe(false);
        } else if (id === ledAnodeId) {
          expect(nodeState.hasVoltage).toBe(false);
          expect(nodeState.hasCurrent).toBe(true);
          expect(nodeState.locked).toBe(false);
        }
      }
    });

    it('Initial state OK for wires', () => {
      const initState = runner.getCurrentState();
      expect(initState.wireStates.size).toBe(3);

      let index = 0;
      for (const [_id, wireState] of initState.wireStates.entries()) {
        if (index === 0) {
          expect(wireState.hasVoltage).toBe(true);
          expect(wireState.hasCurrent).toBe(false);
        }
        if (index === 1) {
          expect(wireState.hasVoltage).toBe(false);
          expect(wireState.hasCurrent).toBe(true);
        }
        if (index === 2) {
          expect(wireState.hasVoltage).toBe(false);
          expect(wireState.hasCurrent).toBe(true);
        }
        index += 1;
      }
    });

    it('All components, nodes and wires are marked dirty', () => {
      const tracker = runner.dirtyTracker;

      expect(tracker.hasDirtyElements()).toBe(true);
      expect(tracker.getDirtyComponentCount()).toBe(3);
      expect(tracker.getDirtyEnodeCount()).toBe(6);
      expect(tracker.getDirtyWireCount()).toBe(3);
    });
  });

  describe('Without commands state stays stable accross ticks', () => {
    it('First tick resolve without changes and there are no remaining dirty elements', () => {
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      const result = runner.tick();
      expect(result.startTick).toBe(0);
      expect(result.endTick).toBe(1);
      expect(result.componentUpdateCount).toBe(0);
      expect(result.nodeUpdateCount).toBe(0);
      expect(result.wireUpdateCount).toBe(0);
      expect(result.processedCommandCount).toBe(0);
      expect(result.scheduledEventCount).toBe(0);
      expect(result.firedEventCount).toBe(0);
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(false);
    });

    it('States remain stable accross multiple ticks', () => {
      const results = runner.tickN(3);
      expect(results.length).toBe(3);
      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        expect(result.startTick).toBe(i);
        expect(result.endTick).toBe(i + 1);
        expect(result.componentUpdateCount).toBe(0);
        expect(result.nodeUpdateCount).toBe(0);
        expect(result.wireUpdateCount).toBe(0);
        expect(result.processedCommandCount).toBe(0);
        expect(result.scheduledEventCount).toBe(0);
        expect(result.firedEventCount).toBe(0);
      }
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(false);
    });
  });

  describe('Toggling the switch ON', () => {
    it('toggling an open switch is well handled at next tick', () => {
      runner.tick();
      let accepted = runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      expect(accepted).toBe(true);
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('open');

      // this tick should process the command
      const result = runner.tick();
      expect(result.processedCommandCount).toBe(1);
      // and event switch should be closing
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('closing');
      expect(result.componentUpdateCount).toBe(1);
      // but electrical states should not have changed yet
      expect(result.nodeUpdateCount).toBe(0);
      expect(result.wireUpdateCount).toBe(0);
      // and firing event shouldn't have fired yet
      expect(result.scheduledEventCount).toBe(1);
      expect(result.firedEventCount).toBe(0);

      // switch should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(1);
      // but no enode or wire should be dirty yet
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });

    it('Closing should resolve and conduce to the new proper electrical state', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });

      runner.tick(); // this tick (1->2) should process the command
      const result = runner.tick(); // firing event should happen here (2->3)

      expect(result.processedCommandCount).toBe(0);
      // switch should be closed now
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('closed');
      // and electrical states updates should have happened
      expect(result.componentUpdateCount).toBe(2);
      // led should be goingOn now
      expect(runner.getCurrentState().componentStates.get(led.id)!.state).toBe('goingOn');
      expect(result.nodeUpdateCount).toBe(4);
      expect(result.wireUpdateCount).toBe(3);
      // firing event have fired and is discarded now
      expect(result.firedEventCount).toBe(1);
      // however LED goingOnEnd event should be scheduled now
      expect(result.scheduledEventCount).toBe(1);

      // switch and led should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(2);
      // as well as several enodes and all wires
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(4);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(3);
    });

    it('After Closing LED should be fully on and global state stable', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      runner.tick(); // this tick (1->2) should process the command
      runner.tick(); // firing event should happen here (2->3)
      const result = runner.tick(); // LED goingOnEnd event should happen here (3->4)

      expect(result.processedCommandCount).toBe(0);
      // switch should still be closed
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('closed');
      // only led should be updated from goingOn to on
      expect(result.componentUpdateCount).toBe(1);
      // led should be On now
      expect(runner.getCurrentState().componentStates.get(led.id)!.state).toBe('on');
      expect(runner.getCurrentState().componentStates.get(led.id)!.startTick).toBe(4);

      expect(result.nodeUpdateCount).toBe(0);
      expect(result.wireUpdateCount).toBe(0);
      expect(result.firedEventCount).toBe(1);
      // no more event should be scheduled now : without further commands circuit state is stable
      expect(result.scheduledEventCount).toBe(0);

      // only led should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(1);
      // but no enodes or wires
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });

    it('One step further no dirty elements remain', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      runner.tick(); // this tick (1->2) should process the command
      runner.tick(); // firing event should happen here (2->3)
      runner.tick(); // LED goingOnEnd event should happen here (3->4)
      runner.tick();

      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });
  });

  describe('Toggling back the switch OFF', () => {
    beforeEach(() => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      runner.tickN(5); // let the switch close and led turn on
    });

    it('toggling a close switch is well handled at next tick', () => {
      runner.tick();
      let accepted = runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      expect(accepted).toBe(true);
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('closed');

      // this tick should process the command
      const result = runner.tick();
      expect(result.processedCommandCount).toBe(1);
      // and event switch should be opening
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('opening');
      expect(result.componentUpdateCount).toBe(1);
      // but electrical states should not have changed yet
      expect(result.nodeUpdateCount).toBe(0);
      expect(result.wireUpdateCount).toBe(0);
      // and firing event shouldn't have fired yet
      expect(result.scheduledEventCount).toBe(1);
      expect(result.firedEventCount).toBe(0);

      // switch should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(1);
      // but no enode or wire should be dirty yet
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });

    it('Opening should resolve and conduce to the new proper electrical state', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });

      runner.tick();
      const result = runner.tick();

      expect(result.processedCommandCount).toBe(0);
      // switch should be open now
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('open');
      // and electrical states updates should have happened
      expect(result.componentUpdateCount).toBe(2);
      // led should be goingOff now
      expect(runner.getCurrentState().componentStates.get(led.id)!.state).toBe('goingOff');
      expect(result.nodeUpdateCount).toBe(4);
      expect(result.wireUpdateCount).toBe(3);
      // firing event have fired and is discarded now
      expect(result.firedEventCount).toBe(1);
      // however LED goingOnEnd event should be scheduled now
      expect(result.scheduledEventCount).toBe(1);

      // switch and led should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(2);
      // as well as several enodes and all wires
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(4);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(3);
    });

    it('After Opening LED should be fully off and global state stable', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      runner.tick();
      runner.tick();
      const result = runner.tick(); // LED goingOffEnd event should happen here (3->4)

      expect(result.processedCommandCount).toBe(0);
      // switch should still be closed
      expect(runner.getCurrentState().componentStates.get(cSwitch.id)!.state).toBe('open');
      // only led should be updated from goingOn to on
      expect(result.componentUpdateCount).toBe(1);
      // led should be Off now
      expect(runner.getCurrentState().componentStates.get(led.id)!.state).toBe('off');
      expect(runner.getCurrentState().componentStates.get(led.id)!.startTick).toBe(10);

      expect(result.nodeUpdateCount).toBe(0);
      expect(result.wireUpdateCount).toBe(0);
      expect(result.firedEventCount).toBe(1);
      // no more event should be scheduled now : without further commands circuit state is stable
      expect(result.scheduledEventCount).toBe(0);

      // only led should figure as dirty now
      expect(runner.dirtyTracker.hasDirtyElements()).toBe(true);
      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(1);
      // but no enodes or wires
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });

    it('One step further no dirty elements remain', () => {
      runner.tick();
      runner.submitCommand({
        type: 'toggle_switch',
        targetId: cSwitch.id,
        scheduledAtTick: 0,
        parameters: null,
      });
      runner.tick();
      runner.tick();
      runner.tick();
      runner.tick();

      expect(runner.dirtyTracker.getDirtyComponentCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyEnodeCount()).toBe(0);
      expect(runner.dirtyTracker.getDirtyWireCount()).toBe(0);
    });
  });
});
