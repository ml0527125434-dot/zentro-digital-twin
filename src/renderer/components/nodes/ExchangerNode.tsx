import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode, ComponentNodeData } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const EXCHANGER_ICONS: Record<string, string> = {
  plate_heat_exchanger: '⇄',
  solar_collector:      '☀',
};

export function ExchangerNode({ data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues } = viewModel;

  const icon    = EXCHANGER_ICONS[typeId] ?? '⇄';
  const isSolar = typeId === 'solar_collector';

  // Primary value: outlet temp for PHE, collector temp for solar
  const tempSlot  = isSolar ? 'temp' : 'temp_primary_out';
  const rawValue  = liveValues?.[tempSlot] ?? liveValues?.['temp'] ?? null;
  const value     = typeof rawValue === 'number' ? rawValue : null;

  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const valueColor = statusPres ? `var(${statusPres.cssVar})` : 'var(--text-base)';
  const isLive     = sensorPres.cssVar === '--sensor-live';

  const isActive   = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : value !== null && value > 30;
  const alarmCount = viewModel.activeAlarms.length;

  const healthClass =
    health === HealthState.Critical     ? 'zentro-node--critical'     :
    health === HealthState.Warning      ? 'zentro-node--warning'      :
    health === HealthState.Healthy      ? 'zentro-node--healthy'      :
    health === HealthState.Maintenance  ? 'zentro-node--maintenance'  :
    health === HealthState.Commissioning? 'zentro-node--commissioning':
    'zentro-node--offline';

  return (
    <div
      className={`zentro-node ${healthClass}`}
      style={{
        background:   'var(--bg-mantle)',
        padding:      '8px 12px',
        minWidth:     120,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          4,
        boxShadow:    'var(--shadow-card)',
        position:     'relative',
      }}
    >
      <AlarmBadge count={alarmCount} />
      {/* Ports — solar_collector: cold_in=bottom, hot_out=top per definition */}
      {isSolar ? <>
        <Handle type="target" position={Position.Bottom} id="cold_in" style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
        <Handle type="source" position={Position.Top}    id="hot_out" style={{ background: 'var(--pipe-hot)', width: 7, height: 7 }} />
      </> : <>
        <Handle type="target" position={Position.Left}   id="primary_in"    style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
        <Handle type="source" position={Position.Right}  id="primary_out"   style={{ background: 'var(--pipe-hot)', width: 7, height: 7 }} />
        <Handle type="target" position={Position.Bottom} id="secondary_in"  style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
        <Handle type="source" position={Position.Top}    id="secondary_out" style={{ background: 'var(--pipe-hot)', width: 7, height: 7 }} />
      </>}

      {/* Icon with active glow */}
      <span style={{
        fontSize:   22,
        lineHeight: 1,
        filter:     isActive && isSolar ? 'drop-shadow(0 0 4px rgba(251,191,36,0.7))' : 'none',
        transition: 'filter 0.4s',
      }}>
        {icon}
      </span>

      <span style={{
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--text-base)',
        textAlign:    'center',
        maxWidth:     110,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {name}
      </span>

      {value !== null ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: valueColor }}>
          {value.toFixed(1)}{t('unit.temperature')}
        </span>
      ) : (
        <span style={{ fontSize: 9, color: isActive ? 'var(--status-healthy)' : 'var(--text-dim)' }}>
          {isActive ? t('kpi.running') : t('kpi.standby')}
        </span>
      )}

      <span
        className={`zentro-node__dot${isLive ? ' zentro-node__dot--blink' : ''}`}
        style={{ background: `var(${sensorPres.cssVar})` }}
      />
    </div>
  );
}
