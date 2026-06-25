/**
 * MissionControlView — the full operational screen layout.
 *
 * Layout (CSS Grid, top-to-bottom):
 *   SystemStatusBar  — 1 row, full width
 *   AlarmBanner      — conditional, full width
 *   KpiBar           — 1 row, full width
 *   main area        — FlowMap (left ~65%) | Sidebar (right ~35%)
 *
 * Sidebar contains EquipmentGrid + EventTimeline stacked vertically.
 *
 * All data received as props — no store access inside this component.
 */

import React from 'react';
import type { ComponentViewModel, ConnectionViewModel } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { buildFlowGraph } from '../../renderer/flow-transformers.js';
import { useElkLayout } from '../../renderer/useElkLayout.js';
import { FlowMap } from '../../renderer/components/FlowMap.js';
import { useLocale } from '../../i18n/index.js';
import { KpiBar } from './KpiBar.js';
import { SystemStatusBar } from './SystemStatusBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';

export interface MissionControlViewProps {
  projectId:     string;
  stores:        EngineStores;
  componentVMs:  Record<string, ComponentViewModel>;
  connectionVMs: Record<string, ConnectionViewModel>;
  alarmStore:    AlarmStore;
  nowMs:         number;
}

export function MissionControlView({
  projectId,
  stores,
  componentVMs,
  connectionVMs,
  alarmStore,
  nowMs,
}: MissionControlViewProps) {
  const { t } = useLocale();

  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const { nodes, edges } = buildFlowGraph(components, connections, componentVMs, connectionVMs);
  const { layoutNodes, isReady } = useElkLayout(nodes, edges);

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      flex:           1,
      minHeight:      0,
      overflow:       'hidden',
    }} data-testid="mission-control">

      {/* System status strip */}
      <SystemStatusBar componentVMs={componentVMs} nowMs={nowMs} />

      {/* Alarm banner — rendered only when alarms are active */}
      <AlarmBanner alarmStore={alarmStore} components={components} />

      {/* KPI bar */}
      <KpiBar
        componentVMs={componentVMs}
        connectionVMs={connectionVMs}
        alarmStore={alarmStore}
        projectId={projectId}
        components={components}
      />

      {/* Main area — FlowMap + sidebar */}
      <div style={{
        display:   'flex',
        flex:      1,
        minHeight: 0,
        overflow:  'hidden',
      }}>
        {/* FlowMap */}
        <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative' }}>
          {!isReady && (
            <div style={{
              position:       'absolute',
              insetInlineEnd: 10,
              top:            10,
              zIndex:         10,
              fontSize:       10,
              color:          'var(--text-sub)',
              background:     'var(--bg-crust)',
              border:         '1px solid var(--border)',
              borderRadius:   4,
              padding:        '2px 7px',
              pointerEvents:  'none',
            }}>
              {t('flowmap.loading')}
            </div>
          )}
          {/* position:absolute gives ReactFlow a concrete pixel height to measure */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <FlowMap nodes={layoutNodes} edges={edges} />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width:        320,
          flexShrink:   0,
          borderInlineStart: '1px solid var(--border)',
          display:      'flex',
          flexDirection: 'column',
          background:   'var(--bg-crust)',
          overflow:     'hidden',
        }}>
          {/* Equipment grid — top half */}
          <div style={{ flex: '0 0 auto', maxHeight: '55%', display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)' }}>
            <EquipmentGrid
              projectId={projectId}
              stores={stores}
              componentVMs={componentVMs}
              alarmStore={alarmStore}
            />
          </div>

          {/* Event timeline — bottom half */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EventTimeline
              alarmStore={alarmStore}
              components={components}
              nowMs={nowMs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
