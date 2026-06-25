/**
 * EquipmentGrid — sidebar equipment cards. Stage 23 visual polish.
 * Preserves data-testid="dashboard-panel" and data-testid="dashboard-item-{id}"
 * for test compatibility.
 */

import React, { useState, useMemo } from 'react';
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
  projectId:          string;
  stores:             EngineStores;
  componentVMs:       Record<string, ComponentViewModel>;
  alarmStore:         AlarmStore;
  onSelectComponent?: (componentId: string) => void;
}

// Icon per component type
const TYPE_ICON: Record<string, string> = {
  storage_tank:         '🛢',
  buffer_tank:          '🪣',
  expansion_vessel:     '⊕',
  heat_pump:            '♨',
  gas_backup:           '🔥',
  electric_heater:      '⚡',
  solar_collector:      '☀',
  plate_heat_exchanger: '⇄',
  recirc_pump:          '◎',
  variable_speed_pump:  '⟳',
  mixing_valve:         '⬡',
  control_valve:        '⊛',
  isolation_valve:      '🔒',
  safety_valve:         '🛡',
  temperature_sensor:   '🌡',
  pressure_sensor:      '⦿',
  flow_sensor:          '≋',
  energy_meter:         '⚡',
  water_meter:          '💧',
  filter:               '⊡',
  air_separator:        '⊞',
  distribution_manifold:'⊢',
  point_of_use:         '🚿',
  tap:                  '🚰',
};

function Badge({ cssVar, label }: { cssVar: string; label: string }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          3,
      fontSize:     9,
      color:        `var(${cssVar})`,
      background:   `color-mix(in srgb, var(${cssVar}) 10%, transparent)`,
      borderRadius: 4,
      padding:      '1px 5px',
      fontWeight:   600,
      border:       `1px solid color-mix(in srgb, var(${cssVar}) 30%, transparent)`,
    }}>
      <span style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: `var(${cssVar})`,
        display: 'inline-block',
      }} />
      {label}
    </span>
  );
}

export function EquipmentGrid({ projectId, stores, componentVMs, alarmStore, onSelectComponent }: EquipmentGridProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const allComponents = stores.graph.getComponents(projectId);

  const components = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allComponents.filter(c => c.name.toLowerCase().includes(q))
      : allComponents;
    // Sort: alarmed components first, then by name
    return [...filtered].sort((a, b) => {
      const aAlarms = alarmStore.getAlarmsForComponent(a.id).filter(x => x.state === 'active').length;
      const bAlarms = alarmStore.getAlarmsForComponent(b.id).filter(x => x.state === 'active').length;
      if (bAlarms !== aAlarms) return bAlarms - aAlarms;
      return a.name.localeCompare(b.name);
    });
  }, [allComponents, search, alarmStore]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding:       '7px 12px 5px',
        fontSize:      9,
        fontWeight:    800,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        borderBottom:  '1px solid var(--border)',
        flexShrink:    0,
        background:    'var(--bg-crust)',
        display:       'flex',
        alignItems:    'center',
        gap:           6,
      }}>
        <span style={{ flex: 1 }}>{t('equip.title')}</span>
        <span style={{ fontSize: 8, color: 'var(--text-dim)', fontWeight: 500 }}>
          {allComponents.length}
        </span>
      </div>

      {/* Search filter — only shown when there are enough components */}
      {allComponents.length > 4 && (
        <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <input
            type="search"
            placeholder="Filter…"
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            style={{
              width:        '100%',
              background:   'var(--bg-base)',
              border:       '1px solid var(--border)',
              borderRadius: 3,
              color:        'var(--text-base)',
              fontSize:     10,
              padding:      '3px 7px',
              outline:      'none',
              boxSizing:    'border-box',
            }}
          />
        </div>
      )}

      <ul data-testid="dashboard-panel" style={{
        listStyle:     'none',
        margin:        0,
        padding:       '6px 8px',
        display:       'flex',
        flexDirection: 'column',
        gap:           5,
        overflowY:     'auto',
        flex:          1,
      }}>
        {allComponents.length === 0 && (
          <li style={{ color: 'var(--text-sub)', fontSize: 11, padding: 8 }}>
            {t('dashboard.empty')}
          </li>
        )}
        {allComponents.length > 0 && components.length === 0 && (
          <li style={{ color: 'var(--text-dim)', fontSize: 10, padding: '8px 4px', textAlign: 'center' }}>
            No match for "{search}"
          </li>
        )}
        {components.map(component => {
          const vm = componentVMs[component.id];
          if (!vm) return (
            <li key={component.id} data-testid={`dashboard-item-${component.id}`}
              onClick={() => onSelectComponent?.(component.id)}
              style={{
                padding:      '6px 10px',
                background:   'var(--bg-mantle)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--card-radius)',
                cursor:       onSelectComponent ? 'pointer' : 'default',
              }}>
              <span data-testid="component-name" style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                {component.name}
              </span>
            </li>
          );

          const healthPres = healthPresentation(vm.health);
          const statusPres = nodeStatusPresentation(vm.operationalStatus);
          const sensorPres = sensorStatePresentation(vm.sensorState);

          const activeAlarmCount = alarmStore
            .getAlarmsForComponent(component.id)
            .filter(a => a.state === 'active').length;

          const temp     = vm.liveValues['temp'] ?? null;
          const flow     = vm.liveValues['flow'] ?? null;
          const runtime  = vm.liveValues['runtime'] ?? null;

          const isRunning =
            typeof runtime === 'boolean' ? runtime :
            typeof runtime === 'number'  ? runtime > 0.5 :
            null;

          const primaryValue: string = (() => {
            if (typeof temp === 'number') return `${temp.toFixed(1)}${t('unit.temperature')}`;
            if (typeof flow === 'number') return `${flow.toFixed(1)} ${t('pump.flow_unit')}`;
            if (isRunning !== null) return isRunning ? t('kpi.running') : t('kpi.standby');
            return t('equip.no_sensor_data');
          })();

          const primaryColor: string = (() => {
            if (typeof temp === 'number') return `var(${statusPres.cssVar})`;
            if (typeof flow === 'number') return flow > 0 ? 'var(--status-healthy)' : 'var(--text-sub)';
            if (isRunning !== null) return isRunning ? 'var(--status-healthy)' : 'var(--text-sub)';
            return 'var(--text-dim)';
          })();

          const icon = TYPE_ICON[component.type] ?? '⬡';

          const borderColor = activeAlarmCount > 0
            ? 'var(--status-critical)'
            : `color-mix(in srgb, var(${healthPres.cssVar}) 25%, var(--border))`;

          return (
            <li key={component.id} data-testid={`dashboard-item-${component.id}`}
              onClick={() => onSelectComponent?.(component.id)}
              style={{
                padding:      '8px 10px',
                background:   'linear-gradient(160deg, var(--bg-mantle), var(--bg-crust))',
                border:       `1px solid ${borderColor}`,
                borderRadius: 'var(--card-radius)',
                display:      'flex',
                flexDirection: 'column',
                gap:           5,
                boxShadow:    activeAlarmCount > 0 ? 'var(--glow-critical)' : 'var(--shadow-card)',
                transition:   'border-color 0.3s, box-shadow 0.3s',
                cursor:       onSelectComponent ? 'pointer' : 'default',
              }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">{icon}</span>
                <span data-testid="component-name"
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--node-label)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {component.name}
                </span>
                {activeAlarmCount > 0 && (
                  <span style={{
                    background:   'var(--status-critical)',
                    color:        '#fff',
                    borderRadius: 10,
                    padding:      '1px 6px',
                    fontSize:     9,
                    fontWeight:   800,
                    flexShrink:   0,
                  }}>
                    ⚠ {activeAlarmCount}
                  </span>
                )}
              </div>

              {/* Primary metric */}
              <div style={{
                fontSize:           17,
                fontWeight:         700,
                color:              primaryColor,
                fontVariantNumeric: 'tabular-nums',
                lineHeight:         1,
                padding:            '2px 0',
              }}>
                {primaryValue}
              </div>

              {/* Status badges */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Badge cssVar={healthPres.cssVar} label={t(healthPres.label as TranslationKey)} />
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
