/**
 * Switch-Controlled LED Circuit Factory
 *
 * Creates a circuit with a battery, switch, and LED demonstrating
 * basic circuit control via a switch component.
 *
 * @module scripts/samples/circuits/switch-controlled-led
 */

import { Circuit, CircuitMetadata } from '../../../src/core/Circuit.js';
import { ComponentType } from '../../../src/core/types/ComponentType.js';
import { Position } from '../../../src/core/types/Position.js';
import { Rotation } from '../../../src/core/types/Rotation.js';
import {CameraOptions} from "../../../src/core/types/CameraOptions";

/**
 * Create a switch-controlled LED circuit.
 *
 * **Circuit Structure**:
 * - Components: Battery, Switch, SmallLED (3 components)
 * - Topology: Series circuit with control element (switch)
 * - Wiring:
 *   - Battery anode (pins[1]) → Switch input (pins[0])
 *   - Switch output (pins[1]) → LED anode (pins[0])
 *   - LED cathode (pins[1]) → Battery cathode (pins[0])
 *
 * **Component Details**:
 * - Battery: 2 pins (cathode=pins[0], anode=pins[1])
 * - Switch: 2 pins (input=pins[0], output=pins[1])
 * - SmallLED: 2 pins (anode=pins[0], cathode=pins[1])
 *
 * **Circuit Behavior**:
 * - When switch is closed: Current flows from battery through switch to LED
 * - When switch is open: Circuit is broken, LED is off
 *
 * @returns Complete Circuit instance ready for JSON serialization
 *
 * @example
 * ```typescript
 * const circuit = createSwitchControlledLedCircuit();
 * console.log(circuit.name);  // "Switch-Controlled LED Circuit"
 * console.log(circuit.getAllComponents().length);  // 3
 * ```
 */
export function createSwitchControlledLedCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit('Switch-Controlled LED Circuit');
  circuit.metadata = new CircuitMetadata('Switch-Controlled LED Circuit', 30, 10, new CameraOptions());

  // Add components
  const battery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 0),
    new Rotation(0)
  );

  const switch1 = circuit.addComponent(
    ComponentType.Switch,
    new Position(7, 0),
    new Rotation(0)
  );

  const led = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(14, 0),
    new Rotation(0)
  );

  // Wire the circuit: Battery cathode → Switch input
  circuit.addWire(battery.pins[0], switch1.pins[0]);

  // Switch output → LED anode
  circuit.addWire(switch1.pins[1], led.pins[0]);

  // Complete the loop: LED cathode → Battery anode
  circuit.addWire(led.pins[1], battery.pins[1]);

  return circuit;
}
