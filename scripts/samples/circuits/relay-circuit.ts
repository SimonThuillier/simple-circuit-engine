/**
 * Relay Circuit Factory
 *
 * Creates a circuit demonstrating relay-based switching with isolated
 * control and power circuits. This demonstrates how a low-power control
 * circuit can switch a higher-power load circuit.
 *
 * @module scripts/samples/circuits/relay-circuit
 */

import { Circuit, CircuitMetadata } from '../../../src/core/Circuit.js';
import { ComponentType } from '../../../src/core/types/ComponentType.js';
import { Position } from '../../../src/core/types/Position.js';
import { Rotation } from '../../../src/core/types/Rotation.js';
import { Position3D } from '../../../src/core/types/Position3D.js';

/**
 * Create a relay-controlled circuit with isolated control and power domains.
 *
 * **Circuit Structure**:
 * - Components: Battery (control), Switch, Relay, Battery (power), SmallLED, RectangleLED (6 components)
 * - Topology: Dual circuits isolated by relay
 * - Control Circuit: Controls battery → Switch → Relay command pins
 * - Power Circuit: Power battery → Relay power pins → LEDs
 *
 * **Component Details**:
 * - Battery (×2): 2 pins each (cathode=pins[0], anode=pins[1])
 * - Switch: 2 pins (input=pins[0], output=pins[1])
 * - Relay: 4 pins (cmd_in=pins[0], cmd_out=pins[1], power_in=pins[2], power_out=pins[3])
 * - SmallLED: 2 pins (anode=pins[0], cathode=pins[1])
 * - RectangleLED: 2 pins (anode=pins[0], cathode=pins[1])
 *
 * **Circuit Behavior**:
 * - Control circuit: When switch closes, relay coil is energized
 * - Power circuit: When relay is energized, power flows to LEDs
 * - Isolation: Control and power circuits are electrically isolated
 *
 * @returns Complete Circuit instance ready for JSON serialization
 *
 * @example
 * ```typescript
 * const circuit = createRelayCircuit();
 * console.log(circuit.name);  // "Relay Circuit"
 * console.log(circuit.getAllComponents().length);  // 6
 * ```
 */
export function createRelayCircuit(): Circuit {
  // Create circuit with metadata
  const circuit = new Circuit('Relay Circuit');
  circuit.metadata = new CircuitMetadata(
    'Relay Circuit',
    30,
    10,
    new Position3D(0, 0, 50)
  );

  // Control circuit components
  const controlBattery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 0),
    new Rotation(0)
  );

  const switch1 = circuit.addComponent(
    ComponentType.Switch,
    new Position(7, 0),
    new Rotation(0)
  );

  const relay = circuit.addComponent(
    ComponentType.Relay,
    new Position(14, 0),
    new Rotation(0)
  );

  // Power circuit components
  const powerBattery = circuit.addComponent(
    ComponentType.Battery,
    new Position(0, 7),
    new Rotation(0)
  );

  const led1 = circuit.addComponent(
    ComponentType.SmallLED,
    new Position(14, 7),
    new Rotation(0)
  );

  const led2 = circuit.addComponent(
    ComponentType.RectangleLED,
    new Position(21, 7),
    new Rotation(0)
  );

  // Wire control circuit: Control battery anode → Switch input
  circuit.addWire(controlBattery.pins[1], switch1.pins[0]);

  // Switch output → Relay command input
  circuit.addWire(switch1.pins[1], relay.pins[0]);

  // Relay command output → Control battery cathode (complete control loop)
  circuit.addWire(relay.pins[1], controlBattery.pins[0]);

  // Wire power circuit: Power battery anode → Relay power input
  circuit.addWire(powerBattery.pins[1], relay.pins[2]);

  // Relay power output → LED1 anode
  circuit.addWire(relay.pins[3], led1.pins[0]);

  // LED1 cathode → LED2 anode (LEDs in series)
  circuit.addWire(led1.pins[1], led2.pins[0]);

  // LED2 cathode → Power battery cathode (complete power loop)
  circuit.addWire(led2.pins[1], powerBattery.pins[0]);

  return circuit;
}
