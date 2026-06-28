/**
 * KpiBar — eight live metric cards across the top of Mission Control.
 * Stage 23: premium card design with gradient headers and status accents.
 *
 * DEMO: component IDs are hardcoded for the hot-water demo seed.
 */

import React from 'react';
import type { ComponentViewModel, ConnectionViewModel } from '../../domain/types.js';
import { NodeStatus } from '../../domain/types.js';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { nodeStatusPresentation } from '../../renderer/theme.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface KpiBarProps {
  componentVMs:  Record<string, ComponentViewModel>;
  connectionVMs: Record<string, ConnectionViewModel>;
  alarmStore:    AlarmStore;
  projectId:     string;
  components:    { id: string }[];
}

interface KpiCardProps {
  label:      string;
  value:      string;
  unit?:      string | undefined;
  statusVar?: string | undefined;
  secondary?: string | undefined;
  alarm?:     boolean | undefined;
  icon?:      string | undefined;
}

function KpiCard({ label, value, unit, statusVar, secondary, alarm, icon }: KpiCardProps) {
  const valueColor = alarm
    ? 'var(--status-critical)'
    : statusVar
      ? `var(${statusVar})`
      : 'var(--text-base)';

  const borderColor = alarm
    ? 'var(--status-critical)'
    : statusVar && statusVar !== '--text-sub' && statusVar !== '--node-unknown'
      ? `var(${statusVar})`
      : 'var(--border)';

  return (
    <div style={{
      background:      'linear-gradient(160deg, var(--bg-mantle) 0%, var(--bg-crust) 100%)',
      border:          `1px solid ${borderColor}`,
      borderRadius:    'var(--card-radius)',
      padding:         '8px 10px',
      minWidth:        88,
      flex:            '1 1 0',
      display:         'flex',
      flexDirection:   'column',
      gap:             4,
      boxShadow:       alarm ? 'var(--glow-critical)' : 'var(--shadow-kpi)',
      transition:      'border-color 0.3s, box-shadow 0.3s',
      position:        'relative',
      overflow:        'hidden',
    }}>
      {/* Subtle accent bar at top */}
      <div style={{
        position:     'absolute',
        top:          0,
        left:         0,
        right:        0,
        height:       2,
        background:   valueColor,
        opacity:      alarm ? 0.9 : 0.4,
        borderRadius: 'var(--card-radius) var(--card-radius) 0 0',
        transition:   'opacity 0.3s',
      }} />

      <span style={{
        fontSize:      9,
        fontWeight:    700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        display:       'flex',
        alignItems:    'center',
        gap:           4,
      }}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </span>

      <span style={{
        fontSize:           alarm ? 20 : 22,
        fontWeight:         700,
        color:              valueColor,
        fontVariantNumeric: 'tabular-nums',
        lineHeight:         1,
        transition:         'color 0.3s',
      }}>
        {value}
        {unit && (
          <span style={{ fontSize: 12, marginInlineStart: 3, color: 'var(--text-sub)', fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </span>

      {secondary && (
        <span style={{
          fontSize:   10,
          color:      alarm ? 'var(--status-critical)' : 'var(--text-sub)',
          marginTop:  1,
        }}>
          {secondary}
        </span>
      )}
    </div>
  );
}

export function KpiBar({ componentVMs, connectionVMs, alarmStore, projectId, components }: KpiBarProps) {
  const { t } = useLocale();

  // DEMO: hardcoded component/connection IDs for hot-water seed
  const tankVM     = componentVMs['cmp_tank'];
  const hpVM       = componentVMs['cmp_heatpump'];
  const gasVM      = componentVMs['cmp_gas_backup'];
  const recircVM   = componentVMs['cmp_recirc_pump'];
  const supplyConn = connectionVMs['cn_supply'];
  const returnConn = connectionVMs['cn_return'];

  const tankTemp   = tankVM   ? (tankVM.liveValues['temp']    as number | null ?? null) : null;
  const supplyTemp = supplyConn ? supplyConn.value : null;
  const returnTemp = returnConn ? returnConn.value : null;
  const flowRate   = recircVM ? (recircVM.liveValues['flow']  as number | null ?? null) : null;
  const hpRuntime  = hpVM     ? (hpVM.liveValues['runtime']   as number | null ?? null) : null;
  const gasRuntime = gasVM    ? (gasVM.liveValues['runtime']   as number | null ?? null) : null;

  const hpRunning    = hpRuntime  !== null ? hpRuntime  > 0.5 : null;
  const gasRunning   = gasRuntime !== null ? gasRuntime > 0.5 : null;
  const recircActive = flowRate   !== null ? flowRate   > 0   : null;

  const activeAlarmCount = components.reduce((n, c) =>
    n + alarmStore.getAlarmsForComponent(c.id).filter(a => a.state === 'active' || a.state === 'pending').length, 0);

  const fmtTemp = (v: number | null) =>
    v !== null ? v.toFixed(1) : t('kpi.no_value');

  const supplyPres = supplyConn ? nodeStatusPresentation(supplyConn.status) : null;
  const returnPres = returnConn ? nodeStatusPresentation(returnConn.status) : null;
  const tankPres   = tankVM    ? nodeStatusPresentation(tankVM.operationalStatus) : null;

  const runLabel = (running: boolean | null) =>
    running === null ? t('kpi.no_value') : running ? t('kpi.running') : t('kpi.standby');

  const runStatusVar = (running: boolean | null) =>
    running === null ? '--text-sub' : running ? '--status-healthy' : '--text-sub';

  return (
    <div style={{
      display:       'flex',
      gap:           5,
      padding:       '6px 10px',
      background:    'var(--bg-crust)',
      borderBottom:  '1px solid var(--border)',
      overflowX:     'auto',
      flexShrink:    0,
      scrollbarWidth: 'none',
    }} data-testid="kpi-bar">
      <KpiCard
        icon="🛢"
        label={t('kpi.tank_temp')}
        value={fmtTemp(tankTemp)}
        unit={tankTemp !== null ? t('unit.temperature') : undefined}
        statusVar={tankPres ? (tankTemp !== null ? tankPres.cssVar : '--text-sub') : '--text-sub'}
        secondary={tankPres && tankTemp !== null ? t(tankPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        icon="→"
        label={t('kpi.supply_temp')}
        value={fmtTemp(supplyTemp)}
        unit={supplyTemp !== null ? t('unit.temperature') : undefined}
        statusVar={supplyPres ? (supplyTemp !== null ? supplyPres.cssVar : '--text-sub') : '--text-sub'}
        secondary={supplyPres && supplyTemp !== null ? t(supplyPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        icon="←"
        label={t('kpi.return_temp')}
        value={fmtTemp(returnTemp)}
        unit={returnTemp !== null ? t('unit.temperature') : undefined}
        statusVar={returnPres ? (returnTemp !== null ? returnPres.cssVar : '--text-sub') : '--text-sub'}
        secondary={returnPres && returnTemp !== null ? t(returnPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        icon="〜"
        label={t('kpi.flow_rate')}
        value={flowRate !== null ? flowRate.toFixed(1) : t('kpi.no_value')}
        unit={flowRate !== null ? t('pump.flow_unit') : undefined}
        statusVar={flowRate !== null && flowRate > 0 ? '--status-healthy' : '--text-sub'}
        secondary={flowRate !== null ? (flowRate > 0 ? t('kpi.running') : t('kpi.standby')) : undefined}
      />
      <KpiCard
        icon="♨"
        label={t('kpi.heat_pump')}
        value={runLabel(hpRunning)}
        statusVar={runStatusVar(hpRunning)}
      />
      <KpiCard
        icon="🔥"
        label={t('kpi.gas_backup')}
        value={runLabel(gasRunning)}
        statusVar={runStatusVar(gasRunning)}
      />
      <KpiCard
        icon="◎"
        label={t('kpi.recirc_pump')}
        value={runLabel(recircActive)}
        statusVar={runStatusVar(recircActive)}
        secondary={recircActive && flowRate !== null
          ? `${flowRate.toFixed(1)} ${t('pump.flow_unit')}`
          : undefined}
      />
      <KpiCard
        icon="⚠"
        label={t('kpi.active_alarms')}
        value={String(activeAlarmCount)}
        alarm={activeAlarmCount > 0}
        secondary={activeAlarmCount === 0 ? t('app.all_clear') : undefined}
      />
    </div>
  );
}
