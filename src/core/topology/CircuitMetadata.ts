/**
 * Circuit Metadata
 * Encapsulate user writable circuit options and system managed metadata (camera, size,...)
 * @module core/topology
 */

import {CameraOptions} from "../utils";
import {CircuitOptions} from "./CircuitOptions";
import {
    CIRCUIT_FILE_VERSION,
    DEFAULT_LOGIC_FAMILY,
    type ICircuitMetadata
} from "./types";


export class CircuitMetadata implements ICircuitMetadata {
    /**
     * Create a new CircuitMetadata holding general information about the Circuit.
     *
     * @param version - Circuit version
     * @param options - Circuit options
     * @param size - Size of the circuit grid
     * @param divisions - Divisions in the circuit grid
     * @param cameraOptions - Camera Options at startup
     * @throws {TypeError} If size or divisions are not integers
     */
    constructor(
        public version: string,
        public options: CircuitOptions,
        public size: number,
        public divisions: number,
        public cameraOptions: CameraOptions
    ) {
        if (!Number.isInteger(size) || !Number.isInteger(divisions)) {
            throw new TypeError(
                `Size and divisions must be integers (got size=${size}, divisions=${divisions})`
            );
        }
    }

    toJSON(): ICircuitMetadata {
        return {
            version: this.version,
            options: this.options.toJSON(),
            size: this.size,
            divisions: this.divisions,
            cameraOptions: this.cameraOptions.toJSON(),
        };
    }

    static fromJSON(json: ICircuitMetadata): CircuitMetadata {
        if (CIRCUIT_FILE_VERSION !== json.version) {
            console.warn(`This version of the engine supports v${CIRCUIT_FILE_VERSION} circuit version files. 
      Unexpected behavior may occurs loading v${json.version}.`);
        }

        const options = json.options
            ? CircuitOptions.fromJSON(json.options)
            : new CircuitOptions('Untitled Circuit', DEFAULT_LOGIC_FAMILY);
        return new CircuitMetadata(
            json.version,
            options,
            json.size,
            json.divisions,
            CameraOptions.fromJSON(json.cameraOptions)
        );
    }

    toString(): string {
        return `CircuitMetadata(${this.version}, ${this.options.name}, ${this.options.defaultLogicFamily}, ${this.size}, ${this.divisions}, ${this.cameraOptions.toString()})`;
    }
}