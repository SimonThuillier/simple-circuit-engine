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
import type { ComponentType } from 'simple-circuit-engine/core';
import { Position, Rotation, Component } from 'simple-circuit-engine/core';


import type { IEditingTool, ToolType, CursorType } from '../../shared/types';
import type { CircuitController } from '../CircuitController';

/**
 * Tool for adding new components to the circuit
 * Provides ghost preview, grid snapping, and placement validation
 */
export class AddComponentTool implements IEditingTool {
  readonly type: ToolType = 'addComponent';

  private _controller: CircuitController;
  private _componentType: ComponentType | null = null;
  private _ghostPreview: THREE.Group | null = null;
  private _previewPosition: THREE.Vector3 = new THREE.Vector3();
  private _previewRotation: number = 0;
  private _hasOverlap: boolean = false;

  // Event handlers stored for cleanup
  private _gridPositionMoveHandler: ((position: THREE.Vector3) => void) | null = null;
  private _pointerDownHandler: ((event: MouseEvent) => void) | null = null;
  private _wheelHandler: ((event: WheelEvent) => void) | null = null;
  private _keyDownHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(controller: CircuitController) {
    this._controller = controller;
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
      this.handleGridPositionMove(position);
    };
    this._controller.on('gridPositionMove', this._gridPositionMoveHandler);

    // Attach pointerdown listener for placement
    this._pointerDownHandler = (event: MouseEvent) => {
      if (event.button === 0) {
        // Left click only
        this.handlePointerDown(this._previewPosition);
      }
    };
    this._controller.getContainer().addEventListener('pointerdown', this._pointerDownHandler);

    // Attach wheel listener for rotation (User Story 3 - will be used in Phase 5)
    this._wheelHandler = (event: WheelEvent) => {
      event.preventDefault();
      this.handleScroll(event.deltaY, event.ctrlKey);
    };
    this._controller.getContainer().addEventListener('wheel', this._wheelHandler, {
      passive: false,
    });

    // Attach keydown listener for deletion (User Story 4 - T040)
    this._keyDownHandler = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };
    window.addEventListener('keydown', this._keyDownHandler);

    // Create initial preview if component type is already set
    if (this._componentType) {
      this._createGhostPreview();
      // deactivating pan and zoom controls while placing components
      this._controller.getControls()!.enablePan = false;
      this._controller.getControls()!.enableZoom = false;
    }
  }

  /**
   * Called when tool is deactivated (T011)
   * Removes event listeners and cleans up preview objects
   */
  onDeactivate(): void {
    // Remove event listeners
    if (this._gridPositionMoveHandler) {
      this._controller.off('gridPositionMove', this._gridPositionMoveHandler);
      this._gridPositionMoveHandler = null;
    }

    if (this._pointerDownHandler) {
      this._controller.getContainer().removeEventListener('pointerdown', this._pointerDownHandler);
      this._pointerDownHandler = null;
    }

    if (this._wheelHandler) {
      this._controller.getContainer().removeEventListener('wheel', this._wheelHandler);
      this._wheelHandler = null;
    }

    // Remove keydown listener (User Story 4 - T041)
    if (this._keyDownHandler) {
      window.removeEventListener('keydown', this._keyDownHandler);
      this._keyDownHandler = null;
    }

    // Cleanup preview
    this._disposeGhostPreview();
    this._componentType = null;
    this._previewRotation = 0;
    this._hasOverlap = false;

    // reactivating pan and zoom controls
    this._controller.getControls()!.enablePan = true;
    this._controller.getControls()!.enableZoom = true;
  }

  /**
   * Set the component type to place (T012)
   * Creates a new ghost preview for the selected component type
   *
   * @param type - Component type to place
   */
  setComponentType(type: ComponentType | null): void {
    if (this._componentType === type) return; // No change

    this._componentType = type;

    // Recreate ghost preview with new component type
    this._disposeGhostPreview();

    if (!!this._componentType) {
      this._createGhostPreview();
      // deactivating pan and zoom controls while placing components
      this._controller.getControls()!.enablePan = false;
      this._controller.getControls()!.enableZoom = false;
    } else {
      this._controller.getControls()!.enablePan = true;
      this._controller.getControls()!.enableZoom = true;
    }
    this._controller.emit('addComponentTypeChanged', {
      componentType: this._componentType,
    });
  }

  /**
   * Cycle through available component types (for ctrl+scroll)
   * @param forward
   * @private
   */
  private cycleComponentTypes(forward: boolean): void {
    const registry = this._controller.factoryRegistry;
    const types = ['none', ...Array.from(registry.getRegisteredTypes())];
    if (types.length < 2) return;

    let currentIndex = types.indexOf(this._componentType || 'none');
    if (currentIndex < 0) return;

    currentIndex = (currentIndex + (forward ? 1 : -1) + types.length) % types.length;

    const newType = types[currentIndex] === 'none' ? null : (types[currentIndex] as ComponentType);
    this.setComponentType(newType);
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
      const factory = this._controller.factoryRegistry.get(this._componentType);

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
      visual.userData.preview = true; // Mark as preview objects
      visual.traverse((child) => {
        child.userData.preview = true;
      });

      this._ghostPreview = visual;

      // Apply ghost effect (T014)
      this._applyGhostEffect(this._ghostPreview);

      // Set initial position
      this._ghostPreview.position.copy(this._previewPosition);

      // Apply initial rotation
      this._ghostPreview.rotation.y = (this._previewRotation * Math.PI) / 180;

      // add to the scene
      this._controller.getScene().add(this._ghostPreview);
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
      // remove from the scene
      this._controller.getScene().remove(this._ghostPreview);
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
   * Check if preview overlaps with existing components (T021)
   * Uses THREE.Box3 bounding box collision detection
   *
   * @returns true if overlap detected, false otherwise
   * @private
   */
  private _checkOverlap(): boolean {
    if (!this._ghostPreview) {
      return false;
    }

    // Create bounding box for ghost preview
    const previewBox = new THREE.Box3().setFromObject(this._ghostPreview);

    // Get all placed components
    const componentObjects = this._controller.componentObject3Ds;

    // Check each component for overlap
    for (const [_id, componentGroup] of componentObjects) {
      const componentBox = new THREE.Box3().setFromObject(componentGroup);

      // Check intersection
      if (previewBox.intersectsBox(componentBox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply invalid placement visual effect (T022)
   * Sets red emissive color to indicate invalid placement
   *
   * @param object - Object3D to apply effect to
   * @private
   */
  private _applyInvalidEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(0xff0000);
              mat.emissiveIntensity = 0.5;
            }
          });
        } else {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0xff0000);
            child.material.emissiveIntensity = 0.5;
          }
        }
      }
    });
  }

  /**
   * Remove invalid placement visual effect (T023)
   * Restores normal emissive values
   *
   * @param object - Object3D to restore
   * @private
   */
  private _removeInvalidEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: THREE.Material) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
            }
          });
        } else {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      }
    });
  }

  /**
   * Handle gridPosition move events (T016, T024)
   * Updates preview position with grid snapping and checks for overlap
   *
   * @param worldPosition - Current cursor position in world coordinates (already grid-snapped)
   */
  handleGridPositionMove(worldPosition: THREE.Vector3): void {
    // Update preview position as grid-snapped current world position
    this._previewPosition.set(Math.round(worldPosition.x), 0, Math.round(worldPosition.z));

    // Update ghost preview position if it exists
    if (this._ghostPreview) {
      this._ghostPreview.position.copy(this._previewPosition);

      // Check for overlap (T024)
      const previousOverlap = this._hasOverlap;
      this._hasOverlap = this._checkOverlap();

      // Apply or remove invalid effect based on overlap state
      if (this._hasOverlap && !previousOverlap) {
        // Just detected overlap
        this._applyInvalidEffect(this._ghostPreview);
      } else if (!this._hasOverlap && previousOverlap) {
        // Overlap cleared
        this._removeInvalidEffect(this._ghostPreview);
      }
    } else {
      this._hasOverlap = false;
    }
  }

  /**
   * Handle pointer down events for component placement or selection (T017, T019, T026, T027, T042)
   * - If clicking on existing component: select it
   * - If clicking empty space: place component at preview position
   *
   * @param worldPosition - Click position in world coordinates
   */
  handlePointerDown(worldPosition: THREE.Vector3): void {
    // T042: Check if clicking on an existing component
    const hoveredElement = this._controller.getHoveredElement();
    if (hoveredElement && hoveredElement.type === 'component') {
      // Select the component instead of placing
      this._controller
        .getSelectionManager()
        .selectOne(hoveredElement.type, hoveredElement.id, hoveredElement.object3D.userData);
      return;
    }

    // Nothing more to do is no component type is set
    if (!this._componentType) return;

    // Check for overlap before placing (T026, T027)
    if (this._hasOverlap) {
      this._controller.emit('toolValidationError', {
        toolType: this.type,
        mode: 'default',
        errorMessage: 'Cannot place component: position occupied',
      });
      return;
    }

    try {
      // Convert preview rotation to Euler
      const rotation = new Euler(0, (this._previewRotation * Math.PI) / 180, 0);

      // Place component via CircuitController
      const component = this._controller.addComponent(this._componentType, worldPosition, rotation);

      // Emit success event (T019)
      this._controller.emit('toolOperationCompleted', {
        toolType: this.type,
        mode: 'default',
        operationData: {
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
      this._controller.emit('toolValidationError', {
        toolType: this.type,
        mode: 'default',
        errorMessage: `Failed to place component: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Handle scroll events for rotation (User Story 3 - Phase 5)
   * Rotates preview by 90 degrees per scroll
   *
   * @param delta - Scroll delta (positive = scroll down, negative = scroll up)
   * @param ctrlKey
   */
  handleScroll(delta: number, ctrlKey: boolean): void {
    if (ctrlKey) {
      // Cycle through component types while ctrl is held
      this.cycleComponentTypes(delta > 0);
      this._controller.getControls()!.enablePan = false;
      this._controller.getControls()!.enableZoom = false;
      return;
    }

    // Rotate preview by 90 degrees
    this._previewRotation += delta > 0 ? 90 : -90;

    // Normalize to 0-360 range
    this._previewRotation = ((this._previewRotation % 360) + 360) % 360;

    // Update ghost preview rotation if it exists
    if (this._ghostPreview) {
      this._ghostPreview.rotation.y = (this._previewRotation * Math.PI) / 180;
      // Check for overlap (T024)
      const previousOverlap = this._hasOverlap;
      this._hasOverlap = this._checkOverlap();

      // Apply or remove invalid effect based on overlap state
      if (this._hasOverlap && !previousOverlap) {
        // Just detected overlap
        this._applyInvalidEffect(this._ghostPreview);
      } else if (!this._hasOverlap && previousOverlap) {
        // Overlap cleared
        this._removeInvalidEffect(this._ghostPreview);
      }
    } else {
      this._hasOverlap = false;
    }
  }

  /**
   * Handle keyboard events for component deletion (T035-T039)
   * Deletes selected component when Delete or Backspace key is pressed
   *
   * @param event - Keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void {
    // T036: Get current selection from SelectionManager
    const selection = this._controller.getSelectionManager().getSelection();

    // echap to set componentType to null
    if (event.key === 'Escape') {
      this.setComponentType(null);
      return;
    }

    // Check if Delete or Backspace key pressed and a component is selected
    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      selection?.kind === 'mono' &&
      selection.type === 'component'
    ) {
      event.preventDefault();
      event.stopPropagation();

      const componentId = selection.id;

      try {
        // T037: Call removeComponent() on CircuitController
        this._controller.removeComponent(componentId);

        // T038: Clear selection after deletion
        this._controller.getSelectionManager().deselect();

        // T039: Emit toolOperationCompleted event with action:'delete'
        this._controller.emit('toolOperationCompleted', {
          toolType: this.type,
          mode: 'delete',
          operationData: {
            componentId: componentId,
          },
          changedData: {
            removedComponents: [componentId],
          },
        });
      } catch (error) {
        this._controller.emit('toolValidationError', {
          toolType: this.type,
          mode: 'delete',
          errorMessage: `Failed to delete component: ${(error as Error).message}`,
        });
      }
    }
  }

  /**
   * Get current cursor type based on tool state (T018, T043)
   * Returns cursor based on hover state:
   * - 'pointer' when hovering existing component
   * - 'not-allowed' when hovering over occupied space for placement
   * - 'crosshair' otherwise
   *
   * @returns Current cursor style
   */
  getCursorType(): CursorType {
    // T043: Return 'pointer' when hovering existing component
    const hoveredElement = this._controller.getHoveredElement();
    if (hoveredElement && hoveredElement.type === 'component') {
      return 'pointer';
    }

    // User Story 2 - Return 'not-allowed' when overlap detected
    return this._hasOverlap ? 'not-allowed' : 'crosshair';
  }
}
