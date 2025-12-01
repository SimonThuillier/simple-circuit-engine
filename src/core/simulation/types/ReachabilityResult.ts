import type { UUID } from '@/core/types/Identifier';

export type ReachabilityResult = {
  nodes: Set<UUID>;
  wires: Set<UUID>;
};
