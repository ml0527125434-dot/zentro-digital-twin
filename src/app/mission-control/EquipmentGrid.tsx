/**
 * EquipmentGrid — sidebar equipment cards.
 *
 * Preserves data-testid="dashboard-panel" and data-testid="dashboard-item-{id}"
 * so existing integration tests continue to pass.
 */

import React from 'react';
import type { ComponentViewModel } from '../../domain/types.js';
import type { EngineStores } from '../../engine/graph-engine.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import {
  healthPresentation,
  nodeStatusPresentation,
  sensorStatePresentation,
} from '../../renderer/theme.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface EquipmentGridProps {
  projectId:    string;
  stores:       EngineStores;
  componentVMs: Record<string, ComponentViewModel>;
  alarmStore:   AlarmStore;
}

function StatusDot({ cssVar }: { cssVar: string }) {
  return (
    <span style={{
      display:      'inline-block',
      width:        7,
      height:       7,
      borderRadius: '50%',
      background:   `var(${cssVar})`,
      flexShrink:   0,
    }} />
  );
}

function Badge({ cssVar, label }: { cssVar: string; label: string }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      fontSize:     9,
      color:        `var(${cssVar})`,
      background:   `color-mix(in srgb, var(${cssVar}) 12%, transparent)`,
      borderRadius: 4,
      padding:      '1px 6px',
      fontWeight:   500,
    }}>
      <StatusDot cssVar={cssVar} />
      {label}
    </span>
  );
}

export function EquipmentGrid({ projectId, stores, componentVMs, alarmStore }: EquipmentGridProps) {
  const { t } = useLocale();
  const components = stores.graph.getComponents(projectId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding:      '7px 12px 5px',
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom:  '1px solid var(--border)',
        flexShrink:    0,
      }}>
        {t('equip.title')}
      </div>

      <ul data-testid="dashboard-panel" style={{
        listStyle:  'none',
        margin:     0,
        padding:    '6px 8px',
        display:    'flex',
        flexDirection: 'column',
        gap:        6,
        overflowY:  'auto',
        flex:       1,
      }}>
        {components.length === 0 && (
          <li style={{ color: 'var(--text-sub)', fontSize: 11, padding: 8 }}>
            {t('dashboard.empty')}
          </li>
        )}
        {components.map(component => {
          const vm = componentVMs[component.id];
          if (!vm) return (
            <li key={component.id} data-testid={`dashboard-item-${component.id}`}
              style={{ padding: '6px 8px', background: 'var(--bg-mantle)', borderRadius: 6 }}>
              <span data-testid="component-name" style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                {component.name}
              </span>
            </li>
          );

          const healthPres = healthPresentation(vm.health);
          const statusPres = nodeStatusPresentation(vm.operationalStatus);
          const sensorPres = sensorStatePresentation(vm.sensorState);

          // Accurate alarm count from alarmStore
          const activeAlarmCount = alarmStore
            .getAlarmsForComponent(component.id)
            .filter(a => a.state === 'active').length;

          // Main telemetry value — check known slot IDs
          const temp     = vm.liveValues['temp'] ?? null;
          const flow     = vm.liveValues['flow'] ?? null;
          const runtime  = vm.liveValues['runtime'] ?? null;

          const primaryValue: string = (() => {
            if (typeof temp === 'number')    return `${temp.toFixed(1)}${t('unit.temperature')}`;
            if (typeof flow === 'number')    return `${flow.toFixed(1)} ${t('pump.flow_unit')}`;
            if (typeof runtime === 'number') return runtime > 0.5 ? t('kpi.running') : t('kpi.standby');
            return t('equip.no_sensor_data');
          })();

          const primaryStatusVar: string = (() => {
            if (typeof temp === 'number')    return statusPres.cssVar;
            if (typeof flow === 'number')    return flow > 0 ? '--status-healthy' : '--text-sub';
            if (typeof runtime === 'number') return runtime > 0.5 ? '--status-healthy' : '--text-sub';
            return '--text-sub';
          })();

          return (
            <li key={component.id} data-testid={`dashboard-item-${component.id}`}
              style={{
                padding:      '8px 10px',
                background:   'var(--bg-mantle)',
                border:       `1px solid ${activeAlarmCount > 0 ? 'var(--edge-alarm)' : 'var(--border)'}`,
                borderRadius: 6,
                display:      'flex',
                flexDirection: 'column',
                gap:          5,
                transition:   'border-color 0.3s',
              }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span data-testid="component-name"
                  style={{ fontSize: 11, fontWeight: 600, color: 'var(--node-label)', flex: 1 }}>
                  {component.name}
                </span>
                {activeAlarmCount > 0 && (
                  <span style={{
                    background:   'var(--status-critical)',
                    color:        '#fff',
                    borderRadius: 10,
                    padding:      '1px 6px',
                    fontSize:     9,
                    fontWeight:   700,
                    flexShrink:   0,
                  }}>
                    ⚠ {activeAlarmCount}
                  </span>
                )}
              </div>

              {/* Primary telemetry value */}
              <div style={{
                fontSize:          16,
                fontWeight:        700,
                color:             `var(${primaryStatusVar})`,
                fontVariantNumeric: 'tabular-nums',
                lineHeight:        1,
              }}>
                {primaryValue}
              </div>

              {/* Status badges */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Badge cssVar={healthPres.cssVar} label={t(healthPres.label as TranslationKey)} />
                <Badge cssVar={statusPres.cssVar} label={t(statusPres.label as TranslationKey)} />
                <Badge cssVar={sensorPres.cssVar} label={t(sensorPres.label as TranslationKey)} />
              </div>

              {/* Hidden spans for test compat */}
              <span data-testid="component-health"       style={{ display: 'none' }}>{vm.health}</span>
              <span data-testid="component-status"       style={{ display: 'none' }}>{vm.operationalStatus}</span>
              <span data-testid="component-sensor-state" style={{ display: 'none' }}>{vm.sensorState}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
