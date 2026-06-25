/**
 * Zentro Digital Twin — ELK Layout
 *
 * Computes node (x, y) positions using ELK's layered algorithm.
 * Returns a position map only — no graph mutation, no persistence,
 * no edge-routing beyond React Flow's own edge renderer.
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { ComponentNode } from './flow-transformers.js';

const elk = new ELK();

export interface LayoutOptions {
  nodeWidth?:  number;
  nodeHeight?: number;
}

const DEFAULT_NODE_WIDTH  = 160;
const DEFAULT_NODE_HEIGHT = 80;

/**
 * Computes ELK layout positions for the given nodes and their edges.
 * Returns a Map<nodeId, { x, y }> with the computed positions.
 * Does NOT mutate the input nodes.
 */
export async function computeElkLayout(
  nodes: ComponentNode[],
  edges: Array<{ source: string; target: string }>,
  options: LayoutOptions = {},
): Promise<Map<string, { x: number; y: number }>> {
  const nodeWidth  = options.nodeWidth  ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;

  const elkGraph = {
    id:       'root',
    layoutOptions: {
      'elk.algorithm':               'layered',
      'elk.direction':               'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode':        '40',
    },
    children: nodes.map(n => ({
      id:     n.id,
      width:  nodeWidth,
      height: nodeHeight,
    })),
    edges: edges.map(e => ({
      id:      `${e.source}->${e.target}`,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(elkGraph);
  const positions = new Map<string, { x: number; y: number }>();

  for (const child of layout.children ?? []) {
    if (child.x !== undefined && child.y !== undefined) {
      positions.set(child.id, { x: child.x, y: child.y });
    }
  }

  return positions;
}

/**
 * Applies pre-computed ELK positions to a node array.
 * Returns a new array — never mutates the originals.
 */
export function applyElkPositions(
  nodes:     ComponentNode[],
  positions: Map<string, { x: number; y: number }>,
): ComponentNode[] {
  return nodes.map(n => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });
}
