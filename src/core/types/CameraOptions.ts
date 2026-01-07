/**
 * Camera Options Type
 *
 * Represents camera configuration options for the 3D scene.
 *
 * @module core/types/CameraOptions
 */

import { type IPosition3D, Position3D } from './Position3D';

export type ICameraOptions = {
  position: IPosition3D;
  lookAtPosition: IPosition3D;
  fov: number;
  near: number;
  far: number;
};

/**
 * Camera configuration options.
 *
 * @example
 * ```typescript
 * // Create with defaults
 * const defaultOpts = new CameraOptions();
 *
 * // Create with custom values
 * const customOpts = new CameraOptions(
 *   new Position3D(0, 20, 10),
 *   new Position3D(5, 0, 0),
 *   60,
 *   0.5,
 *   2000
 * );
 * ```
 */
export class CameraOptions {
  /**
   * Create new camera options.
   *
   * @param position - Camera position (default: 0, 15, 15)
   * @param lookAtPosition - Camera look-at target position (default: 0, 0, 0)
   * @param fov - Field of view in degrees (default: 75)
   * @param near - Near clipping plane distance (default: 0.1)
   * @param far - Far clipping plane distance (default: 1000)
   */
  constructor(
    public readonly position: Position3D = new Position3D(0, 15, 15),
    public readonly lookAtPosition: Position3D = new Position3D(0, 0, 0),
    public readonly fov: number = 75,
    public readonly near: number = 0.1,
    public readonly far: number = 1000
  ) {}

  /**
   * Serialize camera options to JSON.
   *
   * @returns Plain object with camera configuration
   *
   * @example
   * ```typescript
   * const opts = new CameraOptions();
   * const json = opts.toJSON();
   * console.log(json);
   * // {
   * //   position: { x: 0, y: 15, z: 0 },
   * //   lookAtPosition: { x: 0, y: 0, z: 0 },
   * //   fov: 75,
   * //   near: 0.1,
   * //   far: 1000
   * // }
   * ```
   */
  toJSON(): ICameraOptions {
    return {
      position: this.position.toJSON(),
      lookAtPosition: this.lookAtPosition.toJSON(),
      fov: this.fov,
      near: this.near,
      far: this.far,
    };
  }

  /**
   * Deserialize camera options from JSON.
   *
   * @param json - Plain object with camera configuration
   * @returns CameraOptions instance
   *
   * @example
   * ```typescript
   * const json = {
   *   position: { x: 0, y: 20, z: 10 },
   *   lookAtPosition: { x: 5, y: 0, z: 0 },
   *   fov: 60,
   *   near: 0.5,
   *   far: 2000
   * };
   * const opts = CameraOptions.fromJSON(json);
   * console.log(opts.position.y); // 20
   * ```
   */
  static fromJSON(json: ICameraOptions): CameraOptions {
    return new CameraOptions(
      Position3D.fromJSON(json.position),
      Position3D.fromJSON(json.lookAtPosition),
      json.fov,
      json.near,
      json.far
    );
  }

  /**
   * String representation for debugging.
   *
   * @returns String with camera configuration details
   */
  toString(): string {
    return `CameraOptions(position: ${this.position.toString()}, lookAt: ${this.lookAtPosition.toString()}, fov: ${this.fov}, near: ${this.near}, far: ${this.far})`;
  }
}
