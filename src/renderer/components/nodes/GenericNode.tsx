import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

// ── Expansion Vessel ─────────────────────────────────────────────────────────

function ExpansionVesselSVG({ id, borderColor, pressure, pressColor }: {
  id: string; borderColor: string; pressure: number | null; pressColor: string;
}) {
  const W = 100, H = 110;
  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id={`ev-bg-${id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor="#1a2a4a" />
          <stop offset="100%" stopColor="#080c12" />
        </radialGradient>
      </defs>

      {/* Vessel body — round-ended cylinder */}
      <rect x={18} y={10} width={64} height={80} rx={6}
        fill={`url(#ev-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />
      {/* Top dome */}
      <ellipse cx={50} cy={10} rx={32} ry={8} fill="#0f1621" stroke={borderColor} strokeWidth="1.5" />
      {/* Bottom dome */}
      <ellipse cx={50} cy={90} rx={32} ry={8} fill="#0a0e17" stroke={borderColor} strokeWidth="1.5" />

      {/* Diaphragm line */}
      <line x1={18} y1={50} x2={82} y2={50}
        stroke="#4a5568" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />

      {/* Air side label (top) */}
      <text x={50} y={35} textAnchor="middle" fill="#4a5568" fontSize="8" fontWeight="700" fontFamily="inherit">
        AIR
      </text>
      {/* Bubble in air side */}
      <circle cx={43} cy={28} r={4} fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.4" />
      <circle cx={56} cy={32} r={2.5} fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.3" />

      {/* Water side (bottom) */}
      <rect x={19} y={51} width={62} height={38} rx={0}
        fill="#0d1829" opacity="0.6" />
      <text x={50} y={74} textAnchor="middle" fill="#4a5568" fontSize="8" fontWeight="700" fontFamily="inherit">
        WATER
      </text>

      {/* Bottom connection stub */}
      <rect x={44} y={89} width={12} height={12} rx={3}
        fill="#0a0e17" stroke="#4a5568" strokeWidth="1.5" />

      {/* Pressure readout */}
      <text x={50} y={H + 14} textAnchor="middle"
        fill={pressure !== null ? pressColor : '#4a5568'}
        fontSize="11" fontWeight="800" fontFamily="inherit"
        style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pressure !== null ? `${pressure.toFixed(1)} bar` : '— bar'}
      </text>
    </svg>
  );
}

// ── Filter ───────────────────────────────────────────────────────────────────

function FilterSVG({ id, borderColor, isActive }: {
  id: string; borderColor: string; isActive: boolean;
}) {
  const W = 120, H = 90;
  const meshColor = isActive ? '#38bdf8' : '#1e3a5f';
  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`flt-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d1829" />
          <stop offset="100%" stopColor="#080c12" />
        </linearGradient>
      </defs>

      {/* Housing */}
      <rect x={4} y={14} width={W - 8} height={H - 14} rx={8}
        fill={`url(#flt-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />

      {/* Inlet + outlet pipes */}
      <rect x={0} y={36} width={14} height={10} rx={2}
        fill="#1e2938" stroke={borderColor} strokeWidth="1" />
      <rect x={W - 14} y={36} width={14} height={10} rx={2}
        fill="#1e2938" stroke={borderColor} strokeWidth="1" />

      {/* Filter mesh basket */}
      <rect x={32} y={22} width={56} height={52} rx={4}
        fill="none" stroke={meshColor} strokeWidth="1.5" opacity={isActive ? 0.8 : 0.4} />
      {/* Mesh vertical lines */}
      {[40, 48, 56, 64, 72, 80].map(x => (
        <line key={x} x1={x} y1={22} x2={x} y2={74}
          stroke={meshColor} strokeWidth="0.8" opacity={isActive ? 0.5 : 0.2} />
      ))}
      {/* Mesh horizontal lines */}
      {[30, 38, 46, 54, 62, 70].map(y => (
        <line key={y} x1={32} y1={y} x2={88} y2={y}
          stroke={meshColor} strokeWidth="0.8" opacity={isActive ? 0.5 : 0.2} />
      ))}

      {/* Flow arrows */}
      <path d={`M 14,41 L 30,41`} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <polygon points="30,37.5 36,41 30,44.5" fill="#38bdf8" opacity="0.7" />
      <path d={`M 88,41 L ${W - 16},41`} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <polygon points={`${W-16},37.5 ${W-10},41 ${W-16},44.5`} fill="#38bdf8" opacity="0.7" />

      {/* FILTER label */}
      <text x={W / 2} y={H + 14} textAnchor="middle" fill="#4a5568"
        fontSize="8" fontWeight="700" fontFamily="inherit" letterSpacing="0.06em">
        FILTER
      </text>
    </svg>
  );
}

// ── Air Separator ─────────────────────────────────────────────────────────────

function AirSeparatorSVG({ id, borderColor, isActive }: {
  id: string; borderColor: string; isActive: boolean;
}) {
  const W = 100, H = 120;
  const airColor = '#38bdf8';
  const bubbles = [
    { cx: 38, cy: 80, r: 4,   delay: '0s' },
    { cx: 52, cy: 72, r: 5.5, delay: '0.4s' },
    { cx: 44, cy: 60, r: 3,   delay: '0.8s' },
    { cx: 58, cy: 68, r: 4,   delay: '0.6s' },
  ];
  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`as-bg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0a1520" />
          <stop offset="100%" stopColor="#080c12" />
        </linearGradient>
        <clipPath id={`as-clip-${id}`}>
          <rect x={18} y={18} width={64} height={92} rx={8} />
        </clipPath>
      </defs>

      {/* Main body */}
      <rect x={18} y={18} width={64} height={92} rx={8}
        fill={`url(#as-bg-${id})`} stroke={borderColor} strokeWidth="1.5" />

      {/* Water fill bottom */}
      <rect x={19} y={72} width={62} height={37} rx={0}
        fill="#0d1e30" clipPath={`url(#as-clip-${id})`} opacity="0.7" />

      {/* Bubbles rising */}
      {bubbles.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r}
          fill="none" stroke={airColor} strokeWidth="1.2"
          opacity={isActive ? 0.7 : 0.3}
          style={isActive ? {
            animation: `emptyPulse 1.8s ease-in-out infinite`,
            animationDelay: b.delay,
          } : undefined} />
      ))}

      {/* Vent pipe top */}
      <rect x={44} y={6} width={12} height={14} rx={3}
        fill="#0a0e17" stroke={airColor} strokeWidth="1.2" opacity="0.7" />
      {/* Up arrow */}
      <path d="M 50,5 L 50,0 M 47,2.5 L 50,0 L 53,2.5"
        stroke={airColor} strokeWidth="1.2" fill="none" opacity="0.8" strokeLinecap="round" />

      {/* Inlet/outlet pipes (left/right) */}
      <rect x={0}  y={60} width={20} height={10} rx={2}
        fill="#1e2938" stroke={borderColor} strokeWidth="1" />
      <rect x={80} y={60} width={20} height={10} rx={2}
        fill="#1e2938" stroke={borderColor} strokeWidth="1" />

      {/* AIR SEP label */}
      <text x={W / 2} y={H + 14} textAnchor="middle" fill="#4a5568"
        fontSize="8" fontWeight="700" fontFamily="inherit" letterSpacing="0.06em">
        AIR SEP
      </text>
    </svg>
  );
}

// ── Distribution Manifold ────────────────────────────────────────────────────

function ManifoldSVG({ id, borderColor, isActive }: {
  id: string; borderColor: string; isActive: boolean;
}) {
  const W = 160, H = 130;
  const hotC  = isActive ? '#f97316' : '#1e3a5f';
  const coldC = '#38bdf8';
  const zones  = [38, 72, 106];

  return (
    <svg width={W} height={H + 20} viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`mfld-h-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={coldC} stopOpacity="0.15" />
          <stop offset="100%" stopColor={hotC}  stopOpacity={isActive ? '0.2' : '0.06'} />
        </linearGradient>
      </defs>

      {/* Supply header pipe (top) */}
      <rect x={8} y={20} width={W - 16} height={18} rx={6}
        fill={`url(#mfld-h-${id})`} stroke={hotC} strokeWidth="1.5"
        opacity={isActive ? 0.9 : 0.5} />
      <text x={W / 2} y={32} textAnchor="middle" fill={hotC}
        fontSize="7" fontWeight="800" fontFamily="inherit" letterSpacing="0.08em"
        opacity={isActive ? 0.9 : 0.5}>
        SUPPLY
      </text>

      {/* Return header pipe (bottom) */}
      <rect x={8} y={98} width={W - 16} height={18} rx={6}
        fill="none" stroke={coldC} strokeWidth="1.5" opacity="0.6" />
      <text x={W / 2} y={110} textAnchor="middle" fill={coldC}
        fontSize="7" fontWeight="800" fontFamily="inherit" letterSpacing="0.08em" opacity="0.6">
        RETURN
      </text>

      {/* Zone drop pipes */}
      {zones.map((x, i) => (
        <g key={i}>
          {/* Supply drop */}
          <line x1={x} y1={38} x2={x} y2={70}
            stroke={hotC} strokeWidth="4" strokeLinecap="round"
            opacity={isActive ? 0.75 : 0.3} />
          {/* Return riser */}
          <line x1={x + 18} y1={70} x2={x + 18} y2={98}
            stroke={coldC} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
          {/* Zone label */}
          <text x={x + 9} y={86} textAnchor="middle" fill="#4a5568"
            fontSize="7" fontWeight="700" fontFamily="inherit">
            Z{i + 1}
          </text>
          {/* Zone outlet nozzle */}
          <rect x={x - 2} y={64} width={8} height={8} rx={2}
            fill={hotC} opacity={isActive ? 0.6 : 0.2} />
          <rect x={x + 14} y={64} width={8} height={8} rx={2}
            fill={coldC} opacity="0.4" />
        </g>
      ))}

      {/* Supply inlet arrow (left) */}
      <path d={`M 0,29 L 8,29`} stroke={hotC} strokeWidth="2.5" strokeLinecap="round"
        opacity={isActive ? 0.9 : 0.4} />
      {/* Return outlet arrow (top, from return header left) */}
      <path d={`M 0,107 L 8,107`} stroke={coldC} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

      {/* MANIFOLD label */}
      <text x={W / 2} y={H + 14} textAnchor="middle" fill="#4a5568"
        fontSize="8" fontWeight="700" fontFamily="inherit" letterSpacing="0.06em">
        MANIFOLD
      </text>
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GenericNode({ id, data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const { health, operationalStatus, liveValues, activeAlarms, sensorState } = viewModel;

  const statusPres  = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres  = sensorStatePresentation(sensorState);

  const pressure  = typeof liveValues?.['pressure'] === 'number' ? liveValues.pressure : null;
  const temp      = typeof liveValues?.['temp']     === 'number' ? liveValues.temp
                  : typeof liveValues?.['temperature'] === 'number' ? liveValues.temperature : null;
  const alarmCount = activeAlarms.length;
  const isCritical = health === HealthState.Critical;

  const isActive = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : typeof liveValues?.['runtime'] === 'number' ? liveValues.runtime > 0
    : (temp !== null && temp > 30) || (pressure !== null);

  const borderColor =
    health === HealthState.Critical  ? '#ef4444' :
    health === HealthState.Warning   ? '#f59e0b' :
    health === HealthState.Healthy   ? 'rgba(34,197,94,0.6)' :
    '#1e2938';

  const valColor = statusPres ? `var(${statusPres.cssVar})` : '#38bdf8';

  // Port handles per type
  const renderHandles = () => {
    switch (typeId) {
      case 'filter':
        return (
          <>
            <Handle type="target" position={Position.Left}  id="in"  style={{ top: '46%' }} />
            <Handle type="source" position={Position.Right} id="out" style={{ top: '46%' }} />
          </>
        );
      case 'air_separator':
        return (
          <>
            <Handle type="target" position={Position.Left}  id="in"   style={{ top: '55%' }} />
            <Handle type="source" position={Position.Right} id="out"  style={{ top: '55%' }} />
            <Handle type="source" position={Position.Top}   id="vent" style={{ left: '50%' }} />
          </>
        );
      case 'expansion_vessel':
        return <Handle type="target" position={Position.Bottom} id="connect" />;
      case 'distribution_manifold':
        return (
          <>
            <Handle type="target" position={Position.Left} id="supply_in"  style={{ top: '20%' }} />
            <Handle type="target" position={Position.Left} id="return_in"  style={{ top: '78%' }} />
            <Handle type="source" position={Position.Right} id="zone_1_out" style={{ top: '35%' }} />
            <Handle type="source" position={Position.Right} id="zone_2_out" style={{ top: '55%' }} />
            <Handle type="source" position={Position.Right} id="zone_3_out" style={{ top: '75%' }} />
          </>
        );
      default:
        return (
          <>
            <Handle type="target" position={Position.Left}  id="in" />
            <Handle type="source" position={Position.Right} id="out" />
          </>
        );
    }
  };

  const renderBody = () => {
    switch (typeId) {
      case 'expansion_vessel':
        return <ExpansionVesselSVG id={id} borderColor={borderColor}
                 pressure={pressure} pressColor={valColor} />;
      case 'filter':
        return <FilterSVG id={id} borderColor={borderColor} isActive={isActive} />;
      case 'air_separator':
        return <AirSeparatorSVG id={id} borderColor={borderColor} isActive={isActive} />;
      case 'distribution_manifold':
        return <ManifoldSVG id={id} borderColor={borderColor} isActive={isActive} />;
      default:
        return (
          <svg width={100} height={80} viewBox="0 0 100 80" style={{ display: 'block' }}>
            <rect x={4} y={8} width={92} height={60} rx={8}
              fill="#0a0e17" stroke={borderColor} strokeWidth="1.5" />
            <text x={50} y={45} textAnchor="middle" fill="#4a5568"
              fontSize="10" fontWeight="700" fontFamily="inherit">
              {typeId.replace(/_/g, ' ').toUpperCase()}
            </text>
          </svg>
        );
    }
  };

  return (
    <div style={{
      position:  'relative',
      animation: isCritical ? 'nodeAlarmPulse 1.8s ease-in-out infinite' : 'none',
      filter:    isCritical ? 'drop-shadow(0 0 6px #ef4444)' : 'none',
    }}>
      <AlarmBadge count={alarmCount} />
      {renderHandles()}
      {renderBody()}
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
