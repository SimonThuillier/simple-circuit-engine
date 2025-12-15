/**
 * Wire Visual Manager
 * @module scene/shared/WireVisualManager
 *
 * Manages wire visual rendering with:
 * - Pin-accurate endpoints (derived from component visuals)
 * - Multi-segment rendering via intermediate positions
 * - Dynamic updates during component movement
 */

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { UUID } from '../../core/types/Identifier';
import type { Circuit } from '../../core/Circuit';
import type { Wire } from '../../core/Wire';
import { ENodeType } from '../../core/types/ENodeType';
import { createLine2Material } from './MaterialUtils';
import type {CircuitSceneManager} from "../static/CircuitSceneManager";
import type {WireMaterialState} from "./types";
import {HitboxLayers} from "./LayerConstants";

/**
 * Wire path representation for rendering
 */
export interface WirePath {
  /** Wire ID */
  wireId: UUID;

  /** Ordered points in world space (Three.js coordinates) */
  points: THREE.Vector3[];
}

/**
 * Delegation of CircuitSceneManager which handles wire visual rendering with proper pin targeting and dynamic updates.
 *
 * Key responsibilities:
 * - Create wire visuals with endpoints at actual pin positions
 * - Support multi-segment wires via intermediatePositions
 * - Update wires dynamically when components move/rotate
 * - Update wire materials for hover/selection states
 * - may add and remove wire and branching point object3Ds in the scene directly
 *
 * @example
 * ```typescript
 * const wireManager = new WireVisualManager();
 *
 * // Create wire visual
 * const line = wireManager.createOrUpdateWire(wire, circuit, scene, componentGroups);
 *
 * // Update wires when component moves
 * wireManager.updateWiresForComponent(componentId, circuit, componentGroups);
 * ```
 */
export class WireVisualManager {
  private _sceneManager: CircuitSceneManager;

  /** Shared LineMaterials for all wires (memory efficient, consistent styling) */
  private wireMaterials: Map<WireMaterialState, LineMaterial> = new Map();

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
    // Create shared LineMaterial with default white color and 2px width
    this.wireMaterials = new Map([
        ['idle', createLine2Material(0xffffff, 2)],
        ['hovered', createLine2Material(0x40dfff, 4)],
        ['selected', createLine2Material(0xffaa00, 3)]
    ]);
  }

  /**
   * Set the resolution for LineMaterial rendering
   *
   * MUST be called after initialization and on window/container resize
   * for Line2 to render correctly.
   *
   * @param width - Viewport width in pixels
   * @param height - Viewport height in pixels
   *
   * @example
   * ```typescript
   * wireManager.setResolution(window.innerWidth, window.innerHeight);
   *
   * window.addEventListener('resize', () => {
   *   wireManager.setResolution(window.innerWidth, window.innerHeight);
   * });
   * ```
   */
  setResolution(width: number, height: number): void {
    console.log(`Resolution: ${width}, height: ${height}`);
    for(const material of this.wireMaterials.values()) {
      material.resolution.set(width, height);
    }
  }

  /**
   * Create or update the visual for a wire
   *
   * @param wire - Wire to render
   * @returns The created/updated Line2 object
   */
  createOrUpdateWire(
    wire: Wire
  ): Line2 {

    const wirePath = this.computeWirePath(wire);

    let line = this._sceneManager.getWireObject3Ds().get(wire.id);

    if (line) {
      // Update existing line geometry
      const geometry = new LineGeometry();
      geometry.setFromPoints(wirePath.points);
      line.geometry.dispose();
      line.geometry = geometry;
    } else {
      // Create new Line2
      const geometry = new LineGeometry();
      geometry.setFromPoints(wirePath.points);
      line = new Line2(geometry, this.wireMaterials.get('idle'));
      line.userData = {
        type: 'wire',
        wireId: wire.id,
      };
      // Enable wire hitbox layer
      line.layers.enable(HitboxLayers.WIRE);
      this._sceneManager.getWireObject3Ds().set(wire.id, line);
      // Adding to scene is directly done here
      this._sceneManager.getScene().add(line);
    }
    return line;
  }

  /**
   * Compute the full path for a wire including intermediate positions
   *
   * @param wire - Wire to compute path for
   * @returns WirePath with array of Vector3 points from start to end
   */
  computeWirePath(
    wire: Wire
  ): WirePath {
    const circuit = this._sceneManager.getCircuit()!; // TODO handle null circuit
    const componentObject3Ds = this._sceneManager.getComponentObject3Ds();

    const node1 = circuit.getENode(wire.node1);
    const node2 = circuit.getENode(wire.node2);

    if (!node1 || !node2) {
      throw new Error(`Wire ${wire.id} has invalid node references`);
    }

    // Get start position
    const startPos = this._getENodeWorldPosition(
      node1.id,
      node1.type,
      node1.component,
      circuit,
      componentObject3Ds
    );

    // Get end position
    const endPos = this._getENodeWorldPosition(
      node2.id,
      node2.type,
      node2.component,
      circuit,
      componentObject3Ds
    );

    // Build full path: start -> intermediate positions -> end
    const points: THREE.Vector3[] = [startPos];

    // Add intermediate positions (convert from grid to world coordinates)
    for (const pos of wire.intermediatePositions) {
      points.push(new THREE.Vector3(pos.x, 0, -pos.y));
    }

    points.push(endPos);

    return { wireId: wire.id, points };
  }

  /**
   * Get the world position of an ENode (pin or branching point)
   *
   * For pins: Traverses component group to find pin visual and gets world position
   * For branching points: Converts grid position to world coordinates
   *
   * @param enodeId - The ENode ID
   * @param enodeType - Type of the ENode (Pin or BranchingPoint)
   * @param componentId - Parent component ID (for pins)
   * @param circuit - Circuit for position lookup
   * @param componentGroups - Map of component ID to Three.js objects
   * @returns World position as Vector3
   */
  private _getENodeWorldPosition(
    enodeId: UUID,
    enodeType: ENodeType,
    componentId: UUID | undefined,
    circuit: Circuit,
    componentGroups: Map<UUID, THREE.Object3D>
  ): THREE.Vector3 {
    if (enodeType === ENodeType.Pin && componentId) {
      const componentGroup = componentGroups.get(componentId);
      if (componentGroup) {
        const pinPosition = this.getPinWorldPositionFromGroup(enodeId, componentGroup);
        if (pinPosition) {
          return pinPosition;
        }
      }
      // Fallback to component center if pin not found in visual hierarchy
      // TODO: handles regularly when branching points are renderered as scene objects
      const enode = circuit.getENode(enodeId);
      if (enode) {
        const pos = enode.getPosition(circuit);
        return new THREE.Vector3(pos.x, 0, -pos.y);
      }
    }

    // Branching point or fallback: use ENode.getPosition()
    const enode = circuit.getENode(enodeId);
    if (!enode) {
      throw new Error(`ENode ${enodeId} not found`);
    }
    const pos = enode.getPosition(circuit);
    return new THREE.Vector3(pos.x, 0, -pos.y);
  }

  /**
   * Get pin world position by traversing component group
   *
   * @param enodeId - The pin's ENode ID
   * @param componentGroup - The component's Three.js group
   * @returns World position of the pin, or null if not found
   */
  getPinWorldPositionFromGroup(
    enodeId: UUID,
    componentGroup: THREE.Object3D
  ): THREE.Vector3 | null {
    const target = new THREE.Vector3();
    let found = false;

    componentGroup.traverse((child) => {
      if (found) return;

      // Look for enode visual or enodeGroup with matching ID
      if (
        child.userData.enodeId === enodeId ||
        (child.userData.type === 'enodeGroup' && child.userData.enodeId === enodeId)
      ) {
        child.getWorldPosition(target);
        found = true;
      }
    });

    return found ? target : null;
  }

  /**
   * Update all wires connected to a component
   *
   * Called when a component is moved or rotated to update wire endpoints.
   *
   * @param componentId - Component that moved
   */
  updateWiresForComponent(
    componentId: UUID
  ): void {
    const circuit = this._sceneManager.getCircuit()!; // TODO handle null circuit

    const component = circuit.getComponent(componentId);
    if (!component) return;

    // Find all wires connected to this component's pins
    const wireIdsToUpdate = new Set<UUID>();

    for (const pinId of component.pins) {
      const enode = circuit.getENode(pinId);
      if (enode) {
        for (const wireId of enode.wires) {
          wireIdsToUpdate.add(wireId);
        }
      }
    }

    // Update each wire
    for (const wireId of wireIdsToUpdate) {
      const wire = circuit.getWire(wireId);
      if (wire) {
        this.createOrUpdateWire(wire);
      }
    }
  }

  /**
   * Update a specific wire's geometry
   *
   * @param wireId - Wire ID to update
   */
  updateWire(wireId: UUID): void {
    const circuit = this._sceneManager.getCircuit()!; // TODO handle null circuit

    const wire = circuit.getWire(wireId);
    if (wire) {
      this.createOrUpdateWire(wire);
    }
  }

  applyHoveredVisual(wireId: UUID): void {
    const line = this._sceneManager.getWireObject3Ds().get(wireId);
    if (!line) return;
    if (line.material === this.wireMaterials.get('selected')) return;
    if (line.material === this.wireMaterials.get('hovered')) return;

    line.material = this.wireMaterials.get('hovered')!;
  }

  removeHoveredVisual(wireId: UUID): void {
    const line = this._sceneManager.getWireObject3Ds().get(wireId);
    if (!line) return;
    if (line.material !== this.wireMaterials.get('hovered')) return;

    line.material = this.wireMaterials.get('idle')!;
  }

  applySelectedVisual(wireId: UUID): void {
    const line = this._sceneManager.getWireObject3Ds().get(wireId);
    if (!line) return;
    if (line.material === this.wireMaterials.get('selected')) return;

    line.material = this.wireMaterials.get('selected')!;
  }

  removeSelectedVisual(wireId: UUID): void {
    const line = this._sceneManager.getWireObject3Ds().get(wireId);
    if (!line) return;
    if (line.material !== this.wireMaterials.get('selected')) return;

    line.material = this.wireMaterials.get('idle')!;
  }

  /**
   * Remove a wire visual from the scene
   *
   * @param wireId - Wire ID to remove
   */
  removeWire(wireId: UUID): void {
    const wireLines = this._sceneManager.getWireObject3Ds();
    const scene = this._sceneManager.getScene();

    const line = wireLines.get(wireId);
    if (line) {
      scene.remove(line);
      line.geometry.dispose();
      // Do NOT dispose material - it's shared across all wires
      wireLines.delete(wireId);
    }
  }

  /**
   * Get the Line2 object for a wire
   *
   * @param wireId - Wire ID
   * @returns Line2 or undefined if not found
   */
  getWireLine(wireId: UUID): Line2 | undefined {
    return this._sceneManager.getWireObject3Ds().get(wireId);
  }

  /**
   * Check if a wire visual exists
   *
   * @param wireId - Wire ID
   * @returns true if wire visual exists
   */
  hasWire(wireId: UUID): boolean {
    return this._sceneManager.getWireObject3Ds().has(wireId);
  }

  /**
   * Get all wire IDs managed by this manager
   *
   * @returns Array of wire UUIDs
   */
  getWireIds(): UUID[] {
    return Array.from(this._sceneManager.getWireObject3Ds().keys());
  }

  /**
   * Clean up all managed wire visuals
   */
  dispose(): void {
    const wireLines = this._sceneManager.getWireObject3Ds();
    const scene = this._sceneManager.getScene();
    for (const [_wireId, line] of wireLines) {
      scene.remove(line);
      line.geometry.dispose();
      // Individual wire materials are NOT disposed here - only geometries
    }
    wireLines.clear();

    // Dispose shared material once during full cleanup
    for(const material of this.wireMaterials.values()) {
      material.dispose();
    }
    this.wireMaterials.clear();
  }
}
