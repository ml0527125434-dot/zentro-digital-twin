import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 140, H = 100;

export function ElectricHeaterNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const { health, operationalStatus, liveValues } = viewModel;

  const isRunning = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : typeof liveValues?.['runtime'] === 'number'
      ? liveValues.runtime > 0
      : false;

  const temp       = typeof liveValues?.['temp'] === 'number' ? liveValues.temp : null;
  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const tempColor  = statusPres ? `var(${statusPres.cssVar})`
    : temp !== null ? (temp > 65 ? '#ef4444' : temp > 50 ? '#f97316' : '#fb923c')
    : '#4a5568';
  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = health === HealthState.Critical;

  const borderColor =
    health === HealthState.Critical  ? '#ef4444' :
    health === HealthState.Warning   ? '#f59e0b' :
    health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const elemColor  = isRunning ? '#fbbf24' : '#1e3a5f';
  const elemGlow   = isRunning ? 'drop-shadow(0 0 6px rgba(251,191,36,0.7))' : 'none';
  const runColor   = isRunning ? '#fbbf24' : '#4a5568';
  const CX = W / 2;

  // Heating element: serpentine coil positions
  const coilRows = [28, 44, 60, 76];
  const coilLeft = 22, coilRight = W - 22;

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      <Handle type="target" position={Position.Left}  id="water_in"
        style={{ top: '45%', background: '#38bdf8', width: 8, height: 8, borderRadius: 2 }} />
      <Handle type="source" position={Position.Right} id="water_out"
        style={{ top: '45%', background: '#f97316', width: 8, height: 8, borderRadius: 2 }} />

      <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`elec-bg-${id}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor={isRunning ? 'rgba(251,191,36,0.08)' : '#0d1117'} />
            <stop offset="100%" stopColor="#080c12" />
          </radialGradient>
        </defs>

        {/* Housing */}
        <rect x={2} y={8} width={W - 4} height={H - 8}
          rx={6} fill={`url(#elec-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />

        {/* Cold inlet arrow */}
        <path d={`M 2,${H * 0.4} L 18,${H * 0.4}`}
          stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        <polygon points={`18,${H * 0.4 - 4} 24,${H * 0.4} 18,${H * 0.4 + 4}`}
          fill="#38bdf8" opacity="0.7" />

        {/* Hot outlet arrow */}
        <path d={`M ${W - 24},${H * 0.4} L ${W - 2},${H * 0.4}`}
          stroke="#f97316" strokeWidth="2.5" strokeLinecap="round"
          opacity={isRunning ? 0.85 : 0.3} />

        {/* Heating elements — serpentine coil */}
        <g style={{ filter: elemGlow }}>
          {coilRows.map((y, i) => {
            const fromLeft = i % 2 === 0;
            return (
              <g key={y}>
                {/* Horizontal rod */}
                <line x1={coilLeft} y1={y} x2={coilRight} y2={y}
                  stroke={elemColor} strokeWidth="3" strokeLinecap="round"
                  opacity={0.9} />
                {/* Turn semicircle */}
                {i < coilRows.length - 1 && (
                  <path
                    d={fromLeft
                      ? `M ${coilRight},${y} A 8,8 0 0,1 ${coilRight},${coilRows[i + 1]}`
                      : `M ${coilLeft},${y} A 8,8 0 0,0 ${coilLeft},${coilRows[i + 1]}`}
                    fill="none"
                    stroke={elemColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Temperature readout */}
        {temp !== null && (
          <text x={CX} y={92}
            textAnchor="middle" fill={tempColor}
            fontSize="13" fontWeight="800" fontFamily="inherit"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {temp.toFixed(0)}°C
          </text>
        )}

        {/* Power bolt icon (center, behind coil) */}
        <text x={CX} y={60}
          textAnchor="middle"
          fontSize="20"
          opacity={isRunning ? 0.12 : 0.06}
          fill="#fbbf24"
          fontFamily="inherit">
          ⚡
        </text>

        {/* Status strip */}
        <rect x={2} y={H + 4} width={W - 4} height={13} rx={3}
          fill={isRunning ? 'rgba(251,191,36,0.08)' : 'rgba(71,85,105,0.12)'}
          stroke={runColor} strokeWidth="1" />
        <text x={CX} y={H + 13.5}
          textAnchor="middle" fill={runColor}
          fontSize="8" fontWeight="700" fontFamily="inherit">
          {isRunning ? t('kpi.running') : t('kpi.standby')}
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
