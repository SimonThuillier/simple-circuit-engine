/**
 * Three.js Mock for Unit Testing
 * @module tests/mocks/three
 *
 * Provides mock implementations of Three.js classes for isolated unit testing
 * of renderer logic without actual WebGL rendering.
 */

// Mock Vector3
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  distanceTo(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

// Mock Euler
export class Euler {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public order: string = 'XYZ'
  ) {}

  set(x: number, y: number, z: number, order?: string): this {
    this.x = x;
    this.y = y;
    this.z = z;
    if (order) this.order = order;
    return this;
  }
}

// Mock Color
export class Color {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1
  ) {}

  setHex(hex: number): this {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }

  getHex(): number {
    return (
      (Math.round(this.r * 255) << 16) ^ (Math.round(this.g * 255) << 8) ^ Math.round(this.b * 255)
    );
  }
}

// Mock Material
export class Material {
  public type: string = 'Material';
  public color: Color = new Color();
  public emissive: Color = new Color(0, 0, 0);
  public emissiveIntensity: number = 0;
  public transparent: boolean = false;
  public opacity: number = 1;

  dispose(): void {
    // Mock dispose
  }
}

export class MeshStandardMaterial extends Material {
  public type: string = 'MeshStandardMaterial';

  constructor(parameters?: any) {
    super();
    if (parameters) {
      if (parameters.color !== undefined) {
        if (typeof parameters.color === 'number') {
          this.color.setHex(parameters.color);
        }
      }
      if (parameters.emissive !== undefined) {
        if (typeof parameters.emissive === 'number') {
          this.emissive.setHex(parameters.emissive);
        }
      }
      if (parameters.emissiveIntensity !== undefined) {
        this.emissiveIntensity = parameters.emissiveIntensity;
      }
      if (parameters.transparent !== undefined) {
        this.transparent = parameters.transparent;
      }
      if (parameters.opacity !== undefined) {
        this.opacity = parameters.opacity;
      }
    }
  }
}

export class LineBasicMaterial extends Material {
  public type: string = 'LineBasicMaterial';
  public linewidth: number = 1;

  constructor(parameters?: any) {
    super();
    if (parameters) {
      if (parameters.color !== undefined) {
        if (typeof parameters.color === 'number') {
          this.color.setHex(parameters.color);
        }
      }
      if (parameters.linewidth !== undefined) {
        this.linewidth = parameters.linewidth;
      }
    }
  }
}

// Mock Geometry
export class BufferGeometry {
  public type: string = 'BufferGeometry';
  public attributes: any = {};

  dispose(): void {
    // Mock dispose
  }
}

export class BoxGeometry extends BufferGeometry {
  public type: string = 'BoxGeometry';

  constructor(
    public width: number = 1,
    public height: number = 1,
    public depth: number = 1
  ) {
    super();
  }
}

export class SphereGeometry extends BufferGeometry {
  public type: string = 'SphereGeometry';

  constructor(
    public radius: number = 1,
    public widthSegments: number = 32,
    public heightSegments: number = 16
  ) {
    super();
  }
}

export class CylinderGeometry extends BufferGeometry {
  public type: string = 'CylinderGeometry';

  constructor(
    public radiusTop: number = 1,
    public radiusBottom: number = 1,
    public height: number = 1,
    public radialSegments: number = 32
  ) {
    super();
  }
}

// Mock Object3D
export class Object3D {
  public position: Vector3 = new Vector3();
  public rotation: Euler = new Euler();
  public scale: Vector3 = new Vector3(1, 1, 1);
  public visible: boolean = true;
  public userData: Record<string, any> = {};
  public children: Object3D[] = [];
  public parent: Object3D | null = null;

  add(...objects: Object3D[]): this {
    for (const object of objects) {
      if (object === this) continue;
      if (object.parent !== null) {
        object.parent.remove(object);
      }
      object.parent = this;
      this.children.push(object);
    }
    return this;
  }

  remove(...objects: Object3D[]): this {
    for (const object of objects) {
      const index = this.children.indexOf(object);
      if (index !== -1) {
        object.parent = null;
        this.children.splice(index, 1);
      }
    }
    return this;
  }

  clear(): this {
    for (const object of this.children) {
      object.parent = null;
    }
    this.children = [];
    return this;
  }

  traverse(callback: (object: Object3D) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}

export class Group extends Object3D {
  public type: string = 'Group';
}

export class Mesh extends Object3D {
  public type: string = 'Mesh';

  constructor(
    public geometry?: BufferGeometry,
    public material?: Material
  ) {
    super();
  }
}

export class Line extends Object3D {
  public type: string = 'Line';

  constructor(
    public geometry?: BufferGeometry,
    public material?: Material
  ) {
    super();
  }
}

// Mock Scene
export class Scene extends Object3D {
  public type: string = 'Scene';
  public background: Color | null = null;
  public camera: any = null;
}

// Mock Camera
export class Camera extends Object3D {
  public type: string = 'Camera';
}

export class PerspectiveCamera extends Camera {
  public type: string = 'PerspectiveCamera';

  constructor(
    public fov: number = 50,
    public aspect: number = 1,
    public near: number = 0.1,
    public far: number = 2000
  ) {
    super();
  }

  updateProjectionMatrix(): void {
    // Mock update
  }
}

// Mock Lights
export class Light extends Object3D {
  public type: string = 'Light';
  public color: Color = new Color();
  public intensity: number = 1;

  constructor(color?: number | Color, intensity?: number) {
    super();
    if (color !== undefined) {
      if (typeof color === 'number') {
        this.color.setHex(color);
      } else {
        this.color = color;
      }
    }
    if (intensity !== undefined) {
      this.intensity = intensity;
    }
  }
}

export class AmbientLight extends Light {
  public type: string = 'AmbientLight';
}

export class DirectionalLight extends Light {
  public type: string = 'DirectionalLight';
  public target: Object3D = new Object3D();
}

// Mock Helpers
export class GridHelper extends Object3D {
  public type: string = 'GridHelper';

  constructor(
    public size: number = 10,
    public divisions: number = 10,
    public colorCenterLine: number = 0x444444,
    public colorGrid: number = 0x888888
  ) {
    super();
  }
}

export class AxesHelper extends Object3D {
  public type: string = 'AxesHelper';

  constructor(public size: number = 1) {
    super();
  }
}

// Export mock THREE namespace
export default {
  Vector3,
  Euler,
  Color,
  Material,
  MeshStandardMaterial,
  LineBasicMaterial,
  BufferGeometry,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  Object3D,
  Group,
  Mesh,
  Line,
  Scene,
  Camera,
  PerspectiveCamera,
  Light,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  AxesHelper,
};
