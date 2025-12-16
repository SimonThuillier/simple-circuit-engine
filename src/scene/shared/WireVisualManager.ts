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
import type { CircuitSceneManager } from '../static/CircuitSceneManager';
import type { WireMaterialState } from './types';
import { HitboxLayers } from './LayerConstants';

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
  private containerWidth: number = 500;
  private containerHeight: number = 500;

  private _sceneManager: CircuitSceneManager;
  /** Shared LineMaterials for all wires (memory efficient, consistent styling) */
  private wireMaterials: Map<WireMaterialState, LineMaterial> = new Map();
  /** Preview wire for wire creation mode */
  private previewWire: Line2 | null = null;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
    // Create shared LineMaterial with default white color and 2px width
    this.wireMaterials = new Map([
      ['idle', createLine2Material(0xffffff, 2)],
      ['hovered', createLine2Material(0x40dfff, 4)],
      ['selected', createLine2Material(0xffaa00, 3)],
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
    this.containerWidth = width;
    this.containerHeight = height;
    for (const material of this.wireMaterials.values()) {
      material.resolution.set(width, height);
    }
  }

  /**
   * Create or update the visual for a wire
   *
   * @param wire - Wire to render
   * @returns The created/updated Line2 object
   */
  createOrUpdateWire(wire: Wire): Line2 {
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
  computeWirePath(wire: Wire): WirePath {
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
  updateWiresForComponent(componentId: UUID): void {
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
   * Create a preview wire for wire creation mode.
   * @param startPosition - World position of wire start
   * @returns Line2 object for preview
   */
  createPreviewWire(startPosition: THREE.Vector3): Line2 {
    // Remove any existing preview
    this.removePreviewWire();

    // Create preview line geometry with two points (start and end at same position initially)
    const geometry = new LineGeometry();
    geometry.setFromPoints([
      startPosition.clone(),
      startPosition.clone(),
      //startPosition.clone().add(new THREE.Vector3(5, 5, 5))
    ]);

    // Use a slightly different material for preview (dashed or lower opacity)
    const material = createLine2Material(0xcccccc, 3);
    material.opacity = 0.7;
    material.dashed = true;
    material.dashSize = 1;
    material.gapSize = 0.3;
    material.transparent = false;

    const previewLine = new Line2(geometry, material);
    previewLine.renderOrder = 100; // Render on top

    this.previewWire = previewLine;
    this.previewWire.userData = {
      startPosition: startPosition.clone(),
    };

    this._sceneManager.getScene().add(previewLine);

    return previewLine;
  }

  /**
   * Update preview wire endpoint.
   * @param endPosition - World position of wire end
   */
  updatePreviewWire(endPosition: THREE.Vector3): void {
    if (!this.previewWire) {
      return;
    }

    const geometry = this.previewWire.geometry as LineGeometry;

    const startPosition = this.previewWire.userData.startPosition;

    geometry.setFromPoints([startPosition.clone(), endPosition.clone()]);
  }

  /**
   * Remove preview wire from scene.
   */
  removePreviewWire(): void {
    if (this.previewWire) {
      this._sceneManager.getScene().remove(this.previewWire);
      this.previewWire.geometry.dispose();
      (this.previewWire.material as LineMaterial).dispose();
      this.previewWire = null;
    }
  }

  /**
   * Refresh wire geometry after intermediate positions changed.
   * @param wireId - Wire to refresh
   */
  refreshWireGeometry(wireId: UUID): void {
    // Simply re-create the wire using the existing method
    this.updateWire(wireId);
  }

  /**
   * Get insertion index for a new intermediate point on a wire (T058)
   * @param wireId - Wire ID
   * @param worldPosition - Position where user clicked
   * @returns Index where new point should be inserted
   */
  getInsertIndexForPosition(wireId: UUID, worldPosition: THREE.Vector3): number {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return 0;

    const wire = circuit.getWire(wireId);
    if (!wire) return 0;

    // Get wire path
    const wirePath = this.computeWirePath(wire);
    const points = wirePath.points;

    // Find the segment closest to the click position
    let minDistance = Infinity;
    let insertIndex = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1];

      if (!segmentStart || !segmentEnd) continue;

      // Project click position onto segment
      const segmentDir = new THREE.Vector3().subVectors(segmentEnd, segmentStart);
      const segmentLength = segmentDir.length();

      if (segmentLength === 0) continue;

      segmentDir.normalize();
      const toClick = new THREE.Vector3().subVectors(worldPosition, segmentStart);
      const projection = toClick.dot(segmentDir);
      const clampedProjection = Math.max(0, Math.min(segmentLength, projection));

      const closestPoint = segmentStart.clone().addScaledVector(segmentDir, clampedProjection);
      const distance = worldPosition.distanceTo(closestPoint);

      if (distance < minDistance) {
        minDistance = distance;
        insertIndex = i;
      }
    }

    return insertIndex;
  }

  /**
   * Convert 3D world position to 2D screen position (T056)
   * @param worldPosition - World position as Vector3
   * @returns Screen position as Vector2
   */
  private worldToScreen(worldPosition: THREE.Vector3): THREE.Vector2 {
    const camera = this._sceneManager.getCamera();

    const vector = worldPosition.clone();
    vector.project(camera);

    const widthHalf = this.containerWidth / 2;
    const heightHalf = this.containerHeight / 2;

    return new THREE.Vector2(
      vector.x * widthHalf + widthHalf,
      -(vector.y * heightHalf) + heightHalf
    );
  }

  /**
   * Calculate distance between two 2D screen positions (T056)
   * @param screenPos1 - First screen position
   * @param screenPos2 - Second screen position
   * @returns Distance in pixels
   */
  private screenDistance(screenPos1: THREE.Vector2, screenPos2: THREE.Vector2): number {
    return screenPos1.distanceTo(screenPos2);
  }

  /**
   * Find nearest intermediate point on a wire within proximity threshold (T057)
   * @param wireId - Wire ID to search
   * @param clientPos - Client position (event.clientX/Y) to test - will be converted to container-relative
   * @param thresholdPx - Proximity threshold in pixels (default: 10)
   * @returns Object with pointIndex and distance, or null if none found
   */
  findNearestIntermediatePoint(
    wireId: UUID,
    clientPos: THREE.Vector2,
    thresholdPx: number = 10
  ): { pointIndex: number; distance: number } | null {
    const circuit = this._sceneManager.getCircuit();
    if (!circuit) return null;

    const wire = circuit.getWire(wireId);
    if (!wire) return null;

    // Convert client coordinates to container-relative coordinates
    const containerRelativePos = this.clientToContainerCoords(clientPos);

    let nearestIndex = -1;
    let nearestDistance = Infinity;

    // Check each intermediate position
    for (let i = 0; i < wire.intermediatePositions.length; i++) {
      const pos = wire.intermediatePositions[i];
      if (!pos) continue;

      const worldPos = new THREE.Vector3(pos.x, 0, -pos.y);
      const pointScreenPos = this.worldToScreen(worldPos);
      const distance = this.screenDistance(containerRelativePos, pointScreenPos);

      if (distance < thresholdPx && distance < nearestDistance) {
        nearestIndex = i;
        nearestDistance = distance;
      }
    }

    if (nearestIndex >= 0) {
      return { pointIndex: nearestIndex, distance: nearestDistance };
    }

    return null;
  }

  /**
   * Convert client coordinates (event.clientX/Y) to container-relative coordinates
   * @param clientPos - Position in client/viewport coordinates
   * @returns Position relative to the container's top-left corner
   */
  private clientToContainerCoords(clientPos: THREE.Vector2): THREE.Vector2 {
    const container = this._sceneManager.getContainer();
    const rect = container.getBoundingClientRect();

    return new THREE.Vector2(clientPos.x - rect.left, clientPos.y - rect.top);
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

    // Remove preview wire if it exists
    this.removePreviewWire();

    // Dispose shared material once during full cleanup
    for (const material of this.wireMaterials.values()) {
      material.dispose();
    }
    this.wireMaterials.clear();
  }
}
