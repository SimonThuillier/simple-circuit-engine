/**
 * Various Utilities
 * @module core/utils
 */
import type {UUID} from "./types";

export type {
    UUID,
    IPosition,
    IPosition3D,
    ICameraOptions
} from './types';

/**
 * Generate a new RFC 4122 UUID v4 identifier.
 *
 * Uses the native `crypto.randomUUID()` API when available (ES2022+ browsers,
 * Node 19+). For older Node.js environments in testing, falls back to a
 * polyfill implementation.
 *
 * @returns A newly generated UUID string
 *
 * @example
 * ```typescript
 * const componentId = generateUUID();
 * const wireId = generateUUID();
 * console.log(componentId !== wireId); // true (collision probability: ~10^-36)
 * ```
 */
export function generateUUID(): UUID {
    // Native crypto API (modern browsers and Node 19+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for older Node.js (testing environments)
    // Simple UUID v4 implementation without external dependencies
    // Based on RFC 4122 specification
    const hexDigits = '0123456789abcdef';
    const sections = [8, 4, 4, 4, 12];
    const parts: string[] = [];

    for (const length of sections) {
        let part = '';
        for (let i = 0; i < length; i++) {
            const randomByte = Math.floor(Math.random() * 16);
            part += hexDigits[randomByte];
        }
        parts.push(part);
    }

    // Set version (4) and variant (10) bits as per RFC 4122
    const uuid = parts.join('-');
    const chars = uuid.split('');

    // Set version 4 in the time_hi_and_version field
    chars[14] = '4';

    // Set variant (10xx in binary) in the clock_seq_hi_and_reserved field
    const variantChar = parseInt(chars[19] ?? '0', 16);
    const variantIndex = (variantChar & 0x3) | 0x8;
    chars[19] = hexDigits[variantIndex] ?? '0';

    return chars.join('');
}


export { Memoize, MemoizeExpiring } from './MemoizeDecorator.js';
export { CameraOptions } from './CameraOptions';
export { Position, simplifyPositions, findPositionBestIndex } from './Position';
export { Position3D } from './Position3D';
export { Rotation } from './Rotation';