/**
 * Circuit Options
 * Encapsulate user writable circuit options
 * @module core/topology
 */
import { DEFAULT_LOGIC_FAMILY, type ICircuitOptions, type LogicFamily } from './types';

export class CircuitOptions implements ICircuitOptions {
  /**
   * Create new circuit options.
   *
   * @param name - Circuit name (default: Untitled Circuit)
   * @param defaultLogicFamily - Circuit default logic family (default: CMOS1)
   */
  constructor(
    public name: string = 'Untitled Circuit',
    public defaultLogicFamily: LogicFamily = DEFAULT_LOGIC_FAMILY
  ) {}

  toJSON(): ICircuitOptions {
    return {
      name: this.name,
      defaultLogicFamily: this.defaultLogicFamily,
    };
  }

  static fromJSON(json: ICircuitOptions): CircuitOptions {
    return new CircuitOptions(json.name, json.defaultLogicFamily);
  }
}
