/**
 * Two batteries Circuit Factory
 *
 * Creates a basic circuit with two unconnected circuits :
 * one with a battery and an LED, the other a battery and a lightbulb.
 *
 * @module scripts/samples/circuits/two-batteries-circuit
 */

import { Circuit } from '../../../src/core/topology/Circuit.js';
import { Position } from '../../../src/core/utils/Position.js';
import { Rotation } from '../../../src/core/utils/Rotation.js';
import { CameraOptions } from '../../../src/core/utils/CameraOptions.js';
import { CircuitOptions } from '../../../src/core/topology/CircuitOptions.js';
import {CIRCUIT_FILE_VERSION, CircuitMetadata, ComponentType} from "../../../src";


export function createTwoBatteriesCircuit(): Circuit {
    // Create circuit with metadata
    const circuit = new Circuit(new CircuitOptions('Two batteries Circuit'));
    circuit.metadata = new CircuitMetadata(CIRCUIT_FILE_VERSION, new CircuitOptions('Two batteries Circuit'), 30, 10, new CameraOptions());

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
