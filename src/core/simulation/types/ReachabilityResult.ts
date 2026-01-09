/**
 * ReachabilityResult type definition
 * @module core/simulation/types
 */

import type { UUID } from '../../types/Identifier.js';

export type ReachabilityResult = {
  nodes: Set<UUID>;
  wires: Set<UUID>;
};
