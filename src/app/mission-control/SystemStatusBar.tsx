/**
 * SystemStatusBar — single-line status strip showing:
 *   overall health | sensor data quality | last update time | demo mode badge
 */

import React from 'react';
import type { ComponentViewModel } from '../../domain/types.js';
import { HealthState, SensorState } from '../../domain/types.js';
import { healthPresentation } from '../../renderer/theme.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface SystemStatusBarProps {
  componentVMs: Record<string, ComponentViewModel>;
  nowMs:        number;
}

function worstHealth(vms: ComponentViewModel[]): HealthState {
  const rank: Record<HealthState, number> = {
    [HealthState.Critical]:      5,
    [HealthState.Offline]:       4,
    [HealthState.Warning]:       3,
    [HealthState.Maintenance]:   2,
    [HealthState.Commissioning]: 1,
    [HealthState.Healthy]:       0,
  };
  return vms.reduce<HealthState>(
    (worst, vm) => rank[vm.health]! > rank[worst]! ? vm.health : worst,
    HealthState.Healthy,
  );
}

function sensorSummary(vms: ComponentViewModel[]): 'all_live' | 'some_stale' | 'offline' {
  const states = vms.map(vm => vm.sensorState);
  if (states.every(s => s === SensorState.Live))    return 'all_live';
  if (states.some(s => s === SensorState.Lost))     return 'offline';
  return 'some_stale';
}

export function SystemStatusBar({ componentVMs, nowMs }: SystemStatusBarProps) {
  const { t } = useLocale();
  const vms = Object.values(componentVMs);

  const overallHealth  = worstHealth(vms);
  const sensorSummary_ = sensorSummary(vms);
  const healthPres     = healthPresentation(overallHealth);

  const sensorKey: TranslationKey =
    sensorSummary_ === 'all_live'   ? 'sys.all_sensors_live'   :
    sensorSummary_ === 'some_stale' ? 'sys.some_sensors_stale' :
    'sys.sensors_offline';

  const sensorColor =
    sensorSummary_ === 'all_live'   ? 'var(--status-healthy)' :
    sensorSummary_ === 'some_stale' ? 'var(--status-warning)' :
    'var(--status-critical)';

  // Last-update time — seconds elapsed since nowMs was last advanced
  const nowSec    = Math.floor(nowMs / 1000);
  const lastUpdate = t('sys.just_now'); // clock ticks every 1s; always "just now" in demo

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          20,
      padding:      '5px 14px',
      background:   'var(--bg-crust)',
      borderBottom: '1px solid var(--border)',
      fontSize:     11,
      flexShrink:   0,
    }} data-testid="system-status-bar">
      {/* Overall health */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: 'var(--text-sub)' }}>{t('sys.health')}:</span>
        <span style={{ color: `var(${healthPres.cssVar})`, fontWeight: 600 }}>
          {healthPres.icon} {t(healthPres.label as TranslationKey)}
        </span>
      </span>

      {/* Sensor quality */}
      <span style={{ color: sensorColor }}>
        ● {t(sensorKey)}
      </span>

      {/* Last update */}
      <span style={{ color: 'var(--text-sub)' }}>
        {t('sys.last_update')}: <span style={{ color: 'var(--text-base)' }}>{lastUpdate}</span>
      </span>

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Demo mode badge */}
      <span style={{
        background:   'color-mix(in srgb, var(--status-maintenance) 15%, transparent)',
        border:       '1px solid var(--status-maintenance)',
        borderRadius: 10,
        padding:      '1px 8px',
        color:        'var(--status-maintenance)',
        fontWeight:   600,
        fontSize:     9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {t('sys.demo_mode')}
      </span>
    </div>
  );
}
