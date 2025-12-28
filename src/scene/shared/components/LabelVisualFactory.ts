/**
 * Label Visual Factory
 * @module scene/shared/components/LabelVisualFactory
 *
 * Provides visual factory for Label components - decorative text elements
 * with no electrical connections. Uses CanvasTexture for crisp text rendering.
 */

import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ConfigFormDefinition } from '../types/ConfigTypes';
import * as THREE from 'three';

/**
 * Visual factory for Label components
 *
 * Creates:
 * - Text mesh using CanvasTexture for stencil/technical font styling
 * - Component hitbox for raycasting
 * - No pin groups (Label has zero pins)
 *
 * Configuration:
 * - text: Display text content (max 64 characters, default "Label")
 * - size: Scale multiplier (1-4, default 1)
 *
 * @example
 * ```typescript
 * const factory = new LabelVisualFactory();
 * const visual = factory.createVisual(labelComponent);
 * scene.add(visual);
 *
 * // Update text
 * const newConfig = new Map([['text', 'Power Supply'], ['size', '2']]);
 * factory.updateFromConfiguration(visual, newConfig);
 * ```
 */
export class LabelVisualFactory extends ComponentVisualFactoryBase {
  /** Maximum text length in characters */
  private static readonly MAX_TEXT_LENGTH = 64;

  /** Font family for technical/stencil aesthetic */
  private static readonly FONT_FAMILY = '"Courier New", Courier, "Liberation Mono", monospace';

  /** Text color (dark gray for readability) */
  private static readonly TEXT_COLOR = '#333333';

  /** Base font size in pixels */
  private static readonly BASE_FONT_SIZE = 32;

  /** Padding around text in pixels */
  private static readonly PADDING = 8;

  /**
   * Create the Three.js visual representation for a Label component
   *
   * @param component - The Label component to visualize
   * @returns THREE.Group containing hitbox and text mesh
   */
  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Get initial text from config
    const text = component.config.get('text') || 'Label';

    // Create text mesh first to get dimensions for hitbox
    const textMesh = this.createTextMesh(text);
    // Preserve canvas/texture refs from createTextMesh, add component metadata
    textMesh.userData.type = 'component';
    textMesh.userData.componentId = component.id;
    textMesh.userData.part = 'text';
    group.add(textMesh);

    // Create hitbox based on text mesh dimensions
    const textGeometry = textMesh.geometry as THREE.PlaneGeometry;
    const width = textGeometry.parameters.width;
    const height = textGeometry.parameters.height;
    const hitbox = this.createComponentHitbox(component.id, group.id, width, height, 0.1);
    group.add(hitbox);

    // Apply initial configuration (size scaling)
    this.updateFromConfiguration(group, component.config);

    return group;
  }

  /**
   * Create a canvas with rendered text
   *
   * @param text - Text to render (truncated to MAX_TEXT_LENGTH)
   * @returns HTMLCanvasElement with rendered text
   */
  private createTextCanvas(text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Handle device pixel ratio for sharp rendering
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scaledFontSize = LabelVisualFactory.BASE_FONT_SIZE * pixelRatio;
    const scaledPadding = LabelVisualFactory.PADDING * pixelRatio;

    // Truncate text to max length
    const displayText = text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH) || 'Label';

    // Set font to measure text
    ctx.font = `bold ${scaledFontSize}px ${LabelVisualFactory.FONT_FAMILY}`;
    const metrics = ctx.measureText(displayText);

    // Calculate canvas dimensions
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(scaledFontSize * 1.2); // Add line height factor

    canvas.width = textWidth + scaledPadding * 2;
    canvas.height = textHeight + scaledPadding * 2;

    // Re-apply font after resize (canvas resize clears context state)
    ctx.font = `bold ${scaledFontSize}px ${LabelVisualFactory.FONT_FAMILY}`;
    ctx.fillStyle = LabelVisualFactory.TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text centered
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);

    return canvas;
  }

  /**
   * Create a text mesh using CanvasTexture
   *
   * @param text - Text to display
   * @returns THREE.Mesh with text texture
   */
  private createTextMesh(text: string): THREE.Mesh {
    const canvas = this.createTextCanvas(text);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Calculate world-space dimensions
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const worldWidth = (canvas.width / pixelRatio) / 50; // Scale factor for scene units
    const worldHeight = (canvas.height / pixelRatio) / 50;

    const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
    const mesh = new THREE.Mesh(geometry, material);

    // Store canvas and texture references for updates
    mesh.userData.canvas = canvas;
    mesh.userData.texture = texture;
    mesh.userData.text = text;

    // Position slightly above ground plane
    mesh.position.set(0, 0.01, 0);
    mesh.rotation.x = -Math.PI / 2; // Lay flat on XZ plane

    return mesh;
  }

  /**
   * Find the text mesh within the component group
   *
   * @param object3D - The component group
   * @returns The text mesh or null if not found
   */
  private findTextMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let textMesh: THREE.Mesh | null = null;
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'text') {
        textMesh = child;
      }
    });
    return textMesh;
  }

  /**
   * Update the text mesh with new text content
   *
   * @param mesh - The text mesh to update
   * @param text - New text content
   */
  private updateTextMesh(mesh: THREE.Mesh, text: string): void {
    const canvas = mesh.userData.canvas as HTMLCanvasElement;
    const texture = mesh.userData.texture as THREE.CanvasTexture;

    if (!canvas || !texture) {
      return;
    }

    const ctx = canvas.getContext('2d')!;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scaledFontSize = LabelVisualFactory.BASE_FONT_SIZE * pixelRatio;

    // Truncate and fallback to default
    const displayText = (text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH)) || 'Label';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw text
    ctx.font = `bold ${scaledFontSize}px ${LabelVisualFactory.FONT_FAMILY}`;
    ctx.fillStyle = LabelVisualFactory.TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);

    // Update texture
    texture.needsUpdate = true;
    mesh.userData.text = displayText;
  }

  /**
   * Update visual based on Label configuration
   *
   * @param object3D - The component group
   * @param config - Configuration map with text and size
   */
  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    // Update text
    const textMesh = this.findTextMesh(object3D);
    if (textMesh) {
      const newText = config.get('text') || 'Label';
      if (textMesh.userData.text !== newText) {
        this.updateTextMesh(textMesh, newText);
      }
    }

    // Update scale
    const size = parseFloat(config.get('size') || '1');
    const clampedSize = Math.max(1, Math.min(4, size));
    object3D.scale.set(clampedSize, clampedSize, clampedSize);
  }

  /**
   * Get config form definition for Label component
   *
   * @returns Form definition with text and size fields
   */
  override getConfigFormDefinition(): ConfigFormDefinition {
    return {
      fields: [
        {
          key: 'text',
          label: 'Label Text',
          type: 'text',
        },
        {
          key: 'size',
          label: 'Size',
          type: 'number',
          min: 1,
          max: 4,
          step: 1,
        },
      ],
    };
  }

  /**
   * Map core config to form data
   *
   * @param config - Core config from Component.config
   * @returns Form data with appropriate types
   */
  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('text', config.get('text') || 'Label');
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  /**
   * Map form data back to core config
   *
   * @param formData - Form data from UI
   * @returns Core config with string values
   */
  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();

    // Handle text with truncation and default fallback
    let text = String(formData.get('text') || 'Label');
    text = text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH);
    if (!text.trim()) {
      text = 'Label';
    }
    config.set('text', text);

    // Handle size
    const size = Math.max(1, Math.min(4, Number(formData.get('size')) || 1));
    config.set('size', String(size));

    return config;
  }
}
