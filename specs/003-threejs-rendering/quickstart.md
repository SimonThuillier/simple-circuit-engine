# Quickstart Guide: 3D Circuit SceneManagers

## Overview

This guide shows how to use the CircuitSceneManager and CircuitRunnerSceneManager classes to visualize circuits in 3D using Three.js.

## Installation

The renderers are part of the `simple-circuit-engine` package:

```bash
npm install simple-circuit-engine
```

## Prerequisites

- Modern browser with WebGL 2.0 support
- Three.js 0.181+ (peer dependency, included with simple-circuit-engine)
- TypeScript 5.9+ (for type safety)

## Basic Usage: Static Circuit Visualization

### Step 1: Create a Circuit

```typescript
import { Circuit, Position, Rotation, ComponentType } from 'simple-circuit-engine/core';

// Create circuit
const circuit = new Circuit('My First Circuit');

// Add components
const battery = circuit.addComponent(
  ComponentType.Battery,
  new Position(0, 0),
  new Rotation(0)
);

const led = circuit.addComponent(
  ComponentType.LED,
  new Position(5, 0),
  new Rotation(0)
);

// Connect with a wire
circuit.addWire(battery.pins[1], led.pins[0]);
circuit.addWire(led.pins[1], battery.pins[0]);
```

### Step 2: Setup Component Visual Factories

```typescript
import { FactoryRegistry, createDefaultFactory } from 'simple-circuit-engine/scene';
import * as THREE from 'three';

// Create registry with fallback for unknown components
const registry = new FactoryRegistry(createDefaultFactory());

// Register battery factory
registry.register(ComponentType.Battery, (component) => {
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.componentId = component.id;
  mesh.userData.componentType = component.type;
  return mesh;
});

// Register LED factory
registry.register(ComponentType.LED, (component) => {
  const geometry = new THREE.SphereGeometry(0.4, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.3
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.componentId = component.id;
  mesh.userData.componentType = component.type;
  return mesh;
});
```

### Step 3: Create and Initialize SceneManager

```typescript
import { CircuitSceneManager } from 'simple-circuit-engine/scene';

// Create renderer
const renderer = new CircuitSceneManager(circuit, registry);

// Setup event listeners
renderer.on('ready', () => {
  console.log('SceneManager initialized');
});

renderer.on('error', ({ message, error }) => {
  console.error('Rendering error:', message, error);
});

renderer.on('select', ({ objectId, objectType }) => {
  console.log(`Selected ${objectType}: ${objectId}`);
});

// Initialize with container element
const container = document.getElementById('canvas-container');
renderer.initialize(container, {
  backgroundColor: 0x111111,
  antialias: true,
  showGrid: true
});
```

### Step 4: Setup WebGL SceneManager and Animation Loop

```typescript
// Create Three.js WebGLSceneManager
const webGLSceneManager = new THREE.WebGLSceneManager({ antialias: true });
webGLSceneManager.setSize(container.clientWidth, container.clientHeight);
webGLSceneManager.setPixelRatio(window.devicePixelRatio);
container.appendChild(webGLSceneManager.domElement);

// Get camera from scene
const scene = renderer.getScene();
const camera = scene.camera as THREE.PerspectiveCamera;

// Setup camera controls (optional - using OrbitControls)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
const controls = new OrbitControls(camera, webGLSceneManager.domElement);
controls.enableDamping = true;

// Animation loop
function animate() {
  controls.update(); // Update camera controls
  renderer.render();  // Update renderer state
  webGLSceneManager.render(scene, camera); // Render to canvas
  requestAnimationFrame(animate);
}

animate();
```

### Step 5: Handle Circuit Updates

```typescript
// When circuit topology changes
const newComponent = circuit.addComponent(
  ComponentType.Switch,
  new Position(2.5, 2),
  new Rotation(90)
);

// Update renderer (incremental)
renderer.update({
  addedComponents: [newComponent.id]
});

// Or full update
renderer.update();
```

### Step 6: Cleanup

```typescript
// When done, dispose resources
function cleanup() {
  renderer.dispose();
  webGLSceneManager.dispose();
  controls.dispose();
}

window.addEventListener('beforeunload', cleanup);
```

## Advanced Usage: Simulation Visualization

### Step 1: Create Circuit and Simulation

```typescript
import { Circuit, CircuitRunner, BehaviorRegistry } from 'simple-circuit-engine';
import { SwitchBehavior, LEDBehavior, BatteryBehavior } from 'simple-circuit-engine/behaviors';

// Create circuit (same as above)
const circuit = new Circuit('Simulation Circuit');
// ... add components and wires ...

// Setup behavior registry
const behaviorRegistry = new BehaviorRegistry();
behaviorRegistry.register(ComponentType.Battery, new BatteryBehavior());
behaviorRegistry.register(ComponentType.LED, new LEDBehavior());
behaviorRegistry.register(ComponentType.Switch, new SwitchBehavior());

// Create simulation runner
const circuitRunner = new CircuitRunner(circuit, behaviorRegistry, {
  enableHistory: true,
  historyLimit: 1000
});
```

### Step 2: Create CircuitRunner Scene Manager

```typescript
import { CircuitRunnerSceneManager } from 'simple-circuit-engine/scene';

// Create scene manager (uses same factory registry)
const simSceneManager = new CircuitRunnerSceneManager(circuitRunner, registry);

simSceneManager.on('ready', () => {
  console.log('Simulation scene manager ready');
});

simSceneManager.initialize(container);

// Optional: Adjust interpolation duration
simSceneManager.setInterpolationDuration(150); // 150ms transitions
```

### Step 3: Animation Loop with Simulation

```typescript
let lastTickTime = Date.now();
const TICK_INTERVAL = 100; // Run simulation at 10 TPS

function animateSimulation() {
  const now = Date.now();

  // Advance simulation tick
  if (now - lastTickTime >= TICK_INTERVAL) {
    circuitRunner.tick();
    lastTickTime = now;
  }

  // Render (automatically interpolates between ticks)
  simSceneManager.render();
  webGLSceneManager.render(simSceneManager.getScene(), camera);

  requestAnimationFrame(animateSimulation);
}

animateSimulation();
```

### Step 4: User Commands

```typescript
// Toggle switch during simulation
const switchComponent = circuit.getFirstComponentOfType(ComponentType.Switch);
if (switchComponent) {
  circuitRunner.scheduleCommand({
    componentId: switchComponent.id,
    action: 'toggle',
    tick: circuitRunner.stateManager.getCurrentTick() + 1
  });
}
```

## Switching Between SceneManagers

```typescript
// Start with static renderer
const staticSceneManager = new CircuitSceneManager(circuit, registry);
staticSceneManager.initialize(container);

// Switch to simulation
function switchToSimulation() {
  // Dispose static renderer
  staticSceneManager.dispose();

  // Create and initialize simulation renderer
  const simSceneManager = new CircuitRunnerSceneManager(circuitRunner, registry);
  simSceneManager.initialize(container);

  return simSceneManager;
}

// Switch back to static
function switchToStatic(simSceneManager) {
  simSceneManager.dispose();

  const staticSceneManager = new CircuitSceneManager(circuit, registry);
  staticSceneManager.initialize(container);

  return staticSceneManager;
}
```

## Event Handling Examples

### Handle Hover/Selection

```typescript
renderer.on('hover', ({ objectId, objectType }) => {
  if (objectType === 'component') {
    const component = circuit.getComponent(objectId);
    showTooltip(component);
  }
});

renderer.on('unhover', ({ objectId }) => {
  hideTooltip();
});

renderer.on('select', ({ objectId, objectType }) => {
  if (objectType === 'wire') {
    const wire = circuit.getWire(objectId);
    highlightWire(wire);
  }
});
```

### Handle Errors

```typescript
renderer.on('error', ({ message, error }) => {
  // Log error
  console.error('SceneManager error:', message);
  if (error) {
    console.error('Stack trace:', error.stack);
  }

  // Show user-friendly message
  showErrorNotification('Visualization error occurred. Please refresh the page.');

  // Optional: Attempt recovery
  try {
    renderer.update(); // Try full update
  } catch (e) {
    console.error('Recovery failed:', e);
  }
});
```

## Custom Component Factories

### Advanced Factory with State

```typescript
// LED factory that changes color based on state
registry.register(ComponentType.LED, (component) => {
  const geometry = new THREE.SphereGeometry(0.4, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0x444444, // Default: off
    emissive: 0x000000,
    emissiveIntensity: 0
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.userData.componentId = component.id;
  mesh.userData.componentType = component.type;

  // Store material reference for state updates
  mesh.userData.updateState = (isOn: boolean) => {
    if (isOn) {
      material.color.setHex(0xffff00);
      material.emissive.setHex(0xffff00);
      material.emissiveIntensity = 0.8;
    } else {
      material.color.setHex(0x444444);
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
  };

  return mesh;
});
```

### Complex Multi-Part Factory

```typescript
// Switch factory with multiple parts
registry.register(ComponentType.Switch, (component) => {
  const group = new THREE.Group();

  // Base
  const baseGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.6);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  group.add(base);

  // Toggle lever
  const leverGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const leverMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const lever = new THREE.Mesh(leverGeometry, leverMaterial);
  lever.position.y = 0.3;
  group.add(lever);

  group.userData.componentId = component.id;
  group.userData.componentType = component.type;
  group.userData.lever = lever; // Store reference for animation

  return group;
});
```

## Performance Tips

1. **Use Incremental Updates**: When possible, specify exact changes in `update(changedData)`
2. **Limit Geometry Complexity**: Keep component factories simple (low poly count)
3. **Reuse Materials**: Create shared materials for common component types
4. **Enable Frustum Culling**: Three.js automatically culls off-screen objects
5. **Monitor Frame Rate**: Use browser dev tools to identify bottlenecks

## Troubleshooting

### Issue: Black Screen

- Check WebGL support: `webGLSceneManager.capabilities.isWebGL2`
- Verify camera position: `camera.position.set(0, 0, 50)`
- Add lights to scene: `scene.add(new THREE.AmbientLight(0xffffff, 0.5))`

### Issue: Components Not Visible

- Verify factories are registered for all component types
- Check component positions are within camera view
- Ensure `initialize()` was called before `render()`

### Issue: Slow Performance

- Reduce circuit size (start with <100 components)
- Simplify component geometries (fewer vertices)
- Use Level of Detail (LOD) for distant objects
- Lower `webGLSceneManager.setPixelRatio(1)` on high-DPI displays

### Issue: Memory Leaks

- Always call `renderer.dispose()` before removing
- Call `webGLSceneManager.dispose()` and `controls.dispose()`
- Remove event listeners manually if needed

## Next Steps

- Explore the API documentation for advanced features
- Check out example circuits in `samples/` directory
- Review tests in `tests/unit/scene/` for usage patterns
- Join community discussions for tips and tricks
