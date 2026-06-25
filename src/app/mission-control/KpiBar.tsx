/**
 * KpiBar — eight live metric cards across the top of Mission Control.
 *
 * Data sources (all real / simulated):
 *   Tank temp    → componentVMs['cmp_tank'].liveValues['temp']
 *   Supply temp  → connectionVMs['cn_supply'].value
 *   Return temp  → connectionVMs['cn_return'].value
 *   Flow rate    → componentVMs['cmp_recirc_pump'].liveValues['flow']
 *   Heat pump    → componentVMs['cmp_heatpump'].liveValues['runtime'] > 0.5
 *   Gas backup   → componentVMs['cmp_gas_backup'].liveValues['runtime'] > 0.5
 *   Recirc pump  → flow > 0 (DERIVED from real flow data)
 *   Active alarms→ alarmStore query (REAL)
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
  unit?:      string;
  statusVar?: string;
  secondary?: string;
  alarm?:     boolean;
}

function KpiCard({ label, value, unit, statusVar, secondary, alarm }: KpiCardProps) {
  const color = alarm
    ? 'var(--status-critical)'
    : statusVar
      ? `var(${statusVar})`
      : 'var(--text-base)';

  return (
    <div style={{
      background:   'var(--bg-mantle)',
      border:       `1px solid ${alarm ? 'var(--edge-alarm)' : 'var(--border)'}`,
      borderRadius: 8,
      padding:      '10px 14px',
      minWidth:     100,
      flex:         '1 1 0',
      display:      'flex',
      flexDirection: 'column',
      gap:          4,
      transition:   'border-color 0.3s',
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 12, marginInlineStart: 3, color: 'var(--text-sub)' }}>{unit}</span>}
      </span>
      {secondary && (
        <span style={{ fontSize: 10, color: alarm ? 'var(--status-critical)' : 'var(--text-sub)' }}>
          {secondary}
        </span>
      )}
    </div>
  );
}

export function KpiBar({ componentVMs, connectionVMs, alarmStore, projectId, components }: KpiBarProps) {
  const { t } = useLocale();

  // ── DEMO: hardcoded component/connection IDs for hot-water seed ──
  const tankVM      = componentVMs['cmp_tank'];
  const hpVM        = componentVMs['cmp_heatpump'];
  const gasVM       = componentVMs['cmp_gas_backup'];
  const recircVM    = componentVMs['cmp_recirc_pump'];
  const supplyConn  = connectionVMs['cn_supply'];
  const returnConn  = connectionVMs['cn_return'];

  const tankTemp   = tankVM   ? (tankVM.liveValues['temp']    as number | null ?? null) : null;
  const supplyTemp = supplyConn ? supplyConn.value : null;
  const returnTemp = returnConn ? returnConn.value : null;
  const flowRate   = recircVM ? (recircVM.liveValues['flow']  as number | null ?? null) : null;
  const hpRuntime  = hpVM     ? (hpVM.liveValues['runtime']   as number | null ?? null) : null;
  const gasRuntime = gasVM    ? (gasVM.liveValues['runtime']   as number | null ?? null) : null;

  const hpRunning    = hpRuntime  !== null ? hpRuntime  > 0.5 : null;
  const gasRunning   = gasRuntime !== null ? gasRuntime > 0.5 : null;
  const recircActive = flowRate   !== null ? flowRate   > 0   : null;

  // Active alarm count — accurate query (vm.activeAlarms is string[] including cleared)
  const activeAlarmCount = components.reduce((n, c) =>
    n + alarmStore.getAlarmsForComponent(c.id).filter(a => a.state === 'active').length, 0);

  const fmtTemp = (v: number | null) =>
    v !== null ? v.toFixed(1) : t('kpi.no_value');

  const statusForTemp = (v: number | null, statusVar: string | undefined) =>
    v !== null ? statusVar : '--text-sub';

  const supplyPres = supplyConn ? nodeStatusPresentation(supplyConn.status) : null;
  const returnPres = returnConn ? nodeStatusPresentation(returnConn.status) : null;
  const tankPres   = tankVM    ? nodeStatusPresentation(tankVM.operationalStatus) : null;

  const runLabel = (running: boolean | null) =>
    running === null
      ? t('kpi.no_value')
      : running ? t('kpi.running') : t('kpi.standby');

  const runStatusVar = (running: boolean | null) =>
    running === null ? '--text-sub' : running ? '--status-healthy' : '--text-sub';

  return (
    <div style={{
      display:       'flex',
      gap:           8,
      padding:       '8px 14px',
      background:    'var(--bg-crust)',
      borderBottom:  '1px solid var(--border)',
      overflowX:     'auto',
      flexShrink:    0,
    }} data-testid="kpi-bar">
      <KpiCard
        label={t('kpi.tank_temp')}
        value={fmtTemp(tankTemp)}
        unit={tankTemp !== null ? t('unit.temperature') : undefined}
        statusVar={tankPres ? statusForTemp(tankTemp, tankPres.cssVar) : '--text-sub'}
        secondary={tankPres && tankTemp !== null ? t(tankPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        label={t('kpi.supply_temp')}
        value={fmtTemp(supplyTemp)}
        unit={supplyTemp !== null ? t('unit.temperature') : undefined}
        statusVar={supplyPres ? statusForTemp(supplyTemp, supplyPres.cssVar) : '--text-sub'}
        secondary={supplyPres && supplyTemp !== null ? t(supplyPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        label={t('kpi.return_temp')}
        value={fmtTemp(returnTemp)}
        unit={returnTemp !== null ? t('unit.temperature') : undefined}
        statusVar={returnPres ? statusForTemp(returnTemp, returnPres.cssVar) : '--text-sub'}
        secondary={returnPres && returnTemp !== null ? t(returnPres.label as TranslationKey) : undefined}
      />
      <KpiCard
        label={t('kpi.flow_rate')}
        value={flowRate !== null ? flowRate.toFixed(1) : t('kpi.no_value')}
        unit={flowRate !== null ? t('pump.flow_unit') : undefined}
        statusVar={flowRate !== null && flowRate > 0 ? '--status-healthy' : '--text-sub'}
        secondary={flowRate !== null ? (flowRate > 0 ? t('kpi.running') : t('kpi.standby')) : undefined}
      />
      <KpiCard
        label={t('kpi.heat_pump')}
        value={runLabel(hpRunning)}
        statusVar={runStatusVar(hpRunning)}
      />
      <KpiCard
        label={t('kpi.gas_backup')}
        value={runLabel(gasRunning)}
        statusVar={runStatusVar(gasRunning)}
      />
      <KpiCard
        label={t('kpi.recirc_pump')}
        value={runLabel(recircActive)}
        statusVar={runStatusVar(recircActive)}
        secondary={recircActive && flowRate !== null
          ? `${flowRate.toFixed(1)} ${t('pump.flow_unit')}`
          : undefined}
      />
      <KpiCard
        label={t('kpi.active_alarms')}
        value={String(activeAlarmCount)}
        alarm={activeAlarmCount > 0}
        secondary={activeAlarmCount === 0 ? t('app.all_clear') : undefined}
      />
    </div>
  );
}
