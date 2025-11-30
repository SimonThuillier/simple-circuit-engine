/**
 * Graph builder tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateDOTHeader,
  generateComponentSubgraph,
  generateBranchingPointNode,
  generateWireEdge,
  buildDOTGraph,
} from '../../scripts/visualizer/src/graph-builder.js';
import type {
  ParsedComponent,
  ParsedEnode,
  ParsedCircuit,
} from '../../scripts/visualizer/src/types.js';

describe('Graph Builder', () => {
  describe('generateDOTHeader', () => {
    it('should generate valid DOT header with digraph declaration', () => {
      const header = generateDOTHeader();

      expect(header).toContain('digraph circuit');
      expect(header).toContain('rankdir=LR');
      expect(header).toContain('fontname="Arial"');
    });
  });

  describe('generateComponentSubgraph', () => {
    it('should generate component subgraph with cluster prefix', () => {
      const component: ParsedComponent = {
        id: '12345678-comp',
        type: 'battery',
        shortId: '12345678',
        pins: [
          { id: 'pin1', shortId: 'abcd1234', label: 'anode', source: 'Current' },
          { id: 'pin2', shortId: 'efgh5678', label: 'cathode', source: 'Voltage' },
        ],
      };

      const subgraph = generateComponentSubgraph(component);

      // id have their hyphens (DOT reserved character!) replaced with underscores
      expect(subgraph).toContain('subgraph cluster_12345678_comp');
      expect(subgraph).toContain('label="battery [12345678]"');
      expect(subgraph).toContain('style=filled');
      expect(subgraph).toContain('color=lightgrey');
    });

    it('should include pin nodes within component subgraph', () => {
      const component: ParsedComponent = {
        id: 'comp1',
        type: 'battery',
        shortId: '12345678',
        pins: [
          { id: 'pin1', shortId: 'abcd1234', label: 'anode', source: 'Current' },
          { id: 'pin2', shortId: 'efgh5678', label: 'cathode', source: 'Voltage' },
        ],
      };

      const subgraph = generateComponentSubgraph(component);

      expect(subgraph).toContain('pin_pin1');
      expect(subgraph).toContain('anode [abcd1234]');
      expect(subgraph).toContain('pin_pin2');
      expect(subgraph).toContain('cathode [efgh5678]');
    });
  });

  describe('generateBranchingPointNode', () => {
    it('should generate branching point nodes with shape=point', () => {
      const enode: ParsedEnode = {
        id: 'branch1',
        shortId: 'abcd1234',
        type: 'branch',
      };

      const node = generateBranchingPointNode(enode);

      expect(node).toContain('enode_branch1');
      expect(node).toContain('[abcd1234]');
    });
  });

  describe('generateWireEdge', () => {
    it('should generate wire edges with UUID labels', () => {
      const enodeMap = new Map<string, ParsedEnode>([
        ['pin1', { id: 'pin1', shortId: 'abcd1234', type: 'pin', componentId: 'comp1' }],
        ['pin2', { id: 'pin2', shortId: 'efgh5678', type: 'pin', componentId: 'comp2' }],
      ]);

      const edge = generateWireEdge('wire1', 'wxyz9012', 'pin1', 'pin2', enodeMap);

      expect(edge).toContain('pin_pin1 -> pin_pin2');
      expect(edge).toContain('[wxyz9012]');
    });

    it('should handle branching point connections', () => {
      const enodeMap = new Map<string, ParsedEnode>([
        ['pin1', { id: 'pin1', shortId: 'abcd1234', type: 'pin', componentId: 'comp1' }],
        ['branch1', { id: 'branch1', shortId: 'efgh5678', type: 'branch' }],
      ]);

      const edge = generateWireEdge('wire1', 'wxyz9012', 'pin1', 'branch1', enodeMap);

      expect(edge).toContain('pin_pin1 -> enode_branch1');
      expect(edge).toContain('[wxyz9012]');
    });
  });

  describe('buildDOTGraph', () => {
    it('should build complete DOT graph from ParsedCircuit', () => {
      const circuit: ParsedCircuit = {
        metadata: { name: 'Test', size: 30, divisions: 10, cameraStartup: { x: 0, y: 0, z: 50 } },
        components: new Map([
          [
            'comp1',
            {
              id: 'comp1',
              type: 'battery',
              shortId: '12345678',
              pins: [{ id: 'pin1', shortId: 'abcd1234', label: 'anode', source: 'Current' }],
            },
          ],
        ]),
        enodes: new Map([
          [
            'pin1',
            { id: 'pin1', shortId: 'abcd1234', type: 'pin', componentId: 'comp1', label: 'anode' },
          ],
          ['branch1', { id: 'branch1', shortId: 'efgh5678', type: 'branch' }],
        ]),
        wires: [{ id: 'wire1', shortId: 'wxyz9012', node1: 'pin1', node2: 'branch1' }],
      };

      const dot = buildDOTGraph(circuit);

      expect(dot).toContain('digraph circuit');
      expect(dot).toContain('subgraph cluster_comp1');
      expect(dot).toContain('battery [12345678]');
      expect(dot).toContain('enode_branch1');
      expect(dot).toContain('pin_pin1 -> enode_branch1');
      expect(dot).toContain('[wxyz9012]');
    });
  });
});
