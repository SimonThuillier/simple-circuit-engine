/**
 * Pure-topology BFS helpers over the BP-only sub-graph of a Circuit.
 *
 * Used by multi-wiring rules 3A/3B/3C/4 to discover the logical root of a
 * branching point and to find sibling BPs at a given logic distance.
 *
 * "Logic distance" Dl is the count of edges between two endpoints (a pin and
 * a BP). 1 ⇒ direct wire (BP wired straight to the pin).
 *
 * @module core/topology/networkTraversal
 */
import type { Circuit } from './Circuit';
import type { UUID } from '../utils';
import { ENodeType } from './types';

/** Reach record returned by `findPinsReachableFromBpWithPath`. */
export interface IPinReach {
  /** Logic distance — number of wire edges from the start BP to this pin. */
  Dl: number;
  /** ENode immediately preceding the pin on the shortest BFS path back to the
   *  start BP. For Dl=1 this is the start BP itself. */
  predecessor: UUID;
}

/** Sibling record returned by `findBpsAtLogicDistanceWithPath`. */
export interface IBpAtDistance {
  /** Branching-point UUID at exactly the requested logic distance. */
  id: UUID;
  /** ENode immediately preceding this BP on the shortest BFS path back to
   *  the start pin. For Dl=1 this is the start pin itself. */
  predecessor: UUID;
}

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
  return reached;
}

/** Same as `findPinsReachableFromBp` but each entry also carries the BFS
 * predecessor (the ENode one step closer to the start BP on the shortest
 * path). Used by rule 4 to identify which of newBP's two wires leads back
 * to the anchor pin.
 *
 * Map insertion order matches BFS visit order, so iterating it yields ties
 * in BFS-first order.
 */
export function findPinsReachableFromBpWithPath(
  circuit: Circuit,
  startBpId: UUID
): Map<UUID, IPinReach> {
  const reached = new Map<UUID, IPinReach>();
  const start = circuit.getENode(startBpId);
  if (!start || start.type !== ENodeType.BranchingPoint) return reached;

  const visited = new Set<UUID>([startBpId]);
  const queue: Array<{ id: UUID; edges: number; parent: UUID }> = [
    { id: startBpId, edges: 0, parent: startBpId },
  ];

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
        if (prev === undefined || Dl < prev.Dl) {
          reached.set(otherId, { Dl, predecessor: id });
        }
        continue;
      }
      if (visited.has(otherId)) continue;
      visited.add(otherId);
      queue.push({ id: otherId, edges: pathEdges, parent: id });
    }
  }
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

/** Same as `findBpsAtLogicDistance` but each entry carries the BFS
 * predecessor (one step closer to the start pin). Used by rule 4 to identify
 * which wire of each sibling to split.
 */
export function findBpsAtLogicDistanceWithPath(
  circuit: Circuit,
  startPinId: UUID,
  Dl: number
): IBpAtDistance[] {
  if (Dl <= 0) return [];
  const start = circuit.getENode(startPinId);
  if (!start || start.type !== ENodeType.Pin) return [];

  const targetDepth = Dl;
  const result: IBpAtDistance[] = [];
  const visited = new Set<UUID>([startPinId]);
  const queue: Array<{ id: UUID; edges: number; parent: UUID }> = [
    { id: startPinId, edges: 0, parent: startPinId },
  ];

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
        continue;
      }
      visited.add(otherId);
      if (pathEdges === targetDepth) {
        result.push({ id: otherId, predecessor: id });
        continue;
      }
      queue.push({ id: otherId, edges: pathEdges, parent: id });
    }
  }
  return result;
}
