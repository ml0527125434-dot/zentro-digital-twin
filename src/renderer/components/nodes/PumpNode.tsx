import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const SIZE = 120;
const CX = SIZE / 2, CY = SIZE / 2 + 4;
const OR = 52;   // outer ring radius
const TR = 46;   // track ring radius
const HR = 12;   // hub radius

function healthRingColor(health: HealthState): string {
  switch (health) {
    case HealthState.Critical:      return '#ef4444';
    case HealthState.Warning:       return '#f59e0b';
    case HealthState.Healthy:       return 'rgba(34,197,94,0.8)';
    case HealthState.Maintenance:   return '#38bdf8';
    case HealthState.Commissioning: return '#a78bfa';
    default:                        return '#1e2938';
  }
}

// One curved backward-swept blade centered at (CX, CY)
// Base: rotated per copy; shape traces from hub outward then sweeps back
const BLADE = `M ${CX},${CY}
  L ${CX + 4},${CY - HR + 2}
  Q ${CX + TR - 6},${CY - 28} ${CX + TR - 8},${CY + 8}
  Q ${CX + TR - 20},${CY + 20} ${CX + 8},${CY + 6}
  Z`;

export function PumpNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const runtime  = viewModel.liveValues['runtime'];
  const flowRate = viewModel.liveValues['flow'];
  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);

  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = viewModel.health === HealthState.Critical;
  const isLive     = sensorPres.cssVar === '--sensor-live';

  const ringColor  = healthRingColor(viewModel.health);
  const runColor   = isRunning ? '#22c55e' : '#4a5568';
  const accentColor = isRunning ? '#0ea5e9' : '#1e3a5f';

  // Speed indicator arc: circumference of TR circle = 2π*46 ≈ 289
  const circ     = 2 * Math.PI * TR;
  const arcFill  = isRunning ? circ * 0.78 : circ * 0.15;

  // How long per rotation
  const spinDur = typeof runtime === 'number' && runtime > 0
    ? Math.max(0.5, 2 - runtime * 0.015) + 's'
    : '1.4s';

  return (
    <div style={{
      position:  'relative',
      width:     SIZE,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      <Handle type="target" position={Position.Left}  id="in"  style={{ top: '48%' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ top: '48%' }} />

      <svg width={SIZE} height={SIZE + 20} viewBox={`0 0 ${SIZE} ${SIZE + 20}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`pump-bg-${id}`} cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#1a2236" />
            <stop offset="100%" stopColor="#0a0e17" />
          </radialGradient>
        </defs>

        {/* Outer border ring */}
        <circle cx={CX} cy={CY} r={OR + 2}
          fill="none" stroke={ringColor} strokeWidth="2" />

        {/* Main circle body */}
        <circle cx={CX} cy={CY} r={OR}
          fill={`url(#pump-bg-${id})`} />

        {/* Speed indicator track */}
        <circle cx={CX} cy={CY} r={TR}
          fill="none"
          stroke="#1e2938"
          strokeWidth="5"
          strokeDasharray={`${circ * 0.88} ${circ}`}
          style={{ transform: `rotate(-154deg)`, transformOrigin: `${CX}px ${CY}px` }}
        />

        {/* Speed indicator fill */}
        <circle cx={CX} cy={CY} r={TR}
          fill="none"
          stroke={runColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${arcFill} ${circ}`}
          style={{
            transform: `rotate(-154deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'stroke-dasharray 0.8s ease',
          }}
        />

        {/* Spinning impeller group */}
        <g style={{
          transformOrigin: `${CX}px ${CY}px`,
          animation: isRunning ? `impellerSpin ${spinDur} linear infinite` : 'none',
        }}>
          {/* 4 backward-swept blades */}
          {[0, 90, 180, 270].map(angle => (
            <g key={angle} style={{
              transformOrigin: `${CX}px ${CY}px`,
              transform: `rotate(${angle}deg)`,
            }}>
              <path d={BLADE} fill={accentColor} opacity={0.85} />
            </g>
          ))}
        </g>

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={HR}
          fill={isRunning ? '#0ea5e9' : '#1e3a5f'}
          stroke="#0a0e17"
          strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={4}
          fill="#0a0e17" opacity={0.7} />

        {/* Running state label */}
        <text x={CX} y={CY + OR + 14}
          textAnchor="middle" fill={runColor}
          fontSize="9" fontWeight="700" fontFamily="inherit">
          {!hasRuntime ? '—' : isRunning ? t('pump.running') : t('pump.standby')}
        </text>

        {/* Flow rate below state */}
        {flowRate !== null && flowRate !== undefined && (
          <text x={CX} y={CY + OR + 24}
            textAnchor="middle" fill="#4a5568"
            fontSize="8" fontFamily="inherit">
            {typeof flowRate === 'number' ? flowRate.toFixed(1) : String(flowRate)} {t('pump.flow_unit')}
          </text>
        )}
      </svg>

      {/* Component name */}
      <div style={{
        textAlign:     'center',
        fontSize:       9,
        fontWeight:     700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop:     -4,
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
