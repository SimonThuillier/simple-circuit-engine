# Quickstart: Map Controls and Hovering Detection

**Feature**: 004-map-controls-hovering
**Date**: 2025-12-08

## Overview

This guide shows how to use MapControls navigation and hover detection in CircuitController and CircuitRunnerController.

---

## Basic Setup

### 1. Initialize with Default Options

```typescript
import { CircuitController } from 'simple-circuit-engine/scene';
import { FactoryRegistry, createDefaultFactory } from 'simple-circuit-engine/scene';

// Create scene controllerType
const registry = new FactoryRegistry(createDefaultFactory());
const controllerType = new CircuitController(registry);

// Initialize with container - MapControls and hover are enabled by default
const container = document.getElementById('circuit-canvas')!;
controllerType.initialize(container);

// Load a circuit
controllerType.setCircuit(myCircuit);
```

### 2. Initialize with Custom Options

```typescript
controllerType.initialize(container, {
  // Standard renderer options
  backgroundColor: 0x1a1a2e,
  cameraFov: 60,

  // MapControls configuration
  mapControls: {
    enableRotate: false,      // Disable rotation for 2D-only view
    enableDamping: true,
    dampingFactor: 0.1,       // Smoother deceleration
    minDistance: 2,           // Prevent zooming too close
    maxDistance: 50,          // Prevent zooming too far
    panSpeed: 1.5,            // Faster panning
  }
});
```

---

## Hover Detection

### Listen for Hover Events

```typescript
// Subscribe to hover events
controllerType.on('hover', ({ objectId, objectType }) => {
  console.log(`Hovering ${objectType}: ${objectId}`);

  // Handle different element types
  if (objectType === 'enodeHitbox') {
    highlightEnode(objectId);
  } else if (objectType === 'componentHitbox') {
    highlightComponent(objectId);
  } else if (objectType === 'wireHitbox') {
    highlightWire(objectId);
  }
});

// Subscribe to unhover events
controllerType.on('unhover', ({ objectId, objectType }) => {
  console.log(`Left ${objectType}: ${objectId}`);
  clearHighlight(objectId);
});
```

### Query Current Hover State

```typescript
// Get currently hovered element (without events)
const hovered = controllerType.getHoveredElement();

if (hovered) {
  console.log(`Currently hovering: ${hovered.type} (${hovered.id})`);
  // hovered.type is: 'enode' | 'component' | 'wire'
  // hovered.id is the element's UUID
  // hovered.object3D is the Three.js hitbox mesh
}
```

### Temporarily Disable Hover

```typescript
// Disable hover during drag operations
controllerType.setHoverEnabled(false);

// Re-enable hover
controllerType.setHoverEnabled(true);

// Check if hover is enabled
if (controllerType.isHoverEnabled()) {
  // Hover detection is active
}
```

---

## MapControls Navigation

### Basic Navigation (Built-in)

Users can navigate automatically:
- **Pan**: Click and drag (left mouse button)
- **Zoom**: Scroll wheel
- **Rotate**: Right-click and drag

### Programmatic Camera Control

```typescript
// Reset camera to view entire circuit
controllerType.resetCamera();

// Reset without animation
controllerType.resetCamera(false);

// Focus on specific element
controllerType.focusOnElement(componentId);

// Focus without animation
controllerType.focusOnElement(componentId, false);
```

### Update Options at Runtime

```typescript
// Disable zoom temporarily
controllerType.updateControlsOptions({ enableZoom: false });

// Change damping
controllerType.updateControlsOptions({ dampingFactor: 0.2 });

// Re-enable zoom
controllerType.updateControlsOptions({ enableZoom: true });
```

### Direct MapControls Access

```typescript
// Get underlying MapControls for advanced usage
const controls = controllerType.getControls();

if (controls) {
  // Access Three.js MapControls directly
  controls.target.set(5, 0, 5);  // Change orbit target
  controls.update();
}
```

---

## Render Loop Integration

MapControls requires an update call in the render loop:

```typescript
const renderer = new THREE.WebGLRenderer({ canvas });

function animate() {
  requestAnimationFrame(animate);

  // Scene controllerType handles MapControls.update() internally in render()
  controllerType.render();

  // Render the scene
  renderer.render(controllerType.getScene(), controllerType.getCamera());
}

animate();
```

---

## CircuitRunnerController (Simulation)

Same API applies to simulation scene controllerType:

```typescript
import { CircuitRunnerController } from 'simple-circuit-engine/scene';

const simManager = new CircuitRunnerController(registry);

simManager.initialize(container, {
  mapControls: {
    enableRotate: true,
    maxDistance: 30,
  }
});

// Same hover API
simManager.on('hover', ({ objectId, objectType }) => {
  // Handle hover in simulation view
});

// Set circuit runner
simManager.setCircuit(myCircuitRunner);
```

---

## Hover Priority

When multiple elements overlap under the cursor, hover detection follows priority:

1. **Enode** (highest) - Electrical nodes, pins
2. **Component** (medium) - Batteries, switches, LEDs
3. **Wire** (lowest) - Wire connections

This ensures precise interaction with connection points even when they're near larger components.

---

## Common Patterns

### Show Tooltip on Hover

```typescript
const tooltip = document.getElementById('tooltip')!;

controllerType.on('hover', ({ objectId, objectType }) => {
  const element = getElementInfo(objectId, objectType);
  tooltip.textContent = element.name;
  tooltip.style.display = 'block';
});

controllerType.on('unhover', () => {
  tooltip.style.display = 'none';
});

// Update tooltip position on mouse move
container.addEventListener('mousemove', (e) => {
  tooltip.style.left = `${e.clientX + 10}px`;
  tooltip.style.top = `${e.clientY + 10}px`;
});
```

### Highlight on Hover

```typescript
const originalMaterials = new Map<string, THREE.Material>();

controllerType.on('hover', ({ objectId }) => {
  const mesh = findVisualMesh(objectId);
  if (mesh && mesh.material) {
    originalMaterials.set(objectId, mesh.material.clone());
    (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x444444);
  }
});

controllerType.on('unhover', ({ objectId }) => {
  const mesh = findVisualMesh(objectId);
  const original = originalMaterials.get(objectId);
  if (mesh && original) {
    mesh.material = original;
    originalMaterials.delete(objectId);
  }
});
```

### Click on Hovered Element

```typescript
container.addEventListener('click', () => {
  const hovered = controllerType.getHoveredElement();
  if (hovered) {
    handleElementClick(hovered.id, hovered.type);
  }
});
```

---

## Cleanup

```typescript
// Dispose scene controllerType (cleans up MapControls and hover listeners)
controllerType.dispose();
```

---

## Summary

| Feature | API |
|---------|-----|
| Hover events | `controllerType.on('hover', ...)`, `controllerType.on('unhover', ...)` |
| Query hover | `controllerType.getHoveredElement()` |
| Toggle hover | `controllerType.setHoverEnabled(bool)` |
| Camera reset | `controllerType.resetCamera()` |
| Focus element | `controllerType.focusOnElement(id)` |
| Update options | `controllerType.updateControlsOptions({...})` |
| Direct access | `controllerType.getControls()` |
