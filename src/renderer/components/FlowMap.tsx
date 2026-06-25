/**
 * Zentro Digital Twin — FlowMap
 *
 * Presentation-only canvas. Receives pre-computed nodes and edges.
 * No status derivation, no profile evaluation, no business logic.
 */

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import type { ComponentNode, ConnectionEdge } from '../flow-transformers.js';
import { TankNode }    from './nodes/TankNode.js';
import { PumpNode }    from './nodes/PumpNode.js';
import { ValveNode }   from './nodes/ValveNode.js';
import { GenericNode } from './nodes/GenericNode.js';
import { FlowEdge }    from './edges/FlowEdge.js';

const NODE_TYPES: NodeTypes = {
  storage_tank:  TankNode    as never,
  heat_pump:     PumpNode    as never,
  recirc_pump:   PumpNode    as never,
  mixing_valve:  ValveNode   as never,
  gas_backup:    GenericNode as never,
  point_of_use:  GenericNode as never,
};

const EDGE_TYPES: EdgeTypes = {
  flowEdge: FlowEdge as never,
};

export interface FlowMapProps {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
}

export function FlowMap({ nodes, edges }: FlowMapProps) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls />
    </ReactFlow>
  );
}
