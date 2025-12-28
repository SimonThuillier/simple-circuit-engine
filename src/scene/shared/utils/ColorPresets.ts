/**
 * Color preset utilities for config form
 * @module scene/shared/utils/ColorPresets
 */

/**
 * Standard color presets for hybrid color controls
 */
export const COLOR_PRESETS: Readonly<Record<string, string>> = {
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ff8800',
  purple: '#8800ff',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
};

/**
 * Check if a color value is a hex string
 * @param value - Color value to check
 * @returns true if value matches #RRGGBB format
 */
export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Convert a hex color to preset name if it matches, otherwise return hex
 * @param hex - Hex color string (e.g., "#ff0000")
 * @returns Preset name if match found, otherwise the hex string
 */
export function hexToPresetOrHex(hex: string): string {
  const lowerHex = hex.toLowerCase();
  for (const [name, presetHex] of Object.entries(COLOR_PRESETS)) {
    if (presetHex.toLowerCase() === lowerHex) {
      return name;
    }
  }
  return hex;
}

/**
 * Convert a preset name or hex to hex value
 * @param value - Preset name (e.g., "red") or hex string (e.g., "#ff0000")
 * @returns Hex color string
 */
export function presetOrHexToHex(value: string): string {
  if (isHexColor(value)) {
    return value;
  }
  return COLOR_PRESETS[value] ?? '#ffffff';
}
