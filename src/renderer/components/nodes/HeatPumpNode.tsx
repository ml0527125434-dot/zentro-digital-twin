import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 160, H = 110;

export function HeatPumpNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const runtime  = viewModel.liveValues['runtime'];
  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);
  const temp     = viewModel.liveValues['temp'] ?? viewModel.liveValues['temperature'] ?? null;
  const tempNum  = typeof temp === 'number' ? temp : null;
  const cop      = viewModel.liveValues['cop'] ?? null;

  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = viewModel.health === HealthState.Critical;
  const isLive     = sensorPres.cssVar === '--sensor-live';

  const borderColor =
    viewModel.health === HealthState.Critical  ? '#ef4444' :
    viewModel.health === HealthState.Warning   ? '#f59e0b' :
    viewModel.health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const hotColor   = isRunning ? '#f97316' : '#1e3a5f';
  const coldColor  = '#38bdf8';
  const runColor   = isRunning ? '#22c55e' : '#4a5568';
  const tempColor  = tempNum !== null
    ? tempNum > 60 ? '#ef4444' : tempNum > 50 ? '#f97316' : tempNum > 40 ? '#fb923c' : '#38bdf8'
    : '#4a5568';

  // Heat exchanger plate positions
  const plates = [38, 48, 58, 68, 78, 88, 98, 108, 118];

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />

      <Handle type="source" position={Position.Right} id="out"       style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="heat_out_2" style={{ top: '65%' }} />

      <svg width={W} height={H + 22} viewBox={`0 0 ${W} ${H + 22}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`hp-bg-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor={isRunning ? 'rgba(249,115,22,0.08)' : '#0a0e17'} />
            <stop offset="50%" stopColor="#131825" />
            <stop offset="100%" stopColor={isRunning ? 'rgba(56,189,248,0.05)' : '#0a0e17'} />
          </linearGradient>
        </defs>

        {/* Main housing */}
        <rect x={2} y={8} width={W - 4} height={H - 8}
          rx={6} fill={`url(#hp-bg-${id})`}
          stroke={borderColor} strokeWidth="1.5" />

        {/* Cold side label */}
        <text x={16} y={24} fill={coldColor} fontSize="7" fontWeight="800"
          fontFamily="inherit" opacity="0.8">COLD</text>
        <line x1={6} y1={28} x2={32} y2={28}
          stroke={coldColor} strokeWidth="2" opacity="0.6" />
        <line x1={6} y1={H - 12} x2={32} y2={H - 12}
          stroke={coldColor} strokeWidth="2" opacity="0.6" />

        {/* Hot side label */}
        <text x={W - 16} y={24} fill={hotColor} fontSize="7" fontWeight="800"
          fontFamily="inherit" textAnchor="end" opacity="0.8">HOT</text>
        <line x1={W - 32} y1={28} x2={W - 6} y2={28}
          stroke={hotColor} strokeWidth="2" opacity="0.6" />
        <line x1={W - 32} y1={H - 12} x2={W - 6} y2={H - 12}
          stroke={hotColor} strokeWidth="2" opacity="0.6" />

        {/* Heat exchanger plates */}
        {plates.map((x, i) => (
          <line key={i}
            x1={x} y1={14} x2={x} y2={H - 4}
            stroke={isRunning && i % 2 === 0 ? hotColor : i % 2 === 1 ? coldColor : '#1e2938'}
            strokeWidth="2"
            opacity={isRunning ? 0.55 : 0.25}
          />
        ))}

        {/* Compressor circle (center) */}
        <circle cx={W / 2} cy={H / 2}
          r={22} fill="#0a0e17"
          stroke={isRunning ? '#f97316' : '#1e2938'}
          strokeWidth="1.5"
          style={isRunning ? { filter: 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' } : {}}
        />

        {/* Compressor rotating symbol */}
        <g style={{
          transformOrigin: `${W / 2}px ${H / 2}px`,
          animation: isRunning ? 'impellerSpin 2s linear infinite' : 'none',
        }}>
          {[0, 120, 240].map(angle => (
            <g key={angle} style={{
              transformOrigin: `${W / 2}px ${H / 2}px`,
              transform: `rotate(${angle}deg)`,
            }}>
              <ellipse
                cx={W / 2 + 12} cy={H / 2}
                rx={7} ry={4}
                fill={isRunning ? '#f97316' : '#1e3a5f'}
                opacity={0.8}
              />
            </g>
          ))}
        </g>
        <circle cx={W / 2} cy={H / 2} r={5}
          fill={isRunning ? '#f97316' : '#1e3a5f'}
          style={isRunning ? { filter: 'drop-shadow(0 0 4px #f97316)' } : {}} />

        {/* Temperature readout */}
        {tempNum !== null && (
          <>
            <text x={W / 2} y={H - 18}
              textAnchor="middle" fill={tempColor}
              fontSize="13" fontWeight="800" fontFamily="inherit"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
              {tempNum.toFixed(0)}°C
            </text>
          </>
        )}

        {/* COP value (top right) */}
        {cop !== null && typeof cop === 'number' && (
          <text x={W - 10} y={H - 4}
            textAnchor="end" fill="#a78bfa"
            fontSize="8" fontWeight="700" fontFamily="inherit">
            COP {cop.toFixed(1)}
          </text>
        )}

        {/* Status bar */}
        <rect x={2} y={H + 2} width={W - 4} height={14} rx={4}
          fill={isRunning ? 'rgba(34,197,94,0.1)' : 'rgba(71,85,105,0.2)'}
          stroke={runColor} strokeWidth="1" />
        <text x={W / 2} y={H + 12}
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
