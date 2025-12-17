/**
 * Place Component Tool Implementation
 * @module scene/static/tools/AddComponentTool
 *
 * Tool for adding new components to the circuit with visual preview and validation.
 * User Story 1 (P1 - MVP): Select component type and place on canvas
 * - Hover shows ghost preview at cursor position
 * - Click to place component at preview position
 * - Grid snapping for precise placement
 */

import * as THREE from 'three';
import { Euler } from 'three';
import type { IEditingTool, ToolType, CursorType } from '../../shared/types';
import type { CircuitSceneManager } from '../CircuitSceneManager';
import type { ComponentType } from '../../../core/types/ComponentType';
import { Component } from '../../../core/Component';
import { Position } from '../../../core/types/Position';
import { Rotation } from '../../../core/types/Rotation';

/**
 * Tool for adding new components to the circuit
 * Provides ghost preview, grid snapping, and placement validation
 */
export class AddComponentTool implements IEditingTool {
  readonly type: ToolType = 'addComponent';

  private _sceneManager: CircuitSceneManager;
  private _componentType: ComponentType | null = null;
  private _ghostPreview: THREE.Group | null = null;
  private _previewPosition: THREE.Vector3 = new THREE.Vector3();
  private _previewRotation: number = 0;
  private _hasOverlap: boolean = false;

  // Event handlers stored for cleanup
  private _gridPositionMoveHandler: ((position: THREE.Vector3) => void) | null = null;
  private _pointerDownHandler: ((event: MouseEvent) => void) | null = null;
  private _wheelHandler: ((event: WheelEvent) => void) | null = null;

  constructor(sceneManager: CircuitSceneManager) {
    this._sceneManager = sceneManager;
  }

  /**
   * Called when tool becomes active (T010)
   * Attaches event listeners for hover and click interactions
   */
  onActivate(): void {
    this._previewRotation = 0;
    this._hasOverlap = false;

    // Attach gridPositionMove listener for hover preview updates
    this._gridPositionMoveHandler = (position: THREE.Vector3) => {
      this.handleHover(position);
    };
    this._sceneManager.on('gridPositionMove', this._gridPositionMoveHandler);

    // Attach pointerdown listener for placement
    this._pointerDownHandler = (event: MouseEvent) => {
      if (event.button === 0) {
        // Left click only
        this.handleClick(this._previewPosition);
      }
    };
    this._sceneManager.getContainer().addEventListener('pointerdown', this._pointerDownHandler);

    // Attach wheel listener for rotation (User Story 3 - will be used in Phase 5)
    this._wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      this.handleScroll(event.deltaY);
    };
    this._sceneManager.getContainer().addEventListener('wheel', this._wheelHandler, {
      passive: false,
    });

    // Create initial preview if component type is already set
    if (this._componentType) {
      this._createGhostPreview();
    }
  }

  /**
   * Called when tool is deactivated (T011)
   * Removes event listeners and cleans up preview objects
   */
  onDeactivate(): void {
    // Remove event listeners
    if (this._gridPositionMoveHandler) {
      this._sceneManager.off('gridPositionMove', this._gridPositionMoveHandler);
      this._gridPositionMoveHandler = null;
    }

    if (this._pointerDownHandler) {
      this._sceneManager.getContainer().removeEventListener('pointerdown', this._pointerDownHandler);
      this._pointerDownHandler = null;
    }

    if (this._wheelHandler) {
      this._sceneManager.getContainer().removeEventListener('wheel', this._wheelHandler);
      this._wheelHandler = null;
    }

    // Cleanup preview
    this._disposeGhostPreview();
    this._componentType = null;
    this._previewRotation = 0;
    this._hasOverlap = false;
  }

  /**
   * Set the component type to place (T012)
   * Creates a new ghost preview for the selected component type
   *
   * @param type - Component type to place
   */
  setComponentType(type: ComponentType | null): void {
    this._componentType = type;

    // Recreate ghost preview with new component type
    this._disposeGhostPreview();
    this._createGhostPreview();
  }

  /**
   * Create ghost preview for the current component type (T013)
   * Uses FactoryRegistry to create visual representation
   * @private
   */
  private _createGhostPreview(): void {
    if (!this._componentType) {
      return;
    }

    try {
      const factory = this._sceneManager.getFactoryRegistry().get(this._componentType);

      // Create a temporary component for preview (won't be added to circuit yet)
      const tempComponent = new Component(
        this._componentType,
        new Position(0, 0),
        new Rotation(0),
        [] // Empty pins array for preview
      );

      // Create visual using factory
      const visual = factory.createVisual(tempComponent);

      // Type check: ensure we got a Group object
      if (!(visual instanceof THREE.Group)) {
        console.warn(`Factory returned non-Group object for ${this._componentType}`);
        this._ghostPreview = null;
        return;
      }

      this._ghostPreview = visual;

      // Apply ghost effect (T014)
      this._applyGhostEffect(this._ghostPreview);

      // Set initial position
      this._ghostPreview.position.copy(this._previewPosition);

      // Apply initial rotation
      this._ghostPreview.rotation.y = (this._previewRotation * Math.PI) / 180;
    } catch (error) {
      console.warn(`Failed to create ghost preview for ${this._componentType}:`, error);
      this._ghostPreview = null;
    }
  }

  /**
   * Apply ghost effect to preview object (T014)
   * Makes the preview semi-transparent to indicate it's not yet placed
   *
   * @param object - Object3D to apply ghost effect to
   * @private
   */
  private _applyGhostEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Clone material to avoid affecting placed components (T046 - polish phase)
        if (Array.isArray(child.material)) {
          child.material = child.material.map((mat: THREE.Material) => mat.clone());
          child.material.forEach((mat: THREE.Material) => {
            mat.transparent = true;
            mat.opacity = 0.5;
          });
        } else {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
        }
      }
    });
  }

  /**
   * Dispose ghost preview and cleanup resources
   * @private
   */
  private _disposeGhostPreview(): void {
    if (this._ghostPreview) {
      // Dispose materials and geometry
      this._ghostPreview.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.dispose();
          }
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this._ghostPreview = null;
    }
  }

  /**
   * Get preview objects to render in the scene (T015)
   * Returns the ghost preview if available
   *
   * @returns Array containing ghost preview object
   */
  getPreviewObjects(): THREE.Object3D[] {
    if (this._ghostPreview && this._componentType) {
      return [this._ghostPreview];
    }
    return [];
  }

  /**
   * Handle hover/mouse move events (T016)
   * Updates preview position with grid snapping
   *
   * @param worldPosition - Current cursor position in world coordinates (already grid-snapped)
   */
  handleHover(worldPosition: THREE.Vector3): void {
    // Update preview position (position is already grid-snapped from CircuitSceneManager)
    this._previewPosition.copy(worldPosition);

    // Update ghost preview position if it exists
    if (this._ghostPreview) {
      this._ghostPreview.position.copy(this._previewPosition);
    }

    // TODO: User Story 2 - Overlap detection will be added here
  }

  /**
   * Handle click events for component placement (T017, T019)
   * Validates and places component at preview position
   *
   * @param worldPosition - Click position in world coordinates
   */
  handleClick(worldPosition: THREE.Vector3): void {
    // Validate component type is selected
    if (!this._componentType) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: 'No component type selected. Use setComponentType() first.',
      });
      return;
    }

    // TODO: User Story 2 - Check overlap before placing

    try {
      // Convert preview rotation to Euler
      const rotation = new Euler(0, (this._previewRotation * Math.PI) / 180, 0);

      // Place component via CircuitSceneManager
      const component = this._sceneManager.addComponent(
        this._componentType,
        worldPosition,
        rotation
      );

      // Emit success event (T019)
      this._sceneManager.emit('toolOperationCompleted', {
        toolType: this.type,
        operationData: {
          action: 'add',
          componentId: component.id,
          componentType: this._componentType,
          position: worldPosition.clone(),
          rotation: this._previewRotation,
        },
        changedData: {
          addedComponents: [component.id],
        },
      });
    } catch (error) {
      this._sceneManager.emit('toolValidationError', {
        toolType: this.type,
        errorMessage: `Failed to place component: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Handle scroll events for rotation (User Story 3 - Phase 5)
   * Rotates preview by 90 degrees per scroll
   *
   * @param delta - Scroll delta (positive = scroll down, negative = scroll up)
   */
  handleScroll(delta: number): void {
    // Rotate preview by 90 degrees
    this._previewRotation += delta > 0 ? 90 : -90;

    // Normalize to 0-360 range
    this._previewRotation = ((this._previewRotation % 360) + 360) % 360;

    // Update ghost preview rotation if it exists
    if (this._ghostPreview) {
      this._ghostPreview.rotation.y = (this._previewRotation * Math.PI) / 180;
    }
  }

  /**
   * Get current cursor type based on tool state (T018)
   * Returns 'not-allowed' when hovering over occupied space, 'crosshair' otherwise
   *
   * @returns Current cursor style
   */
  getCursorType(): CursorType {
    // User Story 2 - Will return 'not-allowed' when overlap detected
    return this._hasOverlap ? 'not-allowed' : 'crosshair';
  }
}
