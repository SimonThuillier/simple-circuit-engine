/**
 * Component Material Types
 * @module scene/shared/components/types
 *
 * Enums and shared material dictionary for the component visual factory system.
 * Materials are singleton instances shared across all factory instances.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Material category — identifies a family of related shared materials */
export const enum CmpMatCategory {
  WHITE = 'WHITE',
  SHINY_SILVER = 'SHINY_SILVER',
  GLASS = 'GLASS',
}

/** Material variant — visual state within a category */
export const enum CmpMatVariant {
  NORMAL = 'NORMAL',
  HOVERED = 'HOVERED',
  SELECTED = 'SELECTED',
}

/**
 * Material ownership type — stored on `material.userData.matType`.
 * Numeric for fast comparison; determines how hover/select/animation interact.
 *
 * - **SHARED** — from CMP_MATERIALS dict; hover/select may swap to a variant
 * - **FACTORY** — per-visual factory material; skip hover/select swap
 * - **PRIVATE** — per-instance material (e.g. LED configurable color); skip hover/select swap
 * - **ANIMATION_CLONE** — cloned from SHARED for animation; skip hover/select swap
 */
export const enum CmpMatType {
  SHARED = 0,
  FACTORY = 1,
  PRIVATE = 2,
  ANIMATION_CLONE = 3,
}

// ---------------------------------------------------------------------------
// Shared material dictionary
// ---------------------------------------------------------------------------

/** Default hover glow color (light blue) */
const HOVER_COLOR = 0x4488ff;
/** Default selection glow color (orange) */
const SELECTION_COLOR = 0xff8800;

/**
 * Shared material dictionary: CmpMatCategory → CmpMatVariant → MeshLambertMaterial.
 *
 * Every material carries `userData.matType` and `userData.matCat` (its category)
 * (`CmpMatType.SHARED`) so hover/select logic can identify and swap them.
 */
export const CMP_MATERIALS: Readonly<
  Record<CmpMatCategory, Record<CmpMatVariant, THREE.MeshLambertMaterial>>
> = {
  [CmpMatCategory.WHITE]: {
    [CmpMatVariant.NORMAL]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.WHITE },
    }),
    [CmpMatVariant.HOVERED]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: HOVER_COLOR,
      emissiveIntensity: 0.6,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.WHITE },
    }),
    [CmpMatVariant.SELECTED]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: SELECTION_COLOR,
      emissiveIntensity: 0.8,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.WHITE },
    }),
  },
  [CmpMatCategory.SHINY_SILVER]: {
    [CmpMatVariant.NORMAL]: new THREE.MeshLambertMaterial({
      color: 0xc0c0c0,
      emissive: 0xffffff,
      emissiveIntensity: 0.7,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.SHINY_SILVER },
    }),
    [CmpMatVariant.HOVERED]: new THREE.MeshLambertMaterial({
      color: 0xc0c0c0,
      emissive: HOVER_COLOR,
      emissiveIntensity: 0.8,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.SHINY_SILVER },
    }),
    [CmpMatVariant.SELECTED]: new THREE.MeshLambertMaterial({
      color: 0xc0c0c0,
      emissive: SELECTION_COLOR,
      emissiveIntensity: 0.9,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.SHINY_SILVER },
    }),
  },
  [CmpMatCategory.GLASS]: {
    [CmpMatVariant.NORMAL]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.GLASS },
    }),
    [CmpMatVariant.HOVERED]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      emissive: HOVER_COLOR,
      emissiveIntensity: 0.6,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.GLASS },
    }),
    [CmpMatVariant.SELECTED]: new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      emissive: SELECTION_COLOR,
      emissiveIntensity: 0.8,
      userData: { matType: CmpMatType.SHARED, matCat: CmpMatCategory.GLASS },
    }),
  },
};
