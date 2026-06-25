/**
 * Zentro Digital Twin — ZentroApp (Stage 7)
 *
 * Root composer: BuilderProvider + shared ViewModels → FlowMapView + DashboardPanel.
 * ViewModels are computed once via useProjection and passed to both child views.
 * LiveStore, OperationalProfileStore, and AlarmStore are received as props — React
 * never writes to any of them.
 * No TELEMETRY writes. No COMMAND execution. No persistence.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { EngineStores } from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import type { LiveStore } from '../telemetry/live-store.js';
import type { OperationalProfileStore } from '../projection/operational-profile-store.js';
import type { AlarmStore } from '../alarm/alarm-store.js';
import { BuilderProvider } from '../builder/BuilderContext.js';
import { useProjection } from './useProjection.js';
import { FlowMapView } from './FlowMapView.js';
import { DashboardPanel } from './DashboardPanel.js';

export interface ZentroAppProps {
  projectId:    string;
  stores:       EngineStores;
  registry:     ComponentRegistry;
  liveStore:       LiveStore;
  profileStore:    OperationalProfileStore;
  alarmStore:      AlarmStore;
  createdBy?:      string;
  autoRefreshMs?:  number;
}

type AppContentProps = Omit<ZentroAppProps, 'createdBy'> & { nowMs: number };

function AppContent({
  projectId,
  stores,
  registry,
  liveStore,
  profileStore,
  alarmStore,
  nowMs,
}: AppContentProps) {
  const { componentVMs, connectionVMs } = useProjection(
    projectId,
    stores,
    liveStore,
    registry,
    profileStore,
    alarmStore,
    nowMs,
  );

  const activeAlarmCount = Object.values(componentVMs)
    .flatMap(vm => vm.activeAlarms)
    .filter(a => a.state === 'active').length;

  const project = stores.graph.getProject(projectId);

  return (
    <div data-testid="zentro-app">
      <header style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '6px 14px',
        background:      'var(--bg-crust)',
        borderBottom:    '1px solid var(--border)',
        flexShrink:      0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-base)', letterSpacing: '0.03em' }}>
          Zentro Digital Twin
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
          {project?.name ?? projectId}
        </span>
        {activeAlarmCount > 0 ? (
          <span style={{
            background: 'var(--status-critical)', color: '#fff',
            borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700,
          }}>
            {activeAlarmCount} alarm{activeAlarmCount !== 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--status-healthy)' }}>
            ✓ All clear
          </span>
        )}
      </header>
      <FlowMapView
        projectId={projectId}
        stores={stores}
        componentVMs={componentVMs}
        connectionVMs={connectionVMs}
      />
      <DashboardPanel
        projectId={projectId}
        stores={stores}
        componentVMs={componentVMs}
      />
    </div>
  );
}

export function ZentroApp({
  projectId,
  stores,
  registry,
  liveStore,
  profileStore,
  alarmStore,
  createdBy = 'app',
  autoRefreshMs,
}: ZentroAppProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refresh = useCallback(() => setNowMs(Date.now()), []);

  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(() => setNowMs(Date.now()), autoRefreshMs);
    return () => clearInterval(id);
  }, [autoRefreshMs]);

  return (
    <BuilderProvider
      projectId={projectId}
      stores={stores}
      registry={registry}
      createdBy={createdBy}
    >
      <AppContent
        projectId={projectId}
        stores={stores}
        registry={registry}
        liveStore={liveStore}
        profileStore={profileStore}
        alarmStore={alarmStore}
        nowMs={nowMs}
      />
      <button data-testid="refresh-btn" onClick={refresh} style={{ display: 'none' }}>
        Refresh
      </button>
    </BuilderProvider>
  );
}
