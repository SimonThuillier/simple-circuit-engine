/**
 * Config Panel Manager
 * @module scene/shared/ConfigPanelManager
 *
 * Manages the lifecycle of the lil-gui configuration panel for component editing.
 */

import GUI from 'lil-gui';
import type { UUID } from '@/core/types/Identifier';
import type { IFactoryRegistry } from '../shared/components/ComponentVisualFactory';
import type { ConfigFormDefinition } from '../shared/utils/ConfigPanelTypes';
import type { Component } from '@/core/Component';

/**
 * Manages lil-gui configuration panel for component config editing
 *
 * Responsibilities:
 * - Panel lifecycle (open, close, dispose)
 * - DOM container creation and positioning
 * - lil-gui initialization and form building
 * - Click-outside and Escape key handling
 * - onChange event wiring to update component config
 * - Event emission for config changes
 */
export class ConfigPanelManager {
  private factoryRegistry: IFactoryRegistry;
  private readonly editComponentConfig: (componentId: UUID, newConfig: Map<string, string>) => void;

  // Panel state
  private _isOpen: boolean = false;
  private _currentComponentId: UUID | null = null;
  private gui: GUI | null = null;
  private container: HTMLDivElement | null = null;
  private formDataObject: Record<string, any> = {};

  // Event handlers (stored for removal)
  private clickOutsideHandler: ((event: MouseEvent) => void) | null = null;
  private escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Create a new ConfigPanelManager
   *
   * @param factoryRegistry - Factory registry for getting component factories
   * @param editComponentConfig - Function to edit component config
   * @param _camera - Three.js camera (reserved for future use)
   * @param _domElement - Container DOM element (reserved for future use)
   */
  constructor(
    factoryRegistry: IFactoryRegistry,
    editComponentConfig: (componentId: UUID, newConfig: Map<string, string>) => void,
    _camera: unknown,
    _domElement: unknown
  ) {
    this.factoryRegistry = factoryRegistry;
    this.editComponentConfig = editComponentConfig;
  }

  /**
   * Check if panel is currently open
   */
  get isOpen(): boolean {
    return this._isOpen;
  }

  /**
   * Get the ID of the component currently being edited
   */
  get currentComponentId(): UUID | null {
    return this._currentComponentId;
  }

  /**
   * Open the config panel for a component
   *
   * @param component - component to edit
   * @param screenPosition - Screen coordinates for panel positioning
   * @returns true if panel opened, false if component has no config
   */
  open(component: Component, screenPosition: { x: number; y: number }): boolean {
    // Close existing panel if open
    if (this._isOpen) {
      this.close();
    }

    const factory = this.factoryRegistry.get(component.type);
    const formDef = factory.getConfigFormDefinition();

    if (!formDef || formDef.fields.length === 0) {
      return false; // No configurable options
    }

    // Create container
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.zIndex = '1000';
    document.body.appendChild(this.container);

    // Position container (will be implemented in T007)
    this.positionContainer(screenPosition);

    // Create lil-gui (will be implemented in T008)
    this.buildGui(formDef, component, factory);

    // Setup event listeners (will be implemented in T009, T010)
    this.setupEventListeners();

    this._isOpen = true;
    this._currentComponentId = component.id;

    return true;
  }

  /**
   * Close the config panel if open
   */
  close(): void {
    if (!this._isOpen) {
      return;
    }

    // Destroy lil-gui
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }

    // Remove container from DOM
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    this._isOpen = false;
    this._currentComponentId = null;
    this.formDataObject = {};
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.close();
  }

  /**
   * Position the container adjacent to component (right side preferred)
   */
  private positionContainer(screenPosition: { x: number; y: number }): void {
    if (!this.container) return;

    const PANEL_WIDTH = 300; // Approximate lil-gui width
    const OFFSET_X = 20; // Spacing from component
    const VIEWPORT_PADDING = 10; // Min distance from viewport edge

    // Calculate preferred position (right side)
    let left = screenPosition.x + OFFSET_X;
    let top = screenPosition.y;

    // Check viewport overflow and adjust
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // If panel would overflow right edge, position to left of component
    if (left + PANEL_WIDTH > viewportWidth - VIEWPORT_PADDING) {
      left = screenPosition.x - PANEL_WIDTH - OFFSET_X;
    }

    // If still overflows left edge, clamp to viewport
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING;
    }

    // Clamp top to viewport bounds
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING;
    } else if (top > viewportHeight - VIEWPORT_PADDING) {
      top = viewportHeight - VIEWPORT_PADDING - 100; // Approximate panel height
    }

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  /**
   * Build lil-gui from form definition
   */
  private buildGui(formDef: ConfigFormDefinition, component: any, factory: any): void {
    if (!this.container) return;

    // Create lil-gui instance
    this.gui = new GUI({ container: this.container, width: 280 });
    this.gui.title(`Config: ${component.type}`);

    // Map core config to form data
    const formData = factory.mapCoreConfigToForm(component.config);

    // Convert Map to plain object for lil-gui
    this.formDataObject = {};
    for (const [key, value] of formData.entries()) {
      this.formDataObject[key] = value;
    }

    // Build controls for each field (T015: wire onChange handlers)
    for (const field of formDef.fields) {
      switch (field.type) {
        case 'boolean':
          this.gui
            .add(this.formDataObject, field.key)
            .name(field.label)
            .onChange(() => this.onValueChange(component, factory));
          break;

        case 'dropdown':
          if (field.options) {
            this.gui
              .add(this.formDataObject, field.key, field.options)
              .name(field.label)
              .onChange(() => this.onValueChange(component, factory));
          }
          break;

        case 'number':
          const controller = this.gui
            .add(this.formDataObject, field.key)
            .name(field.label)
            .onChange(() => this.onValueChange(component, factory));
          if (field.min !== undefined) controller.min(field.min);
          if (field.max !== undefined) controller.max(field.max);
          if (field.step !== undefined) controller.step(field.step);
          break;

        case 'text':
          this.gui
            .add(this.formDataObject, field.key)
            .name(field.label)
            .onChange(() => this.onValueChange(component, factory));
          break;

        case 'color':
          this.gui
            .addColor(this.formDataObject, field.key)
            .name(field.label)
            .onChange(() => this.onValueChange(component, factory));
          break;
      }
    }
  }

  /**
   * Handle value change in the config form (T016, T020, T021)
   * Maps form data back to core config and updates the component
   *
   * @param _component - Component being edited
   * @param factory - Visual factory for the component
   */
  private onValueChange(_component: any, factory: any): void {
    // Convert formDataObject back to Map for mapping
    const formDataMap = new Map<string, any>();
    for (const [key, value] of Object.entries(this.formDataObject)) {
      formDataMap.set(key, value);
    }
    // Map form data back to core config format
    const coreConfig = factory.mapFormToCoreConfig(formDataMap) as Map<string, string>;
    // call editComponentConfig to update the component
    if (this._currentComponentId) {
      this.editComponentConfig(this._currentComponentId, coreConfig);
    }
  }

  /**
   * Setup event listeners for dismissing the panel
   */
  private setupEventListeners(): void {
    // Click-outside detection
    this.clickOutsideHandler = (event: MouseEvent) => {
      if (!this.container) return;

      const target = event.target as Node;
      // Check if click is outside the panel container
      if (!this.container.contains(target)) {
        this.close();
      }
    };

    // Add with a small delay to avoid immediate closure from the click that opened it
    setTimeout(() => {
      if (this.clickOutsideHandler) {
        document.addEventListener('pointerdown', this.clickOutsideHandler);
      }
    }, 100);

    // Escape key handling
    this.escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.clickOutsideHandler) {
      document.removeEventListener('pointerdown', this.clickOutsideHandler);
      this.clickOutsideHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
  }
}
