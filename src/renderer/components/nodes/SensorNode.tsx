import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode, ComponentNodeData } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState, SensorState } from '../../../domain/types.js';

const SENSOR_ICONS: Record<string, string> = {
  temperature_sensor: '🌡',
  pressure_sensor:    '⦿',
  flow_sensor:        '≋',
  energy_meter:       '⚡',
  water_meter:        '💧',
};

const SENSOR_UNITS: Record<string, string> = {
  temperature_sensor: '°C',
  pressure_sensor:    'bar',
  flow_sensor:        'L/min',
  energy_meter:       'kWh',
  water_meter:        'L/min',
};

const PRIMARY_SLOT: Record<string, string> = {
  temperature_sensor: 'temp',
  pressure_sensor:    'pressure',
  flow_sensor:        'flow',
  energy_meter:       'energy',
  water_meter:        'flow',
};

export function SensorNode({ data }: NodeProps<ComponentNode>) {
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues, sensorState } = viewModel;

  const slotId = PRIMARY_SLOT[typeId] ?? 'temp';
  const rawValue = liveValues?.[slotId] ?? null;
  const value = typeof rawValue === 'number' ? rawValue : null;
  const unit  = SENSOR_UNITS[typeId] ?? '';
  const icon  = SENSOR_ICONS[typeId] ?? '◯';

  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(sensorState);
  const valueColor = statusPres ? `var(${statusPres.cssVar})` : 'var(--text-base)';
  const isLive = sensorState === SensorState.Live;

  const healthClass =
    health === HealthState.Critical     ? 'zentro-node--critical'     :
    health === HealthState.Warning      ? 'zentro-node--warning'      :
    health === HealthState.Healthy      ? 'zentro-node--healthy'      :
    health === HealthState.Maintenance  ? 'zentro-node--maintenance'  :
    health === HealthState.Commissioning? 'zentro-node--commissioning':
    'zentro-node--offline';

  const hasLeftPort  = ['flow_sensor', 'energy_meter', 'water_meter'].includes(typeId);
  const hasRightPort = ['flow_sensor', 'energy_meter', 'water_meter'].includes(typeId);

  return (
    <div
      className={`zentro-node ${healthClass}`}
      style={{
        background:   'var(--bg-mantle)',
        padding:      '6px 10px',
        minWidth:     90,
        maxWidth:     110,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          3,
        boxShadow:    'var(--shadow-card)',
        position:     'relative',
      }}
    >
      {hasLeftPort  && <Handle type="target" position={Position.Left}  id="in"  style={{ background: 'var(--accent)', width: 7, height: 7 }} />}
      {hasRightPort && <Handle type="source" position={Position.Right} id="out" style={{ background: 'var(--accent)', width: 7, height: 7 }} />}

      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>

      <span style={{
        fontSize:     9,
        fontWeight:   700,
        color:        'var(--text-sub)',
        textAlign:    'center',
        maxWidth:     90,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        lineHeight:   1.2,
      }}>
        {name}
      </span>

      {value !== null ? (
        <span style={{
          fontSize:   12,
          fontWeight: 700,
          color:      valueColor,
          lineHeight: 1,
        }}>
          {value % 1 === 0 ? value : value.toFixed(1)}{unit}
        </span>
      ) : (
        <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>—</span>
      )}

      {/* Sensor live state indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, gap: 3 }}>
        <span
          className={`zentro-node__dot${isLive ? ' zentro-node__dot--blink' : ''}`}
          style={{ background: `var(${sensorPres.cssVar})`, width: 5, height: 5 }}
        />
      </div>
    </div>
  );
}
