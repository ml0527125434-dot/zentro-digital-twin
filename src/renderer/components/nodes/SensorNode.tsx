import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState, SensorState } from '../../../domain/types.js';
import { AlarmBadge } from './AlarmBadge.js';

const PRIMARY_SLOT: Record<string, string>  = {
  temperature_sensor: 'temp',
  pressure_sensor:    'pressure',
  flow_sensor:        'flow',
  energy_meter:       'energy',
  water_meter:        'flow',
};
const SENSOR_UNITS: Record<string, string> = {
  temperature_sensor: '°C',
  pressure_sensor:    'bar',
  flow_sensor:        'L/m',
  energy_meter:       'kWh',
  water_meter:        'L/m',
};
// Value range for the arc gauge
const SENSOR_RANGE: Record<string, [number, number]> = {
  temperature_sensor: [10, 90],
  pressure_sensor:    [0, 10],
  flow_sensor:        [0, 50],
  energy_meter:       [0, 500],
  water_meter:        [0, 50],
};
// Accent color per sensor type
const SENSOR_COLOR: Record<string, string> = {
  temperature_sensor: '#f97316',
  pressure_sensor:    '#0ea5e9',
  flow_sensor:        '#2dd4bf',
  energy_meter:       '#a78bfa',
  water_meter:        '#38bdf8',
};

// SVG arc path for a gauge arc (polar coords → cartesian)
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

const S = 96;   // SVG size
const CX = S / 2, CY = S / 2;
const R = 38;   // gauge arc radius
const START_DEG = 140, END_DEG = 400;  // 260° arc

export function SensorNode({ id, data }: NodeProps<ComponentNode>) {
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues, sensorState } = viewModel;

  const slotId   = PRIMARY_SLOT[typeId] ?? 'temp';
  const rawValue = liveValues?.[slotId] ?? null;
  const value    = typeof rawValue === 'number' ? rawValue : null;
  const unit     = SENSOR_UNITS[typeId] ?? '';
  const [rMin, rMax] = SENSOR_RANGE[typeId] ?? [0, 100];
  const accent   = SENSOR_COLOR[typeId] ?? '#0ea5e9';

  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(sensorState);
  const valueColor = statusPres ? `var(${statusPres.cssVar})` : accent;
  const isLive     = sensorState === SensorState.Live;
  const alarmCount = viewModel.activeAlarms.length;

  const isCritical = health === HealthState.Critical;
  const borderColor =
    health === HealthState.Critical  ? '#ef4444' :
    health === HealthState.Warning   ? '#f59e0b' :
    health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  // Gauge fill fraction
  const fraction = value !== null
    ? Math.max(0, Math.min(1, (value - rMin) / (rMax - rMin)))
    : 0;
  const fillEndDeg = START_DEG + fraction * (END_DEG - START_DEG);

  // Circumference of track arc
  const arcSpan = ((END_DEG - START_DEG) / 360) * 2 * Math.PI * R;
  const hasLeft  = ['flow_sensor', 'energy_meter', 'water_meter'].includes(typeId);
  const hasRight = hasLeft;

  return (
    <div style={{
      position:  'relative',
      width:     S,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      {hasLeft  && <Handle type="target" position={Position.Left}  id="in"  style={{ top: '48%' }} />}
      {hasRight && <Handle type="source" position={Position.Right} id="out" style={{ top: '48%' }} />}

      <svg width={S} height={S + 14} viewBox={`0 0 ${S} ${S + 14}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`sens-bg-${id}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#1a2236" />
            <stop offset="100%" stopColor="#080c12" />
          </radialGradient>
        </defs>

        {/* Outer border circle */}
        <circle cx={CX} cy={CY} r={R + 9}
          fill="none" stroke={borderColor} strokeWidth="1.5" />

        {/* Body fill */}
        <circle cx={CX} cy={CY} r={R + 8}
          fill={`url(#sens-bg-${id})`} />

        {/* Gauge track (background arc) */}
        <path d={arcPath(CX, CY, R, START_DEG, END_DEG)}
          fill="none" stroke="#1e2938" strokeWidth="7" strokeLinecap="round" />

        {/* Gauge fill */}
        {value !== null && fraction > 0.01 && (
          <path d={arcPath(CX, CY, R, START_DEG, fillEndDeg)}
            fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${accent})` }} />
        )}

        {/* Center value */}
        <text x={CX} y={CY + 5}
          textAnchor="middle" fill={valueColor}
          fontSize={value !== null ? '18' : '14'} fontWeight="800" fontFamily="inherit"
          style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value !== null ? (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) : '—'}
        </text>

        {/* Unit */}
        <text x={CX} y={CY + 17}
          textAnchor="middle" fill="#4a5568"
          fontSize="8" fontFamily="inherit">
          {unit}
        </text>

        {/* Live dot */}
        <circle cx={CX} cy={CY + 27} r={3.5}
          fill={`var(${sensorPres.cssVar})`} opacity={0.95}>
          {isLive && (
            <animate attributeName="opacity" values="1;0.25;1"
              dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Name label */}
        <text x={CX} y={S + 10}
          textAnchor="middle" fill="#4a5568"
          fontSize="8" fontWeight="700" fontFamily="inherit"
          style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {name.length > 14 ? name.slice(0, 13) + '…' : name}
        </text>
      </svg>
    </div>
  );
}
