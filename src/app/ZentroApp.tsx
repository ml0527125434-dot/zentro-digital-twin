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

import React, { useState, useCallback, useEffect, useRef } from 'react';
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

type AppContentProps = Omit<ZentroAppProps, 'createdBy'> & { nowMs: number; onMutation: () => void };

function AppContent({
  projectId,
  stores,
  registry,
  liveStore,
  profileStore,
  alarmStore,
  nowMs,
  onMutation,
}: AppContentProps) {
  const { t, config, setLocale, locale } = useLocale();
  const [showDemoInfo, setShowDemoInfo] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [buildMode, setBuildMode] = useState(false);
  const drawerOpenRef = useRef(false);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    drawerOpenRef.current = open;
  }, []);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'f' || e.key === 'F') {
        setPresentationMode(m => !m);
      }
      if (e.key === 'Escape' && !drawerOpenRef.current) {
        setPresentationMode(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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

  const isRtl = config.dir === 'rtl';

  return (
    <div data-testid="zentro-app" dir={config.dir} style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      overflow:      'hidden',
      background:    'var(--bg-base)',
      ...(presentationMode ? { position: 'fixed', inset: 0, zIndex: 200 } : {}),
    }}>

      {/* Header bar — collapses in presentation mode */}
      <div style={{
        maxHeight:  presentationMode ? 0 : 64,
        overflow:   'hidden',
        flexShrink: 0,
        transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
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

            {/* Build / Monitor mode toggle */}
            <div style={{
              display:      'flex',
              alignItems:   'center',
              background:   'var(--bg-base)',
              border:       '1px solid var(--border)',
              borderRadius: 5,
              overflow:     'hidden',
              flexShrink:   0,
            }}>
              <button
                data-testid="mode-monitor-btn"
                onClick={() => setBuildMode(false)}
                style={{
                  background:   buildMode ? 'transparent' : 'var(--bg-mantle)',
                  border:       'none',
                  borderInlineEnd: '1px solid var(--border)',
                  color:        buildMode ? 'var(--text-dim)' : 'var(--text-base)',
                  cursor:       'pointer',
                  fontSize:     10,
                  fontWeight:   buildMode ? 500 : 700,
                  padding:      '3px 9px',
                  lineHeight:   1.4,
                }}
              >
                {t('builder.mode_monitor')}
              </button>
              <button
                data-testid="mode-build-btn"
                onClick={() => setBuildMode(true)}
                style={{
                  background:   buildMode ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-mantle))' : 'transparent',
                  border:       'none',
                  color:        buildMode ? 'var(--accent)' : 'var(--text-dim)',
                  cursor:       'pointer',
                  fontSize:     10,
                  fontWeight:   buildMode ? 700 : 500,
                  padding:      '3px 9px',
                  lineHeight:   1.4,
                }}
              >
                {t('builder.mode_build')}
              </button>
            </div>

            <button
              data-testid="pres-enter-btn"
              onClick={() => setPresentationMode(true)}
              aria-label={t('pres.enter')}
              style={{
                background:   'color-mix(in srgb, var(--accent) 10%, var(--bg-mantle))',
                border:       '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))',
                borderRadius: 4,
                color:        'var(--accent)',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   700,
                padding:      '2px 8px',
                lineHeight:   1.4,
                letterSpacing: '0.04em',
              }}
            >
              ▶ {t('pres.enter')}
            </button>
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
      </div>

      {/* Demo info strip — dismissable; hidden in presentation mode */}
      {showDemoInfo && (
        <div
          data-testid="demo-info-strip"
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            10,
            padding:        presentationMode ? '0 14px' : '6px 14px',
            maxHeight:      presentationMode ? 0 : 40,
            overflow:       'hidden',
            background:     'color-mix(in srgb, var(--accent) 8%, var(--bg-crust))',
            borderBottom:   '1px solid color-mix(in srgb, var(--accent) 25%, var(--border))',
            flexShrink:     0,
            fontSize:       11,
            transition:     'max-height 0.3s cubic-bezier(0.4,0,0.2,1), padding 0.3s ease',
          }}
        >
          <span style={{
            fontSize:      9,
            fontWeight:    800,
            color:         'var(--accent)',
            background:    'color-mix(in srgb, var(--accent) 15%, transparent)',
            border:        '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            borderRadius:  10,
            padding:       '1px 8px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            flexShrink:    0,
          }}>
            ⚡ {t('demo.info_title')}
          </span>
          <span style={{ color: 'var(--text-sub)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('demo.info_body')}
          </span>
          <button
            data-testid="demo-info-dismiss"
            onClick={() => setShowDemoInfo(false)}
            aria-label={t('demo.dismiss')}
            style={{
              background:   'transparent',
              border:       'none',
              color:        'var(--text-dim)',
              cursor:       'pointer',
              fontSize:     14,
              lineHeight:   1,
              padding:      '2px 4px',
              flexShrink:   0,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Mission Control — fills the rest */}
      <MissionControlView
        projectId={projectId}
        stores={stores}
        registry={registry}
        componentVMs={componentVMs}
        connectionVMs={connectionVMs}
        alarmStore={alarmStore}
        nowMs={nowMs}
        buildMode={buildMode}
        presentationMode={presentationMode}
        onDrawerOpenChange={handleDrawerOpenChange}
        onMutation={onMutation}
      />

      {/* Floating presentation mode overlay — exit button + badge */}
      {presentationMode && (
        <div style={{
          position:    'fixed',
          top:         12,
          [isRtl ? 'left' : 'right']: 12,
          zIndex:      300,
          display:     'flex',
          alignItems:  'center',
          gap:         8,
          pointerEvents: 'auto',
        }}>
          <span style={{
            fontSize:      9,
            fontWeight:    800,
            color:         'var(--accent)',
            background:    'color-mix(in srgb, var(--accent) 12%, var(--bg-crust))',
            border:        '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            borderRadius:  10,
            padding:       '2px 9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {t('pres.badge')}
          </span>
          <button
            data-testid="pres-exit-btn"
            onClick={() => setPresentationMode(false)}
            aria-label={t('pres.exit')}
            style={{
              background:   'color-mix(in srgb, var(--bg-mantle) 90%, transparent)',
              border:       '1px solid var(--border)',
              borderRadius: 4,
              color:        'var(--text-sub)',
              cursor:       'pointer',
              fontSize:     11,
              fontWeight:   600,
              padding:      '3px 10px',
              lineHeight:   1.4,
              backdropFilter: 'blur(4px)',
            }}
          >
            ✕ {t('pres.exit')}
          </button>
        </div>
      )}
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

  const refresh     = useCallback(() => setNowMs(Date.now()), []);
  const onMutation  = useCallback(() => setNowMs(Date.now()), []);

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
          onMutation={onMutation}
        />
        <button data-testid="refresh-btn" onClick={refresh} style={{ display: 'none' }}>
          Refresh
        </button>
      </BuilderProvider>
    </LocaleProvider>
  );
}
