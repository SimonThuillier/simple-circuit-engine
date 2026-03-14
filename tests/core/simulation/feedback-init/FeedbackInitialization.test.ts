/**
 * Unit tests for Feedback Loop Initialization (Feature 018)
 *
 * Tests the enhanced initializeState() functionality that resolves
 * feedback circuits to deterministic stable states using initializationPriority.
 */

import { describe, it, expect } from 'vitest';
import type { Component } from 'simple-circuit-engine/core';
import {
  CIRCUIT_FILE_VERSION,
  Circuit,
  CircuitMetadata,
  ComponentType,
  Position,
  Rotation,
  Position3D,
  CircuitRunner,
  BehaviorRegistry,
  BatteryBehavior,
  NorGateBehavior,
  SmallLEDBehavior,
  ENodeSourceType,
} from 'simple-circuit-engine/core';
import { CircuitOptions } from '../../../../src/core/topology/CircuitOptions.js';
import { CameraOptions } from '../../../../src/core/utils/CameraOptions.js';

function createBehaviorRegistry(): BehaviorRegistry {
  const registry = new BehaviorRegistry();
  registry.register(new BatteryBehavior());
  registry.register(new NorGateBehavior());
  registry.register(new SmallLEDBehavior());
  return registry;
}

/**
 * Creates a NOR gate component, powers its vcc pin and grounds its gnd pin.
 */
const makeNorGate = (circuit: Circuit, position: Position): Component => {
  const nor = circuit.addComponent(ComponentType.NorGate, position, new Rotation(0));
  const vcc = circuit.getComponentPinByLabel(nor, 'vcc');
  circuit.updateENodeSourceType(vcc!.id, ENodeSourceType.Voltage);
  const gnd = circuit.getComponentPinByLabel(nor, 'gnd');
  circuit.updateENodeSourceType(gnd!.id, ENodeSourceType.Current);
  return nor;
};

describe('Feedback Loop Initialization', () => {
  describe('User Story 1: Automatic Feedback Loop Resolution', () => {
    describe('T004 - RS flip-flop initializes to valid stable state', () => {
      it('should initialize RS flip-flop to a valid stable state (not both outputs same)', () => {
        const circuit = new Circuit(new CircuitOptions('RS Flip-Flop'));
        circuit.metadata = new CircuitMetadata(
          CIRCUIT_FILE_VERSION,
          new CircuitOptions('RS Flip-Flop Test'),
          20,
          20,
          new CameraOptions(new Position3D(0, 0, 50))
        );

        // Two NOR gates forming feedback loop
        const nor1 = makeNorGate(circuit, new Position(0, 0));
        const nor2 = makeNorGate(circuit, new Position(0, 1));

        // Ground unconnected S and R inputs (proper logic LOW)
        const nor1_input1 = circuit.getComponentPinByLabel(nor1, 'input1');
        circuit.updateENodeSourceType(nor1_input1!.id, ENodeSourceType.Current);
        const nor2_input2 = circuit.getComponentPinByLabel(nor2, 'input2');
        circuit.updateENodeSourceType(nor2_input2!.id, ENodeSourceType.Current);

        // Cross-wire: NOR1 output → NOR2 input1, NOR2 output → NOR1 input2
        const nor1_output = circuit.getComponentPinByLabel(nor1, 'output');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2, 'input1');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2, 'output');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1, 'input2');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // Create runner - initialization should resolve to stable state
        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        const nor1State = state.componentStates.get(nor1.id);
        const nor2State = state.componentStates.get(nor2.id);

        expect(nor1State).toBeDefined();
        expect(nor2State).toBeDefined();

        // Valid stable state: the two NOR gates must be in opposite states
        // Stable state 1 (Q=HIGH, Q'=LOW): nor1=high, nor2=low
        // Stable state 2 (Q=LOW, Q'=HIGH): nor1=low, nor2=high
        // Invalid: both same state causes oscillation
        const bothHigh = nor1State!.state === 'high' && nor2State!.state === 'high';
        const bothLow = nor1State!.state === 'low' && nor2State!.state === 'low';

        expect(bothHigh || bothLow).toBe(false);
      });

      it('RS flip-flop has the desired initial state when one of the input is on', () => {
        const circuit = new Circuit(new CircuitOptions('RS Flip-Flop'));
        circuit.metadata = new CircuitMetadata(
          CIRCUIT_FILE_VERSION,
          new CircuitOptions('RS Flip-Flop Test'),
          20,
          20,
          new CameraOptions(new Position3D(0, 0, 50))
        );

        const nor1 = makeNorGate(circuit, new Position(0, 0));
        const nor2 = makeNorGate(circuit, new Position(0, 1));

        // Ground unconnected R input (proper logic LOW)
        const nor2_input2 = circuit.getComponentPinByLabel(nor2, 'input2');
        circuit.updateENodeSourceType(nor2_input2!.id, ENodeSourceType.Current);

        // Cross-wire feedback
        const nor1_output = circuit.getComponentPinByLabel(nor1, 'output');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2, 'input1');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2, 'output');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1, 'input2');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // SET: power NOR1 input1 → forces NOR1 output LOW → NOR2 output HIGH
        const nor1_input1 = circuit.getComponentPinByLabel(nor1, 'input1');
        circuit.updateENodeSourceType(nor1_input1!.id, ENodeSourceType.Voltage);

        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        const nor1State = state.componentStates.get(nor1.id);
        const nor2State = state.componentStates.get(nor2.id);

        // NOR1 has an input HIGH → output LOW
        // NOR2 has both inputs LOW (NOR1 output=LOW, input2 grounded) → output HIGH
        expect(nor1State!.state).toBe('low');
        expect(nor2State!.state).toBe('high');

        // Now RESET: ground NOR1 input1 (logic LOW), power NOR2 input2 (logic HIGH)
        circuit.updateENodeSourceType(nor1_input1!.id, ENodeSourceType.Current);
        circuit.updateENodeSourceType(nor2_input2!.id, ENodeSourceType.Voltage);

        const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
        const state2 = runner2.getCurrentState();

        const nor1State2 = state2.componentStates.get(nor1.id);
        const nor2State2 = state2.componentStates.get(nor2.id);

        // NOR2 has an input HIGH → output LOW
        // NOR1 has both inputs LOW (NOR2 output=LOW, input1 grounded) → output HIGH
        expect(nor1State2!.state).toBe('high');
        expect(nor2State2!.state).toBe('low');
      });
    });

    describe('Phase4 - initializationOrder controls RS flip-flop initial state', () => {
      it('changing initializationOrder well inverts default RS initial State', () => {
        const circuit = new Circuit(new CircuitOptions('RS Flip-Flop'));
        circuit.metadata = new CircuitMetadata(
          CIRCUIT_FILE_VERSION,
          new CircuitOptions('RS Flip-Flop Test'),
          20,
          20,
          new CameraOptions(new Position3D(0, 0, 50))
        );

        const nor1 = makeNorGate(circuit, new Position(0, 0));
        const nor2 = makeNorGate(circuit, new Position(0, 1));

        // Ground unconnected S and R inputs (proper logic LOW)
        const nor1_input1 = circuit.getComponentPinByLabel(nor1, 'input1');
        circuit.updateENodeSourceType(nor1_input1!.id, ENodeSourceType.Current);
        const nor2_input2 = circuit.getComponentPinByLabel(nor2, 'input2');
        circuit.updateENodeSourceType(nor2_input2!.id, ENodeSourceType.Current);

        // Cross-wire feedback
        const nor1_output = circuit.getComponentPinByLabel(nor1, 'output');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2, 'input1');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2, 'output');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1, 'input2');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // Get default state
        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        const nor1State = state.componentStates.get(nor1.id);
        const nor2State = state.componentStates.get(nor2.id);

        const nor1IsHigh = nor1State!.state === 'high';

        if (nor1IsHigh) {
          // Default: NOR1=high. To invert: give NOR2 higher initializationOrder so it prevails
          nor2.setParameter('initializationOrder', '1');
          const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
          const state2 = runner2.getCurrentState();

          const nor1State2 = state2.componentStates.get(nor1.id);
          const nor2State2 = state2.componentStates.get(nor2.id);

          expect(nor1State2!.state).toBe('low'); // inverted
          expect(nor2State2!.state).toBe('high'); // NOR2 prevailed
        } else {
          // Default: NOR1=low. To invert: give NOR1 higher initializationOrder so it prevails
          nor1.setParameter('initializationOrder', '1');
          const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
          const state2 = runner2.getCurrentState();

          const nor1State2 = state2.componentStates.get(nor1.id);
          const nor2State2 = state2.componentStates.get(nor2.id);

          expect(nor1State2!.state).toBe('high'); // NOR1 prevailed
          expect(nor2State2!.state).toBe('low'); // inverted
        }
      });
    });
  });
});
