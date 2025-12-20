# Research: Visual Factory Classes

**Feature**: 005-visual-factory-classes
**Date**: 2025-12-09

## Research Questions

### RQ-1: Abstract Class vs Interface for ComponentVisualFactory

**Question**: Should the new ComponentVisualFactory be an abstract class or an interface with a separate base implementation?

**Decision**: Abstract class with default implementations

**Rationale**:
- Abstract class allows providing sensible default implementations for hover, selection, and animation methods
- Concrete factories can override only the methods they need to customize
- TypeScript abstract classes support both required methods (abstract) and optional overridable methods (protected/public with default implementation)
- Easier for developers to extend - just override what they need

**Alternatives Considered**:
- **Interface only**: Would require every implementation to define all methods, even no-ops. Rejected because it increases boilerplate.
- **Mixin pattern**: Over-engineered for this use case; abstract class is simpler and sufficient.

---

### RQ-2: Backward Compatibility with IFactoryRegistry

**Question**: How to maintain backward compatibility with the existing `IFactoryRegistry` interface that expects `ComponentVisualFactory` as a function type?

**Decision**: Create a new interface `IComponentVisualFactory` for the class-based approach, update `IFactoryRegistry` to accept class instances, and provide a `createVisual` method callable by the registry.

**Rationale**:
- The current `ComponentVisualFactory` type is `(component: Component) => THREE.Object3D`
- The new class-based factories will have a `createVisual(component: Component): THREE.Object3D` method
- The registry's `get()` method can return the class instance directly
- Callers will change from `factory(component)` to `factory.createVisual(component)`
- This is a breaking change but confined to the `scene/` module and its consumers

**Implementation Approach**:
```typescript
// New interface for class-based factories
export interface IComponentVisualFactory {
  createVisual(component: Component): THREE.Object3D;
  applyHover(object3D: THREE.Object3D): void;
  removeHover(object3D: THREE.Object3D): void;
  applySelection(object3D: THREE.Object3D): void;
  removeSelection(object3D: THREE.Object3D): void;
  updateAnimation(object3D: THREE.Object3D, state: ComponentState): void;
}

// Registry updated to use class instances
export interface IFactoryRegistry {
  register(type: ComponentType, factory: IComponentVisualFactory): void;
  get(type: ComponentType): IComponentVisualFactory;
  // ... other methods unchanged
}
```

**Migration Path**:
1. Update `IFactoryRegistry` to accept `IComponentVisualFactory` instances
2. Convert existing factory functions to classes implementing `IComponentVisualFactory`
3. Update Controllers to call `factory.createVisual(component)` instead of `factory(component)`
4. Update registration code to use class instances

---

### RQ-3: Default Hover Effect Implementation

**Question**: What should the default hover visual effect be?

**Decision**: Outline/glow effect using emissive material property

**Rationale**:
- Per spec clarification: "Outline/glow effect (add colored outline around component)"
- Three.js `MeshStandardMaterial` supports `emissive` and `emissiveIntensity` properties
- Can create a glow effect by temporarily increasing emissive intensity on hover
- Simple to implement and visually effective
- No additional post-processing or outline shader required for MVP

**Implementation Approach**:
```typescript
applyHover(object3D: THREE.Object3D): void {
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      // Store original values in userData
      child.userData.originalEmissive = child.material.emissive.clone();
      child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
      // Apply hover effect
      child.material.emissive.setHex(0x4488ff);
      child.material.emissiveIntensity = 0.5;
    }
  });
}

removeHover(object3D: THREE.Object3D): void {
  object3D.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.originalEmissive) {
      child.material.emissive.copy(child.userData.originalEmissive);
      child.material.emissiveIntensity = child.userData.originalEmissiveIntensity;
    }
  });
}
```

**Alternatives Considered**:
- **Outline shader/effect composer**: More visually distinct but adds complexity and performance cost
- **Scale increase**: Simple but may cause visual jitter and overlap issues
- **Color change**: Already used for enodes; would conflict

---

### RQ-4: Animation State Management

**Question**: How should animation state updates flow from simulation to visual factories?

**Decision**: The `updateAnimation` method receives the component's simulation state and updates the visual accordingly.

**Rationale**:
- Per spec: "animation state based on simulation data"
- ComponentState from `core/simulation/states/` contains the simulation state
- LED example: `SmallLEDState` has `isLit` property
- Visual factory checks state and updates material/geometry accordingly
- No need for complex animation system for MVP; immediate state application is sufficient

**Implementation Approach**:
```typescript
updateAnimation(object3D: THREE.Object3D, state: ComponentState): void {
  // Default implementation: no-op
  // Subclasses override for component-specific animation
}

// Example: SmallLEDVisualFactory
updateAnimation(object3D: THREE.Object3D, state: SmallLEDState): void {
  const ledMesh = this.findLedMesh(object3D);
  if (ledMesh && ledMesh.material instanceof THREE.MeshStandardMaterial) {
    if (state.isLit) {
      ledMesh.material.emissive.setHex(0xffff00);
      ledMesh.material.emissiveIntensity = 1.0;
    } else {
      ledMesh.material.emissive.setHex(0x000000);
      ledMesh.material.emissiveIntensity = 0;
    }
  }
}
```

---

### RQ-5: Selection State Implementation

**Question**: How should selection state be visually indicated?

**Decision**: Dummy/no-op implementation for now; per spec FR-006 "dummy non-implemented method"

**Rationale**:
- Spec explicitly states "dummy non-implemented method to apply selection visual state"
- Selection is a future feature; current focus is on hover and animation
- Default implementation will be a no-op that can be overridden later

**Implementation**:
```typescript
applySelection(object3D: THREE.Object3D): void {
  // Future implementation - currently a no-op
}

removeSelection(object3D: THREE.Object3D): void {
  // Future implementation - currently a no-op
}
```

---

### RQ-6: Visual State Priority During Simulation

**Question**: How to handle visual state conflicts (e.g., hover vs animation)?

**Decision**: Animation state has highest priority; hover effects are additive when not conflicting.

**Rationale**:
- Per spec edge case: "during simulation, visual changes linked to the simulation have highest priority over all other visual changes (hover, etc...)"
- For LED: animation controls emissive glow for lit state; hover can use different visual indicator or be suppressed
- For non-animated components (battery, switch): hover works normally during simulation

**Implementation Approach**:
- Track whether component is in "animation mode" via userData flag
- `updateAnimation` sets this flag when applying simulation state
- `applyHover` checks flag and may skip or use alternative visual if animation is active
- Alternative hover during animation: slight scale increase or border color

---

### RQ-7: Cleanup on Component Removal

**Question**: How to properly dispose of visual state when component is removed?

**Decision**: No special cleanup needed for current approach.

**Rationale**:
- Per spec edge case: "the component's group is removed and all animations on its children disposed of"
- Current approach stores state in `userData` which is garbage collected with the Object3D
- No external state or event listeners to clean up
- Three.js geometries/materials should be disposed by the scene controllerType as it already does

---

## Technology Best Practices

### Three.js Visual State Management

**Best Practice**: Use `userData` for component-specific state storage
- Three.js objects have a `userData` property for arbitrary data
- Already used in codebase for componentId, componentType, etc.
- Store hover/selection state, original material values, animation references

**Best Practice**: Traverse object hierarchies for state application
- Component visuals are Three.js Groups with multiple children
- Use `object3D.traverse()` to apply effects to all meshes
- Filter by mesh type to avoid affecting non-visual objects (hitboxes)

**Best Practice**: Clone materials before modifying if shared
- Three.js materials can be shared between meshes for performance
- If modifying material for state effects, clone first to avoid affecting other instances
- Current implementation creates materials per component, so this is not an immediate concern

### TypeScript Abstract Class Pattern

**Best Practice**: Use abstract class for factory base
```typescript
export abstract class ComponentVisualFactoryBase implements IComponentVisualFactory {
  abstract createVisual(component: Component): THREE.Object3D;

  applyHover(object3D: THREE.Object3D): void {
    // Default implementation
  }

  // ... other default implementations
}
```

**Best Practice**: Use protected methods for extension points
- Protected helper methods allow subclasses to reuse logic
- `createPinGroup()` can become a protected static method on the base class

---

## Integration Patterns

### Controller Integration

**Pattern**: Factory method injection
- CircuitController and CircuitRunnerController receive `IFactoryRegistry` in constructor
- Registry returns class instances; managers call `factory.createVisual(component)`
- For hover: controllerType's hover callback calls `factory.applyHover(object3D)` / `factory.removeHover(object3D)`
- For animation: simulation renderer calls `factory.updateAnimation(object3D, state)` on state changes

**Implementation Points**:
1. `_createComponentMesh()` - calls `factory.createVisual(component)`
2. Hover callback in `_initializeHoverManager()` - calls `factory.applyHover/removeHover`
3. Simulation state update loop - calls `factory.updateAnimation(object3D, state)`

### Existing Test Patterns

**Pattern**: Mock components for factory tests
- Use `createMockComponent()` helper from existing tests
- Verify Object3D structure, userData, layer assignments

**Pattern**: Visual verification via userData
- Check `userData.type`, `userData.componentId`, etc.
- Don't rely on visual appearance in unit tests; test structure

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base implementation | Abstract class | Default implementations reduce boilerplate |
| Registry interface | Updated to `IComponentVisualFactory` | Clean API; breaking change acceptable |
| Hover effect | Emissive glow | Simple, effective, no extra dependencies |
| Animation approach | Direct state application | Matches existing simulation architecture |
| Selection | No-op placeholder | Per spec; future feature |
| State priority | Animation > hover | Per spec edge cases |
| Cleanup | Automatic via GC | No external state to manage |
