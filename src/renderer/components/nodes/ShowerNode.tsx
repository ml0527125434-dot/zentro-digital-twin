import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 100, H = 100;

export function ShowerNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp    = viewModel.liveValues['temperature'] ?? viewModel.liveValues['temp'] ?? null;
  const tempNum = typeof temp === 'number' ? temp : null;
  const isTap   = typeId === 'tap';

  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = viewModel.health === HealthState.Critical;

  const dropColor =
    tempNum !== null && tempNum > 55 ? '#ef4444' :
    tempNum !== null && tempNum > 45 ? '#f97316' :
    tempNum !== null && tempNum > 35 ? '#fb923c' :
    '#38bdf8';

  const borderColor =
    viewModel.health === HealthState.Critical  ? '#ef4444' :
    viewModel.health === HealthState.Warning   ? '#f59e0b' :
    viewModel.health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const CX = W / 2;

  // Animated water drops — stagger via animation-delay
  const drops = [
    { x: CX - 16, delay: '0s' },
    { x: CX,      delay: '0.25s' },
    { x: CX + 16, delay: '0.5s' },
  ];

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      <Handle type="target" position={Position.Left}  id="hot_in"    style={{ top: '40%' }} />
      <Handle type="source" position={Position.Right} id="drain_out" style={{ top: '40%' }} />

      <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`}
        style={{ display: 'block', overflow: 'visible' }}>

        {/* Background circle */}
        <circle cx={CX} cy={H / 2} r={44}
          fill="#0a0e17" stroke={borderColor} strokeWidth="1.5" />

        {/* Showerhead / tap icon */}
        {isTap ? (
          /* Tap faucet shape */
          <g fill="none" stroke={dropColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
            <path d={`M ${CX - 16},30 L ${CX + 16},30`} />
            <path d={`M ${CX + 16},30 Q ${CX + 28},30 ${CX + 28},42`} />
            <path d={`M ${CX + 20},42 L ${CX + 36},42`} />
            <path d={`M ${CX + 28},42 L ${CX + 28},50`} />
          </g>
        ) : (
          /* Shower head */
          <g>
            <rect x={CX - 18} y={16} width={36} height={10} rx={3}
              fill="#131825" stroke={dropColor} strokeWidth="1.5" opacity="0.9" />
            <line x1={CX - 18} y1={14} x2={CX - 22} y2={8}
              stroke={dropColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            <line x1={CX - 22} y1={8} x2={CX - 30} y2={8}
              stroke={dropColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
            {/* Spray holes */}
            {[-12, -6, 0, 6, 12].map(dx => (
              <circle key={dx} cx={CX + dx} cy={21} r={1.5}
                fill={dropColor} opacity="0.8" />
            ))}
          </g>
        )}

        {/* Water drops — animated fall */}
        {drops.map((d, i) => (
          <ellipse key={i}
            cx={d.x} cy={50} rx={2.5} ry={4}
            fill={dropColor} opacity="0.85"
            style={{
              animation: `dropFall 1.2s ease-in infinite`,
              animationDelay: d.delay,
            }}
          />
        ))}

        {/* Temperature readout */}
        <text x={CX} y={80}
          textAnchor="middle"
          fill={tempNum !== null ? dropColor : '#4a5568'}
          fontSize={tempNum !== null ? '16' : '12'}
          fontWeight="800"
          fontFamily="inherit"
          style={{ fontVariantNumeric: 'tabular-nums' }}>
          {tempNum !== null ? `${tempNum.toFixed(0)}°C` : '—'}
        </text>

        {/* Name */}
        <text x={CX} y={H + 14}
          textAnchor="middle" fill="#4a5568"
          fontSize="8" fontWeight="700" fontFamily="inherit"
          style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {name.length > 12 ? name.slice(0, 11) + '…' : name}
        </text>
      </svg>
    </div>
  );
}
