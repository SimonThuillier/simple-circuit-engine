/**
 * Inverter Circuit Factory
 *
 * Creates a circuit demonstrating an inverter gate with power supply
 * and input/output LED indicators.
 *
 * @module scripts/samples/circuits/inverter-circuit
 */

import { Circuit } from '../../../src/core/topology/Circuit.js';
import { Position } from '../../../src/core/utils/Position.js';
import { Rotation } from '../../../src/core/utils/Rotation.js';
import { CameraOptions } from '../../../src/core/utils/CameraOptions.js';
import { CircuitOptions } from '../../../src/core/topology/CircuitOptions.js';
import {CIRCUIT_FILE_VERSION, CircuitMetadata, ENodeSourceType} from "../../../src";
import {ComponentType} from "../../../src/core/topology/types";

/**
 * Create an inverter-based circuit replacing the former transistor circuit.
 *
 * **Circuit Structure**:
 * - Components: Battery, Switch, Inverter, 2× SmallLED, Lightbulb (6 components)
 * - Topology: Input switch controls inverter, output drives LEDs
 *
 * @returns Complete Circuit instance ready for JSON serialization
 *
 * @example
 * ```typescript
 * const circuit = createInverterCircuit();
 * console.log(circuit.name);  // "Inverter Circuit"
 * console.log(circuit.getAllComponents().length);  // 6+
 * ```
 */
export function createInverterCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit(new CircuitOptions('Inverter Circuit'));
  circuit.metadata = new CircuitMetadata(CIRCUIT_FILE_VERSION, new CircuitOptions('Inverter Circuit'), 30, 10, new CameraOptions());

  // Power supply
  const battery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 0),
    new Rotation(0)
  );

  // Input switch
  const switch1 = circuit.addComponent(
    ComponentType.Switch,
    new Position(7, 0),
    new Rotation(0)
  );

  // Inverter gate
  const inverter = circuit.addComponent(
    ComponentType.Inverter,
    new Position(14, 0),
    new Rotation(0)
  );

  // Power the inverter vcc
  const vcc = circuit.getComponentPinByLabel(inverter, 'vcc');
  circuit.updateENodeSourceType(vcc!.id, ENodeSourceType.Voltage);

  // Output indicators
  const led1 = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(21, 0),
    new Rotation(0)
  );

  const led2 = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(21, 4),
    new Rotation(0)
  );

  const lightbulb = circuit.addComponent(
    ComponentType.Lightbulb,
    new Position(28, 0),
    new Rotation(0)
  );

  // Branching point for output
  const outputBP = circuit.addBranchingPoint(new Position(18, 0));

  // Decorative cube
  circuit.addComponent(ComponentType.Cube, new Position(29, 29), new Rotation(0));

  // Wire input: Battery cathode → Switch input
  circuit.addWire(battery.pins[0]!, switch1.pins[0]!);

  // Switch output → Inverter input
  const inverterInput = circuit.getComponentPinByLabel(inverter, 'input');
  circuit.addWire(switch1.pins[1]!, inverterInput!.id);

  // Inverter output → branching point
  const inverterOutput = circuit.getComponentPinByLabel(inverter, 'output');
  circuit.addWire(inverterOutput!.id, outputBP.id);

  // Branching point → LED1
  circuit.addWire(outputBP.id, led1.pins[0]!);

  // LED1 → Lightbulb
  circuit.addWire(led1.pins[1]!, lightbulb.pins[0]!);

  // Lightbulb → Battery anode (complete main loop)
  circuit.addWire(lightbulb.pins[1]!, battery.pins[1]!);

  // Branching point → LED2
  circuit.addWire(outputBP.id, led2.pins[0]!);

  // LED2 → Battery anode
  circuit.addWire(led2.pins[1]!, battery.pins[1]!);

  return circuit;
}
