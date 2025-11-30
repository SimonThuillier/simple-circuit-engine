/**
 * Transistor Circuit Factory
 *
 * Creates a circuit demonstrating transistor-based switching with hierarchical
 * control. Shows how a small base current can control a larger collector-emitter
 * current.
 *
 * @module scripts/samples/circuits/transistor-circuit
 */

import { Circuit, CircuitMetadata } from '../../../src/core/Circuit.js';
import { ComponentType } from '../../../src/core/types/ComponentType.js';
import { Position } from '../../../src/core/types/Position.js';
import { Rotation } from '../../../src/core/types/Rotation.js';
import { Position3D } from '../../../src/core/types/Position3D.js';

/**
 * Create a transistor-controlled circuit with hierarchical switching.
 *
 * **Circuit Structure**:
 * - Components: 2× Battery, 2× Switch, Transistor, 2× SmallLED, Lightbulb (8 components)
 * - Topology: Hierarchical control with base and collector-emitter circuits
 * - Base Circuit: Control battery → Switch1 → Transistor base → LED1
 * - Collector Circuit: Power battery → Switch2 → Transistor collector/emitter → LED2 + Lightbulb
 *
 * **Component Details**:
 * - Battery (×2): 2 pins each (cathode=pins[0], anode=pins[1])
 * - Switch (×2): 2 pins each (input=pins[0], output=pins[1])
 * - Transistor: 3 pins (collector=pins[0], base=pins[1], emitter=pins[2])
 * - SmallLED (×2): 2 pins each (anode=pins[0], cathode=pins[1])
 * - Lightbulb: 2 pins (pin1=pins[0], pin2=pins[1])
 *
 * **Circuit Behavior**:
 * - Base circuit controls transistor activation
 * - When Switch1 is closed and base has current, transistor conducts
 * - Collector-emitter path allows current when transistor is active
 * - Multiple load elements (LED2 + Lightbulb) demonstrate current handling
 *
 * @returns Complete Circuit instance ready for JSON serialization
 *
 * @example
 * ```typescript
 * const circuit = createTransistorCircuit();
 * console.log(circuit.name);  // "Transistor Circuit"
 * console.log(circuit.getAllComponents().length);  // 8
 * ```
 */
export function createTransistorCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit('Transistor Circuit');
  circuit.metadata = new CircuitMetadata(
    'Transistor Circuit',
    30,
    10,
    new Position3D(0, 0, 50)
  );

  // Base circuit components
  const baseBattery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 0),
    new Rotation(0)
  );

  const switch1 = circuit.addComponent(
    ComponentType.Switch,
    new Position(7, 0),
    new Rotation(0)
  );

  const transistor = circuit.addComponent(
    ComponentType.Transistor,
    new Position(14, 3),
    new Rotation(0)
  );

  const emitterBP = circuit.addBranchingPoint(new Position(14, 14))

  const led1 = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(21, 0),
    new Rotation(0)
  );

  // Collector circuit components
  const collectorBattery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 7),
    new Rotation(0)
  );

  const switch2 = circuit.addComponent(
    ComponentType.Switch,
    new Position(7, 7),
    new Rotation(0)
  );

  const led2 = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(14, 7),
    new Rotation(0)
  );

  const lightbulb = circuit.addComponent(
    ComponentType.Lightbulb,
    new Position(21, 7),
    new Rotation(0)
  );

  // Decorative cube component
  circuit.addComponent(
        ComponentType.Cube,
        new Position(29, 29),
        new Rotation(0)
    );

    // Wire base circuit: Base battery cathode → Switch1 input
  circuit.addWire(baseBattery.pins[0]!, switch1.pins[0]!);

  // Switch1 output → Transistor base
  circuit.addWire(switch1.pins[1]!, transistor.pins[1]!);

  // Transistor emitter → emitterBP
  circuit.addWire(transistor.pins[2]!, emitterBP.id);

  // emitterBP → LED1 anode (base current path)
  circuit.addWire(emitterBP.id, led1.pins[1]!);

  // LED1 cathode → Base battery anode (complete base circuit)
  circuit.addWire(led1.pins[0]!, baseBattery.pins[1]!);

  // Wire collector circuit: Collector battery cathode → Switch2 input
  circuit.addWire(collectorBattery.pins[0]!, switch2.pins[0]!);

  // Switch2 output → Transistor collector
  circuit.addWire(switch2.pins[1]!, transistor.pins[0]!);

  // Note: In this simplified boolean model, we connect emitter to loads
  // emitterBP → LED2 anode (base current path)
  circuit.addWire(emitterBP.id!, led2.pins[1]!);

  // LED2 cathode → Lightbulb pin1 (series connection)
  circuit.addWire(led2.pins[0]!, lightbulb.pins[0]!);

  // Lightbulb pin2 → Collector battery anode (complete collector circuit)
  circuit.addWire(lightbulb.pins[1]!, collectorBattery.pins[1]!);

  return circuit;
}
