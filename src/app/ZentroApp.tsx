/**
 * Zentro Digital Twin — ZentroApp (Stage 7, updated Stage 21, Stage 22)
 *
 * Root composer: LocaleProvider + BuilderProvider + shared ViewModels →
 * MissionControlView.
 * ViewModels are computed once via useProjection and passed to all child views.
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
import { MissionControlView } from './mission-control/MissionControlView.js';

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

  // Accurate alarm count using alarmStore directly
  const components = stores.graph.getComponents(projectId);
  const activeAlarmCount = components.reduce((n, c) =>
    n + alarmStore.getAlarmsForComponent(c.id).filter(a => a.state === 'active').length, 0);

  const project = stores.graph.getProject(projectId);

  return (
    <div data-testid="zentro-app" dir={config.dir} style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      overflow:      'hidden',
      background:    'var(--bg-base)',
    }}>
      {/* Header bar */}
      <header style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '6px 14px',
        background:     'var(--bg-crust)',
        borderBottom:   '1px solid var(--border)',
        flexShrink:     0,
        gap:            8,
        minHeight:      36,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-base)', letterSpacing: '0.03em', flexShrink: 0 }}>
          {t('app.title')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-sub)', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project?.name ?? projectId}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Mission Control — fills the rest */}
      <MissionControlView
        projectId={projectId}
        stores={stores}
        registry={registry}
        componentVMs={componentVMs}
        connectionVMs={connectionVMs}
        alarmStore={alarmStore}
        nowMs={nowMs}
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
