/**
 * Zentro Digital Twin — FlowMapView (Stage 6)
 *
 * Thin wrapper around FlowMap.
 * Calls buildFlowGraph with pre-computed ViewModels, then renders <FlowMap>.
 * Never imports from src/projection — all ViewModels arrive as props.
 */

import React from 'react';
import type { ComponentViewModel, ConnectionViewModel } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import { buildFlowGraph } from '../renderer/flow-transformers.js';
import { useElkLayout } from '../renderer/useElkLayout.js';
import { FlowMap } from '../renderer/components/FlowMap.js';

export interface FlowMapViewProps {
  projectId:     string;
  stores:        EngineStores;
  componentVMs:  Record<string, ComponentViewModel>;
  connectionVMs: Record<string, ConnectionViewModel>;
}

export function FlowMapView({
  projectId,
  stores,
  componentVMs,
  connectionVMs,
}: FlowMapViewProps) {
  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const { nodes, edges } = buildFlowGraph(
    components,
    connections,
    componentVMs,
    connectionVMs,
  );

  const { layoutNodes } = useElkLayout(nodes, edges);

  return (
    <div className="zentro-flow-container">
      <FlowMap nodes={layoutNodes} edges={edges} />
    </div>
  );
}
