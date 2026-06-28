/**
 * BuilderPalettePanel — LEGO component shelf.
 *
 * Product design principles:
 * - Hebrew-first, no English visible to operator
 * - Large tactile cards — feel like picking up a physical brick
 * - Category tabs are bold shelf dividers, not navigation links
 * - Search is hidden by default (secondary action)
 * - Drag is the PRIMARY interaction
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ComponentRegistry } from '../../lib/component-registry.js';
import { getPaletteItems } from '../../builder/palette.js';
import { useBuilder } from '../../builder/useBuilder.js';
import { useLocale } from '../../i18n/index.js';
import { ComponentIllustration } from './ComponentIllustration.js';

// ── Hebrew component names (operator language, not engineering labels) ────────

const HE_NAME: Record<string, string> = {
  storage_tank:          'מיכל אחסון',
  buffer_tank:           'מיכל חיץ',
  expansion_vessel:      'כלי התפשטות',
  heat_pump:             'משאבת חום',
  gas_backup:            'תנור גז',
  electric_heater:       'מחמם חשמלי',
  solar_collector:       'קולט שמש',
  plate_heat_exchanger:  'מחליף חום',
  recirc_pump:           'משאבת סירקולציה',
  variable_speed_pump:   'משאבה מתכווננת',
  mixing_valve:          'שסתום ערבוב',
  control_valve:         'שסתום בקרה',
  isolation_valve:       'שסתום ניתוק',
  safety_valve:          'שסתום בטיחות',
  temperature_sensor:    'חיישן טמפרטורה',
  pressure_sensor:       'חיישן לחץ',
  flow_sensor:           'חיישן זרימה',
  energy_meter:          'מד אנרגיה',
  water_meter:           'מד מים',
  filter:                'מסנן',
  air_separator:         'מפריד אוויר',
  distribution_manifold: 'מניפולד הפצה',
  point_of_use:          'מקלחת',
  tap:                   'ברז',
};

// ── Category palette ──────────────────────────────────────────────────────────

interface CatMeta {
  icon:    string;
  heLabel: string;
  accent:  string;
  cardBg:  string;  // rich gradient start
}

const CAT: Record<string, CatMeta> = {
  source:   { icon: '♨',  heLabel: 'מקורות חום',  accent: '#fb923c', cardBg: '#3a1800' },
  storage:  { icon: '🛢', heLabel: 'אגירה',        accent: '#60a5fa', cardBg: '#001535' },
  pump:     { icon: '⚙',  heLabel: 'משאבות',       accent: '#22d3ee', cardBg: '#002030' },
  valve:    { icon: '⊛',  heLabel: 'שסתומים',      accent: '#c084fc', cardBg: '#200038' },
  sensor:   { icon: '📡', heLabel: 'חיישנים',      accent: '#4ade80', cardBg: '#001c08' },
  meter:    { icon: '📊', heLabel: 'מדים',          accent: '#facc15', cardBg: '#1e1400' },
  consumer: { icon: '🚿', heLabel: 'נקודות צריכה', accent: '#2dd4bf', cardBg: '#001e1c' },
  zone:     { icon: '🔀', heLabel: 'הפצה',          accent: '#818cf8', cardBg: '#141040' },
  air:      { icon: '💨', heLabel: 'עזר',           accent: '#94a3b8', cardBg: '#101820' },
};

const CAT_ORDER = ['source','storage','pump','valve','sensor','meter','consumer','zone','air'];

// ComponentIllustration is imported from ./ComponentIllustration.js above.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _noop_illustration_stub({ typeId, accent }: { typeId: never; accent: never }) {
  const dim  = '#0d1829';
  const dim2 = '#1e3a5f';

  switch (typeId) {

    case 'storage_tank': case 'buffer_tank':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <defs>
            <linearGradient id={`si-t-${typeId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <ellipse cx={32} cy={13} rx={22} ry={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={10} y={13} width={44} height={36} fill={`url(#si-t-${typeId})`} stroke={accent} strokeWidth="1.5" />
          <rect x={11} y={34} width={42} height={15} fill={accent} opacity="0.18" rx="1" />
          <ellipse cx={32} cy={49} rx={22} ry={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <text x={32} y={36} textAnchor="middle" fill={accent} fontSize="13" fontWeight="900">58°C</text>
          <line x1={32} y1={49} x2={32} y2={58} stroke={accent} strokeWidth="2.5" opacity="0.6" />
        </svg>
      );

    case 'expansion_vessel':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <ellipse cx={32} cy={32} rx={24} ry={27} fill={dim} stroke={accent} strokeWidth="1.5" />
          <line x1={8} y1={32} x2={56} y2={32} stroke={accent} strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" />
          <text x={32} y={26} textAnchor="middle" fill={accent} fontSize="9" opacity="0.65">אוויר</text>
          <circle cx={24} cy={20} r={4} fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
          <circle cx={38} cy={23} r={2.5} fill="none" stroke={accent} strokeWidth="1" opacity="0.3" />
          <text x={32} y={44} textAnchor="middle" fill={accent} fontSize="9" opacity="0.5">מים</text>
          <rect x={29} y={55} width={6} height={8} rx={2} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );

    case 'heat_pump':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={6} y={12} width={52} height={38} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={32} cy={31} r={11} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={32} cy={31} r={4} fill={accent} opacity="0.85" />
          <path d="M21,31 C21,24 27,21 32,21" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <path d="M43,31 C43,38 37,41 32,41" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <text x={13} y={29} fill="#f97316" fontSize="7" fontWeight="800">HOT</text>
          <text x={43} y={40} fill="#38bdf8" fontSize="7" fontWeight="800">COLD</text>
        </svg>
      );

    case 'recirc_pump': case 'variable_speed_pump':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={26} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={32} cy={32} r={7} fill={accent} opacity="0.85" />
          {[0,90,180,270].map(deg => {
            const r = deg * Math.PI / 180 + 0.4;
            const x1 = 32 + 7 * Math.cos(r - 0.4);
            const y1 = 32 + 7 * Math.sin(r - 0.4);
            const x2 = 32 + 19 * Math.cos(r);
            const y2 = 32 + 19 * Math.sin(r);
            return <path key={deg}
              d={`M${x1},${y1} Q${x2},${y2} ${x2},${y2}`}
              fill={accent} opacity="0.55" />;
          })}
          <circle cx={32} cy={32} r={17} fill="none" stroke={accent} strokeWidth="0.8" opacity="0.25" />
        </svg>
      );

    case 'mixing_valve': case 'control_valve':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <polygon points="8,14 8,50 28,32" fill={accent} opacity="0.75" stroke={accent} strokeWidth="1" />
          <polygon points="56,14 56,50 36,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={32} cy={32} r={6} fill={accent} />
          <line x1={32} y1={12} x2={32} y2={22} stroke={accent} strokeWidth="3" opacity="0.6" strokeLinecap="round" />
          <text x={32} y={58} textAnchor="middle" fill={accent} fontSize="8" fontWeight="800">פתוח</text>
        </svg>
      );

    case 'isolation_valve':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <polygon points="8,14 8,50 28,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <polygon points="56,14 56,50 36,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <circle cx={32} cy={32} r={6} fill={accent} />
          <line x1={32} y1={32} x2={32} y2={14} stroke={accent} strokeWidth="3" opacity="0.7" strokeLinecap="round" />
          <line x1={26} y1={12} x2={38} y2={12} stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <text x={32} y={58} textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="800">סגור</text>
        </svg>
      );

    case 'safety_valve':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <polygon points="8,14 8,50 28,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <polygon points="56,14 56,50 36,32" fill={dim} stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={32} cy={32} r={6} fill={accent} />
          <path d="M32,8 L32,24 M28,10 L32,8 L36,10" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M32,8 C28,4 36,4 32,8" fill={accent} opacity="0.5" />
          <text x={32} y={58} textAnchor="middle" fill={accent} fontSize="8" fontWeight="800">בטיחות</text>
        </svg>
      );

    case 'temperature_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#f97316" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 1,1 52,46" fill="none" stroke={dim2} strokeWidth="5" />
          <path d="M 12,46 A 24,24 0 0,1 42,16" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={26} y2={18} stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#f97316" />
          <text x={32} y={56} textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="800">°C</text>
        </svg>
      );

    case 'pressure_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#818cf8" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 1,1 52,46" fill="none" stroke={dim2} strokeWidth="5" />
          <path d="M 12,46 A 24,24 0 0,1 48,30" fill="none" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={44} y2={22} stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#818cf8" />
          <text x={32} y={56} textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="800">bar</text>
        </svg>
      );

    case 'flow_sensor':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={34} r={24} fill={dim} stroke="#22d3ee" strokeWidth="1.5" />
          <path d="M 12,46 A 24,24 0 1,1 52,46" fill="none" stroke={dim2} strokeWidth="5" />
          <path d="M 12,46 A 24,24 0 0,1 32,10" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          <line x1={32} y1={34} x2={32} y2={14} stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={32} cy={34} r={4} fill="#22d3ee" />
          <text x={32} y={56} textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="800">ל/ד</text>
        </svg>
      );

    case 'energy_meter': case 'water_meter':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={14} width={48} height={36} rx={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={14} y={22} width={36} height={16} rx={3} fill={dim2} stroke={accent} strokeWidth="0.8" opacity="0.6" />
          <text x={32} y={34} textAnchor="middle" fill={accent} fontSize="13" fontWeight="900" fontFamily="monospace">
            {typeId === 'energy_meter' ? '4.7kW' : '12m³'}
          </text>
          <circle cx={32} cy={54} r={3} fill={accent} opacity="0.6" />
        </svg>
      );

    case 'gas_backup':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={12} y={16} width={40} height={38} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[24,30,36,42].map(y => (
            <line key={y} x1={12} y1={y} x2={52} y2={y} stroke={accent} strokeWidth="0.7" opacity="0.25" />
          ))}
          <path d="M32,36 C24,26 22,18 28,12 C25,18 34,18 32,12 C38,18 36,26 40,32 C36,28 28,28 32,36 Z"
            fill={accent} opacity="0.9" />
          <path d="M32,36 C29,30 30,25 32,21 C31,25 33,25 32,21 C34,25 33,30 32,36 Z"
            fill="#fff" opacity="0.45" />
        </svg>
      );

    case 'electric_heater':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={6} y={14} width={52} height={36} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[24,32,40,48].map((y, i) => {
            const fromL = i % 2 === 0;
            return (
              <g key={y}>
                <line x1={14} y1={y} x2={50} y2={y} stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                {i < 3 && (
                  <path d={fromL
                    ? `M50,${y} A5,5 0 0,1 50,${y+8}`
                    : `M14,${y} A5,5 0 0,0 14,${y+8}`}
                    fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                )}
              </g>
            );
          })}
          <text x={32} y={11} textAnchor="middle" fill={accent} fontSize="11">⚡</text>
        </svg>
      );

    case 'solar_collector':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={16} width={56} height={36} rx={4} fill={dim} stroke="#fbbf24" strokeWidth="1.5" />
          {[12,20,28,36,44,52].map(x => (
            <rect key={x} x={x} y={19} width={6} height={30} rx={3}
              fill="#fbbf24" opacity="0.55" />
          ))}
          <text x={32} y={40} textAnchor="middle" fill="#fbbf24" fontSize="20" opacity="0.9">☀</text>
        </svg>
      );

    case 'plate_heat_exchanger':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={12} width={56} height={40} rx={7} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[18,25,32,39,46].map((x, i) => (
            <rect key={x} x={x} y={16} width={5} height={32} rx={2.5}
              fill={i % 2 === 0 ? '#38bdf8' : '#f97316'} opacity="0.6" />
          ))}
          <path d="M4,24 L16,24 M48,24 L60,24" stroke="#38bdf8" strokeWidth="2" opacity="0.7" />
          <path d="M4,40 L16,40 M48,40 L60,40" stroke="#f97316" strokeWidth="2" opacity="0.7" />
        </svg>
      );

    case 'filter':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={18} width={48} height={28} rx={6} fill={dim} stroke={accent} strokeWidth="1.5" />
          {[18,24,30,36,42,48].map(x => (
            <line key={x} x1={x} y1={21} x2={x} y2={43} stroke={accent} strokeWidth="1.2" opacity="0.55" />
          ))}
          <rect x={0} y={26} width={12} height={12} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <rect x={52} y={26} width={12} height={12} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <text x={32} y={57} textAnchor="middle" fill={accent} fontSize="8" fontWeight="700">מסנן</text>
        </svg>
      );

    case 'air_separator':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={20} y={18} width={24} height={36} rx={5} fill={dim} stroke={accent} strokeWidth="1.5" />
          <circle cx={28} cy={38} r={4} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
          <circle cx={36} cy={32} r={2.5} fill="none" stroke={accent} strokeWidth="1.2" opacity="0.5" />
          <circle cx={30} cy={45} r={1.5} fill="none" stroke={accent} strokeWidth="1" opacity="0.35" />
          <rect x={29} y={6} width={6} height={14} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <path d="M32,4 L32,0 M29,3 L32,0 L35,3" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <rect x={4} y={27} width={16} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
          <rect x={44} y={27} width={16} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.2" />
        </svg>
      );

    case 'distribution_manifold':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={4} y={12} width={56} height={14} rx={5} fill={dim} stroke="#f97316" strokeWidth="1.5" />
          {[16,32,48].map(x => (
            <g key={x}>
              <line x1={x} y1={26} x2={x} y2={44} stroke="#f97316" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
              <circle cx={x} cy={44} r={3.5} fill="#f97316" opacity="0.7" />
            </g>
          ))}
          <rect x={4} y={50} width={56} height={12} rx={5} fill={dim} stroke="#38bdf8" strokeWidth="1.5" />
          <text x={32} y={59} textAnchor="middle" fill="#38bdf8" fontSize="7" fontWeight="800">חזרה</text>
        </svg>
      );

    case 'point_of_use': case 'tap':
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={28} r={22} fill={dim} stroke={accent} strokeWidth="1.5" />
          <rect x={21} y={14} width={22} height={10} rx={3} fill={dim} stroke={accent} strokeWidth="1.3" opacity="0.9" />
          {[-10,0,10].map((dx, i) => (
            <ellipse key={i} cx={32 + dx} cy={43}
              rx={2.5} ry={3.5}
              fill={accent} opacity="0.75"
              style={{
                animation: 'dropFall 1.2s ease-in infinite',
                animationDelay: `${i * 0.28}s`,
              }} />
          ))}
          <text x={32} y={60} textAnchor="middle" fill={accent} fontSize="8" fontWeight="700">
            {typeId === 'tap' ? 'ברז' : 'מקלחת'}
          </text>
        </svg>
      );

    default:
      return (
        <svg width={64} height={64} viewBox="0 0 64 64">
          <rect x={8} y={8} width={48} height={48} rx={10} fill={dim} stroke={accent} strokeWidth="1.5" />
          <text x={32} y={38} textAnchor="middle" fill={accent} fontSize="22">⬡</text>
        </svg>
      );
  }
}

// ── Component card ────────────────────────────────────────────────────────────

interface CardProps {
  typeId:   string;
  meta:     CatMeta;
  isActive: boolean;
  onSelect: (typeId: string) => void;
}

function ComponentCard({ typeId, meta, isActive, onSelect }: CardProps) {
  const [hov, setHov] = useState(false);
  const heName = HE_NAME[typeId] ?? typeId;

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/zentro-type', typeId);
    e.dataTransfer.effectAllowed = 'copy';
    // Ghost: branded pill
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;top:-999px;
      background:${meta.cardBg};
      border:2px solid ${meta.accent};
      border-radius:10px;padding:8px 14px;
      color:${meta.accent};font-size:13px;font-weight:800;
      white-space:nowrap;font-family:inherit;direction:rtl;
      box-shadow:0 0 20px ${meta.accent}44;
    `;
    el.textContent = heName;
    document.body.appendChild(el);
    e.dataTransfer.setDragImage(el, el.scrollWidth / 2, 24);
    setTimeout(() => document.body.removeChild(el), 0);
  }, [typeId, meta, heName]);

  const glow = isActive
    ? `0 0 0 2px ${meta.accent}, 0 0 28px ${meta.accent}44`
    : hov
    ? `0 0 0 1px ${meta.accent}88, 0 0 18px ${meta.accent}22`
    : 'none';

  const border = isActive ? `2px solid ${meta.accent}`
    : hov    ? `1.5px solid ${meta.accent}88`
    :           `1.5px solid ${meta.accent}22`;

  const bg = isActive
    ? `linear-gradient(160deg, ${meta.cardBg} 0%, color-mix(in srgb, ${meta.accent} 14%, #0a0e17) 100%)`
    : `linear-gradient(160deg, ${meta.cardBg} 0%, #0a0e17 80%)`;

  return (
    <div
      draggable
      data-testid={`palette-item-${typeId}`}
      onDragStart={handleDragStart}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onSelect(typeId)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            8,
        padding:        '16px 6px 12px',
        background:     bg,
        border,
        borderRadius:   12,
        cursor:         'grab',
        transition:     'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
        transform:      isActive ? 'translateY(-3px) scale(1.04)' : hov ? 'translateY(-2px) scale(1.02)' : 'none',
        boxShadow:      glow,
        userSelect:     'none',
        WebkitUserSelect:'none',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      {/* Top color stripe */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0, height: 4,
        background: meta.accent,
        opacity:    isActive ? 1 : hov ? 0.75 : 0.3,
        transition: 'opacity 0.14s',
        borderRadius: '11px 11px 0 0',
      }} />

      {/* Active pip */}
      {isActive && (
        <div style={{
          position:'absolute', top:8, insetInlineEnd:8,
          width:8, height:8, borderRadius:'50%',
          background: meta.accent,
          boxShadow: `0 0 8px ${meta.accent}`,
        }} />
      )}

      {/* Illustration */}
      <div style={{
        opacity: isActive ? 1 : hov ? 0.95 : 0.82,
        transition: 'opacity 0.14s',
        lineHeight: 0,
      }}>
        <ComponentIllustration typeId={typeId} accent={meta.accent} />
      </div>

      {/* Hebrew name */}
      <div style={{
        fontSize:     12,
        fontWeight:   800,
        color:        isActive ? meta.accent : hov ? meta.accent : '#c8d4e8',
        textAlign:    'center',
        lineHeight:   1.3,
        direction:    'rtl',
        maxWidth:     '100%',
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'normal',
        transition:   'color 0.14s',
      }}>
        {heName}
      </div>
    </div>
  );
}

// ── Category tab ──────────────────────────────────────────────────────────────

function CatTab({ id, meta, active, onClick }: { id:string; meta:CatMeta; active:boolean; onClick:()=>void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={meta.heLabel}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           3,
        padding:       '9px 8px 7px',
        background:    active
          ? `linear-gradient(180deg, ${meta.cardBg}, color-mix(in srgb, ${meta.accent} 15%, #0a0e17))`
          : hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        border:        'none',
        borderRadius:  9,
        cursor:        'pointer',
        color:         active ? meta.accent : hov ? '#a0b4c8' : '#506070',
        transition:    'background 0.14s, color 0.14s, transform 0.12s',
        transform:     active ? 'scale(1.08)' : 'none',
        flexShrink:    0,
        minWidth:      54,
        outline:       active ? `1px solid ${meta.accent}44` : 'none',
        outlineOffset: '-1px',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</span>
      <span style={{ fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
        {meta.heLabel.split(' ')[0]}
      </span>
    </button>
  );
}

// ── Main palette ──────────────────────────────────────────────────────────────

export interface BuilderPalettePanelProps {
  registry: ComponentRegistry;
}

export function BuilderPalettePanel({ registry }: BuilderPalettePanelProps) {
  const { t } = useLocale();
  const { state, dispatchFsm } = useBuilder();
  const [activeCat, setActiveCat]   = useState<string>('source');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const allItems = getPaletteItems(registry);

  // Which items match the current view
  const isVisible = useCallback((typeId: string, category: string): boolean => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const name = (HE_NAME[typeId] ?? '').toLowerCase();
      return name.includes(q) || typeId.includes(q);
    }
    return category === activeCat;
  }, [query, activeCat]);

  const visibleCount = useMemo(
    () => allItems.filter(i => isVisible(i.typeId, i.category)).length,
    [allItems, isVisible],
  );

  const availableCats = useMemo(() => {
    const set = new Set(allItems.map(i => i.category));
    return CAT_ORDER.filter(c => set.has(c));
  }, [allItems]);

  const isPlacing = state.mode === 'placing';
  const placingId = state.pendingTypeId ?? null;

  const handleSelect = useCallback((typeId: string) => {
    if (isPlacing && placingId === typeId) {
      dispatchFsm({ type: 'CANCEL_PLACING' });
    } else {
      dispatchFsm({ type: 'START_PLACING', typeId });
    }
  }, [isPlacing, placingId, dispatchFsm]);

  return (
    <div
      data-testid="builder-palette"
      style={{
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
        overflow:      'hidden',
        background:    '#050810',
        direction:     'rtl',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '12px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#e2e8f4', letterSpacing: '-0.02em' }}>
              {t('builder.lego_title')}
            </div>
            {!isPlacing && (
              <div style={{ fontSize: 10, color: '#4a6080', marginTop: 2 }}>
                {t('builder.lego_hint')}
              </div>
            )}
            {isPlacing && (
              <div style={{
                fontSize: 10, fontWeight: 800, color: '#fb923c', marginTop: 2,
                animation: 'emptyPulse 1.4s ease-in-out infinite',
              }}>
                ✦ {t('builder.lego_active_hint')}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSearchOpen(v => {
                if (!v) setTimeout(() => searchRef.current?.focus(), 60);
                else setQuery('');
                return !v;
              });
            }}
            aria-label="חיפוש"
            style={{
              background:   searchOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              color:        searchOpen ? '#e2e8f4' : '#4a6080',
              cursor:       'pointer',
              fontSize:     15,
              padding:      '4px 8px',
              lineHeight:   1,
              transition:   'all 0.14s',
              flexShrink:   0,
            }}
          >🔍</button>
        </div>
      </div>

      {/* ── Search (hidden by default) ────────────────────────────────────── */}
      <div style={{
        maxHeight:  searchOpen ? 46 : 0,
        overflow:   'hidden',
        transition: 'max-height 0.2s ease',
        flexShrink: 0,
      }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            ref={searchRef}
            type="search"
            placeholder="חפש רכיבים…"
            value={query}
            onChange={e => setQuery(e.currentTarget.value)}
            style={{
              width:        '100%',
              background:   'rgba(255,255,255,0.04)',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              color:        '#e2e8f4',
              fontSize:     13,
              padding:      '6px 12px',
              outline:      'none',
              boxSizing:    'border-box',
              direction:    'rtl',
            }}
          />
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────── */}
      {!query && (
        <div style={{
          display:        'flex',
          gap:            2,
          padding:        '6px 6px 4px',
          overflowX:      'auto',
          flexShrink:     0,
          borderBottom:   '1px solid rgba(255,255,255,0.05)',
          scrollbarWidth: 'none',
        }}>
          {availableCats.map(id => (
            <CatTab
              key={id}
              id={id}
              meta={CAT[id]!}
              active={activeCat === id}
              onClick={() => setActiveCat(id)}
            />
          ))}
        </div>
      )}

      {/* ── Placing cancel bar ────────────────────────────────────────────── */}
      {isPlacing && (
        <div
          data-testid="builder-placing-banner"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '7px 12px',
            background:     'rgba(251,146,60,0.09)',
            borderBottom:   '1px solid rgba(251,146,60,0.2)',
            flexShrink:     0,
          }}
        >
          <span style={{ fontSize: 11, color: '#fb923c', fontWeight: 700 }}>
            לחץ על הבד להנחה
          </span>
          <button
            data-testid="builder-cancel-placing"
            onClick={() => dispatchFsm({ type: 'CANCEL_PLACING' })}
            style={{
              background:   'rgba(251,146,60,0.12)',
              border:       '1px solid rgba(251,146,60,0.3)',
              borderRadius: 6,
              color:        '#fb923c',
              cursor:       'pointer',
              fontSize:     11,
              fontWeight:   800,
              padding:      '3px 10px',
            }}
          >בטל ✕</button>
        </div>
      )}

      {/* ── Card grid ────────────────────────────────────────────────────── */}
      <div style={{
        flex:                1,
        overflowY:           'auto',
        padding:             '10px 8px 20px',
        display:             'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridAutoRows:        'min-content',
        gap:                 10,
        alignContent:        'start',
        scrollbarWidth:      'thin',
        scrollbarColor:      'rgba(255,255,255,0.05) transparent',
      }}>
        {allItems.map(item => {
          const show = isVisible(item.typeId, item.category);
          if (!show) {
            return (
              <div key={item.typeId} style={{ display: 'none' }}>
                <ComponentCard
                  typeId={item.typeId}
                  meta={CAT[item.category] ?? CAT['air']!}
                  isActive={false}
                  onSelect={handleSelect}
                />
              </div>
            );
          }
          return (
            <ComponentCard
              key={item.typeId}
              typeId={item.typeId}
              meta={CAT[item.category] ?? CAT['air']!}
              isActive={isPlacing && placingId === item.typeId}
              onSelect={handleSelect}
            />
          );
        })}

        {visibleCount === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            padding:    '40px 16px',
            textAlign:  'center',
            color:      '#4a6080',
            fontSize:   13,
          }}>
            {t('builder.palette_no_match')}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div style={{
        padding:      '7px 12px',
        borderTop:    '1px solid rgba(255,255,255,0.04)',
        flexShrink:   0,
        fontSize:     9,
        color:        '#2a3a50',
        textAlign:    'center',
      }}>
        {t('builder.lego_drag_tip')}
      </div>
    </div>
  );
}
