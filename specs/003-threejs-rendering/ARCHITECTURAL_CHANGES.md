# Architectural Changes - Phase 1-3 POC

**Date**: 2025-12-04
**Feature**: 003-threejs-rendering
**Status**: Phases 1-3 Complete

## Summary

After completing a proof-of-concept implementation of Phases 1-3, we refined the architecture to more accurately reflect the actual responsibilities of the classes and improve clarity.

## Major Changes

### 1. Module Rename: `rendering/` → `scene/`

**Rationale**: These classes manage Three.js **scenes** (Scene + Camera), not rendering orchestration. The actual rendering is performed by the consumer's WebGLRenderer instance. The name `scene` more accurately describes the module's responsibility.

**Impact**:
- All file paths: `src/rendering/` → `src/scene/`
- All test paths: `tests/unit/rendering/` → `tests/unit/scene/`
- All import statements updated
- JSDoc module paths updated

### 2. Class Renames

**CircuitController** (formerly StaticCircuitRenderer):
- More accurately describes that it manages a scene, not rendering
- Aligns with the pattern that Three.js has a dedicated Renderer class
- Consumer creates their own `WebGLRenderer` instance

**CircuitRunnerController** (formerly SimulationCircuitController):
- Renamed for consistency with CircuitController
- Also reflects that it manages simulation scenes
- Emphasizes it operates on CircuitRunner instances

**Rationale**: The "Renderer" suffix was misleading because:
- These classes don't perform actual WebGL rendering
- Three.js already has a `WebGLRenderer` class that does actual rendering
- These classes manage Scene and Camera, which is scene management, not rendering

### 3. API Change: Circuit/CircuitRunner Provided After Initialization

**Old API**:
```typescript
const Controller = new CircuitController(circuit, factoryRegistry);
Controller.initialize(container);
```

**New API**:
```typescript
const Controller = new CircuitController(factoryRegistry);
Controller.initialize(container);
Controller.setCircuit(circuit);  // Can be called multiple times
```

**Rationale**:
- Enables scene controllerType reusability across multiple circuits
- Cleaner separation of concerns: construction vs. initialization vs. content
- Allows switching circuits without recreating Three.js scene
- More flexible for applications that load circuits dynamically

**New Methods Added**:
- `setCircuit(circuit: Circuit | null)` - Set or change the circuit to visualize
- `clearVisuals()` - Clear all visuals without disposing scene controllerType
- `getCamera()` - Get camera directly instead of via scene.camera

### 4. Rendering Orchestration Fully Delegated to Consumer

**Consumer Responsibilities**:
- Create and own `THREE.WebGLRenderer` instance
- Manage animation loop (`requestAnimationFrame`)
- Call `webglRenderer.render(scene, camera)` each frame

**Controller Responsibilities**:
- Manage `THREE.Scene` (add/remove objects, lighting)
- Manage `THREE.PerspectiveCamera` (setup, expose for manipulation)
- Update scene state based on circuit changes
- Emit events for user interactions

**Why**: Complete separation of scene management from rendering orchestration provides maximum flexibility for consumers to integrate into any rendering pipeline.

## File Changes

### Specification Files Updated

- ✅ `spec.md` - All requirements updated with new terminology and API
- ✅ `plan.md` - Project structure, API contracts, data model updated
- ✅ `contracts/CircuitController.ts` - API interface updated with new methods
- ✅ `contracts/types.ts` - Module path updated in JSDoc
- ⏭️ `tasks.md` - All task file paths and descriptions need updates
- ⏭️ `quickstart.md` - Usage examples need updating

### Implementation Files

- ✅ `src/scene/` - Module renamed from `src/rendering/`
- ✅ `src/scene/static/CircuitController.ts` - Renamed from StaticCircuitRenderer
- ✅ `src/scene/index.ts` - Exports updated
- ⏭️ `src/scene/simulation/CircuitRunnerController.ts` - Not yet created (Phase 4)

### Test Files

- ✅ `tests/unit/scene/` - Directory renamed from `tests/unit/rendering/`
- ⏭️ Test file updates pending based on tasks.md

## Migration Guide

For any existing code using the old API:

### Old Code:
```typescript
import { StaticCircuitRenderer, FactoryRegistry } from 'simple-circuit-engine/rendering';

const renderer = new StaticCircuitRenderer(circuit, registry);
renderer.initialize(container);

// Consumer relied on renderer handling some rendering
renderer.render();
```

### New Code:
```typescript
import { CircuitController, FactoryRegistry } from 'simple-circuit-engine/scene';
import * as THREE from 'three';

// Create scene controllerType (no circuit yet)
const Controller = new CircuitController(registry);
Controller.initialize(container);
Controller.setCircuit(circuit);

// Consumer creates and owns WebGLRenderer
const webglRenderer = new THREE.WebGLRenderer();
document.body.appendChild(webglRenderer.domElement);

// Consumer's animation loop
function animate() {
  Controller.render();  // Update scene state
  webglRenderer.render(Controller.getScene(), Controller.getCamera());
  requestAnimationFrame(animate);
}
animate();
```

### Switching Circuits:
```typescript
// Reuse same scene controllerType for different circuits
Controller.setCircuit(circuit1);
// ... work with circuit1 ...
Controller.setCircuit(circuit2);  // Switch without re-initialization
```

## Rationale Summary

These changes emerged from implementing the POC and realizing:

1. **Naming Clarity**: "Controller" more accurately describes what the classes do
2. **Flexibility**: Separating circuit from construction enables reusability
3. **Separation of Concerns**: Consumer controls rendering pipeline, scene controllerType controls scene content
4. **Alignment with Three.js**: Aligns with Three.js architecture where Renderer is a separate concept from Scene

All changes maintain constitutional compliance and improve the architecture without adding complexity.

## Next Steps

1. ✅ Specification documents updated
2. ⏭️ Update tasks.md with new file paths and class names
3. ⏭️ Update quickstart.md with new usage examples
4. ⏭️ Continue Phase 4+ implementation with refined architecture
