/**
 * SystemStatusBar — single-line status strip. Stage 23 visual polish.
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
  if (states.length === 0)                         return 'all_live';
  if (states.every(s => s === SensorState.Live))   return 'all_live';
  if (states.some(s => s === SensorState.Lost))    return 'offline';
  return 'some_stale';
}

export function SystemStatusBar({ componentVMs, nowMs }: SystemStatusBarProps) {
  const { t } = useLocale();
  const vms          = Object.values(componentVMs);
  const overallHealth = worstHealth(vms);
  const summary       = sensorSummary(vms);
  const healthPres    = healthPresentation(overallHealth);

  const sensorKey: TranslationKey =
    summary === 'all_live'   ? 'sys.all_sensors_live'   :
    summary === 'some_stale' ? 'sys.some_sensors_stale' :
    'sys.sensors_offline';

  const sensorColor =
    summary === 'all_live'   ? 'var(--status-healthy)' :
    summary === 'some_stale' ? 'var(--status-warning)'  :
    'var(--status-critical)';

  const healthBg =
    overallHealth === HealthState.Critical ? 'color-mix(in srgb, var(--status-critical) 12%, transparent)' :
    overallHealth === HealthState.Warning   ? 'color-mix(in srgb, var(--status-warning) 8%, transparent)'  :
    'transparent';

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          18,
      padding:      '5px 16px',
      background:   `linear-gradient(90deg, ${healthBg}, var(--bg-crust))`,
      borderBottom: '1px solid var(--border)',
      fontSize:     11,
      flexShrink:   0,
      minHeight:    32,
    }} data-testid="system-status-bar">

      {/* Overall health indicator */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width:         8,
          height:        8,
          borderRadius:  '50%',
          background:    `var(${healthPres.cssVar})`,
          display:       'inline-block',
          flexShrink:    0,
          boxShadow:     overallHealth === HealthState.Critical
            ? '0 0 6px var(--status-critical)'
            : overallHealth === HealthState.Warning
              ? '0 0 4px var(--status-warning)'
              : '0 0 4px var(--status-healthy)',
        }} />
        <span style={{ color: 'var(--text-sub)', fontSize: 10 }}>{t('sys.health')}:</span>
        <span style={{ color: `var(${healthPres.cssVar})`, fontWeight: 700 }}>
          {t(healthPres.label as TranslationKey)}
        </span>
      </span>

      {/* Divider */}
      <span style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

      {/* Sensor quality */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: sensorColor }}>
        <span style={{ fontSize: 8 }}>●</span>
        <span style={{ fontSize: 10 }}>{t(sensorKey)}</span>
      </span>

      {/* Divider */}
      <span style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

      {/* Last update */}
      <span style={{ fontSize: 10, color: 'var(--text-sub)' }}>
        {t('sys.last_update')}:{' '}
        <span style={{ color: 'var(--text-base)' }}>{t('sys.just_now')}</span>
      </span>

      <span style={{ flex: 1 }} />

      {/* Demo badge — live pulse dot to make demo state unmistakable */}
      <span style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           5,
        background:    'color-mix(in srgb, var(--accent) 10%, transparent)',
        border:        '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
        borderRadius:  10,
        padding:       '2px 10px 2px 7px',
        color:         'var(--accent)',
        fontWeight:    700,
        fontSize:      9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        <span style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   'var(--accent)',
          flexShrink:   0,
          animation:    'demo-live-pulse 2s ease-in-out infinite',
        }} />
        {t('sys.demo_mode')}
      </span>
    </div>
  );
}
