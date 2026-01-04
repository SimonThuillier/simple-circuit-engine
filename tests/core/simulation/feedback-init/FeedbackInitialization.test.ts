/**
 * Unit tests for Feedback Loop Initialization (Feature 018)
 *
 * Tests the enhanced initializeState() functionality that resolves
 * feedback circuits to deterministic stable states using initializationPriority.
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
  TransistorBehavior,
  RelayBehavior,
  SmallLEDBehavior,
} from '@/core/simulation/behaviors';
import type { Component } from '@/core/Component';
import {ENodeSourceType} from "../../../../src/core/types/ENodeSourceType";

function createBehaviorRegistry(): BehaviorRegistry {
  const registry = new BehaviorRegistry();
  registry.register(new BatteryBehavior());
  registry.register(new TransistorBehavior());
  registry.register(new RelayBehavior());
  registry.register(new SmallLEDBehavior());
  return registry;
}

const makeNorGate = (circuit: Circuit): {
  nor_t1: Component,
  nor_t2: Component
} => {
  const nor_t1 = circuit.addComponent(
      ComponentType.Transistor, new Position(0, 0), new Rotation(0),
      new Map([['activationLogic', 'negative']])); // closed when no base current
  const nor_t1_collector = circuit.getComponentPinByLabel(nor_t1, 'collector');
  circuit.updateENodeSourceType(nor_t1_collector!.id, ENodeSourceType.Voltage); // powering up first transistor collector
  const nor_t1_emitter = circuit.getComponentPinByLabel(nor_t1, 'emitter');

  const nor_t2 = circuit.addComponent(
      ComponentType.Transistor, new Position(0, 1), new Rotation(0),
      new Map([['activationLogic', 'negative']])); // closed when no base current
  const nor_t2_collector = circuit.getComponentPinByLabel(nor_t2, 'collector');
  circuit.addWire(nor_t1_emitter!.id, nor_t2_collector!.id); // wiring the two transistors to produce NOR configuration

  return { nor_t1: nor_t1, nor_t2: nor_t2  };
}

describe('Feedback Loop Initialization', () => {
  describe('User Story 1: Automatic Feedback Loop Resolution', () => {
    describe('T004 - RS flip-flop initializes to valid stable state', () => {
      it('should initialize RS flip-flop to a valid stable state (not both outputs same)', () => {
        // Create end of a simple RS flip-flop circuit using two NOR gates
        const circuit = new Circuit('RS Flip-Flop');
        circuit.metadata = new CircuitMetadata(
            'RS Flip-Flop Test', 20, 20, new Position3D(0, 0, 50));

        // Two NOR gates forming feedback loop
        // NOR1: Controls Q output
        const { nor_t1: nor1_t1, nor_t2: nor1_t2 } = makeNorGate(circuit);
        // NOR2: Controls Q' output
        const { nor_t1: nor2_t1, nor_t2: nor2_t2 } = makeNorGate(circuit);

        // wiring both NOR gates in intertwined feedback
        const nor1_output = circuit.getComponentPinByLabel(nor1_t2, 'emitter');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2_t1, 'base');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2_t2, 'emitter');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1_t2, 'base');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // Create runner - initialization should resolve to stable state
        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        // Get transistor states
        const nor1_t1State = state.componentStates.get(nor1_t1.id);
        const nor1_t2State = state.componentStates.get(nor1_t2.id);
        const nor2_t1State = state.componentStates.get(nor2_t1.id);
        const nor2_t2State = state.componentStates.get(nor2_t2.id);

        expect(nor1_t1State).toBeDefined();
        expect(nor1_t2State).toBeDefined();
        expect(nor2_t1State).toBeDefined();
        expect(nor2_t2State).toBeDefined();

        // Valid stable state: the FEEDBACK transistors must be in opposite states
        // - nor1_t2 receives feedback from Q' (nor2_output)
        // - nor2_t1 receives feedback from Q (nor1_output)
        // - nor1_t1 and nor2_t2 have unconnected bases and always stay closed
        //
        // Stable state 1 (Q=HIGH, Q'=LOW): nor1_t2=closed, nor2_t1=open
        // Stable state 2 (Q=LOW, Q'=HIGH): nor1_t2=open, nor2_t1=closed
        // Invalid: both feedback transistors in same state causes oscillation
        const feedbackBothOpen = nor1_t2State!.state === 'open' && nor2_t1State!.state === 'open';
        const feedbackBothClosed = nor1_t2State!.state === 'closed' && nor2_t1State!.state === 'closed';

        // Non-feedback transistors should always be closed (unconnected base with negative logic)
        expect(nor1_t1State!.state).toBe('closed');
        expect(nor2_t2State!.state).toBe('closed');

        // Feedback transistors should be in opposite states
        expect(feedbackBothOpen || feedbackBothClosed).toBe(false);
      });
      it('RS flip-flop has the desired initial state when one of the input is on', () => {
        const circuit = new Circuit('RS Flip-Flop');
        circuit.metadata = new CircuitMetadata(
            'RS Flip-Flop Test', 20, 20, new Position3D(0, 0, 50));

        // Two NOR gates forming feedback loop
        // NOR1: Controls Q output
        const { nor_t1: nor1_t1, nor_t2: nor1_t2 } = makeNorGate(circuit);
        // NOR2: Controls Q' output
        const { nor_t1: nor2_t1, nor_t2: nor2_t2 } = makeNorGate(circuit);

        // wiring both NOR gates in intertwined feedback
        const nor1_output = circuit.getComponentPinByLabel(nor1_t2, 'emitter');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2_t1, 'base');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2_t2, 'emitter');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1_t2, 'base');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // put nor1 in set state by powering one base
        const nor1_t1_base = circuit.getComponentPinByLabel(nor1_t1, 'base');
        circuit.updateENodeSourceType(nor1_t1_base!.id, ENodeSourceType.Voltage);

        // Create runner - initialization should resolve to stable state
        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        // Get transistor states
        const nor1_t1State = state.componentStates.get(nor1_t1.id);
        const nor1_t2State = state.componentStates.get(nor1_t2.id);
        const nor2_t1State = state.componentStates.get(nor2_t1.id);
        const nor2_t2State = state.componentStates.get(nor2_t2.id);

        // With negative activation logic: base has voltage → OPENS, no voltage → CLOSES
        // SET (nor1_t1.base) is powered:
        //   - nor1_t1 opens (base has voltage) → NOR1 chain broken → Q = LOW
        //   - nor2_t1 closes (base = Q = LOW) → NOR2 chain conducts → Q' = HIGH
        //   - nor1_t2 opens (base = Q' = HIGH)
        //   - nor2_t2 closes (base not connected = LOW)
        expect(nor1_t1State!.state).toBe('open');   // SET = HIGH → opens
        expect(nor1_t2State!.state).toBe('open');   // Q' = HIGH → opens (negative logic!)
        expect(nor2_t1State!.state).toBe('closed'); // Q = LOW → closes
        expect(nor2_t2State!.state).toBe('closed'); // base not connected → closes

        circuit.updateENodeSourceType(nor1_t1_base!.id, null);

        // put nor2 in set state by powering one base
        const nor2_t2_base = circuit.getComponentPinByLabel(nor2_t2, 'base');
        circuit.updateENodeSourceType(nor2_t2_base!.id, ENodeSourceType.Voltage);

        // Create runner - initialization should resolve to stable state
        const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
        const state2 = runner2.getCurrentState();

        // Get transistor states
        const nor1_t1State2 = state2.componentStates.get(nor1_t1.id);
        const nor1_t2State2 = state2.componentStates.get(nor1_t2.id);
        const nor2_t1State2 = state2.componentStates.get(nor2_t1.id);
        const nor2_t2State2 = state2.componentStates.get(nor2_t2.id);

        // RESET (nor2_t2.base) is powered, SET removed:
        //   - nor2_t2 opens (base has voltage) → NOR2 chain broken → Q' = LOW
        //   - nor1_t2 closes (base = Q' = LOW) → NOR1 chain conducts → Q = HIGH
        //   - nor2_t1 opens (base = Q = HIGH)
        //   - nor1_t1 closes (base not connected = LOW, SET removed)
        expect(nor1_t1State2!.state).toBe('closed'); // SET removed, base not connected → closes
        expect(nor1_t2State2!.state).toBe('closed'); // Q' = LOW → closes
        expect(nor2_t1State2!.state).toBe('open');   // Q = HIGH → opens (negative logic!)
        expect(nor2_t2State2!.state).toBe('open');   // RESET = HIGH → opens
      });
    });
    describe('Phase4 - initializationPriority controls RS flip-flop initial state', () => {
      it('changing initializationPriority well inverts default RS initial State', () => {
        const circuit = new Circuit('RS Flip-Flop');
        circuit.metadata = new CircuitMetadata(
            'RS Flip-Flop Test', 20, 20, new Position3D(0, 0, 50));

        // Two NOR gates forming feedback loop
        // NOR1: Controls Q output
        const { nor_t1: nor1_t1, nor_t2: nor1_t2 } = makeNorGate(circuit);
        // NOR2: Controls Q' output
        const { nor_t1: nor2_t1, nor_t2: nor2_t2 } = makeNorGate(circuit);

        // wiring both NOR gates in intertwined feedback
        const nor1_output = circuit.getComponentPinByLabel(nor1_t2, 'emitter');
        const nor2_input1 = circuit.getComponentPinByLabel(nor2_t1, 'base');
        circuit.addWire(nor1_output!.id, nor2_input1!.id);

        const nor2_output = circuit.getComponentPinByLabel(nor2_t2, 'emitter');
        const nor1_input2 = circuit.getComponentPinByLabel(nor1_t2, 'base');
        circuit.addWire(nor2_output!.id, nor1_input2!.id);

        // Create runner - initialization should resolve to stable state
        const runner = new CircuitRunner(circuit, createBehaviorRegistry());
        const state = runner.getCurrentState();

        // Get transistor states
        const nor1_t1State = state.componentStates.get(nor1_t1.id);
        const nor1_t2State = state.componentStates.get(nor1_t2.id);
        const nor2_t1State = state.componentStates.get(nor2_t1.id);
        const nor2_t2State = state.componentStates.get(nor2_t2.id);

        // Q = HIGH means nor1_t2 = closed (NOR1 conducts), nor2_t1 = open (NOR2 broken)
        // Q = LOW means nor1_t2 = open (NOR1 broken), nor2_t1 = closed (NOR2 conducts)
        //
        // Priority semantics: HIGHER priority = processed LAST = output PREVAILS
        // To invert, give the OTHER NOR gate higher priority so it prevails instead
        const qIsHigh = nor1_t2State!.state === 'closed';

        if (qIsHigh) {
          // Initial: Q = HIGH (NOR1 prevailed due to UUID order)
          // To INVERT to Q = LOW: give NOR2 higher priority so NOR2 prevails
          // NOR1 processed first → nor1_t2 opens → Q = LOW
          // NOR2 processed last → nor2_t1 stays closed → Q' = HIGH
          nor2_t1.setParameter('initializationPriority', '1');
          nor2_t2.setParameter('initializationPriority', '1');
          const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
          const state2 = runner2.getCurrentState();

          const nor1_t1State2 = state2.componentStates.get(nor1_t1.id);
          const nor1_t2State2 = state2.componentStates.get(nor1_t2.id);
          const nor2_t1State2 = state2.componentStates.get(nor2_t1.id);
          const nor2_t2State2 = state2.componentStates.get(nor2_t2.id);

          // Q should now be LOW (inverted from HIGH)
          expect(nor1_t1State2!.state).toBe('closed');
          expect(nor1_t2State2!.state).toBe('open');   // Q = LOW (inverted!)
          expect(nor2_t1State2!.state).toBe('closed'); // Q' = HIGH (NOR2 prevailed)
          expect(nor2_t2State2!.state).toBe('closed');
        }
        else {
          // Initial: Q = LOW (NOR2 prevailed due to UUID order)
          // To INVERT to Q = HIGH: give NOR1 higher priority so NOR1 prevails
          // NOR2 processed first → nor2_t1 opens → Q' = LOW
          // NOR1 processed last → nor1_t2 stays closed → Q = HIGH
          nor1_t1.setParameter('initializationPriority', '1');
          nor1_t2.setParameter('initializationPriority', '1');
          const runner2 = new CircuitRunner(circuit, createBehaviorRegistry());
          const state2 = runner2.getCurrentState();

          const nor1_t1State2 = state2.componentStates.get(nor1_t1.id);
          const nor1_t2State2 = state2.componentStates.get(nor1_t2.id);
          const nor2_t1State2 = state2.componentStates.get(nor2_t1.id);
          const nor2_t2State2 = state2.componentStates.get(nor2_t2.id);

          // Q should now be HIGH (inverted from LOW)
          expect(nor1_t1State2!.state).toBe('closed');
          expect(nor1_t2State2!.state).toBe('closed'); // Q = HIGH (NOR1 prevailed)
          expect(nor2_t1State2!.state).toBe('open');   // Q' = LOW (inverted!)
          expect(nor2_t2State2!.state).toBe('closed');
        }
      });
    });
  });
});
