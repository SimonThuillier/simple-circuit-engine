/**
 * core utilities types definitions
 * @module core/utils
 */


/**
 * Universally Unique Identifier (RFC 4122 UUID v4).
 */
export type UUID = string;


/**
 * 2D Position Type
 * Represents a 2D position on the circuit grid
 */
export type IPosition = {
    x: number;
    y: number;
};

/**
 * 3D Position Type
 * Represents a 3D position. Used for Camera placement
 */
export type IPosition3D = {
    x: number;
    y: number;
    z: number;
};

/**
 * Circuit camera options (used to position camera at startup)
 */
export type ICameraOptions = {
    position: IPosition3D;
    lookAtPosition: IPosition3D;
    fov: number;
    near: number;
    far: number;
};