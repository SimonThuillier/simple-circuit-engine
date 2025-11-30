/**
 * Two batteries Circuit Factory
 *
 * Creates a basic circuit with two unconnected circuits :
 * one with a battery and an LED, the other a battery and a lightbulb.
 *
 * @module scripts/samples/circuits/two-batteries-circuit
 */

import { Circuit, CircuitMetadata } from '../../../src/core/Circuit.js';
import { ComponentType } from '../../../src/core/types/ComponentType.js';
import { Position } from '../../../src/core/types/Position.js';
import { Rotation } from '../../../src/core/types/Rotation.js';
import { Position3D } from '../../../src/core/types/Position3D.js';


export function createTwoBatteriesCircuit(): Circuit {
    // Create circuit with metadata
    const circuit = new Circuit('Two batteries Circuit');
    circuit.metadata = new CircuitMetadata(
        'Two batteries Circuit',
        30,
        10,
        new Position3D(0, 0, 50)
    );

    // Add components
    const battery1 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 0),
        new Rotation(0)
    );

    const led = circuit.addComponent(
        ComponentType.SmallLED,
        new Position(10, 0),
        new Rotation(0)
    );

    const battery2 = circuit.addComponent(
        ComponentType.Battery,
        new Position(0, 10),
        new Rotation(0)
    );

    const lightbulb = circuit.addComponent(
        ComponentType.Lightbulb,
        new Position(10, 10),
        new Rotation(0)
    );


    // Wire the first circuit
    circuit.addWire(battery1.pins[0], led.pins[0]);
    circuit.addWire(led.pins[1], battery1.pins[1]);

    // Wire the second circuit
    circuit.addWire(battery2.pins[0], lightbulb.pins[0]);
    circuit.addWire(lightbulb.pins[1], battery2.pins[1]);

    return circuit;
}
