/**
 * Binary electrical state for wires and enodes (connection points)
 * @module core/simulation/states
 */

export interface NodeElectricalState {
  /**
   * True if voltage is present at this node (potential > 0V).
   * False if node is at ground potential or floating.
   */
  hasVoltage: boolean;

  /**
   * True if current is actively flowing through this node.
   * False if no current flow (open circuit or equilibrium).
   */
  hasCurrent: boolean;

  /**
   * True only if the node is locked from state changes at circuit build time (ex: battery pins or other fixed-voltage/current pinSources).
   * Important: Those nodes should never have their electrical state modified by the simulation controller!
   * Always false for wires
   */
  locked: boolean;
}
