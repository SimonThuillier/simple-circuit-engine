/**
 * Branching Point Visual Factory
 * @module scene/shared/components/BranchingPointVisualFactory
 *
 * Creates cone-shaped visuals for branching point enodes with:
 * - SourceType-based color coding (white/red/blue)
 * - Hover/selection feedback via brightness shift
 * - Hitbox for raycasting on ENODE layer
 */

import * as THREE from 'three';
import type { ENode } from '@/core/ENode';
import type { ENodeSourceType } from '@/core/types/ENodeSourceType';
import { HitboxLayers } from '../LayerConstants';
import { ENodeType } from '@/core/types/ENodeType';

/**
 * Factory for creating branching point visuals.
 *
 * Branching points are rendered as cones with colors indicating their sourceType:
 * - White (0xffffff): No source (null)
 * - Red (0xff0000): Voltage source
 * - Blue (0x0000ff): Current source
 *
 * Hover and selection states use brightness shift of the base color.
 */
export class BranchingPointVisualFactory {
  // Color constants
  private static readonly COLORS = {
    null: 0xffffff, // white - no source
    Voltage: 0xff0000, // red - voltage source
    Current: 0x0000ff, // blue - current source
  };

  private static readonly DEFAULT_HOVER_COLOR = 0x4488ff; // Yellow for hitbox hover feedback
  private static readonly HOVER_EMISSIVE = 0x4488ff; // Slight brightening on hover
  private static readonly SELECTED_EMISSIVE = 0xff8800; // More brightening on selection

  // Cone geometry dimensions
  private static readonly CONE_RADIUS = 0.3;
  private static readonly CONE_HEIGHT = 0.6;
  private static readonly CONE_SEGMENTS = 16;

  // Hitbox square (larger than visual for easier clicking)
  private static readonly HITBOX_SQUARE = 1;

  /**
   * Create visual representation for a branching point.
   * @param enode - The branching point ENode
   * @returns THREE.Group containing cone mesh and hitbox
   */
  createVisual(enode: ENode): THREE.Group {
    const group = new THREE.Group();
    group.name = ENodeType.BranchingPoint;
    // Set userData for raycasting identification
    group.userData = {
      type: 'enodeGroup',
      componentId: null,
      enodeId: enode.id,
      label: ENodeType.BranchingPoint,
    };

    // Hitbox (box, raycastable)
    const hitboxGeom = new THREE.BoxGeometry(
      BranchingPointVisualFactory.HITBOX_SQUARE,
      BranchingPointVisualFactory.HITBOX_SQUARE,
      BranchingPointVisualFactory.HITBOX_SQUARE
    );
    const hitbox = new THREE.Mesh(
      hitboxGeom,
      new THREE.MeshStandardMaterial({
        color: BranchingPointVisualFactory.DEFAULT_HOVER_COLOR,
        transparent: true,
        opacity: 0,
      })
    );
    hitbox.userData = {
      type: 'enodeHitbox',
      componentId: null,
      enodeId: enode.id,
      label: ENodeType.BranchingPoint,
    };
    hitbox.layers.set(HitboxLayers.ENODE);
    group.add(hitbox);

    // Create cone geometry
    const coneGeometry = new THREE.ConeGeometry(
      BranchingPointVisualFactory.CONE_RADIUS,
      BranchingPointVisualFactory.CONE_HEIGHT,
      BranchingPointVisualFactory.CONE_SEGMENTS
    );
    // Get color based on sourceType
    const color = this.getColorForSourceType(enode.source);
    // Create material with base color
    const coneMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: 0x000000,
      metalness: 0.3,
      roughness: 0.7,
    });

    // Create visual mesh
    const visual = new THREE.Mesh(coneGeometry, coneMaterial);
    visual.userData = {
      type: 'enode',
      componentId: null,
      enodeId: enode.id,
      label: ENodeType.BranchingPoint,
    };
    visual.position.set(0, 0.1, 0); // increase the height a little
    group.add(visual);

    return group;
  }

  /**
   * Update branching point object3D's visual to reflect sourceType change.
   * @param object3D - The branching point basis object3D (group)
   * @param sourceType - New source type
   */
  updateSourceType(object3D: THREE.Object3D, sourceType: ENodeSourceType | null): void {
    object3D.userData.sourceType = sourceType;
    const visual = object3D.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
      const newColor = this.getColorForSourceType(sourceType);
      visual.material.color.setHex(newColor);
    }
  }

  protected colorForElectricalState(state: 'current' | 'voltage' | 'vc' | 'idle'): number {
    switch (state) {
      case 'voltage':
        return 0xff0000; // Red
      case 'current':
        return 0x0000ff; // Blue
      case 'vc':
        return 0xcc00cc; // Magenta
      case 'idle':
      default:
        return 0x000000;
    }
  }

  /**
   * Apply hover object3D feedback.
   * @param object3D - The branching point basis object3D (group)
   */
  applyHover(object3D: THREE.Object3D): void {
    if (object3D.userData.isSelected) {
      // object is selected; skip hover visual
      return;
    }

    const visual = object3D.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
      visual.material.emissive.setHex(BranchingPointVisualFactory.HOVER_EMISSIVE);
    }
  }

  /**
   * Remove hover object3D feedback.
   * @param object3D - The branching point basis object3D (group)
   */
  removeHover(object3D: THREE.Object3D): void {
    if (object3D.userData.isSelected) {
      // object is selected; skip hover visual
      return;
    }

    let fallbackEmissive = 0x000000;
    if(object3D.userData.electricalState){
        fallbackEmissive = this.colorForElectricalState(object3D.userData.electricalState);
    }


    const visual = object3D.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
      visual.material.emissive.setHex(fallbackEmissive);
    }
  }

  /**
   * Apply selection object3D feedback.
   * @param object3D - The branching point basis object3D (group)
   */
  applySelection(object3D: THREE.Object3D): void {
    const visual = object3D.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
      visual.material.emissive.setHex(BranchingPointVisualFactory.SELECTED_EMISSIVE);
    }
    object3D.userData.isSelected = true;
  }

  /**
   * Remove selection object3D feedback.
   * @param object3D - The branching point basis object3D (group)
   */
  removeSelection(object3D: THREE.Object3D): void {
    const visual = object3D.children.find((child) => child.userData.type === 'enode') as
      | THREE.Mesh
      | undefined;

    if (visual && visual.material instanceof THREE.MeshStandardMaterial) {
      visual.material.emissive.setHex(0x000000);
    }
    object3D.userData.isSelected = false;
  }

  /**
   * Get the base color for a sourceType.
   * @param sourceType - Source type (null, 'Voltage', or 'Current')
   * @returns Color hex value
   */
  private getColorForSourceType(sourceType: ENodeSourceType | null | undefined): number {
    if (!sourceType) {
      return BranchingPointVisualFactory.COLORS.null;
    }
    return BranchingPointVisualFactory.COLORS[sourceType];
  }
}
