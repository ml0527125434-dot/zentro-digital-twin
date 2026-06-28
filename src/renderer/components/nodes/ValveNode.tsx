import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const VALVE_ABBR: Record<string, string> = {
  mixing_valve:    'MXV',
  control_valve:   'CV',
  isolation_valve: 'ISO',
  safety_valve:    'SV',
};

export function ValveNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = viewModel.health === HealthState.Critical;

  const openVal  = viewModel.liveValues['open'] ?? viewModel.liveValues['position'] ?? null;
  const hasState = openVal !== null && openVal !== undefined;
  const isOpen   = hasState && (openVal === true || openVal === 1 || (typeof openVal === 'number' && openVal > 0.5));

  const stateColor = !hasState ? '#475569' : isOpen ? '#22c55e' : '#ef4444';
  const stateLabel = !hasState ? '?' : isOpen ? t('valve.open') : t('valve.closed');

  const borderColor =
    viewModel.health === HealthState.Critical  ? '#ef4444' :
    viewModel.health === HealthState.Warning   ? '#f59e0b' :
    viewModel.health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const isMixing = typeId === 'mixing_valve';
  const isSafety = typeId === 'safety_valve';
  const W = 120, H = 82, CX = W / 2, CY = H / 2;

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />

      <Handle type="target" position={Position.Left}  id="in"  style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '50%' }} />
      {isMixing && <Handle type="target" position={Position.Top} id="mix_in" style={{ left: '50%' }} />}

      <svg width={W} height={H + 24} viewBox={`0 0 ${W} ${H + 24}`}
        style={{ display: 'block', overflow: 'visible' }}>

        {/* Background panel */}
        <rect x={6} y={8} width={W - 12} height={H - 6}
          rx={5} fill="#0a0e17" stroke={borderColor} strokeWidth="1.5" />

        {/* Left bowtie triangle */}
        <polygon
          points={`8,12 8,${H - 8} ${CX - 3},${CY}`}
          fill={stateColor}
          opacity={hasState ? 0.82 : 0.3}
          style={hasState ? { filter: `drop-shadow(0 0 5px ${stateColor})` } : {}}
        />
        {/* Right bowtie triangle */}
        <polygon
          points={`${W - 8},12 ${W - 8},${H - 8} ${CX + 3},${CY}`}
          fill={stateColor}
          opacity={hasState ? 0.82 : 0.3}
          style={hasState ? { filter: `drop-shadow(0 0 5px ${stateColor})` } : {}}
        />

        {/* Mixing valve: extra triangle from bottom */}
        {isMixing && (
          <polygon
            points={`${CX - 16},12 ${CX + 16},12 ${CX},${CY - 2}`}
            fill={stateColor} opacity={hasState ? 0.65 : 0.25}
          />
        )}

        {/* Safety valve: relief spring */}
        {isSafety && (
          <g stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.85">
            <line x1={CX} y1={CY - 8} x2={CX} y2={CY - 16} />
            <polyline points={`${CX - 6},${CY - 16} ${CX},${CY - 22} ${CX + 6},${CY - 16} ${CX},${CY - 28} ${CX - 6},${CY - 22}`} />
          </g>
        )}

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={9}
          fill="#131825" stroke={stateColor} strokeWidth="2.5"
          style={hasState ? { filter: `drop-shadow(0 0 6px ${stateColor})` } : {}} />
        <circle cx={CX} cy={CY} r={4.5} fill={stateColor} opacity={0.95} />

        {/* Type abbrev badge */}
        <rect x={10} y={11} width={24} height={11} rx={2}
          fill="#0d1117" stroke={borderColor} strokeWidth="0.8" />
        <text x={22} y={20} textAnchor="middle" fill="#4a5568"
          fontSize="6.5" fontWeight="800" fontFamily="inherit">
          {VALVE_ABBR[typeId] ?? 'V'}
        </text>

        {/* State text */}
        <text x={CX} y={H + 13}
          textAnchor="middle" fill={stateColor}
          fontSize="9" fontWeight="700" fontFamily="inherit">
          {stateLabel}
        </text>
      </svg>

      <div style={{
        textAlign:     'center',
        fontSize:       9,
        fontWeight:     700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop:     -8,
        overflow:      'hidden',
        textOverflow:  'ellipsis',
        whiteSpace:    'nowrap',
        paddingInline:  4,
      }}>
        {name}
      </div>
    </div>
  );
}
