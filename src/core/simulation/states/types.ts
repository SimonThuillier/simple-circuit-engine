/**
 * Binary electrical state for wires and enodes (connection points)
 * @module core/simulation/states
 * @public
 */
export interface INodeElectricalState {
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

/**
 * Compute the union of multiple electrical states.
 * Useful to derive a combined pin state from two or more pins
 * (e.g. cmd_in + cmd_out → coil state).
 *
 * @param states - Two or more electrical states to combine
 * @returns A new state where hasVoltage/hasCurrent are OR'd across inputs, locked is always false
 */
export function unionElectricalStates(...states: INodeElectricalState[]): INodeElectricalState {
  return {
    hasVoltage: states.some((s) => s.hasVoltage),
    hasCurrent: states.some((s) => s.hasCurrent),
    locked: false,
  };
}
