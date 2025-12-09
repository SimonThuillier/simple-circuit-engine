/**
 * Apply hover visual effect using emissive glow
 *
 * Default implementation traverses all meshes and applies
 * an emissive blue glow effect, storing original values in userData.
 */
import * as THREE from 'three';

/**
 * Apply enode hover visual effect
 */
export function applyENodeHover(enodeGroup: THREE.Group): void {
  if (enodeGroup.userData.isHovered) {
    return; // Already hovered
  }
  enodeGroup.userData.isHovered = true;

  enodeGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const material = child.material as THREE.MeshStandardMaterial;

      if (child.userData.type === 'enodeHitbox') {
        material.opacity = 0.4;
      } else if (child.userData.type === 'enode') {
        material.color.setHex(0xffd700);
        // Apply hover effect
        material.emissiveIntensity = 0.9;
      }
    }
  });
}

/**
 * Remove enode hover visual effect, restoring original materials
 */
export function removeENodeHover(enodeGroup: THREE.Group): void {
  if (!enodeGroup.userData.isHovered) {
    return; // Already hovered
  }
  enodeGroup.userData.isHovered = false;

  enodeGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const material = child.material as THREE.MeshStandardMaterial;

      if (child.userData.type === 'enodeHitbox') {
        material.opacity = 0;
      } else if (child.userData.type === 'enode') {
        material.color.setHex(0xb87333);
        material.emissiveIntensity = 0;
      }
    }
  });
}
