/**
 * Zentro Digital Twin — FlowMap (Stage 23 visual update)
 *
 * Presentation-only canvas. Receives pre-computed nodes and edges.
 * Grid background for plant-room schematic feel.
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
} from '@xyflow/react';
import type { ComponentNode, ConnectionEdge } from '../flow-transformers.js';
import { TankNode }      from './nodes/TankNode.js';
import { PumpNode }      from './nodes/PumpNode.js';
import { ValveNode }     from './nodes/ValveNode.js';
import { HeatPumpNode }  from './nodes/HeatPumpNode.js';
import { GasBackupNode } from './nodes/GasBackupNode.js';
import { ShowerNode }    from './nodes/ShowerNode.js';
import { GenericNode }   from './nodes/GenericNode.js';
import { FlowEdge }      from './edges/FlowEdge.js';

const NODE_TYPES: NodeTypes = {
  storage_tank:  TankNode      as never,
  heat_pump:     HeatPumpNode  as never,
  recirc_pump:   PumpNode      as never,
  mixing_valve:  ValveNode     as never,
  gas_backup:    GasBackupNode as never,
  point_of_use:  ShowerNode    as never,
  generic:       GenericNode   as never,
};

const EDGE_TYPES: EdgeTypes = {
  flowEdge: FlowEdge as never,
};

export interface FlowMapProps {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
  onNodeClick?:   (componentId: string) => void;
  onEdgeClick?:   (connectionId: string) => void;
  onPaneClick?:   () => void;
  placingMode?:   boolean;
}

export function FlowMap({ nodes, edges, onNodeClick, onEdgeClick, onPaneClick, placingMode }: FlowMapProps) {
  // Track measured dimensions per node ID so RF preserves handleBounds across
  // re-renders where buildFlowGraph creates new node object references every tick.
  // Without this, adoptUserNodes resets measured/handleBounds on every 1s refresh,
  // keeping nodes permanently visibility:hidden and edges unrendered.
  const measuredRef = useRef<Map<string, { width: number; height: number }>>(new Map());

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        measuredRef.current.set(change.id, change.dimensions);
      }
    }
  }, []);

  const stableNodes = useMemo(() =>
    nodes.map(node => {
      const measured = measuredRef.current.get(node.id);
      return measured ? { ...node, measured } : node;
    }),
    [nodes],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick],
  );

  return (
    <ReactFlow
      nodes={stableNodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.3}
      maxZoom={2}
      onNodeClick={onNodeClick ? handleNodeClick : undefined}
      onEdgeClick={onEdgeClick ? handleEdgeClick : undefined}
      onPaneClick={onPaneClick}
      style={placingMode ? { cursor: 'crosshair' } : undefined}
    >
      <Background
        variant={BackgroundVariant.Lines}
        gap={32}
        size={0.5}
        color="var(--border)"
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
