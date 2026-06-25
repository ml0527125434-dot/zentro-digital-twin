/**
 * Zentro Digital Twin — ZentroApp (Stage 7)
 *
 * Root composer: BuilderProvider + shared ViewModels → FlowMapView + DashboardPanel.
 * ViewModels are computed once via useProjection and passed to both child views.
 * LiveStore, OperationalProfileStore, and AlarmStore are received as props — React
 * never writes to any of them.
 * No TELEMETRY writes. No COMMAND execution. No persistence.
 */

import React, { useState, useCallback } from 'react';
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
  liveStore:    LiveStore;
  profileStore: OperationalProfileStore;
  alarmStore:   AlarmStore;
  createdBy?:   string;
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

  return (
    <div data-testid="zentro-app">
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
}: ZentroAppProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refresh = useCallback(() => setNowMs(Date.now()), []);

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
