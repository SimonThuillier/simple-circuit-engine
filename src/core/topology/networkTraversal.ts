/**
 * Pure-topology BFS helpers over the BP-only sub-graph of a Circuit.
 *
 * Used by multi-wiring rule 3A to discover the logical root of a branching
 * point and to find sibling BPs at a given logic distance.
 *
 * "Logic distance" Dl is the count of edges between two endpoints (a pin and
 * a BP). 1 ⇒ direct wire (BP wired straight to the pin).
 *
 * @module core/topology/networkTraversal
 */
import type { Circuit } from './Circuit';
import type { UUID } from '../utils';
import { ENodeType } from './types';

/** BFS the BP-only sub-graph from a start branching point and report every
 * pin reached as a terminal endpoint, with its logic distance Dl.
 *
 * Pins are NEVER traversed through. If two paths reach the same pin, the
 * smallest Dl wins.
 *
 * @returns A map of `pinId → Dl`. Empty if no pin is reachable.
 */
export function findPinsReachableFromBp(
  circuit: Circuit,
  startBpId: UUID
): Map<UUID, number> {
  const reached = new Map<UUID, number>();
  const start = circuit.getENode(startBpId);
  if (!start || start.type !== ENodeType.BranchingPoint) return reached;

  const visited = new Set<UUID>([startBpId]);
  const queue: Array<{ id: UUID; edges: number }> = [{ id: startBpId, edges: 0 }];

  while (queue.length > 0) {
    const { id, edges } = queue.shift()!;
    for (const wire of circuit.getWiresByNode(id)) {
      const otherId = wire.node1 === id ? wire.node2 : wire.node1;
      const other = circuit.getENode(otherId);
      if (!other) continue;
      const pathEdges = edges + 1;
      if (other.type === ENodeType.Pin) {
        const Dl = pathEdges;
        const prev = reached.get(otherId);
        if (prev === undefined || Dl < prev) reached.set(otherId, Dl);
        continue;
      }
      if (visited.has(otherId)) continue;
      visited.add(otherId);
      queue.push({ id: otherId, edges: pathEdges });
    }
  }
  console.log(reached);
  return reached;
}

/** BFS the BP-only sub-graph from a start pin and return every BP reached at
 * exactly logic distance `Dl` (i.e. path-edge count = `Dl`).
 *
 * Branches that hit any pin before reaching the target depth are cut. The
 * start pin itself is never returned.
 *
 * @returns Array of branching-point UUIDs at logic distance Dl from the pin.
 */
export function findBpsAtLogicDistance(
  circuit: Circuit,
  startPinId: UUID,
  Dl: number
): UUID[] {
  console.log(startPinId,Dl);
  if (Dl <= 0) return [];
  const start = circuit.getENode(startPinId);
  if (!start || start.type !== ENodeType.Pin) return [];

  const targetDepth = Dl;
  const result: UUID[] = [];
  const visited = new Set<UUID>([startPinId]);
  const queue: Array<{ id: UUID; edges: number }> = [{ id: startPinId, edges: 0 }];

  while (queue.length > 0) {
    const { id, edges } = queue.shift()!;
    if (edges > targetDepth) continue;
    for (const wire of circuit.getWiresByNode(id)) {
      const otherId = wire.node1 === id ? wire.node2 : wire.node1;
      if (visited.has(otherId)) continue;
      const other = circuit.getENode(otherId);
      if (!other) continue;
      const pathEdges = edges + 1;
      if (other.type === ENodeType.Pin) {
        // Pins terminate this branch; not added.
        continue;
      }
      visited.add(otherId);
      if (pathEdges === targetDepth) {
        result.push(otherId);
        continue;
      }
      queue.push({ id: otherId, edges: pathEdges });
    }
  }
  return result;
}
