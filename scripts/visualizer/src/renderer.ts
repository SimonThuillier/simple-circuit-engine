/**
 * Circuit visualizer renderer
 * Uses d3-graphviz to render DOT graphs
 */

import { graphviz } from 'd3-graphviz';
import { parseCircuitJSON, buildParsedCircuit } from './parser.js';
import { buildDOTGraph } from './graph-builder.js';
import { RenderError } from './errors.js';

/**
 * Main circuit visualizer class
 *
 * Provides a high-level API for visualizing circuit topology from JSON.
 * Handles parsing, DOT graph generation, and rendering using d3-graphviz.
 * NB: decorative components (without any pins) are not represented in this visualization.
 *
 * @example
 * ```ts
 * const container = document.getElementById('graph-container');
 * const visualizer = new CircuitVisualizer(container);
 *
 * try {
 *   await visualizer.visualize(circuitJsonString);
 * } catch (error) {
 *   console.error('Visualization failed:', error);
 * }
 * ```
 */
export class CircuitVisualizer {
  private containerElement: HTMLElement;
  private graphvizInstance: ReturnType<typeof graphviz> | null = null;

  /**
   * Creates a new circuit visualizer instance
   * @param containerElement - DOM element where graph will be rendered
   */
  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement;
  }

  /**
   * Visualizes a circuit from JSON string
   * @param circuitJson - Circuit JSON string (from Circuit.toJSON())
   * @throws VisualizerError if parsing or rendering fails
   */
  async visualize(circuitJson: string): Promise<void> {
    try {
      // Parse circuit JSON
      const circuit = parseCircuitJSON(circuitJson);

      // Build parsed circuit structure
      const parsedCircuit = buildParsedCircuit(circuit);

      // Generate DOT graph
      const dotGraph = buildDOTGraph(parsedCircuit);

      console.log(dotGraph);

      // Initialize d3-graphviz if not already initialized
      if (!this.graphvizInstance) {
        this.graphvizInstance = graphviz(this.containerElement);
      }

      // Render DOT graph
      await new Promise<void>((resolve, reject) => {
        try {
          this.graphvizInstance!.renderDot(dotGraph).on('end', () => resolve());
          //.on('error', (error: unknown) => {console.log(error);})
        } catch (error) {
          console.log(error);
          reject(
            new RenderError(
              `Failed to render graph: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      });
    } catch (error) {
      // Re-throw visualizer errors, wrap others
      if (
        error instanceof Error &&
        (error.name === 'ValidationError' ||
          error.name === 'IntegrityError' ||
          error.name === 'RenderError')
      ) {
        throw error;
      }
      console.log(error);
      throw new RenderError(
        `Unexpected error during visualization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clears the current visualization
   */
  clear(): void {
    this.containerElement.innerHTML = '';
    this.graphvizInstance = null;
  }

  /**
   * Destroys the visualizer and cleans up resources
   */
  destroy(): void {
    this.clear();
  }
}
