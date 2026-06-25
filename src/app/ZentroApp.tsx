/**
 * Zentro Digital Twin — ZentroApp (Stage 7, updated Stage 21)
 *
 * Root composer: LocaleProvider + BuilderProvider + shared ViewModels →
 * FlowMapView + DashboardPanel.
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
import { LocaleProvider, useLocale } from '../i18n/index.js';
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
  const { t, config, setLocale, locale } = useLocale();

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
    <div data-testid="zentro-app" dir={config.dir}>
      <header style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '6px 14px',
        background:      'var(--bg-crust)',
        borderBottom:    '1px solid var(--border)',
        flexShrink:      0,
        gap:             8,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-base)', letterSpacing: '0.03em' }}>
          {t('app.title')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-sub)', flex: 1, textAlign: 'center' }}>
          {project?.name ?? projectId}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeAlarmCount > 0 ? (
            <span style={{
              background: 'var(--status-critical)', color: '#fff',
              borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700,
            }}>
              {t('app.alarms_count', { count: activeAlarmCount })}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--status-healthy)' }}>
              {t('app.all_clear')}
            </span>
          )}
          <button
            data-testid="lang-switch-btn"
            onClick={() => setLocale(locale === 'he' ? 'en' : 'he')}
            style={{
              background:   'var(--bg-mantle)',
              border:       '1px solid var(--border)',
              borderRadius: 4,
              color:        'var(--text-base)',
              cursor:       'pointer',
              fontSize:     11,
              fontWeight:   600,
              padding:      '2px 7px',
              lineHeight:   1.4,
            }}
          >
            {t('app.lang_switch')}
          </button>
        </div>
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
    <LocaleProvider>
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
    </LocaleProvider>
  );
}
