/**
 * ENode Source Type Enumeration
 *
 * Defines the two types of electrical sources in the circuit model.
 *
 * @module core/types/ENodeSourceType
 */

/**
 * Type of electrical sources in the circuit.
 *
 * ENodes have a sourceType which can be undefined or one of the following:
 *
 * - **Voltage**: ENode that provides a voltage source to the circuit. All Enodes of this type are considered at the same positive potential.
 *
 * - **Current**: Ground/neutral ENodes that provides a current source to the circuit. All Enodes of this type are considered as points at
 * the same 0V potential and are points from where electrons enters the circuit.
 *
 * playback modules use these properties to determine where to draw voltage/current from.
 *
 */
export enum ENodeSourceType {
  /**
   * Voltage sources
   */
  Voltage = 'Voltage',

  /**
   * Current sources
   */
  Current = 'Current',
}
