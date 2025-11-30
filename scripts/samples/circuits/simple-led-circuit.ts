/**
 * Simple LED Circuit Factory
 *
 * Creates a basic circuit with a battery and LED connected in series.
 * This is the most fundamental circuit demonstrating a complete electrical loop.
 *
 * @module scripts/samples/circuits/simple-led-circuit
 */

import { Circuit, CircuitMetadata } from '../../../src/core/Circuit.js';
import { ComponentType } from '../../../src/core/types/ComponentType.js';
import { Position } from '../../../src/core/types/Position.js';
import { Rotation } from '../../../src/core/types/Rotation.js';
import { Position3D } from '../../../src/core/types/Position3D.js';

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
  const circuit = new Circuit('Simple LED Circuit');
  circuit.metadata = new CircuitMetadata(
    'Simple LED Circuit',
    30,
    10,
    new Position3D(0, 0, 50)
  );

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
