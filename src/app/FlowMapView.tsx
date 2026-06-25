/**
 * Zentro Digital Twin — FlowMapView (Stage 6, updated Stage 21)
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
import { useLocale } from '../i18n/index.js';

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
  const { t } = useLocale();

  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  if (components.length === 0) {
    return (
      <div className="zentro-flow-container zentro-flow-empty" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-sub)', fontSize: 13,
      }}>
        {t('flowmap.empty')}
      </div>
    );
  }

  const { nodes, edges } = buildFlowGraph(
    components,
    connections,
    componentVMs,
    connectionVMs,
  );

  const { layoutNodes, isReady } = useElkLayout(nodes, edges);

  return (
    <div className="zentro-flow-container" style={{ position: 'relative' }}>
      {!isReady && (
        <div style={{
          position:   'absolute',
          insetInlineEnd: 10,
          top:        10,
          zIndex:     10,
          fontSize:   10,
          color:      'var(--text-sub)',
          background: 'var(--bg-crust)',
          border:     '1px solid var(--border)',
          borderRadius: 4,
          padding:    '2px 7px',
          pointerEvents: 'none',
        }}>
          {t('flowmap.loading')}
        </div>
      )}
      <FlowMap nodes={layoutNodes} edges={edges} />
    </div>
  );
}
