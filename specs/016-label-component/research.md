# Research: Label Component

**Feature**: 016-label-component
**Date**: 2025-12-28

## Decision Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Text Rendering | CanvasTexture on Plane | Zero dependencies, excellent performance, sharp scaling |
| Font Style | `"Courier New", monospace` | Technical look, system font availability |
| Scaling Approach | CSS transform via devicePixelRatio | Sharp text at all zoom levels |

## Research Topics

### 1. Three.js Text Rendering Approaches

**Context**: Need to render configurable text (max 64 chars) in a Three.js scene with stencil/technical styling.

**Options Evaluated**:

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| TextGeometry (three/addons) | True 3D depth, part of Three.js | High polygon count, expensive updates, font preprocessing | ❌ Overkill |
| CanvasTexture on Plane | No deps, excellent perf, any web font | 2D only, requires PR handling | ✅ Selected |
| troika-three-text | Best quality (SDF), any font | Requires npm dependency | ❌ Constraint violation |

**Decision**: CanvasTexture on Plane
- Zero additional dependencies
- Single draw call per label
- Device pixel ratio handling ensures sharpness at 1x-4x scale
- Rotation handled by mesh, not texture
- Follows existing component visual patterns

### 2. Font Selection for Technical/Stencil Style

**Context**: Spec requires "stencil/technical font styling" for retro electronic designer aesthetic.

**Options Evaluated**:

| Font Stack | Style | Availability |
|------------|-------|--------------|
| `"Courier New", monospace` | Technical, typewriter | Universal |
| `"Consolas", "Monaco", monospace` | Modern technical | Windows/Mac |
| `"OCR A Extended", monospace` | OCR/military | Windows only |
| Custom stencil web font | True stencil breaks | Requires asset |

**Decision**: `"Courier New", Courier, "Liberation Mono", monospace`
- Universal availability across all platforms
- Technical/typewriter aesthetic matches electronic designer style
- Bold weight provides good readability
- No additional assets required

### 3. Scaling and Rotation Implementation

**Context**: Labels need to scale 1x-4x and rotate in 90-degree increments.

**Approach**:
- **Scaling**: Apply THREE.Group.scale to the component group (same as existing components like SmallLED)
- **Rotation**: Apply THREE.Group.rotation.z (handled by existing BuildTool rotation logic)
- **Text Sharpness**: Use `devicePixelRatio` when creating canvas texture (cap at 2x for performance)

**Implementation Pattern**:
```typescript
// In updateFromConfiguration:
const scale = parseFloat(config.get('size') || '1');
object3D.scale.set(scale, scale, scale);

// Rotation handled by existing Component.rotation via CircuitController
```

### 4. Configuration Form Integration

**Context**: Label needs text and size config fields in the existing config panel system.

**Pattern** (from SmallLEDVisualFactory):
```typescript
getConfigFormDefinition(): ConfigFormDefinition | null {
  return {
    fields: [
      { key: 'text', label: 'Label Text', type: 'text' },
      { key: 'size', label: 'Size', type: 'number', min: 1, max: 4, step: 1 }
    ],
  };
}
```

### 5. ComponentType Extension

**Context**: Need to add Label to the ComponentType enum without pins.

**Pattern** (from existing Cube type which has no pins):
```typescript
[ComponentType.Label]: {
  id: 'label',
  name: 'Label',
  pins: new Map([]), // No pins
  config: new Map([
    ['text', 'Label'],
    ['size', '1']
  ]),
},
```

## Alternatives Considered

### Alternative A: SVG-based text
- **Rejected**: More complex rendering pipeline, no advantage over Canvas for this use case

### Alternative B: CSS2DRenderer overlay
- **Rejected**: Breaks Three.js scene integration, z-index issues with other components

### Alternative C: Pre-rendered text sprite atlas
- **Rejected**: Static, can't handle dynamic text configuration

## Implementation Risks

| Risk | Mitigation |
|------|------------|
| Text blurry at high zoom | Use devicePixelRatio handling, cap at 2x |
| Canvas size limits | Max 256px width default, sufficient for 64 chars |
| Memory with many labels | Single texture per label, dispose properly |
| Rotation text readability | 90-degree increments only (per spec) |

## Dependencies

**No new npm dependencies required.**

All functionality uses:
- Three.js 0.181+ (already installed)
- Native Canvas API (browser built-in)
- System fonts (universally available)
