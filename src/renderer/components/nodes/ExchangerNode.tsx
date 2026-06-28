import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

const W = 150, H = 110;

export function ExchangerNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues } = viewModel;

  const isSolar    = typeId === 'solar_collector';
  const isPHE      = typeId === 'plate_heat_exchanger';

  const tempSlot   = isSolar ? 'temp' : 'temp_primary_out';
  const rawValue   = liveValues?.[tempSlot] ?? liveValues?.['temp'] ?? null;
  const value      = typeof rawValue === 'number' ? rawValue : null;
  const isActive   = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : value !== null && value > 30;

  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const valueColor = statusPres ? `var(${statusPres.cssVar})` : '#f97316';
  const alarmCount = viewModel.activeAlarms.length;
  const isCritical = health === HealthState.Critical;

  const borderColor =
    health === HealthState.Critical  ? '#ef4444' :
    health === HealthState.Warning   ? '#f59e0b' :
    health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const hotC  = isActive ? '#f97316' : '#1e3a5f';
  const coldC = '#38bdf8';
  const CX = W / 2, CY = H / 2;

  // Plate positions for heat exchanger
  const plates = [42, 54, 66, 78, 90, 102];

  return (
    <div style={{
      position:  'relative',
      width:     W,
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />

      {isSolar ? (
        <>
          <Handle type="target" position={Position.Bottom} id="cold_in"
            style={{ left: '35%', background: '#38bdf8', width: 8, height: 8 }} />
          <Handle type="source" position={Position.Bottom} id="hot_out"
            style={{ left: '65%', background: '#f97316', width: 8, height: 8 }} />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left}   id="primary_in"
            style={{ top: '35%', background: coldC, width: 8, height: 8, borderRadius: 2 }} />
          <Handle type="source" position={Position.Right}  id="primary_out"
            style={{ top: '35%', background: hotC, width: 8, height: 8, borderRadius: 2 }} />
          <Handle type="target" position={Position.Left}   id="secondary_in"
            style={{ top: '65%', background: hotC, width: 8, height: 8, borderRadius: 2 }} />
          <Handle type="source" position={Position.Right}  id="secondary_out"
            style={{ top: '65%', background: coldC, width: 8, height: 8, borderRadius: 2 }} />
        </>
      )}

      <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`}
        style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`exch-bg-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={coldC} stopOpacity="0.08" />
            <stop offset="50%"  stopColor="#131825" />
            <stop offset="100%" stopColor={hotC}  stopOpacity={isActive ? '0.12' : '0.04'} />
          </linearGradient>
        </defs>

        {isSolar ? (
          /* ── Solar collector: grid of tubes ── */
          <>
            {/* Frame */}
            <rect x={4} y={6} width={W - 8} height={H - 6} rx={5}
              fill="#0a0e17" stroke={isActive ? '#fbbf24' : borderColor} strokeWidth="1.5" />
            {/* Sun glow */}
            {isActive && (
              <circle cx={CX} cy={CY - 15} r={20} fill="#fbbf24" opacity="0.06">
                <animate attributeName="r" values="18;24;18" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.06;0.12;0.06" dur="2.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Collector tubes */}
            {[20, 36, 52, 68, 84, 100, 116, 132].map(x => (
              <rect key={x} x={x} y={14} width={8} height={H - 20} rx={4}
                fill={isActive ? '#fbbf24' : '#1e2938'}
                opacity={isActive ? 0.7 : 0.3} />
            ))}
            {/* Header pipes */}
            <rect x={12} y={14} width={W - 24} height={8} rx={4}
              fill={coldC} opacity={0.6} />
            <rect x={12} y={H - 14} width={W - 24} height={8} rx={4}
              fill={isActive ? '#f97316' : coldC} opacity={0.6} />
            {/* Sun icon */}
            {isSolar && (
              <text x={CX} y={CY + 12}
                textAnchor="middle" fontSize="28" opacity={isActive ? 0.8 : 0.2}
                fill="#fbbf24" fontFamily="inherit"
                style={{ filter: isActive ? 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' : 'none' }}>
                ☀
              </text>
            )}
          </>
        ) : (
          /* ── Plate heat exchanger ── */
          <>
            {/* Housing */}
            <rect x={2} y={8} width={W - 4} height={H - 8} rx={6}
              fill={`url(#exch-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />

            {/* Flow arrows — hot side top */}
            <path d={`M 2,${H * 0.3} L 36,${H * 0.3}`}
              stroke={coldC} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <polygon points={`36,${H * 0.3 - 3.5} 42,${H * 0.3} 36,${H * 0.3 + 3.5}`}
              fill={coldC} opacity="0.7" />

            <path d={`M ${W - 2},${H * 0.3} L ${W - 36},${H * 0.3}`}
              stroke={hotC} strokeWidth="2" strokeLinecap="round"
              opacity={isActive ? 0.85 : 0.3} />
            <polygon points={`${W - 36},${H * 0.3 - 3.5} ${W - 42},${H * 0.3} ${W - 36},${H * 0.3 + 3.5}`}
              fill={hotC} opacity={isActive ? 0.85 : 0.3} />

            {/* Flow arrows — cold side bottom */}
            <path d={`M 2,${H * 0.7} L 36,${H * 0.7}`}
              stroke={hotC} strokeWidth="2" strokeLinecap="round"
              opacity={isActive ? 0.7 : 0.25} />
            <polygon points={`36,${H * 0.7 - 3.5} 42,${H * 0.7} 36,${H * 0.7 + 3.5}`}
              fill={hotC} opacity={isActive ? 0.7 : 0.25} />

            <path d={`M ${W - 2},${H * 0.7} L ${W - 36},${H * 0.7}`}
              stroke={coldC} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <polygon points={`${W - 36},${H * 0.7 - 3.5} ${W - 42},${H * 0.7} ${W - 36},${H * 0.7 + 3.5}`}
              fill={coldC} opacity="0.7" />

            {/* Plates */}
            {plates.map((x, i) => (
              <rect key={x} x={x} y={14} width={7} height={H - 18} rx={2}
                fill={i % 2 === 0 ? coldC : hotC}
                opacity={isActive ? (i % 2 === 0 ? 0.45 : 0.55) : 0.2} />
            ))}

            {/* PHE label */}
            <text x={CX} y={CY + 5} textAnchor="middle" fill="#1e2938"
              fontSize="10" fontWeight="900" fontFamily="inherit" letterSpacing="0.05em">
              PHE
            </text>
          </>
        )}

        {/* Temperature value */}
        {value !== null && (
          <text x={CX} y={H + 13}
            textAnchor="middle" fill={valueColor}
            fontSize="11" fontWeight="800" fontFamily="inherit"
            style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value.toFixed(1)}°C
          </text>
        )}
      </svg>

      <div style={{
        textAlign:     'center',
        fontSize:       9,
        fontWeight:     700,
        color:         'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginTop:     value !== null ? -4 : -10,
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
