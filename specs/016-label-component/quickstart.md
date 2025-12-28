# Quickstart: Label Component Implementation

**Feature**: 016-label-component
**Date**: 2025-12-28

## Prerequisites

- Node.js 18+
- npm 11.6+
- Familiarity with Three.js and TypeScript

## Implementation Steps

### Step 1: Add ComponentType.Label

**File**: `src/core/types/ComponentType.ts`

```typescript
// Add to ComponentType enum
export enum ComponentType {
  // ... existing types ...
  Label = 'label',
}

// Add to COMPONENT_TYPE_METADATA
[ComponentType.Label]: {
  id: 'label',
  name: 'Label',
  pins: new Map([]),  // No pins
  config: new Map([
    ['text', 'Label'],
    ['size', '1']
  ]),
},
```

### Step 2: Create LabelVisualFactory

**File**: `src/scene/shared/components/LabelVisualFactory.ts`

```typescript
import { ComponentVisualFactoryBase } from './ComponentVisualFactory';
import type { Component } from '@/core/Component';
import type { ConfigFormDefinition } from '../types/ConfigTypes';
import * as THREE from 'three';

export class LabelVisualFactory extends ComponentVisualFactoryBase {
  private static readonly MAX_TEXT_LENGTH = 64;
  private static readonly FONT_FAMILY = '"Courier New", Courier, monospace';
  private static readonly TEXT_COLOR = '#333333';

  createVisual(component: Component): THREE.Object3D {
    const group = new THREE.Group();
    group.userData = {
      type: 'componentGroup',
      componentId: component.id,
      componentType: component.type,
    };

    // Hitbox
    const hitbox = this.createComponentHitbox(component.id, group.id, 2, 0.5, 0.1);
    group.add(hitbox);

    // Text mesh
    const textMesh = this.createTextMesh(component.config.get('text') || 'Label');
    textMesh.userData = { type: 'component', componentId: component.id, part: 'text' };
    group.add(textMesh);

    this.updateFromConfiguration(group, component.config);
    return group;
  }

  private createTextMesh(text: string): THREE.Mesh {
    const canvas = this.createTextCanvas(text);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const aspect = canvas.width / canvas.height;
    const geometry = new THREE.PlaneGeometry(aspect * 0.5, 0.5);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.canvas = canvas;
    mesh.userData.texture = texture;
    return mesh;
  }

  private createTextCanvas(text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    ctx.font = `bold ${32 * pixelRatio}px ${LabelVisualFactory.FONT_FAMILY}`;
    const metrics = ctx.measureText(text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH));

    canvas.width = Math.ceil(metrics.width + 16 * pixelRatio);
    canvas.height = Math.ceil(48 * pixelRatio);

    ctx.font = `bold ${32 * pixelRatio}px ${LabelVisualFactory.FONT_FAMILY}`;
    ctx.fillStyle = LabelVisualFactory.TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH), canvas.width / 2, canvas.height / 2);

    return canvas;
  }

  override updateFromConfiguration(object3D: THREE.Object3D, config: Map<string, string>): void {
    // Update text
    const textMesh = this.findTextMesh(object3D);
    if (textMesh) {
      const newText = config.get('text') || 'Label';
      this.updateTextMesh(textMesh, newText);
    }

    // Update scale
    const scale = parseFloat(config.get('size') || '1');
    object3D.scale.set(scale, scale, scale);
  }

  private updateTextMesh(mesh: THREE.Mesh, text: string): void {
    const canvas = mesh.userData.canvas as HTMLCanvasElement;
    const texture = mesh.userData.texture as THREE.CanvasTexture;
    const ctx = canvas.getContext('2d')!;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${32 * pixelRatio}px ${LabelVisualFactory.FONT_FAMILY}`;
    ctx.fillStyle = LabelVisualFactory.TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, LabelVisualFactory.MAX_TEXT_LENGTH), canvas.width / 2, canvas.height / 2);

    texture.needsUpdate = true;
  }

  private findTextMesh(object3D: THREE.Object3D): THREE.Mesh | null {
    let textMesh: THREE.Mesh | null = null;
    object3D.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part === 'text') {
        textMesh = child;
      }
    });
    return textMesh;
  }

  override getConfigFormDefinition(): ConfigFormDefinition {
    return {
      fields: [
        { key: 'text', label: 'Label Text', type: 'text' },
        { key: 'size', label: 'Size', type: 'number', min: 1, max: 4, step: 1 },
      ],
    };
  }

  override mapCoreConfigToForm(config: Map<string, string>): Map<string, any> {
    const formData = new Map<string, any>();
    formData.set('text', config.get('text') || 'Label');
    formData.set('size', parseFloat(config.get('size') || '1'));
    return formData;
  }

  override mapFormToCoreConfig(formData: Map<string, any>): Map<string, string> {
    const config = new Map<string, string>();
    const text = (formData.get('text') || 'Label').slice(0, LabelVisualFactory.MAX_TEXT_LENGTH);
    config.set('text', text || 'Label');
    config.set('size', String(formData.get('size') || 1));
    return config;
  }
}
```

### Step 3: Register Factory in Entry Points

**Files**: `scripts/editor/src/main.ts`, `scripts/engine/src/main.ts`, `scripts/viewer/src/main.ts`, `scripts/simulator/src/main.ts`

```typescript
import { LabelVisualFactory } from '@/scene/shared/components/LabelVisualFactory';

// Add after other factory registrations:
componentsFactoryRegistry.register(ComponentType.Label, new LabelVisualFactory());
```

### Step 4: Write Tests

**File**: `tests/scene/shared/LabelVisualFactory.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LabelVisualFactory } from '@/scene/shared/components/LabelVisualFactory';
import { Component } from '@/core/Component';
import { ComponentType } from '@/core/types/ComponentType';
import { Position } from '@/core/types/Position';
import { Rotation } from '@/core/types/Rotation';
import * as THREE from 'three';

describe('LabelVisualFactory', () => {
  let factory: LabelVisualFactory;

  beforeEach(() => {
    factory = new LabelVisualFactory();
  });

  describe('createVisual', () => {
    it('creates a group with correct userData', () => {
      const component = new Component(
        ComponentType.Label,
        new Position(0, 0),
        new Rotation(0),
        []
      );
      const visual = factory.createVisual(component);

      expect(visual).toBeInstanceOf(THREE.Group);
      expect(visual.userData.componentId).toBe(component.id);
      expect(visual.userData.componentType).toBe(ComponentType.Label);
    });

    it('creates a text mesh with default text', () => {
      const component = new Component(
        ComponentType.Label,
        new Position(0, 0),
        new Rotation(0),
        []
      );
      const visual = factory.createVisual(component);

      // Should have hitbox and text mesh
      expect(visual.children.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getConfigFormDefinition', () => {
    it('returns form definition with text and size fields', () => {
      const formDef = factory.getConfigFormDefinition();

      expect(formDef).not.toBeNull();
      expect(formDef!.fields).toHaveLength(2);
      expect(formDef!.fields[0].key).toBe('text');
      expect(formDef!.fields[1].key).toBe('size');
    });
  });
});
```

## Running the Implementation

```bash
# Run tests
npm test -- --grep "LabelVisualFactory"

# Type check
npm run typecheck

# Build
npm run build

# Run editor to test visually
npm run build:editor && open output/circuit-editor.html
```

## Verification Checklist

- [ ] ComponentType.Label added to enum
- [ ] COMPONENT_TYPE_METADATA includes Label with empty pins
- [ ] LabelVisualFactory creates valid Three.js group
- [ ] Text renders with monospace font
- [ ] Size config scales the visual 1x-4x
- [ ] Config panel shows text and size fields
- [ ] Label can be added, positioned, rotated, deleted
- [ ] Labels persist in circuit JSON save/load
- [ ] All tests pass
- [ ] TypeScript compiles without errors
