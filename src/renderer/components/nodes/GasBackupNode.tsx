import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 130, H = 120;

export function GasBackupNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = viewModel.health === HealthState.Critical;

  const runtime    = viewModel.liveValues['runtime'];
  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);
  const temp       = viewModel.liveValues['temp'] ?? null;
  const tempNum    = typeof temp === 'number' ? temp : null;

  const borderColor =
    viewModel.health === HealthState.Critical  ? '#ef4444' :
    viewModel.health === HealthState.Warning   ? '#f59e0b' :
    viewModel.health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const flameColor  = isRunning ? '#f97316' : '#1e3a5f';
  const flameGlow   = isRunning ? 'drop-shadow(0 0 8px rgba(249,115,22,0.7))' : 'none';
  const runColor    = isRunning ? '#f97316' : '#4a5568';
  const CX = W / 2;

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '55%' }} />

      <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`gas-bg-${id}`} cx="50%" cy="70%" r="60%">
            <stop offset="0%"   stopColor={isRunning ? 'rgba(249,115,22,0.12)' : '#0d1117'} />
            <stop offset="100%" stopColor="#080c12" />
          </radialGradient>
        </defs>

        {/* Boiler body */}
        <rect x={8} y={40} width={W - 16} height={70} rx={6}
          fill={`url(#gas-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />

        {/* Horizontal bands (boiler flue tubes) */}
        {[55, 68, 81, 94].map(y => (
          <line key={y} x1={14} y1={y} x2={W - 14} y2={y}
            stroke={isRunning ? 'rgba(249,115,22,0.3)' : '#1e2938'}
            strokeWidth="1.5" />
        ))}

        {/* Gas pipe inlet (left side, bottom) */}
        <rect x={0} y={88} width={14} height={8} rx={2}
          fill="#131825" stroke={borderColor} strokeWidth="1" />
        <text x={7} y={95} textAnchor="middle" fill="#fbbf24"
          fontSize="5.5" fontWeight="800" fontFamily="inherit">GAS</text>

        {/* Hot water outlet (right) */}
        <rect x={W - 14} y={55} width={14} height={8} rx={2}
          fill="#131825" stroke={isRunning ? '#f97316' : borderColor} strokeWidth="1" />

        {/* Temperature display */}
        {tempNum !== null && (
          <text x={CX} y={82}
            textAnchor="middle" fill={isRunning ? '#f97316' : '#4a5568'}
            fontSize="16" fontWeight="800" fontFamily="inherit"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {tempNum.toFixed(0)}°C
          </text>
        )}

        {/* Flame — SVG custom shape */}
        <g style={{ filter: flameGlow }}>
          {/* Outer flame */}
          <path
            d={`M ${CX} 38
              C ${CX - 20} 22, ${CX - 14} 10, ${CX} 4
              C ${CX + 4} 10, ${CX - 4} 16, ${CX + 8} 8
              C ${CX + 22} 18, ${CX + 18} 32, ${CX} 38 Z`}
            fill={isRunning ? '#f97316' : '#1e3a5f'}
            opacity={0.9}
          />
          {/* Inner flame core */}
          <path
            d={`M ${CX} 35
              C ${CX - 10} 24, ${CX - 6} 16, ${CX} 12
              C ${CX + 6} 16, ${CX + 8} 24, ${CX} 35 Z`}
            fill={isRunning ? '#fbbf24' : '#1e2938'}
            opacity={0.95}
          />
          {/* Flame tip */}
          {isRunning && (
            <circle cx={CX} cy={10} r={3}
              fill="#fff"
              opacity={0.7}>
              <animate attributeName="r" values="3;4.5;3" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* Status strip */}
        <rect x={8} y={H + 4} width={W - 16} height={13} rx={3}
          fill={isRunning ? 'rgba(249,115,22,0.1)' : 'rgba(71,85,105,0.15)'}
          stroke={runColor} strokeWidth="1" />
        <text x={CX} y={H + 13.5}
          textAnchor="middle" fill={runColor}
          fontSize="8" fontWeight="700" fontFamily="inherit">
          {!hasRuntime ? '—' : isRunning ? t('kpi.running') : t('kpi.standby')}
        </text>
      </svg>

      <div style={{
        textAlign:     'center',
        fontSize:       9,
        fontWeight:     700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop:     -2,
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
