/**
 * Simple LED Circuit Factory
 *
 * Creates a basic circuit with a battery and LED connected in series.
 * This is the most fundamental circuit demonstrating a complete electrical loop.
 *
 * @module scripts/samples/circuits/simple-led-circuit
 */

import { Circuit } from '../../../src/core/topology/Circuit.js';
import { Position } from '../../../src/core/utils/Position.js';
import { Rotation } from '../../../src/core/utils/Rotation.js';
import { CameraOptions } from '../../../src/core/utils/CameraOptions.js';
import { CircuitOptions } from '../../../src/core/topology/CircuitOptions.js';
import {CIRCUIT_FILE_VERSION, CircuitMetadata, ComponentType} from "../../../src";

/**
 * Create a simple LED circuit with battery and LED.
 *
 * **Circuit Structure**:
 * - Components: Battery, SmallLED (2 components)
 * - Topology: Series circuit (single loop)
 * - Wiring:
 *   - Battery anode (pins[1]) → LED anode (pins[0])
 *   - LED cathode (pins[1]) → Battery cathode (pins[0])
 *
 * **Component Details**:
 * - Battery: 2 pins (cathode=pins[0], anode=pins[1])
 * - SmallLED: 2 pins (anode=pins[0], cathode=pins[1])
 *
 * @returns Complete Circuit instance ready for JSON serialization
 *
 * @example
 * ```typescript
 * const circuit = createSimpleLedCircuit();
 * console.log(circuit.name);  // "Simple LED Circuit"
 * console.log(circuit.getAllComponents().length);  // 2
 * ```
 */
export function createSimpleLedCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit(new CircuitOptions('Simple LED Circuit'));
  circuit.metadata = new CircuitMetadata(CIRCUIT_FILE_VERSION, new CircuitOptions('Simple LED Circuit'), 30, 10, new CameraOptions());

  // Add components
  const battery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 0),
    new Rotation(0)
  );

  const led = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(10, 0),
    new Rotation(0)
  );

  // Wire the circuit: Battery anode → LED anode
  circuit.addWire(battery.pins[1], led.pins[0]);

  // Complete the loop: LED cathode → Battery cathode
  circuit.addWire(led.pins[1], battery.pins[0]);

  return circuit;
}
