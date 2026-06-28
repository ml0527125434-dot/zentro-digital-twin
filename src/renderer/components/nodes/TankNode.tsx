import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 110, SVG_H = 160;

function tempFillPct(t: number) {
  return Math.max(5, Math.min(92, ((t - 20) / 65) * 100));
}

function tempFillColor(t: number): string {
  if (t < 38) return '#38bdf8';
  if (t < 50) return '#fb923c';
  if (t < 62) return '#f97316';
  return '#ef4444';
}

function healthBorderColor(health: HealthState): string {
  switch (health) {
    case HealthState.Critical:      return '#ef4444';
    case HealthState.Warning:       return '#f59e0b';
    case HealthState.Healthy:       return 'rgba(34,197,94,0.7)';
    case HealthState.Maintenance:   return '#38bdf8';
    case HealthState.Commissioning: return '#a78bfa';
    default:                        return '#1e2938';
  }
}

export function TankNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp     = viewModel.liveValues['temp'] ?? null;
  const tempNum  = typeof temp === 'number' ? temp : null;
  const alarmCount = viewModel.activeAlarms.length;

  const fillPct   = tempNum !== null ? tempFillPct(tempNum) : 18;
  const fillColor = tempNum !== null ? tempFillColor(tempNum) : '#1e3a5f';

  const borderColor = healthBorderColor(viewModel.health);
  const tempColor   = tempNum !== null ? tempFillColor(tempNum) : '#4a5568';
  const isCritical  = viewModel.health === HealthState.Critical;
  const isLive      = sensorPres.cssVar === '--sensor-live';

  // Cylinder geometry
  const CX = W / 2;            // 55
  const RX = 44, RY = 11;
  const TOP = 18, BOT = 140;
  const bodyH = BOT - TOP;
  const fillH = (fillPct / 100) * bodyH;
  const fillY = BOT - fillH;

  const clipId = `tank-fill-${id}`;

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? `drop-shadow(0 0 6px #ef4444)` : 'none',
    }}>
      <AlarmBadge count={alarmCount} />

      <Handle type="target" position={Position.Bottom} id="cold_in"   />
      <Handle type="target" position={Position.Left}   id="heat_in_1" />
      <Handle type="target" position={Position.Left}   id="heat_in_2" style={{ top: '68%' }} />
      <Handle type="target" position={Position.Right}  id="recirc_in" />
      <Handle type="source" position={Position.Top}    id="hot_out"   />

      <svg
        width={W}
        height={SVG_H}
        viewBox={`0 0 ${W} ${SVG_H}`}
        overflow="visible"
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={CX - RX} y={fillY} width={RX * 2} height={fillH + RY} />
          </clipPath>
          <linearGradient id={`tank-body-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0d1117" />
            <stop offset="30%"  stopColor="#131825" />
            <stop offset="70%"  stopColor="#131825" />
            <stop offset="100%" stopColor="#0d1117" />
          </linearGradient>
          <linearGradient id={`tank-fill-grad-${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor={fillColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Cylinder body background */}
        <rect
          x={CX - RX} y={TOP}
          width={RX * 2} height={bodyH}
          fill={`url(#tank-body-${id})`}
          stroke="none"
        />

        {/* Thermal liquid fill */}
        {fillH > 2 && (
          <rect
            x={CX - RX + 1} y={fillY}
            width={RX * 2 - 2} height={fillH}
            fill={`url(#tank-fill-grad-${id})`}
            clipPath={`url(#${clipId})`}
          />
        )}

        {/* Liquid surface ellipse */}
        {fillH > 6 && (
          <ellipse cx={CX} cy={fillY} rx={RX - 1} ry={RY - 2}
            fill={fillColor} opacity={0.9} />
        )}

        {/* Bottom cap (base) */}
        <ellipse cx={CX} cy={BOT} rx={RX} ry={RY}
          fill="#0d1117" stroke={borderColor} strokeWidth="1.5" />

        {/* Side walls */}
        <line x1={CX - RX} y1={TOP} x2={CX - RX} y2={BOT}
          stroke={borderColor} strokeWidth="1.5" />
        <line x1={CX + RX} y1={TOP} x2={CX + RX} y2={BOT}
          stroke={borderColor} strokeWidth="1.5" />

        {/* Level tick marks (right side) */}
        {[25, 50, 75].map(pct => {
          const ty = TOP + bodyH * (1 - pct / 100);
          return (
            <g key={pct}>
              <line x1={CX + RX - 8} y1={ty} x2={CX + RX} y2={ty}
                stroke={borderColor} strokeWidth="1" opacity="0.7" />
              <text x={CX + RX - 11} y={ty + 3} textAnchor="end"
                fill="#4a5568" fontSize="6" fontFamily="inherit">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Top cap */}
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY}
          fill="#131825" stroke={borderColor} strokeWidth="1.5" />

        {/* Nozzle on top cap */}
        <rect x={CX - 5} y={TOP - 9} width={10} height={10}
          fill="#131825" stroke={borderColor} strokeWidth="1.5" rx="2" />

        {/* Temperature display */}
        <text x={CX} y={TOP + bodyH * 0.45 + 10}
          textAnchor="middle" fill={tempColor}
          fontSize="22" fontWeight="800" fontFamily="inherit"
          style={{ fontVariantNumeric: 'tabular-nums' }}>
          {tempNum !== null ? `${tempNum.toFixed(0)}°` : '—'}
        </text>
        <text x={CX} y={TOP + bodyH * 0.45 + 24}
          textAnchor="middle" fill="#4a5568" fontSize="8" fontFamily="inherit">
          {t('unit.temperature')}
        </text>

        {/* Live status dot */}
        <circle cx={CX} cy={TOP + bodyH * 0.75}
          r={4}
          fill={`var(${sensorPres.cssVar})`}
          opacity={0.9}
          className={isLive ? 'zentro-node__dot--blink' : ''}>
          {isLive && (
            <animate attributeName="opacity" values="1;0.3;1"
              dur="1.2s" repeatCount="indefinite" />
          )}
        </circle>
      </svg>

      {/* Component label */}
      <div style={{
        textAlign:     'center',
        fontSize:       9,
        fontWeight:     700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
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
