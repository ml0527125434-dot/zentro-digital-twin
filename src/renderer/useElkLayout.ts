/**
 * Zentro Digital Twin — useElkLayout (Stage 19)
 *
 * Runs ELK auto-layout whenever the graph TOPOLOGY changes and caches the
 * result. Telemetry, alarm, or ViewModel updates never trigger a new layout
 * because the topology key is derived from node/edge IDs only — not from any
 * ViewModel field.
 *
 * ELK is imported dynamically so it lands in its own lazy chunk, keeping
 * the main bundle lean (~125 kB gzip vs ~570 kB if imported statically).
 *
 * Fallback: seed positions are used until the first async layout completes.
 * The graph is never mutated — applyPositions returns a new array.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { ComponentNode, ConnectionEdge } from './flow-transformers.js';

export interface ElkLayoutResult {
  layoutNodes: ComponentNode[];
  isReady:     boolean;
}

// ---------------------------------------------------------------------------
// Topology key — stable across ViewModel updates, changes only when
// components or connections are added, removed, or re-wired.
// ---------------------------------------------------------------------------

function topoKey(nodes: ComponentNode[], edges: ConnectionEdge[]): string {
  const nodeIds = nodes.map(n => n.id).sort().join(',');
  const edgeIds = edges.map(e => `${e.source}->${e.target}`).sort().join(',');
  return `${nodeIds}|${edgeIds}`;
}

// ---------------------------------------------------------------------------
// applyPositions — inlined here so elk-layout.ts is NOT statically imported,
// keeping ELK in a separate dynamic chunk.
// ---------------------------------------------------------------------------

function applyPositions(
  nodes:     ComponentNode[],
  positions: Map<string, { x: number; y: number }>,
): ComponentNode[] {
  return nodes.map(n => {
    const pos = positions.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });
}

// ---------------------------------------------------------------------------
// useElkLayout
// ---------------------------------------------------------------------------

export function useElkLayout(
  nodes: ComponentNode[],
  edges: ConnectionEdge[],
): ElkLayoutResult {
  // Topology key recomputed each render but string is stable unless topology changes.
  const key = useMemo(() => topoKey(nodes, edges), [nodes, edges]);

  // Stable refs so the useEffect closure always sees the latest nodes/edges
  // without listing them as deps (which would fire on every telemetry tick).
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Dynamic import keeps ELK out of the main bundle.
    import('./elk-layout.js').then(({ computeElkLayout }) =>
      computeElkLayout(
        nodesRef.current,
        edgesRef.current.map(e => ({ source: e.source, target: e.target })),
      ),
    ).then(pos => {
      if (!cancelled) {
        setPositions(pos);
        setIsReady(true);
      }
    });

    return () => { cancelled = true; };
  }, [key]);  // ← topology-only dep: never fires on telemetry updates

  const layoutNodes = useMemo(
    () => (isReady ? applyPositions(nodes, positions) : nodes),
    [nodes, positions, isReady],
  );

  return { layoutNodes, isReady };
}
