/**
 * ENode Type Enumeration
 *
 * Defines the two types of electrical connection points in the circuit model.
 *
 * @module core/types/ENodeType
 */

/**
 * Type of electrical node (ENode) in the circuit.
 *
 * ENodes represent atomic electrical connection points and come in two variants (immutable after node creation):
 *
 * - **Pin**: Connection point belonging to a Component. Position is derived
 *   from the parent component's position, rotation, and pin index. Automatically
 *   created when a component is added, deleted when component is removed.
 *
 * - **BranchingPoint**: Junction point where wires split. Has an independent
 *   position on the grid. Automatically created when wires are split, deleted
 *   when no wires remain connected (orphaned).
 *
 * @example
 * ```typescript
 * // Pin node (belongs to component)
 * if (node.type === ENodeType.Pin) {
 *   console.log('Component pin with label', node.pinLabel);
 * }
 *
 * // Branching point (wire junction)
 * if (node.type === ENodeType.BranchingPoint) {
 *   console.log('Branch at position', node.position);
 * }
 * ```
 */
export enum ENodeType {
  /**
   * Component pin connection point.
   *
   * Properties:
   * - Has parent component reference
   * - Has pin label within component
   * - Position derived from component
   * - Lifecycle tied to component (cascade deletion)
   */
  Pin = 'Pin',

  /**
   * Wire branching point (junction).
   *
   * Properties:
   * - Independent position on grid
   * - Created when wire is split
   * - Deleted when last wire is removed (orphaned cleanup)
   * - No parent component
   */
  BranchingPoint = 'BranchingPoint',
}
